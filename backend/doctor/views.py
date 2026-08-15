from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, views
from rest_framework.response import Response

from core.models import Consultation, DosageSchedule, Prescription, Sale
from users.permissions import IsDoctor

from .serializers import (
    DoctorPatientDosageScheduleSerializer,
    DoctorPatientSaleSerializer,
    DoctorPatientSerializer,
    DoctorPrescriptionSerializer,
)

User = get_user_model()


def _is_existing_patient(doctor, patient_id):
    return (
        Consultation.objects.filter(doctor=doctor, citizen_id=patient_id).exists()
        or Prescription.objects.filter(doctor=doctor, citizen_id=patient_id).exists()
    )


class DoctorPatientListView(generics.ListAPIView):
    serializer_class = DoctorPatientSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get_queryset(self):
        patient_ids = set(
            Consultation.objects.filter(doctor=self.request.user).values_list('citizen_id', flat=True)
        ) | set(
            Prescription.objects.filter(doctor=self.request.user).values_list('citizen_id', flat=True)
        )
        return User.objects.filter(id__in=patient_ids).order_by('full_name')


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
