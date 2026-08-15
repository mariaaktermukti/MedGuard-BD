from django.urls import path

from .views import DoctorPatientListView, DoctorPatientMedicineHistoryView

urlpatterns = [
    path('patients/', DoctorPatientListView.as_view(), name='doctor-patients'),
    path('patients/<int:patient_id>/medicine-history/', DoctorPatientMedicineHistoryView.as_view(), name='doctor-patient-medicine-history'),
]
