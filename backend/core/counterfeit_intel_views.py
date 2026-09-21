from datetime import timedelta

from django.db.models import Count, Min
from django.db.models.functions import Lower, Trim, TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import serializers, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from users.permissions import IsDGDA

from .models import CounterfeitReport

# Model field that stores the report reason; the API always exposes it as `reason`
REASON_FIELD = 'category'

TOP_MEDICINES_LIMIT = 5
DEFAULT_TREND_DAYS = 30
MAX_TREND_DAYS = 365

STATUS_CHOICES = CounterfeitReport._meta.get_field('status').choices
REASON_CHOICES = CounterfeitReport._meta.get_field(REASON_FIELD).choices
STATUS_VALUES = [value for value, _ in STATUS_CHOICES]
REASON_VALUES = [value for value, _ in REASON_CHOICES]


class CounterfeitIntelReportSerializer(serializers.ModelSerializer):
    reporter_username = serializers.CharField(source='reporter.username', read_only=True)
    reporter_role = serializers.CharField(source='reporter.role', read_only=True)
    reason = serializers.CharField(source=REASON_FIELD, read_only=True)
    reason_display = serializers.CharField(source=f'get_{REASON_FIELD}_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = CounterfeitReport
        fields = [
            'id', 'reporter', 'reporter_username', 'reporter_role', 'qr_code', 'medicine_name', 'location',
            'reason', 'reason_display', 'description', 'photo', 'status', 'status_display', 'created_at',
        ]
        read_only_fields = ['reporter', 'qr_code', 'medicine_name', 'location', 'description', 'photo', 'status', 'created_at']


def _parse_date_param(value):
    if not value:
        return None, None
    try:
        parsed = parse_date(value)
    except ValueError:
        parsed = None
    if parsed is None:
        return None, f"'{value}' is not a valid date. Use YYYY-MM-DD."
    return parsed, None


class DGDACounterfeitReportListView(views.APIView):
    permission_classes = [IsAuthenticated, IsDGDA]

    def get(self, request):
        params = request.query_params
        qs = CounterfeitReport.objects.select_related('reporter').order_by('-created_at')

        status_param = params.get('status')
        if status_param and status_param != 'all':
            if status_param not in STATUS_VALUES:
                return Response({"error": f"Invalid status '{status_param}'."}, status=400)
            qs = qs.filter(status=status_param)

        reason = params.get('reason')
        if reason and reason != 'all':
            if reason not in REASON_VALUES:
                return Response({"error": f"Invalid reason '{reason}'."}, status=400)
            qs = qs.filter(**{REASON_FIELD: reason})

        date_from, error = _parse_date_param(params.get('date_from'))
        if error:
            return Response({"error": error}, status=400)
        date_to, error = _parse_date_param(params.get('date_to'))
        if error:
            return Response({"error": error}, status=400)
        if date_from and date_to and date_from > date_to:
            return Response({"error": "date_from cannot be after date_to."}, status=400)
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        return Response(CounterfeitIntelReportSerializer(qs, many=True, context={'request': request}).data)


class DGDACounterfeitReportStatusView(views.APIView):
    permission_classes = [IsAuthenticated, IsDGDA]

    def patch(self, request, pk):
        report = CounterfeitReport.objects.select_related('reporter').filter(pk=pk).first()
        if not report:
            return Response({"error": "Report not found"}, status=404)

        new_status = request.data.get('status')
        if new_status not in STATUS_VALUES:
            return Response({"error": f"Status must be one of: {', '.join(STATUS_VALUES)}."}, status=400)

        if report.status != new_status:
            report.status = new_status
            report.save(update_fields=['status'])

        return Response(CounterfeitIntelReportSerializer(report, context={'request': request}).data)


class DGDACounterfeitReportSummaryView(views.APIView):
    permission_classes = [IsAuthenticated, IsDGDA]

    def get(self, request):
        try:
            days = int(request.query_params.get('days', DEFAULT_TREND_DAYS))
        except (TypeError, ValueError):
            return Response({"error": "days must be a whole number."}, status=400)
        days = max(1, min(days, MAX_TREND_DAYS))

        reports = CounterfeitReport.objects.all()
        status_counts = dict(reports.values_list('status').annotate(count=Count('id')))
        reason_counts = dict(reports.values_list(REASON_FIELD).annotate(count=Count('id')))

        # medicine_name is free text, so group case- and whitespace-insensitively
        top_medicines = (
            reports.annotate(medicine_key=Lower(Trim('medicine_name')))
            .values('medicine_key')
            .annotate(count=Count('id'), display_name=Min(Trim('medicine_name')))
            .order_by('-count', 'medicine_key')[:TOP_MEDICINES_LIMIT]
        )

        start = timezone.localdate() - timedelta(days=days - 1)
        daily_counts = dict(
            reports.filter(created_at__date__gte=start)
            .annotate(day=TruncDate('created_at'))
            .values_list('day')
            .annotate(count=Count('id'))
        )

        return Response({
            "total": reports.count(),
            "by_status": [
                {"status": value, "label": label, "count": status_counts.get(value, 0)}
                for value, label in STATUS_CHOICES
            ],
            "by_reason": [
                {"reason": value, "label": label, "count": reason_counts.get(value, 0)}
                for value, label in REASON_CHOICES
            ],
            "top_medicines": [
                {"medicine_name": row['display_name'], "count": row['count']}
                for row in top_medicines
            ],
            "over_time": [
                {"date": (start + timedelta(days=offset)).isoformat(), "count": daily_counts.get(start + timedelta(days=offset), 0)}
                for offset in range(days)
            ],
            "over_time_days": days,
        })
