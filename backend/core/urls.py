from django.urls import path
from .views import (
    DrugPassportView, PersonalMedicineRecordView, PersonalMedicineRecordDetailView,
    ADRReportCreateView, PharmacyFinderView, NotificationListView, NotificationMarkReadView,
    AIAssistantView, InteractionCheckerView
)

urlpatterns = [
    path('passport/<str:qr_code>/', DrugPassportView.as_view(), name='drug-passport'),
    path('medicines/personal/', PersonalMedicineRecordView.as_view(), name='personal-medicines'),
    path('medicines/personal/<int:pk>/', PersonalMedicineRecordDetailView.as_view(), name='personal-medicines-detail'),
    path('adr/', ADRReportCreateView.as_view(), name='adr-report'),
    path('pharmacies/', PharmacyFinderView.as_view(), name='pharmacy-finder'),
    path('notifications/', NotificationListView.as_view(), name='notifications'),
    path('notifications/<int:pk>/read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
    path('ai-assistant/', AIAssistantView.as_view(), name='ai-assistant'),
    path('interaction-checker/', InteractionCheckerView.as_view(), name='interaction-checker'),
]
