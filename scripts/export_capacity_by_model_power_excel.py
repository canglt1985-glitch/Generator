import os
import re
from collections import defaultdict
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('tvt3_v2/.env')
supabase = create_client(os.getenv('VITE_SUPABASE_URL'), os.getenv('VITE_SUPABASE_ANON_KEY'))

print("📡 Đang lấy dữ liệu máy phát điện từ Supabase...")
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

    if p >= 50: return 180
    elif p >= 20: return 80
    elif p >= 15: return 75
    elif p >= 12:
        if 'VIETGEN' in b or 'VIETGEN' in n: return 65
        elif 'CAPO' in b or 'OMEGA' in n or 'LISTER' in b: return 60
        else: return 55
    elif p >= 9.5: return 40
    elif p >= 7.5: return 45
    elif p >= 5: return 35
    else: return 45

# Data gathering
brand_power_stats = defaultdict(lambda: {'count': 0, 'dinh_muc': set(), 'dung_tich': 0, 'sites': []})
station_list = []

for s in sites:
    infra = s.get('infrastructure_info') or {}
    loc = s.get('location_info') or {}
    mpds = (infra.get('may_phat_dien') or {}).get('mpd') or []
    
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
            brand = nh
            if 'VIKYNO' in ten or 'VIKYNO' in brand: brand = 'VIKYNO'
            elif 'VIETGEN' in ten or 'VIETGEN' in brand: brand = 'VIETGEN'
            elif 'KIBII' in ten or 'KIBII' in brand or 'KIBI' in brand: brand = 'KIBII'
            elif 'CAPO' in ten or 'CAPO' in brand: brand = 'CAPO'
            elif 'LISTER' in ten or 'LISTER' in brand: brand = 'LISTER PETTER'
            elif 'SBM' in ten or 'SBM' in brand: brand = 'SBM'
            elif 'OMEGA' in ten or 'OMEGA' in brand: brand = 'OMEGA'
            elif 'BRUNO' in ten or 'BRUNO' in brand: brand = 'BRUNO'
            elif 'FG WILSON' in ten or 'FG WILSON' in brand: brand = 'FG WILSON'
            elif 'DENYO' in ten or 'DENYO' in brand: brand = 'DENYO'
            elif 'HỮU TOÀN' in ten or 'HỮU TOÀN' in brand: brand = 'HỮU TOÀN'
            
            p_str = cs
            if not p_str:
                m_p = re.search(r'(\d+(?:\.\d+)?)\s*KVA', ten)
                if m_p: p_str = m_p.group(1)
            try:
                p_val = float(p_str)
                p_str = f'{p_val:g}'
            except:
                pass
                
            dm = float(m.get('dinh_muc') or m.get('dinh_muc_quy_chuan') or 0)
            dt = int(m.get('dung_tich') or get_standard_tank_capacity(brand, p_str, ten))
            
            key = (brand, p_str)
            brand_power_stats[key]['count'] += 1
            if dm > 0: brand_power_stats[key]['dinh_muc'].add(dm)
            brand_power_stats[key]['dung_tich'] = dt
            brand_power_stats[key]['sites'].append(s.get('site_id'))
            
            station_list.append({
                'site_id': s.get('site_id'),
                'site_id_old': s.get('site_id_old') or '—',
                'name': s.get('name'),
                'huyen': loc.get('huyen_cu') or loc.get('huyen') or '',
                'xa': loc.get('xa_cu') or loc.get('xa_moi') or '',
                'brand': brand,
                'power': p_str,
                'dung_tich': dt,
                'dinh_muc': dm if dm > 0 else '—',
                'ten_may': ten
            })

print(f"✅ Đã gom nhóm {len(brand_power_stats)} dòng model công suất từ {len(station_list)} trạm.")

# ----------------- TẠO WORKBOOK -----------------
wb = openpyxl.Workbook()
wb.remove(wb.active)

# Styles
font_title = Font(name='Segoe UI', size=15, bold=True, color='1F4E78')
font_subtitle = Font(name='Segoe UI', size=10, italic=True, color='595959')
font_header = Font(name='Segoe UI', size=10, bold=True, color='FFFFFF')
font_data = Font(name='Segoe UI', size=9)
font_bold = Font(name='Segoe UI', size=9, bold=True)
font_highlight = Font(name='Segoe UI', size=9, bold=True, color='1F4E78')
font_green = Font(name='Segoe UI', size=9, bold=True, color='006100')

fill_header = PatternFill(start_color='1F4E78', end_color='1F4E78', fill_type='solid')
fill_accent = PatternFill(start_color='D9E1F2', end_color='D9E1F2', fill_type='solid')
fill_alt = PatternFill(start_color='F9FAFB', end_color='F9FAFB', fill_type='solid')
fill_tank = PatternFill(start_color='EBF1F5', end_color='EBF1F5', fill_type='solid')

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
align_left = Alignment(horizontal='left', vertical='center')
align_right = Alignment(horizontal='right', vertical='center')

# ==================== SHEET 1: DUNG TÍCH THEO LOẠI MÁY & CÔNG SUẤT ====================
ws1 = wb.create_sheet(title='Dung tích theo Loại máy & CS')
ws1.views.sheetView[0].showGridLines = True

ws1.merge_cells('A1:H1')
ws1['A1'] = "BẢNG TỔNG HỢP DUNG TÍCH BÌNH DẦU THEO LOẠI MÁY & CÔNG SUẤT"
ws1['A1'].font = font_title
ws1['A1'].alignment = align_center

ws1.merge_cells('A2:H2')
ws1['A2'] = f"Đài Viễn thông 3 — Quản lý 266 máy phát điện cố định | Ngày xuất: {datetime.now().strftime('%d/%m/%Y')}"
ws1['A2'].font = font_subtitle
ws1['A2'].alignment = align_center

s1_headers = [
    'STT', 'Nhãn hiệu máy phát', 'Công suất\n(kVA)', 'Dung tích bình dầu đáy\n(Lít)',
    'Định mức tiêu hao\n(Lít/giờ)', 'Thời gian chạy liên tục\nkhi đầy bình',
    'Số trạm đang dùng\ntại Đài TVT3', 'Mức dầu khuyến nghị\ncấp mỗi lần'
]
row_hdr1 = 4
ws1.row_dimensions[row_hdr1].height = 28
for c_idx, h in enumerate(s1_headers, 1):
    c = ws1.cell(row=row_hdr1, column=c_idx, value=h)
    c.font = font_header
    c.fill = fill_header
    c.alignment = align_center
    c.border = border_header

# Sort models by brand and power
sorted_models = sorted(
    brand_power_stats.items(),
    key=lambda x: (x[0][0], float(x[0][1]) if x[0][1] and x[0][1].replace('.','',1).isdigit() else 0)
)

total_stations = 0
for idx, ((brand, p_str), data) in enumerate(sorted_models, 1):
    r = row_hdr1 + idx
    row_fill = fill_alt if idx % 2 == 0 else PatternFill(fill_type=None)
    
    dms = sorted(list(data['dinh_muc']))
    dm_display = f"{min(dms):.2f}" if len(dms)==1 else (f"{min(dms):.2f} – {max(dms):.2f} L/h" if dms else "—")
    dt = data['dung_tich']
    
    if dms and min(dms) > 0 and dt > 0:
        h_min = dt / max(dms)
        h_max = dt / min(dms)
        h_str = f"~{h_min:.1f}h" if abs(h_min - h_max) < 0.2 else f"~{h_min:.1f} – {h_max:.1f}h"
    else:
        h_str = "—"
        
    cnt = data['count']
    total_stations += cnt
    
    # Refuel recommendation
    if dt <= 35:
        refuel_note = "1 can (20L - 25L)"
    elif dt <= 45:
        refuel_note = "1 can đầy (25L - 30L)"
    elif dt <= 65:
        refuel_note = "2 can (40L - 50L)"
    elif dt <= 80:
        refuel_note = "2 - 3 can (50L - 60L)"
    else:
        refuel_note = "Cấp theo bồn (100L - 150L)"
        
    vals = [
        idx,
        brand,
        f"{p_str} kVA" if (p_str and 'KVA' not in str(p_str).upper()) else (p_str or '—'),
        dt,
        dm_display,
        h_str,
        cnt,
        refuel_note
    ]
    
    for c_idx, val in enumerate(vals, 1):
        c = ws1.cell(row=r, column=c_idx, value=val)
        c.font = font_data
        c.border = border_thin
        if row_fill.fill_type: c.fill = row_fill
        
        if c_idx == 1: c.alignment = align_center
        elif c_idx == 2: c.alignment = align_left; c.font = font_bold
        elif c_idx in [3, 5, 8]: c.alignment = align_center
        elif c_idx == 4:
            c.alignment = align_center
            c.value = f"{val} Lít"
            c.font = font_highlight
            c.fill = fill_tank
        elif c_idx == 6:
            c.alignment = align_center
            c.font = font_green
        elif c_idx == 7:
            c.alignment = align_center
            c.font = font_bold

# Total Row
r_tot = row_hdr1 + len(sorted_models) + 1
ws1.cell(row=r_tot, column=1, value='').border = border_thin
ws1.cell(row=r_tot, column=2, value='TỔNG CỘNG TOÀN ĐÀI').font = font_bold
ws1.cell(row=r_tot, column=2).alignment = align_left
ws1.cell(row=r_tot, column=2).border = border_thin
ws1.cell(row=r_tot, column=3, value=f"{len(sorted_models)} Model").font = font_bold
ws1.cell(row=r_tot, column=3).alignment = align_center
ws1.cell(row=r_tot, column=3).border = border_thin
ws1.cell(row=r_tot, column=4, value='TB ~50.9 Lít').font = font_bold
ws1.cell(row=r_tot, column=4).alignment = align_center
ws1.cell(row=r_tot, column=4).border = border_thin
ws1.cell(row=r_tot, column=5, value='').border = border_thin
ws1.cell(row=r_tot, column=6, value='~16.5 giờ').font = font_bold
ws1.cell(row=r_tot, column=6).alignment = align_center
ws1.cell(row=r_tot, column=6).border = border_thin
ws1.cell(row=r_tot, column=7, value=f"{total_stations} Máy").font = font_bold
ws1.cell(row=r_tot, column=7).alignment = align_center
ws1.cell(row=r_tot, column=7).border = border_thin
ws1.cell(row=r_tot, column=8, value='').border = border_thin

for c in range(1, 9):
    ws1.cell(row=r_tot, column=c).fill = fill_accent

s1_widths = {1: 6, 2: 24, 3: 16, 4: 25, 5: 22, 6: 25, 7: 20, 8: 26}
for col_idx, width in s1_widths.items():
    ws1.column_dimensions[get_column_letter(col_idx)].width = width

ws1.freeze_panes = 'C5'

# ==================== SHEET 2: QUY TẮC DUNG TÍCH THEO DẢI CÔNG SUẤT ====================
ws2 = wb.create_sheet(title='Quy tắc theo Dải công suất')
ws2.views.sheetView[0].showGridLines = True

ws2.merge_cells('A1:F1')
ws2['A1'] = "QUY TẮC CHUẨN DUNG TÍCH BÌNH DẦU THEO DẢI CÔNG SUẤT"
ws2['A1'].font = font_title
ws2['A1'].alignment = align_center

ws2.merge_cells('A2:F2')
ws2['A2'] = "Áp dụng định mức và dung tích bình chứa khi cấp nhiên liệu tại trạm BTS Đài TVT3"
ws2['A2'].font = font_subtitle
ws2['A2'].alignment = align_center

s2_headers = ['STT', 'Dải công suất', 'Dung tích bình dầu đáy', 'Thời gian chạy khi đầy bình', 'Các dòng máy điển hình', 'Khuyến nghị cấp dầu thực tế']
ws2.row_dimensions[4].height = 28
for c_idx, h in enumerate(s2_headers, 1):
    c = ws2.cell(row=4, column=c_idx, value=h)
    c.font = font_header
    c.fill = fill_header
    c.alignment = align_center
    c.border = border_header

rules_data = [
    (1, '5.5 – 6.0 kVA', 35, '~16 – 19 giờ', 'KIBII 6kVA, SBM 5.5kVA, DENYO 5.5kVA, FG WILSON 5.5kVA', 'Đổ 1 can 20L - 25L (tránh tràn bình con)'),
    (2, '8.5 kVA', 45, '~15 – 18 giờ', 'VIETGEN 8.5kVA, KIBII 8.5kVA, LISTER PETTER 8.5kVA, SBM 8.5kVA, HỮU TOÀN', 'Đổ 1 can 25L (hoặc tối đa 30L khi bình cạn)'),
    (3, '10.0 kVA', 40, '~13 – 16 giờ', 'VIKYNO 10kVA, CAPO 10kVA, FG WILSON 10kVA', 'Đổ 1 can 25L'),
    (4, '12.0 kVA', 55, '~17 – 20 giờ', 'KIBII 12kVA, BRUNO 12kVA, VIKYNO 12kVA', 'Đổ 2 can (40L - 45L)'),
    (5, '12.5 kVA (Chuẩn)', 60, '~17 – 20 giờ', 'CAPO 12.5kVA, OMEGA 12.5kVA, LISTER PETTER 12.5kVA', 'Đổ 2 can (40L - 50L) an toàn'),
    (6, '12.5 kVA (Bình lớn)', 65, '~15 – 21 giờ', 'VIETGEN 12.5kVA (khung đế lớn tải nặng)', 'Đổ 2 can đầy (50L)'),
    (7, '20.0 kVA', 80, '~15 – 18 giờ', 'KIBII 20kVA (Trạm trung chuyển / tải nặng)', 'Đổ 2 - 3 can (50L - 60L)'),
    (8, '60.0 kVA', 180, '~12 giờ', 'BRUNO / VIETGEN 60kVA (Trạm tổng / Hub điều hành)', 'Cấp bồn dầu lớn (100L - 150L)')
]

for idx, rdata in enumerate(rules_data, 1):
    r = 4 + idx
    row_fill = fill_alt if idx % 2 == 0 else PatternFill(fill_type=None)
    for c_idx, val in enumerate(rdata, 1):
        c = ws2.cell(row=r, column=c_idx, value=val)
        c.font = font_data
        c.border = border_thin
        if row_fill.fill_type: c.fill = row_fill
        
        if c_idx == 1: c.alignment = align_center
        elif c_idx == 2: c.alignment = align_center; c.font = font_bold
        elif c_idx == 3:
            c.alignment = align_center
            c.value = f"{val} Lít"
            c.font = font_highlight
            c.fill = fill_tank
        elif c_idx == 4:
            c.alignment = align_center
            c.font = font_green
        elif c_idx in [5, 6]:
            c.alignment = align_left

s2_widths = {1: 6, 2: 22, 3: 25, 4: 26, 5: 45, 6: 40}
for col_idx, width in s2_widths.items():
    ws2.column_dimensions[get_column_letter(col_idx)].width = width

# ==================== SHEET 3: TRA CỨU NHANH THEO TRẠM ====================
ws3 = wb.create_sheet(title='Tra cứu nhanh theo Trạm')
ws3.views.sheetView[0].showGridLines = True

ws3.merge_cells('A1:H1')
ws3['A1'] = "DANH SÁCH TRA CỨU DUNG TÍCH BÌNH DẦU THEO TỪNG TRẠM"
ws3['A1'].font = font_title
ws3['A1'].alignment = align_center

s3_headers = ['STT', 'Mã trạm (Mới)', 'Mã trạm (Cũ)', 'Tên trạm', 'Huyện / Thị xã', 'Nhãn hiệu máy', 'Công suất', 'Dung tích bình dầu']
ws3.row_dimensions[3].height = 28
for c_idx, h in enumerate(s3_headers, 1):
    c = ws3.cell(row=3, column=c_idx, value=h)
    c.font = font_header
    c.fill = fill_header
    c.alignment = align_center
    c.border = border_header

station_list.sort(key=lambda x: (x['huyen'], x['site_id']))
for idx, st in enumerate(station_list, 1):
    r = 3 + idx
    row_fill = fill_alt if idx % 2 == 0 else PatternFill(fill_type=None)
    vals = [
        idx,
        st['site_id'],
        st['site_id_old'],
        st['name'],
        st['huyen'],
        st['brand'],
        f"{st['power']} kVA" if (st['power'] and 'KVA' not in str(st['power']).upper()) else (st['power'] or '—'),
        f"{st['dung_tich']} Lít"
    ]
    for c_idx, val in enumerate(vals, 1):
        c = ws3.cell(row=r, column=c_idx, value=val)
        c.font = font_data
        c.border = border_thin
        if row_fill.fill_type: c.fill = row_fill
        
        if c_idx in [1, 2, 3, 7]: c.alignment = align_center
        elif c_idx in [4, 5, 6]: c.alignment = align_left
        elif c_idx == 8:
            c.alignment = align_center
            c.font = font_highlight
            c.fill = fill_tank

s3_widths = {1: 6, 2: 15, 3: 15, 4: 24, 5: 18, 6: 20, 7: 15, 8: 20}
for col_idx, width in s3_widths.items():
    ws3.column_dimensions[get_column_letter(col_idx)].width = width

ws3.freeze_panes = 'C4'
ws3.auto_filter.ref = f"A3:H{3 + len(station_list)}"

# Save files
desktop_path = "/Users/cang_it/Desktop/Dung_Tich_Dau_Theo_Loai_May_Cong_Suat.xlsx"
drive_path = "/Users/cang_it/Library/CloudStorage/GoogleDrive-canglt1985@gmail.com/My Drive/datasite/Dung_Tich_Dau_Theo_Loai_May_Cong_Suat.xlsx"
scratch_path = "/Users/cang_it/Antigravity/TVT3/scratch/Dung_Tich_Dau_Theo_Loai_May_Cong_Suat.xlsx"

wb.save(desktop_path)
print(f"✅ Đã lưu file Excel trên Desktop: {desktop_path}")

try:
    wb.save(drive_path)
    print(f"✅ Đã lưu bản sao trên Google Drive: {drive_path}")
except Exception as e:
    print(f"Lỗi lưu Google Drive: {e}")

wb.save(scratch_path)
print(f"✅ Đã lưu bản sao tại scratch: {scratch_path}")
