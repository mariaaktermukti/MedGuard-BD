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


class DoctorPrescriptionItemWriteSerializer(serializers.Serializer):
    medicine = serializers.CharField(required=True)
    dosage = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    duration = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    instructions = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')


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
        # pyrefly: ignore [missing-import]
        from django.contrib.auth import get_user_model
        # pyrefly: ignore [missing-import
        from core.models import Medicine, DosageSchedule, Consultation, ConsultationMessage
        import datetime
        UserModel = get_user_model()

        items_data = validated_data.pop('items')
        prescription = Prescription.objects.create(doctor=self.context['request'].user, **validated_data)
        
        rx_lines = []
        for item_data in items_data:
            med_val = str(item_data.pop('medicine', '')).strip()
            dosage = str(item_data.get('dosage') or '')[:50]
            duration = str(item_data.get('duration') or '')[:50]
            instructions = str(item_data.get('instructions') or '')

            med_obj = None
            if med_val.isdigit():
                med_obj = Medicine.objects.filter(id=int(med_val)).first()
            if not med_obj:
                med_obj = Medicine.objects.filter(name__iexact=med_val).first()
            if not med_obj and ' (' in med_val:
                base_name = med_val.split(' (')[0].strip()
                med_obj = Medicine.objects.filter(name__iexact=base_name).first()
            if not med_obj:
                clean_name = med_val.split(' (')[0].strip() if ' (' in med_val else med_val
                med_obj = Medicine.objects.filter(name__icontains=clean_name).first()
            if not med_obj:
                mfr = UserModel.objects.filter(role='manufacturer').first() or self.context['request'].user
                med_obj = Medicine.objects.create(
                    name=med_val,
                    manufacturer=mfr,
                    description="Custom prescription medicine"
                )

            PrescriptionItem.objects.create(
                prescription=prescription,
                medicine=med_obj,
                dosage=dosage,
                duration=duration,
                instructions=instructions
            )

            line = f"• {med_obj.name}"
            if dosage: line += f" — {dosage}"
            if duration: line += f" ({duration})"
            if instructions: line += f" [{instructions}]"
            rx_lines.append(line)

            try:
                DosageSchedule.objects.create(
                    citizen=prescription.citizen,
                    medicine=med_obj,
                    dosage=dosage or '1+0+1',
                    frequency=duration or '7 Days',
                    start_date=datetime.date.today(),
                    notes=f"Prescribed by Dr. {self.context['request'].user.full_name or self.context['request'].user.username}. {instructions}".strip()
                )
            except Exception as exc:
                print("DosageSchedule creation notice:", exc)

        # Automatically post formatted Prescription into Live Chat with Citizen
        try:
            consultation = Consultation.objects.filter(
                doctor=self.context['request'].user,
                citizen=prescription.citizen
            ).order_by('-consultation_date').first()

            if not consultation:
                consultation = Consultation.objects.create(
                    doctor=self.context['request'].user,
                    citizen=prescription.citizen,
                    status='accepted',
                    consultation_type='chat',
                    notes="Digital Prescription Issued"
                )
            elif consultation.status not in ('accepted', 'ongoing'):
                consultation.status = 'accepted'
                consultation.save()

            dr_name = self.context['request'].user.full_name or self.context['request'].user.username
            chat_text = (
                f"📋 DIGITAL PRESCRIPTION ISSUED\n"
                f"Dr. {dr_name}\n"
                f"----------------------------------------\n"
                + "\n".join(rx_lines) +
                (f"\n\n📝 Notes & Advice:\n{prescription.notes}" if prescription.notes else "") +
                f"\n----------------------------------------\n"
                f"Status: Active | Date: {datetime.date.today().strftime('%d %b %Y')}"
            )

            ConsultationMessage.objects.create(
                consultation=consultation,
                sender=self.context['request'].user,
                message=chat_text
            )
        except Exception as exc:
            print("Chat message creation notice:", exc)

        return prescription



def _manufacturer_name(medicine):
    """Who made this medicine.

    Several companies sell the same brand name at the same strength - eight of
    them make an 'Ace 500mg' - so a name and strength alone do not identify a
    medicine on screen. Mirrors core.serializers.MedicineSerializer, falling
    back through the company name, the account's full name, then its username.
    Callers should select_related('manufacturer__manufacturer_profile'), or this
    costs two queries per row.
    """
    manufacturer = medicine.manufacturer
    if not manufacturer:
        return None
    profile = getattr(manufacturer, 'manufacturer_profile', None)
    return (getattr(profile, 'company_name', None)
            or getattr(manufacturer, 'full_name', None)
            or manufacturer.username)


class DoctorMedicineSerializer(serializers.ModelSerializer):
    manufacturer_name = serializers.SerializerMethodField()

    class Meta:
        model = Medicine
        fields = ['id', 'name', 'generic_name', 'category', 'strength', 'dosage_form', 'manufacturer_name']

    def get_manufacturer_name(self, obj):
        return _manufacturer_name(obj)


class DoctorFrequentMedicineSerializer(serializers.ModelSerializer):
    times_prescribed = serializers.IntegerField(read_only=True)
    manufacturer_name = serializers.SerializerMethodField()

    class Meta:
        model = Medicine
        fields = ['id', 'name', 'generic_name', 'category', 'strength', 'dosage_form', 'times_prescribed', 'manufacturer_name']

    def get_manufacturer_name(self, obj):
        return _manufacturer_name(obj)


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
    citizen_id = serializers.IntegerField(source='citizen.id', read_only=True)
    citizen_username = serializers.CharField(source='citizen.username', read_only=True)
    citizen_full_name = serializers.CharField(source='citizen.full_name', read_only=True)

    class Meta:
        model = Consultation
        fields = [
            'id', 'citizen_id', 'citizen_username', 'citizen_full_name',
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
