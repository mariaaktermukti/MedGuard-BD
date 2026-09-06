import hashlib
import secrets
import uuid

from django.conf import settings
from django.db import models

User = settings.AUTH_USER_MODEL


def build_secure_code(prefix, *parts, length=18):
    payload = ":".join(str(part) for part in parts if part is not None) or secrets.token_hex(16)
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest().upper()
    return f"{prefix}-{digest[:length]}"


class Medicine(models.Model):
    name = models.CharField(max_length=150, db_index=True)
    generic_name = models.CharField(max_length=150, blank=True, null=True)
    category = models.CharField(max_length=50, blank=True, null=True)
    dosage_form = models.CharField(max_length=50, blank=True, null=True)
    strength = models.CharField(max_length=50, blank=True, null=True)
    formulation = models.CharField(max_length=120, blank=True, null=True)
    packaging = models.CharField(max_length=120, blank=True, null=True)
    regulatory_approval_number = models.CharField(max_length=100, blank=True, null=True)
    quality_certificate = models.FileField(upload_to="quality-certificates/", blank=True, null=True)
    product_id = models.CharField(max_length=40, unique=True, editable=False, db_index=True, blank=True, null=True)
    manufacturer = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='medicines')
    description = models.TextField(blank=True, null=True)
    is_registered = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.product_id:
            self.product_id = f"MED-{uuid.uuid4().hex[:12].upper()}"
        super().save(*args, **kwargs)


class Batch(models.Model):
    medicine = models.ForeignKey(Medicine, on_delete=models.RESTRICT, related_name='batches')
    manufacturer = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='manufactured_batches')
    batch_number = models.CharField(max_length=50, db_index=True)
    manufacturing_date = models.DateField()
    expiry_date = models.DateField(db_index=True)
    quantity_produced = models.PositiveIntegerField()
    ingredients = models.JSONField(default=list, blank=True)
    api_sources = models.JSONField(default=list, blank=True)
    qc_results = models.JSONField(default=dict, blank=True)
    qc_status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('passed', 'Passed'), ('failed', 'Failed')], default='pending')
    release_blocked = models.BooleanField(default=True)
    ddp_id = models.CharField(max_length=64, unique=True, editable=False, db_index=True, blank=True, null=True)
    qr_code = models.CharField(max_length=255, unique=True, editable=False, blank=True, null=True)
    unit_qr_codes = models.JSONField(default=list, blank=True)
    qr_activated_at = models.DateTimeField(blank=True, null=True)
    warehouse_released_at = models.DateTimeField(blank=True, null=True)
    geo_timestamp = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=[('active', 'Active'), ('recalled', 'Recalled'), ('expired', 'Expired')], default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.ddp_id:
            self.ddp_id = build_secure_code('DDP', self.batch_number, self.manufacturing_date, self.quantity_produced, length=20)
        if not self.qr_code:
            self.qr_code = build_secure_code('QR', self.ddp_id, self.batch_number, self.quantity_produced, length=22)
        if not self.unit_qr_codes:
            self.unit_qr_codes = [
                build_secure_code('UNIT', self.ddp_id, self.batch_number, index + 1, length=24)
                for index in range(self.quantity_produced)
            ]
        super().save(*args, **kwargs)


class QualityTest(models.Model):
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='quality_tests')
    test_name = models.CharField(max_length=100)
    test_result = models.CharField(max_length=50, blank=True, null=True)
    result_value = models.CharField(max_length=100, blank=True, null=True)
    is_out_of_spec = models.BooleanField(default=False)
    report_file = models.FileField(upload_to="qc-reports/", blank=True, null=True)
    conducted_date = models.DateField(blank=True, null=True)


class Warehouse(models.Model):
    distributor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='warehouses')
    name = models.CharField(max_length=100)
    location = models.TextField(blank=True, null=True)
    capacity = models.PositiveIntegerField(blank=True, null=True)


class Inventory(models.Model):
    batch = models.ForeignKey(Batch, on_delete=models.RESTRICT, related_name='inventory')
    entity_type = models.CharField(max_length=20, choices=[('pharmacy', 'Pharmacy'), ('warehouse', 'Warehouse')])
    entity_id = models.PositiveIntegerField()
    quantity = models.PositiveIntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)


class DistributionEvent(models.Model):
    batch = models.ForeignKey(Batch, on_delete=models.RESTRICT, related_name='distribution_events')
    from_user = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='distribution_events_sent')
    to_user = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='distribution_events_received')
    stage_from = models.CharField(max_length=50)
    stage_to = models.CharField(max_length=50)
    quantity = models.PositiveIntegerField()
    event_date = models.DateTimeField(auto_now_add=True)
    geo_location = models.CharField(max_length=255, blank=True, null=True)
    geo_timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)


class Shipment(models.Model):
    batch = models.ForeignKey(Batch, on_delete=models.RESTRICT, related_name='shipments')
    from_user = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='shipments_sent')
    to_user = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='shipments_received')
    quantity = models.PositiveIntegerField()
    shipment_date = models.DateField()
    delivery_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('in_transit', 'In Transit'), ('delivered', 'Delivered'), ('cancelled', 'Cancelled')], default='pending')
    tracking_number = models.CharField(max_length=50, blank=True, null=True)
    geo_location = models.CharField(max_length=255, blank=True, null=True)
    geo_timestamp = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Sale(models.Model):
    pharmacy = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='pharmacy_sales')
    batch = models.ForeignKey(Batch, on_delete=models.RESTRICT, related_name='sales')
    citizen = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='citizen_purchases')
    quantity = models.PositiveIntegerField()
    sale_date = models.DateTimeField(auto_now_add=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    payment_method = models.CharField(max_length=20, choices=[('cash', 'Cash'), ('card', 'Card'), ('mobile', 'Mobile')], default='cash')


class Consultation(models.Model):
    doctor = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='consultations_as_doctor')
    citizen = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='consultations_as_citizen')
    consultation_date = models.DateTimeField(auto_now_add=True)
    consultation_type = models.CharField(max_length=20, choices=[('chat', 'Chat'), ('audio', 'Audio'), ('video', 'Video'), ('in_person', 'In Person')])
    status = models.CharField(max_length=20, choices=[('scheduled', 'Scheduled'), ('ongoing', 'Ongoing'), ('completed', 'Completed'), ('cancelled', 'Cancelled')], default='scheduled')
    notes = models.TextField(blank=True, null=True)


class Prescription(models.Model):
    doctor = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='prescriptions_given')
    citizen = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='prescriptions_received')
    consultation = models.ForeignKey(Consultation, on_delete=models.SET_NULL, null=True, blank=True, related_name='prescriptions')
    prescription_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[('active', 'Active'), ('completed', 'Completed'), ('cancelled', 'Cancelled')], default='active')
    notes = models.TextField(blank=True, null=True)


class PrescriptionItem(models.Model):
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='items')
    medicine = models.ForeignKey(Medicine, on_delete=models.RESTRICT, related_name='prescription_items')
    dosage = models.CharField(max_length=50, blank=True, null=True)
    duration = models.CharField(max_length=50, blank=True, null=True)
    instructions = models.TextField(blank=True, null=True)


class DosageSchedule(models.Model):
    citizen = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dosage_schedules')
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name='dosage_schedules')
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    reminder_times = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class ADRReport(models.Model):
    reported_by_user = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='adr_reports_filed')
    citizen = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='adr_reports_patient')
    batch = models.ForeignKey(Batch, on_delete=models.SET_NULL, null=True, blank=True, related_name='adr_reports')
    medicine = models.ForeignKey(Medicine, on_delete=models.RESTRICT, related_name='adr_reports')
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=[('mild', 'Mild'), ('moderate', 'Moderate'), ('severe', 'Severe')])
    reaction_date = models.DateField(blank=True, null=True)
    date_reported = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('investigated', 'Investigated'), ('resolved', 'Resolved')], default='pending')
    attachment = models.FileField(upload_to="adr-attachments/", blank=True, null=True)


class Recall(models.Model):
    batch = models.ForeignKey(Batch, on_delete=models.RESTRICT, related_name='recalls')
    reason = models.TextField()
    issued_by_user = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='recalls_issued')
    date_issued = models.DateField()
    status = models.CharField(max_length=20, choices=[('active', 'Active'), ('completed', 'Completed')], default='active')
    progress_percent = models.PositiveSmallIntegerField(default=0)
    halted_sales = models.BooleanField(default=True)
    notified_downstream_at = models.DateTimeField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)


class ComplianceItem(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='compliance_items')
    title = models.CharField(max_length=150)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('submitted', 'Submitted'), ('approved', 'Approved'), ('expired', 'Expired')], default='pending')
    evidence_file = models.FileField(upload_to="compliance-evidence/", blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class DemandForecast(models.Model):
    region = models.CharField(max_length=100, db_index=True)
    forecast_date = models.DateField()
    predicted_demand = models.PositiveIntegerField()
    confidence_score = models.DecimalField(max_digits=4, decimal_places=2, default=0.50)
    seasonal_signal = models.CharField(max_length=100, blank=True, null=True)
    source_summary = models.JSONField(default=list, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='demand_forecasts')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Complaint(models.Model):
    citizen = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='complaints_made')
    pharmacy = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='complaints_received')
    complaint_text = models.TextField()
    date_submitted = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('resolved', 'Resolved')], default='pending')
    resolution_text = models.TextField(blank=True, null=True)


class Inspection(models.Model):
    inspector = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='inspections_conducted')
    entity_type = models.CharField(max_length=20, choices=[('manufacturer', 'Manufacturer'), ('pharmacy', 'Pharmacy'), ('distributor', 'Distributor')])
    entity_id = models.PositiveIntegerField()
    inspection_date = models.DateField()
    findings = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=[('scheduled', 'Scheduled'), ('completed', 'Completed'), ('failed', 'Failed')], default='scheduled')
    report_file = models.FileField(upload_to="inspection-reports/", blank=True, null=True)


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class ResearchDataset(models.Model):
    dataset_name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='datasets_created')
    data_file = models.FileField(upload_to="research-datasets/", blank=True, null=True)


class ResearchADRData(models.Model):
    adr_report = models.ForeignKey(ADRReport, on_delete=models.CASCADE, related_name='research_data')
    anonymized_data = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class KnowledgeEdge(models.Model):
    source_type = models.CharField(max_length=20, choices=[('medicine', 'Medicine'), ('disease', 'Disease'), ('symptom', 'Symptom'), ('adr', 'ADR')])
    source_id = models.PositiveIntegerField()
    target_type = models.CharField(max_length=20, choices=[('medicine', 'Medicine'), ('disease', 'Disease'), ('symptom', 'Symptom'), ('adr', 'ADR')])
    target_id = models.PositiveIntegerField()
    relation = models.CharField(max_length=50)
    weight = models.DecimalField(max_digits=3, decimal_places=2, default=1.00)
    created_at = models.DateTimeField(auto_now_add=True)


class MonitoringEvent(models.Model):
    EVENT_TYPES = [
        ('adr', 'Adverse Drug Reaction'),
        ('counterfeit', 'Suspected Counterfeit'),
        ('expired', 'Expired Medicine'),
        ('complaint', 'Citizen/Pharmacy Complaint'),
        ('price_anomaly', 'Price Anomaly'),
        ('supply_chain_anomaly', 'Supply Chain Anomaly'),
        ('quality_issue', 'Quality Issue'),
    ]

    SEVERITY_CHOICES = [
        ('critical', 'Critical'),
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ]

    STATUS_CHOICES = [
        ('new', 'New'),
        ('under_review', 'Under Review'),
        ('escalated', 'Escalated'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
    ]

    event_id = models.CharField(max_length=50, unique=True, db_index=True, blank=True)
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES, default='adr')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    medicine = models.ForeignKey(Medicine, on_delete=models.SET_NULL, null=True, blank=True, related_name='monitoring_events')
    batch = models.ForeignKey(Batch, on_delete=models.SET_NULL, null=True, blank=True, related_name='monitoring_events')
    manufacturer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='manufacturer_monitoring_events')
    pharmacy = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='pharmacy_monitoring_events')
    distributor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='distributor_monitoring_events')
    citizen = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='citizen_monitoring_events')
    doctor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='doctor_monitoring_events')
    researcher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='researcher_monitoring_events')
    location = models.CharField(max_length=100, blank=True, null=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='medium')
    risk_score = models.IntegerField(default=50)
    risk_factors = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    source = models.CharField(max_length=100, default='ADR Sentinel')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_events')
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.event_id:
            import random
            rand_suffix = f"{random.randint(1000, 9999)}"
            self.event_id = f"MON-2026-{rand_suffix}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.event_id}] {self.title} ({self.get_severity_display()})"

