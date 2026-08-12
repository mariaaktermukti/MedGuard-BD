from collections import defaultdict
from datetime import date, timedelta

from django.db.models import Sum
from django.utils import timezone
from rest_framework import generics, views, status, permissions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import (
    Batch,
    ComplianceItem,
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
)
from users.models import PharmacyProfile
from .serializers import (
    ADRReportSerializer,
    BatchSerializer,
    ComplianceItemSerializer,
    DemandForecastSerializer,
    DistributionEventSerializer,
    DrugPassportSerializer,
    DosageScheduleSerializer,
    InventorySerializer,
    LOW_STOCK_THRESHOLD,
    MedicineSerializer,
    NotificationSerializer,
    QualityTestSerializer,
    RecallSerializer,
    PharmacyProfileSerializer,
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
    permission_classes = [permissions.IsAuthenticated, IsCitizen]

    def get_queryset(self):
        return DosageSchedule.objects.filter(citizen=self.request.user)

    def perform_create(self, serializer):
        serializer.save(citizen=self.request.user)

class PersonalMedicineRecordDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DosageScheduleSerializer
    permission_classes = [permissions.IsAuthenticated, IsCitizen]

    def get_queryset(self):
        return DosageSchedule.objects.filter(citizen=self.request.user)

class ADRReportCreateView(generics.CreateAPIView):
    serializer_class = ADRReportSerializer
    permission_classes = [permissions.IsAuthenticated, IsCitizen]

    def perform_create(self, serializer):
        serializer.save(reported_by_user=self.request.user, citizen=self.request.user)

class PharmacyFinderView(generics.ListAPIView):
    serializer_class = PharmacyProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PharmacyProfile.objects.all().order_by('-trust_score')

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

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
        
        # 1. Total Scans (Proxy: Number of ADR reports + medicines in schedule)
        total_scans = ADRReport.objects.filter(citizen=user).count() * 3 + DosageSchedule.objects.filter(citizen=user).count() * 5
        if total_scans == 0: total_scans = 24 # Mock initial if empty
        
        # 2. Active Medicines
        active_medicines = DosageSchedule.objects.filter(citizen=user, is_active=True).count()
        if active_medicines == 0: active_medicines = 5

        # 3. Reports Submitted
        reports_submitted = ADRReport.objects.filter(citizen=user).count()

        # 4. Pharmacy Visits
        pharmacy_visits = Sale.objects.filter(citizen=user).values('pharmacy').distinct().count()
        if pharmacy_visits == 0: pharmacy_visits = 8

        # Recent Activity (Mocks combined with real data if available)
        recent_activity = [
            {'id': 1, 'type': 'scan', 'desc': 'Napa Extra স্ক্যান করা হয়েছে', 'time': '২ ঘন্টা আগে', 'status': 'verified'},
            {'id': 2, 'type': 'pharmacy', 'desc': 'Lazz Pharma ভিজিট', 'time': 'গতকাল', 'status': 'completed'},
            {'id': 3, 'type': 'adr', 'desc': 'পার্শ্বপ্রতিক্রিয়া রিপোর্ট', 'time': '৫ আগস্ট', 'status': 'pending'},
        ]
        
        # Upcoming Dose
        upcoming_dose = None
        schedules = DosageSchedule.objects.filter(citizen=user, is_active=True).select_related('medicine')
        if schedules.exists():
            sched = schedules.first()
            upcoming_dose = {
                'medicine_name': sched.medicine.name,
                'time': 'দুপুর ২:০০ টায়' if 'দুপুর' not in str(sched.reminder_times) else sched.reminder_times[0] if sched.reminder_times else 'রাত ৮:০০ টায়'
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

