from datetime import date, timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from core.models import (
    Batch,
    ComplianceItem,
    DistributionEvent,
    Inspection,
    Inventory,
    Medicine,
    QualityTest,
    Recall,
)
from users.models import DGDAProfile, ManufacturerProfile, PharmacyProfile

User = get_user_model()

TEST_PASSWORD = 'Test@12345'


class Command(BaseCommand):
    help = 'Seeds realistic fake data (manufacturers, medicines, batches, recall, inspections, DGDA user) for local testing. Safe to re-run.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--allow-non-sqlite',
            action='store_true',
            help='Allow seeding a non-SQLite database (e.g. Supabase). Off by default so fake data never lands in a real database by accident.',
        )

    def handle(self, *args, **options):
        engine = settings.DATABASES['default'].get('ENGINE', '')
        if 'sqlite' not in engine and not options['allow_non_sqlite']:
            raise CommandError(f'Refusing to seed demo data into a non-SQLite database ({engine}). Pass --allow-non-sqlite to override.')

        with transaction.atomic():
            self.seed()

        self.stdout.write(self.style.SUCCESS('\nDemo data seeded. Test accounts (password for all: %s):' % TEST_PASSWORD))
        for username, role, name in [
            ('mfg_padma', 'manufacturer', 'Padma Pharmaceuticals Ltd'),
            ('mfg_meghna', 'manufacturer', 'Meghna Life Sciences Ltd'),
            ('dgda_officer', 'dgda', 'DGDA Drug Control'),
            ('pharm_dhanmondi', 'pharmacy', 'Dhanmondi Care Pharmacy'),
        ]:
            self.stdout.write(f'  {username:<16} {role:<13} {name}')

    def upsert_user(self, username, role, full_name, email, phone):
        user, _ = User.objects.get_or_create(username=username, defaults={'role': role})
        user.role = role
        user.full_name = full_name
        user.email = email
        user.phone = phone
        user.is_active = True
        user.set_password(TEST_PASSWORD)
        user.save()
        return user

    def create_batch(self, manufacturer, medicine, batch_number, manufactured_days_ago, shelf_life_days, quantity, qc_status, released, status='active'):
        manufacturing_date = date.today() - timedelta(days=manufactured_days_ago)
        batch, created = Batch.objects.get_or_create(
            manufacturer=manufacturer,
            batch_number=batch_number,
            defaults={
                'medicine': medicine,
                'manufacturing_date': manufacturing_date,
                'expiry_date': manufacturing_date + timedelta(days=shelf_life_days),
                'quantity_produced': quantity,
                'ingredients': [medicine.generic_name or medicine.name, 'Microcrystalline cellulose', 'Magnesium stearate'],
                'api_sources': ['Local API supplier, Gazipur'],
                'qc_status': qc_status,
                'release_blocked': not released,
                'status': status,
            },
        )
        if created:
            # Mirrors what the batch-create API records
            DistributionEvent.objects.create(
                batch=batch, from_user=manufacturer, to_user=manufacturer,
                stage_from='factory', stage_to='warehouse', quantity=quantity,
                geo_location='factory-release', notes='Batch created and queued for QC release.',
            )
            if released:
                now = timezone.now()
                batch.warehouse_released_at = now - timedelta(days=max(manufactured_days_ago - 7, 1))
                batch.qr_activated_at = batch.warehouse_released_at
                batch.save(update_fields=['warehouse_released_at', 'qr_activated_at', 'updated_at'])
                DistributionEvent.objects.create(
                    batch=batch, from_user=manufacturer, to_user=manufacturer,
                    stage_from='factory', stage_to='warehouse', quantity=quantity,
                    geo_location='warehouse-release', notes='Batch released to warehouse after QC approval.',
                )
        return batch

    def seed(self):
        today = date.today()

        # Users and profiles
        padma = self.upsert_user('mfg_padma', 'manufacturer', 'Tahmid Rahman', 'qa@padma-pharma.test', '01711000001')
        ManufacturerProfile.objects.update_or_create(user=padma, defaults={
            'company_name': 'Padma Pharmaceuticals Ltd', 'registration_number': 'DGDA-MFG-1001',
            'address': 'Tongi Industrial Area, Gazipur', 'contact_person': 'Tahmid Rahman', 'contact_phone': '01711000001',
        })
        meghna = self.upsert_user('mfg_meghna', 'manufacturer', 'Nusrat Jahan', 'compliance@meghna-life.test', '01711000002')
        ManufacturerProfile.objects.update_or_create(user=meghna, defaults={
            'company_name': 'Meghna Life Sciences Ltd', 'registration_number': 'DGDA-MFG-1002',
            'address': 'BSCIC Industrial Estate, Narayanganj', 'contact_person': 'Nusrat Jahan', 'contact_phone': '01711000002',
        })
        dgda = self.upsert_user('dgda_officer', 'dgda', 'Farhana Akter', 'officer@dgda.test', '01711000003')
        DGDAProfile.objects.update_or_create(user=dgda, defaults={'designation': 'Assistant Director', 'department': 'Drug Control & Inspection'})
        pharmacy = self.upsert_user('pharm_dhanmondi', 'pharmacy', 'Rakib Hasan', 'store@dhanmondi-care.test', '01711000004')
        PharmacyProfile.objects.update_or_create(user=pharmacy, defaults={
            'pharmacy_name': 'Dhanmondi Care Pharmacy', 'registration_number': 'DGDA-PHR-2231',
            'address': 'Road 27, Dhanmondi, Dhaka', 'contact_person': 'Rakib Hasan', 'contact_phone': '01711000004',
            'license_number': 'DL-2231', 'trust_score': Decimal('8.50'),
        })

        # Medicines
        def medicine(owner, name, generic, category, form, strength, approval, packaging):
            obj, _ = Medicine.objects.get_or_create(manufacturer=owner, name=name, strength=strength, defaults={
                'generic_name': generic, 'category': category, 'dosage_form': form,
                'regulatory_approval_number': approval, 'packaging': packaging,
            })
            return obj

        paracetamol = medicine(padma, 'Paracetamol', 'Acetaminophen', 'Analgesic', 'Tablet', '500mg', 'DAR-PP-0421', '10 x 10 blister strips')
        omeprazole = medicine(padma, 'Omeprazole', 'Omeprazole', 'Proton Pump Inhibitor', 'Capsule', '20mg', 'DAR-PP-0433', '6 x 10 blister strips')
        cefixime = medicine(padma, 'Cefixime', 'Cefixime Trihydrate', 'Antibiotic', 'Capsule', '200mg', 'DAR-PP-0457', '2 x 6 blister strips')
        metformin = medicine(meghna, 'Metformin', 'Metformin Hydrochloride', 'Antidiabetic', 'Tablet', '500mg', 'DAR-ML-0112', '10 x 10 blister strips')
        amlodipine = medicine(meghna, 'Amlodipine', 'Amlodipine Besilate', 'Antihypertensive', 'Tablet', '5mg', 'DAR-ML-0119', '3 x 10 blister strips')

        # Batches: released, pending QC, QC-failed/recalled, expiring soon, awaiting release
        pcm_batch = self.create_batch(padma, paracetamol, 'PP-PCM-2601', 90, 730, 500, 'passed', released=True)
        self.create_batch(padma, omeprazole, 'PP-OMZ-2602', 5, 730, 300, 'pending', released=False)
        cfx_batch = self.create_batch(padma, cefixime, 'PP-CFX-2603', 60, 540, 250, 'failed', released=False, status='recalled')
        met_batch = self.create_batch(meghna, metformin, 'ML-MET-2601', 700, 725, 400, 'passed', released=True)
        self.create_batch(meghna, amlodipine, 'ML-AML-2602', 12, 730, 200, 'passed', released=False)

        # Quality tests
        for batch, test_name, result, value, out_of_spec in [
            (pcm_batch, 'Dissolution', 'Pass', '98.2%', False),
            (pcm_batch, 'Assay', 'Pass', '100.4%', False),
            (met_batch, 'Dissolution', 'Pass', '96.7%', False),
            (cfx_batch, 'Sterility', 'Fail', 'Microbial growth detected', True),
        ]:
            QualityTest.objects.get_or_create(batch=batch, test_name=test_name, defaults={
                'test_result': result, 'result_value': value, 'is_out_of_spec': out_of_spec,
                'conducted_date': batch.manufacturing_date + timedelta(days=3),
            })

        # Recall on the QC-failed batch. bulk_create skips the Recall post_save signal, which currently
        # recurses forever (it re-saves the instance inside post_save); the batch is already marked recalled above.
        if not Recall.objects.filter(batch=cfx_batch).exists():
            Recall.objects.bulk_create([Recall(
                batch=cfx_batch,
                reason='Sterility test failure: microbial growth detected in retained samples.',
                issued_by_user=padma,
                date_issued=today - timedelta(days=3),
                status='active',
                progress_percent=35,
                halted_sales=True,
                notified_downstream_at=timezone.now() - timedelta(days=3),
                description='All pharmacies holding batch PP-CFX-2603 must quarantine stock and return it to the distributor.',
            )])

        # Inspections by the DGDA officer
        Inspection.objects.get_or_create(inspector=dgda, entity_type='manufacturer', entity_id=padma.id, status='completed', defaults={
            'inspection_date': today - timedelta(days=10),
            'findings': 'GMP audit of the sterile production line. Minor documentation gaps in cleanroom logs; corrective action requested within 30 days.',
        })
        Inspection.objects.get_or_create(inspector=dgda, entity_type='manufacturer', entity_id=meghna.id, status='scheduled', defaults={
            'inspection_date': today + timedelta(days=7),
            'findings': 'Routine annual inspection.',
        })

        # Compliance items for the manufacturer dashboard
        ComplianceItem.objects.get_or_create(owner=padma, title='GMP certificate renewal', defaults={'due_date': today + timedelta(days=45), 'status': 'approved'})
        ComplianceItem.objects.get_or_create(owner=padma, title='Cleanroom log corrective action report', defaults={'due_date': today + timedelta(days=20), 'status': 'pending'})

        # Pharmacy stock so DGDA Entities / Emergency Response tabs have data
        Inventory.objects.get_or_create(batch=pcm_batch, entity_type='pharmacy', entity_id=pharmacy.id, defaults={'quantity': 120})
        Inventory.objects.get_or_create(batch=met_batch, entity_type='pharmacy', entity_id=pharmacy.id, defaults={'quantity': 4})
