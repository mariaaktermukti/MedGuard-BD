from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

class Role(models.TextChoices):
    CITIZEN = 'citizen', _('Citizen')
    MANUFACTURER = 'manufacturer', _('Manufacturer')
    PHARMACY = 'pharmacy', _('Pharmacy')
    DISTRIBUTOR = 'distributor', _('Distributor')
    DOCTOR = 'doctor', _('Doctor')
    DGDA = 'dgda', _('DGDA')
    RESEARCHER = 'researcher', _('Researcher')

class CustomUser(AbstractUser):
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CITIZEN,
    )
    full_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True, null=True)
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

class CitizenProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, primary_key=True, related_name='citizen_profile')
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=10, choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')], blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    emergency_contact = models.CharField(max_length=20, blank=True, null=True)

class ManufacturerProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, primary_key=True, related_name='manufacturer_profile')
    company_name = models.CharField(max_length=100)
    registration_number = models.CharField(max_length=50, unique=True)
    address = models.TextField(blank=True, null=True)
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    website = models.URLField(max_length=100, blank=True, null=True)

class PharmacyProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, primary_key=True, related_name='pharmacy_profile')
    pharmacy_name = models.CharField(max_length=100)
    registration_number = models.CharField(max_length=50, unique=True)
    address = models.TextField(blank=True, null=True)
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    license_number = models.CharField(max_length=50, blank=True, null=True)
    trust_score = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)

class DistributorProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, primary_key=True, related_name='distributor_profile')
    company_name = models.CharField(max_length=100)
    registration_number = models.CharField(max_length=50, unique=True)
    address = models.TextField(blank=True, null=True)
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)

class DoctorProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, primary_key=True, related_name='doctor_profile')
    specialization = models.CharField(max_length=100, blank=True, null=True)
    license_number = models.CharField(max_length=50, unique=True)
    hospital_affiliation = models.CharField(max_length=100, blank=True, null=True)
    years_of_experience = models.PositiveSmallIntegerField(blank=True, null=True)

class DGDAProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, primary_key=True, related_name='dgda_profile')
    designation = models.CharField(max_length=100, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)

class ResearcherProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, primary_key=True, related_name='researcher_profile')
    affiliation = models.CharField(max_length=100, blank=True, null=True)
    research_interests = models.TextField(blank=True, null=True)
