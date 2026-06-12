import os
import zipfile
import re

TEMPLATE_DIR = "/Users/cang_it/Antigravity/TVT3/tvt3_v2/public/templates"

def inspect_docx(filename):
    filepath = os.path.join(TEMPLATE_DIR, filename)
    if not os.path.exists(filepath):
        print(f"File not found: {filename}")
        return
    
    try:
        with zipfile.ZipFile(filepath, 'r') as docx:
            xml_content = docx.read('word/document.xml').decode('utf-8')
            
            # Count exact occurrences of {{ and }} in raw XML (before stripping tags)
            raw_opens = xml_content.count('{{')
            raw_closes = xml_content.count('}}')
            
            # Strip XML tags to find tags that are not split
            plain_text = re.sub(r'<[^>]+>', '', xml_content)
            plain_opens = plain_text.count('{{')
            plain_closes = plain_text.count('}}')
            
            # Find all tag names in plain text
            tags = re.findall(r'\{\{([^}]+)\}\}', plain_text)
            
            print(f"\n📄 File: {filename}")
            print(f"  Raw XML counts   : opens={raw_opens}, closes={raw_closes}")
            print(f"  Plaintext counts : opens={plain_opens}, closes={plain_closes}")
            
            # Print mismatched tags or details
            if raw_opens != raw_closes or plain_opens != plain_closes:
                print("  ⚠️ ALERT: Tag count mismatch detected!")
                # Find unbalanced brackets
                # Let's count individual { and }
                total_open_curly = xml_content.count('{')
                total_close_curly = xml_content.count('}')
                print(f"  Total individual curly: {{ = {total_open_curly}, }} = {total_close_curly}")
            else:
                print("  ✅ Brackets are balanced in raw and plaintext.")
            
    except Exception as e:
        print(f"Error reading {filename}: {e}")

if __name__ == "__main__":
    files = [f for f in os.listdir(TEMPLATE_DIR) if f.endswith('.docx') and not f.startswith('~$')]
    for f in sorted(files):
        inspect_docx(f)
