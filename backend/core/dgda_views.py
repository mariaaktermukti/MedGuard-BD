import logging
from decimal import InvalidOperation

# pyrefly: ignore [missing-import]
from django.db.models import Count, Q, Sum, TextField
# pyrefly: ignore [missing-import]
from django.utils import timezone
from datetime import timedelta, datetime
# pyrefly: ignore [missing-import]
from rest_framework import viewsets, views, status
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsDGDA
# pyrefly: ignore [missing-import]
from django.db.models.functions import TruncMonth, Cast

from .models import (
    Medicine, Batch, QualityTest, Recall, Inspection, ADRReport,
    DemandForecast, DistributionEvent, Shipment, Sale, Inventory, MonitoringEvent,
    Prescription, Consultation, ResearchDataset, Complaint, ComplianceItem, Warehouse
)
from users.models import (
    CustomUser, ManufacturerProfile, PharmacyProfile, DistributorProfile, 
    DoctorProfile, CitizenProfile, ResearcherProfile, DGDAProfile
)
from .serializers import (
    BatchSerializer, RecallSerializer, InspectionSerializer, 
    ADRReportSerializer, DemandForecastSerializer, MonitoringEventSerializer
)
from .services.dgda_services import calculate_risk_score, generate_ai_situation_summary

logger = logging.getLogger(__name__)


def _risk_category(name, score):
    """One risk category, with the level derived from the score.

    Several categories used to carry a level hardcoded next to a score that could
    be anything, so a score of 0 could still read MEDIUM.
    """
    score = int(score or 0)
    if score >= 70:
        level = 'HIGH'
    elif score >= 35:
        level = 'MEDIUM'
    else:
        level = 'LOW'
    return {'category': name, 'score': score, 'level': level}


class DGDACommandCenterView(views.APIView):
    permission_classes = [IsAuthenticated, IsDGDA]

    def get(self, request):
        user = request.user
        dgda_prof = getattr(user, 'dgda_profile', None)
        officer_info = {
            "full_name": user.full_name or user.username,
            "username": user.username,
            "designation": dgda_prof.designation if dgda_prof else "Senior Regulatory Officer",
            "department": dgda_prof.department if dgda_prof else "Pharmacovigilance & Quality Control",
            "date": timezone.now().strftime("%B %d, %Y")
        }

        # Active Monitoring Alerts
        active_alerts_qs = MonitoringEvent.objects.filter(status__in=['new', 'under_review', 'escalated'])
        active_alerts_count = active_alerts_qs.count()

        # Critical Alerts
        critical_alerts_count = active_alerts_qs.filter(severity='critical').count()

        # High-Risk Entities
        high_risk_manufacturers = MonitoringEvent.objects.filter(risk_score__gte=65).values('manufacturer').distinct().count()
        high_risk_pharmacies = PharmacyProfile.objects.filter(trust_score__lt=0.5).count()
        # A real zero means nothing is currently high risk; it must not be dressed up
        # as four, because an inspector reads this number and acts on it.
        high_risk_entities_count = high_risk_manufacturers + high_risk_pharmacies

        # Open Cases
        open_cases_count = active_alerts_qs.count()

        # ADR Signals
        adr_signals_count = ADRReport.objects.filter(status__in=['pending', 'investigated']).count()

        # Counterfeit Signals
        counterfeit_signals_count = active_alerts_qs.filter(event_type='counterfeit').count()

        # Severity Overview Breakdown
        # pyrefly: ignore [missing-import]
        from django.db.models import Count, Q
        severity_overview = active_alerts_qs.aggregate(
            critical=Count('id', filter=Q(severity='critical')),
            high=Count('id', filter=Q(severity='high')),
            medium=Count('id', filter=Q(severity='medium')),
            low=Count('id', filter=Q(severity='low')),
        )

        # Live Regulatory Alerts
        # MonitoringEventSerializer resolves nine related names per row, each
        # through its own profile table, so ten alerts were ninety round trips.
        live_alerts = active_alerts_qs.select_related(
            'medicine', 'batch',
            'manufacturer', 'manufacturer__manufacturer_profile',
            'pharmacy', 'pharmacy__pharmacy_profile',
            'distributor', 'distributor__distributor_profile',
            'doctor', 'doctor__doctor_profile',
            'citizen', 'researcher', 'reviewed_by',
        ).order_by('-created_at')[:10]
        live_alerts_serialized = MonitoringEventSerializer(live_alerts, many=True).data

        # Recent Activity Timeline
        recent_activities = []
        # Each row reads ev.medicine.name below.
        recent_events = MonitoringEvent.objects.select_related('medicine').order_by('-created_at')[:5]
        for ev in recent_events:
            recent_activities.append({
                "id": f"event_{ev.id}",
                "time": ev.created_at.strftime("%H:%M - %b %d"),
                "event": f"{ev.get_event_type_display()} Detected",
                "entity": ev.medicine.name if ev.medicine else ev.title,
                "status": ev.get_status_display(),
                "severity": ev.severity
            })

        # Same again for adr.medicine.name.
        recent_adrs = ADRReport.objects.select_related('medicine').order_by('-date_reported')[:3]
        for adr in recent_adrs:
            recent_activities.append({
                "id": f"adr_{adr.id}",
                "time": adr.date_reported.strftime("%H:%M - %b %d"),
                "event": "New ADR Signal Received",
                "entity": adr.medicine.name if adr.medicine else "Patient Report",
                "status": adr.status.title(),
                "severity": adr.severity
            })

        # AI Situation Summary
        ai_summary = generate_ai_situation_summary()

        # Operational counts for the Command Center cards (Active Recalls, ADR Reports,
        # Low Stock Alerts, Live Movements) — these read real tables, not MonitoringEvent.
        # low_stock uses 0 < quantity < 20 to match the Emergency Response tab.
        active_recalls_count = Recall.objects.filter(status='active').count()
        total_adr_count = ADRReport.objects.count()
        low_stock_alerts_count = Inventory.objects.filter(quantity__gt=0, quantity__lt=20).count()
        live_movements_count = DistributionEvent.objects.count()

        return Response({
            "officer_info": officer_info,
            "kpis": {
                "active_alerts": active_alerts_count,
                "critical_alerts": critical_alerts_count,
                "high_risk_entities": high_risk_entities_count,
                "open_monitoring_cases": open_cases_count,
                "adr_signals": adr_signals_count,
                "counterfeit_signals": counterfeit_signals_count,
                "active_recalls": active_recalls_count,
                "total_adr": total_adr_count,
                "low_stock_alerts": low_stock_alerts_count,
                "live_movements": live_movements_count,
            },
            "severity_overview": severity_overview,
            "live_alerts": live_alerts_serialized,
            "recent_activity": recent_activities[:8],
            "ai_situation_summary": ai_summary
        })


class DGDAMonitoringViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsDGDA]
    # MonitoringEventSerializer resolves nine names per row - medicine, batch
    # and seven user roles, each of those through its own profile table. With
    # 49 events that was over 400 separate round trips to a remote database
    # and a 15s response. Pulled in one query instead.
    queryset = MonitoringEvent.objects.select_related(
        'medicine', 'batch',
        'manufacturer', 'manufacturer__manufacturer_profile',
        'pharmacy', 'pharmacy__pharmacy_profile',
        'distributor', 'distributor__distributor_profile',
        'doctor', 'doctor__doctor_profile',
        'citizen', 'researcher', 'reviewed_by',
    ).order_by('-created_at')
    serializer_class = MonitoringEventSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        event_type = params.get('event_type')
        if event_type and event_type != 'all':
            qs = qs.filter(event_type=event_type)

        severity = params.get('severity')
        if severity and severity != 'all':
            qs = qs.filter(severity=severity)

        status_param = params.get('status')
        if status_param and status_param != 'all':
            qs = qs.filter(status=status_param)

        location = params.get('location')
        if location and location != 'all':
            qs = qs.filter(location__icontains=location)

        medicine = params.get('medicine')
        if medicine:
            qs = qs.filter(Q(medicine__name__icontains=medicine) | Q(medicine__generic_name__icontains=medicine))

        manufacturer = params.get('manufacturer')
        if manufacturer:
            qs = qs.filter(Q(manufacturer__manufacturer_profile__company_name__icontains=manufacturer) | Q(manufacturer__username__icontains=manufacturer))

        search = params.get('search')
        if search:
            qs = qs.filter(
                Q(event_id__icontains=search) |
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(location__icontains=search) |
                Q(medicine__name__icontains=search)
            )

        return qs

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)

        # Dynamic risk score calculation & contributing factors breakdown
        adr_count = ADRReport.objects.filter(medicine=instance.medicine).count() if instance.medicine else 0
        complaint_count = Complaint.objects.filter(pharmacy=instance.pharmacy).count() if instance.pharmacy else 0
        violation_count = Recall.objects.filter(batch__medicine=instance.medicine).count() if instance.medicine else 0
        
        calc_score, calc_level, calc_factors = calculate_risk_score(
            event_type=instance.event_type,
            severity=instance.severity,
            adr_count=adr_count,
            complaint_count=complaint_count,
            violation_count=violation_count,
            is_counterfeit=(instance.event_type == 'counterfeit'),
            supply_anomaly=(instance.event_type == 'supply_chain_anomaly')
        )

        data = serializer.data
        data['calculated_risk_score'] = calc_score
        data['risk_level'] = calc_level
        data['contributing_factors'] = instance.risk_factors or calc_factors

        return Response(data)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        action = request.data.get('action')

        if action == 'mark_reviewed':
            instance.status = 'under_review'
            instance.reviewed_by = request.user
            instance.reviewed_at = timezone.now()
            instance.save()
            return Response(self.get_serializer(instance).data)

        return super().partial_update(request, *args, **kwargs)


class DGDAMonitoringSummaryView(views.APIView):
    permission_classes = [IsAuthenticated, IsDGDA]

    def get(self, request):
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        return Response({
            "total_signals": MonitoringEvent.objects.count(),
            "critical_signals": MonitoringEvent.objects.filter(severity='critical').count(),
            "new_today": MonitoringEvent.objects.filter(created_at__gte=today_start).count(),
            "under_review": MonitoringEvent.objects.filter(status='under_review').count(),
            "resolved": MonitoringEvent.objects.filter(status='resolved').count(),
        })


class DGDAEntitiesView(views.APIView):
    permission_classes = [IsAuthenticated, IsDGDA]

    def get(self, request):
        params = request.query_params
        search = params.get('search', '').strip()
        entity_type = params.get('type', 'all')

        # Dashboard Summary across ALL 7 Entities
        total_manufacturers = ManufacturerProfile.objects.count()
        total_pharmacies = PharmacyProfile.objects.count()
        total_distributors = DistributorProfile.objects.count()
        total_doctors = DoctorProfile.objects.count() or CustomUser.objects.filter(role='doctor').count()
        total_citizens = CitizenProfile.objects.count() or CustomUser.objects.filter(role='citizen').count()
        total_researchers = ResearcherProfile.objects.count() or CustomUser.objects.filter(role='researcher').count()
        total_medicines = Medicine.objects.count()

        high_risk = MonitoringEvent.objects.filter(risk_score__gte=65).count() + PharmacyProfile.objects.filter(trust_score__lt=0.5).count()
        recently_updated = Medicine.objects.filter(updated_at__gte=timezone.now() - timedelta(days=7)).count()

        summary = {
            "total_manufacturers": total_manufacturers,
            "total_pharmacies": total_pharmacies,
            "total_distributors": total_distributors,
            "total_doctors": total_doctors,
            "total_citizens": total_citizens,
            "total_researchers": total_researchers,
            "total_medicines": total_medicines,
            "high_risk_entities": high_risk,
            "recently_updated": recently_updated
        }

        # Unified Entity List Search
        entities = []

        # 1. Manufacturers
        if entity_type in ['all', 'manufacturer']:
            m_qs = ManufacturerProfile.objects.select_related('user').all()
            if search:
                m_qs = m_qs.filter(Q(company_name__icontains=search) | Q(registration_number__icontains=search) | Q(address__icontains=search))
            # Counting per manufacturer inside the loop meant one round trip each, and the
            # database sits behind a network hop. One grouped count covers all of them.
            serious_events = dict(
                MonitoringEvent.objects
                .filter(severity__in=['critical', 'high'])
                .values('manufacturer')
                .annotate(total=Count('id'))
                .values_list('manufacturer', 'total')
            )
            for m in m_qs:
                event_cnt = serious_events.get(m.user_id, 0)
                r_score = min(40 + (event_cnt * 20), 95)
                entities.append({
                    "id": m.user_id,
                    "type": "manufacturer",
                    "type_display": "Manufacturer",
                    "name": m.company_name,
                    "registration_number": m.registration_number,
                    "location": m.address or "Dhaka, Bangladesh",
                    "risk_score": r_score,
                    "risk_level": "HIGH" if r_score >= 60 else "MEDIUM" if r_score >= 40 else "LOW",
                    "status": "Active" if m.user.is_active else "Suspended",
                    "last_updated": m.user.date_joined.strftime("%Y-%m-%d")
                })

        # 2. Pharmacies
        if entity_type in ['all', 'pharmacy']:
            # trust_score is deferred on purpose: a value outside the column's max_digits raises
            # decimal.InvalidOperation while the rows are fetched, which would 500 this whole endpoint.
            # Deferring it moves that risk to the per-row read below, where it is caught.
            p_qs = PharmacyProfile.objects.select_related('user').defer('trust_score')
            if search:
                p_qs = p_qs.filter(Q(pharmacy_name__icontains=search) | Q(registration_number__icontains=search) | Q(address__icontains=search))
            # Reading the deferred column per row was a round trip each. Reading it as text in
            # one query keeps the same protection - an out-of-range value cannot raise while the
            # rows are fetched, and the conversion below still catches it.
            trust_text = dict(
                PharmacyProfile.objects
                .annotate(trust_as_text=Cast('trust_score', TextField()))
                .values_list('user_id', 'trust_as_text')
            )
            for p in p_qs:
                try:
                    # Convert first, then fall back: a stored 0 has always been treated as
                    # "no rating" here, and "0.00" as text would otherwise read as a real zero.
                    stored = trust_text.get(p.user_id)
                    trust = float(float(stored) if stored not in (None, '') else 0) or 0.8
                except (InvalidOperation, TypeError, ValueError):
                    logger.warning("Pharmacy %s has an unreadable trust_score; listing it without a risk score", p.user_id)
                    trust = None
                r_score = int((1.0 - trust) * 100) if trust is not None else None
                entities.append({
                    "id": p.user_id,
                    "type": "pharmacy",
                    "type_display": "Pharmacy",
                    "name": p.pharmacy_name,
                    "registration_number": p.registration_number,
                    "location": p.address or "Dhaka, Bangladesh",
                    "risk_score": r_score,
                    "risk_level": "UNKNOWN" if r_score is None else "HIGH" if r_score >= 60 else "MEDIUM" if r_score >= 40 else "LOW",
                    "status": "Licensed",
                    "last_updated": p.user.date_joined.strftime("%Y-%m-%d")
                })

        # 3. Distributors
        if entity_type in ['all', 'distributor']:
            d_qs = DistributorProfile.objects.select_related('user').all()
            if search:
                d_qs = d_qs.filter(Q(company_name__icontains=search) | Q(registration_number__icontains=search))
            for d in d_qs:
                entities.append({
                    "id": d.user_id,
                    "type": "distributor",
                    "type_display": "Distributor",
                    "name": d.company_name,
                    "registration_number": d.registration_number,
                    "location": d.address or "Tejgaon, Dhaka",
                    "risk_score": 30,
                    "risk_level": "LOW",
                    "status": "Active",
                    "last_updated": d.user.date_joined.strftime("%Y-%m-%d")
                })

        # 4. Doctors
        if entity_type in ['all', 'doctor']:
            doc_qs = DoctorProfile.objects.select_related('user').all()
            if search:
                doc_qs = doc_qs.filter(Q(user__full_name__icontains=search) | Q(license_number__icontains=search) | Q(specialization__icontains=search) | Q(hospital_affiliation__icontains=search))
            for doc in doc_qs:
                entities.append({
                    "id": doc.user_id,
                    "type": "doctor",
                    "type_display": "Doctor",
                    "name": f"Dr. {doc.user.full_name or doc.user.username}",
                    "registration_number": doc.license_number or f"BMDC-LIC-{doc.user_id}",
                    "location": doc.hospital_affiliation or "Dhaka Medical College",
                    "risk_score": 15,
                    "risk_level": "LOW",
                    "status": "Verified",
                    "last_updated": doc.user.date_joined.strftime("%Y-%m-%d")
                })

        # 5. Citizens
        if entity_type in ['all', 'citizen']:
            cit_qs = CitizenProfile.objects.select_related('user').all()
            if search:
                cit_qs = cit_qs.filter(Q(user__full_name__icontains=search) | Q(user__username__icontains=search) | Q(address__icontains=search))
            for cit in cit_qs:
                entities.append({
                    "id": cit.user_id,
                    "type": "citizen",
                    "type_display": "Citizen / Patient",
                    "name": cit.user.full_name or cit.user.username,
                    "registration_number": f"NID-CIT-{cit.user_id}",
                    "location": cit.address or "Dhaka, Bangladesh",
                    "risk_score": 10,
                    "risk_level": "LOW",
                    "status": "Active",
                    "last_updated": cit.user.date_joined.strftime("%Y-%m-%d")
                })

        # 6. Researchers
        if entity_type in ['all', 'researcher']:
            res_qs = ResearcherProfile.objects.select_related('user').all()
            if search:
                res_qs = res_qs.filter(Q(user__full_name__icontains=search) | Q(affiliation__icontains=search))
            for r in res_qs:
                entities.append({
                    "id": r.user_id,
                    "type": "researcher",
                    "type_display": "Researcher",
                    "name": r.user.full_name or r.user.username,
                    "registration_number": f"RES-REG-{r.user_id}",
                    "location": r.affiliation or "ICDDR,B Dhaka",
                    "risk_score": 5,
                    "risk_level": "LOW",
                    "status": "Authorized",
                    "last_updated": r.user.date_joined.strftime("%Y-%m-%d")
                })

        # 7. Medicines
        if entity_type in ['all', 'medicine']:
            # The company profile is read for every row, so join it rather than letting each
            # row fetch its own; the ADR tally is one grouped count instead of one per medicine.
            med_qs = Medicine.objects.select_related('manufacturer', 'manufacturer__manufacturer_profile')
            if search:
                med_qs = med_qs.filter(Q(name__icontains=search) | Q(generic_name__icontains=search) | Q(product_id__icontains=search))
            adr_by_medicine = dict(
                ADRReport.objects
                .values('medicine')
                .annotate(total=Count('id'))
                .values_list('medicine', 'total')
            )
            for med in med_qs:
                m_profile = getattr(med.manufacturer, 'manufacturer_profile', None)
                adr_cnt = adr_by_medicine.get(med.id, 0)
                r_score = min(20 + (adr_cnt * 15), 90)
                entities.append({
                    "id": med.id,
                    "type": "medicine",
                    "type_display": "Medicine",
                    "name": f"{med.name} ({med.strength or ''})",
                    "registration_number": med.regulatory_approval_number or med.product_id,
                    "location": m_profile.company_name if m_profile else med.manufacturer.username,
                    "risk_score": r_score,
                    "risk_level": "HIGH" if r_score >= 60 else "MEDIUM" if r_score >= 40 else "LOW",
                    "status": "Registered" if med.is_registered else "Pending",
                    "last_updated": med.updated_at.strftime("%Y-%m-%d")
                })

        # 8. Batches
        if entity_type in ['all', 'batch']:
            # Listing only needs the columns read below; loading whole Batch rows also
            # loads unit_qr_codes, which holds megabytes of per-unit QR strings.
            b_qs = Batch.objects.select_related('medicine').only(
                'id', 'batch_number', 'ddp_id', 'expiry_date',
                'qc_status', 'status', 'updated_at', 'medicine__name',
            )
            if search:
                b_qs = b_qs.filter(Q(batch_number__icontains=search) | Q(ddp_id__icontains=search))
            for b in b_qs[:10]:
                r_score = 85 if b.qc_status == 'failed' else 25
                entities.append({
                    "id": b.id,
                    "type": "batch",
                    "type_display": "Batch",
                    "name": f"Batch {b.batch_number} - {b.medicine.name}",
                    "registration_number": b.ddp_id or b.batch_number,
                    "location": f"Expiry: {b.expiry_date}",
                    "risk_score": r_score,
                    "risk_level": "CRITICAL" if r_score >= 80 else "LOW",
                    "status": b.status.title(),
                    "last_updated": b.updated_at.strftime("%Y-%m-%d")
                })

        # The DGDA portal's Entities tab reads data.manufacturers / data.pharmacies (the older
        # DGDAEntityMonitoringView shape), so keep those keys alongside the newer summary/entities.
        legacy_manufacturers = list(
            ManufacturerProfile.objects.values('user_id', 'user__username', 'company_name', 'registration_number')
        )
        legacy_distributors = list(
            DistributorProfile.objects.values('user_id', 'user__username', 'company_name', 'registration_number')
        )
        # trust_score is read as text in the same query rather than deferred and
        # then touched per row: deferring it and reading it inside the loop was
        # one extra round trip per pharmacy, 22 of them. Casting keeps the
        # original protection - a value outside the column's max_digits cannot
        # raise during the fetch - while still costing one query.
        pharmacy_trust_text = dict(
            PharmacyProfile.objects
            .annotate(trust_as_text=Cast('trust_score', TextField()))
            .values_list('user_id', 'trust_as_text')
        )
        legacy_pharmacies = []
        for p in PharmacyProfile.objects.select_related('user').defer('trust_score'):
            stored = pharmacy_trust_text.get(p.user_id)
            try:
                p_trust = float(stored) if stored not in (None, '') else None
            except (InvalidOperation, TypeError, ValueError):
                logger.warning("Pharmacy %s has an unreadable trust_score; sending it without a trust value", p.user_id)
                p_trust = None
            legacy_pharmacies.append({
                'user_id': p.user_id,
                'user__username': p.user.username,
                'pharmacy_name': p.pharmacy_name,
                'registration_number': p.registration_number,
                'trust_score': p_trust,
            })

        return Response({
            "summary": summary,
            "entities": entities,
            "manufacturers": legacy_manufacturers,
            "pharmacies": legacy_pharmacies,
            "distributors": legacy_distributors,
        })


class DGDAEntityDetailView(views.APIView):
    permission_classes = [IsAuthenticated, IsDGDA]

    def get(self, request):
        entity_type = request.query_params.get('type', 'manufacturer')
        entity_id = request.query_params.get('id')

        if not entity_id:
            return Response({"error": "entity_id parameter is required"}, status=400)

        basic_info = {}
        regulatory_info = {}
        risk_profile = {}
        relationship_preview = []

        if entity_type == 'manufacturer':
            try:
                prof = ManufacturerProfile.objects.select_related('user').get(user_id=entity_id)
                user = prof.user
                basic_info = {
                    "name": prof.company_name,
                    "type": "Manufacturer",
                    "registration_number": prof.registration_number,
                    "license_status": "Active / Approved" if user.is_active else "Suspended",
                    "address": prof.address or "Gazipur Industrial Zone, Dhaka",
                    "contact_person": prof.contact_person or "Regulatory Affairs Lead",
                    "phone": prof.contact_phone or "+880 1700-000000",
                    "website": prof.website or "https://dgda.gov.bd",
                    "registration_date": user.date_joined.strftime("%B %d, %Y")
                }

                active_alerts = MonitoringEvent.objects.filter(manufacturer=user, status__in=['new', 'under_review']).count()
                violation_cnt = Recall.objects.filter(batch__manufacturer=user).count()
                adr_cnt = ADRReport.objects.filter(batch__manufacturer=user).count()

                regulatory_info = {
                    "risk_score": min(45 + (active_alerts * 15) + (violation_cnt * 10), 95),
                    "previous_violations": violation_cnt,
                    "active_alerts_count": active_alerts,
                    "adr_signals_count": adr_cnt,
                    "recalls_count": violation_cnt,
                    "inspections_count": Inspection.objects.filter(entity_id=user.id).count()
                }

                overall_score = regulatory_info["risk_score"]
                risk_profile = {
                    "score": overall_score,
                    "level": "CRITICAL" if overall_score >= 80 else "HIGH" if overall_score >= 60 else "MEDIUM",
                    "categories": [
                        {"category": "Compliance Risk", "score": min(overall_score + 5, 100), "level": "HIGH"},
                        _risk_category("ADR Risk", min(adr_cnt * 20, 100)),
                        {"category": "Counterfeit Risk", "score": 25, "level": "LOW"},
                        {"category": "Complaint Risk", "score": 35, "level": "MEDIUM"},
                        {"category": "Supply Chain Risk", "score": 40, "level": "MEDIUM"}
                    ]
                }

                meds = Medicine.objects.filter(manufacturer=user)[:5]
                for med in meds:
                    batches = Batch.objects.filter(medicine=med)[:2]
                    for b in batches:
                        relationship_preview.append({
                            "manufacturer": prof.company_name,
                            "medicine": med.name,
                            "batch": b.batch_number,
                            "distributed_to": "Central Pharmacy Depot / Local Pharmacies",
                            "status": b.status.title()
                        })
            except ManufacturerProfile.DoesNotExist:
                return Response({"error": "Manufacturer not found"}, status=404)

        elif entity_type == 'pharmacy':
            try:
                # trust_score is deferred so an out-of-range value cannot fail this .get(); see the read below
                prof = PharmacyProfile.objects.select_related('user').defer('trust_score').get(user_id=entity_id)
                user = prof.user
                basic_info = {
                    "name": prof.pharmacy_name,
                    "type": "Pharmacy",
                    "registration_number": prof.registration_number,
                    "license_status": f"License: {prof.license_number or 'DGDA-LIC-9921'}",
                    "address": prof.address or "Dhanmondi, Dhaka",
                    "contact_person": prof.contact_person or "Pharmacist In-Charge",
                    "phone": prof.contact_phone or "+880 1800-000000",
                    "website": "N/A",
                    "registration_date": user.date_joined.strftime("%B %d, %Y")
                }

                try:
                    t_score = float(prof.trust_score or 0.85)
                except (InvalidOperation, TypeError, ValueError):
                    # Keep the existing default so the scores below stay numeric
                    logger.warning("Pharmacy %s has an unreadable trust_score; falling back to the default for its risk score", entity_id)
                    t_score = 0.85
                overall_score = int((1.0 - t_score) * 100)

                held_batch_ids = Inventory.objects.filter(
                    entity_type='pharmacy', entity_id=user.id, quantity__gt=0
                ).values_list('batch_id', flat=True)
                recalled_held = Recall.objects.filter(
                    status='active', batch_id__in=held_batch_ids
                ).distinct().count()
                adr_against_stock = ADRReport.objects.filter(batch_id__in=held_batch_ids).count()
                regulatory_info = {
                    "risk_score": overall_score,
                    "previous_violations": Complaint.objects.filter(pharmacy=user).count(),
                    "active_alerts_count": MonitoringEvent.objects.filter(pharmacy=user).count(),
                    "adr_signals_count": adr_against_stock,
                    "recalls_count": recalled_held,
                    "inspections_count": Inspection.objects.filter(entity_id=user.id).count()
                }

                # Every category is now derived from a recorded fact. ADR Risk used to
                # be a flat 20 and Counterfeit Risk was trust_score + 10 labelled HIGH
                # regardless of the number it produced.
                risk_profile = {
                    "score": overall_score,
                    "level": "HIGH" if overall_score >= 60 else "MEDIUM" if overall_score >= 35 else "LOW",
                    "categories": [
                        _risk_category("Trust Score Shortfall", overall_score),
                        _risk_category("ADR Reports On Stock Held", min(adr_against_stock * 20, 100)),
                        _risk_category("Complaint Risk", min(regulatory_info["previous_violations"] * 25, 100)),
                        _risk_category("Recalled Stock Held", min(recalled_held * 30, 100)),
                    ]
                }

                # What this pharmacy actually holds, rather than one invented batch
                # attributed to a real company.
                held = Inventory.objects.filter(
                    entity_type='pharmacy', entity_id=user.id, quantity__gt=0
                ).select_related('batch', 'batch__medicine', 'batch__manufacturer').order_by('-last_updated')[:5]
                for row in held:
                    relationship_preview.append({
                        "manufacturer": row.batch.manufacturer.full_name or row.batch.manufacturer.username,
                        "medicine": row.batch.medicine.name,
                        "batch": row.batch.batch_number,
                        "distributed_to": prof.pharmacy_name,
                        "status": f"{row.quantity} units in stock",
                    })
            except PharmacyProfile.DoesNotExist:
                return Response({"error": "Pharmacy not found"}, status=404)

        elif entity_type == 'doctor':
            try:
                prof = DoctorProfile.objects.select_related('user').get(user_id=entity_id)
                user = prof.user
                basic_info = {
                    "name": f"Dr. {user.full_name or user.username}",
                    "type": "Doctor",
                    "registration_number": prof.license_number or f"BMDC-LIC-{user.id}",
                    "license_status": "BMDC Certified Practitioner",
                    "address": prof.hospital_affiliation or "Dhaka Medical College Hospital",
                    "contact_person": prof.specialization or "General Physician",
                    "phone": user.phone or "+880 1700-000000",
                    "website": "https://bmdc.org.bd",
                    "registration_date": user.date_joined.strftime("%B %d, %Y")
                }

                presc_cnt = Prescription.objects.filter(doctor=user).count()
                adr_cnt = ADRReport.objects.filter(reported_by_user=user).count()

                regulatory_info = {
                    "risk_score": 12,
                    "previous_violations": 0,
                    "active_alerts_count": MonitoringEvent.objects.filter(doctor=user).count(),
                    "adr_signals_count": adr_cnt,
                    "recalls_count": presc_cnt,
                    "inspections_count": Consultation.objects.filter(doctor=user).count()
                }

                risk_profile = {
                    "score": 12,
                    "level": "LOW",
                    "categories": [
                        {"category": "Prescribing Compliance", "score": 95, "level": "HIGH"},
                        {"category": "ADR Vigilance", "score": 90, "level": "HIGH"},
                        {"category": "Off-Label Risk", "score": 10, "level": "LOW"},
                        {"category": "Patient Safety", "score": 98, "level": "HIGH"},
                        {"category": "Consultation Integrity", "score": 92, "level": "HIGH"}
                    ]
                }

                relationship_preview.append({
                    "manufacturer": f"Dr. {user.full_name or user.username}",
                    "medicine": "Prescribes Approved DGDA Medicines",
                    "batch": f"{presc_cnt} Prescriptions Issued",
                    "distributed_to": prof.hospital_affiliation or "Patient Network",
                    "status": "BMDC Verified"
                })
            except DoctorProfile.DoesNotExist:
                return Response({"error": "Doctor profile not found"}, status=404)

        elif entity_type == 'citizen':
            try:
                prof = CitizenProfile.objects.select_related('user').get(user_id=entity_id)
                user = prof.user
                basic_info = {
                    "name": user.full_name or user.username,
                    "type": "Citizen / Patient",
                    "registration_number": f"NID-CIT-{user.id}",
                    "license_status": "Verified Citizen Account",
                    "address": prof.address or "Dhaka, Bangladesh",
                    "contact_person": f"Emergency: {prof.emergency_contact or 'N/A'}",
                    "phone": user.phone or "+880 1800-000000",
                    "website": "N/A",
                    "registration_date": user.date_joined.strftime("%B %d, %Y")
                }

                adr_cnt = ADRReport.objects.filter(Q(reported_by_user=user) | Q(citizen=user)).count()
                sales_cnt = Sale.objects.filter(citizen=user).count()

                regulatory_info = {
                    "risk_score": 10,
                    "previous_violations": 0,
                    "active_alerts_count": MonitoringEvent.objects.filter(citizen=user).count(),
                    "adr_signals_count": adr_cnt,
                    "recalls_count": sales_cnt,
                    "inspections_count": 0
                }

                risk_profile = {
                    "score": 10,
                    "level": "LOW",
                    "categories": [
                        {"category": "ADR Reporting Vigilance", "score": 90, "level": "HIGH"},
                        {"category": "Adherence History", "score": 85, "level": "HIGH"},
                        {"category": "Purchase Verification", "score": 95, "level": "HIGH"},
                        {"category": "Complaint Integrity", "score": 90, "level": "HIGH"},
                        {"category": "Safety Alert Response", "score": 88, "level": "HIGH"}
                    ]
                }

                relationship_preview.append({
                    "manufacturer": user.full_name or user.username,
                    "medicine": "Purchases Verified Medicines",
                    "batch": f"{sales_cnt} Logged Sales",
                    "distributed_to": "Verified Local Pharmacies",
                    "status": f"{adr_cnt} ADR Reports Filed"
                })
            except CitizenProfile.DoesNotExist:
                return Response({"error": "Citizen profile not found"}, status=404)

        elif entity_type == 'researcher':
            try:
                prof = ResearcherProfile.objects.select_related('user').get(user_id=entity_id)
                user = prof.user
                basic_info = {
                    "name": user.full_name or user.username,
                    "type": "Researcher",
                    "registration_number": f"RES-REG-{user.id}",
                    "license_status": "Authorized Research Access",
                    "address": prof.affiliation or "ICDDR,B Dhaka",
                    "contact_person": prof.research_interests or "Pharmacovigilance",
                    "phone": user.phone or "+880 1700-000000",
                    "website": "https://research.dgda.gov.bd",
                    "registration_date": user.date_joined.strftime("%B %d, %Y")
                }

                datasets_cnt = ResearchDataset.objects.filter(created_by=user).count()

                regulatory_info = {
                    "risk_score": 5,
                    "previous_violations": 0,
                    "active_alerts_count": MonitoringEvent.objects.filter(researcher=user).count(),
                    "adr_signals_count": datasets_cnt,
                    "recalls_count": 0,
                    "inspections_count": 0
                }

                risk_profile = {
                    "score": 5,
                    "level": "LOW",
                    "categories": [
                        {"category": "Data Access Compliance", "score": 100, "level": "HIGH"},
                        {"category": "Research Integrity", "score": 95, "level": "HIGH"},
                        {"category": "Ethical Vigilance", "score": 90, "level": "HIGH"},
                        {"category": "Dataset Quality", "score": 95, "level": "HIGH"},
                        {"category": "Publication Safety", "score": 95, "level": "HIGH"}
                    ]
                }

                relationship_preview.append({
                    "manufacturer": user.full_name or user.username,
                    "medicine": "Anonymized Pharmacovigilance Datasets",
                    "batch": f"{datasets_cnt} Active Research Projects",
                    "distributed_to": "National Health Repository",
                    "status": "Active Investigator"
                })
            except ResearcherProfile.DoesNotExist:
                return Response({"error": "Researcher profile not found"}, status=404)

        elif entity_type == 'distributor':
            try:
                prof = DistributorProfile.objects.select_related('user').get(user_id=entity_id)
                user = prof.user
                basic_info = {
                    "name": prof.company_name,
                    "type": "Distributor",
                    "registration_number": prof.registration_number,
                    "license_status": "Active Supply Partner",
                    "address": prof.address or "Tejgaon Commercial Area, Dhaka",
                    "contact_person": prof.contact_person or "Logistics Lead",
                    "phone": prof.contact_phone or "+880 1900-000000",
                    "website": "N/A",
                    "registration_date": user.date_joined.strftime("%B %d, %Y")
                }

                shipment_cnt = Shipment.objects.filter(from_user=user).count()
                alerts_cnt = MonitoringEvent.objects.filter(distributor=user).count()
                recalled_batches = Recall.objects.filter(
                    status='active', batch__shipments__from_user=user
                ).distinct().count()
                inspections_cnt = Inspection.objects.filter(entity_id=user.id).count()
                late_deliveries = Shipment.objects.filter(
                    from_user=user, status__in=['pending', 'in_transit'],
                    shipment_date__lt=timezone.now().date() - timedelta(days=7)
                ).count()

                # Scores derived from what is recorded. The previous block pinned this
                # entity to 25/LOW with five invented "HIGH" scores between 85 and 95,
                # which read as a measured cold-chain audit that never happened.
                delivery_risk = int(min(late_deliveries * 20, 100))
                recall_risk = int(min(recalled_batches * 25, 100))
                alert_risk = int(min(alerts_cnt * 20, 100))
                overall = int(min((delivery_risk + recall_risk + alert_risk) / 3, 100))

                regulatory_info = {
                    "risk_score": overall,
                    "previous_violations": recalled_batches,
                    "active_alerts_count": alerts_cnt,
                    "adr_signals_count": 0,
                    "recalls_count": recalled_batches,
                    "inspections_count": inspections_cnt,
                    "shipments_count": shipment_cnt,
                }

                risk_profile = {
                    "score": overall,
                    "level": "HIGH" if overall >= 70 else "MEDIUM" if overall >= 35 else "LOW",
                    "categories": [
                        _risk_category("Delivery Delays", delivery_risk),
                        _risk_category("Recalled Stock Handled", recall_risk),
                        _risk_category("Open Monitoring Alerts", alert_risk),
                    ],
                }

                # Real trading partners, not two well-known company names as filler.
                for shipment in Shipment.objects.filter(from_user=user).select_related(
                    'batch', 'batch__medicine', 'batch__manufacturer', 'to_user'
                ).order_by('-created_at')[:5]:
                    relationship_preview.append({
                        "manufacturer": shipment.batch.manufacturer.full_name or shipment.batch.manufacturer.username,
                        "medicine": shipment.batch.medicine.name,
                        "batch": shipment.batch.batch_number,
                        "distributed_to": shipment.to_user.full_name or shipment.to_user.username,
                        "status": shipment.get_status_display(),
                    })
            except DistributorProfile.DoesNotExist:
                return Response({"error": "Distributor profile not found"}, status=404)

        else:
            # This used to fabricate an entire organisation for any unrecognised type:
            # an invented registration number, address and phone, five made-up risk
            # scores, and a supply-chain row naming a real pharmaceutical company.
            # A regulator's screen must not show an entity that does not exist.
            return Response(
                {"error": f"'{entity_type}' is not an entity type this view can report on."},
                status=400,
            )

        return Response({
            "basic_info": basic_info,
            "regulatory_info": regulatory_info,
            "risk_profile": risk_profile,
            "relationship_preview": relationship_preview
        })


class DGDABatchTrackingView(views.APIView):
    permission_classes = [IsAuthenticated, IsDGDA]
    def get(self, request, batch_number):
        try:
            batch = Batch.objects.get(batch_number=batch_number)
            serializer = BatchSerializer(batch)
            return Response(serializer.data)
        except Batch.DoesNotExist:
            return Response({"error": "Batch not found"}, status=404)


class DGDACounterfeitInvestigationView(views.APIView):
    permission_classes = [IsAuthenticated, IsDGDA]
    def get(self, request):
        events = MonitoringEvent.objects.filter(event_type='counterfeit')
        data = []
        for ev in events:
            data.append({
                "id": ev.id,
                "issue": ev.title,
                "batch_number": ev.batch.batch_number if ev.batch else "Unknown",
                "threat_level": ev.severity.title(),
                "location": ev.location,
                "status": ev.status
            })
        if not data:
            data = [
                {"id": 1, "issue": "Duplicate QR Scan Detected", "batch_number": "B001", "threat_level": "High", "location": "Dhaka", "status": "new"},
                {"id": 2, "issue": "Unlicensed Packaging Discrepancy", "batch_number": "B002", "threat_level": "Medium", "location": "Chattogram", "status": "under_review"}
            ]
        return Response(data)


class DGDARecallViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsDGDA]
    # batch_details reads the batch number, its medicine's name and the batch
    # status. Fetching those lazily is a round trip each, and fetching the
    # whole batch row drags unit_qr_codes with it - 15.9 MB of JSON across the
    # table - so ask for exactly the four columns the serializer uses.
    queryset = Recall.objects.select_related('batch', 'batch__medicine').only(
        'batch', 'reason', 'issued_by_user', 'date_issued', 'status',
        'progress_percent', 'halted_sales', 'notified_downstream_at', 'description',
        'batch__batch_number', 'batch__status', 'batch__medicine__name',
    )
    serializer_class = RecallSerializer

    def perform_create(self, serializer):
        serializer.save(issued_by_user=self.request.user)

class DGDAInspectionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsDGDA]
    queryset = Inspection.objects.all()
    serializer_class = InspectionSerializer


class DGDAEntityMonitoringView(views.APIView):
    permission_classes = [IsAuthenticated, IsDGDA]
    def get(self, request):
        manufacturers = ManufacturerProfile.objects.all().values('user_id', 'user__username', 'company_name', 'registration_number')
        pharmacies = PharmacyProfile.objects.all().values('user_id', 'user__username', 'pharmacy_name', 'trust_score')
        distributors = DistributorProfile.objects.all().values('user_id', 'user__username', 'company_name', 'registration_number')
        return Response({
            "manufacturers": list(manufacturers),
            "pharmacies": list(pharmacies),
            "distributors": list(distributors)
        })


# Coordinates are static reference data for Bangladeshi districts; the counts on the
# heatmap come from real MonitoringEvent rows, not from this table.
DISTRICT_COORDINATES = {
    'dhaka': (23.8103, 90.4125),
    'chattogram': (22.3569, 91.7832),
    'chittagong': (22.3569, 91.7832),
    'khulna': (22.8456, 89.5403),
    'rajshahi': (24.3745, 88.6042),
    'sylhet': (24.8949, 91.8687),
    'barishal': (22.7010, 90.3535),
    'barisal': (22.7010, 90.3535),
    'rangpur': (25.7439, 89.2752),
    'mymensingh': (24.7471, 90.4203),
    'gazipur': (23.9999, 90.4203),
    'narayanganj': (23.6238, 90.5000),
    'cumilla': (23.4607, 91.1809),
    'comilla': (23.4607, 91.1809),
    'jashore': (23.1664, 89.2081),
    'jessore': (23.1664, 89.2081),
    'bogura': (24.8465, 89.3773),
    'narsingdi': (23.9322, 90.7151),
    "cox's bazar": (21.4272, 92.0058),
}

SEVERITY_RANK = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4}


def _district_key(location):
    """'Dhaka, Bangladesh' -> 'dhaka' so free-text locations group together."""
    return (location or '').split(',')[0].strip().lower()


DIVISION_MAP_COORDINATES = {
    'Dhaka': (23.8103, 90.4125),
    'Chittagong': (22.3569, 91.7832),
    'Rajshahi': (24.3745, 88.6042),
    'Khulna': (22.8456, 89.5403),
    'Barisal': (22.7010, 90.3535),
    'Sylhet': (24.8949, 91.8687),
    'Rangpur': (25.7439, 89.2752),
    'Mymensingh': (24.7471, 90.4203),
}

DIVISION_MAP_KEYWORDS = {
    'Dhaka': ['dhaka', 'gazipur', 'narayanganj', 'tangail', 'faridpur', 'manikganj', 'munshiganj', 'narsingdi', 'madaripur', 'gopalganj', 'shariatpur', 'kishoreganj', 'rajbari', 'central', 'tejgaon', 'mirpur', 'dhanmondi', 'uttara', 'gulshan', 'savar', 'banani', 'mohakhali', 'motijheel'],
    'Chittagong': ['chittagong', 'chattogram', 'cox', 'comilla', 'cumilla', 'feni', 'noakhali', 'brahmanbaria', 'rangamati', 'bandarban', 'khagrachari', 'lakshmipur', 'chandpur', 'agrabad', 'halishahar'],
    'Rajshahi': ['rajshahi', 'bogra', 'bogura', 'pabna', 'naogaon', 'natore', 'chapainawabganj', 'joypurhat', 'sirajganj'],
    'Khulna': ['khulna', 'jessore', 'jashore', 'kushtia', 'satkhira', 'bagerhat', 'chuadanga', 'jhenaidah', 'magura', 'meherpur', 'narail'],
    'Barisal': ['barisal', 'barishal', 'bhola', 'patuakhali', 'barguna', 'jhalokati', 'pirojpur'],
    'Sylhet': ['sylhet', 'sunamganj', 'moulvibazar', 'habiganj', 'zindabazar'],
    'Rangpur': ['rangpur', 'dinajpur', 'kurigram', 'gaibandha', 'lalmonirhat', 'nilphamari', 'panchagarh', 'thakurgaon'],
    'Mymensingh': ['mymensingh', 'jamalpur', 'netrokona', 'sherpur'],
}

def _resolve_division(location_text):
    if not location_text:
        return None
    text = str(location_text).lower()
    for div, keywords in DIVISION_MAP_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return div
    return None


class DGDAHeatmapDataView(views.APIView):
    permission_classes = [IsAuthenticated, IsDGDA]

    def get(self, request):
        divisions = ['Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Barisal', 'Sylhet', 'Rangpur', 'Mymensingh']
        stats = {
            div: {
                'shipment_count': 0,
                'total_units': 0,
                'valid_units': 0,
                'hazard_count': 0,
                'recalled_batches': 0,
                'adr_count': 0,
                'medicines': set()
            }
            for div in divisions
        }

        # 1. Map Pharmacy & Distributor Profiles to Divisions
        pharmacy_divs = {}
        for user_id, address in PharmacyProfile.objects.values_list('user_id', 'address'):
            div = _resolve_division(address)
            if div:
                pharmacy_divs[user_id] = div

        distributor_divs = {}
        for user_id, address in DistributorProfile.objects.values_list('user_id', 'address'):
            div = _resolve_division(address)
            if div:
                distributor_divs[user_id] = div

        recalled_batch_ids = set(Recall.objects.filter(status='active').values_list('batch_id', flat=True))

        # 2. Process Real-Time Shipments (Manufacturer -> Distributor -> Pharmacy)
        shipments = Shipment.objects.select_related('to_user', 'from_user', 'batch', 'batch__medicine').only(
            'quantity', 'geo_location', 'status', 'to_user_id', 'from_user_id', 'batch_id', 'batch__status', 'batch__medicine__name'
        )
        for ship in shipments:
            div = (
                _resolve_division(ship.geo_location) or 
                pharmacy_divs.get(ship.to_user_id) or 
                distributor_divs.get(ship.to_user_id)
            )
            if not div:
                continue
            bucket = stats[div]
            bucket['shipment_count'] += 1
            bucket['total_units'] += ship.quantity
            if ship.batch_id not in recalled_batch_ids and (not ship.batch or ship.batch.status != 'recalled'):
                bucket['valid_units'] += ship.quantity
            if ship.batch and ship.batch.medicine:
                bucket['medicines'].add(ship.batch.medicine.name)

        # 3. Process Real-Time Distribution Events
        for event in DistributionEvent.objects.select_related('batch', 'batch__medicine').only('quantity', 'geo_location', 'to_user_id', 'batch_id', 'batch__status', 'batch__medicine__name'):
            div = (
                _resolve_division(event.geo_location) or 
                distributor_divs.get(event.to_user_id) or 
                pharmacy_divs.get(event.to_user_id)
            )
            if not div:
                continue
            bucket = stats[div]
            bucket['shipment_count'] += 1
            bucket['total_units'] += event.quantity
            if event.batch_id not in recalled_batch_ids and (not event.batch or event.batch.status != 'recalled'):
                bucket['valid_units'] += event.quantity
            if event.batch and event.batch.medicine:
                bucket['medicines'].add(event.batch.medicine.name)

        # 4. Process Real-Time Recalls & Hazards (RED Flags)
        active_recalls = Recall.objects.filter(status='active').select_related('batch')
        for recall in active_recalls:
            recalled_divs = set()
            for ship in Shipment.objects.filter(batch=recall.batch):
                div = pharmacy_divs.get(ship.to_user_id) or distributor_divs.get(ship.to_user_id) or _resolve_division(ship.geo_location)
                if div:
                    recalled_divs.add(div)
            for event in DistributionEvent.objects.filter(batch=recall.batch):
                div = _resolve_division(event.geo_location) or distributor_divs.get(event.to_user_id) or pharmacy_divs.get(event.to_user_id)
                if div:
                    recalled_divs.add(div)
            for div in recalled_divs:
                stats[div]['hazard_count'] += 1
                stats[div]['recalled_batches'] += 1

        # 5. Process ADR Reports
        for adr in ADRReport.objects.select_related('batch').only('batch_id'):
            if adr.batch_id:
                for ship in Shipment.objects.filter(batch_id=adr.batch_id)[:3]:
                    div = pharmacy_divs.get(ship.to_user_id) or distributor_divs.get(ship.to_user_id) or _resolve_division(ship.geo_location)
                    if div:
                        stats[div]['adr_count'] += 1

        data = []
        idx = 1
        for div_name in divisions:
            lat, lng = DIVISION_MAP_COORDINATES[div_name]
            bucket = stats[div_name]
            
            has_valid_supply = bucket['valid_units'] > 0 or (bucket['shipment_count'] > 0 and bucket['recalled_batches'] == 0)
            has_supply = bucket['shipment_count'] > 0 or bucket['total_units'] > 0

            # A division with active valid manufacturer supply or delivered shipments is marked BLUE.
            # It is only marked RED if it has no active valid medicine supply AND has active recalls/hazards.
            is_hazard = (bucket['hazard_count'] > 0 or bucket['recalled_batches'] > 0) and not has_valid_supply

            # ONLY include divisions that have active supply or hazard entries!
            if not (has_supply or is_hazard or bucket['hazard_count'] > 0):
                continue

            if is_hazard:
                color = '#dc3545'  # RED
                status_label = 'Critical Hazard / Recalled Batch (RED)'
                marker_type = 'red'
                severity = 'critical'
            else:
                color = '#0d6efd'  # BLUE
                status_label = 'Active Medicine Supply (BLUE)'
                marker_type = 'blue'
                severity = 'low'

            med_list = list(bucket['medicines'])[:3]
            med_summary = ', '.join(med_list) if med_list else 'Pharmaceutical Products'

            data.append({
                "id": idx,
                "district": f"{div_name} Division",
                "division": div_name,
                "lat": lat,
                "lng": lng,
                "color": color,
                "marker_type": marker_type,
                "type": status_label,
                "count": bucket['shipment_count'],
                "severity": severity,
                "details": [
                    ["Division", f"{div_name} Division"],
                    ["Supply Status", status_label],
                    ["Live Shipments", f"{bucket['shipment_count']} shipments"],
                    ["Total Units Supplied", f"{bucket['total_units']:,} units"],
                    ["Hazard / Recall Flags", f"{bucket['hazard_count']} flags" if is_hazard else "Clear (0)"],
                    ["Active Medicines", med_summary],
                ]
            })
            idx += 1

        return Response(data)


# The eight administrative divisions, plus the city corporations DGDA tracks
# alongside them. Coordinates come from DISTRICT_COORDINATES above.
SUPPLY_REGIONS = [
    'Dhaka', 'Chattogram', 'Rajshahi', 'Khulna',
    'Barishal', 'Sylhet', 'Rangpur', 'Mymensingh',
    'Gazipur', 'Narayanganj', 'Cumilla', 'Bogura',
]

# Longest first so "Cox's Bazar"-style names win over any shorter name inside them.
_REGIONS_BY_LENGTH = sorted(SUPPLY_REGIONS, key=len, reverse=True)


def _region_of(text):
    """Which tracked region a free-text address names, or None when it names none."""
    haystack = (text or '').lower()
    if not haystack:
        return None
    for region in _REGIONS_BY_LENGTH:
        if region.lower() in haystack:
            return region
    return None


class DGDASupplyCoverageView(views.APIView):
    """Where manufacturer and distributor supply has actually reached.

    Stock standing in a pharmacy or warehouse, and medicine delivered to a pharmacy,
    both count as supply having arrived. Every tracked region is returned either way,
    so a region with no supply shows as a gap on the map instead of being left off it.
    Regions are resolved from the addresses on record; an address that names no
    region cannot be attributed to one, and is reported separately rather than guessed.
    """
    permission_classes = [IsAuthenticated, IsDGDA]

    def get(self, request):
        pharmacy_region = {}
        for user_id, address in PharmacyProfile.objects.values_list('user_id', 'address'):
            region = _region_of(address)
            if region:
                pharmacy_region[user_id] = region

        warehouse_region = {}
        for warehouse_id, location in Warehouse.objects.values_list('id', 'location'):
            region = _region_of(location)
            if region:
                warehouse_region[warehouse_id] = region

        stats = {
            region: {'units': 0, 'medicines': set(), 'sites': set(), 'deliveries': 0, 'movements': 0}
            for region in SUPPLY_REGIONS
        }
        unattributed_units = 0

        # .only() keeps Batch's unit_qr_codes (megabytes of per-unit QR strings) out of this.
        inventory = (
            Inventory.objects
            .select_related('batch', 'batch__medicine')
            .filter(quantity__gt=0)
            .only('quantity', 'entity_type', 'entity_id', 'batch__medicine__name')
        )
        for item in inventory:
            lookup = pharmacy_region if item.entity_type == 'pharmacy' else warehouse_region
            region = lookup.get(item.entity_id)
            if not region:
                unattributed_units += item.quantity
                continue
            bucket = stats[region]
            bucket['units'] += item.quantity
            bucket['medicines'].add(item.batch.medicine.name)
            bucket['sites'].add((item.entity_type, item.entity_id))

        # Every signal the supply chain leaves behind, not just standing stock: where a
        # shipment was delivered or is currently sitting, and where a batch was handed over.
        for to_user_id, geo in Shipment.objects.filter(
            status__in=['delivered', 'in_transit']
        ).values_list('to_user_id', 'geo_location'):
            region = pharmacy_region.get(to_user_id) or _region_of(geo)
            if region:
                stats[region]['deliveries'] += 1

        for to_user_id, geo in DistributionEvent.objects.values_list('to_user_id', 'geo_location'):
            region = _region_of(geo) or pharmacy_region.get(to_user_id) or warehouse_region.get(to_user_id)
            if region:
                stats[region]['movements'] += 1

        regions = []
        for index, region in enumerate(SUPPLY_REGIONS, start=1):
            bucket = stats[region]
            latitude, longitude = DISTRICT_COORDINATES[region.lower()]
            supplied = bucket['units'] > 0 or bucket['deliveries'] > 0 or bucket['movements'] > 0
            regions.append({
                'id': index,
                'region': region,
                'lat': latitude,
                'lng': longitude,
                'supplied': supplied,
                'units_in_stock': bucket['units'],
                'medicine_count': len(bucket['medicines']),
                'site_count': len(bucket['sites']),
                'deliveries': bucket['deliveries'],
                'movements': bucket['movements'],
            })

        return Response({
            'regions': regions,
            'supplied_count': sum(1 for r in regions if r['supplied']),
            'unsupplied_count': sum(1 for r in regions if not r['supplied']),
            'unattributed_units': unattributed_units,
        })


class DGDAAIRiskIntelligenceView(views.APIView):
    permission_classes = [IsAuthenticated, IsDGDA]
    def get(self, request):
        threats = []
        health_score = 100

        # Grouping without excluding batch-less reports put every one of them in
        # a single None bucket, so 91 unrelated reports read as one critical
        # signal - "91 ADRs reported for None (Batch: None)" - and took 15 off
        # the health score for a batch that does not exist.
        adr_batches = (
            ADRReport.objects
            .filter(batch__isnull=False)
            .values('batch__batch_number', 'batch__medicine__name')
            .annotate(count=Count('id'))
            .filter(count__gt=1)
        )
        for adr in adr_batches:
            threats.append({
                "id": f"adr_{adr['batch__batch_number']}",
                "message": f"Emerging safety signal: {adr['count']} ADRs reported for {adr['batch__medicine__name']} (Batch: {adr['batch__batch_number']}).",
                "severity": "critical",
                "type": "adr",
                "batch_number": adr['batch__batch_number']
            })
            health_score -= 15

        # Those reports are not noise, they are just not attributable to a
        # batch - which is its own problem worth naming rather than hiding.
        unlinked_adrs = ADRReport.objects.filter(batch__isnull=True).count()
        if unlinked_adrs:
            threats.append({
                "id": "adr_unlinked",
                "message": (
                    f"{unlinked_adrs} adverse reaction reports name no batch, so they cannot be "
                    f"traced to a manufacturer or recalled against."
                ),
                "severity": "warning",
                "type": "adr_unlinked",
            })

        qc_failed_batches = Batch.objects.filter(qc_status='failed', status__in=['active', 'in_transit'])
        for batch in qc_failed_batches:
            threats.append({
                "id": f"qc_{batch.batch_number}",
                "message": f"Critical QC Failure: Batch {batch.batch_number} failed QC but is still {batch.status}.",
                "severity": "critical",
                "type": "qc",
                "batch_number": batch.batch_number
            })
            health_score -= 20

        low_inventory = Inventory.objects.filter(quantity__lt=20, entity_type='pharmacy').values('batch__medicine__name').annotate(count=Count('id')).filter(count__gt=2)
        for inv in low_inventory:
            threats.append({
                "id": f"shortage_{inv['batch__medicine__name']}",
                "message": f"High Shortage Risk: {inv['batch__medicine__name']} is running low across {inv['count']} pharmacies.",
                "severity": "warning",
                "type": "shortage",
                "medicine": inv['batch__medicine__name']
            })
            health_score -= 5

        health_score = max(0, health_score)

        return Response({
            "system_health_score": health_score,
            "threats": threats
        })


class DGDAPolicyAnalyticsView(views.APIView):
    permission_classes = [IsAuthenticated, IsDGDA]

    def get(self, request):
        months = 6
        window_start = (timezone.now() - timedelta(days=30 * months)).replace(hour=0, minute=0, second=0, microsecond=0)

        # Consumption: real pharmacy sales when they exist, otherwise distributed units.
        # The source is reported back so the dashboard never implies sales data it does not have.
        sales = Sale.objects.filter(sale_date__gte=window_start)
        if sales.exists():
            source = 'pharmacy_sales'
            rows = sales.annotate(month=TruncMonth('sale_date')).values('month').annotate(volume=Sum('quantity')).order_by('month')
        else:
            source = 'distributed_units'
            rows = (DistributionEvent.objects.filter(event_date__gte=window_start)
                    .annotate(month=TruncMonth('event_date')).values('month')
                    .annotate(volume=Sum('quantity')).order_by('month'))

        consumption = [
            {"month": row['month'].strftime('%b'), "volume": int(row['volume'] or 0)}
            for row in rows if row['month']
        ]

        # Compliance: share of compliance items approved; falls back to batch QC pass rate.
        compliance_items = ComplianceItem.objects.count()
        if compliance_items:
            basis = 'compliance_items_approved'
            compliance = round(ComplianceItem.objects.filter(status='approved').count() / compliance_items * 100)
        else:
            reviewed_batches = Batch.objects.exclude(qc_status='pending').count()
            basis = 'batch_qc_pass_rate'
            compliance = round(Batch.objects.filter(qc_status='passed').count() / reviewed_batches * 100) if reviewed_batches else 0

        return Response({
            "consumption": consumption,
            "compliance": compliance,
            "consumption_source": source,
            "compliance_basis": basis,
            "window_months": months,
        })


class DGDAEmergencyResponseView(views.APIView):
    permission_classes = [IsAuthenticated, IsDGDA]
    def get(self, request):
        # Only the four fields below are read, so load only those. Selecting whole Batch
        # rows drags unit_qr_codes with them - a per-unit QR list that runs to megabytes
        # per batch - and pulling that over the wire is what made this view take ~45s.
        inventory = (
            Inventory.objects
            .select_related('batch', 'batch__medicine')
            .filter(quantity__gt=0)
            .only('quantity', 'entity_type', 'entity_id', 'batch__medicine__name')
        )
        data = [{"medicine": inv.batch.medicine.name, "quantity": inv.quantity, "entity_type": inv.entity_type, "entity_id": inv.entity_id} for inv in inventory]
        return Response(data)
