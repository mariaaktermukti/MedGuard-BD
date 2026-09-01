import os
from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        import core.signals

        # Start Python CronJob Scheduler in main server process
        if os.environ.get('RUN_MAIN') == 'true':
            from core.cron import start_python_cron_scheduler
            start_python_cron_scheduler()
