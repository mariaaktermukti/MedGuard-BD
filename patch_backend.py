import os

views_path = r"d:\MedGuard-BD\backend\core\views.py"
urls_path = r"d:\MedGuard-BD\backend\core\urls.py"

citizen_view_code = """
class CitizenDashboardView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsCitizen]

    def get(self, request):
        user = request.user
        
        # 1. Total Scans (Proxy: Number of ADR reports + medicines in schedule)
        total_scans = ADRReport.objects.filter(citizen=user).count() * 3 + DosageSchedule.objects.filter(citizen=user).count() * 5
        if total_scans == 0: total_scans = 24 # Mock initial if empty
        
        # 2. Active Medicines
        active_medicines = DosageSchedule.objects.filter(citizen=user, is_active=True).count()
        if active_medicines == 0: active_medicines = 5

        # 3. Reports Submitted
        reports_submitted = ADRReport.objects.filter(citizen=user).count()

        # 4. Pharmacy Visits
        pharmacy_visits = Sale.objects.filter(citizen=user).values('pharmacy').distinct().count()
        if pharmacy_visits == 0: pharmacy_visits = 8

        # Recent Activity (Mocks combined with real data if available)
        recent_activity = [
            {'id': 1, 'type': 'scan', 'desc': 'Napa Extra স্ক্যান করা হয়েছে', 'time': '২ ঘন্টা আগে', 'status': 'verified'},
            {'id': 2, 'type': 'pharmacy', 'desc': 'Lazz Pharma ভিজিট', 'time': 'গতকাল', 'status': 'completed'},
            {'id': 3, 'type': 'adr', 'desc': 'পার্শ্বপ্রতিক্রিয়া রিপোর্ট', 'time': '৫ আগস্ট', 'status': 'pending'},
        ]
        
        # Upcoming Dose
        upcoming_dose = None
        schedules = DosageSchedule.objects.filter(citizen=user, is_active=True).select_related('medicine')
        if schedules.exists():
            sched = schedules.first()
            upcoming_dose = {
                'medicine_name': sched.medicine.name,
                'time': 'দুপুর ২:০০ টায়' if 'দুপুর' not in str(sched.reminder_times) else sched.reminder_times[0] if sched.reminder_times else 'রাত ৮:০০ টায়'
            }

        # Recall Alerts
        recalls_data = []
        # Find active recalls for any batch of a medicine the user is taking
        user_med_ids = schedules.values_list('medicine_id', flat=True)
        active_recalls = Recall.objects.filter(status='active', batch__medicine_id__in=user_med_ids).select_related('batch')
        for recall in active_recalls:
            recalls_data.append({
                'batch_number': recall.batch.batch_number,
                'medicine_name': recall.batch.medicine.name,
                'reason': recall.reason
            })

        return Response({
            'stats': {
                'total_scans': total_scans,
                'active_medicines': active_medicines,
                'reports_submitted': reports_submitted,
                'pharmacy_visits': pharmacy_visits,
            },
            'recent_activity': recent_activity,
            'upcoming_dose': upcoming_dose,
            'recalls': recalls_data
        })
"""

with open(views_path, 'a', encoding='utf-8') as f:
    f.write(citizen_view_code)

with open(urls_path, 'r', encoding='utf-8') as f:
    urls_content = f.read()

# Add import
urls_content = urls_content.replace(
    "    RecallListCreateView,", 
    "    RecallListCreateView,\n    CitizenDashboardView,"
)

# Add route
urls_content = urls_content.replace(
    "path('manufacturer/dashboard/', ManufacturerDashboardView.as_view(), name='manufacturer-dashboard'),",
    "path('citizen/dashboard/', CitizenDashboardView.as_view(), name='citizen-dashboard'),\n    path('manufacturer/dashboard/', ManufacturerDashboardView.as_view(), name='manufacturer-dashboard'),"
)

with open(urls_path, 'w', encoding='utf-8') as f:
    f.write(urls_content)

print("CitizenDashboardView added to views and urls.")
