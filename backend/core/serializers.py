from rest_framework import serializers

from users.models import PharmacyProfile

from .models import (
    ADRReport,
    Batch,
    ComplianceItem,
    Complaint,
    DemandForecast,
    DistributionEvent,
    DosageSchedule,
    Inventory,
    Inspection,
    Medicine,
    Notification,
    QualityTest,
    Recall,
    Sale,
    Shipment,
    Warehouse,
)

LOW_STOCK_THRESHOLD = 20


class MedicineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medicine
        fields = '__all__'
        read_only_fields = ['product_id', 'manufacturer', 'created_at', 'updated_at']


class ShipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shipment
        fields = '__all__'


class DistributionEventSerializer(serializers.ModelSerializer):
    batch = serializers.PrimaryKeyRelatedField(queryset=Batch.objects.all())
    batch_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = DistributionEvent
        fields = '__all__'

    def get_batch_details(self, obj):
        return {
            'id': obj.batch_id,
            'batch_number': obj.batch.batch_number,
            'ddp_id': obj.batch.ddp_id,
            'medicine': obj.batch.medicine.name,
        }


class QualityTestSerializer(serializers.ModelSerializer):
    batch = serializers.PrimaryKeyRelatedField(queryset=Batch.objects.all(), write_only=True, required=False)
    batch_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = QualityTest
        fields = [
            'id', 'batch', 'batch_details', 'test_name', 'test_result',
            'result_value', 'is_out_of_spec', 'report_file', 'conducted_date'
        ]

    def get_batch_details(self, obj):
        return {
            'id': obj.batch_id,
            'batch_number': obj.batch.batch_number,
            'ddp_id': obj.batch.ddp_id,
            'medicine': obj.batch.medicine.name,
        }


class BatchSerializer(serializers.ModelSerializer):
    medicine = serializers.PrimaryKeyRelatedField(queryset=Medicine.objects.all(), write_only=True, required=False)
    medicine_details = MedicineSerializer(source='medicine', read_only=True)
    quality_tests = QualityTestSerializer(many=True, read_only=True)
    shipments = ShipmentSerializer(many=True, read_only=True)
    distribution_events = DistributionEventSerializer(many=True, read_only=True)

    class Meta:
        model = Batch
        fields = '__all__'
        read_only_fields = [
            'manufacturer', 'ddp_id', 'qr_code', 'unit_qr_codes',
            'qr_activated_at', 'warehouse_released_at', 'geo_timestamp',
            'created_at', 'updated_at'
        ]


class RecallSerializer(serializers.ModelSerializer):
    batch = serializers.PrimaryKeyRelatedField(queryset=Batch.objects.all())
    batch_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Recall
        fields = [
            'id', 'batch', 'batch_details', 'reason', 'issued_by_user',
            'date_issued', 'status', 'progress_percent', 'halted_sales',
            'notified_downstream_at', 'description'
        ]
        read_only_fields = ['issued_by_user', 'notified_downstream_at']

    def get_batch_details(self, obj):
        return {
            'id': obj.batch_id,
            'batch_number': obj.batch.batch_number,
            'medicine': obj.batch.medicine.name,
            'status': obj.batch.status,
        }


class ComplianceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplianceItem
        fields = '__all__'
        read_only_fields = ['owner', 'created_at', 'updated_at']


class DemandForecastSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemandForecast
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at']


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


class InventorySerializer(serializers.ModelSerializer):
    batch = serializers.PrimaryKeyRelatedField(queryset=Batch.objects.all())
    batch_details = serializers.SerializerMethodField(read_only=True)
    is_low_stock = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Inventory
        fields = ['id', 'batch', 'batch_details', 'entity_type', 'entity_id', 'quantity', 'is_low_stock', 'last_updated']
        read_only_fields = ['entity_type', 'entity_id', 'last_updated']

    def get_is_low_stock(self, obj):
        return obj.quantity <= LOW_STOCK_THRESHOLD

    def get_batch_details(self, obj):
        return {
            'id': obj.batch_id,
            'batch_number': obj.batch.batch_number,
            'medicine': obj.batch.medicine.name,
            'expiry_date': obj.batch.expiry_date,
            'status': obj.batch.status,
            'qc_status': obj.batch.qc_status,
        }


class SaleSerializer(serializers.ModelSerializer):
    batch = serializers.PrimaryKeyRelatedField(queryset=Batch.objects.all())
    batch_details = serializers.SerializerMethodField(read_only=True)
    citizen_username = serializers.CharField(source='citizen.username', read_only=True)

    class Meta:
        model = Sale
        fields = [
            'id', 'pharmacy', 'batch', 'batch_details', 'citizen', 'citizen_username',
            'quantity', 'sale_date', 'price', 'payment_method'
        ]
        read_only_fields = ['pharmacy', 'sale_date']

    def get_batch_details(self, obj):
        return {
            'id': obj.batch_id,
            'batch_number': obj.batch.batch_number,
            'medicine': obj.batch.medicine.name,
            'status': obj.batch.status,
        }


class ComplaintSerializer(serializers.ModelSerializer):
    citizen_username = serializers.CharField(source='citizen.username', read_only=True)

    class Meta:
        model = Complaint
        fields = '__all__'
        read_only_fields = ['citizen', 'pharmacy', 'complaint_text', 'date_submitted']


class PharmacyShipmentSerializer(serializers.ModelSerializer):
    batch_details = serializers.SerializerMethodField(read_only=True)
    from_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Shipment
        fields = '__all__'

    def get_batch_details(self, obj):
        return {
            'id': obj.batch_id,
            'batch_number': obj.batch.batch_number,
            'medicine': obj.batch.medicine.name,
            'status': obj.batch.status,
        }

    def get_from_details(self, obj):
        return {
            'id': obj.from_user_id,
            'username': obj.from_user.username,
        }


class PharmacyProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PharmacyProfile
        fields = '__all__'


class DrugPassportSerializer(serializers.ModelSerializer):
    medicine = MedicineSerializer(read_only=True)
    quality_tests = QualityTestSerializer(many=True, read_only=True)
    shipments = ShipmentSerializer(many=True, read_only=True)
    distribution_events = DistributionEventSerializer(many=True, read_only=True)

    class Meta:
        model = Batch
        fields = [
            'id', 'batch_number', 'ddp_id', 'manufacturing_date', 'expiry_date',
            'quantity_produced', 'ingredients', 'api_sources', 'qc_results',
            'qc_status', 'release_blocked', 'qr_code', 'unit_qr_codes',
            'qr_activated_at', 'warehouse_released_at', 'status', 'medicine',
            'quality_tests', 'shipments', 'distribution_events'
        ]

