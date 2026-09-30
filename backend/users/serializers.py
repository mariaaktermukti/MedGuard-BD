# pyrefly: ignore [missing-import]
# pyright: reportAttributeAccessIssue=false
# type: ignore
from django.db.models import Q
from rest_framework import serializers
# pyrefly: ignore [missing-import]
from django.contrib.auth.hashers import make_password
# pyrefly: ignore [missing-import]
from django.contrib.auth import get_user_model
# pyrefly: ignore [missing-import]
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    CustomUser, Role, CitizenProfile, ManufacturerProfile, 
    PharmacyProfile, DistributorProfile, DoctorProfile, 
    DGDAProfile, ResearcherProfile
)

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_or_email = (attrs.get('username') or '').strip()
        password = attrs.get('password')

        if username_or_email and password:
            # First try exact/case-insensitive username match
            user_obj = User.objects.filter(username__iexact=username_or_email).first()
            
            # If user_obj not found or password doesn't match this candidate,
            # search all candidates matching username or email for a matching password
            if not user_obj or not getattr(user_obj, 'check_password', lambda p: False)(password):
                candidates = User.objects.filter(
                    Q(username__iexact=username_or_email) | Q(email__iexact=username_or_email)
                )
                matching_user = None
                for cand in candidates:
                    if getattr(cand, 'check_password', lambda p: False)(password):
                        matching_user = cand
                        break
                if matching_user:
                    user_obj = matching_user

            if user_obj:
                attrs['username'] = getattr(user_obj, 'username', username_or_email)

        data = super().validate(attrs)
        
        # Access user attached by TokenObtainPairSerializer
        authenticated_user = getattr(self, 'user', None)
        if authenticated_user:
            data['role'] = getattr(authenticated_user, 'role', 'citizen')
            data['username'] = getattr(authenticated_user, 'username', attrs.get('username', ''))
            data['full_name'] = getattr(authenticated_user, 'full_name', getattr(authenticated_user, 'username', ''))
        else:
            data['role'] = 'citizen'
            data['username'] = attrs.get('username', '')
            data['full_name'] = attrs.get('username', '')

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
        role = getattr(user, 'role', None)
        user_id = getattr(user, 'id', None)
        full_name = getattr(user, 'full_name', '')

        if role == Role.CITIZEN:
            CitizenProfile.objects.create(user=user)
        elif role == Role.MANUFACTURER:
            ManufacturerProfile.objects.create(user=user, company_name=full_name, registration_number=f"REG-MFG-{user_id}")
        elif role == Role.PHARMACY:
            PharmacyProfile.objects.create(user=user, pharmacy_name=full_name, registration_number=f"REG-PHR-{user_id}")
        elif role == Role.DISTRIBUTOR:
            DistributorProfile.objects.create(user=user, company_name=full_name, registration_number=f"REG-DST-{user_id}")
        elif role == Role.DOCTOR:
            DoctorProfile.objects.create(user=user, license_number=f"LIC-DOC-{user_id}")
        elif role == Role.DGDA:
            DGDAProfile.objects.create(user=user)
        elif role == Role.RESEARCHER:
            ResearcherProfile.objects.create(user=user)

        return user

