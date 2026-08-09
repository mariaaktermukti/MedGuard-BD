import os
import re

files_to_update = [
    r"src\pages\Register.jsx",
    r"src\pages\manufacturer\ManufacturerPortal.jsx",
    r"src\pages\Login.jsx",
    r"src\pages\Dashboard.jsx",
    r"src\pages\citizen\ReportADR.jsx",
    r"src\pages\citizen\PharmacyFinder.jsx",
    r"src\pages\citizen\MyMedicines.jsx",
    r"src\pages\citizen\DrugPassport.jsx",
    r"src\pages\citizen\AIAssistant.jsx",
    r"src\components\Sidebar.jsx",
    r"src\components\Navbar.jsx"
]

icon_mapping = {
    'AlertTriangle': 'Warning',
    'Mic': 'Microphone',
    'MicOff': 'MicrophoneSlash',
    'Send': 'PaperPlaneRight',
    'Map': 'MapTrifold',
    'Search': 'MagnifyingGlass',
    'ShieldAlert': 'ShieldWarning',
    'MessageSquare': 'Chat',
    'Bot': 'Robot',
    'LayoutDashboard': 'SquaresFour',
    'Settings': 'Gear',
    'ScanLine': 'Scan',
    'BellRing': 'BellRinging',
    'LogOut': 'SignOut',
    # Others are mostly identical or already covered
}

def replace_in_file(filepath):
    if not os.path.exists(filepath):
        print(f"File {filepath} not found")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Replace the import source
    content = content.replace("'lucide-react'", "'@phosphor-icons/react'")
    content = content.replace('"lucide-react"', "'@phosphor-icons/react'")
    
    # Extract all imported icon names from lucide-react/phosphor-icons
    import_match = re.search(r"import\s+{([^}]+)}\s+from\s+'@phosphor-icons/react'", content)
    if import_match:
        icons_str = import_match.group(1)
        icons = [i.strip() for i in icons_str.split(',')]
        
        # Replace occurrences in the file
        for old_icon, new_icon in icon_mapping.items():
            if old_icon in content:
                # Replace in the import list and the tags
                content = re.sub(r'\b' + old_icon + r'\b', new_icon, content)
                
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")

if __name__ == '__main__':
    os.chdir(r"d:\MedGuard-BD\frontend")
    for f in files_to_update:
        replace_in_file(f)
