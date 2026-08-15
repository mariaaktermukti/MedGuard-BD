from rest_framework import serializers

from core.models import ADRReport, DosageSchedule, Medicine, Prescription, PrescriptionItem, Sale


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
