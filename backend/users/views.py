# pyrefly: ignore [missing-import]
from rest_framework.views import APIView
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework import status
# pyrefly: ignore [missing-import]
from rest_framework.permissions import AllowAny, IsAuthenticated
# pyrefly: ignore [missing-import]
from rest_framework_simplejwt.views import TokenObtainPairView
# pyrefly: ignore [missing-import]
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, CustomTokenObtainPairSerializer
from .permissions import (
    IsCitizen, IsPharmacy, IsManufacturer, 
    IsDistributor, IsDGDA, IsDoctor, IsResearcher
)

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class UserMeView(APIView):
    permission_classes = [IsAuthenticated]

    def _payload(self, user):
        return {
            "id": user.id,
            "full_name": user.full_name,
            "username": user.username,
            "email": user.email,
            "phone": getattr(user, 'phone', ''),
            "role": getattr(user, 'role', 'citizen')
        }

    def get(self, request):
        return Response(self._payload(request.user))

    def patch(self, request):
        """Let a signed-in user correct their own name, phone or email.

        A pharmacy finds a buyer by exact phone number, so somebody who
        registered without one could never be sold to and had no way to add it.
        """
        user = request.user
        errors = {}

        if 'full_name' in request.data:
            full_name = str(request.data.get('full_name') or '').strip()
            if not full_name:
                errors['full_name'] = 'Your name cannot be empty.'
            elif len(full_name) > 100:
                errors['full_name'] = 'Your name is too long.'
            else:
                user.full_name = full_name

        if 'phone' in request.data:
            phone = str(request.data.get('phone') or '').strip()
            if phone:
                if len(phone) > 20:
                    errors['phone'] = 'That phone number is too long.'
                elif User.objects.filter(phone=phone).exclude(pk=user.pk).exists():
                    # Not a hard uniqueness constraint in the model, but the pharmacy
                    # lookup matches on it, so duplicates would make a buyer ambiguous.
                    errors['phone'] = 'Another account already uses this phone number.'
                else:
                    user.phone = phone
            else:
                user.phone = None

        if 'email' in request.data:
            email = str(request.data.get('email') or '').strip()
            if email and User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
                errors['email'] = 'Another account already uses this email address.'
            else:
                user.email = email

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        user.save(update_fields=['full_name', 'phone', 'email'])
        return Response(self._payload(user))

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CitizenPortalView(APIView):
    permission_classes = [IsCitizen]

    def get(self, request):
        return Response({"message": "Welcome to the Citizen Portal", "user": request.user.username})

class PharmacyPortalView(APIView):
    permission_classes = [IsPharmacy]

    def get(self, request):
        return Response({"message": "Welcome to the Pharmacy Portal", "user": request.user.username})

class ManufacturerPortalView(APIView):
    permission_classes = [IsManufacturer]

    def get(self, request):
        return Response({"message": "Welcome to the Manufacturer Portal", "user": request.user.username})

class DistributorPortalView(APIView):
    permission_classes = [IsDistributor]

    def get(self, request):
        return Response({"message": "Welcome to the Distributor Portal", "user": request.user.username})

class DGDAPortalView(APIView):
    permission_classes = [IsDGDA]

    def get(self, request):
        return Response({"message": "Welcome to the DGDA Portal", "user": request.user.username})

class DoctorPortalView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        return Response({"message": "Welcome to the Doctor Portal", "user": request.user.username})

class ResearcherPortalView(APIView):
    permission_classes = [IsResearcher]

    def get(self, request):
        return Response({"message": "Welcome to the Researcher Portal", "user": request.user.username})
