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

from django.core.wsgi import get_wsgi_application

application = get_wsgi_application()

# Vercel Serverless Function entrypoint
app = application


