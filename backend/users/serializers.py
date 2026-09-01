from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    CustomUser, Role, CitizenProfile, ManufacturerProfile, 
    PharmacyProfile, DistributorProfile, DoctorProfile, 
    DGDAProfile, ResearcherProfile
)

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_or_email = attrs.get('username')
        if username_or_email:
            # Allow login using either Email or Username (case-insensitive)
            user_obj = User.objects.filter(email__iexact=username_or_email).first() or User.objects.filter(username__iexact=username_or_email).first()
            if user_obj:
                attrs['username'] = user_obj.username

        data = super().validate(attrs)
        data['role'] = getattr(self.user, 'role', 'citizen')
        data['username'] = self.user.username
        data['full_name'] = getattr(self.user, 'full_name', self.user.username)
        return data

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    role = serializers.ChoiceField(choices=Role.choices, required=True)

    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'password', 'full_name', 'phone', 'role')

    def create(self, validated_data):
        validated_data['password'] = make_password(validated_data.get('password'))
        user = super().create(validated_data)
        
        # Create corresponding profile based on role
        role = user.role
        if role == Role.CITIZEN:
            CitizenProfile.objects.create(user=user)
        elif role == Role.MANUFACTURER:
            ManufacturerProfile.objects.create(user=user, company_name=user.full_name, registration_number=f"REG-MFG-{user.id}")
        elif role == Role.PHARMACY:
            PharmacyProfile.objects.create(user=user, pharmacy_name=user.full_name, registration_number=f"REG-PHR-{user.id}")
        elif role == Role.DISTRIBUTOR:
            DistributorProfile.objects.create(user=user, company_name=user.full_name, registration_number=f"REG-DST-{user.id}")
        elif role == Role.DOCTOR:
            DoctorProfile.objects.create(user=user, license_number=f"LIC-DOC-{user.id}")
        elif role == Role.DGDA:
            DGDAProfile.objects.create(user=user)
        elif role == Role.RESEARCHER:
            ResearcherProfile.objects.create(user=user)

        return user
