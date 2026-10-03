#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Khảo sát và Phân loại Toàn diện Thông tin Thiết kế RF cho Toàn bộ 412 Trạm TVT3:
1. Đối chiếu nghiêm ngặt với ERA_RF_ALL_2026.xlsx (4G & 5G).
2. Kiểm tra dữ liệu hiện hữu trong bảng 'datacells' (Azimuth, Height, Tilt).
3. Phân loại chuẩn xác:
   - Nhóm 1: Có trong file thiết kế ERA_RF_ALL (đầy đủ Azimuth/Height/Tilt).
   - Nhóm 2: Không có trong ERA nhưng ĐÃ CÓ thông số RF chuẩn trong datacells (từ hồ sơ vận hành/phát sóng trước đó).
   - Nhóm 3: Trạm đặc thù KHÔNG CẦN RF (Thuần Hub Truyền dẫn AGG, MORAN Host VNPT...).
   - Nhóm 4: THỰC SỰ THIẾU THIẾT KẾ RF (Không có trong ERA VÀ Azimuth = 0 / NULL / Chưa có cell trong datacells) -> CẦN GỬI ĐỘI RF BỔ SUNG!
"""

import openpyxl
import urllib.request
import json
import ssl
from collections import defaultdict

SUPABASE_URL = 'https://lnmoczxjweuifacqujcu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubW9jenhqd2V1aWZhY3F1amN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzcxOTYsImV4cCI6MjA5NDIxMzE5Nn0.C0Si7ChY4T_mxLylSkDNJOUcj9D0uuGW_L4t7p9yONI'
ctx = ssl._create_unverified_context()
headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

# 1. Đọc ERA
ERA_FILE = '/Users/cang_it/Desktop/QL_VienThong_DongNai/05_HaTang_KyThuat_5G/ERA_RF_ALL_2026.xlsx'
wb = openpyxl.load_workbook(ERA_FILE, data_only=True)

era_by_site = defaultdict(lambda: {'4g': [], '5g': []})

for sname in ['4G', '5G']:
    ws = wb[sname]
    for r in range(2, ws.max_row + 1):
        old_id = str(ws.cell(r, 1).value or '').strip().upper()
        new_id = str(ws.cell(r, 2).value or '').strip().upper()
        cell_name = str(ws.cell(r, 3).value or '').strip()
        az = ws.cell(r, 7).value
        h = ws.cell(r, 9).value
        tilt = ws.cell(r, 10).value
        cfg = ws.cell(r, 14).value
        
        cinfo = {'cell': cell_name, 'az': az, 'h': h, 'tilt': tilt, 'cfg': cfg}
        if old_id:
            era_by_site[old_id][sname.lower()].append(cinfo)
        if new_id:
            era_by_site[new_id][sname.lower()].append(cinfo)

# 2. Đọc toàn bộ datasites
req_s = urllib.request.Request(
    f'{SUPABASE_URL}/rest/v1/datasites?select=site_id,site_id_old,name,location_info,management_info,classification,technical_info',
    headers=headers
)
with urllib.request.urlopen(req_s, context=ctx) as r:
    sites = json.loads(r.read().decode())

# 3. Đọc toàn bộ datacells
all_cells = []
offset = 0
limit = 1000
while True:
    req_c = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/datacells?select=cell_id,site_id,site_id_old,cell_name_new,cell_name_old,ran,band,sector,azimuth,height,tilt_total&offset={offset}&limit={limit}',
        headers=headers
    )
    with urllib.request.urlopen(req_c, context=ctx) as r:
        batch = json.loads(r.read().decode())
        all_cells.extend(batch)
        if len(batch) < limit:
            break
        offset += limit

# Nhóm cells theo site
cells_by_site = defaultdict(list)
for c in all_cells:
    sid = (c.get('site_id') or '').strip().upper()
    sold = (c.get('site_id_old') or '').strip().upper()
    if sid: cells_by_site[sid].append(c)
    if sold and sold != sid: cells_by_site[sold].append(c)

# 4. Phân loại từng trạm
group_era = []       # Có trong ERA
group_has_rf = []    # Không có trong ERA nhưng đã có RF hợp lệ trong datacells
group_no_rf_needed = [] # Không cần RF (AGG thuần, Moran host...)
group_missing_rf = []   # THỰC SỰ THIẾU RF (Không có trong ERA & không có RF hợp lệ)

moran_hosts = {
    'DNDQ43', 'DNDQ44', 'DNDQ46', 'DNDQ47', 'DNDQ48',
    'DNXL50', 'DNXL51', 'DNXL52', 'DNXL53', 'DNXL54',
    'DNTP45', 'DNTP46', 'DNTP47'
}
pure_agg_hubs = {'DNILKH1', 'DNIDQN1', 'ILA-DNIXLC'}

for s in sites:
    sid = (s.get('site_id') or '').strip().upper()
    sold = (s.get('site_id_old') or '').strip().upper()
    name = s.get('name') or ''
    loc = s.get('location_info') or {}
    district = loc.get('huyen_cu') or loc.get('district') or ''
    ward = loc.get('xa_moi') or loc.get('xa_cu') or ''
    mgmt = s.get('management_info') or {}
    vung_phu = mgmt.get('vung_phu') or ''
    loai_tram = (s.get('classification') or {}).get('loai_tram') or ''
    
    # Kiểm tra trong ERA
    era_info = era_by_site.get(sid) or era_by_site.get(sold)
    has_era = bool(era_info and (len(era_info['4g']) > 0 or len(era_info['5g']) > 0))
    
    # Kiểm tra tế bào trong datacells
    site_cells = cells_by_site.get(sid) or cells_by_site.get(sold) or []
    # Lọc unique cell theo cell_id
    seen_cids = set()
    uniq_cells = []
    for c in site_cells:
        cid = c.get('cell_id')
        if cid and cid not in seen_cids:
            seen_cids.add(cid)
            uniq_cells.append(c)
            
    # Kiểm tra azimuth hợp lệ trong datacells (có ít nhất 1 cell có azimuth > 0 và không null)
    valid_azimuths = [c.get('azimuth') for c in uniq_cells if c.get('azimuth') is not None and c.get('azimuth') > 0]
    has_valid_rf_in_db = len(valid_azimuths) > 0
    
    site_data = {
        'site_id': sid,
        'site_id_old': sold,
        'name': name,
        'district': district,
        'ward': ward,
        'vung_phu': vung_phu,
        'loai_tram': loai_tram,
        'has_era': has_era,
        'era_4g_cells': len(era_info['4g']) if era_info else 0,
        'era_5g_cells': len(era_info['5g']) if era_info else 0,
        'db_cells_count': len(uniq_cells),
        'valid_az_count': len(valid_azimuths),
        'azimuths': [c.get('azimuth') for c in uniq_cells],
        'sectors': [c.get('sector') for c in uniq_cells]
    }
    
    if has_era:
        group_era.append(site_data)
    elif sid in pure_agg_hubs or sold in pure_agg_hubs:
        group_no_rf_needed.append((site_data, 'Hub Truyền Dẫn AGG (Không phát sóng vô tuyến)'))
    elif sid in moran_hosts or sold in moran_hosts:
        group_no_rf_needed.append((site_data, 'MORAN Host VNPT (Sử dụng hạ tầng phát sóng VNPT)'))
    elif has_valid_rf_in_db:
        group_has_rf.append(site_data)
    else:
        group_missing_rf.append(site_data)

print(f"================================================================================")
print(f"📊 KẾT QUẢ PHÂN LOẠI TOÀN BỘ {len(sites)} TRẠM TVT3:")
print(f"================================================================================")
print(f"1. Nhóm CÓ trong file ERA_RF_ALL: {len(group_era)} trạm")
print(f"2. Nhóm ĐÃ CÓ thông số RF chuẩn trong DB (không trong ERA): {len(group_has_rf)} trạm")
print(f"3. Nhóm Đặc thù Không Cần RF (AGG Hub, MORAN Host): {len(group_no_rf_needed)} trạm")
print(f"4. Nhóm THỰC SỰ THIẾU THIẾT KẾ RF: {len(group_missing_rf)} trạm")
print(f"Tổng cộng: {len(group_era) + len(group_has_rf) + len(group_no_rf_needed) + len(group_missing_rf)} / {len(sites)}")

print(f"\n================================================================================")
print(f"🔍 CHI TIẾT NHÓM 4: CÁC TRẠM THỰC SỰ THIẾU THIẾT KẾ RF CẦN GỬI BỔ SUNG ({len(group_missing_rf)} trạm)")
print(f"================================================================================")
for idx, s in enumerate(sorted(group_missing_rf, key=lambda x: (x['district'], x['site_id_old'])), 1):
    print(f"{idx:2d}. {s['site_id_old']:<8} | {s['site_id']:<10} | {s['name']:<25} | {s['district']:<12} | Loại: {s['loai_tram']:<10} | Vùng phủ: {s['vung_phu']:<15} | DB Cells: {s['db_cells_count']} | Azimuths: {s['azimuths']}")

print(f"\n================================================================================")
print(f"📋 PHÂN TÍCH CÁC TRẠM CRAN OUTDOOR TRƯỚC ĐÂY TỪNG BỊ ĐÁNH NHẦM LÀ 'KHÔNG CÓ TRONG ERA':")
print(f"================================================================================")
cran_check = ['DNTP08', 'DNXL04', 'DNXL49', 'DNXL10', 'DNDQ21', 'DNDQ18', 'DNDQ65', 'DNLK70']
for sid in cran_check:
    in_era = any(s['site_id_old'] == sid or s['site_id'] == sid for s in group_era)
    in_db_rf = any(s['site_id_old'] == sid or s['site_id'] == sid for s in group_has_rf)
    in_missing = any(s['site_id_old'] == sid or s['site_id'] == sid for s in group_missing_rf)
    status = "Trong ERA" if in_era else ("Đã có RF trong DB" if in_db_rf else ("THIẾU RF" if in_missing else "Khác"))
    print(f"• {sid:<8}: {status}")

