from rest_framework import serializers

from core.models import DosageSchedule, Prescription, PrescriptionItem, Sale


class DoctorPatientSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    full_name = serializers.CharField()
    phone = serializers.CharField(allow_null=True)


class DoctorPatientDosageScheduleSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)

    class Meta:
        model = DosageSchedule
        fields = ['id', 'medicine_name', 'dosage', 'frequency', 'start_date', 'end_date', 'is_active', 'notes']


class DoctorPrescriptionItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)

    class Meta:
        model = PrescriptionItem
        fields = ['id', 'medicine_name', 'dosage', 'duration', 'instructions']


class DoctorPrescriptionSerializer(serializers.ModelSerializer):
    items = DoctorPrescriptionItemSerializer(many=True, read_only=True)
    doctor_username = serializers.CharField(source='doctor.username', read_only=True)

    class Meta:
        model = Prescription
        fields = ['id', 'doctor_username', 'prescription_date', 'status', 'notes', 'items']


class DoctorPatientSaleSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='batch.medicine.name', read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)

    class Meta:
        model = Sale
        fields = ['id', 'medicine_name', 'batch_number', 'quantity', 'sale_date', 'price']
