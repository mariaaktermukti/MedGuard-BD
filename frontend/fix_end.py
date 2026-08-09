path = r'D:\MedGuard-BD\frontend\src\pages\citizen\AIAssistant.jsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# find the button opening tag on line 212
idx = -1
for i, line in enumerate(lines):
    if '<button type="submit" className="btn btn-primary"' in line:
        idx = i
        break

if idx != -1:
    lines = lines[:idx+1]
    lines.append('                        <PaperPlaneRight size={18} />\n')
    lines.append('                    </button>\n')
    lines.append('                </form>\n')
    lines.append('            </div>\n')
    lines.append('        </div>\n')
    lines.append('    );\n')
    lines.append('};\n')
    lines.append('\n')
    lines.append('export default AIAssistant;\n')

    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
