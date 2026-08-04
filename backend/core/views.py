from rest_framework import generics, views, status, permissions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import (
    Medicine, Batch, QualityTest, Shipment, Sale, ADRReport, 
    Notification, DosageSchedule
)
from users.models import PharmacyProfile
from .serializers import (
    BatchSerializer, DrugPassportSerializer, DosageScheduleSerializer,
    ADRReportSerializer, PharmacyProfileSerializer, NotificationSerializer
)
from users.permissions import IsCitizen
import os
from google import genai
from google.genai import types

class DrugPassportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, qr_code):
        batch = get_object_or_404(Batch, qr_code=qr_code)
        serializer = DrugPassportSerializer(batch)
        return Response(serializer.data)

class PersonalMedicineRecordView(generics.ListCreateAPIView):
    serializer_class = DosageScheduleSerializer
    permission_classes = [permissions.IsAuthenticated, IsCitizen]

    def get_queryset(self):
        return DosageSchedule.objects.filter(citizen=self.request.user)

    def perform_create(self, serializer):
        serializer.save(citizen=self.request.user)

class PersonalMedicineRecordDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DosageScheduleSerializer
    permission_classes = [permissions.IsAuthenticated, IsCitizen]

    def get_queryset(self):
        return DosageSchedule.objects.filter(citizen=self.request.user)

class ADRReportCreateView(generics.CreateAPIView):
    serializer_class = ADRReportSerializer
    permission_classes = [permissions.IsAuthenticated, IsCitizen]

    def perform_create(self, serializer):
        serializer.save(reported_by_user=self.request.user, citizen=self.request.user)

class PharmacyFinderView(generics.ListAPIView):
    serializer_class = PharmacyProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PharmacyProfile.objects.all().order_by('-trust_score')

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

class NotificationMarkReadView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        notification = get_object_or_404(Notification, pk=pk, user=request.user)
        notification.is_read = True
        notification.save()
        return Response({"status": "success"})


# AI Views
class AIAssistantView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsCitizen]

    def post(self, request):
        prompt = request.data.get('prompt')
        if not prompt:
            return Response({"error": "Prompt is required"}, status=status.HTTP_400_BAD_REQUEST)

        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return Response({"error": "AI service unavailable (missing API key)"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            client = genai.Client(api_key=api_key)
            
            # Fetch user context for better answers
            schedules = DosageSchedule.objects.filter(citizen=request.user, is_active=True)
            meds_list = ", ".join([s.medicine.name for s in schedules])
            context = f"User is currently taking: {meds_list if meds_list else 'No current medications'}. "
            
            full_prompt = f"You are a helpful AI Medicine Assistant. Context: {context}\n\nUser Question: {prompt}\n\nPlease provide a safe, clear answer. If the question implies an emergency or serious medical condition, advise them to consult a real doctor."

            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=full_prompt,
            )
            return Response({"response": response.text})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class InteractionCheckerView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsCitizen]

    def post(self, request):
        medicines = request.data.get('medicines', []) # list of strings
        if len(medicines) < 2:
            return Response({"error": "Please provide at least two medicines to check for interactions"}, status=status.HTTP_400_BAD_REQUEST)

        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return Response({"error": "AI service unavailable (missing API key)"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            client = genai.Client(api_key=api_key)
            
            meds_str = ", ".join(medicines)
            full_prompt = f"Please analyze potential drug interactions between the following medicines: {meds_str}. Provide a summary of severity (None, Minor, Moderate, Major) and a brief explanation. Structure your response clearly."

            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=full_prompt,
            )
            return Response({"response": response.text})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
