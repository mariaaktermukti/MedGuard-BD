from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .serializers import RegisterSerializer
from .permissions import (
    IsCitizen, IsPharmacy, IsManufacturer, 
    IsDistributor, IsDGDA, IsDoctor, IsResearcher
)

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
