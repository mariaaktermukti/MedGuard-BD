from core.models import Medicine, Prescription


def check_prescription_warnings(citizen_id, items, exclude_prescription_id=None):
    warnings = []

    medicine_ids = [item.get('medicine') for item in items if item.get('medicine')]
    medicine_names = dict(Medicine.objects.filter(id__in=medicine_ids).values_list('id', 'name'))

    seen = set()
    flagged_duplicates = set()
    for medicine_id in medicine_ids:
        if medicine_id in seen and medicine_id not in flagged_duplicates:
            name = medicine_names.get(medicine_id, f'Medicine #{medicine_id}')
            warnings.append(f'{name} is listed more than once in this prescription.')
            flagged_duplicates.add(medicine_id)
        seen.add(medicine_id)

    active_prescriptions = Prescription.objects.filter(
        citizen_id=citizen_id, status='active'
    ).select_related('doctor').prefetch_related('items')
    if exclude_prescription_id:
        active_prescriptions = active_prescriptions.exclude(pk=exclude_prescription_id)

    for prescription in active_prescriptions:
        for item in prescription.items.all():
            if item.medicine_id in medicine_ids:
                name = medicine_names.get(item.medicine_id, f'Medicine #{item.medicine_id}')
                warnings.append(
                    f'Patient already has an active prescription for {name} '
                    f'(by Dr. {prescription.doctor.username} on {prescription.prescription_date.date()}).'
                )

    return warnings
