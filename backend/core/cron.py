import threading
import time
from datetime import date, datetime
import logging

from django.contrib.auth import get_user_model
from django.utils import timezone

logger = logging.getLogger(__name__)

def check_dose_reminders_cron():
    """
    Cron Job 1: Checks active medicine schedules every minute 
    and generates user notifications for matching dose times.
    """
    try:
        from core.models import DosageSchedule, Notification
        
        now = datetime.now()
        current_time_12 = now.strftime("%I:%M %p").upper() # e.g. '08:00 PM'
        current_time_24 = now.strftime("%H:%M")             # e.g. '20:00'

        active_schedules = DosageSchedule.objects.filter(is_active=True).select_related('citizen', 'medicine')
        
        count = 0
        for sched in active_schedules:
            reminder_times = sched.reminder_times or []
            med_name = sched.medicine.name if sched.medicine else "Medicine"

            for r_time in reminder_times:
                clean_time = str(r_time).strip().upper()
                if clean_time == current_time_12 or clean_time == current_time_24:
                    # Prevent duplicate notification for the same minute
                    title = f"⏰ Medicine Dose Reminder: {med_name}"
                    already_notified = Notification.objects.filter(
                        user=sched.citizen,
                        title=title,
                        created_at__date=date.today(),
                        created_at__hour=now.hour,
                        created_at__minute=now.minute
                    ).exists()

                    if not already_notified:
                        Notification.objects.create(
                            user=sched.citizen,
                            title=title,
                            message=f"Time to take {sched.dosage} of {med_name} ({sched.frequency}). {sched.notes or ''}",
                            notification_type="dose_reminder"
                        )
                        count += 1
        if count > 0:
            logger.info(f"[CRON] Sent {count} medicine dose reminder notifications.")
    except Exception as e:
        logger.error(f"[CRON ERROR] Dose reminder job failed: {e}")


def check_expired_batches_cron():
    """
    Cron Job 2: Audits medicine expiration dates daily and alerts DGDA & Pharmacies.
    """
    try:
        from core.models import Batch, Notification
        User = get_user_model()

        today = date.today()
        expired_batches = Batch.objects.filter(expiration_date__lte=today)

        for batch in expired_batches:
            # Notify Manufacturer & DGDA Regulators
            regulators = User.objects.filter(role__in=['dgda_regulator', 'admin'])
            for reg in regulators:
                title = f"⚠️ Expired Medicine Alert: Batch {batch.batch_number}"
                if not Notification.objects.filter(user=reg, title=title).exists():
                    Notification.objects.create(
                        user=reg,
                        title=title,
                        message=f"Batch {batch.batch_number} of {batch.medicine.name} expired on {batch.expiration_date}. Disposal protocol required.",
                        notification_type="warning"
                    )
    except Exception as e:
        logger.error(f"[CRON ERROR] Expiration audit job failed: {e}")


def start_python_cron_scheduler():
    """
    Starts Python Background Cron Loop Thread
    Runs indefinitely in background thread (like node-cron in Node.js)
    """
    def cron_loop():
        logger.info("🟢 Python CronJob Scheduler started running in background...")
        print("🟢 [Python CronJob Scheduler] Started background cron loop (checking every 30s)...")
        while True:
            try:
                check_dose_reminders_cron()
                check_expired_batches_cron()
            except Exception as err:
                logger.error(f"[CRON LOOP ERROR] {err}")
            time.sleep(30) # Run check every 30 seconds

    # Run in background daemon thread
    cron_thread = threading.Thread(target=cron_loop, daemon=True)
    cron_thread.start()
