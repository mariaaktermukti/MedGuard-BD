from django.urls import path

from .views import (
    DoctorMedicineListView,
    DoctorPatientListView,
    DoctorPatientMedicineHistoryView,
    DoctorPrescriptionDetailView,
    DoctorPrescriptionListCreateView,
)

urlpatterns = [
    path('patients/', DoctorPatientListView.as_view(), name='doctor-patients'),
    path('patients/<int:patient_id>/medicine-history/', DoctorPatientMedicineHistoryView.as_view(), name='doctor-patient-medicine-history'),
    path('prescriptions/', DoctorPrescriptionListCreateView.as_view(), name='doctor-prescriptions'),
    path('prescriptions/<int:pk>/', DoctorPrescriptionDetailView.as_view(), name='doctor-prescription-detail'),
    path('medicines/', DoctorMedicineListView.as_view(), name='doctor-medicines'),
]
