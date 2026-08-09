import sys

path = r'D:\MedGuard-BD\frontend\src\pages\citizen\AIAssistant.jsx'
with open(path, 'rb') as f:
    lines = f.readlines()

new_line = '            setMessages(prev => [...prev, { role: \'assistant\', content: \"??????, ???? ?????? ???????\" }]);\n        } finally {\n            setLoading(false);\n        }\n    };\n\n    const parseInlineFormatting = (text) => {\n'.encode('utf-8')

lines[43] = new_line

with open(path, 'wb') as f:
    f.writelines(lines)
