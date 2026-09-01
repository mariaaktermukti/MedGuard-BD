import hashlib
import json
import os
from urllib import error, request

from django.conf import settings
from django.db.models import Count

from core.models import ResearchADRData


def _chat_completion(api_key, model, messages, is_openrouter=False):
    api_url = (
        "https://openrouter.ai/api/v1/chat/completions"
        if is_openrouter
        else "https://api.openai.com/v1/chat/completions"
    )
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if is_openrouter:
        headers.update({
            "HTTP-Referer": os.environ.get("OPENROUTER_SITE_URL", "http://localhost:5173"),
            "X-Title": os.environ.get("OPENROUTER_APP_NAME", "MedGuard BD"),
        })

    payload = json.dumps({
        "model": model,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 1024,
    }).encode("utf-8")

    chat_request = request.Request(api_url, data=payload, headers=headers, method="POST")
    try:
        with request.urlopen(chat_request, timeout=45) as response:
            data = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"AI provider returned HTTP {exc.code}: {error_body}") from exc

    return data["choices"][0]["message"]["content"]


# ---------------------------------------------------------------------------
# Feature 1 — Ethics-Governed Data Access
#
# Every researcher endpoint that touches patient-linked data must pass its
# rows through anonymize_adr_report() below. That is the actual enforcement
# point: identifying columns are never serialized, so they cannot leak even
# if a later view forgets to exclude them.
# ---------------------------------------------------------------------------

# Fields on ADRReport that are never exposed to a researcher, and why.
REDACTED_FIELDS = {
    'citizen': 'Patient identity — replaced by an irreversible pseudonymous subject_ref.',
    'reported_by_user': 'Reporter identity (doctor/pharmacist) — not required for analysis.',
    'attachment': 'Uploaded files may embed names, scans or EXIF metadata.',
    'reaction_date': 'Exact date is a re-identification vector — coarsened to year-month.',
}

ETHICS_PRINCIPLES = [
    'Data minimisation — only fields required for pharmacovigilance analysis are returned.',
    'Irreversible pseudonymisation — subject_ref is a salted SHA-256 digest, not an encoded ID.',
    'Date coarsening — reaction dates are reduced to year-month granularity.',
    'Purpose limitation — access is restricted to the researcher role via IsResearcher.',
    'Provenance labelling — every record states whether its narrative text was sanitised.',
]


def subject_ref(citizen_id):
    """Irreversible pseudonymous subject reference.

    Salted with SECRET_KEY and truncated, so the same patient is stable across
    records (needed to count distinct subjects) but cannot be reversed back to
    a user ID from the API output alone.
    """
    if citizen_id is None:
        return None
    digest = hashlib.sha256(f'{settings.SECRET_KEY}:adr-subject:{citizen_id}'.encode('utf-8')).hexdigest()
    return f'SUBJ-{digest[:12].upper()}'


def coarsen_date(value):
    """Reduce a date to year-month. Returns None if there is no date."""
    return value.strftime('%Y-%m') if value else None


def research_text_map(adr_report_ids):
    """Map ADRReport id -> sanitised narrative from ResearchADRData, when one exists.

    ResearchADRData.anonymized_data is the *intended* sanitised text. It is
    frequently absent, so callers fall back to the raw description and the
    record is labelled accordingly rather than silently presented as sanitised.
    """
    rows = ResearchADRData.objects.filter(
        adr_report_id__in=adr_report_ids
    ).exclude(anonymized_data__isnull=True).exclude(anonymized_data__exact='')
    return {row.adr_report_id: row.anonymized_data for row in rows}


def anonymize_adr_report(report, sanitized_text_by_report_id):
    """Turn an ADRReport row into a governed, non-identifying research record."""
    sanitized = sanitized_text_by_report_id.get(report.id)
    return {
        'record_id': report.id,
        'subject_ref': subject_ref(report.citizen_id),
        'medicine_id': report.medicine_id,
        'medicine_name': report.medicine.name if report.medicine_id else None,
        'generic_name': report.medicine.generic_name if report.medicine_id else None,
        'severity': report.severity,
        'status': report.status,
        'reaction_month': coarsen_date(report.reaction_date),
        'reported_month': coarsen_date(report.date_reported),
        'narrative': sanitized if sanitized else (report.description or ''),
        # Explicit provenance: the researcher must know whether the narrative
        # actually went through the ResearchADRData sanitisation step.
        'narrative_source': 'sanitized_research_record' if sanitized else 'raw_report_description',
    }


def governed_adr_queryset():
    """The single queryset every governed ADR read starts from."""
    from core.models import ADRReport
    return ADRReport.objects.select_related('medicine').order_by('-date_reported')


def governed_adr_records(queryset):
    """Anonymize a queryset of ADRReport rows in one pass."""
    reports = list(queryset)
    sanitized = research_text_map([report.id for report in reports])
    return [anonymize_adr_report(report, sanitized) for report in reports]


# ---------------------------------------------------------------------------
# Feature 2 — ADR Signal Detection
#
# Standard disproportionality analysis on a 2x2 contingency table, the same
# arithmetic used by pharmacovigilance centres (PRR, ROR, Yates-corrected
# chi-square, Evans signal criteria). Every number below is computed from real
# ADRReport rows — nothing is simulated.
#
# Honest scope limit: a textbook PRR compares a *drug* against a *specific
# coded reaction term* (e.g. MedDRA). ADRReport has no coded reaction field —
# only free text plus a three-level severity. So the "event of interest" here
# is the severity grade, not a specific reaction. Callers must surface that.
# ---------------------------------------------------------------------------

SIGNAL_CRITERIA = {
    'min_case_count': 3,
    'min_prr': 2.0,
    'min_chi_square': 4.0,
    'reference': 'Evans et al. (2001) — the conventional PRR signal threshold.',
}


def _chi_square_yates(a, b, c, d):
    """Yates-corrected chi-square for a 2x2 table. Returns 0.0 if undefined."""
    total = a + b + c + d
    row1, row2 = a + b, c + d
    col1, col2 = a + c, b + d
    denominator = row1 * row2 * col1 * col2
    if total == 0 or denominator == 0:
        return 0.0
    numerator = total * (abs(a * d - b * c) - total / 2) ** 2
    return numerator / denominator


def compute_adr_signals(event_severity='severe'):
    """Disproportionality analysis of every medicine against one severity grade.

    a = reports for this medicine at the event severity
    b = reports for this medicine at any other severity
    c = reports for all other medicines at the event severity
    d = reports for all other medicines at any other severity
    """
    from core.models import ADRReport

    rows = ADRReport.objects.values('medicine_id', 'medicine__name', 'medicine__generic_name', 'severity')
    per_medicine = {}
    for row in rows:
        entry = per_medicine.setdefault(row['medicine_id'], {
            'medicine_id': row['medicine_id'],
            'medicine_name': row['medicine__name'],
            'generic_name': row['medicine__generic_name'],
            'event_count': 0,
            'other_count': 0,
        })
        if row['severity'] == event_severity:
            entry['event_count'] += 1
        else:
            entry['other_count'] += 1

    total_event = sum(entry['event_count'] for entry in per_medicine.values())
    total_other = sum(entry['other_count'] for entry in per_medicine.values())

    signals = []
    for entry in per_medicine.values():
        a = entry['event_count']
        b = entry['other_count']
        c = total_event - a
        d = total_other - b

        exposed_rate = a / (a + b) if (a + b) else 0.0
        comparator_rate = c / (c + d) if (c + d) else 0.0
        prr = (exposed_rate / comparator_rate) if comparator_rate else None
        ror = ((a / b) / (c / d)) if (b and c and d) else None
        chi_square = _chi_square_yates(a, b, c, d)

        is_signal = (
            a >= SIGNAL_CRITERIA['min_case_count']
            and prr is not None
            and prr >= SIGNAL_CRITERIA['min_prr']
            and chi_square >= SIGNAL_CRITERIA['min_chi_square']
        )

        signals.append({
            'medicine_id': entry['medicine_id'],
            'medicine_name': entry['medicine_name'],
            'generic_name': entry['generic_name'],
            'total_reports': a + b,
            'event_reports': a,
            'non_event_reports': b,
            'contingency_table': {'a': a, 'b': b, 'c': c, 'd': d},
            'event_rate': round(exposed_rate, 4),
            'comparator_rate': round(comparator_rate, 4),
            'prr': round(prr, 3) if prr is not None else None,
            'ror': round(ror, 3) if ror is not None else None,
            'chi_square': round(chi_square, 3),
            'is_signal': is_signal,
        })

    signals.sort(key=lambda item: (item['is_signal'], item['prr'] or 0, item['event_reports']), reverse=True)
    return {
        'event_severity': event_severity,
        'total_reports_analysed': total_event + total_other,
        'total_event_reports': total_event,
        'signals': signals,
    }


# ---------------------------------------------------------------------------
# Feature 3 — Custom Dashboards
#
# A catalogue of metrics the researcher can compose into their own dashboard.
# Every metric is computed server-side from real rows. The *layout* (which
# widgets, in what order) is persisted in the browser only — a saved
# server-side dashboard would need a new model in the shared core app.
# ---------------------------------------------------------------------------

SEVERITY_ORDER = ('mild', 'moderate', 'severe')


def _metric_adr_by_severity():
    from core.models import ADRReport
    counts = dict(
        ADRReport.objects.values_list('severity').annotate(n=Count('id')).values_list('severity', 'n')
    )
    return [{'label': severity, 'value': counts.get(severity, 0)} for severity in SEVERITY_ORDER]


def _metric_adr_by_status():
    from core.models import ADRReport
    rows = ADRReport.objects.values('status').annotate(n=Count('id')).order_by('-n')
    return [{'label': row['status'], 'value': row['n']} for row in rows]


def _metric_adr_by_medicine():
    from core.models import ADRReport
    rows = (
        ADRReport.objects.values('medicine__name')
        .annotate(n=Count('id')).order_by('-n')[:10]
    )
    return [{'label': row['medicine__name'], 'value': row['n']} for row in rows]


def _metric_adr_monthly_trend():
    """Reports per calendar month, keyed on reaction_date where present."""
    from core.models import ADRReport
    buckets = {}
    for report in ADRReport.objects.only('reaction_date', 'date_reported'):
        month = coarsen_date(report.reaction_date) or coarsen_date(report.date_reported)
        if month:
            buckets[month] = buckets.get(month, 0) + 1
    return [{'label': month, 'value': buckets[month]} for month in sorted(buckets)]


def _metric_total_reports():
    from core.models import ADRReport
    return ADRReport.objects.count()


def _metric_distinct_subjects():
    from core.models import ADRReport
    return ADRReport.objects.values('citizen_id').distinct().count()


def _metric_flagged_signals():
    return sum(1 for signal in compute_adr_signals('severe')['signals'] if signal['is_signal'])


def _metric_sanitisation_coverage():
    from core.models import ADRReport
    total = ADRReport.objects.count()
    if not total:
        return 0
    sanitized = ResearchADRData.objects.exclude(
        anonymized_data__isnull=True
    ).exclude(anonymized_data__exact='').values('adr_report_id').distinct().count()
    return round(sanitized * 100 / total, 1)


def _metric_dataset_count():
    from core.models import ResearchDataset
    return ResearchDataset.objects.count()


METRIC_CATALOG = {
    'total_reports': {
        'label': 'Total ADR reports',
        'description': 'Every adverse drug reaction report in scope.',
        'kind': 'stat',
        'compute': _metric_total_reports,
    },
    'distinct_subjects': {
        'label': 'Distinct subjects',
        'description': 'Unique pseudonymous subjects behind those reports.',
        'kind': 'stat',
        'compute': _metric_distinct_subjects,
    },
    'flagged_signals': {
        'label': 'Flagged severity signals',
        'description': 'Medicines meeting the Evans PRR criteria for severe reactions.',
        'kind': 'stat',
        'compute': _metric_flagged_signals,
    },
    'sanitisation_coverage': {
        'label': 'Sanitised narrative coverage (%)',
        'description': 'Share of reports that have a ResearchADRData sanitised narrative.',
        'kind': 'stat',
        'compute': _metric_sanitisation_coverage,
    },
    'dataset_count': {
        'label': 'Research datasets',
        'description': 'Datasets registered in ResearchDataset.',
        'kind': 'stat',
        'compute': _metric_dataset_count,
    },
    'adr_by_severity': {
        'label': 'Reports by severity',
        'description': 'Distribution across mild, moderate and severe.',
        'kind': 'bar',
        'compute': _metric_adr_by_severity,
    },
    'adr_by_status': {
        'label': 'Reports by investigation status',
        'description': 'Pending, investigated and resolved counts.',
        'kind': 'bar',
        'compute': _metric_adr_by_status,
    },
    'adr_by_medicine': {
        'label': 'Top medicines by report count',
        'description': 'The ten medicines carrying the most reports.',
        'kind': 'bar',
        'compute': _metric_adr_by_medicine,
    },
    'adr_monthly_trend': {
        'label': 'Monthly report trend',
        'description': 'Reports per calendar month, by reaction date.',
        'kind': 'line',
        'compute': _metric_adr_monthly_trend,
    },
}


def compute_dashboard_metrics(metric_ids):
    """Compute the requested subset of the catalogue. Unknown ids are ignored."""
    results = []
    for metric_id in metric_ids:
        spec = METRIC_CATALOG.get(metric_id)
        if not spec:
            continue
        results.append({
            'id': metric_id,
            'label': spec['label'],
            'description': spec['description'],
            'kind': spec['kind'],
            'value': spec['compute'](),
        })
    return results


# ---------------------------------------------------------------------------
# Feature 5 — Knowledge Graph Explorer
#
# Two genuinely different graphs, never mixed:
#
#   'stored'  — rows actually present in the KnowledgeEdge table. Nothing in
#               this project writes that table (it is admin-only), so it is
#               empty unless a teammate populated it by hand.
#   'derived' — computed live from real ADRReport rows: two medicines are
#               linked when the same pseudonymous subject has reports for
#               both. Real co-occurrence, not stored, and labelled as such.
#
# Honest limitation: KnowledgeEdge allows 'disease' and 'symptom' node types,
# but core.models has no Disease or Symptom table, so those ids can never be
# resolved to a name. Such nodes are returned with resolvable=False rather
# than given an invented label.
# ---------------------------------------------------------------------------

MAX_GRAPH_DEPTH = 3
RESOLVABLE_NODE_TYPES = ('medicine', 'adr')


def _node_key(node_type, node_id):
    return f'{node_type}:{node_id}'


def resolve_node_labels(node_refs):
    """Resolve (type, id) pairs to display labels where a table actually exists."""
    from core.models import ADRReport, Medicine

    medicine_ids = [node_id for node_type, node_id in node_refs if node_type == 'medicine']
    adr_ids = [node_id for node_type, node_id in node_refs if node_type == 'adr']

    medicines = Medicine.objects.in_bulk(medicine_ids)
    adr_reports = ADRReport.objects.select_related('medicine').in_bulk(adr_ids)

    labels = {}
    for node_type, node_id in node_refs:
        key = _node_key(node_type, node_id)
        if node_type == 'medicine':
            medicine = medicines.get(node_id)
            labels[key] = {
                'key': key, 'type': node_type, 'id': node_id,
                'label': medicine.name if medicine else f'Medicine #{node_id} (deleted)',
                'resolvable': medicine is not None,
            }
        elif node_type == 'adr':
            report = adr_reports.get(node_id)
            labels[key] = {
                'key': key, 'type': node_type, 'id': node_id,
                'label': (
                    f'ADR #{node_id} · {report.severity} · {report.medicine.name}'
                    if report else f'ADR #{node_id} (deleted)'
                ),
                'resolvable': report is not None,
            }
        else:
            # 'disease' / 'symptom' — no backing table exists in core.models.
            labels[key] = {
                'key': key, 'type': node_type, 'id': node_id,
                'label': f'{node_type} #{node_id}',
                'resolvable': False,
            }
    return labels


def explore_knowledge_graph(node_type, node_id, depth=2):
    """Breadth-first traversal of stored KnowledgeEdge rows from one seed node.

    Edges are stored directed but traversed in both directions, since a
    researcher exploring a concept wants its neighbours either way. Each edge
    reports the direction it was actually stored in.
    """
    from core.models import KnowledgeEdge

    depth = max(1, min(int(depth), MAX_GRAPH_DEPTH))
    frontier = {(node_type, node_id)}
    visited = set(frontier)
    collected_edges = {}

    for _ in range(depth):
        if not frontier:
            break
        outgoing = KnowledgeEdge.objects.filter(
            source_type__in=[item[0] for item in frontier],
            source_id__in=[item[1] for item in frontier],
        )
        incoming = KnowledgeEdge.objects.filter(
            target_type__in=[item[0] for item in frontier],
            target_id__in=[item[1] for item in frontier],
        )

        next_frontier = set()
        for edge in list(outgoing) + list(incoming):
            source = (edge.source_type, edge.source_id)
            target = (edge.target_type, edge.target_id)
            # The __in pair-filter above can over-match across node types, so
            # keep only edges genuinely touching the current frontier.
            if source not in frontier and target not in frontier:
                continue
            collected_edges[edge.id] = {
                'id': edge.id,
                'source': _node_key(*source),
                'target': _node_key(*target),
                'relation': edge.relation,
                'weight': float(edge.weight),
            }
            for endpoint in (source, target):
                if endpoint not in visited:
                    visited.add(endpoint)
                    next_frontier.add(endpoint)
        frontier = next_frontier

    labels = resolve_node_labels(visited)
    return {
        'seed': _node_key(node_type, node_id),
        'depth': depth,
        'nodes': list(labels.values()),
        'edges': list(collected_edges.values()),
    }


def knowledge_graph_seeds():
    """Nodes that actually appear in the stored KnowledgeEdge table."""
    from core.models import KnowledgeEdge

    refs = set()
    for edge in KnowledgeEdge.objects.all():
        refs.add((edge.source_type, edge.source_id))
        refs.add((edge.target_type, edge.target_id))
    return list(resolve_node_labels(refs).values())


def derive_medicine_cooccurrence_graph(min_shared_subjects=1):
    """Link two medicines when the same subject has ADR reports for both.

    Computed live from ADRReport. Weight is the number of shared subjects.
    """
    from core.models import ADRReport

    subjects = {}
    for row in ADRReport.objects.values('citizen_id', 'medicine_id'):
        subjects.setdefault(row['citizen_id'], set()).add(row['medicine_id'])

    pair_counts = {}
    for medicine_ids in subjects.values():
        ordered = sorted(medicine_ids)
        for i, left in enumerate(ordered):
            for right in ordered[i + 1:]:
                pair_counts[(left, right)] = pair_counts.get((left, right), 0) + 1

    pairs = {pair: count for pair, count in pair_counts.items() if count >= min_shared_subjects}
    involved = {medicine_id for pair in pairs for medicine_id in pair}
    labels = resolve_node_labels({('medicine', medicine_id) for medicine_id in involved})

    edges = [
        {
            'id': f'derived-{left}-{right}',
            'source': _node_key('medicine', left),
            'target': _node_key('medicine', right),
            'relation': 'co_reported_in_same_subject',
            'weight': count,
        }
        for (left, right), count in sorted(pairs.items(), key=lambda item: -item[1])
    ]

    return {
        'nodes': list(labels.values()),
        'edges': edges,
        'subjects_analysed': len(subjects),
    }


# ---------------------------------------------------------------------------
# Feature 6 — "AI Literature Mining" (honest heuristic, NOT a literature search)
#
# This project has no integration with PubMed, Europe PMC, Semantic Scholar or
# any other literature database, and no API key for one. Rather than fake a
# literature search or skip the feature, this mines the only corpus MedGuard
# actually holds: its own ADR report narratives plus medicine descriptions.
#
# The method is plain term-frequency with a lift score against the background
# corpus — deterministic text statistics, no model involved. Callers must
# label it as such; nothing here should be presented as published evidence.
# ---------------------------------------------------------------------------

STOPWORDS = {
    'about', 'after', 'again', 'also', 'been', 'being', 'both', 'could', 'dose', 'doses',
    'during', 'each', 'from', 'further', 'have', 'having', 'here', 'into', 'more', 'most',
    'noted', 'other', 'over', 'patient', 'patients', 'reported', 'reports', 'same', 'she',
    'should', 'some', 'such', 'than', 'that', 'their', 'them', 'then', 'there', 'these',
    'they', 'this', 'those', 'through', 'under', 'until', 'very', 'were', 'what', 'when',
    'where', 'which', 'while', 'with', 'without', 'would', 'your', 'used', 'using', 'first',
    'second', 'third', 'week', 'weeks', 'day', 'days', 'time', 'times', 'therapy', 'treatment',
}

MIN_TOKEN_LENGTH = 4


def _tokenize(text):
    """Lowercase alphabetic tokens, stopwords and short words removed."""
    cleaned = ''.join(character if character.isalpha() else ' ' for character in (text or '').lower())
    return [
        token for token in cleaned.split()
        if len(token) >= MIN_TOKEN_LENGTH and token not in STOPWORDS
    ]


def _terms_with_bigrams(text):
    tokens = _tokenize(text)
    bigrams = [f'{tokens[i]} {tokens[i + 1]}' for i in range(len(tokens) - 1)]
    return tokens + bigrams


def literature_corpus_summary():
    from core.models import ADRReport, Medicine

    return {
        'adr_narratives': ADRReport.objects.exclude(description__exact='').count(),
        'sanitized_narratives': ResearchADRData.objects.exclude(
            anonymized_data__isnull=True
        ).exclude(anonymized_data__exact='').count(),
        'medicine_descriptions': Medicine.objects.exclude(
            description__isnull=True
        ).exclude(description__exact='').count(),
    }


def mine_internal_corpus(medicine_id, limit=15):
    """Terms distinctive to one medicine's ADR narratives vs. all others.

    Returns each term's raw count in the focus corpus, its background count,
    and a smoothed lift ratio. Lift > 1 means the term is over-represented in
    this medicine's reports relative to the rest of the corpus.
    """
    from core.models import ADRReport

    reports = list(
        ADRReport.objects.select_related('medicine').only(
            'id', 'medicine_id', 'description'
        )
    )
    sanitized = research_text_map([report.id for report in reports])

    focus_terms = {}
    background_terms = {}
    focus_documents = 0
    background_documents = 0

    for report in reports:
        text = sanitized.get(report.id) or report.description or ''
        if not text.strip():
            continue
        is_focus = report.medicine_id == medicine_id
        target = focus_terms if is_focus else background_terms
        if is_focus:
            focus_documents += 1
        else:
            background_documents += 1
        for term in set(_terms_with_bigrams(text)):
            target[term] = target.get(term, 0) + 1

    results = []
    for term, count in focus_terms.items():
        background_count = background_terms.get(term, 0)
        focus_rate = count / focus_documents if focus_documents else 0.0
        # +1 smoothing keeps a term that never appears in the background from
        # producing an infinite lift on a tiny corpus.
        background_rate = (background_count + 1) / (background_documents + 1) if background_documents else 1.0
        results.append({
            'term': term,
            'documents_in_focus': count,
            'documents_in_background': background_count,
            'focus_rate': round(focus_rate, 3),
            'lift': round(focus_rate / background_rate, 2) if background_rate else None,
            'is_phrase': ' ' in term,
        })

    results.sort(key=lambda item: (item['lift'] or 0, item['documents_in_focus']), reverse=True)
    return {
        'focus_documents': focus_documents,
        'background_documents': background_documents,
        'terms': results[:limit],
    }
