import os
import django
import sys
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "medguard.settings")
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from users.models import CustomUser
from core.dgda_views import (
    DGDACommandCenterView, DGDAMonitoringViewSet, DGDAMonitoringSummaryView,
    DGDAEntitiesView, DGDAEntityDetailView
)

def run_tests():
    user = CustomUser.objects.filter(role='dgda').first()
    if not user:
        print("FAIL: No DGDA user found!")
        return

    factory = APIRequestFactory()

    print("1. Testing DGDACommandCenterView...")
    request = factory.get('/api/core/dgda/command-center/')
    force_authenticate(request, user=user)
    view = DGDACommandCenterView.as_view()
    response = view(request)
    print("Command Center Status:", response.status_code)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    print("KPIs:", response.data.get('kpis'))
    print("AI Summary:", response.data.get('ai_situation_summary'))

    print("\n2. Testing DGDAMonitoringViewSet (List & Filter)...")
    request = factory.get('/api/core/dgda/monitoring/?severity=critical')
    force_authenticate(request, user=user)
    view = DGDAMonitoringViewSet.as_view({'get': 'list'})
    response = view(request)
    print("Monitoring List Status:", response.status_code)
    assert response.status_code == 200
    res_list = response.data if isinstance(response.data, list) else response.data.get('results', [])
    print("Filtered Results Count:", len(res_list))

    print("\n3. Testing DGDAMonitoringSummaryView...")
    request = factory.get('/api/core/dgda/monitoring/summary/')
    force_authenticate(request, user=user)
    view = DGDAMonitoringSummaryView.as_view()
    response = view(request)
    print("Monitoring Summary Status:", response.status_code)
    assert response.status_code == 200
    print("Summary Data:", response.data)

    print("\n4. Testing DGDAEntitiesView...")
    request = factory.get('/api/core/dgda/entities/?search=Square')
    force_authenticate(request, user=user)
    view = DGDAEntitiesView.as_view()
    response = view(request)
    print("Entities Search Status:", response.status_code)
    assert response.status_code == 200
    print("Entities Found:", len(response.data.get('entities', [])))

    print("\n5. Testing DGDAEntityDetailView...")
    m_user = CustomUser.objects.filter(role='manufacturer').first()
    if m_user:
        request = factory.get(f'/api/core/dgda/entities/detail/?type=manufacturer&id={m_user.id}')
        force_authenticate(request, user=user)
        view = DGDAEntityDetailView.as_view()
        response = view(request)
        print("Entity Detail Status:", response.status_code)
        assert response.status_code == 200
        print("Entity Name:", response.data.get('basic_info', {}).get('name'))
        print("Risk Profile:", response.data.get('risk_profile'))

    print("\nALL BACKEND TESTS PASSED SUCCESSFULLY! ✅")

if __name__ == "__main__":
    run_tests()
