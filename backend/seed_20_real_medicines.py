import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "medguard.settings")
django.setup()

from users.models import CustomUser, Role, ManufacturerProfile
from core.models import Medicine, Batch

def seed_20_real_medicines():
    print("Starting registration of 20 real medicines...", flush=True)

    # Manufacturers definition
    manufacturers_def = {
        "square_pharma": {
            "full_name": "Square Pharmaceuticals Ltd.",
            "reg": "DGDA-MFG-0012",
            "address": "Square Centre, 48 Mohakhali C/A, Dhaka-1212",
            "contact_person": "Md. Rafiqul Islam",
            "contact_phone": "+880 1711-100200",
            "website": "https://www.squarepharma.com.bd"
        },
        "beximco_pharma": {
            "full_name": "Beximco Pharmaceuticals Ltd.",
            "reg": "DGDA-MFG-0089",
            "address": "19 Dhanmondi R/A, Road 7, Dhaka-1205",
            "contact_person": "Nazmul Hassan",
            "contact_phone": "+880 1711-998877",
            "website": "https://www.beximcopharma.com"
        },
        "incepta_pharma": {
            "full_name": "Incepta Pharmaceuticals Ltd.",
            "reg": "DGDA-MFG-0104",
            "address": "40 Shahid Tajuddin Sarani, Tejgaon, Dhaka-1208",
            "contact_person": "Abdul Muktadir",
            "contact_phone": "+880 1713-001122",
            "website": "https://www.inceptapharma.com"
        },
        "renata_pharma": {
            "full_name": "Renata Limited",
            "reg": "DGDA-MFG-0045",
            "address": "Plot # 1, Milk Vita Road, Section-7, Mirpur, Dhaka",
            "contact_person": "Syed S. Kaiser Kabir",
            "contact_phone": "+880 1711-445566",
            "website": "https://renata-ltd.com"
        },
        "acme_pharma": {
            "full_name": "The ACME Laboratories Ltd.",
            "reg": "DGDA-MFG-0023",
            "address": "Court De La ACME, 1/4 Kallayanpur, Mirpur Road, Dhaka",
            "contact_person": "Mizanur Rahman Sinha",
            "contact_phone": "+880 1711-332211",
            "website": "https://www.acmeglobal.com"
        },
        "healthcare_pharma": {
            "full_name": "Healthcare Pharmaceuticals Ltd.",
            "reg": "DGDA-MFG-0150",
            "address": "Nasir Trade Centre, 89 Bir Uttam C.R. Datta Road, Dhaka",
            "contact_person": "Halimuzzaman",
            "contact_phone": "+880 1711-778899",
            "website": "https://www.hplbd.com"
        }
    }

    # Ensure Manufacturer Users exist
    mfg_users = {}
    for username, info in manufacturers_def.items():
        user, _ = CustomUser.objects.get_or_create(
            username=username,
            defaults={"full_name": info["full_name"], "role": Role.MANUFACTURER}
        )
        user.set_password("pass123")
        user.save()
        ManufacturerProfile.objects.get_or_create(
            user=user,
            defaults={
                "company_name": info["full_name"],
                "registration_number": info["reg"],
                "address": info["address"],
                "contact_person": info["contact_person"],
                "contact_phone": info["contact_phone"],
                "website": info["website"]
            }
        )
        mfg_users[username] = user

    all_mfgs = list(CustomUser.objects.filter(role=Role.MANUFACTURER))

    # 20 Authentic Bangladeshi Medicines
    real_medicines_data = [
        {
            "product_id": "MED-SQ-ACE-500",
            "name": "Ace 500mg",
            "generic_name": "Paracetamol",
            "category": "Analgesic & Antipyretic",
            "dosage_form": "Tablet",
            "strength": "500 mg",
            "formulation": "Paracetamol BP 500 mg",
            "packaging": "10 x 10 Blister Pack",
            "manufacturer_key": "square_pharma",
            "regulatory_approval_number": "DAR-023-0102-05",
            "description": "Fast relief from fever, headache, body ache, and mild to moderate pain."
        },
        {
            "product_id": "MED-BX-NAP-500",
            "name": "Napa Extra",
            "generic_name": "Paracetamol + Caffeine",
            "category": "Analgesic",
            "dosage_form": "Tablet",
            "strength": "500 mg + 65 mg",
            "formulation": "Paracetamol BP 500 mg + Caffeine BP 65 mg",
            "packaging": "10 x 10 Blister Pack",
            "manufacturer_key": "beximco_pharma",
            "regulatory_approval_number": "DAR-016-0452-12",
            "description": "Enhanced combination therapy for severe headache, migraine, and musculoskeletal pain."
        },
        {
            "product_id": "MED-SQ-SEC-020",
            "name": "Seclo 20mg",
            "generic_name": "Omeprazole",
            "category": "Anti-ulcerant",
            "dosage_form": "Capsule",
            "strength": "20 mg",
            "formulation": "Omeprazole BP 20 mg (Enteric Coated Pellets)",
            "packaging": "6 x 10 Aluminium Strip",
            "manufacturer_key": "square_pharma",
            "regulatory_approval_number": "DAR-023-0219-08",
            "description": "Proton pump inhibitor indicated for GERD, gastric ulcer, and hyperacidity relief."
        },
        {
            "product_id": "MED-HC-SER-020",
            "name": "Sergel 20mg",
            "generic_name": "Esomeprazole",
            "category": "Anti-ulcerant",
            "dosage_form": "Capsule",
            "strength": "20 mg",
            "formulation": "Esomeprazole Magnesium Trihydrate USP 20 mg",
            "packaging": "5 x 10 Alu-Alu Blister",
            "manufacturer_key": "healthcare_pharma",
            "regulatory_approval_number": "DAR-088-0341-15",
            "description": "Effective treatment for gastroesophageal reflux disease (GERD) and erosive esophagitis."
        },
        {
            "product_id": "MED-IN-PAN-020",
            "name": "Pantonix 20mg",
            "generic_name": "Pantoprazole",
            "category": "Anti-ulcerant",
            "dosage_form": "Tablet",
            "strength": "20 mg",
            "formulation": "Pantoprazole Sodium USP 20 mg",
            "packaging": "5 x 10 Blister Pack",
            "manufacturer_key": "incepta_pharma",
            "regulatory_approval_number": "DAR-051-0198-10",
            "description": "Reduces gastric acid secretion and promotes ulcer healing in peptic disease."
        },
        {
            "product_id": "MED-SQ-ZIM-500",
            "name": "Zimax 500mg",
            "generic_name": "Azithromycin",
            "category": "Antibiotic",
            "dosage_form": "Tablet",
            "strength": "500 mg",
            "formulation": "Azithromycin Dihydrate USP 500 mg",
            "packaging": "3 x 6 Blister Pack",
            "manufacturer_key": "square_pharma",
            "regulatory_approval_number": "DAR-023-0512-14",
            "description": "Broad-spectrum macrolide antibiotic for upper and lower respiratory tract infections."
        },
        {
            "product_id": "MED-SQ-CIP-500",
            "name": "Ciprocin 500mg",
            "generic_name": "Ciprofloxacin",
            "category": "Antibiotic",
            "dosage_form": "Tablet",
            "strength": "500 mg",
            "formulation": "Ciprofloxacin Hydrochloride USP 500 mg",
            "packaging": "2 x 10 Blister Pack",
            "manufacturer_key": "square_pharma",
            "regulatory_approval_number": "DAR-023-0188-06",
            "description": "Fluoroquinolone antibiotic used for urinary tract, skin, and enteric infections."
        },
        {
            "product_id": "MED-SQ-ALA-010",
            "name": "Alatrol 10mg",
            "generic_name": "Cetirizine Hydrochloride",
            "category": "Antihistamine",
            "dosage_form": "Tablet",
            "strength": "10 mg",
            "formulation": "Cetirizine Dihydrochloride BP 10 mg",
            "packaging": "10 x 10 Blister Pack",
            "manufacturer_key": "square_pharma",
            "regulatory_approval_number": "DAR-023-0301-07",
            "description": "Second-generation antihistamine for seasonal allergic rhinitis, sneezing, and skin allergy."
        },
        {
            "product_id": "MED-SQ-FEX-120",
            "name": "Fexo 120mg",
            "generic_name": "Fexofenadine Hydrochloride",
            "category": "Antihistamine",
            "dosage_form": "Tablet",
            "strength": "120 mg",
            "formulation": "Fexofenadine Hydrochloride USP 120 mg",
            "packaging": "3 x 10 Blister Pack",
            "manufacturer_key": "square_pharma",
            "regulatory_approval_number": "DAR-023-0782-16",
            "description": "Non-sedating 24-hour allergy relief for allergic rhinitis and chronic idiopathic urticaria."
        },
        {
            "product_id": "MED-BX-BIZ-520",
            "name": "Bizoran 5/20",
            "generic_name": "Amlodipine + Olmesartan Medoxomil",
            "category": "Antihypertensive",
            "dosage_form": "Tablet",
            "strength": "5 mg + 20 mg",
            "formulation": "Amlodipine Besilate USP 5 mg + Olmesartan Medoxomil USP 20 mg",
            "packaging": "3 x 10 Alu-Alu Pack",
            "manufacturer_key": "beximco_pharma",
            "regulatory_approval_number": "DAR-016-0912-18",
            "description": "Dual action combination therapy for essential hypertension control."
        },
        {
            "product_id": "MED-AC-MON-010",
            "name": "Monas 10mg",
            "generic_name": "Montelukast",
            "category": "Anti-asthmatic",
            "dosage_form": "Tablet",
            "strength": "10 mg",
            "formulation": "Montelukast Sodium USP 10 mg",
            "packaging": "3 x 10 Alu-Alu Pack",
            "manufacturer_key": "acme_pharma",
            "regulatory_approval_number": "DAR-004-0615-11",
            "description": "Leukotriene receptor antagonist for asthma prophylaxis and seasonal allergy management."
        },
        {
            "product_id": "MED-BX-BEX-GLD",
            "name": "Bextrum Gold",
            "generic_name": "Multivitamin & Multimineral",
            "category": "Vitamin & Mineral Supplement",
            "dosage_form": "Tablet",
            "strength": "A-Z Formula",
            "formulation": "Multivitamin with 30 essential vitamins, minerals and antioxidants",
            "packaging": "Container of 30 Tablets",
            "manufacturer_key": "beximco_pharma",
            "regulatory_approval_number": "DAR-016-0881-19",
            "description": "Comprehensive daily nutritional support for vitality, immunity, and overall well-being."
        },
        {
            "product_id": "MED-IN-ESO-020",
            "name": "Esonix 20mg",
            "generic_name": "Esomeprazole",
            "category": "Anti-ulcerant",
            "dosage_form": "Tablet",
            "strength": "20 mg",
            "formulation": "Esomeprazole Magnesium USP 20 mg",
            "packaging": "5 x 10 Alu-Alu Blister",
            "manufacturer_key": "incepta_pharma",
            "regulatory_approval_number": "DAR-051-0421-17",
            "description": "Targeted proton pump inhibitor for severe heartburn, gastritis, and peptic ulceration."
        },
        {
            "product_id": "MED-RN-MAX-020",
            "name": "Maxpro 20mg",
            "generic_name": "Esomeprazole",
            "category": "Anti-ulcerant",
            "dosage_form": "Capsule",
            "strength": "20 mg",
            "formulation": "Esomeprazole Magnesium Trihydrate USP 20 mg",
            "packaging": "4 x 14 Blister Pack",
            "manufacturer_key": "renata_pharma",
            "regulatory_approval_number": "DAR-031-0205-13",
            "description": "Highly prescribed PPI capsule for fast relief from hyperacidity and stomach ulcer."
        },
        {
            "product_id": "MED-RN-COM-005",
            "name": "Compathin 5mg",
            "generic_name": "Amlodipine",
            "category": "Antihypertensive",
            "dosage_form": "Tablet",
            "strength": "5 mg",
            "formulation": "Amlodipine Besilate USP 5 mg",
            "packaging": "10 x 10 Blister Pack",
            "manufacturer_key": "renata_pharma",
            "regulatory_approval_number": "DAR-031-0112-09",
            "description": "Calcium channel blocker for management of high blood pressure and chronic stable angina."
        },
        {
            "product_id": "MED-SQ-MET-500",
            "name": "Metfo 500mg",
            "generic_name": "Metformin Hydrochloride",
            "category": "Anti-diabetic",
            "dosage_form": "Tablet",
            "strength": "500 mg",
            "formulation": "Metformin Hydrochloride BP 500 mg",
            "packaging": "10 x 10 Blister Pack",
            "manufacturer_key": "square_pharma",
            "regulatory_approval_number": "DAR-023-0095-04",
            "description": "First-line oral anti-diabetic medication for glycemic control in Type 2 Diabetes Mellitus."
        },
        {
            "product_id": "MED-SQ-CEF-200",
            "name": "Cef-3 200mg",
            "generic_name": "Cefixime",
            "category": "Antibiotic",
            "dosage_form": "Capsule",
            "strength": "200 mg",
            "formulation": "Cefixime Trihydrate USP 200 mg",
            "packaging": "2 x 6 Blister Pack",
            "manufacturer_key": "square_pharma",
            "regulatory_approval_number": "DAR-023-0450-12",
            "description": "Oral 3rd generation cephalosporin antibiotic for respiratory, typhoid, and urinary tract infections."
        },
        {
            "product_id": "MED-BX-AZI-500",
            "name": "Azithcin 500mg",
            "generic_name": "Azithromycin",
            "category": "Antibiotic",
            "dosage_form": "Tablet",
            "strength": "500 mg",
            "formulation": "Azithromycin Dihydrate USP 500 mg",
            "packaging": "3 x 6 Blister Pack",
            "manufacturer_key": "beximco_pharma",
            "regulatory_approval_number": "DAR-016-0330-10",
            "description": "Effective broad-spectrum macrolide antibiotic for ENT and respiratory tract infections."
        },
        {
            "product_id": "MED-RN-FEN-120",
            "name": "Fenadin 120mg",
            "generic_name": "Fexofenadine Hydrochloride",
            "category": "Antihistamine",
            "dosage_form": "Tablet",
            "strength": "120 mg",
            "formulation": "Fexofenadine Hydrochloride USP 120 mg",
            "packaging": "3 x 10 Blister Pack",
            "manufacturer_key": "renata_pharma",
            "regulatory_approval_number": "DAR-031-0518-15",
            "description": "Non-drowsy 24h antihistamine for relief of allergic rhinitis, sneezing, and skin rashes."
        },
        {
            "product_id": "MED-BX-TOF-001",
            "name": "Tofen 1mg",
            "generic_name": "Ketotifen",
            "category": "Anti-asthmatic",
            "dosage_form": "Tablet",
            "strength": "1 mg",
            "formulation": "Ketotifen Fumarate BP 1 mg",
            "packaging": "10 x 10 Blister Pack",
            "manufacturer_key": "beximco_pharma",
            "regulatory_approval_number": "DAR-016-0155-08",
            "description": "Mast cell stabilizer used for prophylactic prevention of bronchial asthma and allergic conditions."
        }
    ]

    print("Registering 20 Primary Medicines...", flush=True)
    for idx, item in enumerate(real_medicines_data, start=1):
        primary_mfg = mfg_users[item["manufacturer_key"]]
        med, created = Medicine.objects.update_or_create(
            product_id=item["product_id"],
            defaults={
                "name": item["name"],
                "generic_name": item["generic_name"],
                "category": item["category"],
                "dosage_form": item["dosage_form"],
                "strength": item["strength"],
                "formulation": item["formulation"],
                "packaging": item["packaging"],
                "manufacturer": primary_mfg,
                "regulatory_approval_number": item["regulatory_approval_number"],
                "description": item["description"],
                "is_registered": True,
                "is_active": True
            }
        )
        status_str = "Created" if created else "Updated"
        print(f"[{idx:02d}/20] {status_str}: {med.name} ({med.generic_name})", flush=True)

        # Create batch fast (quantity 2)
        batch_num = f"B2026-REAL-{idx:02d}"
        Batch.objects.get_or_create(
            batch_number=batch_num,
            defaults={
                "medicine": med,
                "manufacturer": primary_mfg,
                "manufacturing_date": "2026-01-15",
                "expiry_date": "2028-01-15",
                "quantity_produced": 2,
                "unit_qr_codes": [f"UNIT-{batch_num}-01", f"UNIT-{batch_num}-02"],
                "qc_status": "passed",
                "status": "active"
            }
        )

    # Populate for all other manufacturer user accounts
    print("\nEnsuring all manufacturer user accounts have registered medicines...", flush=True)
    for mfg_user in all_mfgs:
        for idx, item in enumerate(real_medicines_data, start=1):
            custom_product_id = f"MED-{mfg_user.username[:6].upper()}-{idx:03d}"
            med_copy, _ = Medicine.objects.update_or_create(
                product_id=custom_product_id,
                defaults={
                    "name": item["name"],
                    "generic_name": item["generic_name"],
                    "category": item["category"],
                    "dosage_form": item["dosage_form"],
                    "strength": item["strength"],
                    "formulation": item["formulation"],
                    "packaging": item["packaging"],
                    "manufacturer": mfg_user,
                    "regulatory_approval_number": item["regulatory_approval_number"],
                    "description": item["description"],
                    "is_registered": True,
                    "is_active": True
                }
            )
            b_num = f"B2026-{mfg_user.username[:4].upper()}-{idx:02d}"
            Batch.objects.get_or_create(
                batch_number=b_num,
                defaults={
                    "medicine": med_copy,
                    "manufacturer": mfg_user,
                    "manufacturing_date": "2026-02-01",
                    "expiry_date": "2028-02-01",
                    "quantity_produced": 2,
                    "unit_qr_codes": [f"UNIT-{b_num}-01", f"UNIT-{b_num}-02"],
                    "qc_status": "passed",
                    "status": "active"
                }
            )

    total_medicines = Medicine.objects.count()
    print(f"\nSUCCESS! Registered 20 real Bangladesh medicines for all Manufacturer accounts. Total Medicines in DB: {total_medicines}", flush=True)

if __name__ == "__main__":
    seed_20_real_medicines()
