import json
import os
from urllib import error, request

from core.models import Medicine, Prescription


def _chat_completion(api_key, model, messages, is_openrouter=False):
    api_url = (
        "https://openrouter.ai/api/v1/chat/completions"
        if is_openrouter
        else "https://api.openai.com/v1/chat/completions"
    )
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if is_openrouter:
        headers.update({
            "HTTP-Referer": os.environ.get("OPENROUTER_SITE_URL", "http://localhost:5173"),
            "X-Title": os.environ.get("OPENROUTER_APP_NAME", "MedGuard BD"),
        })

    payload = json.dumps({
        "model": model,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 1024,
    }).encode("utf-8")

    chat_request = request.Request(api_url, data=payload, headers=headers, method="POST")
    try:
        with request.urlopen(chat_request, timeout=45) as response:
            data = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"AI provider returned HTTP {exc.code}: {error_body}") from exc

    return data["choices"][0]["message"]["content"]


def check_prescription_warnings(citizen_id, items, exclude_prescription_id=None):
    warnings = []

    medicine_ids = []
    medicine_names_input = []
    for item in items:
        med = item.get('medicine')
        if not med:
            continue
        if str(med).isdigit():
            medicine_ids.append(int(med))
        else:
            medicine_names_input.append(str(med).strip().lower())

    medicine_names = dict(Medicine.objects.filter(id__in=medicine_ids).values_list('id', 'name'))

    seen = set()
    flagged_duplicates = set()
    for item in items:
        med = item.get('medicine')
        if not med:
            continue
        med_key = int(med) if str(med).isdigit() else str(med).strip().lower()
        if med_key in seen and med_key not in flagged_duplicates:
            display_name = medicine_names.get(med_key, str(med))
            warnings.append(f'{display_name} is listed more than once in this prescription.')
            flagged_duplicates.add(med_key)
        seen.add(med_key)

    active_prescriptions = Prescription.objects.filter(
        citizen_id=citizen_id, status='active'
    ).select_related('doctor').prefetch_related('items__medicine')
    if exclude_prescription_id:
        active_prescriptions = active_prescriptions.exclude(pk=exclude_prescription_id)

    for prescription in active_prescriptions:
        for p_item in prescription.items.all():
            if p_item.medicine:
                p_med_name = p_item.medicine.name.strip().lower()
                if p_item.medicine_id in medicine_ids or p_med_name in medicine_names_input:
                    warnings.append(
                        f'Patient already has an active prescription for {p_item.medicine.name} '
                        f'(by Dr. {prescription.doctor.username} on {prescription.prescription_date.date()}).'
                    )

    return warnings

