import os
import zipfile
import tempfile
import shutil

TEMPLATE_DIR = "/Users/cang_it/Antigravity/TVT3/tvt3_v2/public/templates"

def fix_hop_dong_moi_mat_bang():
    filename = "HOP_DONG_MOI_MAT_BANG.docx"
    filepath = os.path.join(TEMPLATE_DIR, filename)
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return False
        
    # Tạo bản sao lưu backup.docx nếu chưa có
    backup_path = filepath + ".bak"
    if not os.path.exists(backup_path):
        shutil.copy2(filepath, backup_path)
        print(f"Created backup: {filename}.bak")
        
    temp_dir = tempfile.mkdtemp()
    try:
        with zipfile.ZipFile(filepath, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
            
        xml_path = os.path.join(temp_dir, 'word', 'document.xml')
        with open(xml_path, 'r', encoding='utf-8') as f:
            xml = f.read()
            
        print("Starting replacement corrections...")
        
        # 1. Sửa lỗi split {{ADDRESS_OLD}} vị trí 1
        target_1 = '{{ADDRESS_OLD</w:t></w:r><w:proofErr w:type="gramStart"/><w:r w:rsidRPr="005354A6"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:szCs w:val="28"/><w:lang w:val="da-DK"/></w:rPr><w:t>}}</w:t></w:r>'
        replacement_1 = '{{ADDRESS_OLD}}</w:t></w:r><w:proofErr w:type="gramStart"/><w:r w:rsidRPr="005354A6"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:szCs w:val="28"/><w:lang w:val="da-DK"/></w:rPr><w:t></w:t></w:r>'
        
        # 2. Sửa lỗi split {{ADDRESS_OLD}} vị trí 2
        target_2 = ':{</w:t></w:r><w:proofErr w:type="gramEnd"/><w:r w:rsidRPr="005354A6"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:szCs w:val="26"/></w:rPr><w:t>{ADDRESS_OLD}} ({{ADDRESS_NEW}})</w:t>'
        replacement_2 = ':</w:t></w:r><w:proofErr w:type="gramEnd"/><w:r w:rsidRPr="005354A6"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:szCs w:val="26"/></w:rPr><w:t>{{ADDRESS_OLD}} ({{ADDRESS_NEW}})</w:t>'
        
        # 3. Sửa lỗi split {{ADDRESS_NEW}}
        target_3 = 'da-DK"/></w:rPr><w:t>{</w:t></w:r><w:proofErr w:type="gramEnd"/><w:r w:rsidR="008865A9" w:rsidRPr="005354A6"><w:rPr><w:rStyle w:val="Emphasis"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i w:val="0"/><w:iCs w:val="0"/><w:szCs w:val="28"/><w:lang w:val="da-DK"/></w:rPr><w:t>{ADDRESS_NEW}}</w:t>'
        replacement_3 = 'da-DK"/></w:rPr><w:t></w:t></w:r><w:proofErr w:type="gramEnd"/><w:r w:rsidR="008865A9" w:rsidRPr="005354A6"><w:rPr><w:rStyle w:val="Emphasis"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i w:val="0"/><w:iCs w:val="0"/><w:szCs w:val="28"/><w:lang w:val="da-DK"/></w:rPr><w:t>{{ADDRESS_NEW}}</w:t>'
        
        # 4. Sửa lỗi split {{NEW_PRICE_TEXT}}
        target_4 = '{{NEW_PRICE_TEXT}</w:t></w:r><w:proofErr w:type="gramStart"/><w:r w:rsidRPr="005354A6"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:szCs w:val="26"/><w:lang w:val="vi-VN"/></w:rPr><w:t>})</w:t>'
        replacement_4 = '{{NEW_PRICE_TEXT}}</w:t></w:r><w:proofErr w:type="gramStart"/><w:r w:rsidRPr="005354A6"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:szCs w:val="26"/><w:lang w:val="vi-VN"/></w:rPr><w:t>)</w:t>'
        
        changed = False
        if target_1 in xml:
            xml = xml.replace(target_1, replacement_1)
            print("  -> Corrected split tag {{ADDRESS_OLD}} #1")
            changed = True
            
        if target_2 in xml:
            xml = xml.replace(target_2, replacement_2)
            print("  -> Corrected split tag {{ADDRESS_OLD}} #2")
            changed = True
            
        if target_3 in xml:
            xml = xml.replace(target_3, replacement_3)
            print("  -> Corrected split tag {{ADDRESS_NEW}}")
            changed = True
            
        if target_4 in xml:
            xml = xml.replace(target_4, replacement_4)
            print("  -> Corrected split tag {{NEW_PRICE_TEXT}}")
            changed = True
            
        if changed:
            with open(xml_path, 'w', encoding='utf-8') as f:
                f.write(xml)
                
            shutil.make_archive(filepath.replace('.docx', ''), 'zip', temp_dir)
            if os.path.exists(filepath):
                os.remove(filepath)
            shutil.move(filepath.replace('.docx', '') + '.zip', filepath)
            print("Successfully updated HOP_DONG_MOI_MAT_BANG.docx!")
            return True
        else:
            print("No split patterns found in HOP_DONG_MOI_MAT_BANG.docx!")
            return False
            
    finally:
        shutil.rmtree(temp_dir)

if __name__ == "__main__":
    fix_hop_dong_moi_mat_bang()
