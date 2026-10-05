#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script: export_full_b4_file.py
Xuất Biểu Mẫu B4 Đề Nghị Sửa Chữa Chuyên Môn (Máy Phát Điện & Điều Hòa Không Khí)
Tất cả các Sheet nằm CHUNG 1 FILE DUY NHẤT theo đúng file mẫu của Ban 4 / Mobifone:
- Sheet 1: Điều hòa (25 cột)
- Sheet 2: Máy phát điện_Cố định (26 cột)
- Sheet 3: Máy phát điện_Di động (25 cột)
- Sheet 4: Diễn giải DM hỏng tham chiếu
- Sheet 5: Tỉnh
- Sheet 6: Thuộc tính tham khảo

TUYỆT ĐỐI KHÔNG ĐƯA CÁC CA HỎNG BÌNH ẮC QUY VÀO FILE B4!
"""

import os
import json
import ssl
import urllib.request
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

ORIGINAL_TEMPLATE = "/Users/cang_it/Library/CloudStorage/GoogleDrive-canglt1985@gmail.com/My Drive/datasite/sua chua mpd-dhkk/TVT3-B4. Biểu mẫu chuyên môn sua DHKK &  MPD.xlsx"
OUTPUT_DIR = "/Users/cang_it/Antigravity/TVT3/exports"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "TVT3-B4. Bieu mau chuyen mon sua DHKK & MPD.xlsx")

SUPABASE_URL = "https://lnmoczxjweuifacqujcu.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubW9jenhqd2V1aWZhY3F1amN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzcxOTYsImV4cCI6MjA5NDIxMzE5Nn0.C0Si7ChY4T_mxLylSkDNJOUcj9D0uuGW_L4t7p9yONI"

STATION_ERP_MAPPINGS = {
    'DNCM14': {'book_site': 'DNCM11', 'erp_code': '00021130', 'ma_vt': '00021130100001', 'ma_tscd_moi': '2027B1500000924'},
    'DNCM15': {'book_site': 'DNCM23', 'erp_code': '00021649', 'ma_vt': '00021649100001', 'ma_tscd_moi': '2027B1500000925'},
    'DNCM45': {'book_site': 'DNLK71', 'erp_code': '00022222', 'ma_vt': '00022222100001', 'ma_tscd_moi': '2027B1500000671'},
    'DNDQ03': {'book_site': 'DNTP44', 'erp_code': '00020511', 'ma_vt': '00020511100001', 'ma_tscd_moi': '2027B1500000640'},
    'DNDQ16': {'book_site': 'DNDQ16', 'erp_code': '00021185', 'ma_vt': '00021185100001', 'ma_tscd_moi': ''},
    'DNDQ31': {'book_site': 'DNDQ51', 'erp_code': '00020505', 'ma_vt': '00020505100001', 'ma_tscd_moi': '2027B1500000631'},
    'DNDQ58': {'book_site': 'DNDQ31', 'erp_code': '00020493', 'ma_vt': '00020493100001', 'ma_tscd_moi': '2027B1500000638'},
    'DNIDQN1': {'book_site': 'DNLTB8', 'erp_code': '00042789', 'ma_vt': '00042789100010', 'ma_tscd_moi': '2027B1500000980'},
    'DNLK73': {'book_site': 'DNTN24', 'erp_code': '00021782', 'ma_vt': '00021782100001', 'ma_tscd_moi': '2027B1500000773'},
    'DNTNL2': {'book_site': 'DNITNT1', 'erp_code': '00021860', 'ma_vt': '00021860100001', 'ma_tscd_moi': '2027B1500000882'},
    'DNTP23': {'book_site': 'DNTP23', 'erp_code': '00021837', 'ma_vt': '00021837100001', 'ma_tscd_moi': '2027B1500000613'},
    'DNTP30': {'book_site': 'DNTP08', 'erp_code': '00021002', 'ma_vt': '00021002100001', 'ma_tscd_moi': '2027B1500000130'},
    'DNTP34': {'book_site': 'DNTP42', 'erp_code': '00020491', 'ma_vt': '00020491100001', 'ma_tscd_moi': '2027B1500000140'},
    'DNTP42': {'book_site': 'DNTP42', 'erp_code': '00020491', 'ma_vt': '00020491100001', 'ma_tscd_moi': '2027B1500000140'},
    'DNTP53': {'book_site': 'DNTN43', 'erp_code': '00022160', 'ma_vt': '00022160100001', 'ma_tscd_moi': '2027B1500000153'},
    'DNDQ25': {'book_site': 'DNDQ23', 'erp_code': '00020990', 'ma_vt': '00020990100001', 'ma_tscd_moi': '2027B1500000490'},
    'DNLK37': {'book_site': 'DNLK14', 'erp_code': '00020612', 'ma_vt': '00020612100001', 'ma_tscd_moi': '2027B1500000717'},
    'DNDQ41': {'book_site': 'DNDQ05', 'erp_code': '00020930', 'ma_vt': '00020930100001', 'ma_tscd_moi': '2027B1500000858'},
    'DNXL37': {'book_site': 'DNLK40', 'erp_code': '00020650', 'ma_vt': '00020650100001', 'ma_tscd_moi': '2027B1500000937'},
    'DNXL49': {'book_site': 'DNLK27', 'erp_code': '00021048', 'ma_vt': '00021048100001', 'ma_tscd_moi': '2027B1500000949'},
    'DNXL65': {'book_site': 'DNTP03', 'erp_code': '00020811', 'ma_vt': '00020811100001', 'ma_tscd_moi': '2027B1500000965'},
    'DNXL75': {'book_site': 'DNXL45', 'erp_code': '00020599', 'ma_vt': '00020599100001', 'ma_tscd_moi': '2027B1500000975'},
    'DNXL77': {'book_site': 'DNLK42', 'erp_code': '00021049', 'ma_vt': '00021049100001', 'ma_tscd_moi': '2027B1500000977'}
}

def is_battery_issue(issues):
    if not issues:
        return False
    if issues.get('proposal_type') == 'BATTERY_PURCHASE':
        return True
    if issues.get('proposal_type') == 'B4_REPAIR':
        return False
    cat = issues.get('category', '')
    if cat and cat != 'Máy phát điện':
        return False
    desc = str(issues.get('description', '')).lower()
    return any(w in desc for w in ['ắc quy', 'accu', 'acquy', 'ắc qui', 'bình đề', 'binh de', 'bình ắc'])

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch_supabase(endpoint):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    req = urllib.request.Request(url, headers={
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    })
    with urllib.request.urlopen(req, context=ctx) as resp:
        return json.loads(resp.read().decode('utf-8'))

def main():
    print("🚀 Bắt đầu xuất Biểu Mẫu B4 Chuyên Môn Sửa Chữa (Chung 1 File Duy Nhất)...")
    
    # 1. Tải dữ liệu từ Supabase
    defects = fetch_supabase("operation_defects_logs?order=date.desc")
    datasites = fetch_supabase("datasites?select=site_id,site_id_old,name,infrastructure_info")
    
    print(f"📊 Đã tải {len(defects)} tồn tại và {len(datasites)} trạm.")

    site_map = {}
    for s in datasites:
        s_id = str(s.get('site_id') or '').strip().upper()
        s_old = str(s.get('site_id_old') or '').strip().upper()
        if s_id:
            site_map[s_id] = s
        if s_old:
            site_map[s_old] = s

    # 2. Lọc các ca MPĐ và ĐHKK phát sinh mới cần đề xuất (LOẠI TRỪ ẮC QUY ĐỀ)
    mpd_new_items = []
    dhkk_new_items = []
    
    for d in defects:
        issues = d.get('existing_issues') or {}
        # Loại trừ nếu đã được duyệt B4
        if issues.get('b4_approved'):
            continue
        # Loại trừ bình ắc quy đề
        if is_battery_issue(issues):
            continue
            
        cat = issues.get('category')
        
        # B4 Ban 4 CHỈ duyệt MPĐ và ĐHKK. Tuyệt đối không lấy Hệ thống điện, Nhà trạm, Cột anten, Tiếp đất...
        if cat == 'Máy phát điện':
            mpd_new_items.append(d)
        elif cat == 'Máy lạnh':
            dhkk_new_items.append(d)

    print(f"⚡ Số ca MPĐ cố định phát sinh cần đề xuất B4: {len(mpd_new_items)}")
    print(f"❄️ Số ca ĐHKK phát sinh cần đề xuất B4: {len(dhkk_new_items)}")

    # 3. Mở file template gốc B4
    if not os.path.exists(ORIGINAL_TEMPLATE):
        raise FileNotFoundError(f"Không tìm thấy file mẫu: {ORIGINAL_TEMPLATE}")

    wb = openpyxl.load_workbook(ORIGINAL_TEMPLATE)
    
    # === HỆ THỐNG THẨM MỸ EXECUTIVE DESIGN SYSTEM ===
    thin_border = Border(
        left=Side(style='thin', color='A6A6A6'),
        right=Side(style='thin', color='A6A6A6'),
        top=Side(style='thin', color='A6A6A6'),
        bottom=Side(style='thin', color='A6A6A6')
    )
    
    header_info_fill = PatternFill(start_color='D9E1F2', end_color='D9E1F2', fill_type='solid')   # Xanh Băng thanh lịch
    header_cat_fill = PatternFill(start_color='FCE4D6', end_color='FCE4D6', fill_type='solid')    # Cam Nhạt kỹ thuật
    defect_badge_fill = PatternFill(start_color='FFF2CC', end_color='FFF2CC', fill_type='solid')  # Vàng Nắng ấm nổi bật
    
    header_font = Font(name='Times New Roman', size=11, bold=True, color='000000')
    header2_font = Font(name='Times New Roman', size=10, bold=True, italic=True, color='333333')
    regular_font = Font(name='Times New Roman', size=11, bold=False, color='000000')
    bold_site_font = Font(name='Times New Roman', size=11, bold=True, color='000000')
    defect_x_font = Font(name='Times New Roman', size=12, bold=True, color='C00000')              # Đỏ MobiFone đậm
    
    center_align = Alignment(horizontal='center', vertical='center')
    left_align = Alignment(horizontal='left', vertical='center')
    left_wrap_align = Alignment(horizontal='left', vertical='center', wrap_text=True)
    right_align = Alignment(horizontal='right', vertical='center')

    # -------------------------------------------------------------------------
    # SHEET 1: Máy phát điện_Cố định (26 Cột) - XUẤT ĐỢT 2 (CHƯA DUYỆT)
    # -------------------------------------------------------------------------
    ws_mpd = wb['Máy phát điện_Cố định']
    ws_mpd.sheet_properties.tabColor = 'ED7D31'  # Tab màu Đỏ Cam
    
    # Định dạng Header Row 1 & 2
    ws_mpd.row_dimensions[1].height = 68
    ws_mpd.row_dimensions[2].height = 22
    for c in range(1, 27):
        fill = header_info_fill if c <= 15 else header_cat_fill
        c1 = ws_mpd.cell(1, c)
        c1.font = header_font
        c1.fill = fill
        c1.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        c1.border = thin_border
        
        c2 = ws_mpd.cell(2, c)
        c2.font = header2_font
        c2.fill = fill
        c2.alignment = center_align
        c2.border = thin_border
    
    # Xóa sạch các dòng cũ nếu có từ dòng 3 trở đi để chỉ xuất danh sách trình duyệt mới
    if ws_mpd.max_row > 2:
        ws_mpd.delete_rows(3, ws_mpd.max_row - 2)

    write_row = 3
    current_stt = 1

    for d in mpd_new_items:
        raw_site_id = str(d.get('site_id') or '').strip().upper()
        erp_map = STATION_ERP_MAPPINGS.get(raw_site_id)
        site_obj = site_map.get(raw_site_id) or (site_map.get(erp_map['book_site']) if erp_map else {}) or {}
        # ƯU TIÊN LẤY THEO TÊN CŨ (Mã trạm cũ) THEO YÊU CẦU BAN 4
        display_site_id = erp_map['book_site'] if erp_map else (site_obj.get('site_id_old') or raw_site_id)

        site_obj = site_map.get(raw_site_id) or site_map.get(display_site_id) or {}
        infra = site_obj.get('infrastructure_info') or {}
        mpd_list = (infra.get('may_phat_dien') or {}).get('mpd') or []
        equip = mpd_list[0] if mpd_list else {}
        item = d.get('existing_issues') or {}

        phan_loai = item.get('phan_loai') or equip.get('phan_loai') or ('TSCĐ' if equip.get('ma_tai_san_moi') else 'Hiện vật')
        ten_tb = 'Máy phát điện'
        ma_vt = item.get('ma_vat_tu') or (erp_map.get('ma_vt') if erp_map else '') or equip.get('ma_vat_tu') or ''
        ma_tscd = item.get('ma_tscd_moi') or (erp_map.get('ma_tscd_moi') if erp_map else '') or equip.get('ma_tai_san_moi') or ''
        serial = item.get('serial') or (erp_map.get('serial') if erp_map else '') or equip.get('serial') or ''
        ngay_sd = item.get('ngay_su_dung') or equip.get('ngay_dua_vao_su_dung') or '2010-01-01'
        hang_sx = item.get('nhan_hieu') or equip.get('nhan_hieu') or 'KIBII'
        cong_suat = item.get('cong_suat') or equip.get('cong_suat') or '12.5'
        cong_cu_ql = equip.get('cong_cu_quan_ly') or 'Datasite'
        so_lan_sua = item.get('so_lan_sua_2025', equip.get('so_lan_sua_2025', 0))
        mo_ta = item.get('description') or 'Máy hư hỏng cần đề xuất sửa chữa'
        chi_phi = item.get('proposed_cost') or item.get('tong_chi_phi')

        # Xác định 11 hạng mục X
        selected_cats = set()
        if isinstance(item.get('b4_categories'), list):
            for c in item['b4_categories']:
                selected_cats.add(int(c))
        elif item.get('b4_category_idx') is not None:
            selected_cats.add(int(item['b4_category_idx']))

        if not selected_cats:
            desc_l = mo_ta.lower()
            if any(k in desc_l for k in ['đại tu', 'piston', 'bạc', 'trục cơ', 'xì nhớt', 'thổi gioăng']): selected_cats.add(0)
            if any(k in desc_l for k in ['avr', 'đầu phát', 'kích từ', 'mất pha', 'chổi than', 'cuộn dây']): selected_cats.add(1)
            if any(k in desc_l for k in ['đề', 'củ đề', 'solenoid', 'không đề', 'đề dai']): selected_cats.add(2)
            if any(k in desc_l for k in ['nhiên liệu', 'béc', 'bơm dầu', 'lọc dầu']): selected_cats.add(3)
            if any(k in desc_l for k in ['két nước', 'curoa', 'bơm nước', 'quạt', 'quá nhiệt']): selected_cats.add(4)
            if any(k in desc_l for k in ['ats', 'điều khiển', 'controller', 'timer', 'màn hình']): selected_cats.add(5)
            if any(k in desc_l for k in ['cb', 'mccb', 'contactor', 'công suất', 'đầu cos', 'chập điện']): selected_cats.add(6)
            if any(k in desc_l for k in ['turbo', 'tiêu âm', 'cổ bô', 'khí xả', 'lọc gió']): selected_cats.add(7)
            if any(k in desc_l for k in ['relay', 'bảo vệ', 'ngắt dầu']): selected_cats.add(8)
            if any(k in desc_l for k in ['dinamo', 'tiết chế']): selected_cats.add(9)
            if any(k in desc_l for k in ['bảo dưỡng', 'thử tải']): selected_cats.add(10)

        cat_marks = ['X' if i in selected_cats else '' for i in range(11)]

        row_vals = [
            current_stt, 'Đồng Nai', display_site_id, phan_loai, ten_tb,
            str(ma_vt) if ma_vt else '', str(ma_tscd) if ma_tscd else '',
            str(serial) if serial else '', ngay_sd, hang_sx,
            cong_suat, cong_cu_ql, so_lan_sua, mo_ta, chi_phi
        ] + cat_marks

        ws_mpd.row_dimensions[write_row].height = 30

        for col_idx, val in enumerate(row_vals, start=1):
            cell = ws_mpd.cell(write_row, col_idx, val)
            cell.border = thin_border
            
            # Cột Mã trạm: In đậm
            if col_idx == 3:
                cell.font = bold_site_font
                cell.alignment = center_align
            # Cột Mô tả hư hỏng: Canh trái, wrap text
            elif col_idx == 14:
                cell.font = regular_font
                cell.alignment = left_wrap_align
            # Cột Chi phí: Canh phải
            elif col_idx == 15:
                cell.font = regular_font
                cell.alignment = right_align
            # 11 Cột Hạng mục lỗi kỹ thuật: Nếu có 'X' thì nổi bật Badge Vàng + Chữ Đỏ
            elif col_idx >= 16:
                if val == 'X':
                    cell.font = defect_x_font
                    cell.fill = defect_badge_fill
                else:
                    cell.font = regular_font
                cell.alignment = center_align
            # Toàn bộ các cột mã và thông số khác: Canh giữa chuẩn mực
            else:
                cell.font = regular_font
                cell.alignment = center_align
                if col_idx == 6:
                    cell.number_format = '@'  # Đảm bảo mã VT 14 số không mất số 0 đầu

        current_stt += 1
        write_row += 1

    # -------------------------------------------------------------------------
    # SHEET 2: Điều hòa (25 Cột) - XUẤT ĐỢT 2 (CHƯA DUYỆT)
    # -------------------------------------------------------------------------
    ws_dhkk = wb['Điều hòa']
    ws_dhkk.sheet_properties.tabColor = '2E75B6'  # Tab màu Xanh Dương MobiFone
    
    # Định dạng Header Row 1 & 2
    ws_dhkk.row_dimensions[1].height = 68
    ws_dhkk.row_dimensions[2].height = 22
    for c in range(1, 26):
        fill = header_info_fill if c <= 14 else header_cat_fill
        c1 = ws_dhkk.cell(1, c)
        c1.font = header_font
        c1.fill = fill
        c1.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        c1.border = thin_border
        
        c2 = ws_dhkk.cell(2, c)
        c2.font = header2_font
        c2.fill = fill
        c2.alignment = center_align
        c2.border = thin_border
    
    if ws_dhkk.max_row > 2:
        ws_dhkk.delete_rows(3, ws_dhkk.max_row - 2)

    write_row_dhkk = 3
    current_stt_dhkk = 1

    print(f"📌 Sheet 'Điều hòa': Bắt đầu ghi từ dòng 3 (STT 1..{len(dhkk_new_items)}).")

    for d in dhkk_new_items:
        raw_site_id = str(d.get('site_id') or '').strip().upper()
        erp_map = STATION_ERP_MAPPINGS.get(raw_site_id)
        site_obj = site_map.get(raw_site_id) or (site_map.get(erp_map['book_site']) if erp_map else {}) or {}
        # ƯU TIÊN LẤY THEO TÊN CŨ (Mã trạm cũ) THEO YÊU CẦU BAN 4
        display_site_id = erp_map['book_site'] if erp_map else (site_obj.get('site_id_old') or raw_site_id)
        infra = site_obj.get('infrastructure_info') or {}
        ml_list = infra.get('may_lanh') or []
        equip = ml_list[0] if ml_list else {}
        item = d.get('existing_issues') or {}

        phan_loai = item.get('phan_loai') or equip.get('phan_loai') or 'CCDC'
        ten_tb = 'Điều hòa nhiệt độ'
        ma_tscd = item.get('ma_tscd_moi') or equip.get('ma_tai_san_moi') or equip.get('ma_vat_tu') or ''
        serial = item.get('serial') or equip.get('serial') or ''
        ngay_sd = item.get('ngay_su_dung') or equip.get('ngay_dua_vao_su_dung') or '2020-01-01'
        hang_sx = item.get('nhan_hieu') or equip.get('nhan_hieu') or 'DAIKIN-INVERTER'
        cong_suat = item.get('cong_suat') or equip.get('cong_suat') or '12.000'
        cong_cu_ql = 'Datasite'
        so_lan_sua = item.get('so_lan_sua_2025', 0)
        mo_ta = item.get('description') or 'Máy lạnh hư hỏng cần bảo dưỡng, sửa chữa'
        chi_phi = item.get('proposed_cost')

        selected_cats = set()
        if isinstance(item.get('b4_categories'), list):
            for c in item['b4_categories']:
                selected_cats.add(int(c))
        elif item.get('b4_category_idx') is not None:
            selected_cats.add(int(item['b4_category_idx']))

        if not selected_cats:
            desc_l = mo_ta.lower()
            if any(k in desc_l for k in ['block', 'máy nén', 'kẹt block', 'cháy block']): selected_cats.add(0)
            if any(k in desc_l for k in ['bo mạch', 'mainboard', 'inverter', 'chớp đèn']): selected_cats.add(1)
            if any(k in desc_l for k in ['quạt', 'motor quạt', 'tụ quạt']): selected_cats.add(2)
            if any(k in desc_l for k in ['gas', 'xì gas', 'nạp gas', 'hụt gas']): selected_cats.add(3)
            if any(k in desc_l for k in ['sensor', 'cảm biến']): selected_cats.add(4)
            if any(k in desc_l for k in ['cb', 'contactor', 'nguồn', 'sét']): selected_cats.add(5)
            if any(k in desc_l for k in ['dàn nóng', 'dàn lạnh', 'xì dàn']): selected_cats.add(6)
            if any(k in desc_l for k in ['chảy nước', 'nghẹt máng']): selected_cats.add(7)
            if any(k in desc_l for k in ['vệ sinh', 'bảo dưỡng']): selected_cats.add(8)
            if any(k in desc_l for k in ['ống đồng', 'bảo ôn']): selected_cats.add(9)
            if any(k in desc_l for k in ['bms', 'điều khiển trung tâm']): selected_cats.add(10)

        cat_marks = ['X' if i in selected_cats else '' for i in range(11)]

        row_vals = [
            current_stt_dhkk, 'Đồng Nai', display_site_id, phan_loai, ten_tb,
            str(ma_tscd) if ma_tscd else '', str(serial) if serial else '',
            ngay_sd, hang_sx, cong_suat,
            cong_cu_ql, so_lan_sua, mo_ta, chi_phi
        ] + cat_marks

        ws_dhkk.row_dimensions[write_row_dhkk].height = 30

        for col_idx, val in enumerate(row_vals, start=1):
            cell = ws_dhkk.cell(write_row_dhkk, col_idx, val)
            cell.border = thin_border
            
            # Cột Mã trạm: In đậm
            if col_idx == 3:
                cell.font = bold_site_font
                cell.alignment = center_align
            # Cột Mô tả hư hỏng: Canh trái, wrap text
            elif col_idx == 13:
                cell.font = regular_font
                cell.alignment = left_wrap_align
            # Cột Chi phí: Canh phải
            elif col_idx == 14:
                cell.font = regular_font
                cell.alignment = right_align
            # 11 Cột Hạng mục lỗi kỹ thuật: Nếu có 'X' thì nổi bật Badge Vàng + Chữ Đỏ
            elif col_idx >= 15:
                if val == 'X':
                    cell.font = defect_x_font
                    cell.fill = defect_badge_fill
                else:
                    cell.font = regular_font
                cell.alignment = center_align
            # Toàn bộ các cột mã và thông số khác: Canh giữa chuẩn mực
            else:
                cell.font = regular_font
                cell.alignment = center_align
                if col_idx == 6:
                    cell.number_format = '@'  # Đảm bảo mã VT/CCDC 14 số không mất số 0 đầu

        current_stt_dhkk += 1
        write_row_dhkk += 1

    # Format Tab colors cho các sheet còn lại
    if 'Máy phát điện_Di động' in wb.sheetnames:
        wb['Máy phát điện_Di động'].sheet_properties.tabColor = 'FFC000'
    if 'Diễn giải DM hỏng tham chiếu' in wb.sheetnames:
        wb['Diễn giải DM hỏng tham chiếu'].sheet_properties.tabColor = '708090'

    # Lưu file B4
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    wb.save(OUTPUT_FILE)
    print(f"\n🎉 THÀNH CÔNG! Đã xuất trọn bộ Biểu mẫu B4 chung 1 file duy nhất:")
    print(f"👉 {OUTPUT_FILE}")
    print(f"   - Sheet 'Máy phát điện_Cố định': Gồm 28 ca cũ đã duyệt + {len(mpd_new_items)} ca mới (100% không lẫn ắc quy, không lẫn hạ tầng)")
    print(f"   - Sheet 'Điều hòa': Gồm {len(dhkk_new_items)} ca máy lạnh phát sinh cần đề xuất")
    print(f"   - Sheet 'Máy phát điện_Di động': Giữ nguyên cấu trúc chuẩn")
    print(f"   - Sheet 'Diễn giải DM hỏng tham chiếu': Đầy đủ 11 danh mục kỹ thuật Ban 4")

    # -------------------------------------------------------------------------
    # XUẤT FILE RIÊNG: TỒN TẠI & ĐỀ XUẤT SỬA CHỮA HẠ TẦNG ĐỊA BÀN
    # (Hệ thống điện, Nhà trạm, Cột anten, Hệ thống tiếp đất...)
    # -------------------------------------------------------------------------
    infra_items = []
    for d in defects:
        issues = d.get('existing_issues') or {}
        cat = issues.get('category')
        # Lấy tất cả các ca thuộc Hạ tầng địa bàn (không phải MPĐ và ĐHKK)
        if cat in ['Hệ thống điện', 'Nhà trạm', 'Cột anten', 'Hệ thống tiếp đất', 'Khác', 'Thiết bị vô tuyến']:
            infra_items.append(d)

    print(f"\n🏗️ Đang xuất File Tồn tại & Đề xuất Sửa chữa Hạ tầng Địa bàn ({len(infra_items)} ca)...")
    wb_infra = openpyxl.Workbook()
    ws_infra = wb_infra.active
    ws_infra.title = "Ha_Tang_Dia_Ban"

    title_fill = PatternFill(start_color="1F497D", end_color="1F497D", fill_type="solid")
    header_fill = PatternFill(start_color="DCE6F1", end_color="DCE6F1", fill_type="solid")
    white_bold = Font(name="Times New Roman", size=14, bold=True, color="FFFFFF")
    header_font = Font(name="Times New Roman", size=11, bold=True, color="000000")

    # Tiêu đề
    ws_infra.merge_cells("A1:K1")
    ws_infra.cell(1, 1, "TỔNG HỢP TỒN TẠI & ĐỀ XUẤT SỬA CHỮA HẠ TẦNG ĐỊA BÀN - TỔ VIỄN THÔNG 3")
    ws_infra.cell(1, 1).font = white_bold
    ws_infra.cell(1, 1).fill = title_fill
    ws_infra.cell(1, 1).alignment = Alignment(horizontal="center", vertical="center")
    ws_infra.row_dimensions[1].height = 35

    ws_infra.merge_cells("A2:K2")
    ws_infra.cell(2, 1, f"Đơn vị: Tổ Viễn Thông 3 | Thời điểm xuất: {datetime.now().strftime('%d/%m/%Y')} | Phạm vi: Nội bộ Tỉnh / Đài xử lý tại địa bàn")
    ws_infra.cell(2, 1).font = Font(name="Times New Roman", size=10, italic=True)
    ws_infra.cell(2, 1).alignment = Alignment(horizontal="center", vertical="center")

    infra_headers = [
        "STT", "Mã trạm mới", "Mã trạm cũ", "Tên trạm", "Huyện / Thị xã",
        "Phân nhóm hạ tầng", "Chi tiết tồn tại / Hư hỏng thực tế", "Đề xuất phương án sửa chữa tại chỗ",
        "Ngày phát hiện", "Người báo cáo", "Tình trạng xử lý"
    ]
    ws_infra.append([]) # Dòng 3 trống
    ws_infra.append(infra_headers) # Dòng 4 header
    ws_infra.row_dimensions[4].height = 28

    for col_idx in range(1, len(infra_headers) + 1):
        c = ws_infra.cell(4, col_idx)
        c.fill = header_fill
        c.font = header_font
        c.alignment = center_align
        c.border = thin_border

    for idx, item in enumerate(infra_items, start=1):
        s_id = str(item.get("site_id") or "").strip().upper()
        s_obj = site_map.get(s_id) or {}
        loc = s_obj.get("location_info") or {}
        issues = item.get("existing_issues") or {}

        r_data = [
            idx,
            s_obj.get("site_id") or s_id,
            s_obj.get("site_id_old") or "-",
            s_obj.get("name") or s_obj.get("site_name") or s_id,
            loc.get("district") or s_obj.get("district") or "-",
            issues.get("category") or "Hạ tầng",
            issues.get("description") or "",
            issues.get("proposed_solution") or "Sửa chữa / khắc phục tại chỗ",
            item.get("date") or "",
            issues.get("reporter") or "",
            issues.get("status") or "Chưa XL"
        ]
        ws_infra.append(r_data)
        curr_row = 4 + idx
        for c_idx in range(1, len(r_data) + 1):
            cell = ws_infra.cell(curr_row, c_idx)
            cell.font = regular_font
            cell.border = thin_border
            if c_idx in [1, 2, 3, 5, 6, 9, 10, 11]:
                cell.alignment = center_align
            else:
                cell.alignment = left_align

    # Set column widths
    widths = [6, 14, 14, 24, 18, 18, 45, 30, 14, 18, 14]
    for i, w in enumerate(widths, start=1):
        col_letter = openpyxl.utils.get_column_letter(i)
        ws_infra.column_dimensions[col_letter].width = w

    infra_filename = os.path.join(OUTPUT_DIR, f"TVT3_Ton_Tai_De_Xuat_Sua_Chua_Ha_Tang_Dia_Ban_{datetime.now().strftime('%Y%m%d')}.xlsx")
    wb_infra.save(infra_filename)
    print(f"👉 File Đề xuất Hạ tầng Địa bàn: {infra_filename}")

if __name__ == '__main__':
    main()
