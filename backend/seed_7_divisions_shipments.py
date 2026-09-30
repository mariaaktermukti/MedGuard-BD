import os
import sys
import django
from datetime import date, timedelta

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "medguard.settings")
django.setup()

from users.models import CustomUser, Role
from core.models import Batch, DistributionEvent, Shipment

def seed_shipments():
    print("Seeding Outbound Distribution & Shipments to 7 Divisions (excluding Rajshahi)...", flush=True)

    # 7 Divisions (EXCLUDING Rajshahi)
    divisions_7 = [
        {"location": "Dhaka Division", "recipient_name": "Apex Logistics Depot (Dhaka)", "qty": 5000, "note": "Priority Dispatch - Central Hospital Depot, Dhaka"},
        {"location": "Chattogram Division", "recipient_name": "Port City Pharma Depot (Chattogram)", "qty": 4500, "note": "Cold-Chain Insulated Transit - Agrabad, Chattogram"},
        {"location": "Sylhet Division", "recipient_name": "Surma Pharma Distro (Sylhet)", "qty": 3000, "note": "Express Air Freight Shipment - Zindabazar, Sylhet"},
        {"location": "Khulna Division", "recipient_name": "South-West Medical Depot (Khulna)", "qty": 3500, "note": "Regional Hub Dispatch - KDA Avenue, Khulna"},
        {"location": "Barishal Division", "recipient_name": "Delta Healthcare Distribution (Barishal)", "qty": 2500, "note": "Riverine Marine Parcel Transit - Sadar, Barishal"},
        {"location": "Rangpur Division", "recipient_name": "North-Bend Pharma Depot (Rangpur)", "qty": 4000, "note": "Highway Cargo Transport - Station Road, Rangpur"},
        {"location": "Mymensingh Division", "recipient_name": "Greater Mymensingh Depot", "qty": 2800, "note": "Direct Institutional Supply - Medical College Road, Mymensingh"}
    ]

    all_mfgs = CustomUser.objects.filter(role=Role.MANUFACTURER)
    distributor_user = CustomUser.objects.filter(role=Role.DISTRIBUTOR).first()
    pharmacy_user = CustomUser.objects.filter(role=Role.PHARMACY).first()

    total_events_created = 0
    total_shipments_created = 0

    for mfg in all_mfgs:
        # Find active batches for this manufacturer
        mfg_batches = list(Batch.objects.filter(manufacturer=mfg, status='active'))
        if not mfg_batches:
            # Fallback: get any active batch
            mfg_batches = list(Batch.objects.filter(status='active'))
        
        if not mfg_batches:
            print(f"Skipping {mfg.username} (no active batches found)", flush=True)
            continue

        # Choose recipient
        to_user = distributor_user or pharmacy_user or mfg

        for idx, div in enumerate(divisions_7):
            batch = mfg_batches[idx % len(mfg_batches)]
            
            # Check if event already exists for this mfg and location
            existing_ev = DistributionEvent.objects.filter(
                from_user=mfg,
                geo_location=div["location"],
                batch=batch
            ).first()

            if not existing_ev:
                event = DistributionEvent.objects.create(
                    batch=batch,
                    from_user=mfg,
                    to_user=to_user,
                    stage_from="manufacturer",
                    stage_to="distributor" if distributor_user else "pharmacy",
                    quantity=div["qty"],
                    geo_location=div["location"],
                    notes=f"{div['note']} | Recipient: {div['recipient_name']}"
                )
                total_events_created += 1

                # Create corresponding Shipment record
                Shipment.objects.create(
                    batch=batch,
                    from_user=mfg,
                    to_user=to_user,
                    quantity=div["qty"],
                    shipment_date=date.today() - timedelta(days=idx + 1),
                    delivery_date=date.today() - timedelta(days=idx),
                    status="delivered",
                    tracking_number=f"TRK-2026-DIV{idx+1:02d}",
                    geo_location=div["location"]
                )
                total_shipments_created += 1

        print(f"[SUCCESS] {mfg.username} ({mfg.full_name or 'Manufacturer'}) has 7 active division shipments!", flush=True)

    print(f"\nDONE! Created {total_events_created} Distribution Events and {total_shipments_created} Shipments for 7 Divisions.", flush=True)

if __name__ == "__main__":
    seed_shipments()
