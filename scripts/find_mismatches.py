import os
import zipfile
import re

TEMPLATE_DIR = "/Users/cang_it/Antigravity/TVT3/tvt3_v2/public/templates"

def print_address_context(filename):
    filepath = os.path.join(TEMPLATE_DIR, filename)
    if not os.path.exists(filepath):
        return
    
    with zipfile.ZipFile(filepath, 'r') as docx:
        xml_content = docx.read('word/document.xml').decode('utf-8')
        plain_text = re.sub(r'<[^>]+>', '', xml_content)
        
        print(f"\n📄 File: {filename}")
        matches = [m.start() for m in re.finditer("Địa chỉ trạm", plain_text)]
        for idx in matches:
            print(f"  Context: {plain_text[idx:idx+120]}")

if __name__ == "__main__":
    print_address_context("THANH_LY_KY_LAI_MAT_BANG.docx")
    print_address_context("THANH_LY_KY_MOI_MAT_BANG.docx")
