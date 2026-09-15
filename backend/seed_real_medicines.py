import os
import sys
import random
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "medguard.settings")
django.setup()

from users.models import CustomUser, Role, ManufacturerProfile
from core.models import Medicine

REAL_MANUFACTURERS = [
    {
        "username": "square_pharma",
        "full_name": "Square Pharmaceuticals Ltd.",
        "company_name": "Square Pharmaceuticals Ltd.",
        "registration_number": "DGDA-MFG-0012",
        "address": "Square Centre, 48 Mohakhali C/A, Dhaka-1212",
        "contact_person": "Md. Rafiqul Islam",
        "contact_phone": "+880 1711-100200",
        "website": "https://www.squarepharma.com.bd"
    },
    {
        "username": "beximco_pharma",
        "full_name": "Beximco Pharmaceuticals Ltd.",
        "company_name": "Beximco Pharmaceuticals Ltd.",
        "registration_number": "DGDA-MFG-0089",
        "address": "19 Dhanmondi R/A, Road 7, Dhaka",
        "contact_person": "Nazmul Hassan",
        "contact_phone": "+880 1711-998877",
        "website": "https://www.beximcopeharman.com"
    },
    {
        "username": "incepta_pharma",
        "full_name": "Incepta Pharmaceuticals Ltd.",
        "company_name": "Incepta Pharmaceuticals Ltd.",
        "registration_number": "DGDA-MFG-0034",
        "address": "40 Shahid Tajuddin Ahmed Sarani, Tejgaon I/A, Dhaka-1208",
        "contact_person": "Abdul Muktadir",
        "contact_phone": "+880 1713-001122",
        "website": "https://www.inceptapharma.com"
    },
    {
        "username": "renata_pharma",
        "full_name": "Renata Limited",
        "company_name": "Renata Limited",
        "registration_number": "DGDA-MFG-0045",
        "address": "Plot #1, Milk Vita Road, Section-7, Mirpur, Dhaka-1216",
        "contact_person": "Syed S. Kaiser Kabir",
        "contact_phone": "+880 1711-445566",
        "website": "https://www.renata-ltd.com"
    },
    {
        "username": "acme_pharma",
        "full_name": "The ACME Laboratories Ltd.",
        "company_name": "The ACME Laboratories Ltd.",
        "registration_number": "DGDA-MFG-0018",
        "address": "1/4 Kallayanpur, Mirpur Road, Dhaka-1207",
        "contact_person": "Mizanur Rahman Sinha",
        "contact_phone": "+880 1715-990011",
        "website": "https://www.acmeglobal.com"
    },
    {
        "username": "healthcare_pharma",
        "full_name": "Healthcare Pharmaceuticals Ltd.",
        "company_name": "Healthcare Pharmaceuticals Ltd.",
        "registration_number": "DGDA-MFG-0056",
        "address": "NASSA Heights, 47 Gulshan Avenue, Dhaka-1212",
        "contact_person": "Alauddin Ahmed",
        "contact_phone": "+880 1819-223344",
        "website": "https://www.hplbd.com"
    }
]

REAL_MEDICINES = [
    {
        "product_id": "MED-SQ-ACE-500",
        "name": "Ace 500mg",
        "generic_name": "Paracetamol",
        "category": "Analgesic & Antipyretic",
        "dosage_form": "Tablet",
        "strength": "500mg",
        "formulation": "Paracetamol BP 500mg",
        "packaging": "10 x 10 Blister Pack",
        "regulatory_approval_number": "DAR-10293-882",
        "description": "Indicated for fever, headache, mild to moderate pain, and common cold symptoms.",
        "manufacturer_username": "square_pharma"
    },
    {
        "product_id": "MED-SQ-ACE-PLS",
        "name": "Ace Plus",
        "generic_name": "Paracetamol + Caffeine",
        "category": "Analgesic & Antipyretic",
        "dosage_form": "Tablet",
        "strength": "500mg / 65mg",
        "formulation": "Paracetamol BP 500mg + Caffeine USP 65mg",
        "packaging": "10 x 10 Blister Pack",
        "regulatory_approval_number": "DAR-10293-883",
        "description": "Fast-acting relief for severe headaches, migraines, toothaches, and fever.",
        "manufacturer_username": "square_pharma"
    },
    {
        "product_id": "MED-BX-NAP-EXT",
        "name": "Napa Extra",
        "generic_name": "Paracetamol + Caffeine",
        "category": "Analgesic & Antipyretic",
        "dosage_form": "Tablet",
        "strength": "500mg / 65mg",
        "formulation": "Paracetamol BP 500mg + Caffeine USP 65mg",
        "packaging": "10 x 10 Blister Pack",
        "regulatory_approval_number": "DAR-88291-110",
        "description": "Relieves headache, body ache, fever and acute mild to moderate pain.",
        "manufacturer_username": "beximco_pharma"
    },
    {
        "product_id": "MED-BX-NAP-EXTD",
        "name": "Napa Extend",
        "generic_name": "Paracetamol",
        "category": "Analgesic & Antipyretic",
        "dosage_form": "Extended Release Tablet",
        "strength": "665mg",
        "formulation": "Paracetamol BP 665mg ER",
        "packaging": "10 x 10 Blister Pack",
        "regulatory_approval_number": "DAR-88291-115",
        "description": "Sustained 8-hour relief from joint pain, backache, and osteoarthritis pain.",
        "manufacturer_username": "beximco_pharma"
    },
    {
        "product_id": "MED-SQ-SEC-20",
        "name": "Seclo 20mg",
        "generic_name": "Omeprazole",
        "category": "Antiulcerant (PPI)",
        "dosage_form": "Capsule",
        "strength": "20mg",
        "formulation": "Omeprazole BP 20mg Enteric Coated Pellets",
        "packaging": "6 x 10 Alu-Alu Strip",
        "regulatory_approval_number": "DAR-45129-331",
        "description": "Treatment of GERD, gastric ulcer, duodenal ulcer, and acid reflux.",
        "manufacturer_username": "square_pharma"
    },
    {
        "product_id": "MED-SQ-ZIM-500",
        "name": "Zimax 500mg",
        "generic_name": "Azithromycin",
        "category": "Antibiotic (Macrolide)",
        "dosage_form": "Tablet",
        "strength": "500mg",
        "formulation": "Azithromycin Dihydrate USP 500mg",
        "packaging": "1 x 3 Blister Pack",
        "regulatory_approval_number": "DAR-55412-990",
        "description": "Broad-spectrum antibiotic for respiratory tract infections, skin, and soft tissue infections.",
        "manufacturer_username": "square_pharma"
    },
    {
        "product_id": "MED-HP-SER-20",
        "name": "Sergel 20mg",
        "generic_name": "Esomeprazole",
        "category": "Antiulcerant (PPI)",
        "dosage_form": "Capsule",
        "strength": "20mg",
        "formulation": "Esomeprazole Magnesium Trihydrate USP 20mg",
        "packaging": "5 x 10 Alu-Alu Strip",
        "regulatory_approval_number": "DAR-33918-442",
        "description": "Proton pump inhibitor for hyperacidity, peptic ulcer, and erosive esophagitis.",
        "manufacturer_username": "healthcare_pharma"
    },
    {
        "product_id": "MED-RN-MAX-20",
        "name": "Maxpro 20mg",
        "generic_name": "Esomeprazole",
        "category": "Antiulcerant (PPI)",
        "dosage_form": "Tablet",
        "strength": "20mg",
        "formulation": "Esomeprazole Magnesium USP 20mg",
        "packaging": "5 x 10 Blister Pack",
        "regulatory_approval_number": "DAR-29104-551",
        "description": "Effective control of gastric acid secretion and healing of peptic ulcers.",
        "manufacturer_username": "renata_pharma"
    },
    {
        "product_id": "MED-SQ-CIP-500",
        "name": "Ciprocin 500mg",
        "generic_name": "Ciprofloxacin",
        "category": "Antibiotic (Fluoroquinolone)",
        "dosage_form": "Tablet",
        "strength": "500mg",
        "formulation": "Ciprofloxacin Hydrochloride USP 500mg",
        "packaging": "2 x 10 Blister Pack",
        "regulatory_approval_number": "DAR-77182-901",
        "description": "Effective against urinary tract infections, typhoid fever, and gastrointestinal infections.",
        "manufacturer_username": "square_pharma"
    },
    {
        "product_id": "MED-AC-MON-10",
        "name": "Monas 10mg",
        "generic_name": "Montelukast",
        "category": "Anti-asthmatic",
        "dosage_form": "Tablet",
        "strength": "10mg",
        "formulation": "Montelukast Sodium USP 10mg",
        "packaging": "3 x 10 Alu-Alu Strip",
        "regulatory_approval_number": "DAR-66291-884",
        "description": "Prophylaxis and chronic treatment of asthma and seasonal allergic rhinitis.",
        "manufacturer_username": "acme_pharma"
    },
    {
        "product_id": "MED-IN-ESO-20",
        "name": "Esonix 20mg",
        "generic_name": "Esomeprazole",
        "category": "Antiulcerant",
        "dosage_form": "Tablet",
        "strength": "20mg",
        "formulation": "Esomeprazole Magnesium Trihydrate USP 20mg",
        "packaging": "4 x 10 Blister Pack",
        "regulatory_approval_number": "DAR-44109-123",
        "description": "Advanced acid suppression therapy for chronic heartburn and GERD.",
        "manufacturer_username": "incepta_pharma"
    },
    {
        "product_id": "MED-IN-PAN-20",
        "name": "Pantonix 20mg",
        "generic_name": "Pantoprazole",
        "category": "Antiulcerant",
        "dosage_form": "Tablet",
        "strength": "20mg",
        "formulation": "Pantoprazole Sodium Sesquihydrate USP 20mg",
        "packaging": "5 x 10 Blister Pack",
        "regulatory_approval_number": "DAR-51928-663",
        "description": "Targeted inhibition of gastric acid production for duodenal and gastric ulcers.",
        "manufacturer_username": "incepta_pharma"
    },
    {
        "product_id": "MED-IN-BIZ-520",
        "name": "Bizoran 5/20",
        "generic_name": "Olmesartan + Amlodipine",
        "category": "Antihypertensive",
        "dosage_form": "Tablet",
        "strength": "5mg / 20mg",
        "formulation": "Amlodipine Besylate 5mg + Olmesartan Medoxomil 20mg",
        "packaging": "3 x 10 Blister Pack",
        "regulatory_approval_number": "DAR-88192-304",
        "description": "Dual mechanism blood pressure control for essential hypertension.",
        "manufacturer_username": "incepta_pharma"
    },
    {
        "product_id": "MED-SQ-ENT-PLS",
        "name": "Entacyd Plus",
        "generic_name": "Aluminium Hydroxide + Magnesium Hydroxide + Simethicone",
        "category": "Antacid",
        "dosage_form": "Suspension",
        "strength": "200mg / 400mg / 25mg",
        "formulation": "Aluminium Hydroxide 200mg + Magnesium Hydroxide 400mg + Simethicone 25mg per 5ml",
        "packaging": "200ml Glass Bottle",
        "regulatory_approval_number": "DAR-11928-445",
        "description": "Immediate neutralization of stomach acid, bloating, gas, and heartburn.",
        "manufacturer_username": "square_pharma"
    },
    {
        "product_id": "MED-SQ-FEX-120",
        "name": "Fexo 120mg",
        "generic_name": "Fexofenadine HCI",
        "category": "Antihistamine",
        "dosage_form": "Tablet",
        "strength": "120mg",
        "formulation": "Fexofenadine Hydrochloride USP 120mg",
        "packaging": "3 x 10 Blister Pack",
        "regulatory_approval_number": "DAR-66102-778",
        "description": "Non-drowsy 24-hour relief from seasonal allergies, sneezing, and skin hives.",
        "manufacturer_username": "square_pharma"
    },
    {
        "product_id": "MED-BX-COM-50",
        "name": "Compath 50mg",
        "generic_name": "Losartan Potassium",
        "category": "Antihypertensive",
        "dosage_form": "Tablet",
        "strength": "50mg",
        "formulation": "Losartan Potassium USP 50mg",
        "packaging": "3 x 10 Blister Pack",
        "regulatory_approval_number": "DAR-99210-332",
        "description": "Angiotensin II receptor blocker for hypertension and renal protection in diabetic patients.",
        "manufacturer_username": "beximco_pharma"
    },
    {
        "product_id": "MED-SQ-AMO-400",
        "name": "Amodis 400mg",
        "generic_name": "Metronidazole",
        "category": "Antiprotozoal & Antibacterial",
        "dosage_form": "Tablet",
        "strength": "400mg",
        "formulation": "Metronidazole BP 400mg",
        "packaging": "10 x 10 Blister Pack",
        "regulatory_approval_number": "DAR-33104-556",
        "description": "Treatment of amoebic dysentery, giardiasis, and anaerobic bacterial infections.",
        "manufacturer_username": "square_pharma"
    },
    {
        "product_id": "MED-BX-BEX-GLD",
        "name": "Bextrum Gold",
        "generic_name": "Multivitamin & Multimineral",
        "category": "Nutritional Supplement",
        "dosage_form": "Tablet",
        "strength": "A-Z Complete Formula",
        "formulation": "30 Essential Vitamins & Minerals A-Z",
        "packaging": "30 Tablets Container",
        "regulatory_approval_number": "DAR-88129-991",
        "description": "Daily dietary supplement for immunity boost, vitality, and overall wellness.",
        "manufacturer_username": "beximco_pharma"
    },
    {
        "product_id": "MED-SQ-CEF-200",
        "name": "Cef-3 200mg",
        "generic_name": "Cefixime",
        "category": "Antibiotic (Cephalosporin)",
        "dosage_form": "Capsule",
        "strength": "200mg",
        "formulation": "Cefixime Trihydrate USP 200mg",
        "packaging": "1 x 8 Blister Pack",
        "regulatory_approval_number": "DAR-44129-887",
        "description": "Third generation cephalosporin for otitis media, UTI, and respiratory infections.",
        "manufacturer_username": "square_pharma"
    },
    {
        "product_id": "MED-SQ-TUF-200",
        "name": "Tufnil 200mg",
        "generic_name": "Tolfenamic Acid",
        "category": "Anti-migraine / NSAID",
        "dosage_form": "Tablet",
        "strength": "200mg",
        "formulation": "Tolfenamic Acid BP 200mg",
        "packaging": "2 x 10 Blister Pack",
        "regulatory_approval_number": "DAR-66512-441",
        "description": "Targeted acute treatment of migraine headache attack and severe musculoskeletal pain.",
        "manufacturer_username": "square_pharma"
    },
    {
        "product_id": "MED-SQ-ALM-400",
        "name": "Almex 400mg",
        "generic_name": "Albendazole",
        "category": "Anthelmintic",
        "dosage_form": "Chewable Tablet",
        "strength": "400mg",
        "formulation": "Albendazole USP 400mg",
        "packaging": "1 x 1 Blister Pack",
        "regulatory_approval_number": "DAR-11029-771",
        "description": "Single-dose treatment for intestinal worm infections (roundworm, hookworm, pinworm).",
        "manufacturer_username": "square_pharma"
    },
    {
        "product_id": "MED-SQ-TYL-600",
        "name": "Tylace 600mg",
        "generic_name": "Acetylcysteine",
        "category": "Mucolytic",
        "dosage_form": "Effervescent Tablet",
        "strength": "600mg",
        "formulation": "Acetylcysteine USP 600mg",
        "packaging": "10 Tablets Tube",
        "regulatory_approval_number": "DAR-33201-998",
        "description": "Breaks down mucus build-up in acute and chronic bronchitis and COPD.",
        "manufacturer_username": "square_pharma"
    }
]

def seed_all_medicines():
    print("Seeding authentic Bangladeshi medicines...")
    created_count = 0

    # 1. Ensure manufacturer accounts exist
    m_map = {}
    for m in REAL_MANUFACTURERS:
        u, _ = CustomUser.objects.get_or_create(
            username=m["username"],
            defaults={"full_name": m["full_name"], "role": Role.MANUFACTURER}
        )
        u.set_password("pass123")
        u.save()

        ManufacturerProfile.objects.get_or_create(
            user=u,
            defaults={
                "company_name": m["company_name"],
                "registration_number": m["registration_number"],
                "address": m["address"],
                "contact_person": m["contact_person"],
                "contact_phone": m["contact_phone"],
                "website": m["website"]
            }
        )
        m_map[m["username"]] = u

    # Also map all manufacturer role users
    all_mfg_users = list(CustomUser.objects.filter(role=Role.MANUFACTURER))

    # 2. Seed Medicines
    for med_data in REAL_MEDICINES:
        mfg_user = m_map.get(med_data["manufacturer_username"], all_mfg_users[0] if all_mfg_users else None)
        if not mfg_user:
            continue

        med_obj, created = Medicine.objects.get_or_create(
            product_id=med_data["product_id"],
            defaults={
                "name": med_data["name"],
                "generic_name": med_data["generic_name"],
                "category": med_data["category"],
                "dosage_form": med_data["dosage_form"],
                "strength": med_data["strength"],
                "formulation": med_data["formulation"],
                "packaging": med_data["packaging"],
                "regulatory_approval_number": med_data["regulatory_approval_number"],
                "description": med_data["description"],
                "manufacturer": mfg_user,
                "is_registered": True,
                "is_active": True
            }
        )
        if created:
            created_count += 1

    # Also ensure every manufacturer in the DB has at least 3 medicines registered so their registration dashboard is rich!
    for m_user in all_mfg_users:
        user_meds = Medicine.objects.filter(manufacturer=m_user)
        if user_meds.count() < 3:
            for med_data in REAL_MEDICINES[:5]:
                Medicine.objects.get_or_create(
                    product_id=f"MED-{m_user.username[:4].upper()}-{med_data['name'][:3].upper()}-{random.randint(100,999)}",
                    defaults={
                        "name": med_data["name"],
                        "generic_name": med_data["generic_name"],
                        "category": med_data["category"],
                        "dosage_form": med_data["dosage_form"],
                        "strength": med_data["strength"],
                        "formulation": med_data["formulation"],
                        "packaging": med_data["packaging"],
                        "regulatory_approval_number": f"DAR-{random.randint(10000,99999)}-{random.randint(100,999)}",
                        "description": med_data["description"],
                        "manufacturer": m_user,
                        "is_registered": True,
                        "is_active": True
                    }
                )

    print(f"Done! Seeded {created_count} new medicines. Total medicines in DB: {Medicine.objects.count()}")

if __name__ == "__main__":
    seed_all_medicines()
