from rest_framework import serializers

from core.models import ResearchDataset


class GovernedADRRecordSerializer(serializers.Serializer):
    """Output contract for a single ethics-governed ADR record.

    Read-only by design: researchers never write back to ADRReport. Identifying
    columns are absent from this contract on purpose — see
    researcher/utils.py REDACTED_FIELDS.
    """

    record_id = serializers.IntegerField(read_only=True)
    subject_ref = serializers.CharField(read_only=True, allow_null=True)
    medicine_id = serializers.IntegerField(read_only=True, allow_null=True)
    medicine_name = serializers.CharField(read_only=True, allow_null=True)
    generic_name = serializers.CharField(read_only=True, allow_null=True)
    severity = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    reaction_month = serializers.CharField(read_only=True, allow_null=True)
    reported_month = serializers.CharField(read_only=True, allow_null=True)
    narrative = serializers.CharField(read_only=True, allow_blank=True)
    narrative_source = serializers.CharField(read_only=True)


class ResearchDatasetSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    has_data_file = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = ResearchDataset
        fields = [
            'id', 'dataset_name', 'description', 'created_at',
            'created_by_username', 'created_by_name', 'has_data_file', 'file_name',
        ]

    def get_has_data_file(self, obj):
        return bool(obj.data_file)

    def get_file_name(self, obj):
        return obj.data_file.name.rsplit('/', 1)[-1] if obj.data_file else None
