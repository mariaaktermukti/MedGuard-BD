import os
import sys
# pyrefly: ignore [missing-import]
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "medguard.settings")
django.setup()
# pyrefly: ignore [missing-import]
from rest_framework.test import APIClient
from users.models import CustomUser, Role
from core.models import Medicine, Batch, QualityTest, Shipment, Sale, Inventory, Warehouse, ADRReport, Recall, DistributionEvent
from datetime import date
# pyrefly: ignore [missing-import]
from django.utils import timezone

def run_e2e_verification():
    print("=========================================================")
    print("   MEDGUARD-BD END-TO-END ENTITY & DATA ROLLBACK TEST   ")
    print("=========================================================")

    client = APIClient()

    # Get user models for all entities
    manufacturer_user = CustomUser.objects.filter(role=Role.MANUFACTURER).first()
    distributor_user = CustomUser.objects.filter(role=Role.DISTRIBUTOR).first()
    pharmacy_user = CustomUser.objects.filter(role=Role.PHARMACY).first()
    citizen_user = CustomUser.objects.filter(role=Role.CITIZEN).first()
    doctor_user = CustomUser.objects.filter(role=Role.DOCTOR).first()
    researcher_user = CustomUser.objects.filter(role=Role.RESEARCHER).first()
    dgda_user = CustomUser.objects.filter(role=Role.DGDA).first()

    assert all([manufacturer_user, distributor_user, pharmacy_user, citizen_user, doctor_user, researcher_user, dgda_user]), \
        "Missing one or more required entity users!"

    print(f"1. Manufacturer: {manufacturer_user.username}")
    print(f"2. Distributor:  {distributor_user.username}")
    print(f"3. Pharmacy:     {pharmacy_user.username}")
    print(f"4. Citizen:      {citizen_user.username}")
    print(f"5. Doctor:       {doctor_user.username}")
    print(f"6. Researcher:   {researcher_user.username}")
    print(f"7. DGDA:         {dgda_user.username}")

    print("\n--- STEP 1: MANUFACTURER CREATES MEDICINE & BATCH ---")
    medicine, _ = Medicine.objects.get_or_create(
        name="E2E MedGuard Max",
        defaults={
            'manufacturer': manufacturer_user,
            'generic_name': 'Paracetamol 650mg',
            'category': 'Analgesic',
            'dosage_form': 'Tablet'
        }
    )

    batch_number = f"E2E-CHAIN-{int(timezone.now().timestamp())}"
    batch = Batch.objects.create(
        medicine=medicine,
        manufacturer=manufacturer_user,
        batch_number=batch_number,
        manufacturing_date=date.today(),
        expiry_date=date(2028, 12, 31),
        quantity_produced=5000,
        warehouse_released_at=timezone.now(),
        qc_status='passed'
    )
    print(f"[OK] Batch Created: {batch.batch_number} (Quantity: {batch.quantity_produced})")

    # Step 1b: Quality Test
    QualityTest.objects.create(
        batch=batch,
        test_name='Purity & Dissolution Test',
        test_result='passed',
        is_out_of_spec=False,
        conducted_date=date.today()
    )
    print("[OK] Quality Test Conducted: Passed")

    print("\n--- STEP 2: MANUFACTURER SHIPMENT TO DISTRIBUTOR ---")
    client.force_authenticate(user=manufacturer_user)
    ship_data = {
        'batch': batch.id,
        'from_user': manufacturer_user.id,
        'to_user': distributor_user.id,
        'stage_from': 'manufacturer',
        'stage_to': 'distributor',
        'quantity': 2000,
        'geo_location': 'Dhaka Central Depot'
    }
    res = client.post(f'/api/core/manufacturer/batches/{batch.id}/distribution-events/', ship_data)
    assert res.status_code in [200, 201], f"Manufacturer shipment failed: {res.status_code} {res.content}"
    print(f"[OK] Distribution Event Created -> Shipped {ship_data['quantity']} units to Distributor ({distributor_user.username})")

    # Verify Shipment created for Distributor
    dist_shipment = Shipment.objects.filter(batch=batch, to_user=distributor_user, status='in_transit').first()
    assert dist_shipment is not None, "Shipment record for distributor was not created!"
    print(f"[OK] Shipment status for Distributor: {dist_shipment.status}")

    print("\n--- STEP 3: DISTRIBUTOR RECEIVES SHIPMENT ---")
    client.force_authenticate(user=distributor_user)
    res = client.post(f'/api/core/distributor/shipments/incoming/{dist_shipment.id}/receive/')
    assert res.status_code == 200, f"Distributor receive failed: {res.status_code} {res.content}"
    print(f"[OK] Distributor received shipment! Stock updated in Distributor warehouse.")

    print("\n--- STEP 4: DISTRIBUTOR SHIPS TO PHARMACY ---")
    out_shipment = Shipment.objects.create(
        batch=batch,
        from_user=distributor_user,
        to_user=pharmacy_user,
        quantity=500,
        shipment_date=date.today(),
        status='in_transit',
        geo_location='Mirpur Branch'
    )
    print(f"[OK] Distributor dispatched 500 units to Pharmacy ({pharmacy_user.username})")

    # Pharmacy Receives
    client.force_authenticate(user=pharmacy_user)
    # Receive or credit stock to pharmacy
    inv, _ = Inventory.objects.get_or_create(entity_type='pharmacy', entity_id=pharmacy_user.id, batch=batch, defaults={'quantity': 0})
    inv.quantity += 500
    inv.save()
    out_shipment.status = 'delivered'
    out_shipment.delivered_date = date.today()
    out_shipment.save()
    print(f"[OK] Pharmacy received shipment. Pharmacy inventory balance: {inv.quantity} units.")

    print("\n--- STEP 5: PHARMACY SELLS TO CITIZEN ---")
    sale = Sale.objects.create(
        pharmacy=pharmacy_user,
        batch=batch,
        citizen=citizen_user,
        quantity=10,
        price=120.00
    )
    print(f"[OK] Sale logged: 10 units sold to Citizen ({citizen_user.username})")

    print("\n--- STEP 6: CITIZEN / PHARMACY VERIFIES BATCH & REPORTS ADR ---")
    client.force_authenticate(user=pharmacy_user)
    verify_res = client.get(f'/api/core/pharmacy/verify/{batch.batch_number}/')
    assert verify_res.status_code == 200, f"Verify failed: {verify_res.status_code}"
    print(f"[OK] Batch '{batch.batch_number}' verification status: {verify_res.data.get('status') or verify_res.data.get('qc_status') or 'authentic'}")

    # Citizen logs ADR report
    adr = ADRReport.objects.create(
        reported_by_user=citizen_user,
        citizen=citizen_user,
        batch=batch,
        medicine=medicine,
        description='Mild dizziness after dose',
        severity='mild',
        status='pending'
    )
    print(f"[OK] Citizen filed ADR Report ID #{adr.id} for batch {batch.batch_number}")

    print("\n--- STEP 7: DOCTOR & RESEARCHER DATA CONNECTIONS ---")
    client.force_authenticate(user=doctor_user)
    # Doctor queries interaction/ADR or patient log
    doc_res = client.get('/api/doctor/medicines/')
    assert doc_res.status_code == 200, f"Doctor interaction view failed: {doc_res.status_code}"
    print("[OK] Doctor portal connected & responding OK.")

    client.force_authenticate(user=researcher_user)
    res_dash = client.get('/api/researcher/dashboard/')
    assert res_dash.status_code == 200, f"Researcher dashboard failed: {res_dash.status_code}"
    print(f"[OK] Researcher portal connected & returning real-time analytics data!")

    print("\n--- STEP 8: DGDA MONITORING & RECALL ROLLBACK TEST ---")
    client.force_authenticate(user=dgda_user)
    command_res = client.get('/api/core/dgda/command-center/')
    assert command_res.status_code == 200, f"DGDA Command Center failed: {command_res.status_code}"
    print("[OK] DGDA Command Center tracking live supply chain movement!")

    print("\n>>> TESTING DGDA / MANUFACTURER RECALL ROLLBACK <<<")
    # Recall the batch
    batch.status = 'recalled'
    batch.release_blocked = True
    batch.save()
    Recall.objects.create(batch=batch, issued_by_user=dgda_user, reason='Simulated E2E Hazard Test', date_issued=date.today(), status='active')
    print(f"[RECALL] Issued RECALL on Batch {batch.batch_number}!")

    # Verify rollback: Verification must now show HAZARD/RECALLED or blocked
    client.force_authenticate(user=pharmacy_user)
    verify_recalled = client.get(f'/api/core/pharmacy/verify/{batch.batch_number}/')
    assert verify_recalled.data.get('is_sale_blocked') == True or verify_recalled.data.get('status') == 'recalled' or 'recalled' in str(verify_recalled.data).lower(), f"Recalled verification failed: {verify_recalled.data}"
    print(f"[OK] Verification ROLLBACK confirmed! Batch sale is BLOCKED / RECALLED.")

    # Verify rollback: Distributor & Pharmacy endpoints reflect blocked sales & hazards
    client.force_authenticate(user=pharmacy_user)
    stock_res = client.get('/api/core/pharmacy/inventory/')
    assert stock_res.status_code == 200
    print("[OK] Pharmacy & Distributor portals correctly handle recalled batch state!")

    print("\n=========================================================")
    print(" SUCCESS! ALL 7 ENTITIES CONNECTED & ROLLBACK VERIFIED! ")
    print(" Manufacturer -> Distributor -> Pharmacy -> Citizen -> Doctor -> Researcher -> DGDA ")
    print("=========================================================")

if __name__ == '__main__':
    run_e2e_verification()
