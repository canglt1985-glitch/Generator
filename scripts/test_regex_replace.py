import re
import zipfile
import os

TEMPLATE_DIR = "/Users/cang_it/Antigravity/TVT3/tvt3_v2/public/templates"

def test_replace(filename):
    filepath = os.path.join(TEMPLATE_DIR, filename)
    with zipfile.ZipFile(filepath, 'r') as docx:
        xml_content = docx.read('word/document.xml').decode('utf-8')
        
    # Search with localized regex
    pattern = r'(Địa chỉ trạm:\s*\{\{ADDRESS_OLD)(.*?<w:t>)\{\{ADDRESS_NEW\}\}'
    
    match = re.search(pattern, xml_content)
    if match:
        print(f"\nMatch found in {filename}!")
        print(f"Group 1: {match.group(1)}")
        print(f"Group 2: {match.group(2)[:200]}...")
        
        # Perform test replacement:
        # Group 1 (Địa chỉ trạm: {{ADDRESS_OLD) -> Địa chỉ trạm: {{ADDRESS_OLD}}
        # Group 2 (stuff in between) -> keep
        # {{ADDRESS_NEW}} -> ({{ADDRESS_NEW}})
        # So we want to replace with: \1}} (\2{{ADDRESS_NEW}})
        new_content = re.sub(pattern, r'\1}} (\2{{ADDRESS_NEW}})', xml_content)
        
        # Check balanced brackets in the new content plain text
        plain_text = re.sub(r'<[^>]+>', '', new_content)
        opens = plain_text.count('{{')
        closes = plain_text.count('}}')
        print(f"Post-fix tag counts: opens={opens}, closes={closes}")
        if opens == closes:
            print("✅ Brackets are balanced!")
        else:
            print("❌ Brackets are NOT balanced!")
    else:
        print(f"No match found in {filename}!")

if __name__ == "__main__":
    test_replace("THANH_LY_KY_LAI_MAT_BANG.docx")
    test_replace("THANH_LY_KY_MOI_MAT_BANG.docx")
