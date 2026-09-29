import os
from collections import defaultdict

# pyrefly: ignore [missing-import]
from django.contrib.auth import get_user_model
 # pyrefly: ignore [missing-import]
from django.db.models import Count, Q
 # pyrefly: ignore [missing-import]
from django.shortcuts import get_object_or_404
 # pyrefly: ignore [missing-import]
from rest_framework import generics, permissions, status, views
 # pyrefly: ignore [missing-import]
from rest_framework.exceptions import PermissionDenied, ValidationError
 # pyrefly: ignore [missing-import]
from rest_framework.response import Response

from core.models import ADRReport, Consultation, ConsultationMessage, DosageSchedule, Medicine, Prescription, PrescriptionItem, Recall, ResearchDataset, Sale
from users.permissions import IsDoctor

from .utils import _chat_completion, check_prescription_warnings
from .serializers import (
    DoctorADRReportSerializer,
    DoctorConsultationSerializer,
    DoctorConsultationStatusUpdateSerializer,
    DoctorConsultationWriteSerializer,
    DoctorFrequentMedicineSerializer,
    DoctorMedicineSerializer,
    DoctorPatientDosageScheduleSerializer,
    DoctorPatientSaleSerializer,
    DoctorPatientSerializer,
    DoctorPrescriptionSerializer,
    DoctorPrescriptionWriteSerializer,
    DoctorResearchDatasetSerializer,
)

User = get_user_model()


def _is_existing_patient(doctor, patient_id):
    return (
        Consultation.objects.filter(doctor=doctor, citizen_id=patient_id).exists()
        or Prescription.objects.filter(doctor=doctor, citizen_id=patient_id).exists()
    )


def _doctor_patient_ids(doctor):
    return set(
        Consultation.objects.filter(doctor=doctor).values_list('citizen_id', flat=True)
    ) | set(
        Prescription.objects.filter(doctor=doctor).values_list('citizen_id', flat=True)
    )


class DoctorPatientListView(generics.ListAPIView):
    serializer_class = DoctorPatientSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get_queryset(self):
        doctor_patients = _doctor_patient_ids(self.request.user)
        return User.objects.filter(Q(role='citizen') | Q(id__in=doctor_patients)).order_by('full_name', 'username')


class DoctorPatientMedicineHistoryView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get(self, request, patient_id):
        patient = get_object_or_404(User, pk=patient_id)

        dosage_schedules = DosageSchedule.objects.filter(citizen=patient).select_related('medicine').order_by('-start_date')
        prescriptions = Prescription.objects.filter(citizen=patient).select_related('doctor').prefetch_related(
            'items', 'items__medicine'
        ).order_by('-prescription_date')
        sales = Sale.objects.filter(citizen=patient).select_related('batch', 'batch__medicine').order_by('-sale_date')

        return Response({
            'patient': DoctorPatientSerializer(patient).data,
            'dosage_schedules': DoctorPatientDosageScheduleSerializer(dosage_schedules, many=True).data,
            'prescriptions': DoctorPrescriptionSerializer(prescriptions, many=True).data,
            'sales': DoctorPatientSaleSerializer(sales, many=True).data,
        })


class DoctorPrescriptionListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get_queryset(self):
        return Prescription.objects.filter(doctor=self.request.user).select_related('doctor', 'citizen').prefetch_related(
            'items', 'items__medicine'
        ).order_by('-prescription_date')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DoctorPrescriptionWriteSerializer
        return DoctorPrescriptionSerializer

    def perform_create(self, serializer):
        citizen = serializer.validated_data.get('citizen')
        if not citizen:
            raise ValidationError('Valid patient is required.')
        serializer.save()


class DoctorPrescriptionDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get_queryset(self):
        return Prescription.objects.filter(doctor=self.request.user).select_related('doctor', 'citizen').prefetch_related(
            'items', 'items__medicine'
        )

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return DoctorPrescriptionWriteSerializer
        return DoctorPrescriptionSerializer


class DoctorMedicineListView(generics.ListAPIView):
    serializer_class = DoctorMedicineSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get_queryset(self):
        # manufacturer_name walks manufacturer -> manufacturer_profile, so pull
        # both in the one query rather than twice per medicine.
        queryset = Medicine.objects.filter(is_active=True).select_related(
            'manufacturer', 'manufacturer__manufacturer_profile'
        ).order_by('name')

        query = self.request.query_params.get('q')
        if query:
            queryset = queryset.filter(Q(name__icontains=query) | Q(generic_name__icontains=query))

        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__iexact=category)

        return queryset


class DoctorPrescriptionCheckView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def post(self, request):
        citizen_id = request.data.get('citizen')
        items = request.data.get('items', [])
        if not citizen_id:
            return Response({'detail': 'citizen is required.'}, status=status.HTTP_400_BAD_REQUEST)

        warnings = check_prescription_warnings(citizen_id, items)
        return Response({'warnings': warnings})


class DoctorADRReportListCreateView(generics.ListCreateAPIView):
    serializer_class = DoctorADRReportSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get_queryset(self):
        return ADRReport.objects.filter(reported_by_user=self.request.user).select_related(
            'citizen', 'medicine'
        ).order_by('-date_reported')

    def perform_create(self, serializer):
        citizen = serializer.validated_data.get('citizen')
        if not _is_existing_patient(self.request.user, citizen.id):
            raise PermissionDenied('You do not have an existing consultation or prescription with this patient.')
        serializer.save(reported_by_user=self.request.user)


class DoctorFrequentMedicinesView(generics.ListAPIView):
    serializer_class = DoctorFrequentMedicineSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get_queryset(self):
        doctor = self.request.user
        return Medicine.objects.filter(
            prescription_items__prescription__doctor=doctor
        ).select_related('manufacturer', 'manufacturer__manufacturer_profile').annotate(
            times_prescribed=Count('prescription_items', filter=Q(prescription_items__prescription__doctor=doctor))
        ).distinct().order_by('-times_prescribed', 'name')


class DoctorConsultationListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get_queryset(self):
        return Consultation.objects.filter(doctor=self.request.user).select_related('citizen').order_by('-consultation_date')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DoctorConsultationWriteSerializer
        return DoctorConsultationSerializer


class DoctorConsultationDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get_queryset(self):
        return Consultation.objects.filter(doctor=self.request.user).select_related('citizen')

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return DoctorConsultationStatusUpdateSerializer
        return DoctorConsultationSerializer


class DoctorResearchDatasetListView(generics.ListAPIView):
    serializer_class = DoctorResearchDatasetSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctor]
    queryset = ResearchDataset.objects.select_related('created_by').order_by('-created_at')


class DoctorRecallAlertsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get(self, request):
        patient_ids = _doctor_patient_ids(request.user)

        # A patient counts as being on a medicine two ways: an active dosage
        # schedule, or an active prescription. Reading only the schedules meant
        # a patient prescribed a recalled medicine went unflagged whenever
        # nobody had also entered a dosage schedule for it - which is most of
        # them, since writing a prescription does not create one.
        on_medicine = defaultdict(dict)  # medicine_id -> {patient_id: {patient, sources}}

        def note(medicine_id, patient, source):
            if medicine_id is None:
                return
            entry = on_medicine[medicine_id].setdefault(
                patient.id, {'patient': patient, 'sources': set()}
            )
            entry['sources'].add(source)

        schedules = DosageSchedule.objects.filter(
            citizen_id__in=patient_ids, is_active=True
        ).select_related('citizen')
        for schedule in schedules:
            note(schedule.medicine_id, schedule.citizen, 'dosage schedule')

        # Every doctor's prescriptions, not just this one's, the way the patient
        # history page reads them: a recall matters whoever wrote the script.
        items = PrescriptionItem.objects.filter(
            prescription__citizen_id__in=patient_ids, prescription__status='active'
        ).select_related('prescription__citizen')
        for item in items:
            note(item.medicine_id, item.prescription.citizen, 'prescription')

        active_recalls = Recall.objects.filter(
            status='active', batch__medicine_id__in=on_medicine.keys()
        ).select_related('batch', 'batch__medicine')

        alerts = []
        for recall in active_recalls:
            # Keyed by patient, so someone with both a schedule and a
            # prescription for the medicine is listed once, not twice.
            for entry in on_medicine.get(recall.batch.medicine_id, {}).values():
                patient = entry['patient']
                alerts.append({
                    'patient_id': patient.id,
                    'patient_name': patient.full_name or patient.username,
                    'medicine_name': recall.batch.medicine.name,
                    'batch_number': recall.batch.batch_number,
                    'reason': recall.reason,
                    'date_issued': recall.date_issued,
                    'sources': sorted(entry['sources']),
                })

        return Response({'alerts': alerts})


class DoctorInteractionCheckerView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def post(self, request):
        medicines = request.data.get('medicines', [])
        if len(medicines) < 2:
            return Response(
                {'error': 'Please provide at least two medicines to check for interactions.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        api_key = os.environ.get('OPENROUTER_API_KEY') or os.environ.get('NVIDIA_API_KEY')
        if not api_key:
            return Response(
                {'error': 'OPENROUTER_API_KEY is missing in backend/.env. Please add OPENROUTER_API_KEY to your .env file.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            meds_str = ', '.join(medicines)
            full_prompt = (
                f'A doctor is prescribing the following medicines together: {meds_str}. '
                f'Analyze potential drug interactions between them. Provide a severity summary '
                f'(None, Minor, Moderate, Major) and a brief clinical explanation. Structure your response clearly.'
            )

            response_text = _chat_completion(
                api_key=api_key,
                model=os.environ.get('OPENROUTER_MODEL', 'openai/gpt-4o-mini'),
                messages=[{'role': 'user', 'content': full_prompt}],
                is_openrouter=True,
            )
            return Response({'response': response_text})
        except Exception as e:
            return Response({'error': f'AI provider error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DoctorPrescriptionSendChatView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def post(self, request, pk):
        try:
            prescription = get_object_or_404(Prescription, pk=pk, doctor=request.user)
            items = prescription.items.all().select_related('medicine')

            rx_lines = []
            for item in items:
                med_name = item.medicine.name if item.medicine else 'Medicine'
                line = f"• {med_name}"
                if item.dosage: line += f" — {item.dosage}"
                if item.duration: line += f" ({item.duration})"
                if item.instructions: line += f" [{item.instructions}]"
                rx_lines.append(line)

            consultation = Consultation.objects.filter(
                doctor=request.user,
                citizen=prescription.citizen
            ).order_by('-consultation_date').first()

            if not consultation:
                consultation = Consultation.objects.create(
                    doctor=request.user,
                    citizen=prescription.citizen,
                    status='accepted',
                    consultation_type='chat',
                    notes="Digital Prescription Shared"
                )
            elif consultation.status not in ('accepted', 'ongoing'):
                consultation.status = 'accepted'
                consultation.save()

            dr_name = request.user.full_name or request.user.username
            chat_text = (
                f"📋 DIGITAL PRESCRIPTION (Rx #{prescription.id})\n"
                f"Dr. {dr_name}\n"
                f"----------------------------------------\n"
                + "\n".join(rx_lines) +
                (f"\n\n📝 Notes & Advice:\n{prescription.notes}" if prescription.notes else "") +
                f"\n----------------------------------------\n"
                f"Status: {prescription.status.upper()} | Date: {prescription.prescription_date.strftime('%d %b %Y')}"
            )

            ConsultationMessage.objects.create(
                consultation=consultation,
                sender=request.user,
                message=chat_text
            )

            return Response({'success': True, 'detail': 'Prescription shared in patient live chat.'})
        except Exception as err:
            print("DoctorPrescriptionSendChatView error:", err)
            return Response({'detail': f'Error sending prescription to chat: {str(err)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DoctorDashboardView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get(self, request):
        doctor = request.user
        patient_ids = _doctor_patient_ids(doctor)
        total_patients = len(patient_ids)

        prescriptions = Prescription.objects.filter(doctor=doctor)
        active_prescriptions = prescriptions.filter(status='active').count()
        total_prescriptions = prescriptions.count()

        consultations = Consultation.objects.filter(doctor=doctor)
        total_consultations = consultations.count()
        pending_consultations = consultations.filter(status='requested').count()
        ongoing_consultations = consultations.filter(status='accepted').count()

        adr_reports_count = ADRReport.objects.filter(reported_by_user=doctor).count()

        if patient_ids:
            med_ids = set(
                DosageSchedule.objects.filter(citizen_id__in=patient_ids, is_active=True).values_list('medicine_id', flat=True)
            ) | set(
                PrescriptionItem.objects.filter(prescription__citizen_id__in=patient_ids, prescription__status='active').values_list('medicine_id', flat=True)
            )
            recall_alerts_count = Recall.objects.filter(status='active', batch__medicine_id__in=med_ids).count()
        else:
            recall_alerts_count = 0

        recent_prescriptions = DoctorPrescriptionSerializer(
            prescriptions.select_related('citizen').order_by('-prescription_date')[:5],
            many=True
        ).data

        recent_consultations = DoctorConsultationSerializer(
            consultations.select_related('citizen').order_by('-consultation_date')[:5],
            many=True
        ).data

        return Response({
            'summary': {
                'total_patients': total_patients,
                'active_prescriptions': active_prescriptions,
                'total_prescriptions': total_prescriptions,
                'total_consultations': total_consultations,
                'pending_consultations': pending_consultations,
                'ongoing_consultations': ongoing_consultations,
                'adr_reports_submitted': adr_reports_count,
                'recall_alerts_flagged': recall_alerts_count,
            },
            'recent_prescriptions': recent_prescriptions,
            'recent_consultations': recent_consultations,
        })


