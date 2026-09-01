# pyrefly: ignore [missing-import]
from django.urls import path
from .views import (
    RegisterView, CitizenPortalView, PharmacyPortalView, ManufacturerPortalView,
    DistributorPortalView, DGDAPortalView, DoctorPortalView, ResearcherPortalView,
    UserMeView
)
from .debug_views import DebugAuthView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('me/', UserMeView.as_view(), name='me'),
    path('debug/', DebugAuthView.as_view(), name='debug'),
    path('citizen-portal/', CitizenPortalView.as_view(), name='citizen-portal'),
    path('pharmacy-portal/', PharmacyPortalView.as_view(), name='pharmacy-portal'),
    path('manufacturer-portal/', ManufacturerPortalView.as_view(), name='manufacturer-portal'),
    path('distributor-portal/', DistributorPortalView.as_view(), name='distributor-portal'),
    path('dgda-portal/', DGDAPortalView.as_view(), name='dgda-portal'),
    path('doctor-portal/', DoctorPortalView.as_view(), name='doctor-portal'),
    path('researcher-portal/', ResearcherPortalView.as_view(), name='researcher-portal'),
]
