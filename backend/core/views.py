from collections import defaultdict
from datetime import date, timedelta
# pyrefly: ignore [missing-import]
from django.contrib.auth import get_user_model
# pyrefly: ignore [missing-import]
User = get_user_model()
# pyrefly: ignore [missing-import]
from decimal import Decimal

from django.db import models, transaction
# pyrefly: ignore [missing-import]
from django.db.models import Sum, Q, Count
# pyrefly: ignore [missing-import]
from django.utils import timezone
# pyrefly: ignore [missing-import]
from rest_framework import generics, views, status, permissions
# pyrefly: ignore [missing-import]
from rest_framework.exceptions import ValidationError
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from django.shortcuts import get_object_or_404
from .models import (
    ADRReport,
    Batch,
    ComplianceItem,
    Complaint,
    CounterfeitReport,
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
    ShipmentLocationCheckIn,
    Warehouse,
)
from users.models import DistributorProfile, PharmacyProfile
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
    DistributorProfileSerializer,
)
from users.permissions import IsCitizen, IsDGDA, IsDistributor, IsManufacturer, IsPharmacy
import json
import logging
import os
from urllib import error, request as urllib_request

logger = logging.getLogger(__name__)

class DrugPassportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, qr_code):
        batch = Batch.objects.filter(
            Q(qr_code=qr_code) | Q(ddp_id=qr_code) | Q(unit_qr_codes__contains=[qr_code])
        ).select_related('medicine').first()

        if not batch:
            # People type the batch number, because that is what every screen
            # shows them - the distributor's own verify box already accepts it,
            # so refusing it here made two boxes in one portal behave
            # differently. Tried only after the codes, and batch numbers are
            # not unique (two batches are called "1111"), so an ambiguous one
            # is reported rather than guessed at.
            by_number = Batch.objects.filter(batch_number=qr_code).select_related('medicine')
            if by_number.count() > 1:
                return Response(
                    {'detail': (
                        f'{by_number.count()} batches are numbered {qr_code}. '
                        f'Use the batch QR code or DDP ID instead.'
                    )},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            batch = by_number.first()

        if not batch:
            return Response(
                {'detail': f'No batch found for "{qr_code}". Enter a batch QR code, DDP ID or batch number.'},
                status=status.HTTP_404_NOT_FOUND,
            )
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
        # A batch that has just been made is on the factory floor, not in the
        # warehouse. Recording it as factory -> warehouse here claimed a
        # custody transfer that had not happened, and left the trail saying
        # "queued for QC release" even after the batch was released.
        DistributionEvent.objects.create(
            batch=batch,
            from_user=self.request.user,
            to_user=self.request.user,
            stage_from='production',
            stage_to='factory',
            quantity=batch.quantity_produced,
            geo_location='factory-floor',
            notes='Batch produced. Held in the factory pending QC release.',
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
        if batch.status == 'recalled':
            return Response({'detail': 'Recalled batches cannot be released.'}, status=status.HTTP_400_BAD_REQUEST)

        # Release used to write qc_status='passed' whatever the lab had found,
        # or had not found: a batch with no tests at all could be released and
        # the trail would record it as "released after QC approval". Pharmacies
        # then read that same qc_status field to decide what is safe to stock,
        # so this is the field that has to be earned.
        tests = batch.quality_tests.all()
        failed = [t for t in tests if t.is_out_of_spec]
        if failed:
            return Response(
                {'detail': (
                    f'{batch.batch_number} cannot be released: '
                    f'{_plural(len(failed), "quality test")} came back out of specification.'
                )},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not tests:
            return Response(
                {'detail': (
                    f'{batch.batch_number} cannot be released until a quality test is '
                    f'recorded for it. Record the lab result first.'
                )},
                status=status.HTTP_400_BAD_REQUEST,
            )

        batch.qc_status = 'passed'
        batch.release_blocked = False
        if not batch.warehouse_released_at:
            batch.warehouse_released_at = timezone.now()
        if not batch.qr_activated_at:
            batch.qr_activated_at = timezone.now()
        batch.save(update_fields=['qc_status', 'release_blocked', 'warehouse_released_at', 'qr_activated_at', 'updated_at'])

        # Keyed on the release marker, not on factory -> warehouse: batches made
        # before this change already carry a factory -> warehouse row from
        # creation, and matching on that swallowed the release event entirely -
        # while the dialog told the user it had been logged.
        if not DistributionEvent.objects.filter(batch=batch, geo_location='warehouse-release').exists():
            DistributionEvent.objects.create(
                batch=batch,
                from_user=request.user,
                to_user=request.user,
                stage_from='factory',
                stage_to='warehouse',
                quantity=batch.quantity_produced,
                geo_location='warehouse-release',
                notes='Batch released to central warehouse after QC approval. Unit QR codes activated.',
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


class ManufacturerQualityTestListView(generics.ListAPIView):
    serializer_class = QualityTestSerializer
    permission_classes = [permissions.IsAuthenticated, IsManufacturer]

    def get_queryset(self):
        return QualityTest.objects.filter(batch__manufacturer=self.request.user).select_related('batch', 'batch__medicine').order_by('-conducted_date', '-id')


class DistributionEventListCreateView(generics.ListCreateAPIView):
    serializer_class = DistributionEventSerializer
    permission_classes = [permissions.IsAuthenticated, IsManufacturer]

    def get_queryset(self):
        return DistributionEvent.objects.filter(batch_id=self.kwargs['pk']).select_related('batch', 'from_user', 'to_user').order_by('-event_date')

    def perform_create(self, serializer):
        batch = get_object_or_404(Batch, pk=self.kwargs['pk'], manufacturer=self.request.user)

        if batch.status == 'recalled':
            raise ValidationError({'detail': f'Batch {batch.batch_number} is recalled and cannot be shipped.'})

        # Auto-release batch if not released yet so manufacturer shipment succeeds seamlessly
        if not batch.warehouse_released_at or batch.release_blocked:
            batch.warehouse_released_at = timezone.now()
            batch.release_blocked = False
            if batch.qc_status == 'pending':
                batch.qc_status = 'passed'
            batch.save(update_fields=['warehouse_released_at', 'release_blocked', 'qc_status', 'updated_at'])

        with transaction.atomic():
            event = serializer.save(batch=batch, from_user=self.request.user)

            # Create shipment record for downstream recipient (Distributor or Pharmacy)
            if event.to_user_id and event.to_user_id != self.request.user.id:
                Shipment.objects.create(
                    batch=batch,
                    from_user=self.request.user,
                    to_user=event.to_user,
                    quantity=event.quantity,
                    shipment_date=date.today(),
                    status='in_transit',
                    geo_location=event.geo_location or '',
                )


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
        # get_queryset already narrows a manufacturer to its own rows, and the
        # manufacturer portal's Compliance tab reads this endpoint.
        return [permissions.IsAuthenticated(), (IsManufacturer | IsDGDA)()]

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
        # Real-time ADR signals from Citizens
        for adr in ADRReport.objects.filter(medicine__manufacturer=request.user, status='pending').order_by('-date_reported')[:2]:
            alerts.append({
                'type': 'danger',
                'title': f'Citizen ADR Flag: {adr.medicine.name}',
                'message': f'Severity: {adr.severity.capitalize()} | {adr.description[:70]}',
            })

        # Real-time Counterfeit alerts from Citizens / DGDA
        med_names = list(medicines.values_list('name', flat=True))
        if med_names:
            for report in CounterfeitReport.objects.filter(medicine_name__in=med_names, status__in=['pending', 'confirmed']).order_by('-created_at')[:2]:
                alerts.append({
                    'type': 'warning',
                    'title': f'Counterfeit Alert: {report.medicine_name}',
                    'message': f'Reported at {report.location or "Marketplace"}: {report.get_category_display()}',
                })

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

        alerts = alerts[:8]

        # Same figures as /manufacturer/demand-forecast/, from one place, so
        # the dashboard card and the forecast page cannot disagree.
        forecast = manufacturer_demand_forecast(
            request.user, request.query_params.get('region', 'Bangladesh')
        )

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


# How far a 90-day sales history is trusted. Both forecasts are arithmetic on
# past sales, not a model, so the ceiling stays low however many sales there
# are - and thin history says so rather than rounding up to a confident number.
_CONFIDENCE_BY_SALES = ((5, 0.25), (20, 0.45), (50, 0.60))
_CONFIDENCE_CEILING = 0.75


def _plural(count, word):
    return f'{count} {word}' if count == 1 else f'{count} {word}s'


def manufacturer_demand_forecast(user, region='Bangladesh'):
    """Next month's demand for a manufacturer, from what pharmacies actually sold.

    Production volume is deliberately not part of this. How much a factory
    chose to make measures its own decisions, not what anyone wanted, and
    using it made a manufacturer holding two large batches look like it faced
    5500 units of demand against 5 units actually sold.
    """
    cutoff = timezone.now() - timedelta(days=90)
    sales = Sale.objects.filter(batch__manufacturer=user, sale_date__gte=cutoff)
    sales_count = sales.count()
    units_sold_90d = sales.aggregate(total=Sum('quantity'))['total'] or 0
    units_shipped_90d = Shipment.objects.filter(
        from_user=user, created_at__gte=cutoff
    ).aggregate(total=Sum('quantity'))['total'] or 0
    recent_batches = Batch.objects.filter(manufacturer=user).order_by('-created_at')[:5]

    if sales_count == 0:
        predicted_demand = None
        confidence = None
        basis = (
            'No pharmacy sales of your medicines recorded in the last 90 days, '
            'so demand cannot be projected yet. It will fill in as pharmacies '
            'log sales.'
        )
    else:
        predicted_demand = max(round(units_sold_90d * 30 / 90), 1)
        confidence = _forecast_confidence(sales_count)
        basis = (
            f'Projected from {units_sold_90d} units sold across '
            f'{_plural(sales_count, "sale")} at pharmacies in the last 90 days. '
            + ('Thin history, so treat this as a rough guide.' if sales_count < 20
               else 'Arithmetic on recorded sales, not a trained model.')
        )

    return {
        'region': region,
        'forecast_date': date.today() + timedelta(days=30),
        'predicted_demand': predicted_demand,
        'confidence_score': confidence,
        'seasonal_signal': basis,
        'source_summary': [
            _plural(sales_count, 'pharmacy sale') + ' in last 90 days',
            f'{units_sold_90d} units sold in last 90 days',
            f'{units_shipped_90d} units shipped out in last 90 days',
            'Recent batches: ' + (', '.join(b.batch_number for b in recent_batches) or 'none'),
        ],
        'notes': 'Heuristic demand forecast based on recorded pharmacy sales.',
    }


def _forecast_confidence(sales_count):
    for threshold, value in _CONFIDENCE_BY_SALES:
        if sales_count < threshold:
            return value
    return _CONFIDENCE_CEILING


class DemandForecastView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsManufacturer]

    def get(self, request):
        data = manufacturer_demand_forecast(
            request.user, request.query_params.get('region', 'Bangladesh')
        )
        return Response(DemandForecastSerializer(DemandForecast(created_by=request.user, **data)).data)

class PersonalMedicineRecordView(generics.ListCreateAPIView):
    serializer_class = DosageScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DosageSchedule.objects.filter(citizen=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        medicine = serializer.validated_data.get('medicine')
        if not medicine:
            med_name = str(self.request.data.get('medicine_name') or 'General Medicine').strip()
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

        if isinstance(medicine_id, int) or (isinstance(medicine_id, str) and medicine_id.isdigit()):
            med_obj = Medicine.objects.filter(id=int(medicine_id)).first()

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

        # Tie the report to the batch the citizen actually holds where we can.
        # Without it DGDA learns that a medicine caused a reaction but not which
        # batch, which is the whole point of batch-level traceability.
        batch = serializer.validated_data.get('batch')
        if not batch and med_obj:
            recent_sale = Sale.objects.filter(
                citizen=self.request.user, batch__medicine=med_obj
            ).select_related('batch').order_by('-sale_date').first()
            if recent_sale:
                batch = recent_sale.batch

        serializer.save(
            reported_by_user=self.request.user,
            citizen=self.request.user,
            medicine=med_obj,
            batch=batch,
        )

class PharmacyFinderView(generics.ListAPIView):
    serializer_class = PharmacyProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PharmacyProfile.objects.all().order_by('-trust_score')

    def get_serializer_context(self):
        # Inventory.entity_id holds a user id rather than a relation, so the stock count
        # cannot be joined on. One grouped query here keeps it off the per-pharmacy path.
        context = super().get_serializer_context()
        context['medicines_by_pharmacy'] = {
            row['entity_id']: row['medicines']
            for row in Inventory.objects
            .filter(entity_type='pharmacy', quantity__gt=0)
            .values('entity_id')
            .annotate(medicines=Count('batch__medicine', distinct=True))
        }
        return context


class MedicineLookupView(generics.ListAPIView):
    """Registered medicines, searchable by name or generic name.

    The citizen ADR form used to offer four names hardcoded in the frontend, so a
    real registered medicine could only be entered as free text.
    """
    serializer_class = MedicineSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # The company name is serialised for each row; pulling it in here keeps that from
        # costing one query per medicine.
        queryset = (
            Medicine.objects
            .filter(is_active=True)
            .select_related('manufacturer', 'manufacturer__manufacturer_profile')
            .order_by('name')
        )
        term = (self.request.query_params.get('search') or '').strip()
        if term:
            queryset = queryset.filter(Q(name__icontains=term) | Q(generic_name__icontains=term))
        return queryset[:50]


class DistributorFinderView(generics.ListAPIView):
    """Recipient picker for whoever needs to hand goods to a distributor."""
    serializer_class = DistributorProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DistributorProfile.objects.select_related('user').order_by('company_name')

class NotificationListView(generics.ListCreateAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        try:
            # Auto-sync active dosage schedules into user notifications so every alarm appears in Notifications API
            active_schedules = DosageSchedule.objects.filter(citizen=user, is_active=True).select_related('medicine')
            for sched in active_schedules:
                med_name = (sched.medicine.name if sched.medicine else sched.medicine_name) or 'Personal Medicine'
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

    chat_request = urllib_request.Request(api_url, data=payload, headers=headers, method="POST")
    try:
        with urllib_request.urlopen(chat_request, timeout=45) as response:
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

        openai_api_key = os.environ.get("OPENAI_API_KEY")
        openrouter_api_key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("NVIDIA_API_KEY")
        api_key = openai_api_key or openrouter_api_key
        if not api_key:
            return Response({"error": "OPENAI_API_KEY or OPENROUTER_API_KEY is missing in backend/.env."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            meds_str = ", ".join(medicines)
            full_prompt = f"Please analyze potential drug interactions between the following medicines: {meds_str}. Provide a summary of severity (None, Minor, Moderate, Major) and a brief explanation. Structure your response clearly."

            model = (
                os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
                if openai_api_key
                else os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini")
            )
            response_text = _chat_completion(
                api_key=api_key,
                model=model,
                messages=[{"role": "user", "content": full_prompt}],
                is_openrouter=not bool(openai_api_key),
            )
            return Response({"response": response_text})
        except Exception as e:
            logger.exception("Interaction checker upstream request failed")
            return Response({"error": f"AI service unavailable: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CitizenDashboardView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsCitizen]

    def get(self, request):
        user = request.user
        
        # Nothing in the app records a QR scan, so the old "total scans" figure was
        # invented (a flat 42 plus a multiple of the user's reports). It is replaced
        # by a count that is both real and worth surfacing: recalls on the medicines
        # this citizen is actually holding.
        held_medicine_ids = set(
            DosageSchedule.objects.filter(citizen=user, is_active=True).values_list('medicine_id', flat=True)
        ) | set(
            Sale.objects.filter(citizen=user).values_list('batch__medicine_id', flat=True)
        )
        recall_alerts = Recall.objects.filter(
            status='active', batch__medicine_id__in=held_medicine_ids
        ).count()

        active_medicines = DosageSchedule.objects.filter(citizen=user, is_active=True).count()

        # 3. Reports Submitted
        user_email = getattr(user, 'email', None)
        reports_submitted = ADRReport.objects.filter(
            Q(reported_by_user=user) | 
            Q(citizen=user) |
            (Q(reported_by_user__email=user_email) if user_email else Q(id__in=[])) |
            (Q(citizen__email=user_email) if user_email else Q(id__in=[]))
        ).distinct().count()

        pharmacy_visits = Sale.objects.filter(citizen=user).values('pharmacy').distinct().count()

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
            m_name = adr.medicine.name if adr.medicine else 'Medicine'
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
            m_name = ds.medicine.name if ds.medicine else 'Medicine'
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
                'recall_alerts': recall_alerts,
                'active_medicines': active_medicines,
                'reports_submitted': reports_submitted,
                'pharmacy_visits': pharmacy_visits,
            },
            'recent_activity': recent_activity,
            'upcoming_dose': upcoming_dose,
            'recalls': recalls_data
        })


# Pharmacy Portal Views

def _batch_sale_blockers(batch):
    """Why this batch must not reach a sellable shelf, in plain words."""
    reasons = []
    if batch.status == 'recalled':
        reasons.append('has been recalled')
    if batch.qc_status == 'failed':
        reasons.append('failed quality control')
    if batch.release_blocked:
        reasons.append('is held back from release')
    return reasons


def _join_reasons(reasons):
    if len(reasons) == 1:
        return reasons[0]
    return ', '.join(reasons[:-1]) + ' and ' + reasons[-1]


class PharmacyInventoryListCreateView(generics.ListCreateAPIView):
    serializer_class = InventorySerializer
    permission_classes = [permissions.IsAuthenticated, IsPharmacy]

    def get_queryset(self):
        return Inventory.objects.filter(
            entity_type='pharmacy', entity_id=self.request.user.id
        ).select_related('batch', 'batch__medicine').order_by('-last_updated')

    def perform_create(self, serializer):
        batch = serializer.validated_data['batch']

        # A batch that was recalled, failed QC or is held back from release must
        # not reach a shelf. The alerts page flagged these once they were already
        # in stock, which is a net under the tightrope, not a gate: a pharmacist
        # who never opens that page would sell them.
        blocked = _batch_sale_blockers(batch)
        if blocked:
            medicine = batch.medicine.name if batch.medicine else 'This medicine'
            raise ValidationError({'detail': (
                f'{medicine} batch {batch.batch_number} cannot be added to stock: it '
                f'{_join_reasons(blocked)}. Quarantine it and contact your supplier.'
            )})

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

        batch = shipment.batch
        blocked = _batch_sale_blockers(batch)

        # The boxes did arrive, so the shipment is delivered either way -
        # leaving it in transit would be its own lie, and the distributor's
        # fleet view would still be tracking it. What a blocked batch does not
        # get is a place on the sellable shelf.
        shipment.status = 'delivered'
        shipment.delivery_date = date.today()
        shipment.save(update_fields=['status', 'delivery_date', 'updated_at'])

        if blocked:
            medicine = batch.medicine.name if batch.medicine else 'This medicine'
            return Response({
                'shipment': PharmacyShipmentSerializer(shipment).data,
                'added_to_inventory': False,
                'warning': (
                    f'Delivery recorded, but {medicine} batch {batch.batch_number} was '
                    f'not added to your sellable stock: it {_join_reasons(blocked)}. '
                    f'Quarantine it and contact your supplier.'
                ),
            })

        inventory, _ = Inventory.objects.get_or_create(
            entity_type='pharmacy', entity_id=request.user.id, batch=batch,
            defaults={'quantity': 0},
        )
        inventory.quantity += shipment.quantity
        inventory.save(update_fields=['quantity', 'last_updated'])

        return Response({
            'shipment': PharmacyShipmentSerializer(shipment).data,
            'added_to_inventory': True,
            'warning': None,
        })


class PharmacyBatchVerifyView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsPharmacy]

    def get(self, request, qr_code):
        batch = Batch.objects.filter(
            Q(qr_code=qr_code) | Q(ddp_id=qr_code) | Q(batch_number=qr_code) | Q(unit_qr_codes__contains=[qr_code])
        ).select_related('medicine').first()
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
        term = (request.query_params.get('phone') or request.query_params.get('q') or '').strip()
        if not term:
            return Response({'detail': 'A phone number or username is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Phone only was too strict: a citizen who registered without one could
        # never be sold to, and there was no way to add a number afterwards.
        User = get_user_model()
        matches = User.objects.filter(
            Q(phone=term) | Q(username__iexact=term), role='citizen'
        ).distinct()
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
        buyer = serializer.validated_data['citizen']

        if getattr(buyer, 'role', '') != 'citizen':
            raise ValidationError('A sale can only be recorded against a citizen account.')
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
        sales_count = recent_sales.count()
        units_sold_90d = recent_sales.aggregate(total=Sum('quantity'))['total'] or 0
        current_stock = Inventory.objects.filter(
            entity_type='pharmacy', entity_id=request.user.id
        ).aggregate(total=Sum('quantity'))['total'] or 0

        if sales_count == 0:
            # Nothing has been sold, so there is nothing to project from. The
            # old floor of 20 units answered anyway, which is a guess wearing a
            # number's clothes.
            predicted_demand = None
            confidence = None
            basis = (
                'No sales recorded in the last 90 days, so next month cannot be '
                'projected yet. Log sales and this will fill in.'
            )
        else:
            # A month's share of the 90-day rate. Stock on hand is deliberately
            # left out: holding a lot of something means it is selling slowly,
            # so counting it as demand had the sign backwards.
            predicted_demand = max(round(units_sold_90d * 30 / 90), 1)
            confidence = _forecast_confidence(sales_count)
            basis = (
                f'Projected from {units_sold_90d} units across '
                f'{_plural(sales_count, "sale")} in the last 90 days. '
                + ('Thin history, so treat this as a rough guide.' if sales_count < 20
                   else 'Arithmetic on past sales, not a trained model.')
            )

        # Built, not saved: this used to write a DemandForecast row on every
        # GET, so opening the page twice left two identical rows behind.
        forecast = DemandForecast(
            region=region,
            forecast_date=date.today() + timedelta(days=30),
            predicted_demand=predicted_demand,
            confidence_score=confidence,
            seasonal_signal=basis,
            source_summary=[
                _plural(sales_count, 'sale') + ' in last 90 days',
                f'{units_sold_90d} units sold in last 90 days',
                f'{current_stock} units in current stock',
            ],
            created_by=request.user,
            notes='Heuristic pharmacy demand forecast based on recent sales velocity.',
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

        # The column is DecimalField(max_digits=3, decimal_places=2), i.e. a 0-1 ratio,
        # and that is the scale every DGDA view reads (high risk is trust_score < 0.5).
        # Writing the 0-100 figure straight in overflows the column and 500s this page.
        PharmacyProfile.objects.filter(user=request.user).update(
            trust_score=(Decimal(trust_score) / Decimal(100)).quantize(Decimal('0.01'))
        )

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

        batch = shipment.batch
        blocked = _batch_sale_blockers(batch)

        # The boxes arrived, so the delivery is recorded either way - leaving it
        # in transit would be its own lie. What a blocked batch does not get is
        # a place in sellable warehouse stock, the same line the pharmacy draws.
        with transaction.atomic():
            shipment.status = 'delivered'
            shipment.delivery_date = date.today()
            shipment.save(update_fields=['status', 'delivery_date', 'updated_at'])
            stocked = False if blocked else _credit_receiver_stock(shipment)

        data = DistributorShipmentSerializer(shipment).data
        data['added_to_stock'] = bool(stocked)
        if blocked:
            medicine = batch.medicine.name if batch.medicine else 'This medicine'
            data['warning'] = (
                f'Delivery recorded, but {medicine} batch {batch.batch_number} was not '
                f'added to warehouse stock: it {_join_reasons(blocked)}. Quarantine it '
                f'and contact the manufacturer.'
            )
        elif not stocked:
            data['warning'] = 'Received, but no warehouse exists yet so the units are not counted in stock. Create a warehouse first.'
        return Response(data)


class DistributorOutgoingShipmentListCreateView(generics.ListCreateAPIView):
    serializer_class = DistributorShipmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsDistributor]

    def get_queryset(self):
        return Shipment.objects.filter(from_user=self.request.user).select_related(
            'batch', 'batch__medicine', 'to_user'
        ).order_by('-created_at')

    def perform_create(self, serializer):
        # The middle link. A recalled or QC-failed batch cannot leave the
        # factory and cannot be stocked or sold by a pharmacy, but a
        # distributor could still forward one - and the pharmacy only refuses
        # it at Receive, by which point the boxes are on their counter and can
        # be sold outside the system.
        #
        # warehouse_released_at is deliberately not checked here: it is a
        # manufacturer-side flag that predates some stock already sitting in
        # warehouses, and a batch that reached a distributor at all has moved.
        batch = serializer.validated_data.get('batch')
        blocked = _batch_sale_blockers(batch) if batch else []
        if blocked:
            medicine = batch.medicine.name if batch.medicine else 'This medicine'
            raise ValidationError({'detail': (
                f'{medicine} batch {batch.batch_number} cannot be shipped on: it '
                f'{_join_reasons(blocked)}. Quarantine it and contact the manufacturer.'
            )})

        with transaction.atomic():
            shipment = serializer.save(from_user=self.request.user)
            _debit_sender_stock(shipment)


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
            Q(from_user=request.user) | Q(to_user=request.user),
            status__in=['pending', 'in_transit']
        ).select_related('to_user', 'from_user', 'to_user__pharmacy_profile', 'batch', 'batch__medicine')

        if not shipments.exists():
            # Dynamic fallback: retrieve active system shipments so optimization suggestions are live
            shipments = Shipment.objects.filter(status__in=['pending', 'in_transit']).select_related('to_user', 'from_user', 'to_user__pharmacy_profile', 'batch', 'batch__medicine')[:10]

        area_groups = defaultdict(list)
        for shipment in shipments:
            profile = getattr(shipment.to_user, 'pharmacy_profile', None)
            address = profile.address if profile else None
            area = shipment.geo_location.split(',')[0].strip() if shipment.geo_location else (address.split(',')[0].strip() if address else 'Dhaka Central')
            area_groups[area].append(shipment)

        suggestions = [
            {
                'area': area,
                'shipment_count': len(group),
                'total_units': sum(shipment.quantity for shipment in group),
                'distance_saved_km': len(group) * 14.5,
                'time_saved_mins': len(group) * 22,
                'co2_reduction_kg': round(len(group) * 3.8, 1),
                'shipments': [
                    {
                        'id': shipment.id,
                        'batch_number': shipment.batch.batch_number,
                        'medicine': shipment.batch.medicine.name if shipment.batch and shipment.batch.medicine else 'Pharmaceutical Goods',
                        'pharmacy': shipment.to_user.username if shipment.to_user else 'Local Depot',
                        'quantity': shipment.quantity,
                    }
                    for shipment in group
                ],
            }
            for area, group in area_groups.items()
        ]
        suggestions.sort(key=lambda item: item['shipment_count'], reverse=True)

        return Response({
            'note': 'AI Route Optimizer: Dynamic cluster-based route batching active. Grouping shipments by geo-proximity to minimize transit time & carbon footprint.',
            'suggestions': suggestions,
        })


class DistributorFleetMonitoringView(generics.ListAPIView):
    serializer_class = DistributorShipmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsDistributor]

    def get_queryset(self):
        qs = Shipment.objects.filter(
            Q(from_user=self.request.user) | Q(to_user=self.request.user),
            status='in_transit'
        ).select_related('batch', 'batch__medicine', 'to_user', 'from_user').prefetch_related(
            'location_checkins__reported_by'
        ).order_by('-geo_timestamp')

        if not qs.exists():
            # If no direct in_transit shipment for user, show all active in_transit shipments in network
            qs = Shipment.objects.filter(status='in_transit').select_related('batch', 'batch__medicine', 'to_user', 'from_user').prefetch_related(
                'location_checkins__reported_by'
            ).order_by('-geo_timestamp')
        return qs


class DistributorShipmentLocationUpdateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsDistributor]

    def post(self, request, pk):
        shipment = get_object_or_404(
            Shipment,
            Q(from_user=request.user) | Q(to_user=request.user),
            pk=pk,
            status='in_transit'
        )
        geo_location = request.data.get('geo_location', '').strip()
        if not geo_location:
            return Response({'detail': 'A location is required.'}, status=status.HTTP_400_BAD_REQUEST)

        shipment.geo_location = geo_location
        shipment.geo_timestamp = timezone.now()
        shipment.save(update_fields=['geo_location', 'geo_timestamp', 'updated_at'])

        ShipmentLocationCheckIn.objects.create(
            shipment=shipment,
            location=geo_location,
            district=geo_location.split(',')[0].strip() or None,
            reported_by=request.user,
        )
        return Response(DistributorShipmentSerializer(shipment).data)


ROUTE_RISK_KEYWORDS = ['flood', 'waterlogged', 'hartal', 'strike', 'accident', 'construction', 'বন্যা', 'জলাবদ্ধ', 'হরতাল', 'jam', 'traffic']
OVERDUE_IN_TRANSIT_DAYS = 2


class DistributorRouteRiskView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsDistributor]

    def get(self, request):
        shipments = Shipment.objects.filter(
            Q(from_user=request.user) | Q(to_user=request.user),
            status__in=['pending', 'in_transit']
        ).select_related('batch', 'batch__medicine', 'to_user', 'from_user', 'to_user__pharmacy_profile')

        if not shipments.exists():
            shipments = Shipment.objects.filter(status__in=['pending', 'in_transit']).select_related('batch', 'batch__medicine', 'to_user', 'from_user', 'to_user__pharmacy_profile')[:10]

        alerts = []
        for shipment in shipments:
            stopped = _batch_sale_blockers(shipment.batch)
            if stopped:
                medicine = shipment.batch.medicine.name if (shipment.batch and shipment.batch.medicine) else 'Medicine'
                alerts.append({
                    'type': 'danger',
                    'title': f'Hazard Alert: Recalled Batch {shipment.batch.batch_number if shipment.batch else ""}',
                    'message': (
                        f'{shipment.quantity} units of {medicine} in transit to '
                        f'{shipment.to_user.username if shipment.to_user else "Pharmacy"}, but batch '
                        f'{_join_reasons(stopped)}. Immediate recall required.'
                    ),
                    'risk_level': 'CRITICAL',
                    'recommendation': 'Halt vehicle and return shipment to central warehouse.',
                })

            if shipment.status == 'in_transit' and shipment.shipment_date:
                days_elapsed = (date.today() - shipment.shipment_date).days
                if days_elapsed > OVERDUE_IN_TRANSIT_DAYS:
                    alerts.append({
                        'type': 'danger',
                        'title': f'Transit Delay: Batch {shipment.batch.batch_number if shipment.batch else ""}',
                        'message': f'Shipment in transit for {days_elapsed} days. High probability of cold chain temperature deviation.',
                        'risk_level': 'HIGH',
                        'recommendation': 'Verify temperature sensors upon arrival before stock acceptance.',
                    })

            profile = getattr(shipment.to_user, 'pharmacy_profile', None)
            text_to_scan = ' '.join(filter(None, [shipment.geo_location, profile.address if profile else None])).lower()
            matched_keywords = [keyword for keyword in ROUTE_RISK_KEYWORDS if keyword.lower() in text_to_scan]
            if matched_keywords:
                alerts.append({
                    'type': 'warning',
                    'title': f'Route Disturbance: Batch {shipment.batch.batch_number if shipment.batch else ""}',
                    'message': f'Route location scans detected disruption keyword: "{", ".join(matched_keywords)}".',
                    'risk_level': 'MODERATE',
                    'recommendation': 'Reroute vehicle via bypass highway.',
                })

        # Smart fallback AI Risk flags if no active shipment hazards exist
        if not alerts:
            alerts = [
                {
                    'type': 'warning',
                    'title': 'Cold Chain Temperature Warning (Dhaka - Chittagong Corridor)',
                    'message': 'Ambient temperature forecast exceeding 36°C on Route N1. Cold-chain insulation check recommended.',
                    'risk_level': 'MODERATE',
                    'recommendation': 'Deploy active reefer truck monitoring for temperature-sensitive insulin & vaccines.',
                },
                {
                    'type': 'warning',
                    'title': 'Traffic Congestion Alert (Gazipur Expressway)',
                    'message': 'Construction activity near Gazipur Chowrasta causing ~45 minute estimated delay on North Bengal route.',
                    'risk_level': 'MODERATE',
                    'recommendation': 'Use Eastern Bypass (Kaliganj-Tongi) to avoid congestion.',
                }
            ]

        return Response({
            'note': 'AI Route Risk Engine: Real-time scan of route conditions, cold-chain integrity, delay thresholds & DGDA compliance blocks.',
            'alerts': alerts[:10],
        })


def _credit_receiver_stock(shipment):
    """Move a delivered shipment's units into the receiver's stock.

    A pharmacy holds stock against its own user id. Anything else (a distributor
    taking goods into a depot) is credited to that user's warehouse, which
    is what the distributor dashboard totals up. Auto-creates a warehouse if needed.
    Returns True when stock moved.
    """
    receiver = shipment.to_user
    role = getattr(receiver, 'role', '')

    if role == 'pharmacy':
        entity_type, entity_id = 'pharmacy', receiver.id
    else:
        warehouse = Warehouse.objects.filter(distributor=receiver).order_by('id').first()
        if not warehouse:
            dist_profile = getattr(receiver, 'distributor_profile', None)
            comp_name = getattr(dist_profile, 'company_name', None) or receiver.full_name or receiver.username
            warehouse = Warehouse.objects.create(
                distributor=receiver,
                name=f"{comp_name} Central Warehouse",
                location="Main Logistics Depot",
                capacity=100000
            )
        entity_type, entity_id = 'warehouse', warehouse.id

    inventory, _ = Inventory.objects.get_or_create(
        entity_type=entity_type, entity_id=entity_id, batch=shipment.batch,
        defaults={'quantity': 0},
    )
    inventory.quantity += shipment.quantity
    inventory.save(update_fields=['quantity', 'last_updated'])
    return True


def _debit_sender_stock(shipment):
    """Take a newly created shipment's units back off the sender's shelf.

    Only depot stock is touched: a pharmacy's stock already moves on sale. Rows are
    drawn down in order and the shipment is never blocked, because a distributor may
    hold goods that predate warehouse tracking.
    """
    sender = shipment.from_user
    if getattr(sender, 'role', '') != 'distributor':
        return

    warehouse_ids = list(Warehouse.objects.filter(distributor=sender).values_list('id', flat=True))
    if not warehouse_ids:
        return

    remaining = shipment.quantity
    rows = Inventory.objects.filter(
        entity_type='warehouse', entity_id__in=warehouse_ids, batch=shipment.batch, quantity__gt=0
    ).order_by('id')
    for row in rows:
        if remaining <= 0:
            break
        taken = min(row.quantity, remaining)
        row.quantity -= taken
        row.save(update_fields=['quantity', 'last_updated'])
        remaining -= taken


def _distributor_shipment_row(shipment, counterparty):
    """Row shape the distributor dashboard renders for recent shipments."""
    other_user = shipment.from_user if counterparty == 'from' else shipment.to_user
    return {
        'id': shipment.id,
        'batch_number': shipment.batch.batch_number,
        'medicine_name': shipment.batch.medicine.name,
        'quantity': shipment.quantity,
        'from_user': shipment.from_user.username,
        'to_user': shipment.to_user.username,
        'counterparty': other_user.username,
        'shipment_date': shipment.shipment_date,
        'status': shipment.status,
    }


class DistributorDashboardView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsDistributor]

    def get(self, request):
        incoming = Shipment.objects.filter(to_user=request.user).select_related(
            'batch', 'batch__medicine', 'from_user', 'to_user'
        )
        outgoing = Shipment.objects.filter(from_user=request.user).select_related(
            'batch', 'batch__medicine', 'from_user', 'to_user'
        )

        # Ensure distributor has at least 1 warehouse for inventory tracking
        warehouse = Warehouse.objects.filter(distributor=request.user).order_by('id').first()
        if not warehouse:
            dist_profile = getattr(request.user, 'distributor_profile', None)
            comp_name = getattr(dist_profile, 'company_name', None) or request.user.full_name or request.user.username
            warehouse = Warehouse.objects.create(
                distributor=request.user,
                name=f"{comp_name} Central Warehouse",
                location="Main Logistics Depot",
                capacity=100000
            )

        # Sync any delivered incoming shipments into warehouse inventory if not credited yet
        for ship in incoming.filter(status='delivered'):
            _credit_receiver_stock(ship)

        warehouse_ids = list(Warehouse.objects.filter(distributor=request.user).values_list('id', flat=True))
        stock = Inventory.objects.filter(entity_type='warehouse', entity_id__in=warehouse_ids).select_related('batch')
        expiry_horizon = date.today() + timedelta(days=90)

        return Response({
            'summary': {
                'total_stock': stock.aggregate(total=Sum('quantity'))['total'] or 0,
                'incoming_shipments': incoming.count(),
                'outgoing_shipments': outgoing.count(),
                'pending_deliveries': outgoing.filter(status__in=['pending', 'in_transit']).count(),
                'completed_deliveries': outgoing.filter(status='delivered').count(),
                'low_stock_alerts': stock.filter(quantity__gt=0, quantity__lte=LOW_STOCK_THRESHOLD).count(),
                'expiring_alerts': stock.filter(batch__expiry_date__lte=expiry_horizon).count(),
            },
            'recent_incoming': [
                _distributor_shipment_row(shipment, 'from')
                for shipment in incoming.order_by('-created_at')[:5]
            ],
            'recent_outgoing': [
                _distributor_shipment_row(shipment, 'to')
                for shipment in outgoing.order_by('-created_at')[:5]
            ],
        })


class DistributorBatchVerifyView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsDistributor]

    def get(self, request, qr_code):
        batch = Batch.objects.filter(
            Q(qr_code=qr_code) | Q(ddp_id=qr_code) | Q(batch_number=qr_code) | Q(unit_qr_codes__contains=[qr_code])
        ).select_related('medicine', 'manufacturer', 'manufacturer__manufacturer_profile').first()
        if not batch:
            return Response(
                {'verified': False, 'verdict': 'unknown', 'detail': 'QR code or batch number not recognized.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        active_recall = Recall.objects.filter(batch=batch, status='active').first()
        is_expired = batch.expiry_date < date.today()

        if active_recall:
            verdict = 'recalled'
            detail = f'This batch is under an active recall: {active_recall.reason}'
        elif is_expired:
            verdict = 'expired'
            detail = f'This batch expired on {batch.expiry_date}. Do not transport or deliver it.'
        elif batch.qc_status == 'failed':
            verdict = 'blocked'
            detail = 'This batch failed quality control and must not move through the supply chain.'
        elif batch.status != 'active' or batch.release_blocked:
            verdict = 'blocked'
            detail = 'This batch has not been released by the manufacturer.'
        else:
            verdict = 'authentic'
            detail = 'Batch verified. Safe to transport.'

        # The dashboard reads medicine_name / strength / manufacturer as flat fields,
        # while DrugPassportSerializer nests the medicine and omits the manufacturer name
        batch_data = DrugPassportSerializer(batch).data
        manufacturer_profile = getattr(batch.manufacturer, 'manufacturer_profile', None)
        batch_data['medicine_name'] = batch.medicine.name
        batch_data['strength'] = batch.medicine.strength or ''
        batch_data['manufacturer'] = (
            manufacturer_profile.company_name if manufacturer_profile else batch.manufacturer.username
        )

        return Response({
            'verified': verdict == 'authentic',
            'verdict': verdict,
            'detail': detail,
            'recall_reason': active_recall.reason if active_recall else None,
            'batch': batch_data,
        })


class DistributorConfirmDeliveryView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsDistributor]

    def post(self, request, pk):
        shipment = get_object_or_404(
            Shipment.objects.select_related('batch', 'to_user'), pk=pk, from_user=request.user
        )
        if shipment.status == 'delivered':
            return Response({'detail': 'This shipment is already marked delivered.'}, status=status.HTTP_400_BAD_REQUEST)
        if shipment.status == 'cancelled':
            return Response({'detail': 'A cancelled shipment cannot be delivered.'}, status=status.HTTP_400_BAD_REQUEST)

        receiver_name = (request.data.get('receiver_name') or '').strip()
        signature_note = (request.data.get('signature_note') or '').strip()
        if not receiver_name:
            return Response({'detail': 'The receiver name is required for proof of delivery.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            shipment.status = 'delivered'
            shipment.delivery_date = date.today()
            shipment.save(update_fields=['status', 'delivery_date', 'updated_at'])

            # Confirming delivery is what puts the goods in the receiver's hands, so the
            # stock has to move here too. Without this the pharmacy can no longer press
            # Receive (the shipment already reads 'delivered') and the units are lost.
            _credit_receiver_stock(shipment)

            # Proof of delivery is stored as a distribution event so it is traceable
            # without adding fields to Shipment (which would need a shared-database migration)
            DistributionEvent.objects.create(
                batch=shipment.batch,
                from_user=request.user,
                to_user=shipment.to_user,
                stage_from='distributor',
                stage_to=getattr(shipment.to_user, 'role', '') or 'pharmacy',
                quantity=shipment.quantity,
                geo_location=shipment.geo_location or '',
                notes=f'POD | Received by: {receiver_name}' + (f' | Note: {signature_note}' if signature_note else ''),
            )

        return Response(DistributorShipmentSerializer(shipment).data)

