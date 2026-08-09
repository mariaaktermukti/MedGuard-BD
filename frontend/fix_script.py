import sys

path = r'D:\MedGuard-BD\frontend\src\pages\citizen\AIAssistant.jsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

lines[43] = '            setMessages(prev => [...prev, { role: \'assistant\', content: \"??????, ???? ?????? ???????\" }]);\n        } finally {\n            setLoading(false);\n        }\n    };\n\n    const parseInlineFormatting = (text) => {\n'

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
