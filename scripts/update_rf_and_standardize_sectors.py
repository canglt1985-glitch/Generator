#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script Quét & Chuẩn Hóa Toàn Diện Dữ Liệu RF (Azimuth, Tilt cơ/điện, Bands) cho TVT3
Quy chuẩn:
  - Band 3G: 2100 MHz (hoặc 900)
  - Band 4G: 1800 MHz (F1, F2: 4C, 4D), thêm 2100 MHz (4E)
  - Band 5G: 2600 MHz (NR26) và thêm 3800 MHz (NR38) nếu là 5G-A
  - Sector Azimuth: Chuẩn hóa A=0°, B=120°, C=240° (hoặc theo thiết kế ERA)
  - Tilt: Chuẩn hóa Tilt cơ = 0, Tilt điện = 4, Tilt tổng = 4
Đích đến:
  - Bảng Supabase: 'datacells' (cập nhật azimuth, tilt_total, tilt_mech, tilt_elec, band, sector)
  - Bảng Supabase: 'datasites' (cập nhật technical_info.rf_summary.sectors và cấu hình)
"""

import os
import sys
import re
import json
from collections import defaultdict
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(project_dir, 'backend', '.env'))
load_dotenv(os.path.join(project_dir, 'tvt3_v2', '.env'))

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "https://lnmoczxjweuifacqujcu.supabase.co")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_KEY:
    print("❌ Lỗi: Không tìm thấy SUPABASE_KEY!")
    sys.exit(1)

sb = create_client(SUPABASE_URL, SUPABASE_KEY)

def extract_sector(cell_name):
    if not cell_name: return 'A'
    s = str(cell_name).strip().upper()
    m = re.search(r'([A-Z])$', s)
    if m: return m.group(1)
    m2 = re.search(r'([1-9])$', s)
    if m2:
        idx = int(m2.group(1))
        return chr(ord('A') + idx - 1) if 1 <= idx <= 26 else 'A'
    return 'A'

def get_standard_azimuth(sector_char, total_sectors=3):
    sec = str(sector_char or 'A').upper()
    if total_sectors == 4:
        mapping = {'A': 0, 'B': 90, 'C': 180, 'D': 270}
        return mapping.get(sec, 0)
    elif total_sectors == 2:
        mapping = {'A': 0, 'B': 180}
        return mapping.get(sec, 0)
    else:
        # Standard 3 sectors
        mapping = {'A': 0, 'B': 120, 'C': 240, '1': 0, '2': 120, '3': 240}
        if sec in mapping:
            return mapping[sec]
        # fallback by ascii
        idx = ord(sec[0]) - ord('A')
        return (idx * 120) % 360

def main():
    print("================================================================================")
    print("🚀 BẮT ĐẦU QUÉT & CẬP NHẬT THÔNG TIN RF TOÀN DIỆN CHO CÁC TRẠM TVT3")
    print(f"⏰ Thời gian: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("================================================================================")

    # 1. Đọc datasites để lấy danh sách trạm và thông tin 5G / SRAN
    print("📖 Bước 1: Nạp danh mục trạm từ datasites...")
    ds_res = sb.table('datasites').select('site_id, site_id_old, technical_info').execute()
    datasites = ds_res.data or []
    site_map = {}
    for d in datasites:
        sid = (d.get('site_id') or '').strip().upper()
        sold = (d.get('site_id_old') or '').strip().upper()
        if sid: site_map[sid] = d
        if sold: site_map[sold] = d
    print(f"✅ Đã nạp {len(datasites)} trạm datasite.")

    # 2. Đọc toàn bộ datacells
    print("\n📖 Bước 2: Nạp toàn bộ dữ liệu từ bảng datacells...")
    all_cells = []
    page = 0
    batch_fetch = 1000
    while True:
        res = sb.table('datacells').select('*').range(page * batch_fetch, (page + 1) * batch_fetch - 1).execute()
        if not res.data: break
        all_cells.extend(res.data)
        page += 1
        if len(res.data) < batch_fetch: break
    print(f"✅ Đã nạp {len(all_cells)} cells từ datacells.")

    # Gom nhóm cells theo canonical site_id
    cells_by_site = defaultdict(list)
    for c in all_cells:
        sid = (c.get('site_id') or '').strip().upper()
        sold = (c.get('site_id_old') or '').strip().upper()
        target = site_map.get(sid) or site_map.get(sold)
        target_id = target['site_id'] if target else (sid or sold)
        cells_by_site[target_id].append(c)

    # 3. Chuẩn hóa từng cell trong datacells
    print("\n⚙️ Bước 3: Rà soát và chuẩn hóa từng cell (Bands, Azimuth, Tilt)...")
    cells_to_update = []
    
    for site_id, c_list in cells_by_site.items():
        ds = site_map.get(site_id) or {}
        ti = ds.get('technical_info') or {}
        rf_cur = ti.get('rf_summary') or {}
        is_dual_5g = bool(rf_cur.get('is_dual_5g') or 'NR38' in str(rf_cur.get('config_5g') or ''))

        # Tìm các sector hiện có của trạm
        sec_names = set()
        for c in c_list:
            s_name = c.get('sector') or extract_sector(c.get('cell_name_new') or c.get('cell_id'))
            sec_names.add(s_name)
        total_sec = len(sec_names) if len(sec_names) in [2, 3, 4] else 3

        # Lấy thông số azimuth thiết kế nếu đã có từ một cell khác cùng sector
        sec_existing_az = {}
        sec_existing_tilt = {}
        for c in c_list:
            s_name = c.get('sector') or extract_sector(c.get('cell_name_new') or c.get('cell_id'))
            if c.get('azimuth') is not None and s_name not in sec_existing_az:
                sec_existing_az[s_name] = c.get('azimuth')
            if c.get('tilt_total') is not None and s_name not in sec_existing_tilt:
                sec_existing_tilt[s_name] = {
                    'tilt_total': c.get('tilt_total'),
                    'tilt_mech': c.get('tilt_mech'),
                    'tilt_elec': c.get('tilt_elec'),
                    'height': c.get('height')
                }

        for c in c_list:
            c_id = c.get('cell_id')
            c_name = str(c.get('cell_name_new') or c_id).upper()
            ran = str(c.get('ran') or '').upper()
            sec = c.get('sector') or extract_sector(c_name)
            
            # 3a. Chuẩn hóa góc Azimuth
            az = c.get('azimuth')
            if az is None:
                az = sec_existing_az.get(sec)
            if az is None:
                az = get_standard_azimuth(sec, total_sec)

            # 3b. Chuẩn hóa Tilt
            tt = c.get('tilt_total')
            tm = c.get('tilt_mech')
            te = c.get('tilt_elec')
            h = c.get('height')

            if tt is None and sec in sec_existing_tilt:
                t_info = sec_existing_tilt[sec]
                tt = t_info['tilt_total']
                tm = t_info['tilt_mech']
                te = t_info['tilt_elec']
                h = t_info['height'] or h

            if tt is None and te is None:
                # Gán chuẩn: tilt cơ = 0, tilt điện = 4, tilt tổng = 4
                tm = 0
                te = 4
                tt = 4
            elif tt is None and te is not None:
                tt = te
                if tm is None: tm = 0
            elif tt is not None and tm is None:
                tm = 0
                te = tt

            if h is None:
                h = 40

            # 3c. Chuẩn hóa Band theo quy định
            band = c.get('band')
            if ran == '3G':
                # Band 3G là 2100 (hoặc 900 nếu có đánh dấu)
                band = '2100' if not band or band in ['None', 'NULL', ''] else band
            elif ran == '4G':
                # Band 4G là 1800 (F1/F2), nếu là 4E là 2100
                if '4E' in c_name or '2100' in str(band):
                    band = '2100'
                else:
                    band = '1800'
            elif ran == '5G':
                # Band 5G là 2600, thêm 3800 nếu là 5G-A
                if is_dual_5g:
                    band = '2600 + 3800'
                elif c.get('layer_5g') == 2 or '3800' in str(band) or 'NR38' in str(band):
                    band = '3800'
                else:
                    band = '2600'

            # Kiểm tra xem có trường nào thay đổi không
            needs_update = False
            patch = {}
            if c.get('sector') != sec:
                patch['sector'] = sec; needs_update = True
            if c.get('azimuth') != az:
                patch['azimuth'] = az; needs_update = True
            if c.get('tilt_total') != tt:
                patch['tilt_total'] = tt; needs_update = True
            if c.get('tilt_mech') != tm:
                patch['tilt_mech'] = tm; needs_update = True
            if c.get('tilt_elec') != te:
                patch['tilt_elec'] = te; needs_update = True
            if c.get('height') != h and c.get('height') is None:
                patch['height'] = h; needs_update = True
            if c.get('band') != band:
                patch['band'] = band; needs_update = True

            if needs_update:
                patch['cell_id'] = c_id
                cells_to_update.append(patch)
                # Cập nhật ngược lại object in-memory
                c.update(patch)

    print(f"📊 Tìm thấy {len(cells_to_update)} cell cần cập nhật thông tin RF.")
    if cells_to_update:
        b_size = 100
        now_iso = datetime.now().isoformat()
        for p in cells_to_update:
            p['updated_at'] = now_iso
        for i in range(0, len(cells_to_update), b_size):
            chunk = cells_to_update[i:i + b_size]
            try:
                sb.table('datacells').upsert(chunk, on_conflict='cell_id').execute()
                print(f"  → Đã lưu {min(i + b_size, len(cells_to_update))}/{len(cells_to_update)} cell...")
            except Exception as e:
                print(f"  ⚠️ Lỗi batch {i}: {e}")

    # 4. Cập nhật bảng datasites (technical_info.rf_summary)
    print("\n⚙️ Bước 4: Đồng bộ technical_info.rf_summary cho toàn bộ datasites...")
    updated_sites_count = 0
    for d in datasites:
        site_id = d.get('site_id')
        site_id_old = d.get('site_id_old')
        ti = d.get('technical_info') or {}
        rf_cur = ti.get('rf_summary') or {}
        
        c_list = cells_by_site.get(site_id) or cells_by_site.get(site_id_old) or []
        
        cells_3g = [c for c in c_list if c.get('ran') == '3G']
        cells_4g = [c for c in c_list if c.get('ran') == '4G']
        cells_5g = [c for c in c_list if c.get('ran') == '5G']

        has_5g = bool(rf_cur.get('has_5g') or len(cells_5g) > 0)
        is_dual_5g = bool(rf_cur.get('is_dual_5g') or 'NR38' in str(rf_cur.get('config_5g') or ''))
        is_sran_swap = bool(rf_cur.get('is_sran_swap'))

        # Phân tích sector từ cell thực tế
        sec_map = {}
        for c in sorted(c_list, key=lambda x: (x.get('sector') or 'A', x.get('azimuth') or 0)):
            sec_name = c.get('sector') or extract_sector(c.get('cell_name_new') or c.get('cell_id'))
            if sec_name not in sec_map:
                sec_map[sec_name] = {
                    'sector': sec_name,
                    'azimuth': c.get('azimuth'),
                    'height': c.get('height') or 40,
                    'tilt_total': c.get('tilt_total'),
                    'tilt_mech': c.get('tilt_mech'),
                    'tilt_elec': c.get('tilt_elec'),
                    'has_3g': False,
                    'has_4g': False,
                    'has_4g_1800_1': False,
                    'has_4g_1800_2': False,
                    'has_4g_2100': False,
                    'has_5g_l1': False,
                    'has_5g_l2': False
                }
            s_data = sec_map[sec_name]
            if c.get('azimuth') is not None and s_data['azimuth'] is None:
                s_data['azimuth'] = c.get('azimuth')
            if c.get('tilt_total') is not None and s_data['tilt_total'] is None:
                s_data['tilt_total'] = c.get('tilt_total')
                s_data['tilt_mech'] = c.get('tilt_mech')
                s_data['tilt_elec'] = c.get('tilt_elec')

            ran = c.get('ran')
            c_name = str(c.get('cell_name_new') or '').upper()
            band = str(c.get('band') or '').upper()

            if ran == '3G':
                s_data['has_3g'] = True
            elif ran == '4G':
                s_data['has_4g'] = True
                if '4E' in c_name or '2100' in band:
                    s_data['has_4g_2100'] = True
                elif '4D' in c_name:
                    s_data['has_4g_1800_2'] = True
                else:
                    s_data['has_4g_1800_1'] = True
            elif ran == '5G':
                if is_dual_5g or '3800' in band or c.get('layer_5g') == 2:
                    s_data['has_5g_l2'] = True
                    s_data['has_5g_l1'] = True
                else:
                    s_data['has_5g_l1'] = True

        # Nếu trạm chưa có sector nào trong datacells (hoặc chưa import cell), tạo fallback 3 sector chuẩn
        if not sec_map:
            for idx, ch in enumerate(['A', 'B', 'C']):
                sec_map[ch] = {
                    'sector': ch,
                    'azimuth': idx * 120,
                    'height': 40,
                    'tilt_total': 4,
                    'tilt_mech': 0,
                    'tilt_elec': 4,
                    'has_3g': len(cells_3g) > 0,
                    'has_4g': True,
                    'has_4g_1800_1': True,
                    'has_4g_1800_2': False,
                    'has_4g_2100': False,
                    'has_5g_l1': has_5g,
                    'has_5g_l2': is_dual_5g
                }
        else:
            # Đảm bảo mỗi sector đều có azimuth và tilt_total
            total_sec = len(sec_map) if len(sec_map) in [2, 3, 4] else 3
            for s_name, s_data in sec_map.items():
                if s_data['azimuth'] is None:
                    s_data['azimuth'] = get_standard_azimuth(s_name, total_sec)
                if s_data['tilt_total'] is None:
                    s_data['tilt_mech'] = 0
                    s_data['tilt_elec'] = 4
                    s_data['tilt_total'] = 4
                if has_5g:
                    s_data['has_5g_l1'] = True
                    if is_dual_5g:
                        s_data['has_5g_l2'] = True

        rf_summary = {
            **rf_cur,
            'total_cells': len(c_list) if c_list else (3 if has_5g else 0),
            'cells_3g': len(cells_3g),
            'cells_4g': len(cells_4g),
            'cells_5g': max(len(cells_5g), 3 if has_5g else 0),
            'cells_5g_l1': max(len([c for c in cells_5g if c.get('layer_5g') == 1]), 3 if has_5g else 0),
            'cells_5g_l2': max(len([c for c in cells_5g if c.get('layer_5g') == 2]), 3 if is_dual_5g else 0),
            'has_5g': has_5g,
            'is_dual_5g': is_dual_5g,
            'is_sran_swap': is_sran_swap,
            'sectors': list(sec_map.values()),
            'last_sync': datetime.utcnow().isoformat()
        }

        ti['rf_summary'] = rf_summary
        
        # Log riêng cho DNLK05
        if site_id_old == 'DNLK05' or site_id == 'DNILKH00':
            print("\n🎯 ĐÃ CHUẨN HÓA TRẠM DNLK05 (DNILKH00):")
            print(f"   - 3G: {rf_summary['cells_3g']} cells (Band 2100)")
            print(f"   - 4G: {rf_summary['cells_4g']} cells (Band 1800/2100)")
            print(f"   - 5G: {rf_summary['cells_5g']} cells (Band 2600 + 3800, Dual 5G-A)")
            print(f"   - Sectors: {rf_summary['sectors']}")

        try:
            sb.table('datasites').update({'technical_info': ti}).eq('site_id', site_id).execute()
            updated_sites_count += 1
        except Exception as e:
            print(f"⚠️ Lỗi update trạm {site_id}: {e}")

    print(f"\n✅ Đã đồng bộ hoàn tất technical_info.rf_summary cho {updated_sites_count} trạm TVT3!")
    print("================================================================================")

if __name__ == '__main__':
    main()
