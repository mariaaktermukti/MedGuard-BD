from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Notification, QualityTest, Recall, Sale, Shipment

@receiver(post_save, sender=Recall)
def create_recall_notifications(sender, instance, created, **kwargs):
    if created or instance.status == 'active':
        sales = Sale.objects.filter(batch=instance.batch).select_related('citizen')
        shipments = Shipment.objects.filter(batch=instance.batch).select_related('to_user')

        recipients = {sale.citizen for sale in sales}
        recipients.update(shipment.to_user for shipment in shipments)

        title = f"URGENT: Drug Recall - {instance.batch.medicine.name}"
        message = (
            f"Batch {instance.batch.batch_number} of {instance.batch.medicine.name} has been recalled. "
            f"Reason: {instance.reason}. Sales have been halted and downstream partners were notified."
        )

        for citizen in recipients:
            Notification.objects.get_or_create(user=citizen, title=title, message=message)

        batch = instance.batch
        batch.status = 'recalled'
        batch.release_blocked = True
        batch.qr_activated_at = batch.qr_activated_at or timezone.now()
        batch.save(update_fields=['status', 'release_blocked', 'qr_activated_at', 'updated_at'])

        instance.progress_percent = 100 if instance.status == 'completed' else max(instance.progress_percent, 75)
        instance.notified_downstream_at = timezone.now()
        instance.save(update_fields=['progress_percent', 'notified_downstream_at'])


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
