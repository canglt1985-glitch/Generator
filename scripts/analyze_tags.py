import os
import zipfile
import re

TEMPLATE_DIR = "/Users/cang_it/Antigravity/TVT3/tvt3_v2/public/templates"

def analyze_file(filename):
    filepath = os.path.join(TEMPLATE_DIR, filename)
    if not os.path.exists(filepath):
        print(f"File not found: {filename}")
        return
        
    print(f"\n==========================================")
    print(f"ANALYZING: {filename}")
    print(f"==========================================")
    
    with zipfile.ZipFile(filepath, 'r') as docx:
        xml_content = docx.read('word/document.xml').decode('utf-8')
        
    plain_text = re.sub(r'<[^>]+>', '', xml_content)
    
    # Tìm tất cả các tag trong plaintext
    plaintext_tags = re.findall(r'\{\{[^}]*\}\}', plain_text)
    print(f"Total tags found in Plaintext: {len(plaintext_tags)}")
    
    # Đếm tần suất xuất hiện trong plaintext và raw XML
    tag_counts_plaintext = {}
    for tag in plaintext_tags:
        tag_counts_plaintext[tag] = tag_counts_plaintext.get(tag, 0) + 1
        
    print("\n--- Split Tags Analysis (By Count Comparison) ---")
    split_count = 0
    for tag, count_plain in tag_counts_plaintext.items():
        count_raw = xml_content.count(tag)
        if count_plain > count_raw:
            split_count += 1
            print(f"  ⚠️ SPLIT TAG DETECTED: \"{tag}\"")
            print(f"    Plaintext count: {count_plain}, Raw XML count: {count_raw}")
            
            # Tìm tất cả các vị trí khớp với regex của tag này xen kẽ XML tag
            # Để chỉ ra context bị split
            pattern_parts = [re.escape(c) for c in tag]
            pattern = '(?:<[^>]+>)*'.join(pattern_parts)
            for m in re.finditer(pattern, xml_content):
                matched_str = m.group(0)
                if '<' in matched_str:
                    start = max(0, m.start() - 40)
                    end = min(len(xml_content), m.end() + 40)
                    print(f"    Split Occurrence Raw XML: ... {xml_content[start:end]} ...\n")
                    
    # Tìm các dấu ngoặc nhọn '{' và '}' lẻ trong raw XML
    print("--- Single Braces Analysis (Raw XML) ---")
    single_xml_opens = re.findall(r'(?<!\{)\{(?!\{)', xml_content)
    single_xml_closes = re.findall(r'(?<!\})\}(?!\})', xml_content)
    print("  Single '{' in raw XML:", len(single_xml_opens))
    print("  Single '}' in raw XML:", len(single_xml_closes))
    
    for match in re.finditer(r'(?<!\{)\{(?!\{)', xml_content):
        start = max(0, match.start() - 50)
        end = min(len(xml_content), match.end() + 50)
        print("    Single open '{': ...", xml_content[start:end], "...")
        
    for match in re.finditer(r'(?<!\})\}(?!\})', xml_content):
        start = max(0, match.start() - 50)
        end = min(len(xml_content), match.end() + 50)
        print("    Single close '}': ...", xml_content[start:end], "...")

if __name__ == "__main__":
    analyze_file("HOP_DONG_MOI_MAT_BANG.docx")
