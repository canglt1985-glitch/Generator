import os
import re
import json
from collections import defaultdict
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from dotenv import load_dotenv
from supabase import create_client

# Load Supabase
load_dotenv('tvt3_v2/.env')
supabase = create_client(os.getenv('VITE_SUPABASE_URL'), os.getenv('VITE_SUPABASE_ANON_KEY'))

print("📡 Đang tải danh sách trạm và máy phát điện từ Supabase...")
res = supabase.table('datasites').select('site_id, site_id_old, name, location_info, infrastructure_info, management_info').execute()
sites = res.data or []

def get_standard_tank_capacity(brand, power_str, name_str):
    b = str(brand or '').upper()
    n = str(name_str or '').upper()
    
    p = 0.0
    m = re.search(r'(\d+(?:\.\d+)?)', str(power_str or ''))
    if m:
        p = float(m.group(1))
    else:
        m2 = re.search(r'(\d+(?:\.\d+)?)\s*KVA', n)
        if m2:
            p = float(m2.group(1))

    # Standard telecom base fuel tanks by capacity & brand
    if p >= 50:
        return 180 # Large base station / hub 60kVA
    elif p >= 20:
        return 80  # 20kVA
    elif p >= 15:
        return 75  # 15kVA
    elif p >= 12:
        if 'VIETGEN' in b or 'VIETGEN' in n:
            return 65 # Vietgen 12.5kVA standard base tank is 65L
        elif 'CAPO' in b or 'OMEGA' in n or 'LISTER' in b:
            return 60 # Capo / Omega 12.5kVA base tank 60L
        else:
            return 55 # Kibii / Bruno 12kVA 55L
    elif p >= 9.5:
        return 40 # Vikyno / Capo 10kVA 40L
    elif p >= 7.5:
        return 45 # Vietgen, Lister Petter, SBM, Kibii 8.5kVA 45L
    elif p >= 5:
        return 35 # Kibii 6kVA, SBM 5.5kVA, Denyo 5.5kVA, FG Wilson 5.5kVA 35L
    else:
        return 45 # Default standard base tank

fixed_gens = []
updates_for_supabase = []

for s in sites:
    infra = s.get('infrastructure_info') or {}
    loc = s.get('location_info') or {}
    mgmt = s.get('management_info') or {}
    mpds = (infra.get('may_phat_dien') or {}).get('mpd') or []
    infra_modified = False
    
    for m in mpds:
        lld = str(m.get('loai_lap_dat') or '').strip().lower()
        tt = str(m.get('tinh_trang') or m.get('trang_thai') or '').strip().upper()
        ten = str(m.get('ten') or '').strip().upper()
        nh = str(m.get('nhan_hieu') or '').strip().upper()
        nl = str(m.get('nhien_lieu') or '').strip().lower()
        cs = str(m.get('cong_suat') or '').strip()
        
        is_mobile = 'lưu động' in lld or 'di động' in lld or 'luu dong' in lld or 'lưu động' in ten.lower() or 'lưu động' in nh.lower() or 'xăng' in nl
        is_transferred = 'ĐÃ ĐIỀU CHUYỂN' in tt
        
        if not is_mobile and not is_transferred:
            std_tank = get_standard_tank_capacity(nh, cs, ten)
            cur_tank = m.get('dung_tich') or std_tank
            
            # If dung_tich not present in DB, populate it
            if m.get('dung_tich') != cur_tank:
                m['dung_tich'] = cur_tank
                infra_modified = True
                
            dm = float(m.get('dinh_muc') or m.get('dinh_muc_quy_chuan') or 0)
            dm_tt = float(m.get('dinh_muc_thuc_te') or 0)
            hours_full = round(cur_tank / dm, 1) if dm > 0 else (round(cur_tank / dm_tt, 1) if dm_tt > 0 else 0)
            
            fixed_gens.append({
                'site_id': s.get('site_id'),
                'site_id_old': s.get('site_id_old'),
                'name': s.get('name'),
                'huyen': loc.get('huyen_cu') or loc.get('huyen') or '',
                'xa': loc.get('xa_cu') or loc.get('xa_moi') or '',
                'dia_chi': loc.get('dia_chi_cu') or '',
                'nhan_hieu': nh,
                'cong_suat': cs or (re.search(r'(\d+(?:\.\d+)?)\s*KVA', ten).group(1) if re.search(r'(\d+(?:\.\d+)?)\s*KVA', ten) else ''),
                'ten_may': ten,
                'serial': m.get('serial') or '',
                'ma_vat_tu': m.get('ma_vat_tu') or m.get('ma_tai_san_moi') or '',
                'loai_nl': 'Dầu DO',
                'dinh_muc': dm,
                'dinh_muc_thuc_te': dm_tt,
                'dung_tich': cur_tank,
                'nl_ton': float(m.get('nl_ton')) if m.get('nl_ton') is not None else None,
                'hours_full': hours_full,
                'tinh_trang': m.get('tinh_trang') or m.get('trang_thai') or 'HOẠT ĐỘNG TỐT',
                'ats': 'CÓ' if m.get('ats') else 'KÈM TỦ NGUỒN'
            })
            
    if infra_modified:
        updates_for_supabase.append((s['site_id'], infra))

print(f"✅ Đã trích xuất thông tin {len(fixed_gens)} máy phát điện cố định.")

# Sort by District, then Site ID
fixed_gens.sort(key=lambda x: (x['huyen'], x['site_id']))

# Sync dung_tich to Supabase if any modified
if updates_for_supabase:
    print(f"🔄 Đang cập nhật dung tích chuẩn cho {len(updates_for_supabase)} trạm trong Supabase...")
    for sid, inf in updates_for_supabase:
        try:
            supabase.table('datasites').update({'infrastructure_info': inf}).eq('site_id', sid).execute()
        except Exception as e:
            print(f"Lỗi update {sid}: {e}")
    print("✅ Đã cập nhật xong vào Supabase!")

# ----------------- TẠO FILE EXCEL ĐẲNG CẤP -----------------
wb = openpyxl.Workbook()
wb.remove(wb.active) # xóa sheet mặc định

# Style definitions
font_title = Font(name='Segoe UI', size=16, bold=True, color='1F4E78')
font_subtitle = Font(name='Segoe UI', size=10, italic=True, color='595959')
font_kpi_num = Font(name='Segoe UI', size=14, bold=True, color='1F4E78')
font_kpi_label = Font(name='Segoe UI', size=9, color='595959')
font_header = Font(name='Segoe UI', size=10, bold=True, color='FFFFFF')
font_header_sub = Font(name='Segoe UI', size=10, bold=True, color='1F4E78')
font_data = Font(name='Segoe UI', size=9)
font_bold = Font(name='Segoe UI', size=9, bold=True)
font_highlight = Font(name='Segoe UI', size=9, bold=True, color='006100')

fill_header = PatternFill(start_color='1F4E78', end_color='1F4E78', fill_type='solid')
fill_header_accent = PatternFill(start_color='D9E1F2', end_color='D9E1F2', fill_type='solid')
fill_alt = PatternFill(start_color='F9FAFB', end_color='F9FAFB', fill_type='solid')
fill_kpi = PatternFill(start_color='F2F4F7', end_color='F2F4F7', fill_type='solid')
fill_green_soft = PatternFill(start_color='E2EFDA', end_color='E2EFDA', fill_type='solid')

border_thin = Border(
    left=Side(style='thin', color='D9D9D9'),
    right=Side(style='thin', color='D9D9D9'),
    top=Side(style='thin', color='D9D9D9'),
    bottom=Side(style='thin', color='D9D9D9')
)
border_header = Border(
    left=Side(style='thin', color='FFFFFF'),
    right=Side(style='thin', color='FFFFFF'),
    top=Side(style='medium', color='1F4E78'),
    bottom=Side(style='medium', color='1F4E78')
)

align_center = Alignment(horizontal='center', vertical='center', wrap_text=True)
align_left = Alignment(horizontal='left', vertical='center', wrap_text=True)
align_right = Alignment(horizontal='right', vertical='center')

# ==================== SHEET 1: DANH SÁCH CHI TIẾT ====================
ws1 = wb.create_sheet(title='Dung tích dầu MPĐ cố định')
ws1.views.sheetView[0].showGridLines = True

# Title
ws1.merge_cells('A1:R1')
ws1['A1'] = "DANH SÁCH THÔNG SỐ VÀ DUNG TÍCH BÌNH DẦU MÁY PHÁT ĐIỆN CỐ ĐỊNH"
ws1['A1'].font = font_title
ws1['A1'].alignment = Alignment(horizontal='center', vertical='center')

ws1.merge_cells('A2:R2')
ws1['A2'] = f"Đài Viễn thông 3 — Tỉnh Đồng Nai | Thời điểm trích xuất: {datetime.now().strftime('%d/%m/%Y %H:%M')} | Phục vụ công tác quản lý & cấp nhiên liệu"
ws1['A2'].font = font_subtitle
ws1['A2'].alignment = Alignment(horizontal='center', vertical='center')

# KPI summary block
tot_gens = len(fixed_gens)
tot_capacity = sum(g['dung_tich'] for g in fixed_gens)
tot_ton = sum(g['nl_ton'] for g in fixed_gens if g['nl_ton'] is not None)
valid_hours = [g['hours_full'] for g in fixed_gens if g['hours_full'] > 0]
avg_hours = round(sum(valid_hours) / len(valid_hours), 1) if valid_hours else 0

kpi_configs = [
    ('B3:D3', 'B4:D4', 'TỔNG SỐ MÁY PHÁT CỐ ĐỊNH', f"{tot_gens} Máy", '1F4E78'),
    ('F3:H3', 'F4:H4', 'TỔNG DUNG TÍCH BÌNH DẦU ĐÁY', f"{tot_capacity:,.0f} Lít", '1F4E78'),
    ('J3:L3', 'J4:L4', 'TỔNG NHIÊN LIỆU TỒN HIỆN TẠI', f"{tot_ton:,.1f} Lít", '006100'),
    ('N3:P3', 'N4:P4', 'THỜI GIAN CHẠY KHI ĐẦY BÌNH', f"~{avg_hours} Giờ", 'C65911')
]

for label_range, val_range, label, val, color in kpi_configs:
    ws1.merge_cells(label_range)
    top_cell = ws1[label_range.split(':')[0]]
    top_cell.value = label
    top_cell.font = Font(name='Segoe UI', size=8, bold=True, color='595959')
    top_cell.alignment = align_center
    top_cell.fill = fill_kpi

    ws1.merge_cells(val_range)
    val_cell = ws1[val_range.split(':')[0]]
    val_cell.value = val
    val_cell.font = Font(name='Segoe UI', size=13, bold=True, color=color)
    val_cell.alignment = align_center
    val_cell.fill = fill_kpi

headers = [
    'STT', 'Mã trạm (Mới)', 'Mã trạm (Cũ)', 'Tên trạm', 'Huyện / Thị xã', 'Xã / Phường', 'Địa chỉ đặt máy',
    'Nhãn hiệu', 'Công suất\n(kVA)', 'Tên máy phát điện', 'Số Serial', 'Mã vật tư / TS',
    'Loại\nnhiên liệu', 'Định mức\nQuy chuẩn (L/h)', 'Định mức\nThực tế (L/h)',
    'Dung tích\nbình dầu (Lít)', 'Tồn dầu\nhiện tại (Lít)', 'Chạy tối đa\nđầy bình (Giờ)', 'Tủ ATS', 'Tình trạng'
]

row_hdr = 6
for col_idx, h in enumerate(headers, 1):
    cell = ws1.cell(row=row_hdr, column=col_idx, value=h)
    cell.font = font_header
    cell.fill = fill_header
    cell.alignment = align_center
    cell.border = border_header
ws1.row_dimensions[row_hdr].height = 32

for idx, g in enumerate(fixed_gens, 1):
    r = row_hdr + idx
    row_fill = fill_alt if idx % 2 == 0 else PatternFill(fill_type=None)
    
    vals = [
        idx,
        g['site_id'],
        g['site_id_old'] or '—',
        g['name'],
        g['huyen'],
        g['xa'],
        g['dia_chi'],
        g['nhan_hieu'],
        f"{g['cong_suat']} kVA" if g['cong_suat'] else '—',
        g['ten_may'],
        g['serial'] or '—',
        g['ma_vat_tu'] or '—',
        g['loai_nl'],
        g['dinh_muc'] if g['dinh_muc'] > 0 else '—',
        g['dinh_muc_thuc_te'] if g['dinh_muc_thuc_te'] > 0 else '—',
        g['dung_tich'],
        g['nl_ton'] if g['nl_ton'] is not None else '—',
        f"~{g['hours_full']}h" if g['hours_full'] > 0 else '—',
        g['ats'],
        g['tinh_trang']
    ]
    
    for c_idx, val in enumerate(vals, 1):
        c = ws1.cell(row=r, column=c_idx, value=val)
        c.font = font_data
        c.border = border_thin
        if row_fill.fill_type:
            c.fill = row_fill
            
        # Alignments & Formats
        if c_idx in [1, 2, 3, 9, 13, 19, 20]:
            c.alignment = align_center
        elif c_idx in [4, 5, 6, 7, 8, 10, 11, 12]:
            c.alignment = align_left
        elif c_idx in [14, 15, 16, 17, 18]:
            c.alignment = align_right
            
        # Highlight Dung tích bình dầu column
        if c_idx == 16: # Dung tích
            c.font = Font(name='Segoe UI', size=9, bold=True, color='1F4E78')
            c.fill = PatternFill(start_color='EBF1F5', end_color='EBF1F5', fill_type='solid')

# Auto-fit column widths
col_widths = {
    1: 6,   # STT
    2: 13,  # Mã mới
    3: 13,  # Mã cũ
    4: 20,  # Tên trạm
    5: 15,  # Huyện
    6: 18,  # Xã
    7: 35,  # Địa chỉ
    8: 16,  # Nhãn hiệu
    9: 13,  # Công suất
    10: 28, # Tên máy
    11: 18, # Serial
    12: 18, # Mã VT
    13: 11, # Nhiên liệu
    14: 15, # Định mức QC
    15: 15, # Định mức TT
    16: 15, # Dung tích bình
    17: 15, # Tồn dầu
    18: 15, # Chạy tối đa
    19: 14, # ATS
    20: 16  # Tình trạng
}
for col_idx, width in col_widths.items():
    col_letter = get_column_letter(col_idx)
    ws1.column_dimensions[col_letter].width = width

ws1.freeze_panes = 'C7'
ws1.auto_filter.ref = f"A{row_hdr}:T{row_hdr + len(fixed_gens)}"

# ==================== SHEET 2: BẢNG TRA CỨU DUNG TÍCH THEO MODEL ====================
ws2 = wb.create_sheet(title='Tra cứu Dung tích theo Model')
ws2.views.sheetView[0].showGridLines = True

ws2.merge_cells('A1:G1')
ws2['A1'] = "BẢNG TIÊU CHUẨN THÔNG SỐ VÀ DUNG TÍCH BÌNH DẦU THEO MODEL MÁY PHÁT ĐIỆN"
ws2['A1'].font = font_title
ws2['A1'].alignment = align_center

ws2.merge_cells('A2:G2')
ws2['A2'] = "Quy chuẩn thiết kế bồn dầu đáy (Base Fuel Tank) máy phát điện cố định tại các trạm BTS MobiFone Đồng Nai"
ws2['A2'].font = font_subtitle
ws2['A2'].alignment = align_center

ref_headers = ['STT', 'Nhãn hiệu máy', 'Dải công suất', 'Định mức tham chiếu\n(Lít/giờ)', 'Dung tích bình dầu đáy\n(Tiêu chuẩn)', 'Thời gian chạy liên tục\nkhi đầy bình', 'Ghi chú kỹ thuật']
ws2.row_dimensions[4].height = 28
for c_idx, h in enumerate(ref_headers, 1):
    c = ws2.cell(row=4, column=c_idx, value=h)
    c.font = font_header
    c.fill = fill_header
    c.alignment = align_center
    c.border = border_header

ref_data = [
    (1, 'KIBII', '6.0 kVA', '1.79 - 2.15 L/h', 35, '~16.3 - 19.5 giờ', 'Động cơ Kubota / Yanmar, bình dầu tích hợp khung đế'),
    (2, 'SBM / DENYO / FG WILSON', '5.5 kVA', '1.85 - 2.01 L/h', 35, '~17.4 - 18.9 giờ', 'Máy chống ồn mini đặt trạm tải nhẹ'),
    (3, 'VIETGEN', '8.5 kVA', '2.51 - 2.55 L/h', 45, '~17.6 - 17.9 giờ', 'Dòng máy phổ biến nhất trạm 3G/4G, bình dầu đáy 45L'),
    (4, 'LISTER PETTER / SBM', '8.5 kVA', '2.35 - 3.05 L/h', 45, '~14.8 - 19.1 giờ', 'Động cơ Anh / Nhật, bình dầu đáy chuẩn 45L'),
    (5, 'KIBII', '8.5 kVA', '2.51 - 3.05 L/h', 45, '~14.8 - 17.9 giờ', 'Khung vỏ chống ồn, bình dầu đáy chuẩn 45L'),
    (6, 'HỮU TOÀN', '8.5 kVA', '3.05 L/h', 45, '~14.8 giờ', 'Động cơ Yanmar / FPT'),
    (7, 'VIKYNO', '10.0 kVA', '2.50 - 2.95 L/h', 40, '~13.5 - 16.0 giờ', 'Động cơ Diesel Vikyno / Yanmar'),
    (8, 'KIBII / BRUNO', '12.0 kVA', '2.77 - 3.29 L/h', 55, '~16.7 - 19.8 giờ', 'Máy phát tải trung bình, bình đáy 55L'),
    (9, 'CAPO / OMEGA', '12.5 kVA', '3.02 - 3.56 L/h', 60, '~16.8 - 19.8 giờ', 'Động cơ Perkins / Mitsubishi, bình dầu 60L'),
    (10, 'VIETGEN', '12.5 kVA', '3.02 - 4.27 L/h', 65, '~15.2 - 21.5 giờ', 'Máy tải nặng 3G/4G/5G, bình đáy lớn 65L'),
    (11, 'KIBII', '20.0 kVA', '4.47 - 5.31 L/h', 80, '~15.0 - 17.9 giờ', 'Máy phát công suất lớn trạm trung chuyển / Hub'),
    (12, 'BRUNO', '60.0 kVA', '15.29 L/h', 180, '~11.8 giờ', 'Bồn dầu lớn tại trạm tổng / Trung tâm vận hành')
]

for idx, row in enumerate(ref_data, 1):
    r = 4 + idx
    row_fill = fill_alt if idx % 2 == 0 else PatternFill(fill_type=None)
    for c_idx, val in enumerate(row, 1):
        c = ws2.cell(row=r, column=c_idx, value=val)
        c.font = font_data
        c.border = border_thin
        if row_fill.fill_type: c.fill = row_fill
        
        if c_idx in [1, 3]: c.alignment = align_center
        elif c_idx in [2, 7]: c.alignment = align_left
        elif c_idx == 4: c.alignment = align_center
        elif c_idx == 5:
            c.alignment = align_center
            c.value = f"{val} Lít"
            c.font = Font(name='Segoe UI', size=9, bold=True, color='1F4E78')
            c.fill = PatternFill(start_color='EBF1F5', end_color='EBF1F5', fill_type='solid')
        elif c_idx == 6:
            c.alignment = align_center
            c.font = font_highlight

ref_widths = {1: 6, 2: 24, 3: 16, 4: 22, 5: 24, 6: 25, 7: 50}
for col_idx, width in ref_widths.items():
    ws2.column_dimensions[get_column_letter(col_idx)].width = width

# ==================== SHEET 3: THỐNG KÊ THEO HUYỆN ====================
ws3 = wb.create_sheet(title='Thống kê theo Huyện')
ws3.views.sheetView[0].showGridLines = True

ws3.merge_cells('A1:G1')
ws3['A1'] = "TỔNG HỢP MÁY PHÁT ĐIỆN VÀ DUNG TÍCH BÌNH DẦU THEO ĐỊA BÀN HUYỆN"
ws3['A1'].font = font_title
ws3['A1'].alignment = align_center

dist_stats = defaultdict(lambda: {'count': 0, 'capacity': 0, 'ton': 0, 'brands': defaultdict(int)})
for g in fixed_gens:
    d = g['huyen'] or 'Chưa phân loại'
    dist_stats[d]['count'] += 1
    dist_stats[d]['capacity'] += g['dung_tich']
    if g['nl_ton'] is not None:
        dist_stats[d]['ton'] += g['nl_ton']
    dist_stats[d]['brands'][g['nhan_hieu']] += 1

dist_headers = ['STT', 'Huyện / Thành phố', 'Số lượng MPĐ cố định', 'Tổng dung tích bình dầu (Lít)', 'Dung tích TB / Máy (Lít)', 'Tổng tồn dầu hiện tại (Lít)', 'Các nhãn hiệu máy chính']
ws3.row_dimensions[3].height = 28
for c_idx, h in enumerate(dist_headers, 1):
    c = ws3.cell(row=3, column=c_idx, value=h)
    c.font = font_header
    c.fill = fill_header
    c.alignment = align_center
    c.border = border_header

sorted_dists = sorted(dist_stats.items(), key=lambda x: x[1]['count'], reverse=True)
for idx, (dist_name, s_data) in enumerate(sorted_dists, 1):
    r = 3 + idx
    row_fill = fill_alt if idx % 2 == 0 else PatternFill(fill_type=None)
    top_b = ', '.join([f"{k} ({v})" for k, v in sorted(s_data['brands'].items(), key=lambda x: x[1], reverse=True)[:3]])
    avg_cap = round(s_data['capacity'] / s_data['count'], 1)
    
    vals = [
        idx,
        dist_name,
        s_data['count'],
        f"{s_data['capacity']:,} L",
        f"{avg_cap} L",
        f"{s_data['ton']:,.1f} L" if s_data['ton'] > 0 else '—',
        top_b
    ]
    for c_idx, val in enumerate(vals, 1):
        c = ws3.cell(row=r, column=c_idx, value=val)
        c.font = font_data
        c.border = border_thin
        if row_fill.fill_type: c.fill = row_fill
        if c_idx in [1, 3, 4, 5, 6]: c.alignment = align_center
        else: c.alignment = align_left

# Total row
r_tot = 3 + len(sorted_dists) + 1
ws3.cell(row=r_tot, column=1, value='').border = border_thin
ws3.cell(row=r_tot, column=2, value='TỔNG CỘNG TOÀN ĐÀI').font = Font(name='Segoe UI', size=10, bold=True)
ws3.cell(row=r_tot, column=2).alignment = align_left
ws3.cell(row=r_tot, column=2).border = border_thin
ws3.cell(row=r_tot, column=3, value=tot_gens).font = font_bold
ws3.cell(row=r_tot, column=3).alignment = align_center
ws3.cell(row=r_tot, column=3).border = border_thin
ws3.cell(row=r_tot, column=4, value=f"{tot_capacity:,} L").font = font_bold
ws3.cell(row=r_tot, column=4).alignment = align_center
ws3.cell(row=r_tot, column=4).border = border_thin
ws3.cell(row=r_tot, column=5, value=f"{round(tot_capacity/tot_gens, 1)} L").font = font_bold
ws3.cell(row=r_tot, column=5).alignment = align_center
ws3.cell(row=r_tot, column=5).border = border_thin
ws3.cell(row=r_tot, column=6, value=f"{tot_ton:,.1f} L").font = font_bold
ws3.cell(row=r_tot, column=6).alignment = align_center
ws3.cell(row=r_tot, column=6).border = border_thin
ws3.cell(row=r_tot, column=7, value='').border = border_thin

for col in range(1, 8):
    ws3.cell(row=r_tot, column=col).fill = fill_header_accent

dist_widths = {1: 6, 2: 22, 3: 22, 4: 28, 5: 24, 6: 28, 7: 45}
for col_idx, width in dist_widths.items():
    ws3.column_dimensions[get_column_letter(col_idx)].width = width

# Save files
desktop_path = "/Users/cang_it/Desktop/Dung_Tich_Dau_May_Phat_Dien_Co_Dinh.xlsx"
drive_path = "/Users/cang_it/Library/CloudStorage/GoogleDrive-canglt1985@gmail.com/My Drive/datasite/Dung_Tich_Dau_May_Phat_Dien_Co_Dinh.xlsx"
scratch_path = "/Users/cang_it/Antigravity/TVT3/scratch/Dung_Tich_Dau_May_Phat_Dien_Co_Dinh.xlsx"

wb.save(desktop_path)
print(f"✅ Đã lưu file Excel tại Desktop: {desktop_path}")

try:
    wb.save(drive_path)
    print(f"✅ Đã lưu bản sao trên Google Drive: {drive_path}")
except Exception as e:
    print(f"Không thể lưu Google Drive: {e}")

wb.save(scratch_path)
print(f"✅ Đã lưu bản sao tại scratch: {scratch_path}")
