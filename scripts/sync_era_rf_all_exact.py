#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script Đồng Bộ Chính Xác Thiết Kế RF Từ File ERA_RF_ALL_2026.xlsx:
- Nguồn: Google Drive ERA_RF_ALL_2026.xlsx (Cập nhật 10:54 04/10/2026)
- Đọc Cột G (Azimuth_Physical), Cột I (Height), Cột J (Total Tilt), Cột K (Mtilt), Cột L (Etilt).
- Cập nhật trực tiếp vào bảng 'datacells'.
- Đồng bộ các cell cùng sector (4G, 5G, 3G) theo đúng góc hướng thiết kế ERA.
- Tái tổng hợp 'technical_info.rf_summary.sectors' chuẩn xác cho bảng 'datasites'.
"""

import os
import sys
import json
import ssl
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
import openpyxl

ERA_FILE = '/Users/cang_it/Library/CloudStorage/GoogleDrive-canglt1985@gmail.com/My Drive/data cell/ERA_RF_ALL_2026.xlsx'
SUPABASE_URL = 'https://lnmoczxjweuifacqujcu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubW9jenhqd2V1aWZhY3F1amN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzcxOTYsImV4cCI6MjA5NDIxMzE5Nn0.C0Si7ChY4T_mxLylSkDNJOUcj9D0uuGW_L4t7p9yONI'

ctx = ssl._create_unverified_context()
headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

def parse_num(v):
    if v is None: return None
    s = str(v).strip()
    if not s: return None
    if '/' in s:
        s = s.split('/')[0].strip()
    try:
        f = float(s)
        return int(f) if f.is_integer() else round(f, 2)
    except:
        return None

def patch_cell(cid, patch):
    patch_url = f"{SUPABASE_URL}/rest/v1/datacells?cell_id=eq.{cid}"
    patch_data = json.dumps(patch).encode('utf-8')
    req = urllib.request.Request(patch_url, data=patch_data, headers=headers, method='PATCH')
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            return cid, True, None
    except Exception as e:
        return cid, False, str(e)

def patch_site(sid, tech_info):
    patch_site_url = f"{SUPABASE_URL}/rest/v1/datasites?site_id=eq.{sid}"
    patch_site_data = json.dumps({'technical_info': tech_info}).encode('utf-8')
    req = urllib.request.Request(patch_site_url, data=patch_site_data, headers=headers, method='PATCH')
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            return sid, True, None
    except Exception as e:
        return sid, False, str(e)

def main():
    print("================================================================================")
    print("🚀 BẮT ĐẦU ĐỒNG BỘ THIẾT KẾ RF TỪ ERA_RF_ALL_2026.XLSX VÀO SUPABASE")
    print(f"📁 Nguồn file: {ERA_FILE}")
    print("================================================================================")

    if not os.path.exists(ERA_FILE):
        print(f"❌ Không tìm thấy file: {ERA_FILE}")
        sys.exit(1)

    # 1. Đọc file ERA_RF_ALL
    wb = openpyxl.load_workbook(ERA_FILE, data_only=True)
    era_by_cell = {}
    era_by_site_sector = defaultdict(dict)  # site_id -> sector_letter -> dict

    for sname in ['5G', '4G']:
        sheet = wb[sname]
        for r in range(2, sheet.max_row + 1):
            old_id = str(sheet.cell(r, 1).value or '').strip().upper()
            new_id = str(sheet.cell(r, 2).value or '').strip().upper()
            cell_name = str(sheet.cell(r, 3).value or '').strip()
            az = parse_num(sheet.cell(r, 7).value)
            h = parse_num(sheet.cell(r, 9).value)
            tilt = parse_num(sheet.cell(r, 10).value)
            mtilt = parse_num(sheet.cell(r, 11).value) or 0
            etilt = parse_num(sheet.cell(r, 12).value) or 0

            if not cell_name or az is None:
                continue

            sec_char = cell_name[-1].upper() if cell_name else 'A'
            info = {
                'sheet': sname,
                'old_id': old_id,
                'new_id': new_id,
                'cell_name': cell_name,
                'azimuth': az,
                'height': h,
                'tilt_total': tilt,
                'tilt_mech': mtilt,
                'tilt_elec': etilt,
                'sector': sec_char
            }
            era_by_cell[cell_name] = info
            for sid in set([old_id, new_id]):
                if sid:
                    era_by_site_sector[sid][sec_char] = info

    # Các thông số hiệu chỉnh thủ công theo thực tế hiện trường từ người dùng
    manual_site_overrides = {
        'DNTN60': {'A': {'azimuth': 280, 'height': 40, 'tilt_total': 4, 'tilt_mech': 0, 'tilt_elec': 4}},
        'DNIDGI30': {'A': {'azimuth': 280, 'height': 40, 'tilt_total': 4, 'tilt_mech': 0, 'tilt_elec': 4}}
    }
    for sid, sec_dict in manual_site_overrides.items():
        for sec_char, info in sec_dict.items():
            if sid not in era_by_site_sector:
                era_by_site_sector[sid] = {}
            era_by_site_sector[sid][sec_char] = {
                'sheet': 'MANUAL',
                'old_id': sid,
                'new_id': sid,
                'cell_name': f"{sid}_{sec_char}",
                'azimuth': info['azimuth'],
                'height': info['height'],
                'tilt_total': info['tilt_total'],
                'tilt_mech': info['tilt_mech'],
                'tilt_elec': info['tilt_elec'],
                'sector': sec_char
            }

    print(f"✅ Đã nạp {len(era_by_cell)} thiết kế cell từ ERA_RF_ALL_2026.xlsx ({len(era_by_site_sector)} trạm, bao gồm các hiệu chỉnh thủ công).")

    # 2. Nạp toàn bộ datacells từ Supabase
    all_cells = []
    offset = 0
    limit = 1000
    while True:
        req_c = urllib.request.Request(
            f'{SUPABASE_URL}/rest/v1/datacells?select=*&offset={offset}&limit={limit}',
            headers=headers
        )
        with urllib.request.urlopen(req_c, context=ctx) as resp:
            batch = json.loads(resp.read().decode('utf-8'))
            all_cells.extend(batch)
            if len(batch) < limit:
                break
            offset += limit

    print(f"✅ Đã nạp {len(all_cells)} cell từ bảng 'datacells'.")

    # 3. Nạp datasites từ Supabase
    req_s = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/datasites?select=site_id,site_id_old,name,management_info,classification,technical_info',
        headers=headers
    )
    with urllib.request.urlopen(req_s, context=ctx) as resp:
        sites = json.loads(resp.read().decode('utf-8'))
    print(f"✅ Đã nạp {len(sites)} trạm từ bảng 'datasites'.")

    # Tạo tra cứu canonical site_id
    site_canon = {}
    for s in sites:
        sid = (s.get('site_id') or '').strip().upper()
        sold = (s.get('site_id_old') or '').strip().upper()
        if sid: site_canon[sid] = sid
        if sold: site_canon[sold] = sid

    # 4. Xác định các cell cần cập nhật
    updated_cells = []
    affected_sites = set()

    for c in all_cells:
        cid = c.get('cell_id')
        cnew = c.get('cell_name_new')
        cold = c.get('cell_name_old')
        sid = (c.get('site_id') or '').strip().upper()
        sold = (c.get('site_id_old') or '').strip().upper()
        sec = (c.get('sector') or (cid[-1] if cid else 'A')).upper()

        target_canon = site_canon.get(sid) or site_canon.get(sold) or sid or sold

        # Tra cứu thiết kế ERA: theo cell_name hoặc theo (site_id, sector)
        era = era_by_cell.get(cid) or era_by_cell.get(cnew) or era_by_cell.get(cold)
        if not era:
            # Tra theo site và sector
            era = era_by_site_sector.get(sid, {}).get(sec) or era_by_site_sector.get(sold, {}).get(sec)

        if era:
            need_update = False
            patch = {}

            if era['azimuth'] is not None and c.get('azimuth') != era['azimuth']:
                patch['azimuth'] = era['azimuth']
                need_update = True
            if era['height'] is not None and c.get('height') != era['height']:
                patch['height'] = era['height']
                need_update = True
            if era['tilt_total'] is not None and c.get('tilt_total') != era['tilt_total']:
                patch['tilt_total'] = era['tilt_total']
                need_update = True
            if era['tilt_elec'] is not None and c.get('tilt_elec') != era['tilt_elec']:
                patch['tilt_elec'] = era['tilt_elec']
                need_update = True
            if era['tilt_mech'] is not None and c.get('tilt_mech') != era['tilt_mech']:
                patch['tilt_mech'] = era['tilt_mech']
                need_update = True
            if c.get('sector') != sec:
                patch['sector'] = sec
                need_update = True

            if need_update:
                updated_cells.append((cid, patch))
                affected_sites.add(target_canon)

    print(f"\n⚡ Phát hiện {len(updated_cells)} cells cần cập nhật thông số từ ERA (trên {len(affected_sites)} trạm).")

    # 5. Cập nhật song song vào bảng datacells
    print("⏳ Đang cập nhật vào bảng 'datacells' (10 workers song song)...")
    success_cell_count = 0
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(patch_cell, cid, patch) for cid, patch in updated_cells]
        for f in as_completed(futures):
            cid, ok, err = f.result()
            if ok:
                success_cell_count += 1
            else:
                print(f"❌ Lỗi cập nhật cell {cid}: {err}")

    print(f"✅ Đã cập nhật thành công {success_cell_count}/{len(updated_cells)} cells vào bảng 'datacells'.")

    # 6. Tái tổng hợp rf_summary.sectors cho các trạm bị ảnh hưởng
    print("\n🔄 Bước 6: Tái tổng hợp rf_summary.sectors cho bảng 'datasites'...")

    # Nạp lại datacells sau cập nhật
    cells_by_site = defaultdict(list)
    all_cells_fresh = []
    offset = 0
    while True:
        req_c = urllib.request.Request(
            f'{SUPABASE_URL}/rest/v1/datacells?select=*&offset={offset}&limit={limit}',
            headers=headers
        )
        with urllib.request.urlopen(req_c, context=ctx) as resp:
            batch = json.loads(resp.read().decode('utf-8'))
            all_cells_fresh.extend(batch)
            if len(batch) < limit:
                break
            offset += limit

    for c in all_cells_fresh:
        sid = (c.get('site_id') or '').strip().upper()
        sold = (c.get('site_id_old') or '').strip().upper()
        target = site_canon.get(sid) or site_canon.get(sold) or sid or sold
        cells_by_site[target].append(c)

    # Lập danh sách patch cho datasites
    site_patches = []
    for s in sites:
        sid = (s.get('site_id') or '').strip().upper()
        sold = (s.get('site_id_old') or '').strip().upper()
        target_canon = site_canon.get(sid) or site_canon.get(sold) or sid

        # Chỉ cập nhật các trạm có cell bị ảnh hưởng hoặc trạm có thiết kế trong ERA
        if target_canon not in affected_sites and sid not in affected_sites and sold not in affected_sites:
            continue

        c_list = cells_by_site.get(target_canon) or cells_by_site.get(sid) or cells_by_site.get(sold) or []
        if not c_list:
            continue

        # Gom nhóm sectors theo ký tự sector
        sector_map = {}
        for c in c_list:
            sec_name = (c.get('sector') or (c.get('cell_id')[-1] if c.get('cell_id') else 'A')).upper()
            if sec_name not in sector_map:
                sector_map[sec_name] = {
                    'sector': sec_name,
                    'azimuth': c.get('azimuth'),
                    'height': c.get('height'),
                    'tilt_elec': c.get('tilt_elec'),
                    'tilt_mech': c.get('tilt_mech') or 0,
                    'tilt_total': c.get('tilt_total'),
                    'has_3g': False,
                    'has_4g': False,
                    'has_4g_1800_1': False,
                    'has_4g_1800_2': False,
                    'has_4g_2100': False,
                    'has_5g_l1': False,
                    'has_5g_l2': False
                }

            # Cập nhật thông số tốt nhất nếu cell này có
            if c.get('azimuth') is not None:
                sector_map[sec_name]['azimuth'] = c.get('azimuth')
            if c.get('height') is not None:
                sector_map[sec_name]['height'] = c.get('height')
            if c.get('tilt_total') is not None:
                sector_map[sec_name]['tilt_total'] = c.get('tilt_total')
                sector_map[sec_name]['tilt_elec'] = c.get('tilt_elec')
                sector_map[sec_name]['tilt_mech'] = c.get('tilt_mech') or 0

            ran = str(c.get('ran') or '').upper()
            band = str(c.get('band') or '')
            layer_5g = c.get('layer_5g')

            if ran == '3G':
                sector_map[sec_name]['has_3g'] = True
            elif ran == '4G':
                sector_map[sec_name]['has_4g'] = True
                if '2100' in band:
                    sector_map[sec_name]['has_4g_2100'] = True
                else:
                    if not sector_map[sec_name]['has_4g_1800_1']:
                        sector_map[sec_name]['has_4g_1800_1'] = True
                    else:
                        sector_map[sec_name]['has_4g_1800_2'] = True
            elif ran == '5G':
                if layer_5g == 2 or '3800' in band:
                    sector_map[sec_name]['has_5g_l2'] = True
                if layer_5g == 1 or '2600' in band or not ('3800' in band):
                    sector_map[sec_name]['has_5g_l1'] = True

        # Bảo toàn cấu hình 5 sector đặc thù của DNLK05 (DNILKH00)
        if sid in ('DNLK05', 'DNILKH00') or sold in ('DNLK05', 'DNILKH00'):
            # Nếu đã có 5 sector trong DB thì giữ nguyên cấu hình chi tiết 5 sector
            existing_secs = (s.get('technical_info') or {}).get('rf_summary', {}).get('sectors', [])
            if len(existing_secs) == 5:
                sector_map = {sec['sector']: sec for sec in existing_secs}

        sectors_list = sorted(list(sector_map.values()), key=lambda x: x['sector'])

        # Cập nhật vào datasites.technical_info bảo toàn các trường khác
        ti = dict(s.get('technical_info') or {})
        rf_summary = dict(ti.get('rf_summary') or {})
        rf_summary['sectors'] = sectors_list
        ti['rf_summary'] = rf_summary

        site_patches.append((sid, ti))

    print(f"⏳ Đang cập nhật {len(site_patches)} trạm trong bảng 'datasites' (10 workers song song)...")
    success_site_count = 0
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(patch_site, sid, ti) for sid, ti in site_patches]
        for f in as_completed(futures):
            sid, ok, err = f.result()
            if ok:
                success_site_count += 1
            else:
                print(f"❌ Lỗi cập nhật trạm {sid}: {err}")

    print(f"✅ Đã cập nhật thành công {success_site_count}/{len(site_patches)} trạm trong bảng 'datasites'.")
    print("================================================================================")
    print("🎉 HOÀN TẤT ĐỒNG BỘ THIẾT KẾ RF TỪ FILE ERA MỚI NHẤT!")
    print("================================================================================")

if __name__ == '__main__':
    main()
