"""
WSGI config for medguard project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os
import sys
from pathlib import Path

# Add project root directory to sys.path so Django can import users, core, doctor, researcher
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "medguard.settings")

import traceback

try:
    from django.core.wsgi import get_wsgi_application
    application = get_wsgi_application()

    def app(environ, start_response):
        try:
            return application(environ, start_response)
        except Exception:
            err = traceback.format_exc()
            start_response('500 Internal Server Error', [('Content-Type', 'text/plain; charset=utf-8')])
            return [err.encode('utf-8')]

except Exception:
    _init_error = traceback.format_exc()
    print("MEDGUARD WSGI STARTUP ERROR:\n", _init_error)

    def app(environ, start_response):
        start_response('200 OK', [('Content-Type', 'text/plain; charset=utf-8')])
        msg = f"MedGuard Backend WSGI Startup Traceback:\n\n{_init_error}"
        return [msg.encode('utf-8')]

    application = app



