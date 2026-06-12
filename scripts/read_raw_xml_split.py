import zipfile
import os

TEMPLATE_DIR = "/Users/cang_it/Antigravity/TVT3/tvt3_v2/public/templates"

def read_raw_xml(filename):
    filepath = os.path.join(TEMPLATE_DIR, filename)
    with zipfile.ZipFile(filepath, 'r') as docx:
        xml_content = docx.read('word/document.xml').decode('utf-8')
        
        # Find all occurrences of "Địa chỉ trạm"
        indices = [i for i in range(len(xml_content)) if xml_content.startswith("Địa chỉ trạm", i)]
        print(f"Found {len(indices)} occurrences of 'Địa chỉ trạm' in raw XML of {filename}.")
        for idx, pos in enumerate(indices):
            print(f"\n--- Occurrence {idx+1} (pos {pos}): ---")
            print(xml_content[pos:pos+1000])

if __name__ == "__main__":
    read_raw_xml("THANH_LY_KY_LAI_MAT_BANG.docx")
