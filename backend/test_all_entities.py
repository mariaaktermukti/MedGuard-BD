import os
import django
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "medguard.settings")
django.setup()

from rest_framework.test import APIClient
from users.models import CustomUser, Role

def run_tests():
    print("--- Running DGDA Entity Integration Tests ---")
    client = APIClient()

    # Authenticate as DGDA Officer
    user = CustomUser.objects.get(username="dgda_officer")
    client.force_authenticate(user=user)

    # 1. Test Command Center View
    res = client.get('/api/core/dgda/command-center/')
    assert res.status_code == 200, f"Command Center failed: {res.status_code} {res.content}"
    print("[OK] Command Center API: 200 OK")

    # 2. Test Monitoring List View
    res = client.get('/api/core/dgda/monitoring/')
    assert res.status_code == 200, f"Monitoring List failed: {res.status_code}"
    print("[OK] Monitoring List API: 200 OK")

    # 3. Test Entities Summary & Index across all 7 Entities
    res = client.get('/api/core/dgda/entities/')
    assert res.status_code == 200, f"Entities List failed: {res.status_code}"
    summary = res.data.get('summary', {})
    print("[OK] Entities Index API: 200 OK")
    print(f"   - Manufacturers: {summary.get('total_manufacturers')}")
    print(f"   - Pharmacies: {summary.get('total_pharmacies')}")
    print(f"   - Distributors: {summary.get('total_distributors')}")
    print(f"   - Doctors: {summary.get('total_doctors')}")
    print(f"   - Citizens: {summary.get('total_citizens')}")
    print(f"   - Researchers: {summary.get('total_researchers')}")
    print(f"   - Medicines: {summary.get('total_medicines')}")

    # 4. Test Detail Modal for each Entity type
    entity_types = ['manufacturer', 'pharmacy', 'distributor', 'doctor', 'citizen', 'researcher']
    for etype in entity_types:
        # Search first to get ID
        search_res = client.get(f'/api/core/dgda/entities/?type={etype}')
        entities = search_res.data.get('entities', [])
        if entities:
            eid = entities[0]['id']
            detail_res = client.get(f'/api/core/dgda/entities/detail/?type={etype}&id={eid}')
            assert detail_res.status_code == 200, f"Detail failed for {etype}: {detail_res.status_code}"
            print(f"[OK] Entity Detail API ({etype.title()} ID: {eid}): 200 OK")

    print("\nALL DGDA BACKEND & ENTITY CONNECTION TESTS PASSED 100%!")

if __name__ == '__main__':
    run_tests()
