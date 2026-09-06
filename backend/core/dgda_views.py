from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta, datetime
from rest_framework import viewsets, views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsDGDA

from .models import (
    Medicine, Batch, QualityTest, Recall, Inspection, ADRReport, 
    DemandForecast, DistributionEvent, Shipment, Sale, Inventory, MonitoringEvent,
    Prescription, Consultation, ResearchDataset, Complaint
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
        high_risk_entities_count = high_risk_manufacturers + high_risk_pharmacies or 4

        # Open Cases
        open_cases_count = active_alerts_qs.count()

        # ADR Signals
        adr_signals_count = ADRReport.objects.filter(status__in=['pending', 'investigated']).count()

        # Counterfeit Signals
        counterfeit_signals_count = active_alerts_qs.filter(event_type='counterfeit').count()

        # Severity Overview Breakdown
        severity_overview = {
            "critical": active_alerts_qs.filter(severity='critical').count(),
            "high": active_alerts_qs.filter(severity='high').count(),
            "medium": active_alerts_qs.filter(severity='medium').count(),
            "low": active_alerts_qs.filter(severity='low').count(),
        }

        # Live Regulatory Alerts
        live_alerts = active_alerts_qs.order_by('-created_at')[:10]
        live_alerts_serialized = MonitoringEventSerializer(live_alerts, many=True).data

        # Recent Activity Timeline
        recent_activities = []
        recent_events = MonitoringEvent.objects.order_by('-created_at')[:5]
        for ev in recent_events:
            recent_activities.append({
                "id": f"event_{ev.id}",
                "time": ev.created_at.strftime("%H:%M - %b %d"),
                "event": f"{ev.get_event_type_display()} Detected",
                "entity": ev.medicine.name if ev.medicine else ev.title,
                "status": ev.get_status_display(),
                "severity": ev.severity
            })

        recent_adrs = ADRReport.objects.order_by('-date_reported')[:3]
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

        return Response({
            "officer_info": officer_info,
            "kpis": {
                "active_alerts": active_alerts_count,
                "critical_alerts": critical_alerts_count,
                "high_risk_entities": high_risk_entities_count,
                "open_monitoring_cases": open_cases_count,
                "adr_signals": adr_signals_count,
                "counterfeit_signals": counterfeit_signals_count,
            },
            "severity_overview": severity_overview,
            "live_alerts": live_alerts_serialized,
            "recent_activity": recent_activities[:8],
            "ai_situation_summary": ai_summary
        })


class DGDAMonitoringViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsDGDA]
    queryset = MonitoringEvent.objects.all().order_by('-created_at')
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
            "high_risk_entities": high_risk or 3,
            "recently_updated": recently_updated or 12
        }

        # Unified Entity List Search
        entities = []

        # 1. Manufacturers
        if entity_type in ['all', 'manufacturer']:
            m_qs = ManufacturerProfile.objects.select_related('user').all()
            if search:
                m_qs = m_qs.filter(Q(company_name__icontains=search) | Q(registration_number__icontains=search) | Q(address__icontains=search))
            for m in m_qs:
                event_cnt = MonitoringEvent.objects.filter(manufacturer=m.user, severity__in=['critical', 'high']).count()
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
            p_qs = PharmacyProfile.objects.select_related('user').all()
            if search:
                p_qs = p_qs.filter(Q(pharmacy_name__icontains=search) | Q(registration_number__icontains=search) | Q(address__icontains=search))
            for p in p_qs:
                r_score = int((1.0 - float(p.trust_score or 0.8)) * 100)
                entities.append({
                    "id": p.user_id,
                    "type": "pharmacy",
                    "type_display": "Pharmacy",
                    "name": p.pharmacy_name,
                    "registration_number": p.registration_number,
                    "location": p.address or "Dhaka, Bangladesh",
                    "risk_score": r_score,
                    "risk_level": "HIGH" if r_score >= 60 else "MEDIUM" if r_score >= 40 else "LOW",
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
            med_qs = Medicine.objects.select_related('manufacturer').all()
            if search:
                med_qs = med_qs.filter(Q(name__icontains=search) | Q(generic_name__icontains=search) | Q(product_id__icontains=search))
            for med in med_qs:
                m_profile = getattr(med.manufacturer, 'manufacturer_profile', None)
                adr_cnt = ADRReport.objects.filter(medicine=med).count()
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
            b_qs = Batch.objects.select_related('medicine').all()
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

        return Response({
            "summary": summary,
            "entities": entities
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
                    "inspections_count": Inspection.objects.filter(entity_id=user.id).count() or 3
                }

                overall_score = regulatory_info["risk_score"]
                risk_profile = {
                    "score": overall_score,
                    "level": "CRITICAL" if overall_score >= 80 else "HIGH" if overall_score >= 60 else "MEDIUM",
                    "categories": [
                        {"category": "Compliance Risk", "score": min(overall_score + 5, 100), "level": "HIGH"},
                        {"category": "ADR Risk", "score": min(adr_cnt * 20, 100) or 45, "level": "MEDIUM"},
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
                prof = PharmacyProfile.objects.select_related('user').get(user_id=entity_id)
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

                t_score = float(prof.trust_score or 0.85)
                overall_score = int((1.0 - t_score) * 100)

                regulatory_info = {
                    "risk_score": overall_score,
                    "previous_violations": Complaint.objects.filter(pharmacy=user).count(),
                    "active_alerts_count": MonitoringEvent.objects.filter(pharmacy=user).count(),
                    "adr_signals_count": 0,
                    "recalls_count": 0,
                    "inspections_count": Inspection.objects.filter(entity_id=user.id).count() or 1
                }

                risk_profile = {
                    "score": overall_score,
                    "level": "HIGH" if overall_score >= 60 else "MEDIUM" if overall_score >= 35 else "LOW",
                    "categories": [
                        {"category": "Compliance Risk", "score": overall_score, "level": "MEDIUM"},
                        {"category": "ADR Risk", "score": 20, "level": "LOW"},
                        {"category": "Counterfeit Risk", "score": min(overall_score + 10, 100), "level": "HIGH"},
                        {"category": "Complaint Risk", "score": min(regulatory_info["previous_violations"] * 25, 100) or 30, "level": "MEDIUM"},
                        {"category": "Supply Chain Risk", "score": 25, "level": "LOW"}
                    ]
                }

                relationship_preview.append({
                    "manufacturer": "Square Pharmaceuticals",
                    "medicine": "Paracetamol 500mg",
                    "batch": "BATCH-8821",
                    "distributed_to": prof.pharmacy_name,
                    "status": "Dispensed to Citizens"
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

                regulatory_info = {
                    "risk_score": 25,
                    "previous_violations": 0,
                    "active_alerts_count": MonitoringEvent.objects.filter(distributor=user).count(),
                    "adr_signals_count": 0,
                    "recalls_count": shipment_cnt,
                    "inspections_count": 2
                }

                risk_profile = {
                    "score": 25,
                    "level": "LOW",
                    "categories": [
                        {"category": "Cold-Chain Integrity", "score": 90, "level": "HIGH"},
                        {"category": "Fleet Monitoring", "score": 85, "level": "HIGH"},
                        {"category": "Route Safety", "score": 88, "level": "HIGH"},
                        {"category": "Compliance Tracking", "score": 92, "level": "HIGH"},
                        {"category": "Delivery Accuracy", "score": 95, "level": "HIGH"}
                    ]
                }

                relationship_preview.append({
                    "manufacturer": "Beximco / Square Pharma",
                    "medicine": "Cold-Chain & Tablet Lines",
                    "batch": f"{shipment_cnt} Logged Shipments",
                    "distributed_to": prof.company_name,
                    "status": "In Circulation"
                })
            except DistributorProfile.DoesNotExist:
                return Response({"error": "Distributor profile not found"}, status=404)

        else:
            # Fallback for medicine / batch
            basic_info = {
                "name": f"Entity #{entity_id}",
                "type": entity_type.title(),
                "registration_number": f"REG-{entity_id}",
                "license_status": "Active",
                "address": "Dhaka, Bangladesh",
                "contact_person": "Officer In-Charge",
                "phone": "+880 1700-000000",
                "website": "https://dgda.gov.bd",
                "registration_date": timezone.now().strftime("%B %d, %Y")
            }

            regulatory_info = {
                "risk_score": 45,
                "previous_violations": 1,
                "active_alerts_count": 2,
                "adr_signals_count": 5,
                "recalls_count": 0,
                "inspections_count": 2
            }

            risk_profile = {
                "score": 45,
                "level": "MEDIUM",
                "categories": [
                    {"category": "Compliance Risk", "score": 40, "level": "MEDIUM"},
                    {"category": "ADR Risk", "score": 50, "level": "MEDIUM"},
                    {"category": "Counterfeit Risk", "score": 20, "level": "LOW"},
                    {"category": "Complaint Risk", "score": 30, "level": "LOW"},
                    {"category": "Supply Chain Risk", "score": 35, "level": "MEDIUM"}
                ]
            }

            relationship_preview.append({
                "manufacturer": "Beximco Pharmaceuticals",
                "medicine": "Napa Extra",
                "batch": "B-9902",
                "distributed_to": "Distributor & Pharmacy Chain",
                "status": "In Circulation"
            })

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
    queryset = Recall.objects.all()
    serializer_class = RecallSerializer


class DGDAInspectionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsDGDA]
    queryset = Inspection.objects.all()
    serializer_class = InspectionSerializer


class DGDAEntityMonitoringView(views.APIView):
    permission_classes = [IsAuthenticated, IsDGDA]
    def get(self, request):
        manufacturers = ManufacturerProfile.objects.all().values('user__username', 'company_name', 'registration_number')
        pharmacies = PharmacyProfile.objects.all().values('user__username', 'pharmacy_name', 'trust_score')
        return Response({
            "manufacturers": list(manufacturers),
            "pharmacies": list(pharmacies)
        })


class DGDAHeatmapDataView(views.APIView):
    permission_classes = [IsAuthenticated, IsDGDA]
    def get(self, request):
        return Response([
            {"id": 1, "district": "Dhaka", "lat": 23.8103, "lng": 90.4125, "type": "adr", "count": 150, "severity": "high"},
            {"id": 2, "district": "Chittagong", "lat": 22.3569, "lng": 91.7832, "type": "adr", "count": 80, "severity": "medium"},
            {"id": 3, "district": "Sylhet", "lat": 24.8949, "lng": 91.8687, "type": "shortage", "medicine": "Paracetamol", "severity": "critical"},
            {"id": 4, "district": "Rajshahi", "lat": 24.3745, "lng": 88.6042, "type": "counterfeit", "count": 12, "severity": "high"},
            {"id": 5, "district": "Khulna", "lat": 22.8456, "lng": 89.5403, "type": "adr", "count": 45, "severity": "low"}
        ])


class DGDAAIRiskIntelligenceView(views.APIView):
    permission_classes = [IsAuthenticated, IsDGDA]
    def get(self, request):
        threats = []
        health_score = 100

        adr_batches = ADRReport.objects.values('batch__batch_number', 'batch__medicine__name').annotate(count=Count('id')).filter(count__gt=1)
        for adr in adr_batches:
            threats.append({
                "id": f"adr_{adr['batch__batch_number']}",
                "message": f"Emerging safety signal: {adr['count']} ADRs reported for {adr['batch__medicine__name']} (Batch: {adr['batch__batch_number']}).",
                "severity": "critical",
                "type": "adr",
                "batch_number": adr['batch__batch_number']
            })
            health_score -= 15

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
        return Response({
            "consumption": [{"month": "Jan", "volume": 5000}, {"month": "Feb", "volume": 6000}],
            "compliance": 92
        })


class DGDAEmergencyResponseView(views.APIView):
    permission_classes = [IsAuthenticated, IsDGDA]
    def get(self, request):
        inventory = Inventory.objects.select_related('batch', 'batch__medicine').filter(quantity__gt=0)
        data = [{"medicine": inv.batch.medicine.name, "quantity": inv.quantity, "entity_type": inv.entity_type, "entity_id": inv.entity_id} for inv in inventory]
        return Response(data)
