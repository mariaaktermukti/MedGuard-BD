import os
import re

files_to_update = [
    r"src\pages\Dashboard.jsx",
    r"src\pages\citizen\DrugPassport.jsx",
    r"src\pages\manufacturer\ManufacturerPortal.jsx",
    r"src\components\Sidebar.jsx"
]

icon_mapping = {
    'Activity': 'Pulse',
    'CalendarDays': 'CalendarBlank',
    'CheckCircle2': 'CheckCircle',
    'ClipboardPlus': 'ClipboardText'
}

def fix_missing_exports(filepath):
    if not os.path.exists(filepath):
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    for old_icon, new_icon in icon_mapping.items():
        if old_icon in content:
            content = re.sub(r'\b' + old_icon + r'\b', new_icon, content)
                
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {filepath}")

if __name__ == '__main__':
    os.chdir(r"d:\MedGuard-BD\frontend")
    for f in files_to_update:
        fix_missing_exports(f)
