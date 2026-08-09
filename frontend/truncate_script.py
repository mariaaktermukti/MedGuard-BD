path = r'D:\MedGuard-BD\frontend\src\pages\citizen\AIAssistant.jsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# find the last valid lines
# we want to truncate after export default AIAssistant;
for i, line in enumerate(lines):
    if line.strip() == 'export default AIAssistant;':
        lines = lines[:i+1]
        break

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
