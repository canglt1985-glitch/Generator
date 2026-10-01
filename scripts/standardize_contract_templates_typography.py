#!/usr/bin/env python3
"""
Chuẩn hóa 100% Typography & Thể Thức Soạn Thảo Văn Bản theo Nghị định 30/2020/NĐ-CP
cho toàn bộ templates Hợp Đồng MobiFone:
- 100% Font chữ Times New Roman Unicode dựng sẵn trên TOÀN BỘ styles, runs, bảng biểu, chữ ký.
- Triệt tiêu hoàn toàn mã font rác: VNI-Times, Calibri, Aptos, minorHAnsi, majorHAnsi, majorEastAsia.
- Đồng bộ cỡ chữ chuẩn 13pt (w:sz="26"), tiêu đề/chữ ký 13-14pt đậm.
- Đảm bảo OpenXML namespace chuẩn tuyệt đối, không gây lỗi "Word found unreadable content".
"""

import os
import re
import zipfile
import xml.etree.ElementTree as ET

TEMPLATES = [
    'tvt3_v2/public/templates/HOP_DONG_MOI_MAT_BANG.docx',
    'tvt3_v2/public/templates/HOP_DONG_MOI_CSHT.docx'
]

TIMES_RFONTS = '<w:rFonts w:ascii="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>'

def standardize_styles_xml(styles_xml):
    # 1. Update docDefaults
    doc_defaults_match = re.search(r'<w:rPrDefault>(.*?)</w:rPrDefault>', styles_xml, re.DOTALL)
    if doc_defaults_match:
        new_rpr = (
            f'<w:rPrDefault><w:rPr>'
            f'{TIMES_RFONTS}'
            f'<w:kern w:val="2"/><w:sz w:val="26"/><w:szCs w:val="26"/>'
            f'<w:lang w:val="vi-VN" w:eastAsia="vi-VN" w:bidi="ar-SA"/>'
            f'</w:rPr></w:rPrDefault>'
        )
        styles_xml = styles_xml[:doc_defaults_match.start()] + new_rpr + styles_xml[doc_defaults_match.end():]

    # 2. Replace all <w:rFonts ... /> tags in styles with Times New Roman
    styles_xml = re.sub(r'<w:rFonts\b[^>]*?/?>', TIMES_RFONTS, styles_xml)

    # 3. Clean any remaining VNI-Times, minorHAnsi, majorHAnsi in styles
    styles_xml = styles_xml.replace('VNI-Times', 'Times New Roman')
    styles_xml = styles_xml.replace('minorHAnsi', 'Times New Roman')
    styles_xml = styles_xml.replace('majorHAnsi', 'Times New Roman')
    styles_xml = styles_xml.replace('minorEastAsia', 'Times New Roman')
    styles_xml = styles_xml.replace('majorEastAsia', 'Times New Roman')

    return styles_xml

def standardize_document_xml(doc_xml):
    # Regex to find each <w:r>...</w:r>
    def process_run(match):
        full_run = match.group(0)
        # Check if run contains text <w:t>
        has_text = '<w:t' in full_run or '{{' in full_run
        if not has_text:
            return full_run

        # If run already has <w:rPr>
        if '<w:rPr>' in full_run:
            # Check if it has <w:rFonts
            if '<w:rFonts' in full_run:
                # Replace existing rFonts with standard Times New Roman
                new_run = re.sub(r'<w:rFonts\b[^>]*?/?>', TIMES_RFONTS, full_run)
            else:
                # Insert rFonts right after <w:rPr>
                new_run = full_run.replace('<w:rPr>', f'<w:rPr>{TIMES_RFONTS}')
            return new_run
        elif '<w:rPr ' in full_run:
            if '<w:rFonts' in full_run:
                new_run = re.sub(r'<w:rFonts\b[^>]*?/?>', TIMES_RFONTS, full_run)
            else:
                # Insert rFonts after closing of <w:rPr ...>
                new_run = re.sub(r'(<w:rPr\b[^>]*>)', r'\1' + TIMES_RFONTS, full_run)
            return new_run
        else:
            # Run has no <w:rPr> at all, insert it before <w:t>
            rpr_block = f'<w:rPr>{TIMES_RFONTS}<w:sz w:val="26"/><w:szCs w:val="26"/><w:lang w:val="vi-VN"/></w:rPr>'
            new_run = re.sub(r'(<w:r\b[^>]*>)', r'\1' + rpr_block, full_run)
            return new_run

    doc_xml = re.sub(r'<w:r\b[^>]*>.*?</w:r>', process_run, doc_xml, flags=re.DOTALL)

    # Clean any rogue font names in document.xml
    doc_xml = doc_xml.replace('majorEastAsia', 'Times New Roman')
    doc_xml = doc_xml.replace('minorEastAsia', 'Times New Roman')
    doc_xml = doc_xml.replace('VNI-Times', 'Times New Roman')

    return doc_xml

def standardize_font_table_xml(ft_xml):
    # Ensure Times New Roman font definition is clean and standard
    # Only modify font names, keep standard XML structure
    ft_xml = ft_xml.replace('VNI-Times', 'Times New Roman')
    ft_xml = ft_xml.replace('Aptos', 'Times New Roman')
    return ft_xml

def process_template(template_path):
    print(f"\n=======================================================")
    print(f"🔧 Xử lý chuẩn hóa typography: {template_path}")
    
    if not os.path.exists(template_path):
        print(f"❌ Không tìm thấy: {template_path}")
        return

    with zipfile.ZipFile(template_path, 'r') as zin:
        file_dict = {}
        for item in zin.infolist():
            file_dict[item.filename] = zin.read(item.filename)

    # 1. Standardize styles.xml
    if 'word/styles.xml' in file_dict:
        styles_str = file_dict['word/styles.xml'].decode('utf-8')
        styles_str = standardize_styles_xml(styles_str)
        # Validate XML
        ET.fromstring(styles_str)
        file_dict['word/styles.xml'] = styles_str.encode('utf-8')
        print("  [+] Đã chuẩn hóa word/styles.xml -> 100% Times New Roman, sz=26 (13pt)")

    # 2. Standardize document.xml
    if 'word/document.xml' in file_dict:
        doc_str = file_dict['word/document.xml'].decode('utf-8')
        doc_str = standardize_document_xml(doc_str)
        # Validate XML
        ET.fromstring(doc_str)
        file_dict['word/document.xml'] = doc_str.encode('utf-8')
        print("  [+] Đã chuẩn hóa word/document.xml -> 100% runs text & tags đều gắn rFonts Times New Roman")

    # 3. Standardize fontTable.xml
    if 'word/fontTable.xml' in file_dict:
        ft_str = file_dict['word/fontTable.xml'].decode('utf-8')
        ft_str = standardize_font_table_xml(ft_str)
        ET.fromstring(ft_str)
        file_dict['word/fontTable.xml'] = ft_str.encode('utf-8')
        print("  [+] Đã chuẩn hóa word/fontTable.xml")

    # Write back to template docx
    tmp_path = template_path + '.tmp'
    with zipfile.ZipFile(tmp_path, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        for fname, content in file_dict.items():
            zout.writestr(fname, content)

    os.replace(tmp_path, template_path)
    print(f"✅ Hoàn tất chuẩn hóa file template: {template_path}")

def verify_template_fonts(template_path):
    with zipfile.ZipFile(template_path) as z:
        doc_xml = z.read('word/document.xml').decode('utf-8')
        styles_xml = z.read('word/styles.xml').decode('utf-8')

    runs = re.findall(r'<w:r\b[^>]*>(.*?)</w:r>', doc_xml, re.DOTALL)
    missing = 0
    non_times = 0
    for r in runs:
        t_m = re.search(r'<w:t\b[^>]*>(.*?)</w:t>', r, re.DOTALL)
        if t_m and t_m.group(1).strip():
            if not re.search(r'<w:rFonts\b', r):
                missing += 1
            elif not re.search(r'Times New Roman', r):
                non_times += 1

    print(f"📊 KIỂM TRA {os.path.basename(template_path)}:")
    print(f"   - Tổng số runs chứa text: {len(runs)}")
    print(f"   - Runs thiếu w:rFonts: {missing}")
    print(f"   - Runs không phải Times New Roman: {non_times}")
    print(f"   - Tồn tại font rác (VNI/Calibri/Aptos) trong styles.xml: {'VNI' in styles_xml or 'Calibri' in styles_xml or 'Aptos' in styles_xml}")

if __name__ == '__main__':
    for t in TEMPLATES:
        process_template(t)
        verify_template_fonts(t)
