from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL

class Medicine(models.Model):
    name = models.CharField(max_length=150, db_index=True)
    generic_name = models.CharField(max_length=150, blank=True, null=True)
    category = models.CharField(max_length=50, blank=True, null=True)
    dosage_form = models.CharField(max_length=50, blank=True, null=True)
    strength = models.CharField(max_length=50, blank=True, null=True)
    manufacturer = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='medicines')
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Batch(models.Model):
    medicine = models.ForeignKey(Medicine, on_delete=models.RESTRICT, related_name='batches')
    manufacturer = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='manufactured_batches')
    batch_number = models.CharField(max_length=50, db_index=True)
    manufacturing_date = models.DateField()
    expiry_date = models.DateField(db_index=True)
    quantity_produced = models.PositiveIntegerField()
    qr_code = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=20, choices=[('active', 'Active'), ('recalled', 'Recalled'), ('expired', 'Expired')], default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class QualityTest(models.Model):
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='quality_tests')
    test_name = models.CharField(max_length=100)
    test_result = models.CharField(max_length=50, blank=True, null=True)
    report_file = models.CharField(max_length=255, blank=True, null=True)
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

class Shipment(models.Model):
    batch = models.ForeignKey(Batch, on_delete=models.RESTRICT, related_name='shipments')
    from_user = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='shipments_sent')
    to_user = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='shipments_received')
    quantity = models.PositiveIntegerField()
    shipment_date = models.DateField()
    delivery_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('in_transit', 'In Transit'), ('delivered', 'Delivered'), ('cancelled', 'Cancelled')], default='pending')
    tracking_number = models.CharField(max_length=50, blank=True, null=True)
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
    reminder_times = models.JSONField(default=list) # e.g. ["08:00", "20:00"]
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
    attachment = models.CharField(max_length=255, blank=True, null=True)

class Recall(models.Model):
    batch = models.ForeignKey(Batch, on_delete=models.RESTRICT, related_name='recalls')
    reason = models.TextField()
    issued_by_user = models.ForeignKey(User, on_delete=models.RESTRICT, related_name='recalls_issued')
    date_issued = models.DateField()
    status = models.CharField(max_length=20, choices=[('active', 'Active'), ('completed', 'Completed')], default='active')
    description = models.TextField(blank=True, null=True)

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
    report_file = models.CharField(max_length=255, blank=True, null=True)

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
    data_file = models.CharField(max_length=255, blank=True, null=True)

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
