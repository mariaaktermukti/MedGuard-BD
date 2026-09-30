import os
import sys
import django
import random
from datetime import datetime, date, timedelta

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "medguard.settings")
django.setup()

from users.models import CustomUser, Role, PharmacyProfile, DistributorProfile
from core.models import (
    Medicine, Batch, Inventory, Sale, MonitoringEvent, Complaint, 
    DemandForecast, Shipment, DistributionEvent
)

def seed_pharmacy_portal():
    print("Seeding Complete Pharmacy Portal Data...", flush=True)

    # 1. Ensure Pharmacy users exist
    pharmacies_def = [
        {"username": "lazz_pharma", "name": "Lazz Pharma Kalabagan", "lic": "LIC-PH-9921", "trust": 0.96, "addr": "Mirpur Road, Kalabagan, Dhaka"},
        {"username": "pharmacytest", "name": "Central Model Pharmacy", "lic": "LIC-PH-1002", "trust": 0.94, "addr": "Shahbagh, Dhaka"},
        {"username": "tampaco_pharmacy", "name": "Tamanna Pharmacy", "lic": "LIC-PH-4412", "trust": 0.78, "addr": "Station Road, Chattogram"},
        {"username": "tampaco_pharma", "name": "Tamanna Medicine Corner", "lic": "LIC-PH-4415", "trust": 0.85, "addr": "Zindabazar, Sylhet"}
    ]

    pharmacy_users = []
    for info in pharmacies_def:
        user, _ = CustomUser.objects.get_or_create(
            username=info["username"],
            defaults={"full_name": info["name"], "role": Role.PHARMACY}
        )
        user.set_password("pass123")
        user.save()
        PharmacyProfile.objects.update_or_create(
            user=user,
            defaults={
                "pharmacy_name": info["name"],
                "registration_number": f"REG-{info['lic']}",
                "license_number": info["lic"],
                "address": info["addr"],
                "trust_score": info["trust"]
            }
        )
        pharmacy_users.append(user)

    # 2. Get Citizen user for sales
    citizen_user = CustomUser.objects.filter(role=Role.CITIZEN).first()
    if not citizen_user:
        citizen_user, _ = CustomUser.objects.get_or_create(
            username="tanvir_citizen",
            defaults={"full_name": "Tanvir Hossain", "role": Role.CITIZEN}
        )
        citizen_user.set_password("pass123")
        citizen_user.save()

    # 3. Get Active Batches
    active_batches = list(Batch.objects.filter(status='active'))
    if len(active_batches) < 5:
        active_batches = list(Batch.objects.all()[:20])

    # 4. Populate Inventory for each Pharmacy
    print("Populating Pharmacy Inventories...", flush=True)
    inv_count = 0
    for ph_user in pharmacy_users:
        ph_id = ph_user.id

        # Add 10-15 inventory items per pharmacy
        selected_batches = random.sample(active_batches, min(len(active_batches), 15))
        for batch in selected_batches:
            qty = random.randint(150, 1200)
            inv, created = Inventory.objects.update_or_create(
                batch=batch,
                entity_type='pharmacy',
                entity_id=ph_id,
                defaults={"quantity": qty}
            )
            inv_count += 1

    print(f"Populated {inv_count} Pharmacy Inventory items.", flush=True)

    # 5. Populate Sales History for each Pharmacy
    print("Populating Pharmacy Sales History...", flush=True)
    sales_count = 0
    payment_methods = ['cash', 'card', 'mobile']

    for ph_user in pharmacy_users:
        ph_id = ph_user.id
        inv_items = list(Inventory.objects.filter(entity_type='pharmacy', entity_id=ph_id))
        
        if not inv_items:
            continue

        # Create 20 sales records over the last 30 days
        for i in range(20):
            inv = random.choice(inv_items)
            batch = inv.batch
            qty_sold = random.randint(1, 5) * 10
            unit_price = random.choice([5.0, 10.0, 15.0, 25.0, 45.0, 60.0, 120.0])
            total_price = qty_sold * unit_price

            s = Sale.objects.create(
                pharmacy=ph_user,
                batch=batch,
                citizen=citizen_user,
                quantity=qty_sold,
                price=total_price,
                payment_method=random.choice(payment_methods)
            )
            # Adjust sale timestamp backwards
            past_days = random.randint(0, 25)
            past_time = datetime.now() - timedelta(days=past_days, hours=random.randint(1, 12))
            Sale.objects.filter(id=s.id).update(sale_date=past_time)
            sales_count += 1

    print(f"Populated {sales_count} Pharmacy Sales records.", flush=True)

    # 6. Populate Complaints for Pharmacy
    print("Populating Pharmacy Complaints...", flush=True)
    complaints_data = [
        {"text": "Pharmacy staff charged slightly above standard retail price for Azithromycin syrup.", "status": "resolved", "res": "Overcharge refunded and staff cautioned."},
        {"text": "Delay in receiving prescription refill during peak evening hours.", "status": "pending", "res": None},
        {"text": "Box packaging was slightly damaged upon delivery.", "status": "resolved", "res": "Replacement unit issued immediately with apology voucher."},
        {"text": "Requested clarification on batch expiration date verification.", "status": "resolved", "res": "DDP QR code scanned and verified active shelf life."}
    ]

    comp_count = 0
    for ph_user in pharmacy_users:
        for item in complaints_data:
            c, created = Complaint.objects.get_or_create(
                citizen=citizen_user,
                pharmacy=ph_user,
                complaint_text=item["text"],
                defaults={
                    "status": item["status"],
                    "resolution_text": item["res"]
                }
            )
            if created:
                comp_count += 1

    print(f"Populated {comp_count} Complaints.", flush=True)

    # 7. Populate Monitoring Alerts for Pharmacy
    print("Populating Pharmacy Safety Alerts & Monitoring Events...", flush=True)
    alert_count = 0
    if active_batches:
        sample_batch = active_batches[0]
        sample_med = sample_batch.medicine
        for ph_user in pharmacy_users:
            profile_addr = getattr(getattr(ph_user, 'pharmacy_profile', None), 'address', 'Dhaka')
            ev, created = MonitoringEvent.objects.get_or_create(
                event_id=f"MON-PHR-{ph_user.username[:6].upper()}-01",
                defaults={
                    "event_type": "counterfeit",
                    "title": "Suspected Counterfeit Batch Packaging Signal Alert",
                    "description": "Outer QR seal verification mismatch reported by nearby retail scanner node.",
                    "medicine": sample_med,
                    "batch": sample_batch,
                    "pharmacy": ph_user,
                    "severity": "critical",
                    "status": "new",
                    "location": profile_addr
                }
            )
            if created:
                alert_count += 1

    print(f"Populated {alert_count} Pharmacy Alerts.", flush=True)

    # 8. Populate Demand Forecasts for Pharmacy Regions
    print("Populating Regional Demand Forecasts...", flush=True)
    regions = ["Dhaka Division", "Chattogram Division", "Sylhet Division", "Khulna Division", "Barishal Division", "Rangpur Division", "Mymensingh Division"]
    admin_user = CustomUser.objects.filter(role=Role.DGDA).first() or pharmacy_users[0]

    for reg in regions:
        DemandForecast.objects.get_or_create(
            region=reg,
            forecast_date=date.today() + timedelta(days=30),
            defaults={
                "predicted_demand": random.randint(25000, 85000),
                "confidence_score": 0.92,
                "seasonal_signal": "Monsoon Seasonal Flu Spike & Anti-allergy Surge",
                "created_by": admin_user,
                "notes": "Historical sales trend & regional epidemic surveillance projection."
            }
        )

    print("\nSUCCESS! Complete Pharmacy Portal data seeded for all features!", flush=True)

if __name__ == "__main__":
    seed_pharmacy_portal()
