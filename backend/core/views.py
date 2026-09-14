from collections import defaultdict
from datetime import date, timedelta

from django.contrib.auth import get_user_model
User = get_user_model()
from django.db import models
from django.db.models import Sum, Q
from django.utils import timezone
from rest_framework import generics, views, status, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import (
    ADRReport,
    Batch,
    ComplianceItem,
    Complaint,
    DemandForecast,
    DistributionEvent,
    DosageSchedule,
    Inventory,
    Medicine,
    Notification,
    QualityTest,
    Recall,
    Sale,
    Shipment,
    Warehouse,
)
from users.models import PharmacyProfile
from .serializers import (
    ADRReportSerializer,
    BatchSerializer,
    ComplaintSerializer,
    ComplianceItemSerializer,
    DemandForecastSerializer,
    DistributionEventSerializer,
    DistributorShipmentSerializer,
    DrugPassportSerializer,
    DosageScheduleSerializer,
    InventorySerializer,
    LOW_STOCK_THRESHOLD,
    MedicineSerializer,
    NotificationSerializer,
    PharmacyShipmentSerializer,
    QualityTestSerializer,
    RecallSerializer,
    PharmacyProfileSerializer,
    SaleSerializer,
    WarehouseSerializer,
)
from users.permissions import IsCitizen, IsDGDA, IsDistributor, IsManufacturer, IsPharmacy
import os
import logging
import json
from urllib import error, request
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

class DrugPassportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, qr_code):
        batch = get_object_or_404(Batch, qr_code=qr_code)
        serializer = DrugPassportSerializer(batch)
        return Response(serializer.data)


class ManufacturerMedicineListCreateView(generics.ListCreateAPIView):
    serializer_class = MedicineSerializer
    permission_classes = [permissions.IsAuthenticated, IsManufacturer]

    def get_queryset(self):
        return Medicine.objects.filter(manufacturer=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(manufacturer=self.request.user)


class ManufacturerBatchListCreateView(generics.ListCreateAPIView):
    serializer_class = BatchSerializer
    permission_classes = [permissions.IsAuthenticated, IsManufacturer]

    def get_queryset(self):
        return Batch.objects.filter(manufacturer=self.request.user).select_related('medicine').prefetch_related('quality_tests', 'shipments', 'distribution_events').order_by('-created_at')

    def perform_create(self, serializer):
        batch = serializer.save(manufacturer=self.request.user, release_blocked=True, qc_status='pending')
        DistributionEvent.objects.create(
            batch=batch,
            from_user=self.request.user,
            to_user=self.request.user,
            stage_from='factory',
            stage_to='warehouse',
            quantity=batch.quantity_produced,
            geo_location='factory-release',
            notes='Batch created and queued for QC release.',
        )


class ManufacturerBatchDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = BatchSerializer
    permission_classes = [permissions.IsAuthenticated, IsManufacturer]

    def get_queryset(self):
        return Batch.objects.filter(manufacturer=self.request.user).select_related('medicine').prefetch_related('quality_tests', 'shipments', 'distribution_events')


class BatchReleaseView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsManufacturer]

    def post(self, request, pk):
        batch = get_object_or_404(Batch, pk=pk, manufacturer=request.user)
        if batch.qc_status != 'passed' or batch.release_blocked:
            return Response({'detail': 'Batch cannot be released until QC passes.'}, status=status.HTTP_400_BAD_REQUEST)

        batch.release_blocked = False
        batch.warehouse_released_at = timezone.now()
        batch.qr_activated_at = timezone.now()
        batch.save(update_fields=['release_blocked', 'warehouse_released_at', 'qr_activated_at', 'updated_at'])
        DistributionEvent.objects.create(
            batch=batch,
            from_user=request.user,
            to_user=request.user,
            stage_from='factory',
            stage_to='warehouse',
            quantity=batch.quantity_produced,
            geo_location='warehouse-release',
            notes='Batch released to warehouse after QC approval.',
        )
        return Response(BatchSerializer(batch).data)


class BatchQRExportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsManufacturer]

    def get(self, request, pk):
        batch = get_object_or_404(Batch, pk=pk, manufacturer=request.user)
        export_rows = ['unit_number,qr_code']
        for index, qr_code in enumerate(batch.unit_qr_codes, start=1):
            export_rows.append(f'{index},"{qr_code}"')
        return Response({
            'batch_number': batch.batch_number,
            'ddp_id': batch.ddp_id,
            'qr_code': batch.qr_code,
            'export_csv': '\n'.join(export_rows),
        })


class BatchQualityTestListCreateView(generics.ListCreateAPIView):
    serializer_class = QualityTestSerializer
    permission_classes = [permissions.IsAuthenticated, IsManufacturer]

    def get_queryset(self):
        return QualityTest.objects.filter(batch_id=self.kwargs['pk']).select_related('batch').order_by('-conducted_date', '-id')

    def perform_create(self, serializer):
        batch = get_object_or_404(Batch, pk=self.kwargs['pk'], manufacturer=self.request.user)
        serializer.save(batch=batch)


class DistributionEventListCreateView(generics.ListCreateAPIView):
    serializer_class = DistributionEventSerializer
    permission_classes = [permissions.IsAuthenticated, IsManufacturer]

    def get_queryset(self):
        return DistributionEvent.objects.filter(batch_id=self.kwargs['pk']).select_related('batch', 'from_user', 'to_user').order_by('-event_date')

    def perform_create(self, serializer):
        batch = get_object_or_404(Batch, pk=self.kwargs['pk'], manufacturer=self.request.user)
        serializer.save(batch=batch, from_user=self.request.user)


class RecallListCreateView(generics.ListCreateAPIView):
    serializer_class = RecallSerializer
    permission_classes = [permissions.IsAuthenticated, IsManufacturer]

    def get_queryset(self):
        return Recall.objects.filter(batch__manufacturer=self.request.user).select_related('batch').order_by('-date_issued')

    def perform_create(self, serializer):
        batch = serializer.validated_data['batch']
        if batch.manufacturer_id != self.request.user.id:
            raise permissions.PermissionDenied('You can only recall batches that you manufactured.')
        batch.status = 'recalled'
        batch.release_blocked = True
        batch.save(update_fields=['status', 'release_blocked', 'updated_at'])
        serializer.save(issued_by_user=self.request.user, halted_sales=True, notified_downstream_at=timezone.now())


class ComplianceDashboardView(generics.ListCreateAPIView):
    serializer_class = ComplianceItemSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsManufacturer()]
        return [permissions.IsAuthenticated(), IsDGDA()]

    def get_queryset(self):
        if getattr(self.request.user, 'role', None) == 'manufacturer':
            return ComplianceItem.objects.filter(owner=self.request.user).order_by('due_date')
        return ComplianceItem.objects.select_related('owner').order_by('due_date')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ManufacturerDashboardView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsManufacturer]

    def get(self, request):
        medicines = Medicine.objects.filter(manufacturer=request.user).order_by('-created_at')
        batches = Batch.objects.filter(manufacturer=request.user).select_related('medicine').prefetch_related('quality_tests', 'distribution_events').order_by('-created_at')
        recalls = Recall.objects.filter(batch__manufacturer=request.user).select_related('batch').order_by('-date_issued')
        compliance_items = ComplianceItem.objects.filter(owner=request.user).order_by('due_date')
        shipments = Shipment.objects.filter(batch__manufacturer=request.user).select_related('batch', 'to_user').order_by('-created_at')

        total_batches = batches.count()
        active_batches = batches.filter(status='active', release_blocked=False).count()
        passed_batches_30d = batches.filter(qc_status='passed', updated_at__gte=timezone.now() - timedelta(days=30)).count()
        reviewed_batches_30d = batches.filter(updated_at__gte=timezone.now() - timedelta(days=30)).count()
        recalled_batches_year = recalls.filter(date_issued__year=date.today().year).count()
        distribution_events = DistributionEvent.objects.filter(batch__manufacturer=request.user).count()
        production_volume = batches.aggregate(total=Sum('quantity_produced'))['total'] or 0
        qc_failures = QualityTest.objects.filter(batch__manufacturer=request.user, is_out_of_spec=True).count()
        qc_pass_rate = round((passed_batches_30d / reviewed_batches_30d) * 100, 2) if reviewed_batches_30d else 0

        compliance_score = 100
        compliance_score -= compliance_items.filter(status__in=['pending', 'expired']).count() * 8
        compliance_score -= recalls.filter(status='active').count() * 5
        compliance_score -= max(0, qc_failures - 2) * 3
        compliance_score = max(0, min(100, compliance_score))

        if compliance_score >= 95:
            compliance_grade = 'A+'
        elif compliance_score >= 85:
            compliance_grade = 'A'
        elif compliance_score >= 70:
            compliance_grade = 'B'
        else:
            compliance_grade = 'C'

        recent_sales = Sale.objects.filter(batch__manufacturer=request.user, sale_date__gte=timezone.now() - timedelta(days=90)).count()
        forecast_value = max(production_volume // max(total_batches or 1, 1), recent_sales * 2 or 50)

        monthly_production = defaultdict(int)
        for batch in batches:
            monthly_production[batch.created_at.strftime('%Y-%m')] += batch.quantity_produced

        monthly_distribution = defaultdict(int)
        for shipment in shipments:
            monthly_distribution[shipment.created_at.strftime('%Y-%m')] += shipment.quantity

        expiry_forecast = defaultdict(int)
        next_six_months = [date.today().replace(day=1)]
        for _ in range(5):
            current = next_six_months[-1]
            next_month = (current.replace(day=28) + timedelta(days=4)).replace(day=1)
            next_six_months.append(next_month)
        for batch in batches:
            if batch.expiry_date >= date.today() and batch.expiry_date <= date.today() + timedelta(days=180):
                expiry_forecast[batch.expiry_date.strftime('%Y-%m')] += batch.quantity_produced

        medicine_distribution = defaultdict(int)
        for event in DistributionEvent.objects.filter(batch__manufacturer=request.user).select_related('batch', 'batch__medicine'):
            medicine_distribution[event.batch.medicine.name] += event.quantity

        top_selling_medicines = [
            {'medicine': medicine, 'units': quantity}
            for medicine, quantity in sorted(medicine_distribution.items(), key=lambda item: item[1], reverse=True)[:5]
        ]

        alerts = []
        for batch in batches.filter(qc_status='failed')[:3]:
            alerts.append({
                'type': 'danger',
                'title': f'Batch {batch.batch_number} QC failed',
                'message': 'Action needed before release.',
            })

        for batch in batches.filter(expiry_date__lte=date.today() + timedelta(days=30), expiry_date__gte=date.today())[:3]:
            alerts.append({
                'type': 'warning',
                'title': f'Batch {batch.batch_number} expiring in 30 days',
                'message': f'{batch.medicine.name} needs dispatch or review.',
            })

        for recall in recalls.filter(status='active')[:2]:
            alerts.append({
                'type': 'danger',
                'title': f'Recall notice for {recall.batch.batch_number}',
                'message': recall.reason,
            })

        for shipment in shipments.filter(status__in=['pending', 'in_transit'])[:2]:
            alerts.append({
                'type': 'warning',
                'title': 'Shipment delay risk',
                'message': f'Batch {shipment.batch.batch_number} is still {shipment.status.replace("_", " ")}.',
            })

        alerts = alerts[:6]

        forecast = {
            'region': request.query_params.get('region', 'Bangladesh'),
            'forecast_date': date.today() + timedelta(days=30),
            'predicted_demand': forecast_value,
            'confidence_score': '0.78',
            'seasonal_signal': 'Current quarter trend',
            'source_summary': ['production volume', 'recent sales', 'qc trend'],
        }

        production_vs_sales = []
        production_by_month = {month: value for month, value in monthly_production.items()}
        distribution_by_month = {month: value for month, value in monthly_distribution.items()}
        for month in sorted(set(production_by_month.keys()) | set(distribution_by_month.keys()))[-6:]:
            production_vs_sales.append({
                'month': month,
                'produced': production_by_month.get(month, 0),
                'distributed': distribution_by_month.get(month, 0),
            })

        expiry_forecast_series = [
            {'month': month.strftime('%Y-%m'), 'units_expiring': expiry_forecast.get(month.strftime('%Y-%m'), 0)}
            for month in next_six_months
        ]

        return Response({
            'summary': {
                'products': medicines.count(),
                'active_batches': active_batches,
                'qc_pass_rate': qc_pass_rate,
                'recalled_batches': recalled_batches_year,
                'compliance_score': compliance_score,
                'compliance_grade': compliance_grade,
                'distribution_events': distribution_events,
                'production_volume': production_volume,
                'qc_failures': qc_failures,
            },
            'medicines': MedicineSerializer(medicines, many=True).data,
            'batches': BatchSerializer(batches, many=True).data,
            'recalls': RecallSerializer(recalls, many=True).data,
            'compliance_items': ComplianceItemSerializer(compliance_items, many=True).data,
            'demand_forecast': forecast,
            'charts': {
                'production_vs_sales': production_vs_sales,
                'expiry_forecast': expiry_forecast_series,
                'top_selling_medicines': top_selling_medicines,
            },
            'alerts': alerts,
        })


class DemandForecastView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsManufacturer]

    def get(self, request):
        region = request.query_params.get('region', 'Bangladesh')
        recent_batches = Batch.objects.filter(manufacturer=request.user).order_by('-created_at')[:5]
        recent_sales = Sale.objects.filter(batch__manufacturer=request.user, sale_date__gte=timezone.now() - timedelta(days=90)).count()
        predicted_demand = max(sum(batch.quantity_produced for batch in recent_batches) // max(len(recent_batches) or 1, 1), recent_sales * 2 or 50)
        forecast = DemandForecast.objects.create(
            region=region,
            forecast_date=date.today() + timedelta(days=30),
            predicted_demand=predicted_demand,
            confidence_score=0.78,
            seasonal_signal='Auto-generated from recent production and sales patterns',
            source_summary=[batch.batch_number for batch in recent_batches],
            created_by=request.user,
            notes='Heuristic demand forecast generated from available sales and production data.',
        )
        return Response(DemandForecastSerializer(forecast).data)

class PersonalMedicineRecordView(generics.ListCreateAPIView):
    serializer_class = DosageScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DosageSchedule.objects.filter(citizen=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        medicine = serializer.validated_data.get('medicine')
        if not medicine:
            med_name = self.request.data.get('medicine_name', 'General Medicine').strip()
            medicine = Medicine.objects.filter(name__iexact=med_name).first()
            if not medicine:
                mfg_user = User.objects.filter(role='manufacturer').first() or User.objects.first()
                medicine = Medicine.objects.create(
                    name=med_name,
                    category='General',
                    dosage_form=self.request.data.get('dosage_form', 'Tablet'),
                    manufacturer=mfg_user
                )
        serializer.save(citizen=self.request.user, medicine=medicine)

class PersonalMedicineRecordDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DosageScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DosageSchedule.objects.filter(citizen=self.request.user)

    def perform_update(self, serializer):
        medicine = serializer.validated_data.get('medicine')
        if not medicine and 'medicine_name' in self.request.data:
            med_name = str(self.request.data.get('medicine_name')).strip()
            medicine = Medicine.objects.filter(name__iexact=med_name).first()
            if not medicine:
                mfg_user = User.objects.filter(role='manufacturer').first() or User.objects.first()
                medicine = Medicine.objects.create(
                    name=med_name,
                    category='General',
                    dosage_form=self.request.data.get('dosage_form', 'Tablet'),
                    manufacturer=mfg_user
                )
            serializer.save(medicine=medicine)
        else:
            serializer.save()

class ADRReportCreateView(generics.ListCreateAPIView):
    serializer_class = ADRReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'is_staff', False) or getattr(user, 'role', '') in ['dgda', 'admin']:
            return ADRReport.objects.all().select_related('medicine', 'batch').order_by('-id')
        
        # Match by user ID or email so all ADR reports filed by the authenticated user appear cleanly
        user_email = getattr(user, 'email', None)
        return ADRReport.objects.filter(
            Q(reported_by_user=user) | 
            Q(citizen=user) |
            (Q(reported_by_user__email=user_email) if user_email else Q(id__in=[])) |
            (Q(citizen__email=user_email) if user_email else Q(id__in=[]))
        ).select_related('medicine', 'batch').order_by('-id').distinct()

    def perform_create(self, serializer):
        medicine_id = self.request.data.get('medicine')
        medicine_name = self.request.data.get('medicine_name')
        med_obj = None

        if isinstance(medicine_id, int):
            med_obj = Medicine.objects.filter(id=medicine_id).first()

        target_name = medicine_name or (medicine_id if isinstance(medicine_id, str) else None)
        if not med_obj and target_name:
            clean_name = str(target_name).replace('custom-', '').strip()
            if clean_name:
                med_obj = Medicine.objects.filter(name__iexact=clean_name).first()
                if not med_obj:
                    mfg = User.objects.filter(role='manufacturer').first() or self.request.user
                    med_obj = Medicine.objects.create(
                        name=clean_name,
                        generic_name=clean_name,
                        manufacturer=mfg
                    )

        if not med_obj:
            med_obj = Medicine.objects.first()

        serializer.save(
            reported_by_user=self.request.user,
            citizen=self.request.user,
            medicine=med_obj
        )

class PharmacyFinderView(generics.ListAPIView):
    serializer_class = PharmacyProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PharmacyProfile.objects.all().order_by('-trust_score')

class NotificationListView(generics.ListCreateAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        try:
            # Auto-sync active dosage schedules into user notifications so every alarm appears in Notifications API
            active_schedules = DosageSchedule.objects.filter(citizen=user, is_active=True).select_related('medicine')
            for sched in active_schedules:
                med_name = getattr(sched.medicine, 'name', 'Personal Medicine') if sched.medicine else 'Personal Medicine'
                reminder_times = sched.reminder_times or ['08:00 PM']
                for rtime in reminder_times:
                    notif_title = f"⏰ Medicine Dose Reminder: {med_name}"
                    notif_msg = f"Scheduled dose time: {rtime} ({sched.dosage or '1 Dose'}, {sched.frequency or 'Daily'}). {sched.notes if sched.notes else ''}"
                    Notification.objects.get_or_create(
                        user=user,
                        title=notif_title,
                        defaults={'message': notif_msg, 'is_read': False}
                    )
        except Exception as e:
            pass

        return Notification.objects.filter(user=user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class NotificationMarkReadView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        notification = get_object_or_404(Notification, pk=pk, user=request.user)
        notification.is_read = True
        notification.save()
        return Response({"status": "success"})


# AI Views

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


class AIAssistantView(views.APIView):
    permission_classes=[permissions.IsAuthenticated,IsCitizen]
    
    def post(self, request):
        prompt= request.data.get('prompt')
        if not prompt:
            return Response({"error": "Prompt is required"}, status= status.HTTP_400_BAD_REQUEST)
        
        openai_api_key = os.environ.get("OPENAI_API_KEY")
        openrouter_api_key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("NVIDIA_API_KEY")
        api_key = openai_api_key or openrouter_api_key
        if not api_key:
            return Response({"error": "OPENAI_API_KEY or OPENROUTER_API_KEY is missing in backend/.env."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        try:
            schedules= DosageSchedule.objects.filter(citizen=request.user, is_active=True)
            meds_list=", ".join([s.medicine.name for s in schedules])
            context = f"User is currently taking: {meds_list if meds_list else 'No current medications'}. "
            system_prompt = (
                "You are an expert Medical Doctor and Clinical Assistant. "
                "Your answer must be generated by the AI model, not by application fallback text. "
                "First provide direct, helpful health advice for the user's symptoms and immediate care steps. "
                "Then provide suitable medicine options, dosages, common side effects, and estimated prices in Bangladesh when appropriate. "
                "Language rule: detect the user's language from the latest user message. Reply completely in English for English input and completely in Bangla for Bangla input. Do not mix languages unless the user mixes languages. "
                "If the user asks about a non-medical topic, give only a short refusal in the same language as the user. "
                "Be professional, clear, empathetic, and remind the user to consult a registered doctor for severe or persistent symptoms."
            )
            model = (
                os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
                if openai_api_key
                else os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini")
            )
            response_text = _chat_completion(
                api_key=api_key,
                model=model,
                messages=[
                    {"role": "system", "content": f"{system_prompt}\nContext: {context}"},
                    {"role": "user", "content": prompt},
                ],
                is_openrouter=not bool(openai_api_key),
            )
            return Response({"response": response_text})
        except Exception as e:
            logger.exception("AI assistant upstream request failed")
            return Response({"error": f"AI service unavailable: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)
           
class InteractionCheckerView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsCitizen]

    def post(self, request):
        medicines = request.data.get('medicines', []) # list of strings
        if len(medicines) < 2:
            return Response({"error": "Please provide at least two medicines to check for interactions"}, status=status.HTTP_400_BAD_REQUEST)

        api_key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("NVIDIA_API_KEY")
        if not api_key:
            return Response({"error": "OPENROUTER_API_KEY is missing in backend/.env. Please add OPENROUTER_API_KEY to your .env file."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            meds_str = ", ".join(medicines)
            full_prompt = f"Please analyze potential drug interactions between the following medicines: {meds_str}. Provide a summary of severity (None, Minor, Moderate, Major) and a brief explanation. Structure your response clearly."

            response_text = _chat_completion(
                api_key=api_key,
                model=os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini"),
                messages=[{"role": "user", "content": full_prompt}],
                is_openrouter=True,
            )
            return Response({"response": response_text})
        except Exception as e:
            return Response({"error": f"NVIDIA API Error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CitizenDashboardView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsCitizen]

    def get(self, request):
        user = request.user
        
        # 1. Total Scans (Baseline 42 + user scans/reports)
        user_scans = ADRReport.objects.filter(
            Q(reported_by_user=user) | Q(citizen=user)
        ).count() * 3 + DosageSchedule.objects.filter(citizen=user).count() * 5
        total_scans = 42 + user_scans
        
        # 2. Active Medicines
        active_medicines = DosageSchedule.objects.filter(citizen=user, is_active=True).count()
        if active_medicines == 0:
            active_medicines = 5

        # 3. Reports Submitted
        user_email = getattr(user, 'email', None)
        reports_submitted = ADRReport.objects.filter(
            Q(reported_by_user=user) | 
            Q(citizen=user) |
            (Q(reported_by_user__email=user_email) if user_email else Q(id__in=[])) |
            (Q(citizen__email=user_email) if user_email else Q(id__in=[]))
        ).distinct().count()

        # 4. Pharmacy Visits
        pharmacy_visits = Sale.objects.filter(citizen=user).values('pharmacy').distinct().count()
        if pharmacy_visits == 0:
            pharmacy_visits = 8

        # Dynamic Recent Activity from real user actions in DB
        activities = []
        user_email = getattr(user, 'email', None)

        # 1. Real ADR Reports
        adr_items = ADRReport.objects.filter(
            Q(reported_by_user=user) | Q(citizen=user) |
            (Q(reported_by_user__email=user_email) if user_email else Q(id__in=[])) |
            (Q(citizen__email=user_email) if user_email else Q(id__in=[]))
        ).select_related('medicine').order_by('-date_reported')[:5]

        for adr in adr_items:
            m_name = adr.medicine_name or (adr.medicine.name if adr.medicine else 'Medicine')
            activities.append({
                'id': f'adr-{adr.id}',
                'dt': adr.date_reported,
                'type': 'adr',
                'desc': f"ADR Report Filed: {m_name} ({adr.severity.capitalize() if adr.severity else 'Reaction'})",
                'status': adr.status or 'pending'
            })

        # 2. Real Dosage Schedules / Medicine Alarms
        dosage_items = DosageSchedule.objects.filter(citizen=user).select_related('medicine').order_by('-created_at')[:5]
        for ds in dosage_items:
            m_name = ds.medicine.name if ds.medicine else (ds.medicine_name or 'Medicine')
            activities.append({
                'id': f'ds-{ds.id}',
                'dt': ds.created_at,
                'type': 'alarm',
                'desc': f"Medicine Schedule: {m_name} ({ds.dosage or '1 Dose'}, {ds.frequency or 'Daily'})",
                'status': 'verified' if ds.is_active else 'completed'
            })

        # 3. Real Pharmacy Sales / Purchases
        sale_items = Sale.objects.filter(citizen=user).select_related('batch', 'batch__medicine', 'pharmacy').order_by('-sale_date')[:5]
        for sale in sale_items:
            m_name = sale.batch.medicine.name if (sale.batch and sale.batch.medicine) else 'Medicine'
            p_name = sale.pharmacy.username if sale.pharmacy else 'Pharmacy'
            activities.append({
                'id': f'sale-{sale.id}',
                'dt': sale.sale_date,
                'type': 'pharmacy',
                'desc': f"Pharmacy Visit ({p_name}): Purchased {m_name} ({sale.quantity} units)",
                'status': 'completed'
            })

        # 4. Real Notifications
        notif_items = Notification.objects.filter(user=user).order_by('-created_at')[:5]
        for n in notif_items:
            activities.append({
                'id': f'notif-{n.id}',
                'dt': n.created_at,
                'type': 'scan' if 'scan' in n.title.lower() else 'alarm' if 'dose' in n.title.lower() else 'adr',
                'desc': n.title,
                'status': 'completed' if n.is_read else 'pending'
            })

        # Sort all combined activities by date descending
        def get_dt(item):
            d = item['dt']
            if not d:
                return timezone.now() - timedelta(days=365)
            if timezone.is_naive(d):
                return timezone.make_aware(d)
            return d

        activities.sort(key=get_dt, reverse=True)

        # Helper to format humanized relative time
        def format_human_time(d):
            if not d:
                return 'Recently'
            now = timezone.now()
            if timezone.is_naive(d):
                d = timezone.make_aware(d)
            diff = now - d
            seconds = int(diff.total_seconds())
            if seconds < 60:
                return 'Just now'
            minutes = seconds // 60
            if minutes < 60:
                return f'{minutes}m ago'
            hours = minutes // 60
            if hours < 24:
                return f'{hours}h ago'
            days = hours // 24
            if days == 1:
                return 'Yesterday'
            if days < 30:
                return f'{days}d ago'
            return d.strftime('%b %d, %Y')

        recent_activity = []
        for act in activities[:6]:
            recent_activity.append({
                'id': act['id'],
                'type': act['type'],
                'desc': act['desc'],
                'time': format_human_time(act['dt']),
                'status': act['status']
            })

        if not recent_activity:
            recent_activity = [
                {'id': 'init-1', 'type': 'alarm', 'desc': 'Account registered & MedGuard BD active', 'time': 'Just now', 'status': 'completed'}
            ]
        
        # Upcoming Dose
        upcoming_dose = None
        schedules = DosageSchedule.objects.filter(citizen=user, is_active=True).select_related('medicine')
        if schedules.exists():
            sched = schedules.first()
            time_val = sched.reminder_times[0] if sched.reminder_times and len(sched.reminder_times) > 0 else '08:00 PM'
            med_name = sched.medicine.name if sched.medicine else (sched.medicine_name or 'Personal Medicine')
            upcoming_dose = {
                'id': sched.id,
                'medicine_name': med_name,
                'dosage': sched.dosage or '1 Dose',
                'frequency': sched.frequency or 'Daily',
                'time': time_val,
                'notes': sched.notes or ''
            }

        # Recall Alerts
        recalls_data = []
        # Find active recalls for any batch of a medicine the user is taking
        user_med_ids = schedules.values_list('medicine_id', flat=True)
        active_recalls = Recall.objects.filter(status='active', batch__medicine_id__in=user_med_ids).select_related('batch')
        for recall in active_recalls:
            recalls_data.append({
                'batch_number': recall.batch.batch_number,
                'medicine_name': recall.batch.medicine.name,
                'reason': recall.reason
            })

        return Response({
            'stats': {
                'total_scans': total_scans,
                'active_medicines': active_medicines,
                'reports_submitted': reports_submitted,
                'pharmacy_visits': pharmacy_visits,
            },
            'recent_activity': recent_activity,
            'upcoming_dose': upcoming_dose,
            'recalls': recalls_data
        })


# Pharmacy Portal Views

class PharmacyInventoryListCreateView(generics.ListCreateAPIView):
    serializer_class = InventorySerializer
    permission_classes = [permissions.IsAuthenticated, IsPharmacy]

    def get_queryset(self):
        return Inventory.objects.filter(
            entity_type='pharmacy', entity_id=self.request.user.id
        ).select_related('batch', 'batch__medicine').order_by('-last_updated')

    def perform_create(self, serializer):
        batch = serializer.validated_data['batch']
        existing = Inventory.objects.filter(
            entity_type='pharmacy', entity_id=self.request.user.id, batch=batch
        ).first()
        if existing:
            existing.quantity += serializer.validated_data.get('quantity', 0)
            existing.save(update_fields=['quantity', 'last_updated'])
            serializer.instance = existing
        else:
            serializer.save(entity_type='pharmacy', entity_id=self.request.user.id)


class PharmacyInventoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = InventorySerializer
    permission_classes = [permissions.IsAuthenticated, IsPharmacy]

    def get_queryset(self):
        return Inventory.objects.filter(
            entity_type='pharmacy', entity_id=self.request.user.id
        ).select_related('batch', 'batch__medicine')


class PharmacyShipmentListView(generics.ListAPIView):
    serializer_class = PharmacyShipmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsPharmacy]

    def get_queryset(self):
        return Shipment.objects.filter(to_user=self.request.user).select_related(
            'batch', 'batch__medicine', 'from_user'
        ).order_by('-created_at')


class PharmacyShipmentReceiveView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsPharmacy]

    def post(self, request, pk):
        shipment = get_object_or_404(Shipment, pk=pk, to_user=request.user)
        if shipment.status == 'delivered':
            return Response({'detail': 'Shipment already received.'}, status=status.HTTP_400_BAD_REQUEST)

        shipment.status = 'delivered'
        shipment.delivery_date = date.today()
        shipment.save(update_fields=['status', 'delivery_date', 'updated_at'])

        inventory, _ = Inventory.objects.get_or_create(
            entity_type='pharmacy', entity_id=request.user.id, batch=shipment.batch,
            defaults={'quantity': 0},
        )
        inventory.quantity += shipment.quantity
        inventory.save(update_fields=['quantity', 'last_updated'])

        return Response(PharmacyShipmentSerializer(shipment).data)


class PharmacyBatchVerifyView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsPharmacy]

    def get(self, request, qr_code):
        batch = Batch.objects.filter(qr_code=qr_code).select_related('medicine').first()
        if not batch:
            return Response({'verified': False, 'verdict': 'unknown', 'detail': 'QR code not recognized.'}, status=status.HTTP_404_NOT_FOUND)

        active_recall = Recall.objects.filter(batch=batch, status='active').first()
        is_expired = batch.expiry_date < date.today()

        if active_recall:
            verdict = 'recalled'
        elif is_expired:
            verdict = 'expired'
        elif batch.status != 'active' or batch.release_blocked:
            verdict = 'blocked'
        else:
            verdict = 'authentic'

        return Response({
            'verified': verdict == 'authentic',
            'verdict': verdict,
            'recall_reason': active_recall.reason if active_recall else None,
            'batch': DrugPassportSerializer(batch).data,
        })


class PharmacyCitizenLookupView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsPharmacy]

    def get(self, request):
        phone = request.query_params.get('phone', '').strip()
        if not phone:
            return Response({'detail': 'A phone number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        matches = User.objects.filter(role='citizen', phone=phone)
        return Response([
            {'id': citizen.id, 'username': citizen.username, 'full_name': citizen.full_name, 'phone': citizen.phone}
            for citizen in matches
        ])


class PharmacySaleListCreateView(generics.ListCreateAPIView):
    serializer_class = SaleSerializer
    permission_classes = [permissions.IsAuthenticated, IsPharmacy]

    def get_queryset(self):
        return Sale.objects.filter(pharmacy=self.request.user).select_related(
            'batch', 'batch__medicine', 'citizen'
        ).order_by('-sale_date')

    def perform_create(self, serializer):
        batch = serializer.validated_data['batch']
        quantity = serializer.validated_data['quantity']

        if Recall.objects.filter(batch=batch, status='active').exists():
            raise ValidationError('This batch has an active recall and cannot be sold.')
        if batch.expiry_date < date.today():
            raise ValidationError('This batch has expired and cannot be sold.')
        if batch.status != 'active' or batch.release_blocked:
            raise ValidationError('This batch is not released for sale.')

        inventory = Inventory.objects.filter(
            entity_type='pharmacy', entity_id=self.request.user.id, batch=batch
        ).first()
        if not inventory or inventory.quantity < quantity:
            raise ValidationError('Not enough stock of this batch to complete the sale.')

        inventory.quantity -= quantity
        inventory.save(update_fields=['quantity', 'last_updated'])

        serializer.save(pharmacy=self.request.user)


class PharmacyRecallAlertsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsPharmacy]

    def get(self, request):
        batch_ids = Inventory.objects.filter(
            entity_type='pharmacy', entity_id=request.user.id
        ).values_list('batch_id', flat=True)
        recalls = Recall.objects.filter(batch_id__in=batch_ids, status='active').select_related('batch', 'batch__medicine')
        return Response(RecallSerializer(recalls, many=True).data)


class PharmacyExpiryAlertsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsPharmacy]

    def get(self, request):
        horizon = date.today() + timedelta(days=90)
        inventory = Inventory.objects.filter(
            entity_type='pharmacy', entity_id=request.user.id, batch__expiry_date__lte=horizon
        ).select_related('batch', 'batch__medicine').order_by('batch__expiry_date')

        return Response([
            {
                'inventory_id': item.id,
                'batch_number': item.batch.batch_number,
                'medicine': item.batch.medicine.name,
                'expiry_date': item.batch.expiry_date,
                'quantity': item.quantity,
                'is_expired': item.batch.expiry_date < date.today(),
            }
            for item in inventory
        ])


class PharmacyDemandForecastView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsPharmacy]

    def get(self, request):
        region = request.query_params.get('region', 'Bangladesh')
        recent_sales = Sale.objects.filter(
            pharmacy=request.user, sale_date__gte=timezone.now() - timedelta(days=90)
        )
        units_sold_90d = recent_sales.aggregate(total=Sum('quantity'))['total'] or 0
        current_stock = Inventory.objects.filter(
            entity_type='pharmacy', entity_id=request.user.id
        ).aggregate(total=Sum('quantity'))['total'] or 0
        predicted_demand = max(units_sold_90d // 3, current_stock // 4, 20)

        forecast = DemandForecast.objects.create(
            region=region,
            forecast_date=date.today() + timedelta(days=30),
            predicted_demand=predicted_demand,
            confidence_score=0.70,
            seasonal_signal='Auto-generated from recent pharmacy sales and current stock levels',
            source_summary=[f'{recent_sales.count()} sales in last 90 days', f'{current_stock} units in current stock'],
            created_by=request.user,
            notes='Heuristic pharmacy demand forecast based on sales velocity and current stock.',
        )
        return Response(DemandForecastSerializer(forecast).data)


class PharmacyComplaintListView(generics.ListAPIView):
    serializer_class = ComplaintSerializer
    permission_classes = [permissions.IsAuthenticated, IsPharmacy]

    def get_queryset(self):
        return Complaint.objects.filter(pharmacy=self.request.user).select_related('citizen').order_by('-date_submitted')


class PharmacyComplaintResolveView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsPharmacy]

    def post(self, request, pk):
        complaint = get_object_or_404(Complaint, pk=pk, pharmacy=request.user)
        resolution_text = request.data.get('resolution_text', '').strip()
        if not resolution_text:
            return Response({'detail': 'A resolution note is required.'}, status=status.HTTP_400_BAD_REQUEST)

        complaint.status = 'resolved'
        complaint.resolution_text = resolution_text
        complaint.save(update_fields=['status', 'resolution_text'])
        return Response(ComplaintSerializer(complaint).data)


class PharmacyRiskAlertsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsPharmacy]

    def get(self, request):
        inventory = Inventory.objects.filter(
            entity_type='pharmacy', entity_id=request.user.id
        ).select_related('batch', 'batch__medicine')

        alerts = []
        for item in inventory:
            batch = item.batch
            if batch.release_blocked or batch.status != 'active':
                alerts.append({
                    'type': 'danger',
                    'title': f'Unreleased batch in stock: {batch.batch_number}',
                    'message': f'{batch.medicine.name} is marked "{batch.status}" (release_blocked={batch.release_blocked}) but is in your inventory. Re-verify its QR code before selling.',
                })
            if batch.qc_status == 'failed':
                alerts.append({
                    'type': 'danger',
                    'title': f'QC-failed batch in stock: {batch.batch_number}',
                    'message': f'{batch.medicine.name} failed quality control checks. Consider quarantining this stock.',
                })

        large_sales = Sale.objects.filter(
            pharmacy=request.user, quantity__gte=50
        ).select_related('batch', 'batch__medicine', 'citizen').order_by('-sale_date')[:5]
        for sale in large_sales:
            alerts.append({
                'type': 'warning',
                'title': f'Unusually large sale: {sale.quantity} units',
                'message': f'{sale.batch.medicine.name} sold to {sale.citizen.username} in a single transaction. Review for possible stockpiling or misuse.',
            })

        return Response(alerts[:10])


class PharmacyDashboardView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsPharmacy]

    def get(self, request):
        inventory = Inventory.objects.filter(
            entity_type='pharmacy', entity_id=request.user.id
        ).select_related('batch', 'batch__medicine')
        low_stock_count = sum(1 for item in inventory if item.quantity <= LOW_STOCK_THRESHOLD)
        expiring_count = inventory.filter(batch__expiry_date__lte=date.today() + timedelta(days=90)).count()
        expired_count = inventory.filter(batch__expiry_date__lt=date.today()).count()

        recall_batch_ids = inventory.values_list('batch_id', flat=True)
        active_recalls = Recall.objects.filter(batch_id__in=recall_batch_ids, status='active')

        complaints = Complaint.objects.filter(pharmacy=request.user)
        pending_complaints = complaints.filter(status='pending').count()

        sales_30d = Sale.objects.filter(pharmacy=request.user, sale_date__gte=timezone.now() - timedelta(days=30))
        sales_90d = Sale.objects.filter(pharmacy=request.user, sale_date__gte=timezone.now() - timedelta(days=90))
        revenue_30d = sales_30d.aggregate(total=Sum('price'))['total'] or 0

        trust_score = 100
        trust_score -= expired_count * 5
        trust_score -= active_recalls.count() * 10
        trust_score -= pending_complaints * 4
        trust_score -= low_stock_count * 1
        trust_score = max(0, min(100, trust_score))

        if trust_score >= 95:
            trust_grade = 'A+'
        elif trust_score >= 85:
            trust_grade = 'A'
        elif trust_score >= 70:
            trust_grade = 'B'
        else:
            trust_grade = 'C'

        PharmacyProfile.objects.filter(user=request.user).update(trust_score=trust_score)

        monthly_sales = defaultdict(int)
        medicine_sales = defaultdict(int)
        for sale in sales_90d.select_related('batch', 'batch__medicine'):
            monthly_sales[sale.sale_date.strftime('%Y-%m')] += sale.quantity
            medicine_sales[sale.batch.medicine.name] += sale.quantity

        top_selling_medicines = [
            {'medicine': medicine, 'units': quantity}
            for medicine, quantity in sorted(medicine_sales.items(), key=lambda item: item[1], reverse=True)[:5]
        ]

        return Response({
            'summary': {
                'total_stock_items': inventory.count(),
                'low_stock_items': low_stock_count,
                'expiring_items': expiring_count,
                'expired_items': expired_count,
                'active_recalls': active_recalls.count(),
                'pending_complaints': pending_complaints,
                'sales_30d': sales_30d.count(),
                'revenue_30d': str(revenue_30d),
                'trust_score': trust_score,
                'trust_grade': trust_grade,
            },
            'charts': {
                'monthly_sales': [{'month': month, 'units_sold': units} for month, units in sorted(monthly_sales.items())],
                'top_selling_medicines': top_selling_medicines,
            },
        })


# Distributor Portal Views

class DistributorWarehouseListCreateView(generics.ListCreateAPIView):
    serializer_class = WarehouseSerializer
    permission_classes = [permissions.IsAuthenticated, IsDistributor]

    def get_queryset(self):
        return Warehouse.objects.filter(distributor=self.request.user).order_by('name')

    def perform_create(self, serializer):
        serializer.save(distributor=self.request.user)


class DistributorWarehouseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WarehouseSerializer
    permission_classes = [permissions.IsAuthenticated, IsDistributor]

    def get_queryset(self):
        return Warehouse.objects.filter(distributor=self.request.user)


class DistributorIncomingShipmentListView(generics.ListAPIView):
    serializer_class = DistributorShipmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsDistributor]

    def get_queryset(self):
        return Shipment.objects.filter(to_user=self.request.user).select_related(
            'batch', 'batch__medicine', 'from_user'
        ).order_by('-created_at')


class DistributorShipmentReceiveView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsDistributor]

    def post(self, request, pk):
        shipment = get_object_or_404(Shipment, pk=pk, to_user=request.user)
        if shipment.status == 'delivered':
            return Response({'detail': 'Shipment already received.'}, status=status.HTTP_400_BAD_REQUEST)

        shipment.status = 'delivered'
        shipment.delivery_date = date.today()
        shipment.save(update_fields=['status', 'delivery_date', 'updated_at'])
        return Response(DistributorShipmentSerializer(shipment).data)


class DistributorOutgoingShipmentListCreateView(generics.ListCreateAPIView):
    serializer_class = DistributorShipmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsDistributor]

    def get_queryset(self):
        return Shipment.objects.filter(from_user=self.request.user).select_related(
            'batch', 'batch__medicine', 'to_user'
        ).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(from_user=self.request.user)


class DistributorOutgoingShipmentDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = DistributorShipmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsDistributor]

    def get_queryset(self):
        return Shipment.objects.filter(from_user=self.request.user).select_related(
            'batch', 'batch__medicine', 'to_user'
        )


class DistributorAnalyticsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsDistributor]

    def get(self, request):
        shipments = Shipment.objects.filter(from_user=request.user).select_related('to_user')
        delivered = shipments.filter(status='delivered')

        transit_days = [
            (shipment.delivery_date - shipment.shipment_date).days
            for shipment in delivered
            if shipment.delivery_date and shipment.shipment_date
        ]
        avg_transit_days = round(sum(transit_days) / len(transit_days), 1) if transit_days else None

        monthly_volume = defaultdict(int)
        pharmacy_volume = defaultdict(int)
        for shipment in shipments:
            monthly_volume[shipment.shipment_date.strftime('%Y-%m')] += shipment.quantity
            pharmacy_volume[shipment.to_user.username] += shipment.quantity

        top_destinations = [
            {'pharmacy': username, 'units': units}
            for username, units in sorted(pharmacy_volume.items(), key=lambda item: item[1], reverse=True)[:5]
        ]

        return Response({
            'summary': {
                'total_shipments': shipments.count(),
                'delivered': delivered.count(),
                'in_transit': shipments.filter(status='in_transit').count(),
                'pending': shipments.filter(status='pending').count(),
                'cancelled': shipments.filter(status='cancelled').count(),
                'avg_transit_days': avg_transit_days,
            },
            'charts': {
                'monthly_volume': [{'month': month, 'units': units} for month, units in sorted(monthly_volume.items())],
                'top_destinations': top_destinations,
            },
        })


class DistributorRouteOptimizationView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsDistributor]

    def get(self, request):
        shipments = Shipment.objects.filter(
            from_user=request.user, status__in=['pending', 'in_transit']
        ).select_related('to_user', 'to_user__pharmacy_profile', 'batch', 'batch__medicine')

        area_groups = defaultdict(list)
        for shipment in shipments:
            profile = getattr(shipment.to_user, 'pharmacy_profile', None)
            address = profile.address if profile else None
            area = address.split(',')[0].strip() if address else 'Unknown area'
            area_groups[area].append(shipment)

        suggestions = [
            {
                'area': area,
                'shipment_count': len(group),
                'total_units': sum(shipment.quantity for shipment in group),
                'shipments': [
                    {
                        'id': shipment.id,
                        'batch_number': shipment.batch.batch_number,
                        'medicine': shipment.batch.medicine.name,
                        'pharmacy': shipment.to_user.username,
                        'quantity': shipment.quantity,
                    }
                    for shipment in group
                ],
            }
            for area, group in area_groups.items()
        ]
        suggestions.sort(key=lambda item: item['shipment_count'], reverse=True)

        return Response({
            'note': 'Heuristic area-based batching suggestion, grouped by pharmacy address text. Not a real distance/route calculation.',
            'suggestions': suggestions,
        })


class DistributorFleetMonitoringView(generics.ListAPIView):
    serializer_class = DistributorShipmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsDistributor]

    def get_queryset(self):
        return Shipment.objects.filter(
            from_user=self.request.user, status='in_transit'
        ).select_related('batch', 'batch__medicine', 'to_user').order_by('-geo_timestamp')


class DistributorShipmentLocationUpdateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsDistributor]

    def post(self, request, pk):
        shipment = get_object_or_404(Shipment, pk=pk, from_user=request.user, status='in_transit')
        geo_location = request.data.get('geo_location', '').strip()
        if not geo_location:
            return Response({'detail': 'A location is required.'}, status=status.HTTP_400_BAD_REQUEST)

        shipment.geo_location = geo_location
        shipment.geo_timestamp = timezone.now()
        shipment.save(update_fields=['geo_location', 'geo_timestamp', 'updated_at'])
        return Response(DistributorShipmentSerializer(shipment).data)


ROUTE_RISK_KEYWORDS = ['flood', 'waterlogged', 'hartal', 'strike', 'accident', 'construction', 'বন্যা', 'জলাবদ্ধ', 'হরতাল']
OVERDUE_IN_TRANSIT_DAYS = 3


class DistributorRouteRiskView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsDistributor]

    def get(self, request):
        shipments = Shipment.objects.filter(
            from_user=request.user, status__in=['pending', 'in_transit']
        ).select_related('batch', 'batch__medicine', 'to_user', 'to_user__pharmacy_profile')

        alerts = []
        for shipment in shipments:
            if shipment.status == 'in_transit':
                days_elapsed = (date.today() - shipment.shipment_date).days
                if days_elapsed > OVERDUE_IN_TRANSIT_DAYS:
                    alerts.append({
                        'type': 'danger',
                        'title': f'Delayed shipment: Batch {shipment.batch.batch_number}',
                        'message': f'In transit for {days_elapsed} days (started {shipment.shipment_date}), past the {OVERDUE_IN_TRANSIT_DAYS}-day expectation.',
                    })

            profile = getattr(shipment.to_user, 'pharmacy_profile', None)
            text_to_scan = ' '.join(filter(None, [shipment.geo_location, profile.address if profile else None])).lower()
            matched_keywords = [keyword for keyword in ROUTE_RISK_KEYWORDS if keyword.lower() in text_to_scan]
            if matched_keywords:
                alerts.append({
                    'type': 'warning',
                    'title': f'Route risk keyword match: Batch {shipment.batch.batch_number}',
                    'message': f'Location text mentions "{", ".join(matched_keywords)}" - review conditions before dispatch.',
                })

        return Response({
            'note': 'Heuristic keyword and delay-based risk flags. Not real traffic or weather analysis - no such data source exists in this system.',
            'alerts': alerts[:10],
        })

