import os
import sys

# Ensure backend root is on Python sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from medguard.wsgi import app
