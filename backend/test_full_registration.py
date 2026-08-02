import os
import django
import requests

# Set up Django environment to check the database directly
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medguard.settings')
django.setup()

from users.models import CustomUser, CitizenProfile, ManufacturerProfile, PharmacyProfile

print("=== Starting Registration Test ===")

url = "http://127.0.0.1:8000/api/users/register/"

users_to_create = [
    {
        "username": "citizentest", "email": "citizen@test.com", "password": "password123",
        "full_name": "Test Citizen", "phone": "01700000001", "role": "citizen"
    },
    {
        "username": "mfgtest", "email": "mfg@test.com", "password": "password123",
        "full_name": "Test Manufacturer", "phone": "01700000002", "role": "manufacturer"
    },
    {
        "username": "pharmacytest", "email": "pharmacy@test.com", "password": "password123",
        "full_name": "Test Pharmacy", "phone": "01700000003", "role": "pharmacy"
    }
]

for user_data in users_to_create:
    try:
        response = requests.post(url, json=user_data)
        if response.status_code == 201:
            print(f"Successfully registered via API: {user_data['username']} ({user_data['role']})")
        else:
            print(f"Failed to register {user_data['username']}: {response.text}")
    except Exception as e:
        print(f"Error during request: {e}")

print("\n=== Verifying Database Entities in MySQL ===")

print(f"Total Users in DB: {CustomUser.objects.count()}")
print(f"Total Citizen Profiles: {CitizenProfile.objects.count()}")
print(f"Total Manufacturer Profiles: {ManufacturerProfile.objects.count()}")
print(f"Total Pharmacy Profiles: {PharmacyProfile.objects.count()}")

# Print specifics to prove it works
for mfg in ManufacturerProfile.objects.all():
    print(f"Manufacturer Entity -> User: {mfg.user.username}, Company: {mfg.company_name}, Reg Num: {mfg.registration_number}")
