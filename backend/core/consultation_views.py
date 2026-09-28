# pyrefly: ignore [missing-import]
from rest_framework import views, permissions, status
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from django.contrib.auth import get_user_model
from core.models import Consultation, ConsultationMessage
from users.models import DoctorProfile

User = get_user_model()


class DoctorListView(views.APIView):
    """
    Returns a list of all registered Doctors for Citizens to consult.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        doctors = User.objects.filter(role='doctor').order_by('full_name', 'username')
        data = []
        for doc in doctors:
            profile = getattr(doc, 'doctor_profile', None)
            license_num = profile.license_number if profile and profile.license_number else f"LIC-DOC-{doc.id}"
            data.append({
                'id': doc.id,
                'username': doc.username,
                'full_name': doc.full_name or doc.username,
                'email': doc.email,
                'license_number': license_num,
                'hospital': getattr(profile, 'hospital_affinity', 'National Medical Center'),
            })
        return Response(data, status=status.HTTP_200_OK)


class CitizenConsultationListCreateView(views.APIView):
    """
    Allows Citizens to view their consultations and send new consultation requests to Doctors.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        consultations = Consultation.objects.filter(citizen=request.user).select_related('doctor', 'doctor__doctor_profile').order_by('-consultation_date')
        result = []
        for c in consultations:
            profile = getattr(c.doctor, 'doctor_profile', None)
            result.append({
                'id': c.id,
                'doctor_id': c.doctor.id,
                'doctor_username': c.doctor.username,
                'doctor_full_name': c.doctor.full_name or c.doctor.username,
                'doctor_license': profile.license_number if profile and profile.license_number else f"LIC-DOC-{c.doctor.id}",
                'consultation_date': c.consultation_date,
                'consultation_type': c.consultation_type,
                'status': c.status,
                'notes': c.notes,
                'messages_count': c.messages.count(),
            })
        return Response(result, status=status.HTTP_200_OK)

    def post(self, request):
        doctor_id = request.data.get('doctor_id')
        consultation_type = request.data.get('consultation_type', 'chat')
        notes = request.data.get('notes', '').strip()

        if not doctor_id:
            return Response({'detail': 'Please select a doctor to consult.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            doctor = User.objects.get(id=doctor_id, role='doctor')
        except User.DoesNotExist:
            return Response({'detail': 'Selected doctor does not exist.'}, status=status.HTTP_404_NOT_FOUND)

        consultation = Consultation.objects.create(
            citizen=request.user,
            doctor=doctor,
            consultation_type=consultation_type,
            status='requested',
            notes=notes
        )

        if notes:
            ConsultationMessage.objects.create(
                consultation=consultation,
                sender=request.user,
                message=notes
            )

        return Response({
            'id': consultation.id,
            'message': f'Consultation request sent to Dr. {doctor.full_name or doctor.username}.',
            'status': consultation.status
        }, status=status.HTTP_201_CREATED)


class ConsultationMessagesView(views.APIView):
    """
    Provides dynamic 2-way chat message fetching and sending for both Citizen and Doctor.
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_consultation(self, pk, user):
        try:
            consultation = Consultation.objects.select_related('citizen', 'doctor').get(pk=pk)
        except Consultation.DoesNotExist:
            return None, Response({'detail': 'Consultation not found.'}, status=status.HTTP_404_NOT_FOUND)

        if consultation.citizen != user and consultation.doctor != user and not user.is_staff:
            return None, Response({'detail': 'You do not have permission to access this consultation.'}, status=status.HTTP_403_FORBIDDEN)

        return consultation, None

    def get(self, request, pk):
        consultation, error_response = self._get_consultation(pk, request.user)
        if error_response:
            return error_response

        messages = consultation.messages.select_related('sender').all()
        messages_data = []
        for m in messages:
            image_url = request.build_absolute_uri(m.image.url) if m.image else None
            messages_data.append({
                'id': m.id,
                'sender_id': m.sender.id,
                'sender_username': m.sender.username,
                'sender_full_name': m.sender.full_name or m.sender.username,
                'sender_role': getattr(m.sender, 'role', 'user'),
                'message': m.message,
                'image': image_url,
                'timestamp': m.timestamp,
                'is_me': m.sender == request.user
            })

        return Response({
            'consultation': {
                'id': consultation.id,
                'status': consultation.status,
                'consultation_type': consultation.consultation_type,
                'doctor_full_name': consultation.doctor.full_name or consultation.doctor.username,
                'doctor_username': consultation.doctor.username,
                'citizen_full_name': consultation.citizen.full_name or consultation.citizen.username,
                'citizen_username': consultation.citizen.username,
                'notes': consultation.notes,
            },
            'messages': messages_data
        }, status=status.HTTP_200_OK)

    def post(self, request, pk):
        consultation, error_response = self._get_consultation(pk, request.user)
        if error_response:
            return error_response

        msg_text = request.data.get('message', '').strip()
        image_file = request.FILES.get('image')

        if not msg_text and not image_file:
            return Response({'detail': 'Please provide text message or an attached image report.'}, status=status.HTTP_400_BAD_REQUEST)

        if consultation.status == 'cancelled':
            return Response({'detail': 'Cannot send messages on a cancelled consultation.'}, status=status.HTTP_400_BAD_REQUEST)

        # Auto transition status if accepted to ongoing
        if consultation.status in ('requested', 'accepted', 'scheduled'):
            consultation.status = 'ongoing'
            consultation.save(update_fields=['status'])

        msg = ConsultationMessage.objects.create(
            consultation=consultation,
            sender=request.user,
            message=msg_text,
            image=image_file
        )

        image_url = request.build_absolute_uri(msg.image.url) if msg.image else None

        return Response({
            'id': msg.id,
            'sender_id': msg.sender.id,
            'sender_username': msg.sender.username,
            'sender_full_name': msg.sender.full_name or msg.sender.username,
            'sender_role': getattr(msg.sender, 'role', 'user'),
            'message': msg.message,
            'image': image_url,
            'timestamp': msg.timestamp,
            'is_me': True
        }, status=status.HTTP_201_CREATED)
