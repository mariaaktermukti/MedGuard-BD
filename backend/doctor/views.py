import os
from collections import defaultdict

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, views
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from core.models import ADRReport, Consultation, DosageSchedule, Medicine, Prescription, Recall, ResearchDataset, Sale
from users.permissions import IsDoctor

from .utils import _chat_completion, check_prescription_warnings
from .serializers import (
    DoctorADRReportSerializer,
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
        return User.objects.filter(id__in=_doctor_patient_ids(self.request.user)).order_by('full_name')


class DoctorPatientMedicineHistoryView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get(self, request, patient_id):
        if not _is_existing_patient(request.user, patient_id):
            return Response(
                {'detail': 'You do not have an existing consultation or prescription with this patient.'},
                status=status.HTTP_403_FORBIDDEN,
            )

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
        if not _is_existing_patient(self.request.user, citizen.id):
            raise PermissionDenied('You do not have an existing consultation or prescription with this patient.')
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
        queryset = Medicine.objects.filter(is_active=True).order_by('name')

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
        ).annotate(
            times_prescribed=Count('prescription_items', filter=Q(prescription_items__prescription__doctor=doctor))
        ).distinct().order_by('-times_prescribed', 'name')


class DoctorResearchDatasetListView(generics.ListAPIView):
    serializer_class = DoctorResearchDatasetSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctor]
    queryset = ResearchDataset.objects.select_related('created_by').order_by('-created_at')


class DoctorRecallAlertsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get(self, request):
        patient_ids = _doctor_patient_ids(request.user)

        schedules = DosageSchedule.objects.filter(
            citizen_id__in=patient_ids, is_active=True
        ).select_related('medicine', 'citizen')

        medicine_to_patients = defaultdict(list)
        for schedule in schedules:
            medicine_to_patients[schedule.medicine_id].append(schedule.citizen)

        active_recalls = Recall.objects.filter(
            status='active', batch__medicine_id__in=medicine_to_patients.keys()
        ).select_related('batch', 'batch__medicine')

        alerts = []
        for recall in active_recalls:
            for patient in medicine_to_patients.get(recall.batch.medicine_id, []):
                alerts.append({
                    'patient_id': patient.id,
                    'patient_name': patient.full_name or patient.username,
                    'medicine_name': recall.batch.medicine.name,
                    'batch_number': recall.batch.batch_number,
                    'reason': recall.reason,
                    'date_issued': recall.date_issued,
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
