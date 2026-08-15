from django.contrib.auth import get_user_model
from rest_framework import serializers

from core.models import ADRReport, Consultation, DosageSchedule, Medicine, Prescription, PrescriptionItem, ResearchDataset, Sale

User = get_user_model()


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
    citizen_username = serializers.CharField(source='citizen.username', read_only=True)
    citizen_full_name = serializers.CharField(source='citizen.full_name', read_only=True)

    class Meta:
        model = Prescription
        fields = [
            'id', 'doctor_username', 'citizen_username', 'citizen_full_name',
            'prescription_date', 'status', 'notes', 'items',
        ]


class DoctorPrescriptionItemWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescriptionItem
        fields = ['medicine', 'dosage', 'duration', 'instructions']


class DoctorPrescriptionWriteSerializer(serializers.ModelSerializer):
    items = DoctorPrescriptionItemWriteSerializer(many=True)

    class Meta:
        model = Prescription
        fields = ['id', 'citizen', 'consultation', 'status', 'notes', 'items']
        read_only_fields = ['id']

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError('A prescription must have at least one item.')
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        prescription = Prescription.objects.create(doctor=self.context['request'].user, **validated_data)
        for item_data in items_data:
            PrescriptionItem.objects.create(prescription=prescription, **item_data)
        return prescription


class DoctorMedicineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medicine
        fields = ['id', 'name', 'generic_name', 'category', 'strength', 'dosage_form']


class DoctorFrequentMedicineSerializer(serializers.ModelSerializer):
    times_prescribed = serializers.IntegerField(read_only=True)

    class Meta:
        model = Medicine
        fields = ['id', 'name', 'generic_name', 'category', 'strength', 'dosage_form', 'times_prescribed']


class DoctorResearchDatasetSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    has_data_file = serializers.SerializerMethodField()

    class Meta:
        model = ResearchDataset
        fields = ['id', 'dataset_name', 'description', 'created_by_username', 'created_at', 'has_data_file']

    def get_has_data_file(self, obj):
        return bool(obj.data_file)


class DoctorPatientSaleSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='batch.medicine.name', read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)

    class Meta:
        model = Sale
        fields = ['id', 'medicine_name', 'batch_number', 'quantity', 'sale_date', 'price']


class DoctorADRReportSerializer(serializers.ModelSerializer):
    citizen_username = serializers.CharField(source='citizen.username', read_only=True)
    citizen_full_name = serializers.CharField(source='citizen.full_name', read_only=True)
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)

    class Meta:
        model = ADRReport
        fields = [
            'id', 'citizen', 'citizen_username', 'citizen_full_name', 'batch', 'medicine', 'medicine_name',
            'description', 'severity', 'reaction_date', 'date_reported', 'status', 'attachment',
        ]
        read_only_fields = ['id', 'date_reported', 'status']


class DoctorConsultationSerializer(serializers.ModelSerializer):
    citizen_username = serializers.CharField(source='citizen.username', read_only=True)
    citizen_full_name = serializers.CharField(source='citizen.full_name', read_only=True)

    class Meta:
        model = Consultation
        fields = [
            'id', 'citizen_username', 'citizen_full_name',
            'consultation_date', 'consultation_type', 'status', 'notes',
        ]


class DoctorConsultationWriteSerializer(serializers.ModelSerializer):
    citizen_username = serializers.CharField(write_only=True)

    class Meta:
        model = Consultation
        fields = ['id', 'citizen_username', 'consultation_type', 'status', 'notes']
        read_only_fields = ['id']

    def validate_citizen_username(self, value):
        try:
            return User.objects.get(username=value, role='citizen')
        except User.DoesNotExist:
            raise serializers.ValidationError('No citizen found with this exact username.')

    def create(self, validated_data):
        citizen = validated_data.pop('citizen_username')
        return Consultation.objects.create(doctor=self.context['request'].user, citizen=citizen, **validated_data)


class DoctorConsultationStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Consultation
        fields = ['status', 'notes']
