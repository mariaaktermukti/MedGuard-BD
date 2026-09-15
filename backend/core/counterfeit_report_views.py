from django.core.validators import FileExtensionValidator
from rest_framework import generics, permissions, serializers

from users.permissions import IsCitizen, IsPharmacy

from .models import CounterfeitReport

MAX_PHOTO_SIZE_MB = 5


class CounterfeitReportSerializer(serializers.ModelSerializer):
    # Lives here instead of serializers.py so the counterfeit-report feature stays isolated in one file
    reporter_username = serializers.CharField(source='reporter.username', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    photo = serializers.FileField(
        required=False,
        allow_null=True,
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])],
    )

    class Meta:
        model = CounterfeitReport
        fields = [
            'id', 'reporter', 'reporter_username', 'qr_code', 'medicine_name', 'location',
            'category', 'category_display', 'description', 'photo', 'status', 'status_display', 'created_at',
        ]
        read_only_fields = ['reporter', 'status', 'created_at']

    def validate_medicine_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Medicine name is required.')
        return value

    def validate_description(self, value):
        value = value.strip()
        if len(value) < 10:
            raise serializers.ValidationError('Please describe the issue in at least 10 characters.')
        return value

    def validate_photo(self, value):
        if value and value.size > MAX_PHOTO_SIZE_MB * 1024 * 1024:
            raise serializers.ValidationError(f'Photo must be {MAX_PHOTO_SIZE_MB} MB or smaller.')
        return value

    def validate(self, attrs):
        # Multipart forms send empty strings for untouched optional fields
        for field in ('qr_code', 'location'):
            if field in attrs:
                attrs[field] = (attrs[field] or '').strip() or None
        return attrs


class CounterfeitReportListCreateView(generics.ListCreateAPIView):
    serializer_class = CounterfeitReportSerializer
    permission_classes = [permissions.IsAuthenticated, IsCitizen | IsPharmacy]

    def get_queryset(self):
        return CounterfeitReport.objects.filter(reporter=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)
