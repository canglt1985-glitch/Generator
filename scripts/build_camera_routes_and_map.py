import os, csv, math, re, json
from collections import defaultdict
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('tvt3_v2/.env')
sb = create_client(os.getenv('VITE_SUPABASE_URL'), os.getenv('VITE_SUPABASE_ANON_KEY'))

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi, dlam = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dphi/2.0)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2.0)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def dms_to_dd(dms_str):
    s = dms_str.strip()
    if not s or 'bỏ' in s.lower() or 'trùng' in s.lower(): return None, None
    m_dec = re.match(r'^([\d\.]+)\s*,\s*([\d\.]+)$', s)
    if m_dec: return float(m_dec.group(1)), float(m_dec.group(2))
    pat = r'(\d+)[°\s]+(\d+)[\'\s]+([\d\.]+)[\"\s]*([NSns])\s*[,;\s]*(\d+)[°\s]+(\d+)[\'\s]+([\d\.]+)[\"\s]*([EWew])'
    m = re.search(pat, s)
    if m:
        lat = float(m.group(1)) + float(m.group(2))/60.0 + float(m.group(3))/3600.0
        if m.group(4).upper() == 'S': lat = -lat
        lon = float(m.group(5)) + float(m.group(6))/60.0 + float(m.group(7))/3600.0
        if m.group(8).upper() == 'W': lon = -lon
        return lat, lon
    return None, None

# 1. Fetch datasites and filter ACTIVE, non-MORAN, non-PTM
print("Fetching datasites from Supabase...")
datasites = sb.table('datasites').select('site_id, site_id_old, status, technical_info, management_info, location_info').execute().data

site_dict = {}
active_bts = []

for r in datasites:
    s_new = (r.get('site_id') or '').strip().upper()
    s_old = (r.get('site_id_old') or '').strip().upper()
    status = (r.get('status') or '').strip().upper()
    
    if 'UL_' in s_old or '4G-' in s_old or 'MBF_' in s_old or 'MOCN' in s_old: continue
    if status != 'ACTIVE': continue
        
    loc = r.get('location_info') or {}
    lat, lon = loc.get('vi_do'), loc.get('kinh_do')
    if not lat or not lon: continue
    try:
        lat, lon = float(lat), float(lon)
    except:
        continue
    
    mi = r.get('management_info') or {}
    ti = r.get('technical_info') or {}
    
    vung = str(mi.get('vung_phu') or '').strip().upper()
    tram_main = str(mi.get('tram_main') or ti.get('tram_main_tx') or '').strip().upper()
    tb_csg = str(ti.get('thiet_bi_csg') or '').strip().upper()
    route = str(ti.get('last_mile_primary') or '').strip().upper()
    dv_vh = str(ti.get('don_vi_van_hanh_cap') or ti.get('don_vi_van_hanh') or '').strip().upper()
    
    is_csg = 'LOCAL CSG' in route or ('LOCAL' in dv_vh and tb_csg == 'CSG') or tb_csg == 'CSG'
    has_lsw = 'LSW' in tb_csg or 'LSW' in route
    is_cran = 'CRAN' in vung
    is_macro = not is_cran and ('MACRO' in vung or 'KHÔNG' in tram_main or not tram_main)
    
    item = {
        'site_id': s_new, 'site_id_old': s_old, 'lat': lat, 'lon': lon,
        'vung': vung, 'tram_main': tram_main, 'is_csg': is_csg,
        'has_lsw': has_lsw, 'is_cran': is_cran, 'is_macro': is_macro,
        'qlt': mi.get('qlt', '')
    }
    site_dict[s_new] = item
    site_dict[s_old] = item
    active_bts.append(item)

# Resolve Main for each site
for s in active_bts:
    if s['is_cran']:
        tm = s['tram_main']
        m = re.search(r'([A-Za-z0-9_]+)', tm)
        code = m.group(1).upper() if m else tm
        resolved = site_dict.get(code)
        if resolved:
            s['main_site'] = resolved
            s['main_code'] = resolved['site_id_old'] or resolved['site_id']
            s['main_is_csg'] = resolved['is_csg']
            s['main_has_lsw'] = resolved['has_lsw']
        else:
            s['main_site'] = None
            s['main_code'] = tm
            s['main_is_csg'] = False
            s['main_has_lsw'] = False
    else:
        s['main_site'] = s
        s['main_code'] = s['site_id_old'] or s['site_id']
        s['main_is_csg'] = s['is_csg']
        s['main_has_lsw'] = s['has_lsw']

# 2. Parse camera survey file
with open('scratch/camera_survey.csv', 'r', encoding='utf-8') as f:
    survey_rows = list(csv.reader(f))

coord_overrides = {'49': (10.854361, 107.533917)}

# Define Route corridors
# Route 1: QL1A Đông (Bình Thuận <-> Sông Phan) -> Points: 1, 24, 26, 27, 42, 55
# Route 2: Cụm Tín Nghĩa & CRAN DNXL69 -> Points: 2, 4, 28, 29, 30, 33, 39
# Route 3: Đường Sóc Ba Buông -> Points: 31, 32, 49
# Route 4: Tuyến Suối Đá - Suối Cầu - Suối Bà Rùa -> Points: 5, 7, 51, 52, 53, 54
# Route 5: Tuyến Đồi Môn - Làng Chăm - Xuân Hưng -> Points: 6, 8, 11, 12, 13, 25, 34, 35, 41, 43, 45, 46, 50
# Route 6: QL1A Xuân Tâm - Sông Ui - Cao tốc -> Points: 10, 14, 15, 17, 40, 48
# Route 7: Cụm KCN Xuân Lộc & Hồ Gia Ui -> Points: 16, 18, 19, 20, 21, 22, 23, 36, 37, 38, 44, 47

route_map_def = {
    '1': ('Route 1: QL1A Đông (Xuân Hòa - Bình Thuận)', '12FO'),
    '24': ('Route 1: QL1A Đông (Xuân Hòa - Bình Thuận)', '12FO'),
    '26': ('Route 1: QL1A Đông (Xuân Hòa - Bình Thuận)', '12FO'),
    '27': ('Route 1: QL1A Đông (Xuân Hòa - Bình Thuận)', '12FO'),
    '42': ('Route 1: QL1A Đông (Xuân Hòa - Bình Thuận)', '12FO'),
    '55': ('Route 1: QL1A Đông (Xuân Hòa - Bình Thuận)', '12FO'),
    
    '2': ('Route 2: Cụm QL1A - Tín Nghĩa (CRAN DNXL69)', '12FO'),
    '4': ('Route 2: Cụm QL1A - Tín Nghĩa (CRAN DNXL69)', '12FO'),
    '28': ('Route 2: Cụm QL1A - Tín Nghĩa (CRAN DNXL69)', '12FO'),
    '29': ('Route 2: Cụm QL1A - Tín Nghĩa (CRAN DNXL69)', '12FO'),
    '30': ('Route 2: Cụm QL1A - Tín Nghĩa (CRAN DNXL69)', '12FO'),
    '33': ('Route 2: Cụm QL1A - Tín Nghĩa (CRAN DNXL69)', '12FO'),
    '39': ('Route 2: Cụm QL1A - Tín Nghĩa (CRAN DNXL69)', '12FO'),
    
    '31': ('Route 3: Đường Sóc Ba Buông (Xuân Hòa - Xuân Hưng)', '12FO'),
    '32': ('Route 3: Đường Sóc Ba Buông (Xuân Hòa - Xuân Hưng)', '12FO'),
    '49': ('Route 3: Đường Sóc Ba Buông (Xuân Hòa - Xuân Hưng)', '12FO'),
    
    '5': ('Route 4: Tuyến Suối Đá - Suối Cầu - Suối Bà Rùa', '12FO'),
    '7': ('Route 4: Tuyến Suối Đá - Suối Cầu - Suối Bà Rùa', '12FO'),
    '51': ('Route 4: Tuyến Suối Đá - Suối Cầu - Suối Bà Rùa', '12FO'),
    '52': ('Route 4: Tuyến Suối Đá - Suối Cầu - Suối Bà Rùa', '12FO'),
    '53': ('Route 4: Tuyến Suối Đá - Suối Cầu - Suối Bà Rùa', '12FO'),
    '54': ('Route 4: Tuyến Suối Đá - Suối Cầu - Suối Bà Rùa', '12FO'),
    
    '6': ('Route 5: Đồi Môn - Làng Chăm - THPT Xuân Hưng', '24FO'),
    '8': ('Route 5: Đồi Môn - Làng Chăm - THPT Xuân Hưng', '24FO'),
    '11': ('Route 5: Đồi Môn - Làng Chăm - THPT Xuân Hưng', '24FO'),
    '12': ('Route 5: Đồi Môn - Làng Chăm - THPT Xuân Hưng', '24FO'),
    '13': ('Route 5: Đồi Môn - Làng Chăm - THPT Xuân Hưng', '24FO'),
    '25': ('Route 5: Đồi Môn - Làng Chăm - THPT Xuân Hưng', '24FO'),
    '34': ('Route 5: Đồi Môn - Làng Chăm - THPT Xuân Hưng', '24FO'),
    '35': ('Route 5: Đồi Môn - Làng Chăm - THPT Xuân Hưng', '24FO'),
    '41': ('Route 5: Đồi Môn - Làng Chăm - THPT Xuân Hưng', '24FO'),
    '43': ('Route 5: Đồi Môn - Làng Chăm - THPT Xuân Hưng', '24FO'),
    '45': ('Route 5: Đồi Môn - Làng Chăm - THPT Xuân Hưng', '24FO'),
    '46': ('Route 5: Đồi Môn - Làng Chăm - THPT Xuân Hưng', '24FO'),
    '50': ('Route 5: Đồi Môn - Làng Chăm - THPT Xuân Hưng', '24FO'),
    
    '10': ('Route 6: QL1A Xuân Tâm - Sông Ui - Cao tốc', '12FO'),
    '14': ('Route 6: QL1A Xuân Tâm - Sông Ui - Cao tốc', '12FO'),
    '15': ('Route 6: QL1A Xuân Tâm - Sông Ui - Cao tốc', '12FO'),
    '17': ('Route 6: QL1A Xuân Tâm - Sông Ui - Cao tốc', '12FO'),
    '40': ('Route 6: QL1A Xuân Tâm - Sông Ui - Cao tốc', '12FO'),
    '48': ('Route 6: QL1A Xuân Tâm - Sông Ui - Cao tốc', '12FO'),
    
    '16': ('Route 7: Cụm KCN Xuân Lộc & Hồ Gia Ui', '12FO'),
    '18': ('Route 7: Cụm KCN Xuân Lộc & Hồ Gia Ui', '12FO'),
    '19': ('Route 7: Cụm KCN Xuân Lộc & Hồ Gia Ui', '12FO'),
    '20': ('Route 7: Cụm KCN Xuân Lộc & Hồ Gia Ui', '12FO'),
    '21': ('Route 7: Cụm KCN Xuân Lộc & Hồ Gia Ui', '12FO'),
    '22': ('Route 7: Cụm KCN Xuân Lộc & Hồ Gia Ui', '12FO'),
    '23': ('Route 7: Cụm KCN Xuân Lộc & Hồ Gia Ui', '12FO'),
    '36': ('Route 7: Cụm KCN Xuân Lộc & Hồ Gia Ui', '12FO'),
    '37': ('Route 7: Cụm KCN Xuân Lộc & Hồ Gia Ui', '12FO'),
    '38': ('Route 7: Cụm KCN Xuân Lộc & Hồ Gia Ui', '12FO'),
    '44': ('Route 7: Cụm KCN Xuân Lộc & Hồ Gia Ui', '12FO'),
    '47': ('Route 7: Cụm KCN Xuân Lộc & Hồ Gia Ui', '12FO')
}

processed_cams = []

for r in survey_rows[3:]:
    if len(r) > 4 and r[0].strip() and r[0].strip() != 'xxx':
        stt = r[0].strip()
        name = r[1].strip()
        point_id = r[2].strip()
        coord_raw = r[4].strip()
        map_link = r[5].strip() if len(r) > 5 else ''
        note_loc = r[21].strip() if len(r) > 21 else (r[22].strip() if len(r) > 22 else '')
        
        if stt in coord_overrides:
            lat, lon = coord_overrides[stt]
        else:
            lat, lon = dms_to_dd(coord_raw)
            
        if not lat or not lon:
            status_text = 'Điểm bỏ' if 'bỏ' in coord_raw.lower() else ('Điểm trùng' if 'trùng' in coord_raw.lower() else 'Chưa có tọa độ')
            processed_cams.append({
                'stt': stt, 'point_id': point_id, 'name': name, 'valid': False,
                'status_text': status_text, 'lat': None, 'lon': None,
                'col_h': '', 'col_i': '', 'col_j': '', 'col_k': '', 'col_l': '',
                'note': status_text, 'raw_row': r
            })
            continue

        # Find closest BTS among active
        closest_bts = min(active_bts, key=lambda s: haversine(lat, lon, s['lat'], s['lon']))
        d_bts = haversine(lat, lon, closest_bts['lat'], closest_bts['lon'])
        
        # Check closest direct CSG
        csg_list = [s for s in active_bts if s['is_csg']]
        closest_csg = min(csg_list, key=lambda s: haversine(lat, lon, s['lat'], s['lon']))
        d_csg = haversine(lat, lon, closest_csg['lat'], closest_csg['lon'])
        
        # DECISION RULE:
        # If camera is within 1500m of a CSG directly, pull cable directly to CSG!
        # Otherwise pull to closest BTS:
        #   - If CRAN: Col H is MAIN / CSG of that CRAN!
        #   - If MACRO: Col H is that MACRO site (note: trang bị thêm LSW)
        
        if d_csg <= 1500 and not closest_bts['is_cran']:
            target_bts = closest_csg
            dist_bts = d_csg
            col_h = f"CSG-{closest_csg['site_id_old']}"
            col_i = "Port CSG"
            note = f"Kéo cáp trực tiếp về cổng {col_h}"
            bts_type = 'CSG'
            target_node_lat, target_node_lon = closest_csg['lat'], closest_csg['lon']
            connected_bts_old = closest_csg['site_id_old']
            is_cran_tap = False
            cran_main_bts = None
        else:
            target_bts = closest_bts
            dist_bts = d_bts
            t_old = target_bts['site_id_old']
            target_node_lat, target_node_lon = target_bts['lat'], target_bts['lon']
            connected_bts_old = t_old
            
            if target_bts['is_cran']:
                bts_type = 'CRAN OUT DOOR'
                main_code = target_bts['main_code']
                main_is_csg = target_bts['main_is_csg']
                cran_main_bts = target_bts.get('main_site')
                is_cran_tap = True
                
                if main_is_csg:
                    col_h = f"CSG-{main_code}"
                    col_i = "Port CSG"
                    note = f"Kéo vào CRAN {t_old} ({int(dist_bts)}m), mượn core quang hiện hữu về CSG-{main_code}"
                else:
                    col_h = f"{main_code} (Trang bị thêm LSW)"
                    col_i = "Port LSW"
                    note = f"Kéo vào CRAN {t_old} ({int(dist_bts)}m), mượn core quang hiện hữu về MAIN {main_code}"
            elif target_bts['is_csg']:
                bts_type = 'CSG'
                col_h = f"CSG-{t_old}"
                col_i = "Port CSG"
                note = f"Kéo cáp trực tiếp về cổng CSG-{t_old}"
                is_cran_tap = False
                cran_main_bts = None
            else: # MACRO
                bts_type = 'MACRO'
                is_cran_tap = False
                cran_main_bts = None
                if target_bts['has_lsw']:
                    col_h = f"{t_old} (Đã có LSW)"
                    col_i = "Port LSW"
                    note = f"Đấu nối Switch LSW sẵn có tại trạm Macro {t_old}"
                else:
                    col_h = f"{t_old} (Trang bị thêm LSW)"
                    col_i = "Port LSW"
                    note = f"Trạm Macro {t_old} cần trang bị thêm 01 Switch LSW"

        est_cable_m = int(math.ceil((dist_bts * 1.35) / 50.0) * 50)
        if est_cable_m < 150: est_cable_m = 150
        
        # Route & Cable
        route_info = route_map_def.get(stt, (f"Nhánh cục bộ {connected_bts_old}", "2FO/4FO"))
        col_k = route_info[0]
        col_l = route_info[1]
        
        processed_cams.append({
            'stt': stt, 'point_id': point_id, 'name': name, 'valid': True,
            'status_text': 'Hoạt Động',
            'lat': lat, 'lon': lon,
            'bts_old': connected_bts_old,
            'bts_type': bts_type,
            'bts_lat': target_node_lat,
            'bts_lon': target_node_lon,
            'is_cran_tap': is_cran_tap,
            'cran_main_bts': cran_main_bts,
            'dist_m': est_cable_m,
            'col_h': col_h,
            'col_i': col_i,
            'col_j': est_cable_m,
            'col_k': col_k,
            'col_l': col_l,
            'note': note,
            'map_link': map_link,
            'note_loc': note_loc,
            'raw_row': r
        })

print(f"Processed {len(processed_cams)} camera records.")

# 3. Export CSV for Copy/Paste
out_csv_path = "/Users/cang_it/Library/CloudStorage/GoogleDrive-canglt1985@gmail.com/My Drive/Cam Xa Xuan Hoa/Cot_H_den_L_De_Copy_Paste.csv"
with open(out_csv_path, 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerow([
        'STT', 'Mã Điểm', 'Tên Vị Trí Camera', 'Tọa Độ', 
        'Cột H (CSG / Trạm LM)', 'Cột I (Port CSG/LSW)', 'Cột J (Khoảng Cách m)', 
        'Cột K (Route)', 'Cột L (Loại Cáp)', 'Ghi Chú Kỹ Thuật Đấu Nối'
    ])
    for c in processed_cams:
        coord_str = f"{c['lat']:.6f}, {c['lon']:.6f}" if c['valid'] else c['status_text']
        writer.writerow([
            c['stt'], c['point_id'], c['name'], coord_str,
            c['col_h'], c['col_i'], c['col_j'], c['col_k'], c['col_l'], c['note']
        ])
print(f"Exported CSV: {out_csv_path}")

# 4. Export Excel with Rich Formatting
out_xlsx_path = "/Users/cang_it/Library/CloudStorage/GoogleDrive-canglt1985@gmail.com/My Drive/Cam Xa Xuan Hoa/Phan_Tich_Keo_Cap_Camera_Xuan_Loc_20261016.xlsx"
wb = openpyxl.Workbook()

# Sheet 1: Quy hoạch chi tiết 64 Cam
ws1 = wb.active
ws1.title = "Quy_Hoach_Camera_Xuan_Loc"
ws1.views.sheetView[0].showGridLines = True

# Styles
f_title = Font(name='Calibri', size=14, bold=True, color='1F497D')
f_sub = Font(name='Calibri', size=10, italic=True, color='595959')
f_header = Font(name='Calibri', size=10, bold=True, color='FFFFFF')
f_data = Font(name='Calibri', size=9)
f_data_bold = Font(name='Calibri', size=9, bold=True)
f_red = Font(name='Calibri', size=9, color='C00000', bold=True)

fill_h_group1 = PatternFill('solid', fgColor='1F497D') # Blue dark
fill_h_group2 = PatternFill('solid', fgColor='366092') # Blue medium
fill_h_group3 = PatternFill('solid', fgColor='C00000') # Red for Col H-L
fill_h_group4 = PatternFill('solid', fgColor='4F81BD')

fill_zebra = PatternFill('solid', fgColor='F2F5F8')
fill_highlight = PatternFill('solid', fgColor='FFFFCC')
fill_invalid = PatternFill('solid', fgColor='F2F2F2')

thin_side = Side(style='thin', color='D9D9D9')
border_cell = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)

align_center = Alignment(horizontal='center', vertical='center', wrap_text=True)
align_left = Alignment(horizontal='left', vertical='center', wrap_text=True)
align_right = Alignment(horizontal='right', vertical='center')

ws1.merge_cells('A1:L1')
ws1['A1'] = "QUY HOẠCH HẠ TẦNG TRUYỀN DẪN QUANG CHO 64 CAMERA AN NINH HUYỆN XUÂN LỘC - XÃ XUÂN HÒA"
ws1['A1'].font = f_title
ws1['A1'].alignment = align_left

ws1.merge_cells('A2:L2')
ws1['A2'] = "Cột H điền thông tin trạm CSG hoặc trạm Macro (ghi chú trang bị thêm LSW). Camera về CRAN OUT DOOR điền trạm MAIN/CSG (mượn sợi quang hiện hữu)."
ws1['A2'].font = f_sub
ws1['A2'].alignment = align_left

headers_s1 = [
    'STT', 'Vị Trí / Mạng', 'Channel', 'Tọa Độ Khảo Sát', 'Map', 'Cột Camera',
    'Cột H\nCSG / Trạm LM', 'Cột I\nPort CSG/LSW', 'Cột J\nKhoảng Cách (m)', 
    'Cột K\nRoute Gom Tuyến', 'Cột L\nLoại Cáp Đề Xuất', 'Ghi Chú Kỹ Thuật & Đấu Nối'
]

ws1.row_dimensions[4].height = 32
for c_idx, h in enumerate(headers_s1, 1):
    cell = ws1.cell(row=4, column=c_idx, value=h)
    cell.font = f_header
    cell.alignment = align_center
    cell.border = border_cell
    if c_idx in [7, 8, 9, 10, 11, 12]:
        cell.fill = fill_h_group3
    elif c_idx <= 3:
        cell.fill = fill_h_group1
    else:
        cell.fill = fill_h_group2

row_cur = 5
for idx, c in enumerate(processed_cams):
    ws1.row_dimensions[row_cur].height = 24
    stt_val = c['stt']
    pt_val = c['point_id']
    name_val = c['name']
    coord_val = f"{c['lat']:.5f}, {c['lon']:.5f}" if c['valid'] else c['status_text']
    map_val = c.get('map_link', '')
    cot_val = pt_val
    col_h_val = c['col_h']
    col_i_val = c['col_i']
    col_j_val = c['col_j']
    col_k_val = c['col_k']
    col_l_val = c['col_l']
    note_val = c['note']
    
    vals = [stt_val, name_val, pt_val, coord_val, map_val, cot_val,
            col_h_val, col_i_val, col_j_val, col_k_val, col_l_val, note_val]
    
    for c_idx, val in enumerate(vals, 1):
        cell = ws1.cell(row=row_cur, column=c_idx, value=val)
        cell.border = border_cell
        cell.font = f_data
        
        if not c['valid']:
            cell.fill = fill_invalid
            cell.alignment = align_center
            if c_idx == 4 or c_idx == 12:
                cell.font = f_red
        else:
            if idx % 2 == 1:
                cell.fill = fill_zebra
            if c_idx in [7, 8, 10, 11]:
                cell.font = f_data_bold
                if 'Trang bị thêm LSW' in str(val):
                    cell.font = f_red
            if c_idx in [1, 3, 5, 6, 8, 11]:
                cell.alignment = align_center
            elif c_idx in [9]:
                cell.alignment = align_right
            else:
                cell.alignment = align_left
    row_cur += 1

# Auto adjust columns ws1
col_widths = {1: 8, 2: 36, 3: 12, 4: 24, 5: 12, 6: 12, 7: 28, 8: 14, 9: 16, 10: 36, 11: 18, 12: 45}
for col_i, w in col_widths.items():
    ws1.column_dimensions[get_column_letter(col_i)].width = w

# Sheet 2: Tổng hợp Tuyến Trục & Gom Cáp
ws2 = wb.create_sheet(title="Tong_Hop_Route_Va_Cap")
ws2.views.sheetView[0].showGridLines = True

ws2.merge_cells('A1:G1')
ws2['A1'] = "TỔNG HỢP CÁC TUYẾN TRỤC GOM QUANG (ROUTE) CHO CAMERA HUYỆN XUÂN LỘC"
ws2['A1'].font = f_title

headers_s2 = ['Route ID', 'Tên Tuyến Hành Lang', 'Số Cam Gom', 'Đích Đấu Nối (CSG / MAIN)', 'Cáp Trục Đề Xuất', 'Dự Phòng Core', 'Đánh Giá & Ưu Điểm']
ws2.row_dimensions[3].height = 28
for c_idx, h in enumerate(headers_s2, 1):
    cell = ws2.cell(row=3, column=c_idx, value=h)
    cell.font = f_header
    cell.fill = fill_h_group1
    cell.alignment = align_center
    cell.border = border_cell

routes_summary_data = [
    ('Route 1', 'QL1A Đông (Xuân Hòa - Bình Thuận giáp ranh Cầu Sông Phan)', 6, 'DNXL21 & DNXL49 (Trang bị thêm LSW)', '12FO', 'Dự phòng 6-8 core', 'Gom toàn bộ camera cửa ngõ phía Đông; chỉ xin 1 giấy phép treo cáp Điện lực trên QL1A.'),
    ('Route 2', 'Cụm QL1A - Tín Nghĩa & Trạm CRAN DNXL69', 7, 'CRAN DNXL69 -> MAIN DNXL05 (Trang bị LSW)', '12FO', 'Dự phòng 6 core', 'Tận dụng 100% tuyến quang hiện hữu từ CRAN DNXL69 về MAIN DNXL05, KHÔNG CẦN QUANG HÓA.'),
    ('Route 3', 'Tuyến Sóc Ba Buông (Xuân Hòa - Xuân Hưng)', 3, 'Macro DNXL50 (Trang bị thêm LSW)', '12FO', 'Dự phòng 8 core', 'Tuyến đường mỏ cát & xe tải; dùng cáp trục 12FO chịu lực tốt, chống đứt tốt hơn cáp 2FO.'),
    ('Route 4', 'Tuyến Suối Đá - Suối Cầu - Suối Bà Rùa - Tà Lú', 6, 'Macro DNXL20 (Trang bị thêm LSW)', '12FO', 'Dự phòng 6 core', 'Gom các camera quan sát xả rác và lò gạch ven suối về trạm Macro DNXL20.'),
    ('Route 5', 'Trục Đồi Môn - Làng Chăm - THPT Xuân Hưng', 13, 'CSG-DNXL44 & CRAN DNXL78 (về CSG DNXL44)', '24FO', 'Dự phòng 12-14 core', 'Tuyến đông camera nhất (13 cam); bắt buộc dùng cáp 24FO để đủ core và dự phòng dài hạn.'),
    ('Route 6', 'QL1A Xuân Tâm - Sông Ui - Nút giao Cao tốc', 6, 'CSG-DNXL44 (qua CRAN DNXL63) & DNXL09', '12FO', 'Dự phòng 6 core', 'Khai thác trạm CRAN DNXL63 và CRAN DNXL74 có sẵn cáp quang về CSG DNXL44 và Macro DNXL09.'),
    ('Route 7', 'Cụm KCN Xuân Lộc & Hồ Gia Ui - Cao tốc', 12, 'CSG-DNXL23, CSG-DNXL75, Macro DNXL06, DNXL18', '12FO', 'Dự phòng 6 core', 'Phân đoạn gom vào các trạm CSG và Macro lân cận quanh khu công nghiệp.')
]

for r_idx, r_data in enumerate(routes_summary_data, 4):
    ws2.row_dimensions[r_idx].height = 26
    for c_idx, val in enumerate(r_data, 1):
        cell = ws2.cell(row=r_idx, column=c_idx, value=val)
        cell.font = f_data
        cell.border = border_cell
        if c_idx in [1, 3, 5]:
            cell.alignment = align_center
            if c_idx == 1: cell.font = f_data_bold
        else:
            cell.alignment = align_left

col_widths_s2 = {1: 12, 2: 38, 3: 14, 4: 32, 5: 18, 6: 18, 7: 45}
for col_i, w in col_widths_s2.items():
    ws2.column_dimensions[get_column_letter(col_i)].width = w

# Sheet 3: Danh sách trạm BTS liên quan
ws3 = wb.create_sheet(title="Danh_Sach_Tram_BTS_Lien_Quan")
ws3.views.sheetView[0].showGridLines = True

ws3.merge_cells('A1:G1')
ws3['A1'] = "DANH SÁCH CÁC TRẠM BTS ACTIVE QUY HOẠCH KẾT NỐI CAMERA (CSG / MACRO / CRAN)"
ws3['A1'].font = f_title

headers_s3 = ['Mã Trạm Cũ', 'Mã Trạm Mới', 'Phân Loại Trạm', 'Trạm MAIN / CSG Tương Ứng', 'Cần Trang Bị Thiết Bị', 'Tọa Độ Trạm', 'Đặc Điểm Truyền Dẫn']
ws3.row_dimensions[3].height = 28
for c_idx, h in enumerate(headers_s3, 1):
    cell = ws3.cell(row=3, column=c_idx, value=h)
    cell.font = f_header
    cell.fill = fill_h_group1
    cell.alignment = align_center
    cell.border = border_cell

bts_highlight_list = [
    ('DNXL44', 'DNIXHO12', 'CSG Hub (Trạm MAIN)', 'CSG-DNXL44', 'Không (Đã có CSG)', '10.8601, 107.4912', 'Trạm Hub trung tâm CSG A901-6CZ-FT-D, kết nối quang trực tiếp.'),
    ('DNXL23', 'DNIXLO09', 'CSG Hub', 'CSG-DNXL23', 'Không (Đã có CSG)', '10.9189, 107.4215', 'Trạm Hub CSG ASR-920-12CZ-D phục vụ khu vực KCN.'),
    ('DNXL07', 'DNIXLO02', 'CSG Hub', 'CSG-DNXL07', 'Không (Đã có CSG)', '10.9312, 107.4021', 'Trạm Hub CSG ASR-920-12CZ-D.'),
    ('DNXL75', 'DNIXLO26', 'CSG Hub', 'CSG-DNXL75', 'Không (Đã có CSG)', '10.9085, 107.4190', 'Trạm CSG phục vụ vòng xoay KCN Xuân Lộc.'),
    ('DNXL69', 'DNIXHO17', 'CRAN OUT DOOR', 'MAIN DNXL05', 'Không cần quang hóa', '10.8287, 107.5436', 'Đã có sẵn cáp quang về MAIN DNXL05. Mượn sợi quang hiện hữu.'),
    ('DNXL63', 'DNIXHO16', 'CRAN OUT DOOR', 'CSG-DNXL44', 'Không cần quang hóa', '10.8842, 107.5021', 'Đã có sẵn cáp quang về CSG-DNXL44. Mượn sợi quang hiện hữu.'),
    ('DNXL78', 'DNIXHO20', 'CRAN OUT DOOR', 'CSG-DNXL44', 'Không cần quang hóa', '10.8631, 107.4962', 'Đã có sẵn cáp quang về CSG-DNXL44.'),
    ('DNXL74', 'DNIXHO18', 'CRAN OUT DOOR', 'MAIN DNXL09', 'Không cần quang hóa', '10.8765, 107.4421', 'Đã có sẵn cáp quang về MAIN DNXL09.'),
    ('DNXL67', 'DNIXLO23', 'CRAN OUT DOOR', 'CSG-DNXL23', 'Không cần quang hóa', '10.9125, 107.4230', 'Đã có sẵn cáp quang về CSG-DNXL23.'),
    ('DNXL53', 'DNIXHO15', 'CRAN OUT DOOR', 'MAIN DNXL09', 'Không cần quang hóa', '10.8710, 107.4610', 'Đã có sẵn cáp quang về MAIN DNXL09.'),
    ('DNXL05', 'DNIXHO00', 'MACRO', 'DNXL05', 'Trang bị thêm Switch LSW', '10.8315, 107.5382', 'Trạm Macro phục vụ trạm dừng chân QL1A và cụm CRAN DNXL69.'),
    ('DNXL20', 'DNIXHO03', 'MACRO', 'DNXL20', 'Trang bị thêm Switch LSW', '10.8354, 107.5120', 'Trạm Macro phục vụ cụm Suối Bà Rùa, Suối Đá.'),
    ('DNXL21', 'DNIXHO04', 'MACRO', 'DNXL21', 'Trang bị thêm Switch LSW', '10.8142, 107.5710', 'Trạm Macro phục vụ QL1A giáp Bình Thuận (thay thế MBF_DNXL01 MORAN).'),
    ('DNXL24', 'DNIXHO06', 'MACRO', 'DNXL24 (Đã có LSW)', 'Không (Đã có LSW)', '10.8580, 107.4990', 'Đã có Switch LSW L2 tại trạm, có thể cắm trực tiếp converter.'),
    ('DNXL36', 'DNIXHO10', 'MACRO', 'DNXL36 (Đã có LSW)', 'Không (Đã có LSW)', '10.9200, 107.4350', 'Đã có Switch LSW L2 tại trạm.'),
    ('DNXL49', 'DNIXHO13', 'MACRO', 'DNXL49', 'Trang bị thêm Switch LSW', '10.8210, 107.5580', 'Trạm Macro phục vụ đường Cọ Dầu ấp 3.'),
    ('DNXL50', 'DNIXHO14', 'MACRO', 'DNXL50', 'Trang bị thêm Switch LSW', '10.8650, 107.5450', 'Trạm Macro phục vụ đường Sóc Ba Buông.'),
    ('DNXL06', 'DNIXHO01', 'MACRO', 'DNXL06', 'Trang bị thêm Switch LSW', '10.9010, 107.4260', 'Trạm Macro khu vực KCN.'),
    ('DNXL18', 'DNIXTC02', 'MACRO', 'DNXL18', 'Trang bị thêm Switch LSW', '10.9650, 107.4890', 'Trạm Macro khu vực Gia Ui.')
]

for r_idx, b_data in enumerate(bts_highlight_list, 4):
    ws3.row_dimensions[r_idx].height = 24
    for c_idx, val in enumerate(b_data, 1):
        cell = ws3.cell(row=r_idx, column=c_idx, value=val)
        cell.font = f_data
        cell.border = border_cell
        if c_idx in [1, 2, 3]:
            cell.alignment = align_center
            if c_idx == 1: cell.font = f_data_bold
        elif c_idx == 6:
            cell.alignment = align_center
        else:
            cell.alignment = align_left
            if 'Trang bị thêm' in str(val):
                cell.font = f_red

col_widths_s3 = {1: 14, 2: 14, 3: 20, 4: 26, 5: 26, 6: 22, 7: 45}
for col_i, w in col_widths_s3.items():
    ws3.column_dimensions[get_column_letter(col_i)].width = w

wb.save(out_xlsx_path)
print(f"Exported Excel: {out_xlsx_path}")

# 5. Build Standalone Interactive Leaflet HTML Map
out_html_path = "/Users/cang_it/Library/CloudStorage/GoogleDrive-canglt1985@gmail.com/My Drive/Cam Xa Xuan Hoa/Ban_Do_Tuyen_Cap_Camera_Xuan_Loc.html"

# Prepare JSON data for HTML Map
cam_geojson_features = []
for c in processed_cams:
    if c['valid']:
        cam_geojson_features.append({
            'type': 'Feature',
            'geometry': {'type': 'Point', 'coordinates': [c['lon'], c['lat']]},
            'properties': {
                'stt': c['stt'],
                'point_id': c['point_id'],
                'name': c['name'],
                'bts_old': c['bts_old'],
                'bts_type': c['bts_type'],
                'col_h': c['col_h'],
                'col_i': c['col_i'],
                'col_j': c['col_j'],
                'col_k': c['col_k'],
                'col_l': c['col_l'],
                'note': c['note'],
                'is_cran': c['is_cran_tap'],
                'cable_dist': c['dist_m']
            }
        })

# Unique BTS used
used_bts_set = {}
for c in processed_cams:
    if c['valid']:
        bts_id = c['bts_old']
        if bts_id not in used_bts_set:
            used_bts_set[bts_id] = {
                'id': bts_id,
                'type': c['bts_type'],
                'lat': c['bts_lat'],
                'lon': c['bts_lon'],
                'col_h': c['col_h'],
                'is_cran': c['is_cran_tap']
            }
            if c['cran_main_bts']:
                m = c['cran_main_bts']
                m_code = m['site_id_old']
                if m_code not in used_bts_set:
                    used_bts_set[m_code] = {
                        'id': m_code,
                        'type': 'CSG' if m['is_csg'] else 'MACRO',
                        'lat': m['lat'],
                        'lon': m['lon'],
                        'col_h': f"CSG-{m_code}" if m['is_csg'] else m_code,
                        'is_cran': False
                    }

# Cable lines
cable_lines = []
for c in processed_cams:
    if c['valid']:
        cable_lines.append({
            'stt': c['stt'],
            'from': [c['lat'], c['lon']],
            'to': [c['bts_lat'], c['bts_lon']],
            'route': c['col_k'],
            'cable': c['col_l'],
            'dist': c['col_j'],
            'bts': c['bts_old'],
            'is_cran': c['is_cran_tap']
        })

# Backhaul lines from CRAN to MAIN
cran_backhaul_lines = []
for c in processed_cams:
    if c['valid'] and c['is_cran_tap'] and c['cran_main_bts']:
        m = c['cran_main_bts']
        key = f"{c['bts_old']}->{m['site_id_old']}"
        if not any(k.get('key') == key for k in cran_backhaul_lines):
            cran_backhaul_lines.append({
                'key': key,
                'from': [c['bts_lat'], c['bts_lon']],
                'to': [m['lat'], m['lon']],
                'cran': c['bts_old'],
                'main': m['site_id_old']
            })

html_content = f"""<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bản Đồ Tuyến Cáp Quang Camera An Ninh Xuân Lộc</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: 'Inter', sans-serif; background: #0f172a; color: #f8fafc; overflow: hidden; }}
        #map {{ width: 100vw; height: 100vh; z-index: 1; }}

        /* Glassmorphism Panels */
        .glass-panel {{
            position: absolute;
            background: rgba(15, 23, 42, 0.88);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 12px;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
            z-index: 1000;
        }}

        /* Header Card */
        .header-panel {{
            top: 16px;
            left: 16px;
            max-width: 440px;
            padding: 16px 20px;
        }}
        .header-title {{
            font-size: 16px;
            font-weight: 700;
            color: #38bdf8;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
        }}
        .header-sub {{
            font-size: 12px;
            color: #94a3b8;
            line-height: 1.45;
        }}

        /* Stats Floating Bar */
        .stats-panel {{
            bottom: 24px;
            left: 16px;
            padding: 12px 18px;
            display: flex;
            gap: 20px;
        }}
        .stat-item {{
            display: flex;
            flex-direction: column;
        }}
        .stat-value {{
            font-size: 18px;
            font-weight: 700;
            color: #38bdf8;
        }}
        .stat-label {{
            font-size: 10px;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.5px;
        }}

        /* Control & Filter Panel */
        .filter-panel {{
            top: 16px;
            right: 16px;
            width: 320px;
            padding: 16px;
            max-height: calc(100vh - 32px);
            overflow-y: auto;
        }}
        .filter-title {{
            font-size: 13px;
            font-weight: 600;
            color: #e2e8f0;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}
        .filter-group {{
            margin-bottom: 14px;
        }}
        .filter-label {{
            font-size: 11px;
            color: #94a3b8;
            margin-bottom: 6px;
            display: block;
        }}
        select, input {{
            width: 100%;
            background: #1e293b;
            border: 1px solid #334155;
            color: #f1f5f9;
            padding: 8px 10px;
            border-radius: 6px;
            font-size: 12px;
            outline: none;
        }}
        select:focus, input:focus {{
            border-color: #38bdf8;
        }}

        /* Legend */
        .legend-item {{
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 12px;
            margin-bottom: 6px;
            color: #cbd5e1;
        }}
        .legend-badge {{
            width: 14px;
            height: 14px;
            border-radius: 4px;
            display: inline-block;
        }}

        /* Custom Markers */
        .cam-marker {{
            background: #0284c7;
            border: 2px solid #ffffff;
            border-radius: 50%;
            color: #fff;
            font-weight: bold;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 10px rgba(2, 132, 199, 0.8);
        }}
        .bts-marker {{
            width: 28px;
            height: 28px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 11px;
            box-shadow: 0 0 12px rgba(0, 0, 0, 0.6);
            border: 2px solid #ffffff;
        }}
        .bts-csg {{ background: #dc2626; color: #fff; }}
        .bts-macro {{ background: #2563eb; color: #fff; }}
        .bts-cran {{ background: #9333ea; color: #fff; }}

        /* Popup */
        .leaflet-popup-content-wrapper {{
            background: #0f172a !important;
            color: #f1f5f9 !important;
            border: 1px solid rgba(255,255,255,0.15) !important;
            border-radius: 10px !important;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important;
        }}
        .leaflet-popup-tip {{
            background: #0f172a !important;
        }}
        .popup-title {{
            font-weight: 700;
            font-size: 14px;
            color: #38bdf8;
            margin-bottom: 6px;
            border-bottom: 1px solid #334155;
            padding-bottom: 4px;
        }}
        .popup-row {{
            font-size: 12px;
            margin-bottom: 4px;
            display: flex;
            justify-content: space-between;
        }}
        .popup-label {{ color: #94a3b8; }}
        .popup-val {{ font-weight: 600; color: #f8fafc; text-align: right; }}
        .popup-highlight {{ color: #f59e0b; font-weight: 600; }}
        .popup-cran {{ color: #c084fc; font-weight: 600; }}
        .badge-tag {{
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            margin-top: 4px;
        }}
        .badge-12fo {{ background: #0369a1; color: #e0f2fe; }}
        .badge-24fo {{ background: #4338ca; color: #e0e7ff; }}
    </style>
</head>
<body>

    <div class="glass-panel header-panel">
        <div class="header-title">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
            Tuyến Cáp Quang 64 Camera Xuân Lộc
        </div>
        <div class="header-sub">
            • <b>Cột H</b>: Trạm CSG hoặc trạm Macro (trang bị LSW).<br>
            • <b>CRAN OUT DOOR</b>: Điền trạm <b>MAIN/CSG</b> (mượn core quang có sẵn).<br>
            • <b>Trục gom</b>: Tuyến quang nhiều FO (12FO/24FO) rẽ măng xông.
        </div>
    </div>

    <div class="glass-panel stats-panel">
        <div class="stat-item">
            <div class="stat-value">64</div>
            <div class="stat-label">Tổng Camera</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">52</div>
            <div class="stat-label">Đã Có Tọa Độ</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">7</div>
            <div class="stat-label">Tuyến Gom (Routes)</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">12FO / 24FO</div>
            <div class="stat-label">Cáp Trục Gom</div>
        </div>
    </div>

    <div class="glass-panel filter-panel">
        <div class="filter-title">
            <span>BỘ LỌC & THIẾT KẾ</span>
            <button onclick="resetView()" style="background:transparent; border:none; color:#38bdf8; cursor:pointer; font-size:11px;">Reset View</button>
        </div>

        <div class="filter-group">
            <label class="filter-label">Tìm kiếm Camera (STT hoặc Tên):</label>
            <input type="text" id="camSearch" placeholder="Ví dụ: Điểm 2, Tín Nghĩa, 49..." onkeyup="filterCams()">
        </div>

        <div class="filter-group">
            <label class="filter-label">Lọc theo Tuyến Hành Lang (Route):</label>
            <select id="routeSelect" onchange="filterCams()">
                <option value="all">Tất cả các Tuyến (7 Routes)</option>
                <option value="Route 1">Route 1: QL1A Đông (Bình Thuận)</option>
                <option value="Route 2">Route 2: Cụm Tín Nghĩa & CRAN DNXL69</option>
                <option value="Route 3">Route 3: Đường Sóc Ba Buông</option>
                <option value="Route 4">Route 4: Tuyến Suối Đá - Suối Cầu</option>
                <option value="Route 5">Route 5: Đồi Môn - Làng Chăm (24FO)</option>
                <option value="Route 6">Route 6: QL1A Xuân Tâm - Sông Ui</option>
                <option value="Route 7">Route 7: Cụm KCN Xuân Lộc & Hồ Gia Ui</option>
            </select>
        </div>

        <div class="filter-group">
            <label class="filter-label">Chú thích Lớp Bản Đồ:</label>
            <div class="legend-item">
                <span class="legend-badge" style="background:#0284c7; border-radius:50%;"></span>
                <span>Camera An Ninh (64 điểm)</span>
            </div>
            <div class="legend-item">
                <span class="legend-badge bts-csg"></span>
                <span>Trạm CSG Hub (Đỏ)</span>
            </div>
            <div class="legend-item">
                <span class="legend-badge bts-macro"></span>
                <span>Trạm Macro (Xanh - trang bị LSW)</span>
            </div>
            <div class="legend-item">
                <span class="legend-badge bts-cran"></span>
                <span>Trạm CRAN OUT DOOR (Tím - có quang)</span>
            </div>
            <div class="legend-item">
                <span style="display:inline-block; width:16px; height:3px; background:#38bdf8;"></span>
                <span>Cáp quang kéo mới (12FO / 24FO)</span>
            </div>
            <div class="legend-item">
                <span style="display:inline-block; width:16px; height:3px; background:#a855f7; border-top:2px dashed #c084fc;"></span>
                <span>Quang hiện hữu CRAN -> MAIN</span>
            </div>
        </div>
    </div>

    <div id="map"></div>

    <script>
        const camData = {json.dumps(cam_geojson_features, ensure_ascii=False)};
        const btsData = {json.dumps(used_bts_set, ensure_ascii=False)};
        const cableLines = {json.dumps(cable_lines, ensure_ascii=False)};
        const backhaulLines = {json.dumps(cran_backhaul_lines, ensure_ascii=False)};

        // Initialize Map
        const map = L.map('map', {{
            center: [10.875, 107.495],
            zoom: 12,
            zoomControl: false
        }});
        L.control.zoom({{ position: 'bottomright' }}).addTo(map);

        // Tile Layers
        const googleSat = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={{x}}&y={{y}}&z={{z}}', {{
            maxZoom: 20,
            attribution: 'Google Hybrid'
        }}).addTo(map);

        const osm = L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
            maxZoom: 19,
            attribution: 'OpenStreetMap'
        }});

        const cartoDark = L.tileLayer('https://{{s}}.basemaps.cartocdn.com/dark_all/{{z}}/{{x}}/{{y}}{{r}}.png', {{
            maxZoom: 19,
            attribution: 'CartoDB Dark'
        }});

        const baseMaps = {{
            "Vệ tinh Google (Hybrid)": googleSat,
            "Bản đồ Giao thông (OSM)": osm,
            "Bản đồ Dark Mode": cartoDark
        }};
        L.control.layers(baseMaps, null, {{ position: 'topleft' }}).addTo(map);

        // Layers
        const camLayerGroup = L.layerGroup().addTo(map);
        const btsLayerGroup = L.layerGroup().addTo(map);
        const cableLayerGroup = L.layerGroup().addTo(map);
        const backhaulLayerGroup = L.layerGroup().addTo(map);

        // Render BTS Markers
        Object.values(btsData).forEach(b => {{
            let cls = 'bts-macro';
            let label = 'M';
            if (b.type.includes('CSG')) {{ cls = 'bts-csg'; label = 'CSG'; }}
            else if (b.is_cran) {{ cls = 'bts-cran'; label = 'CR'; }}

            const icon = L.divIcon({{
                className: 'custom-bts-marker',
                html: `<div class="bts-marker ${{cls}}">${{label}}</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            }});

            const marker = L.marker([b.lat, b.lon], {{ icon }}).addTo(btsLayerGroup);
            marker.bindPopup(`
                <div class="popup-title">Trạm BTS: ${{b.id}}</div>
                <div class="popup-row"><span class="popup-label">Phân loại:</span><span class="popup-val">${{b.type}}</span></div>
                <div class="popup-row"><span class="popup-label">Tọa độ:</span><span class="popup-val">${{b.lat.toFixed(5)}}, ${{b.lon.toFixed(5)}}</span></div>
                <div class="popup-row"><span class="popup-label">Cột H tương ứng:</span><span class="popup-val popup-highlight">${{b.col_h}}</span></div>
            `);
        }});

        // Render Backhaul Lines (CRAN to MAIN)
        backhaulLines.forEach(l => {{
            L.polyline([l.from, l.to], {{
                color: '#c084fc',
                weight: 3,
                dashArray: '6, 8',
                opacity: 0.85
            }}).addTo(backhaulLayerGroup).bindTooltip(`Tuyến quang hiện hữu: ${{l.cran}} -> ${{l.main}}`);
        }});

        // Render Cable lines & Camera markers
        const camMarkers = [];
        const cablePolylines = [];

        camData.forEach(f => {{
            const p = f.properties;
            const coords = [f.geometry.coordinates[1], f.geometry.coordinates[0]];

            // Marker
            const icon = L.divIcon({{
                className: 'custom-cam-marker',
                html: `<div class="cam-marker" style="width:22px; height:22px;">${{p.stt}}</div>`,
                iconSize: [22, 22],
                iconAnchor: [11, 11]
            }});

            const marker = L.marker(coords, {{ icon }}).addTo(camLayerGroup);
            marker.camProps = p;
            marker.bindPopup(`
                <div class="popup-title">STT ${{p.stt}}: ${{p.point_id}}</div>
                <div class="popup-row"><span class="popup-label">Vị trí:</span><span class="popup-val">${{p.name}}</span></div>
                <div class="popup-row"><span class="popup-label">Tọa độ:</span><span class="popup-val">${{coords[0].toFixed(5)}}, ${{coords[1].toFixed(5)}}</span></div>
                <div class="popup-row"><span class="popup-label">Trạm BTS gần nhất:</span><span class="popup-val">${{p.bts_old}} (${{p.bts_type}})</span></div>
                <div class="popup-row"><span class="popup-label">Khoảng cách kéo:</span><span class="popup-val popup-highlight">${{p.cable_dist}} m</span></div>
                <div class="popup-row"><span class="popup-label">CỘT H (Trạm Đích):</span><span class="popup-val popup-highlight">${{p.col_h}}</span></div>
                <div class="popup-row"><span class="popup-label">Cột I (Port):</span><span class="popup-val">${{p.col_i}}</span></div>
                <div class="popup-row"><span class="popup-label">Route Gom Tuyến:</span><span class="popup-val">${{p.col_k}}</span></div>
                <div class="popup-row"><span class="popup-label">Loại cáp trục:</span><span class="popup-val badge-tag ${{p.col_l.includes('24FO') ? 'badge-24fo' : 'badge-12fo'}}">${{p.col_l}}</span></div>
                <div style="margin-top:6px; font-size:11px; color:#cbd5e1; border-top:1px dashed #334155; padding-top:4px;">
                    <b>Ghi chú:</b> ${{p.note}}
                </div>
            `);
            camMarkers.push(marker);
        }});

        // Cable lines
        cableLines.forEach(l => {{
            const poly = L.polyline([l.from, l.to], {{
                color: l.cable.includes('24FO') ? '#818cf8' : '#38bdf8',
                weight: 2.5,
                opacity: 0.75
            }}).addTo(cableLayerGroup);
            poly.camStt = l.stt;
            poly.route = l.route;
            cablePolylines.push(poly);
        }});

        function resetView() {{
            map.setView([10.875, 107.495], 12);
            document.getElementById('camSearch').value = '';
            document.getElementById('routeSelect').value = 'all';
            filterCams();
        }}

        function filterCams() {{
            const query = document.getElementById('camSearch').value.toLowerCase().trim();
            const selectedRoute = document.getElementById('routeSelect').value;

            camMarkers.forEach(m => {{
                const p = m.camProps;
                let matchQuery = true;
                if (query) {{
                    matchQuery = p.stt.toString().includes(query) || 
                                 p.point_id.toLowerCase().includes(query) || 
                                 p.name.toLowerCase().includes(query) ||
                                 p.bts_old.toLowerCase().includes(query) ||
                                 p.col_h.toLowerCase().includes(query);
                }}

                let matchRoute = true;
                if (selectedRoute !== 'all') {{
                    matchRoute = p.col_k.includes(selectedRoute);
                }}

                if (matchQuery && matchRoute) {{
                    camLayerGroup.addLayer(m);
                }} else {{
                    camLayerGroup.removeLayer(m);
                }}
            }});

            cablePolylines.forEach(poly => {{
                let matchRoute = true;
                if (selectedRoute !== 'all') {{
                    matchRoute = poly.route.includes(selectedRoute);
                }}
                if (matchRoute) {{
                    cableLayerGroup.addLayer(poly);
                }} else {{
                    cableLayerGroup.removeLayer(poly);
                }}
            }});
        }}
    </script>
</body>
</html>
"""

with open(out_html_path, 'w', encoding='utf-8') as f:
    f.write(html_content)
print(f"Exported Interactive HTML Map: {out_html_path}")

print("ALL FILES GENERATED SUCCESSFULLY!")
