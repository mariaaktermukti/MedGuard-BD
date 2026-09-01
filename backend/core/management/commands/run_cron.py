import time
from django.core.management.base import BaseCommand
from core.cron import check_dose_reminders_cron, check_expired_batches_cron


class Command(BaseCommand):
    help = 'Runs the Python CronJob Background Scheduler (equivalent to node-cron in Node.js)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🟢 [Python CronJob Worker] Scheduler started successfully!'))
        self.stdout.write(self.style.WARNING('Press Ctrl+C to stop cron worker.'))

        while True:
            try:
                self.stdout.write('[CRON TICK] Executing scheduled jobs...')
                check_dose_reminders_cron()
                check_expired_batches_cron()
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'[CRON ERROR] {e}'))

            time.sleep(30) # Tick every 30 seconds
