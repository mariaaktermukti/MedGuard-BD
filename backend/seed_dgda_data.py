import os
import django
import sys
import random
from datetime import timedelta
from django.utils import timezone

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "medguard.settings")
django.setup()

from users.models import (
    CustomUser, Role, ManufacturerProfile, PharmacyProfile, DistributorProfile, 
    DGDAProfile, DoctorProfile, CitizenProfile, ResearcherProfile
)
from core.models import Medicine, Batch, MonitoringEvent, ADRReport, Recall, Complaint, QualityTest

def seed():
    print("Seeding DGDA Demo Data...")

    # 1. Ensure DGDA Officer user exists
    dgda_user, created = CustomUser.objects.get_or_create(
        username="dgda_officer",
        defaults={
            "full_name": "Dr. Shamsul Alam",
            "email": "officer@dgda.gov.bd",
            "role": Role.DGDA,
            "is_staff": True
        }
    )
    if created or not hasattr(dgda_user, 'dgda_profile'):
        dgda_user.set_password("dgda1234")
        dgda_user.save()
        DGDAProfile.objects.get_or_create(
            user=dgda_user,
            defaults={"designation": "Director of Vigilance", "department": "Pharmacovigilance & Quality Control"}
        )
    print("DGDA Officer created/verified:", dgda_user.username)

    # 2. Ensure Manufacturers exist
    m1_user, _ = CustomUser.objects.get_or_create(
        username="square_pharma",
        defaults={"full_name": "Square Pharmaceuticals Ltd.", "role": Role.MANUFACTURER}
    )
    m1_user.set_password("pass123")
    m1_user.save()
    ManufacturerProfile.objects.get_or_create(
        user=m1_user,
        defaults={
            "company_name": "Square Pharmaceuticals Ltd.",
            "registration_number": "DGDA-MFG-0012",
            "address": "Square Centre, 48 Mohakhali C/A, Dhaka-1212",
            "contact_person": "Md. Rafiqul Islam",
            "contact_phone": "+880 1711-100200",
            "website": "https://www.squarepharma.com.bd"
        }
    )

    m2_user, _ = CustomUser.objects.get_or_create(
        username="beximco_pharma",
        defaults={"full_name": "Beximco Pharmaceuticals Ltd.", "role": Role.MANUFACTURER}
    )
    m2_user.set_password("pass123")
    m2_user.save()
    ManufacturerProfile.objects.get_or_create(
        user=m2_user,
        defaults={
            "company_name": "Beximco Pharmaceuticals Ltd.",
            "registration_number": "DGDA-MFG-0089",
            "address": "19 Dhanmondi R/A, Road 7, Dhaka",
            "contact_person": "Nazmul Hassan",
            "contact_phone": "+880 1711-998877",
            "website": "https://www.beximcopeharman.com"
        }
    )

    # 3. Ensure Pharmacies exist
    p1_user, _ = CustomUser.objects.get_or_create(
        username="lazz_pharma",
        defaults={"full_name": "Lazz Pharma Kalabagan", "role": Role.PHARMACY}
    )
    p1_user.set_password("pass123")
    p1_user.save()
    PharmacyProfile.objects.get_or_create(
        user=p1_user,
        defaults={
            "pharmacy_name": "Lazz Pharma Kalabagan",
            "registration_number": "DGDA-PH-9921",
            "address": "Mirpur Road, Kalabagan, Dhaka",
            "contact_person": "Lutfar Rahman",
            "license_number": "LIC-PH-88712",
            "trust_score": 0.95
        }
    )

    p2_user, _ = CustomUser.objects.get_or_create(
        username="tampaco_pharmacy",
        defaults={"full_name": "Tamanna Pharmacy", "role": Role.PHARMACY}
    )
    p2_user.set_password("pass123")
    p2_user.save()
    PharmacyProfile.objects.get_or_create(
        user=p2_user,
        defaults={
            "pharmacy_name": "Tamanna Pharmacy",
            "registration_number": "DGDA-PH-4412",
            "address": "Station Road, Chattogram",
            "contact_person": "Jamal Uddin",
            "license_number": "LIC-PH-33411",
            "trust_score": 0.45  # High risk low trust
        }
    )

    # 3b. Ensure Distributor, Doctor, Citizen, Researcher exist
    d1_user, _ = CustomUser.objects.get_or_create(
        username="apex_distributors",
        defaults={"full_name": "Apex Pharma Logistics & Distribution", "role": Role.DISTRIBUTOR}
    )
    d1_user.set_password("pass123")
    d1_user.save()
    DistributorProfile.objects.get_or_create(
        user=d1_user,
        defaults={
            "company_name": "Apex Pharma Logistics",
            "registration_number": "DGDA-DIST-1029",
            "address": "Tejgaon Industrial Area, Dhaka",
            "contact_person": "Tariqul Islam",
            "contact_phone": "+880 1900-112233"
        }
    )

    doc1_user, _ = CustomUser.objects.get_or_create(
        username="dr_anisur",
        defaults={"full_name": "Dr. Anisur Rahman", "role": Role.DOCTOR}
    )
    doc1_user.set_password("pass123")
    doc1_user.save()
    DoctorProfile.objects.get_or_create(
        user=doc1_user,
        defaults={
            "specialization": "Clinical Pharmacology",
            "license_number": "BMDC-A-48912",
            "hospital_affiliation": "Dhaka Medical College & Hospital",
            "years_of_experience": 14
        }
    )

    cit1_user, _ = CustomUser.objects.get_or_create(
        username="tanvir_citizen",
        defaults={"full_name": "Tanvir Hossain", "role": Role.CITIZEN}
    )
    cit1_user.set_password("pass123")
    cit1_user.save()
    CitizenProfile.objects.get_or_create(
        user=cit1_user,
        defaults={
            "address": "Dhanmondi, Dhaka",
            "emergency_contact": "+880 1819-000111",
            "gender": "male"
        }
    )

    res1_user, _ = CustomUser.objects.get_or_create(
        username="prof_nusrat",
        defaults={"full_name": "Prof. Dr. Nusrat Jahan", "role": Role.RESEARCHER}
    )
    res1_user.set_password("pass123")
    res1_user.save()
    ResearcherProfile.objects.get_or_create(
        user=res1_user,
        defaults={
            "affiliation": "ICDDR,B & Dhaka University Dept of Pharmacy",
            "research_interests": "Pharmacovigilance, Antimicrobial Resistance, Drug Safety Analytics"
        }
    )

    # 4. Ensure Medicines exist
    med1, _ = Medicine.objects.get_or_create(
        product_id="MED-SQ-PAR-500",
        defaults={
            "name": "Ace 500mg",
            "generic_name": "Paracetamol",
            "category": "Analgesic",
            "dosage_form": "Tablet",
            "strength": "500mg",
            "manufacturer": m1_user,
            "regulatory_approval_number": "DAR-10293-882",
            "is_registered": True
        }
    )

    med2, _ = Medicine.objects.get_or_create(
        product_id="MED-BX-NAP-500",
        defaults={
            "name": "Napa Extra",
            "generic_name": "Paracetamol + Caffeine",
            "category": "Analgesic",
            "dosage_form": "Tablet",
            "strength": "500mg/65mg",
            "manufacturer": m2_user,
            "regulatory_approval_number": "DAR-88291-110",
            "is_registered": True
        }
    )

    med3, _ = Medicine.objects.get_or_create(
        product_id="MED-SQ-AZI-500",
        defaults={
            "name": "Zimax 500mg",
            "generic_name": "Azithromycin",
            "category": "Antibiotic",
            "dosage_form": "Capsule",
            "strength": "500mg",
            "manufacturer": m1_user,
            "regulatory_approval_number": "DAR-55412-990",
            "is_registered": True
        }
    )

    # 5. Ensure Batches exist
    batch1, _ = Batch.objects.get_or_create(
        batch_number="B2026-ACE-01",
        defaults={
            "medicine": med1,
            "manufacturer": m1_user,
            "manufacturing_date": "2026-01-10",
            "expiry_date": "2028-01-10",
            "quantity_produced": 10000,
            "qc_status": "passed",
            "status": "active"
        }
    )

    batch2, _ = Batch.objects.get_or_create(
        batch_number="B2026-NAP-09",
        defaults={
            "medicine": med2,
            "manufacturer": m2_user,
            "manufacturing_date": "2026-02-01",
            "expiry_date": "2028-02-01",
            "quantity_produced": 5000,
            "qc_status": "failed",
            "status": "recalled"
        }
    )

    # 6. Seed Monitoring Events
    monitoring_events_data = [
        {
            "event_id": "MON-2026-1049",
            "event_type": "counterfeit",
            "title": "Suspected Counterfeit Napa Extra Tablets in Chattogram Market",
            "description": "Blister packaging color and QR code hash fail validation during retail pharmacy scan. Serial number mismatch detected.",
            "medicine": med2,
            "batch": batch2,
            "manufacturer": m2_user,
            "pharmacy": p2_user,
            "location": "Chattogram",
            "severity": "critical",
            "risk_score": 88,
            "risk_factors": [
                {"factor": "Counterfeit QR Discrepancy", "points": 35},
                {"factor": "Failed QC Test", "points": 25},
                {"factor": "Low Pharmacy Trust Score", "points": 28}
            ],
            "status": "new",
            "source": "Automated QR Sentinel"
        },
        {
            "event_id": "MON-2026-1048",
            "event_type": "adr",
            "title": "Cluster of Severe Allergic Reactions Reported in Dhaka",
            "description": "4 citizens submitted adverse reaction reports within 12 hours following ingestion of Zimax 500mg Batch #B2026-ZIM-03.",
            "medicine": med3,
            "batch": None,
            "manufacturer": m1_user,
            "pharmacy": p1_user,
            "location": "Dhaka",
            "severity": "critical",
            "risk_score": 82,
            "risk_factors": [
                {"factor": "ADR Spike (4 Patients)", "points": 30},
                {"factor": "Critical Severity Impact", "points": 25},
                {"factor": "Antibiotic Cluster Signal", "points": 27}
            ],
            "status": "under_review",
            "source": "ADR Reporting Portal"
        },
        {
            "event_id": "MON-2026-1047",
            "event_type": "price_anomaly",
            "title": "Unusual Price Inflation of Essential Antibiotics in Rajshahi",
            "description": "Retail pharmacy selling Azithromycin 500mg at 180% of DGDA Maximum Retail Price (MRP).",
            "medicine": med3,
            "batch": None,
            "manufacturer": m1_user,
            "pharmacy": p2_user,
            "location": "Rajshahi",
            "severity": "high",
            "risk_score": 64,
            "risk_factors": [
                {"factor": "Price Deviation +80%", "points": 30},
                {"factor": "Essential Drug MRP Violation", "points": 20},
                {"factor": "Pharmacy Violation History", "points": 14}
            ],
            "status": "new",
            "source": "Citizen Complaint Hotline"
        },
        {
            "event_id": "MON-2026-1046",
            "event_type": "supply_chain_anomaly",
            "title": "Unexplained Stock Discrepancy at Regional Depot",
            "description": "2,000 units of Ace 500mg recorded as dispatched but not logged by downstream distributor within expected transit window.",
            "medicine": med1,
            "batch": batch1,
            "manufacturer": m1_user,
            "pharmacy": None,
            "location": "Sylhet",
            "severity": "medium",
            "risk_score": 45,
            "risk_factors": [
                {"factor": "Transit Window Breach", "points": 20},
                {"factor": "Supply Chain Discrepancy", "points": 15},
                {"factor": "Medium Severity Base", "points": 10}
            ],
            "status": "escalated",
            "source": "Supply Chain Audit Engine"
        },
        {
            "event_id": "MON-2026-1045",
            "event_type": "expired",
            "title": "Expired Batch Offered for Sale in Retail Store",
            "description": "Routine physical inspection uncovered 45 boxes of expired Paracetamol past shelf-life expiry date.",
            "medicine": med1,
            "batch": batch1,
            "manufacturer": m1_user,
            "pharmacy": p2_user,
            "location": "Khulna",
            "severity": "low",
            "risk_score": 30,
            "risk_factors": [
                {"factor": "Expired Inventory On Shelf", "points": 20},
                {"factor": "Low Severity Impact", "points": 10}
            ],
            "status": "resolved",
            "source": "District Inspector"
        }
    ]

    for data in monitoring_events_data:
        ev, created_ev = MonitoringEvent.objects.get_or_create(
            event_id=data["event_id"],
            defaults=data
        )
        if not created_ev:
            for k, v in data.items():
                setattr(ev, k, v)
            ev.save()

    print(f"Seeded {len(monitoring_events_data)} Monitoring Events successfully!")

seed()
