from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Recall, Sale, Notification

@receiver(post_save, sender=Recall)
def create_recall_notifications(sender, instance, created, **kwargs):
    if created or instance.status == 'active':
        # Find all sales of this recalled batch
        sales = Sale.objects.filter(batch=instance.batch).select_related('citizen')
        
        # Get unique citizens to avoid duplicate notifications
        citizens = set([sale.citizen for sale in sales])
        
        for citizen in citizens:
            # Check if we already notified this citizen about this specific recall
            title = f"URGENT: Drug Recall - {instance.batch.medicine.name}"
            message = f"Batch {instance.batch.batch_number} of {instance.batch.medicine.name} you purchased has been recalled. Reason: {instance.reason}. Please contact your doctor or pharmacy immediately."
            
            # Create a notification if one doesn't exist for this recall
            Notification.objects.get_or_create(
                user=citizen,
                title=title,
                message=message
            )
