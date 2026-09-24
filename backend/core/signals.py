# pyrefly: ignore [missing-import]
from django.db.models.signals import post_save
# pyrefly: ignore [missing-import]
from django.dispatch import receiver
# pyrefly: ignore [missing-import]
from django.utils import timezone
# pyrefly: ignore [missing-import]
from django.contrib.auth import get_user_model
User = get_user_model()

from django.db.models import Q

from .models import (
    DistributionEvent,
    DosageSchedule,
    Inventory,
    MonitoringEvent,
    Notification,
    QualityTest,
    Recall,
    Sale,
    Shipment,
    Warehouse,
)

@receiver(post_save, sender=Recall)
def create_recall_notifications(sender, instance, created, **kwargs):
    if created or instance.status == 'active':
        batch = instance.batch
        med_name = batch.medicine.name if batch.medicine else "Medicine"

        # Lock batch immediately
        batch.status = 'recalled'
        batch.release_blocked = True
        batch.qr_activated_at = batch.qr_activated_at or timezone.now()
        batch.save(update_fields=['status', 'release_blocked', 'qr_activated_at', 'updated_at'])

        # Gather all target recipients across entities
        recipients = set()

        # 1. Citizens who bought or hold dosage for this batch/medicine
        sales = Sale.objects.filter(batch=batch).select_related('citizen')
        recipients.update(sale.citizen for sale in sales if sale.citizen)
        schedules = DosageSchedule.objects.filter(medicine=batch.medicine).select_related('citizen')
        recipients.update(sched.citizen for sched in schedules if sched.citizen)

        # 2. Only the businesses that actually touched this batch, plus the regulator.
        # Alerting every pharmacy and distributor in the country about a batch they
        # never held trains people to ignore the word RECALL.
        holder_ids = set(
            Inventory.objects.filter(batch=batch, quantity__gt=0).values_list('entity_id', flat=True)
        )
        warehouse_owner_ids = set(
            Warehouse.objects.filter(id__in=holder_ids).values_list('distributor_id', flat=True)
        )
        handler_ids = set(
            Shipment.objects.filter(batch=batch).values_list('from_user_id', flat=True)
        ) | set(
            Shipment.objects.filter(batch=batch).values_list('to_user_id', flat=True)
        ) | set(
            DistributionEvent.objects.filter(batch=batch).values_list('to_user_id', flat=True)
        )

        involved = User.objects.filter(
            Q(id__in=holder_ids, role='pharmacy')
            | Q(id__in=warehouse_owner_ids)
            | Q(id__in=handler_ids)
        ).exclude(role='citizen')
        recipients.update(involved)

        # The regulator always hears about a recall.
        recipients.update(User.objects.filter(role='dgda', is_active=True))

        title = f"🚨 URGENT RECALL: {med_name} (Batch #{batch.batch_number})"
        message = (
            f"MANDATORY SAFETY HALT: Batch {batch.batch_number} of {med_name} has been RECALLED. "
            f"Reason: {instance.reason}. All sales, distribution, and consumption must stop immediately."
        )

        for user in recipients:
            Notification.objects.get_or_create(user=user, title=title, message=message)

        # 3. Create DGDA MonitoringEvent for Incident Control & Inspection Dashboard
        if not MonitoringEvent.objects.filter(batch=batch, event_type='quality_issue', status='escalated').exists():
            MonitoringEvent.objects.create(
                batch=batch,
                medicine=batch.medicine,
                manufacturer=batch.manufacturer,
                event_type='quality_issue',
                title=f"MANDATORY BATCH RECALL DIRECTIVE: {med_name} (Batch #{batch.batch_number})",
                description=f"Manufacturer {instance.issued_by_user.full_name or instance.issued_by_user.username} initiated recall for Batch {batch.batch_number}. Reason: {instance.reason}. Sales halted downstream.",
                severity='critical',
                risk_score=95,
                status='escalated',
                source='Manufacturer Recall Sentinel',
            )

        instance.progress_percent = 100 if instance.status == 'completed' else instance.progress_percent
        instance.notified_downstream_at = timezone.now()
        Recall.objects.filter(pk=instance.pk).update(progress_percent=instance.progress_percent, notified_downstream_at=instance.notified_downstream_at)


@receiver(post_save, sender=QualityTest)
def flag_batch_on_failed_quality_test(sender, instance, created, **kwargs):
    if not instance.batch_id:
        return

    failing_result = (instance.test_result or '').strip().lower()
    if instance.is_out_of_spec or failing_result in {'fail', 'failed', 'out of spec', 'out_of_spec', 'rejected', 'no-pass'}:
        batch = instance.batch
        batch.qc_status = 'failed'
        batch.release_blocked = True
        batch.save(update_fields=['qc_status', 'release_blocked', 'updated_at'])
        return

    if created and instance.batch.quality_tests.exists() and not instance.batch.quality_tests.filter(is_out_of_spec=True).exists():
        batch = instance.batch
        batch.qc_status = 'passed'
        batch.release_blocked = False
        batch.save(update_fields=['qc_status', 'release_blocked', 'updated_at'])
