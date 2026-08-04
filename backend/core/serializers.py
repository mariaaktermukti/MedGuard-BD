from rest_framework import serializers
from .models import (
    Medicine, Batch, QualityTest, Shipment, Sale, Consultation, 
    Prescription, PrescriptionItem, ADRReport, Recall, Complaint, 
    Inspection, Notification, DosageSchedule, Warehouse, Inventory
)
from users.models import CustomUser, PharmacyProfile, ManufacturerProfile

class MedicineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medicine
        fields = '__all__'

class BatchSerializer(serializers.ModelSerializer):
    medicine = MedicineSerializer(read_only=True)
    class Meta:
        model = Batch
        fields = '__all__'

class QualityTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = QualityTest
        fields = '__all__'

class ShipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shipment
        fields = '__all__'

class ADRReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ADRReport
        fields = '__all__'
        read_only_fields = ['reported_by_user', 'date_reported']

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

class DosageScheduleSerializer(serializers.ModelSerializer):
    medicine_details = MedicineSerializer(source='medicine', read_only=True)
    
    class Meta:
        model = DosageSchedule
        fields = '__all__'
        read_only_fields = ['citizen', 'created_at']

class PharmacyProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PharmacyProfile
        fields = '__all__'

# For Drug Passport specifically (a nested read-only serializer)
class DrugPassportSerializer(serializers.ModelSerializer):
    medicine = MedicineSerializer(read_only=True)
    quality_tests = QualityTestSerializer(many=True, read_only=True)
    shipments = ShipmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Batch
        fields = ['id', 'batch_number', 'manufacturing_date', 'expiry_date', 'quantity_produced', 'qr_code', 'status', 'medicine', 'quality_tests', 'shipments']

