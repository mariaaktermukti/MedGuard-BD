from django.db.models import Count, Q
from rest_framework import viewsets, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import (
    Medicine, Batch, QualityTest, Recall, Inspection, ADRReport, 
    DemandForecast, DistributionEvent, Shipment, Sale, Inventory
)
from users.models import ManufacturerProfile, PharmacyProfile, DistributorProfile
from .serializers import (
    BatchSerializer, RecallSerializer, InspectionSerializer, 
    ADRReportSerializer, DemandForecastSerializer
)

class DGDACommandCenterView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        active_recalls = Recall.objects.filter(status='active').count()
        total_adr = ADRReport.objects.count()
        low_stock_alerts = Inventory.objects.filter(quantity__lt=20).count()
        return Response({
            "active_recalls": active_recalls,
            "total_adr": total_adr,
            "low_stock_alerts": low_stock_alerts,
            "live_movements": DistributionEvent.objects.count()
        })

class DGDABatchTrackingView(views.APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, batch_number):
        try:
            batch = Batch.objects.get(batch_number=batch_number)
            serializer = BatchSerializer(batch)
            return Response(serializer.data)
        except Batch.DoesNotExist:
            return Response({"error": "Batch not found"}, status=404)

class DGDACounterfeitInvestigationView(views.APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return Response([
            {"id": 1, "issue": "Duplicate QR Scan", "batch_number": "B001", "threat_level": "High"},
            {"id": 2, "issue": "Supply Chain Break", "batch_number": "B002", "threat_level": "Medium"}
        ])

class DGDARecallViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Recall.objects.all()
    serializer_class = RecallSerializer

class DGDAInspectionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Inspection.objects.all()
    serializer_class = InspectionSerializer

class DGDAEntityMonitoringView(views.APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        manufacturers = ManufacturerProfile.objects.all().values('user__username', 'company_name', 'registration_number')
        pharmacies = PharmacyProfile.objects.all().values('user__username', 'pharmacy_name', 'trust_score')
        return Response({
            "manufacturers": list(manufacturers),
            "pharmacies": list(pharmacies)
        })

class DGDAHeatmapDataView(views.APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return Response([
            {"id": 1, "district": "Dhaka", "lat": 23.8103, "lng": 90.4125, "type": "adr", "count": 150, "severity": "high"},
            {"id": 2, "district": "Chittagong", "lat": 22.3569, "lng": 91.7832, "type": "adr", "count": 80, "severity": "medium"},
            {"id": 3, "district": "Sylhet", "lat": 24.8949, "lng": 91.8687, "type": "shortage", "medicine": "Paracetamol", "severity": "critical"},
            {"id": 4, "district": "Rajshahi", "lat": 24.3745, "lng": 88.6042, "type": "counterfeit", "count": 12, "severity": "high"},
            {"id": 5, "district": "Khulna", "lat": 22.8456, "lng": 89.5403, "type": "adr", "count": 45, "severity": "low"}
        ])

class DGDAAIRiskIntelligenceView(views.APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        threats = []
        health_score = 100

        # 1. ADR Clusters (Batches with > 1 ADR)
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

        # 2. Quality Control Failures in circulation
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

        # 3. Imminent Shortages
        # Mocking logic for shortages based on low inventory across all pharmacies
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

        # Cap health score
        health_score = max(0, health_score)

        return Response({
            "system_health_score": health_score,
            "threats": threats
        })

class DGDAPolicyAnalyticsView(views.APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return Response({
            "consumption": [{"month": "Jan", "volume": 5000}, {"month": "Feb", "volume": 6000}],
            "compliance": 92
        })

class DGDAEmergencyResponseView(views.APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        inventory = Inventory.objects.select_related('batch', 'batch__medicine').filter(quantity__gt=0)
        data = [{"medicine": inv.batch.medicine.name, "quantity": inv.quantity, "entity_type": inv.entity_type, "entity_id": inv.entity_id} for inv in inventory]
        return Response(data)
