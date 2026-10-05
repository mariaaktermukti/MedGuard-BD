import os
import sys
import traceback
from pathlib import Path

# Ensure project root directory is in sys.path before Django setup
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "medguard.settings")

try:
    from django.core.wsgi import get_wsgi_application
    _django_application = get_wsgi_application()

    def app(environ, start_response):
        try:
            return _django_application(environ, start_response)
        except Exception:
            err = traceback.format_exc()
            start_response('500 Internal Server Error', [('Content-Type', 'text/plain; charset=utf-8')])
            return [err.encode('utf-8')]

except Exception:
    _init_error = traceback.format_exc()
    print("MEDGUARD STARTUP ERROR:\n", _init_error)

    def app(environ, start_response):
        start_response('200 OK', [('Content-Type', 'text/plain; charset=utf-8')])
        msg = f"MedGuard Backend Startup Traceback:\n\n{_init_error}"
        return [msg.encode('utf-8')]
