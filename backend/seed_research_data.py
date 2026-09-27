import os
import sys
# pyrefly: ignore [missing-import]
import django
import random
from datetime import date, datetime, timedelta

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "medguard.settings")
django.setup()

# pyrefly: ignore [missing-import]
from django.contrib.auth import get_user_model
from core.models import Medicine, Batch, ADRReport, ResearchADRData, ResearchDataset, KnowledgeEdge
from users.models import ResearcherProfile

User = get_user_model()

print("Seeding rich data for Research Portal...")

# 1. Ensure Researcher user exists
researcher_user, created = User.objects.get_or_dict if hasattr(User.objects, 'get_or_dict') else (None, False)
researcher_user = User.objects.filter(role='researcher').first()
if not researcher_user:
    researcher_user = User.objects.create_user(
        username='researcher_demo',
        email='researcher@medguard.bd',
        password='password123',
        role='researcher',
        full_name='Dr. Tanvir Ahmed (Senior Researcher)'
    )
    print("Created demo researcher user.")

# Ensure profile exists
if not hasattr(researcher_user, 'researcher_profile'):
    ResearcherProfile.objects.create(
        user=researcher_user,
        affiliation='Institute of Epidemiology, Disease Control and Research (IEDCR)',
        research_interests='Pharmacovigilance, Adverse Drug Reaction Signals, AI Epidemiology'
    )

# 2. Get or create medicines
medicines_data = [
    {"name": "Napa Extra 500mg", "generic_name": "Paracetamol + Caffeine", "category": "Analgesic"},
    {"name": "Seclo 20mg", "generic_name": "Omeprazole", "category": "Proton Pump Inhibitor"},
    {"name": "Sergel 20mg", "generic_name": "Esomeprazole", "category": "Proton Pump Inhibitor"},
    {"name": "Azithrocin 500mg", "generic_name": "Azithromycin", "category": "Antibiotic"},
    {"name": "Cef-3 200mg", "generic_name": "Cefixime", "category": "Antibiotic"},
    {"name": "Maxpro 20mg", "generic_name": "Esomeprazole", "category": "Proton Pump Inhibitor"},
    {"name": "Ace 500mg", "generic_name": "Paracetamol", "category": "Analgesic"},
    {"name": "Tylace 600mg", "generic_name": "Acetylcysteine", "category": "Respiratory"},
    {"name": "Amodis 400mg", "generic_name": "Metronidazole", "category": "Antiprotozoal"},
    {"name": "Bizoran 5/20", "generic_name": "Amlodipine + Olmesartan", "category": "Antihypertensive"},
]

mfg_user = User.objects.filter(role='manufacturer').first() or User.objects.filter(role='admin').first() or researcher_user

medicines = []
for item in medicines_data:
    med = Medicine.objects.filter(name=item["name"]).first()
    if not med:
        med = Medicine.objects.create(
            name=item["name"],
            generic_name=item["generic_name"],
            category=item["category"],
            manufacturer=mfg_user,
            description=f"Standard formulation for {item['generic_name']} in Bangladesh."
        )
    medicines.append(med)

print(f"Total Medicines available: {len(medicines)}")

# 3. Create active batches
batches = []
today = date.today()
for med in medicines:
    b, _ = Batch.objects.get_or_create(
        batch_number=f"BATCH-{med.id}01-2026",
        medicine=med,
        defaults={
            "manufacturer": mfg_user,
            "manufacturing_date": today - timedelta(days=180),
            "expiry_date": today + timedelta(days=500),
            "quantity_produced": 5000,
            "qc_status": "passed",
            "status": "active"
        }
    )
    batches.append(b)

# 4. Generate Rich ADR Reports for Signal Detection & Literature Mining
citizen_user = User.objects.filter(role='citizen').first() or researcher_user

reactions = [
    ("Severe allergic skin rash and facial swelling within 2 hours of ingestion.", "severe"),
    ("Acute epigastric burning pain, dizziness and persistent nausea.", "moderate"),
    ("Mild headache, drowsiness and transient dry mouth reported.", "mild"),
    ("Sudden bronchospasm, wheezing and drop in blood pressure.", "severe"),
    ("Diarrhea, abdominal cramps and mild cutaneous itching.", "moderate"),
    ("Hepatotoxicity indication, elevated ALT/AST levels and fatigue.", "severe"),
    ("Tachycardia, palpitations and muscle weakness post administration.", "moderate"),
    ("Mild nausea and transient insomnia.", "mild"),
    ("Stevens-Johnson syndrome symptoms, mucosal lesions and fever.", "severe"),
    ("Gastrointestinal bleeding and severe vomiting after repeated dosage.", "severe"),
]

print("Generating ADR Reports & Sanitised Research Data...")
count = 0
for i in range(35):
    med = random.choice(medicines)
    batch = next((b for b in batches if b.medicine_id == med.id), batches[0])
    desc, sev = random.choice(reactions)
    r_date = today - timedelta(days=random.randint(5, 120))
    
    adr = ADRReport.objects.create(
        reported_by_user=citizen_user,
        citizen=citizen_user,
        batch=batch,
        medicine=med,
        description=f"{desc} Patient reported onset on {r_date}. No prior history of allergy noted.",
        severity=sev,
        reaction_date=r_date,
        status="investigated" if i % 2 == 0 else "pending"
    )
    
    # Create Sanitised Narrative for Research Portal
    ResearchADRData.objects.create(
        adr_report=adr,
        anonymized_data=f"Subject [PSEUDONYMIZED] presented with {desc.lower()} Reaction onset recorded in {r_date.strftime('%Y-%m')}. De-identified narrative."
    )
    count += 1

print(f"Created {count} new ADR Reports and ResearchADRData entries.")

# 5. Create Registered Research Datasets
dataset_samples = [
    {
        "name": "National Pharmacovigilance Survey BD (2025-2026)",
        "desc": "Comprehensive national adverse drug reaction cohort tracking 1,200 patient-reported outcomes across Dhaka, Chittagong & Sylhet."
    },
    {
        "name": "Antimicrobial ADR & Resistance Cohort Dataset",
        "desc": "Longitudinal surveillance dataset monitoring adverse reactions and resistance indicators for Azithromycin and Cefixime."
    },
    {
        "name": "Cardiovascular & PPI Co-prescription Safety Study",
        "desc": "Anonymized real-world evidence analyzing co-occurrence patterns between antihypertensives and proton pump inhibitors."
    },
    {
        "name": "Pediatric & Geriatric Drug Safety Signals Dataset 2026",
        "desc": "De-identified report dataset focusing on vulnerable age demographics in tertiary healthcare centers."
    }
]

for ds in dataset_samples:
    ResearchDataset.objects.get_or_create(
        dataset_name=ds["name"],
        defaults={
            "description": ds["desc"],
            "created_by": researcher_user
        }
    )

print("Created Research Datasets.")

# 6. Seed Knowledge Graph Edges (stored knowledge network)
KnowledgeEdge.objects.all().delete()
edges_data = []

med_ids = [m.id for m in medicines]
if len(med_ids) >= 4:
    # Add relationships
    edges_data.append(KnowledgeEdge(source_type="medicine", source_id=med_ids[0], target_type="medicine", target_id=med_ids[1], relation="co_prescribed_with", weight=0.85))
    edges_data.append(KnowledgeEdge(source_type="medicine", source_id=med_ids[0], target_type="medicine", target_id=med_ids[2], relation="interacts_with", weight=0.92))
    edges_data.append(KnowledgeEdge(source_type="medicine", source_id=med_ids[3], target_type="medicine", target_id=med_ids[4], relation="co_prescribed_with", weight=0.78))
    edges_data.append(KnowledgeEdge(source_type="medicine", source_id=med_ids[1], target_type="medicine", target_id=med_ids[5], relation="same_class", weight=0.99))
    edges_data.append(KnowledgeEdge(source_type="medicine", source_id=med_ids[6], target_type="medicine", target_id=med_ids[0], relation="same_active_ingredient", weight=0.95))

KnowledgeEdge.objects.bulk_create(edges_data)
print(f"Created {len(edges_data)} Knowledge Graph Edges.")

print("Research Portal Data Seeding Complete!")
