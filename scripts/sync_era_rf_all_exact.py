#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script Đồng Bộ Chính Xác Toàn Bộ Thiết Kế RF Từ File ERA_RF_ALL_2026.xlsx:
- Nguồn: Google Drive ERA_RF_ALL_2026.xlsx (Cập nhật 04/10/2026)
- Tự động nạp các cell mới (4G/5G) vào bảng 'datacells'.
- Đồng bộ Azimuth, Height, Tilt (Total, Mech, Elec), Band, Layer 5G cho toàn bộ cells.
- Tái tổng hợp đầy đủ 'technical_info.rf_summary' (has_5g, is_dual_5g, cells_5g, sectors) cho bảng 'datasites'.
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
    'Content-Type': 'application/json'
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
    print("🚀 BẮT ĐẦU ĐỒNG BỘ TOÀN DIỆN THIẾT KẾ RF TỪ ERA_RF_ALL_2026.XLSX VÀO SUPABASE")
    print(f"📁 Nguồn file: {ERA_FILE}")
    print("================================================================================")

    if not os.path.exists(ERA_FILE):
        print(f"❌ Không tìm thấy file: {ERA_FILE}")
        sys.exit(1)

    # 1. Nạp datasites từ Supabase
    req_s = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/datasites?select=*',
        headers=headers
    )
    with urllib.request.urlopen(req_s, context=ctx) as resp:
        sites = json.loads(resp.read().decode('utf-8'))
    print(f"✅ Đã nạp {len(sites)} trạm từ bảng 'datasites'.")

    site_canon = {}
    site_by_id = {}
    for s in sites:
        sid = (s.get('site_id') or '').strip().upper()
        sold = (s.get('site_id_old') or '').strip().upper()
        if sid:
            site_canon[sid] = sid
            site_by_id[sid] = s
        if sold:
            site_canon[sold] = sid

    # 2. Nạp toàn bộ datacells từ Supabase
    all_cells = []
    all_cids = set()
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
            for b in batch: all_cids.add(b['cell_id'])
            if len(batch) < limit:
                break
            offset += limit

    print(f"✅ Đã nạp {len(all_cells)} cell từ bảng 'datacells'.")

    # 3. Đọc file ERA_RF_ALL
    wb = openpyxl.load_workbook(ERA_FILE, data_only=True)
    era_by_cell = {}
    era_by_site_sector = defaultdict(dict)
    era_sites_5g = set()
    era_sites_dual = set()
    missing_cells_to_insert = []

    for sname in ['4G', '5G']:
        sheet = wb[sname]
        headers_row = [c for c in next(sheet.iter_rows(values_only=True))]
        for r in sheet.iter_rows(values_only=True):
            d = dict(zip(headers_row, r))
            old_id = str(d.get('Old site name') or '').strip().upper()
            new_id = str(d.get('Site name') or '').strip().upper()
            cell_name = str(d.get('Cell name') or '').strip().upper()
            if not cell_name:
                continue

            target = site_canon.get(old_id) or site_canon.get(new_id)
            if not target:
                continue

            az = parse_num(d.get('Azimuth_Physical'))
            h = parse_num(d.get('Height'))
            tilt = parse_num(d.get('Total Tilt'))
            mtilt = parse_num(d.get('Mtilt')) or 0
            etilt = parse_num(d.get('Etilt')) or 0
            band_str = str(d.get('Band') or '').strip()

            if sname == '5G':
                era_sites_5g.add(target)
                if '3800' in band_str:
                    era_sites_dual.add(target)

            sec_char = cell_name[-1].upper() if cell_name else 'A'
            info = {
                'sheet': sname,
                'old_id': old_id,
                'new_id': new_id,
                'target_sid': target,
                'cell_name': cell_name,
                'azimuth': az,
                'height': h,
                'tilt_total': tilt,
                'tilt_mech': mtilt,
                'tilt_elec': etilt,
                'band': band_str,
                'sector': sec_char
            }
            era_by_cell[cell_name] = info
            if az is not None:
                era_by_site_sector[target][sec_char] = info

            # Kiểm tra xem cell này đã có trong datacells chưa
            if cell_name not in all_cids:
                matched_s = site_by_id[target]
                lat = matched_s.get('location_info', {}).get('vi_do')
                lon = matched_s.get('location_info', {}).get('kinh_do')
                ran = '5G' if sname == '5G' else '4G'
                layer_5g = 2 if ('3800' in band_str) else (1 if sname == '5G' else 0)

                missing_cells_to_insert.append({
                    'cell_id': cell_name,
                    'site_id': target,
                    'site_id_old': matched_s.get('site_id_old'),
                    'cell_name_new': cell_name,
                    'cell_name_old': cell_name,
                    'ran': ran,
                    'band': band_str,
                    'vendor': 'ERICSSON',
                    'status': 'ACTIVE',
                    'azimuth': az,
                    'height': h,
                    'tilt_total': tilt,
                    'tilt_mech': mtilt,
                    'tilt_elec': etilt,
                    'sector': sec_char,
                    'beamwidth': 65,
                    'layer_5g': layer_5g,
                    'latitude': float(lat) if lat else None,
                    'longitude': float(lon) if lon else None
                })
                all_cids.add(cell_name)

    print(f"✅ Đã quét {len(era_by_cell)} thiết kế cell từ ERA_RF_ALL.")
    if missing_cells_to_insert:
        print(f"⚡ Phát hiện {len(missing_cells_to_insert)} cell mới trong ERA chưa có trong 'datacells'. Đang nạp...")
        ins_headers = dict(headers)
        ins_headers['Prefer'] = 'resolution=merge-duplicates'
        for i in range(0, len(missing_cells_to_insert), 10):
            batch = missing_cells_to_insert[i:i+10]
            req_ins = urllib.request.Request(f'{SUPABASE_URL}/rest/v1/datacells', data=json.dumps(batch).encode('utf-8'), headers=ins_headers, method='POST')
            try:
                with urllib.request.urlopen(req_ins, context=ctx) as resp:
                    pass
            except Exception as e:
                print(f"❌ Lỗi nạp batch: {e}")
        print("✅ Hoàn tất nạp cell mới vào 'datacells'.")

    # 4. Xác định các cell hiện tại cần cập nhật
    updated_cells = []
    for c in all_cells:
        cid = c.get('cell_id')
        cnew = c.get('cell_name_new')
        cold = c.get('cell_name_old')
        sid = (c.get('site_id') or '').strip().upper()
        sold = (c.get('site_id_old') or '').strip().upper()
        sec = (c.get('sector') or (cid[-1] if cid else 'A')).upper()

        target_canon = site_canon.get(sid) or site_canon.get(sold) or sid
        era = era_by_cell.get(cid) or era_by_cell.get(cnew) or era_by_cell.get(cold)
        if not era:
            era = era_by_site_sector.get(target_canon, {}).get(sec)

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
            if era['tilt_mech'] is not None and c.get('tilt_mech') != era['tilt_mech']:
                patch['tilt_mech'] = era['tilt_mech']
                need_update = True
            if era['tilt_elec'] is not None and c.get('tilt_elec') != era['tilt_elec']:
                patch['tilt_elec'] = era['tilt_elec']
                need_update = True

            # Manual override cho DNTN60 (DNIDGI30)
            if target_canon in ('DNTN60', 'DNIDGI30'):
                if patch.get('azimuth') != 280:
                    patch['azimuth'] = 280
                    need_update = True

            if need_update:
                updated_cells.append((cid, patch))

    if updated_cells:
        print(f"⏳ Đang cập nhật {len(updated_cells)} cells vào bảng 'datacells' (10 workers song song)...")
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(patch_cell, cid, patch) for cid, patch in updated_cells]
            for f in as_completed(futures):
                cid, ok, err = f.result()
                if not ok:
                    print(f"❌ Lỗi cập nhật cell {cid}: {err}")
        print("✅ Hoàn tất cập nhật các cell trong 'datacells'.")

    # 5. Tái nạp datacells đầy đủ để tổng hợp chuẩn xác datasites
    print("\n🔄 Bước 5: Nạp lại datacells và tái tổng hợp rf_summary cho datasites...")
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

    cells_by_site = defaultdict(list)
    for c in all_cells_fresh:
        sid = (c.get('site_id') or '').strip().upper()
        sold = (c.get('site_id_old') or '').strip().upper()
        target = site_canon.get(sid) or site_canon.get(sold) or sid
        if target:
            cells_by_site[target].append(c)

    # 6. Tái tổng hợp rf_summary cho các trạm
    site_patches = []
    for s in sites:
        sid = (s.get('site_id') or '').strip().upper()
        sold = (s.get('site_id_old') or '').strip().upper()
        target = site_canon.get(sid) or site_canon.get(sold) or sid

        c_list = cells_by_site.get(target, [])
        if not c_list and target not in era_by_site_sector:
            continue

        ti = dict(s.get('technical_info') or {})
        rf = dict(ti.get('rf_summary') or {})

        # Bảo toàn 5 sector đặc thù của DNLK05
        if sid in ('DNLK05', 'DNILKH00') or sold in ('DNLK05', 'DNILKH00'):
            existing_secs = rf.get('sectors', [])
            if len(existing_secs) == 5:
                continue

        c3g = [c for c in c_list if str(c.get('ran')).upper() == '3G']
        c4g = [c for c in c_list if str(c.get('ran')).upper() == '4G']
        c5g = [c for c in c_list if str(c.get('ran')).upper() == '5G']
        c5g_l1 = [c for c in c5g if c.get('layer_5g') == 1 or '2600' in str(c.get('band'))]
        c5g_l2 = [c for c in c5g if c.get('layer_5g') == 2 or '3800' in str(c.get('band'))]

        has_5g = len(c5g) > 0 or target in era_sites_5g
        is_dual = (len(c5g_l1) > 0 and len(c5g_l2) > 0) or target in era_sites_dual

        rf['cells_3g'] = len(c3g)
        rf['cells_4g'] = len(c4g)
        rf['cells_5g'] = len(c5g)
        rf['cells_5g_l1'] = len(c5g_l1)
        rf['cells_5g_l2'] = len(c5g_l2)
        rf['total_cells'] = len(c_list)
        rf['has_5g'] = has_5g
        rf['is_dual_5g'] = is_dual
        if is_dual:
            rf['config_5g'] = 'NR26 64T + NR38 64T'
        elif has_5g:
            rf['config_5g'] = 'NR26 64T'

        # Gom nhóm sectors
        sec_map = {}
        for c in c_list:
            sec = (c.get('sector') or c.get('cell_id')[-1]).upper()
            if sec not in sec_map:
                sec_map[sec] = {
                    'sector': sec,
                    'azimuth': c.get('azimuth'),
                    'height': c.get('height'),
                    'tilt_total': c.get('tilt_total'),
                    'tilt_mech': c.get('tilt_mech') or 0,
                    'tilt_elec': c.get('tilt_elec') or 0,
                    'has_3g': False,
                    'has_4g': False,
                    'has_4g_1800_1': False,
                    'has_4g_1800_2': False,
                    'has_4g_2100': False,
                    'has_5g_l1': False,
                    'has_5g_l2': False
                }
            ran = str(c.get('ran') or '').upper()
            band = str(c.get('band') or '')
            l5g = c.get('layer_5g')

            if c.get('azimuth') is not None:
                sec_map[sec]['azimuth'] = c.get('azimuth')
            if c.get('height') is not None:
                sec_map[sec]['height'] = c.get('height')
            if c.get('tilt_total') is not None:
                sec_map[sec]['tilt_total'] = c.get('tilt_total')
                sec_map[sec]['tilt_mech'] = c.get('tilt_mech') or 0
                sec_map[sec]['tilt_elec'] = c.get('tilt_elec') or 0

            if ran == '3G':
                sec_map[sec]['has_3g'] = True
            elif ran == '4G':
                sec_map[sec]['has_4g'] = True
                if '2100' in band:
                    sec_map[sec]['has_4g_2100'] = True
                else:
                    if not sec_map[sec]['has_4g_1800_1']:
                        sec_map[sec]['has_4g_1800_1'] = True
                    else:
                        sec_map[sec]['has_4g_1800_2'] = True
            elif ran == '5G':
                if l5g == 2 or '3800' in band:
                    sec_map[sec]['has_5g_l2'] = True
                if l5g == 1 or '2600' in band or not ('3800' in band):
                    sec_map[sec]['has_5g_l1'] = True

        for sec_char, e_info in era_by_site_sector.get(target, {}).items():
            if sec_char in sec_map:
                if sec_map[sec_char]['azimuth'] is None:
                    sec_map[sec_char]['azimuth'] = e_info['azimuth']
                if sec_map[sec_char]['height'] is None:
                    sec_map[sec_char]['height'] = e_info['height']
                if sec_map[sec_char]['tilt_total'] is None:
                    sec_map[sec_char]['tilt_total'] = e_info['tilt_total']
                    sec_map[sec_char]['tilt_mech'] = e_info['tilt_mech']
                    sec_map[sec_char]['tilt_elec'] = e_info['tilt_elec']
                if e_info['sheet'] == '5G':
                    if '3800' in e_info['band']:
                        sec_map[sec_char]['has_5g_l2'] = True
                    else:
                        sec_map[sec_char]['has_5g_l1'] = True

        # Ghim góc hướng 280 cho DNTN60 (DNIDGI30)
        if sid in ('DNTN60', 'DNIDGI30') or sold in ('DNTN60', 'DNIDGI30'):
            if 'A' in sec_map:
                sec_map['A']['azimuth'] = 280

        # Nếu trạm là Dual 5G, mọi sector 5G đều có cả 2.6G và 3.8G
        if is_dual:
            for sec in sec_map.values():
                if sec['has_5g_l2']:
                    sec['has_5g_l1'] = True

        rf['sectors'] = sorted(list(sec_map.values()), key=lambda x: x['sector'])
        ti['rf_summary'] = rf
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
    print("🎉 HOÀN TẤT ĐỒNG BỘ TOÀN DIỆN THIẾT KẾ RF TỪ FILE ERA!")
    print("================================================================================")

if __name__ == '__main__':
    main()
