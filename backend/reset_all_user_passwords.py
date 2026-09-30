import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "medguard.settings")
django.setup()

from users.models import CustomUser, Role, PharmacyProfile

def reset_passwords():
    print("Resetting all user passwords to 'password123'...", flush=True)

    users = CustomUser.objects.all()
    count = 0
    for u in users:
        u.set_password("password123")
        u.is_active = True
        u.save()
        count += 1
        print(f"[{count}] Updated {u.username} (Role: {u.role}) -> password123", flush=True)

    # Ensure pharmacytest user exists and has profile
    pharmacy_user, created = CustomUser.objects.get_or_create(
        username="pharmacytest",
        defaults={
            "full_name": "Central Model Pharmacy",
            "email": "pharmacytest@medguard.bd",
            "role": Role.PHARMACY,
            "is_active": True
        }
    )
    pharmacy_user.set_password("password123")
    pharmacy_user.is_active = True
    pharmacy_user.save()

    PharmacyProfile.objects.get_or_create(
        user=pharmacy_user,
        defaults={
            "pharmacy_name": "Central Model Pharmacy",
            "registration_number": "REG-LIC-PH-1002",
            "license_number": "LIC-PH-1002",
            "address": "Shahbagh, Dhaka",
            "trust_score": 0.95
        }
    )

    print(f"\nSUCCESS! Reset passwords for {count} users. 'pharmacytest' / 'password123' is now ACTIVE and ready!", flush=True)

if __name__ == "__main__":
    reset_passwords()
