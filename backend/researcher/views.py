import csv
import io
import json
import os

from django.db.models import Count, Q
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, views
from rest_framework.response import Response

from core.models import ADRReport, KnowledgeEdge, Medicine, ResearchADRData, ResearchDataset
from django.contrib.auth import get_user_model

from users.permissions import IsResearcher

from .serializers import GovernedADRRecordSerializer, ResearchDatasetSerializer
from .utils import (
    ETHICS_PRINCIPLES,
    REDACTED_FIELDS,
    METRIC_CATALOG,
    SIGNAL_CRITERIA,
    compute_adr_signals,
    compute_dashboard_metrics,
    derive_medicine_cooccurrence_graph,
    explore_knowledge_graph,
    knowledge_graph_seeds,
    literature_corpus_summary,
    mine_internal_corpus,
    _chat_completion,
    governed_adr_queryset,
    governed_adr_records,
)

MAX_RECORDS = 500


class ResearcherEthicsPolicyView(views.APIView):
    """Feature 1 — Ethics-Governed Data Access (policy + scope).

    Reports the governance rules that are actually enforced in code, and how
    much data the researcher can reach under them.
    """

    permission_classes = [permissions.IsAuthenticated, IsResearcher]

    def get(self, request):
        total_reports = ADRReport.objects.count()
        sanitized_available = ResearchADRData.objects.exclude(
            anonymized_data__isnull=True
        ).exclude(anonymized_data__exact='').values('adr_report_id').distinct().count()

        return Response({
            'researcher': {
                'username': request.user.username,
                'affiliation': getattr(getattr(request.user, 'researcher_profile', None), 'affiliation', None),
            },
            'principles': ETHICS_PRINCIPLES,
            'redacted_fields': [
                {'field': field, 'reason': reason} for field, reason in REDACTED_FIELDS.items()
            ],
            'accessible_scope': {
                'adr_reports_in_scope': total_reports,
                'records_with_sanitized_narrative': sanitized_available,
                'records_falling_back_to_raw_narrative': max(total_reports - sanitized_available, 0),
                'registered_medicines': Medicine.objects.filter(is_active=True).count(),
                'research_datasets': ResearchDataset.objects.count(),
                'max_records_per_request': MAX_RECORDS,
            },
            'note': (
                'The anonymisation above is enforced in code: identifying columns are never '
                'serialized by this API. What is NOT implemented is a persistent ethics workflow '
                '— there is no stored access request, no committee approval state, and no saved '
                'audit trail of which researcher read which record. All three would require a new '
                'database model in the shared core app, which needs team sign-off, so they are '
                'deliberately not faked here.'
            ),
        })


class ResearcherGovernedADRDataView(views.APIView):
    """Feature 1 — the governed data feed every other feature reads through."""

    permission_classes = [permissions.IsAuthenticated, IsResearcher]

    def get(self, request):
        queryset = governed_adr_queryset()

        medicine_id = request.query_params.get('medicine')
        if medicine_id:
            queryset = queryset.filter(medicine_id=medicine_id)

        severity = request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity)

        search = request.query_params.get('q')
        if search:
            queryset = queryset.filter(
                Q(medicine__name__icontains=search) | Q(medicine__generic_name__icontains=search)
            )

        total_matched = queryset.count()
        records = governed_adr_records(queryset[:MAX_RECORDS])

        return Response({
            'count': len(records),
            'total_matched': total_matched,
            'truncated': total_matched > len(records),
            'records': GovernedADRRecordSerializer(records, many=True).data,
        })


class ResearcherMedicineListView(views.APIView):
    """Supporting lookup: medicines that actually have ADR reports attached.

    Used by the portal's filter dropdowns so researchers only see medicines
    that carry data, rather than the full catalogue.
    """

    permission_classes = [permissions.IsAuthenticated, IsResearcher]

    def get(self, request):
        medicines = Medicine.objects.annotate(
            report_count=Count('adr_reports')
        ).filter(report_count__gt=0).order_by('-report_count', 'name')

        return Response([
            {
                'id': medicine.id,
                'name': medicine.name,
                'generic_name': medicine.generic_name,
                'report_count': medicine.report_count,
            }
            for medicine in medicines
        ])


VALID_SEVERITIES = ('mild', 'moderate', 'severe')


class ResearcherADRSignalView(views.APIView):
    """Feature 2 — ADR Signal Detection.

    Real disproportionality analysis (PRR, ROR, Yates chi-square) over the
    ADRReport table. See utils.compute_adr_signals for the contingency table.
    """

    permission_classes = [permissions.IsAuthenticated, IsResearcher]

    def get(self, request):
        severity = request.query_params.get('severity', 'severe')
        if severity not in VALID_SEVERITIES:
            return Response(
                {'detail': f'severity must be one of {", ".join(VALID_SEVERITIES)}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = compute_adr_signals(event_severity=severity)
        flagged = [signal for signal in result['signals'] if signal['is_signal']]

        return Response({
            **result,
            'criteria': SIGNAL_CRITERIA,
            'signals_flagged': len(flagged),
            'note': (
                'PRR, ROR and the Yates-corrected chi-square are computed directly from the '
                'ADRReport rows in this database — none of these numbers are simulated. '
                'One real scope limit: a textbook PRR compares a drug against a specific coded '
                'reaction term (e.g. MedDRA). ADRReport stores no coded reaction term, only free '
                'text plus a three-level severity, so the "event" measured here is the severity '
                'grade rather than a named reaction. Adding coded reaction terms would require a '
                'new field on the shared core model, which needs team sign-off. Report counts in '
                'this project are also small, so treat a flagged signal as a prompt to '
                'investigate, not as evidence of causation.'
            ),
        })


DEFAULT_DASHBOARD = ['total_reports', 'distinct_subjects', 'flagged_signals', 'adr_by_severity', 'adr_monthly_trend']


class ResearcherDashboardCatalogView(views.APIView):
    """Feature 3 — the set of widgets a researcher can compose a dashboard from."""

    permission_classes = [permissions.IsAuthenticated, IsResearcher]

    def get(self, request):
        return Response({
            'metrics': [
                {
                    'id': metric_id,
                    'label': spec['label'],
                    'description': spec['description'],
                    'kind': spec['kind'],
                }
                for metric_id, spec in METRIC_CATALOG.items()
            ],
            'default_dashboard': DEFAULT_DASHBOARD,
        })


class ResearcherDashboardView(views.APIView):
    """Feature 3 — compute the metrics the researcher has chosen."""

    permission_classes = [permissions.IsAuthenticated, IsResearcher]

    def get(self, request):
        requested = request.query_params.get('widgets')
        metric_ids = [item.strip() for item in requested.split(',') if item.strip()] if requested else DEFAULT_DASHBOARD

        unknown = [metric_id for metric_id in metric_ids if metric_id not in METRIC_CATALOG]
        widgets = compute_dashboard_metrics(metric_ids)

        return Response({
            'widgets': widgets,
            'unknown_widgets': unknown,
            'note': (
                'Every value shown is computed server-side from real rows at request time. '
                'Your dashboard layout — which widgets you picked and their order — is saved in '
                'this browser only (localStorage), so it will not follow you to another device '
                'or browser. Server-side saved dashboards would require a new model in the '
                'shared core app, which needs team sign-off, so nothing here pretends to be '
                'stored on the server.'
            ),
        })


EXPORT_COLUMNS = [
    'record_id', 'subject_ref', 'medicine_id', 'medicine_name', 'generic_name',
    'severity', 'status', 'reaction_month', 'reported_month',
    'narrative_source', 'narrative',
]


class ResearcherDatasetListView(generics.ListAPIView):
    """Feature 4 — registered research datasets."""

    serializer_class = ResearchDatasetSerializer
    permission_classes = [permissions.IsAuthenticated, IsResearcher]
    queryset = ResearchDataset.objects.select_related('created_by').order_by('-created_at')


class ResearcherDatasetDownloadView(views.APIView):
    """Feature 4 — download a dataset's attached file, when one was uploaded."""

    permission_classes = [permissions.IsAuthenticated, IsResearcher]

    def get(self, request, pk):
        dataset = get_object_or_404(ResearchDataset, pk=pk)
        if not dataset.data_file:
            return Response(
                {'detail': 'This dataset record has no uploaded file. Only its metadata is available.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return FileResponse(dataset.data_file.open('rb'), as_attachment=True,
                            filename=dataset.data_file.name.rsplit('/', 1)[-1])


class ResearcherADRExportView(views.APIView):
    """Feature 4 — export the governed ADR dataset as CSV or JSON.

    Exports run through the exact same anonymisation as the Feature 1 feed, so
    a downloaded file can never contain more than the on-screen data.
    """

    permission_classes = [permissions.IsAuthenticated, IsResearcher]

    def get(self, request):
        # Note: the parameter is 'fmt', not 'format' -- DRF reserves 'format'
        # for its own content negotiation and 404s on an unknown renderer.
        export_format = request.query_params.get('fmt', 'csv').lower()
        if export_format not in ('csv', 'json'):
            return Response({'detail': 'fmt must be csv or json.'}, status=status.HTTP_400_BAD_REQUEST)

        queryset = governed_adr_queryset()
        severity = request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity)
        medicine_id = request.query_params.get('medicine')
        if medicine_id:
            queryset = queryset.filter(medicine_id=medicine_id)

        records = governed_adr_records(queryset)

        if export_format == 'json':
            response = HttpResponse(
                json.dumps({'records': records}, indent=2, default=str),
                content_type='application/json',
            )
            response['Content-Disposition'] = 'attachment; filename="medguard-governed-adr.json"'
            return response

        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=EXPORT_COLUMNS, extrasaction='ignore')
        writer.writeheader()
        for record in records:
            writer.writerow(record)

        response = HttpResponse(buffer.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="medguard-governed-adr.csv"'
        return response


class ResearcherExportSummaryView(views.APIView):
    """Feature 4 — what an export will contain, before downloading it."""

    permission_classes = [permissions.IsAuthenticated, IsResearcher]

    def get(self, request):
        datasets = ResearchDataset.objects.count()
        with_files = ResearchDataset.objects.exclude(data_file='').exclude(data_file__isnull=True).count()

        return Response({
            'adr_records_available': ADRReport.objects.count(),
            'export_columns': EXPORT_COLUMNS,
            'formats': ['csv', 'json'],
            'format_param': 'fmt',
            'registered_datasets': datasets,
            'datasets_with_uploaded_file': with_files,
            'note': (
                'The ADR export is generated live from the database and passes through the same '
                'anonymisation as the governed feed — a downloaded file can never contain more '
                'than what Ethics-Governed Access already shows. Registered datasets are a '
                'separate thing: ResearchDataset rows are metadata, and no portal in this project '
                'writes them, so unless a teammate has added rows through the Django admin the '
                'list will be empty and no file will be attached to download.'
            ),
        })


STORED_GRAPH_NOTE = (
    'These are rows actually stored in the KnowledgeEdge table. No portal in this project '
    'writes that table — it is reachable only through the Django admin — so it is normally '
    'empty, and nothing is invented to fill it. A second real limitation: KnowledgeEdge '
    'allows "disease" and "symptom" node types, but core.models has no Disease or Symptom '
    'table, so those ids cannot be resolved to a name and are returned with resolvable=false '
    'rather than given a made-up label.'
)

DERIVED_GRAPH_NOTE = (
    'This graph is NOT stored anywhere — it is computed live from real ADRReport rows. Two '
    'medicines are linked when the same pseudonymous subject has adverse reaction reports for '
    'both, and the edge weight is the number of shared subjects. Co-occurrence is not evidence '
    'of an interaction: it can equally reflect one patient simply being on several medicines.'
)


class ResearcherKnowledgeGraphSeedsView(views.APIView):
    """Feature 5 — nodes present in the stored KnowledgeEdge table."""

    permission_classes = [permissions.IsAuthenticated, IsResearcher]

    def get(self, request):
        seeds = knowledge_graph_seeds()
        return Response({
            'seeds': seeds,
            'stored_edge_count': KnowledgeEdge.objects.count(),
            'note': STORED_GRAPH_NOTE,
        })


class ResearcherKnowledgeGraphExploreView(views.APIView):
    """Feature 5 — breadth-first traversal from a seed node."""

    permission_classes = [permissions.IsAuthenticated, IsResearcher]

    def get(self, request):
        node_type = request.query_params.get('node_type')
        node_id = request.query_params.get('node_id')
        if not node_type or not node_id:
            return Response({'detail': 'node_type and node_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            node_id = int(node_id)
            depth = int(request.query_params.get('depth', 2))
        except (TypeError, ValueError):
            return Response({'detail': 'node_id and depth must be integers.'}, status=status.HTTP_400_BAD_REQUEST)

        graph = explore_knowledge_graph(node_type, node_id, depth)
        return Response({**graph, 'source': 'stored_knowledge_edges', 'note': STORED_GRAPH_NOTE})


class ResearcherDerivedGraphView(views.APIView):
    """Feature 5 — medicine co-occurrence graph derived from ADRReport."""

    permission_classes = [permissions.IsAuthenticated, IsResearcher]

    def get(self, request):
        try:
            min_shared = int(request.query_params.get('min_shared', 1))
        except (TypeError, ValueError):
            return Response({'detail': 'min_shared must be an integer.'}, status=status.HTTP_400_BAD_REQUEST)

        graph = derive_medicine_cooccurrence_graph(max(1, min_shared))
        return Response({**graph, 'source': 'derived_from_adr_reports', 'note': DERIVED_GRAPH_NOTE})


LITERATURE_NOTE = (
    'This is NOT a literature search. MedGuard has no integration with PubMed, Europe PMC, '
    'Semantic Scholar or any other literature database, and no API key for one, so no external '
    'publication is being read here and none is invented. What this actually does is mine the '
    'only corpus this project holds — its own ADR report narratives and medicine descriptions — '
    'using plain term frequency with a smoothed lift score against the rest of the corpus. No '
    'language model is involved: the numbers are deterministic text statistics. Treat a '
    'high-lift term as "this wording recurs in this medicine\'s reports", never as published '
    'evidence.'
)


class ResearcherLiteratureMiningView(views.APIView):
    """Feature 6 — heuristic term mining over MedGuard's own report text."""

    permission_classes = [permissions.IsAuthenticated, IsResearcher]

    def get(self, request):
        medicine_id = request.query_params.get('medicine')
        if not medicine_id:
            return Response({'detail': 'medicine is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            medicine_id = int(medicine_id)
            limit = min(int(request.query_params.get('limit', 15)), 50)
        except (TypeError, ValueError):
            return Response({'detail': 'medicine and limit must be integers.'}, status=status.HTTP_400_BAD_REQUEST)

        medicine = get_object_or_404(Medicine, pk=medicine_id)
        result = mine_internal_corpus(medicine_id, limit)

        return Response({
            'medicine': {'id': medicine.id, 'name': medicine.name, 'generic_name': medicine.generic_name},
            'corpus': literature_corpus_summary(),
            **result,
            'method': 'term frequency with smoothed lift against the background corpus',
            'uses_external_literature_database': False,
            'uses_language_model': False,
            'note': LITERATURE_NOTE,
        })


class ResearcherHypothesisView(views.APIView):
    """Feature 7 — AI hypothesis generation (real LLM call).

    The model is given only figures this API actually computed: the medicine's
    disproportionality statistics, its distinctive narrative terms and its
    co-occurrence neighbours. That evidence bundle is returned alongside the
    generated text so the researcher can see exactly what the model was shown.
    """

    permission_classes = [permissions.IsAuthenticated, IsResearcher]

    def post(self, request):
        medicine_id = request.data.get('medicine')
        if not medicine_id:
            return Response({'detail': 'medicine is required.'}, status=status.HTTP_400_BAD_REQUEST)

        medicine = get_object_or_404(Medicine, pk=medicine_id)

        signal_data = compute_adr_signals('severe')
        signal = next(
            (item for item in signal_data['signals'] if item['medicine_id'] == medicine.id),
            None,
        )
        if signal is None:
            return Response(
                {'detail': 'This medicine has no ADR reports, so there is no evidence to reason about.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        mined = mine_internal_corpus(medicine.id, limit=10)
        derived_graph = derive_medicine_cooccurrence_graph(1)
        medicine_key = f'medicine:{medicine.id}'
        neighbours = [
            edge for edge in derived_graph['edges']
            if medicine_key in (edge['source'], edge['target'])
        ][:5]
        node_labels = {node['key']: node['label'] for node in derived_graph['nodes']}

        evidence = {
            'medicine': {'id': medicine.id, 'name': medicine.name, 'generic_name': medicine.generic_name},
            'disproportionality': {
                'severe_reports': signal['event_reports'],
                'other_reports': signal['non_event_reports'],
                'prr': signal['prr'],
                'ror': signal['ror'],
                'chi_square': signal['chi_square'],
                'meets_signal_criteria': signal['is_signal'],
                'contingency_table': signal['contingency_table'],
            },
            'distinctive_terms': [
                {'term': term['term'], 'lift': term['lift'], 'documents': term['documents_in_focus']}
                for term in mined['terms']
            ],
            'co_reported_medicines': [
                {
                    'medicine': node_labels.get(
                        edge['target'] if edge['source'] == medicine_key else edge['source'], 'unknown'
                    ),
                    'shared_subjects': edge['weight'],
                }
                for edge in neighbours
            ],
            'corpus_size': signal_data['total_reports_analysed'],
        }

        api_key = os.environ.get('OPENROUTER_API_KEY') or os.environ.get('NVIDIA_API_KEY')
        if not api_key:
            return Response(
                {
                    'error': 'OPENROUTER_API_KEY is missing in backend/.env. Please add OPENROUTER_API_KEY to your .env file.',
                    'evidence': evidence,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        prompt = (
            'You are assisting a pharmacovigilance researcher in Bangladesh. Below is real '
            'aggregate evidence computed from the MedGuard BD database. Do not invent any '
            'additional data, statistics, citations or study results.\n\n'
            f'{json.dumps(evidence, indent=2)}\n\n'
            'Propose 3 to 5 specific, testable research hypotheses this evidence could support. '
            'For each hypothesis give: (1) the hypothesis statement, (2) the biological or '
            'clinical rationale, (3) a suitable study design to test it, and (4) the main '
            'confounders or limitations, explicitly including the small sample size and the fact '
            'that spontaneous reporting data cannot establish causation. Be concise and '
            'clearly structured.'
        )

        try:
            generated = _chat_completion(
                api_key=api_key,
                model=os.environ.get('OPENROUTER_MODEL', 'openai/gpt-4o-mini'),
                messages=[{'role': 'user', 'content': prompt}],
                is_openrouter=True,
            )
        except Exception as exc:
            return Response(
                {'error': f'AI provider error: {exc}', 'evidence': evidence},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({
            'hypotheses': generated,
            'evidence': evidence,
            'model': os.environ.get('OPENROUTER_MODEL', 'openai/gpt-4o-mini'),
            'note': (
                'This response is generated by a real language model call, using only the '
                'evidence bundle shown alongside it — every figure in that bundle was computed '
                'from this database, not supplied by the model. The hypotheses themselves are '
                'machine-generated suggestions for investigation: they are not findings, not '
                'peer reviewed, and spontaneous reporting data cannot establish causation. '
                'Verify anything the model asserts beyond the evidence bundle before relying on it.'
            ),
        })


User = get_user_model()

SECURITY_CONTROLS = [
    'JWT bearer authentication on every researcher endpoint (rest_framework_simplejwt).',
    'Role gate: IsResearcher rejects any non-researcher account with HTTP 403.',
    'Patient identity never leaves the API — replaced by a salted SHA-256 subject_ref.',
    'Exports reuse the same anonymisation as the on-screen feed, so a file cannot leak more.',
    'Reaction dates are coarsened to year-month before leaving the server.',
]


class ResearcherWorkspaceView(views.APIView):
    """Feature 8 — Secure Research Collaboration Workspace.

    A directory of the researchers who share this governed corpus, what each
    has contributed, and the access controls actually enforced around it.
    """

    permission_classes = [permissions.IsAuthenticated, IsResearcher]

    def get(self, request):
        researchers = User.objects.filter(role='researcher').annotate(
            datasets_contributed=Count('datasets_created', distinct=True)
        ).order_by('-datasets_contributed', 'username')

        collaborators = []
        for researcher in researchers:
            profile = getattr(researcher, 'researcher_profile', None)
            collaborators.append({
                'id': researcher.id,
                'username': researcher.username,
                'full_name': researcher.full_name,
                'affiliation': getattr(profile, 'affiliation', None),
                'research_interests': getattr(profile, 'research_interests', None),
                'datasets_contributed': researcher.datasets_contributed,
                'is_you': researcher.id == request.user.id,
            })

        contributions = [
            {
                'id': dataset.id,
                'dataset_name': dataset.dataset_name,
                'contributed_by': dataset.created_by.full_name or dataset.created_by.username,
                'created_at': dataset.created_at,
                'has_data_file': bool(dataset.data_file),
            }
            for dataset in ResearchDataset.objects.select_related('created_by').order_by('-created_at')
        ]

        return Response({
            'collaborators': collaborators,
            'collaborator_count': len(collaborators),
            'shared_contributions': contributions,
            'shared_corpus': {
                'governed_adr_records': ADRReport.objects.count(),
                'registered_datasets': len(contributions),
            },
            'security_controls': SECURITY_CONTROLS,
            'note': (
                'This workspace is real but read-only: the collaborator directory, each '
                'researcher\'s affiliation and their dataset contributions all come from actual '
                'rows (CustomUser, ResearcherProfile, ResearchDataset), and the listed security '
                'controls are genuinely enforced in code. What does NOT exist is the interactive '
                'half of a collaboration workspace — there are no messages, threads, comments, '
                'shared annotations, per-project membership or file sharing between researchers, '
                'because every one of those needs a new model in the shared core app and that '
                'needs team sign-off. Every researcher currently sees the same governed corpus; '
                'there is no per-workspace partitioning of the data.'
            ),
        })
