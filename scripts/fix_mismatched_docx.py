import os
import zipfile
import tempfile
import shutil
import re

TEMPLATE_DIR = "/Users/cang_it/Antigravity/TVT3/tvt3_v2/public/templates"

def fix_docx_flat(filename):
    """Fixes cases where the tag is in a single XML text node (not split by runs)"""
    filepath = os.path.join(TEMPLATE_DIR, filename)
    if not os.path.exists(filepath):
        return False
    
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
            xml_content = f.read()
            
        target = "{{ADDRESS_OLD{{ADDRESS_NEW}}"
        replacement = "{{ADDRESS_OLD}} ({{ADDRESS_NEW}})"
        
        if target in xml_content:
            xml_content = xml_content.replace(target, replacement)
            print(f"  -> Fixed flat tag in {filename}")
            
            with open(xml_path, 'w', encoding='utf-8') as f:
                f.write(xml_content)
                
            shutil.make_archive(filepath.replace('.docx', ''), 'zip', temp_dir)
            os.remove(filepath)
            shutil.move(filepath.replace('.docx', '') + '.zip', filepath)
            return True
        return False
    finally:
        shutil.rmtree(temp_dir)

def fix_docx_split(filename):
    """Fixes cases where the tag is split across multiple runs/nodes"""
    filepath = os.path.join(TEMPLATE_DIR, filename)
    if not os.path.exists(filepath):
        return False
    
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
            xml_content = f.read()
            
        pattern = r'(Địa chỉ trạm:\s*\{\{ADDRESS_OLD)(.*?<w:t>)\{\{ADDRESS_NEW\}\}'
        
        if re.search(pattern, xml_content):
            new_content = re.sub(pattern, r'\1}} (\2{{ADDRESS_NEW}})', xml_content)
            print(f"  -> Fixed split tag in {filename}")
            
            with open(xml_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
                
            shutil.make_archive(filepath.replace('.docx', ''), 'zip', temp_dir)
            os.remove(filepath)
            shutil.move(filepath.replace('.docx', '') + '.zip', filepath)
            return True
        return False
    finally:
        shutil.rmtree(temp_dir)

if __name__ == "__main__":
    # 1. HOP_DONG_MOI_MAT_BANG is already fixed by flat replace or can be checked
    fix_docx_flat("HOP_DONG_MOI_MAT_BANG.docx")
    
    # 2. Split templates
    fix_docx_split("THANH_LY_KY_LAI_MAT_BANG.docx")
    fix_docx_split("THANH_LY_KY_MOI_MAT_BANG.docx")
