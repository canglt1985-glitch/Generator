#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script Đồng Bộ Hóa Toàn Diện:
1. Rà soát giải pháp swap_solution:
   - CHỈ trạm nào có swap_solution chứa '3G4G' hoặc '3G/4G' mới là is_sran_swap = True (Dùng chung phần cứng BBU/RRU SRAN).
   - Còn lại (SWAP:4G, 4G Only, -) là is_sran_swap = False (4G Độc lập với 3G).
2. Đồng bộ 5G Onair từ sran_5g_tracker sang datasites.technical_info.rf_summary:
   - Sửa 5 trạm bị sót: DNLK05 (5G-A), DNTN04 (5G-A), DNTN44 (5G L1), DNLK09 (5G L1), DNLK76 (5G L1).
3. Bổ sung thông tin chi tiết các tầng tần số (Sub-bands):
   - 4G: 1800-1 (4C), 1800-2 (4D), 2100 (4E)
   - 5G: 2600 (NR26), 3800 (NR38)
   - 3G: 2100/900
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

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

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

def main():
    print("================================================================================")
    print("🚀 BẮT ĐẦU ĐỒNG BỘ DỮ LIỆU SRAN, 4G ĐỘC LẬP VÀ CÁC TẦNG CÁNH SÓNG CHO TVT3")
    print("================================================================================")

    # 1. Tải danh sách trạm từ sran_5g_tracker
    print("📖 Bước 1: Đọc sran_5g_tracker...")
    sran_res = supabase.table('sran_5g_tracker').select('*').execute()
    sran_map = {}
    for row in sran_res.data:
        sid = (row.get('site_id') or '').strip().upper()
        sold = (row.get('site_id_old') or '').strip().upper()
        if sid: sran_map[sid] = row
        if sold: sran_map[sold] = row
    print(f"✅ Đã tải {len(sran_res.data)} bản ghi từ sran_5g_tracker.")

    # 2. Tải toàn bộ cell từ datacells để phân loại tầng 4C / 4D / 4E / NR26 / NR38
    print("📖 Bước 2: Đọc dữ liệu chi tiết từng cell từ datacells...")
    cells_by_site = defaultdict(list)
    offset = 0
    batch_size = 1000
    while True:
        c_res = supabase.table('datacells').select('site_id, site_id_old, cell_name_new, ran, band, layer_5g, sector, azimuth, height').range(offset, offset + batch_size - 1).execute()
        if not c_res.data: break
        for c in c_res.data:
            sid = (c.get('site_id') or '').strip().upper()
            sold = (c.get('site_id_old') or '').strip().upper()
            if sid: cells_by_site[sid].append(c)
            elif sold: cells_by_site[sold].append(c)
        offset += batch_size
        if len(c_res.data) < batch_size: break
    print(f"✅ Đã phân loại cell cho {len(cells_by_site)} mã trạm.")

    # 3. Tải danh sách trạm datasites
    print("📖 Bước 3: Đọc datasites...")
    ds_res = supabase.table('datasites').select('site_id, site_id_old, technical_info').execute()
    datasites = ds_res.data
    print(f"✅ Đã tải {len(datasites)} trạm từ datasites.")

    updated_sites = []
    
    for ds in datasites:
        site_id = ds.get('site_id')
        site_id_old = ds.get('site_id_old')
        
        # Tìm thông tin SRAN tracker
        sran_row = sran_map.get(site_id) or sran_map.get(site_id_old) or {}
        
        # 1. Xác định nghiêm ngặt is_sran_swap:
        # CHỈ trạm nào có swap_solution chứa '3G4G' hoặc '3G/4G' mới là SRAN!
        swap_sol_raw = str(sran_row.get('swap_solution') or '').upper()
        is_sran_swap = ('3G4G' in swap_sol_raw) or ('3G/4G' in swap_sol_raw)
        
        # 2. Xác định 5G Onair từ sran_5g_tracker
        cfg5 = str(sran_row.get('config_5g') or (sran_row.get('raw_data') or {}).get('5G_Config') or '').upper()
        scope5 = str(sran_row.get('scope_5g') or (sran_row.get('raw_data') or {}).get('5G_Scope') or '').upper()
        onair_date = sran_row.get('onair_date') or (sran_row.get('raw_data') or {}).get('Onair_Actual_Date')
        
        has_5g_onair = bool(onair_date and ('NR' in cfg5 or '5G' in scope5))
        has_nr26 = bool(onair_date and 'NR26' in cfg5)
        has_nr38 = bool(onair_date and 'NR38' in cfg5)
        is_dual_5g = bool(has_nr26 and has_nr38)

        # 3. Đọc danh sách cell thực tế của trạm
        c_list = cells_by_site.get(site_id) or cells_by_site.get(site_id_old) or []
        
        cells_3g = [c for c in c_list if c.get('ran') == '3G']
        cells_4g = [c for c in c_list if c.get('ran') == '4G']
        cells_5g = [c for c in c_list if c.get('ran') == '5G']

        # Nếu sran_tracker báo 5G Onair nhưng datacells chưa có cell 5G (như DNLK05, DNTN04...)
        # Ta tạo virtual cells 5G để đồng bộ hoàn toàn
        effective_has_5g = has_5g_onair or len(cells_5g) > 0
        effective_is_dual_5g = is_dual_5g or (len([c for c in cells_5g if c.get('layer_5g') == 2]) > 0)
        
        # 4. Phân tích các Sector và các tầng tần số (Layers)
        sec_map = {}
        for c in sorted(c_list, key=lambda x: (x.get('sector') or 'A', x.get('azimuth') or 0)):
            sec_name = c.get('sector') or extract_sector(c.get('cell_name_new'))
            az = c.get('azimuth')
            h = c.get('height')
            
            if sec_name not in sec_map:
                sec_map[sec_name] = {
                    'sector': sec_name,
                    'azimuth': az,
                    'height': h,
                    'has_3g': False,
                    'has_4g_1800_1': False,  # 4C - F1
                    'has_4g_1800_2': False,  # 4D - F2
                    'has_4g_2100': False,    # 4E - L2100
                    'has_4g': False,
                    'has_5g_l1': False,      # NR26 - 2600 MHz
                    'has_5g_l2': False       # NR38 - 3800 MHz (5G-A)
                }
            if az is not None and sec_map[sec_name]['azimuth'] is None:
                sec_map[sec_name]['azimuth'] = az
                sec_map[sec_name]['height'] = h

            c_name = str(c.get('cell_name_new') or '').upper()
            ran = c.get('ran')
            l5 = c.get('layer_5g')
            band = str(c.get('band') or '').upper()

            if ran == '3G':
                sec_map[sec_name]['has_3g'] = True
            elif ran == '4G':
                sec_map[sec_name]['has_4g'] = True
                if '4E' in c_name or '2100' in band:
                    sec_map[sec_name]['has_4g_2100'] = True
                elif '4D' in c_name or 'F2' in band:
                    sec_map[sec_name]['has_4g_1800_2'] = True
                else:
                    sec_map[sec_name]['has_4g_1800_1'] = True
            elif ran == '5G':
                if l5 == 2 or '3800' in band or 'NR38' in band:
                    sec_map[sec_name]['has_5g_l2'] = True
                else:
                    sec_map[sec_name]['has_5g_l1'] = True

        # Nếu trạm chưa có sector nào trong datacells (hoặc chỉ có 3G4G), nhưng có 5G Onair trong SRAN tracker
        if not sec_map:
            # Tạo 3 sector mặc định A, B, C
            for s_idx, s_char in enumerate(['A', 'B', 'C']):
                sec_map[s_char] = {
                    'sector': s_char,
                    'azimuth': s_idx * 120,
                    'height': None,
                    'has_3g': len(cells_3g) > 0,
                    'has_4g_1800_1': len(cells_4g) > 0,
                    'has_4g_1800_2': False,
                    'has_4g_2100': False,
                    'has_4g': len(cells_4g) > 0,
                    'has_5g_l1': has_nr26,
                    'has_5g_l2': has_nr38
                }
        else:
            # Bổ sung cờ 5G cho các sector hiện hữu nếu trạm đã Onair 5G
            for sec_name, s_data in sec_map.items():
                if has_nr26: s_data['has_5g_l1'] = True
                if has_nr38: s_data['has_5g_l2'] = True
                # Đảm bảo nếu có has_4g nhưng chưa phân lớp thì bật has_4g_1800_1
                if s_data['has_4g'] and not (s_data['has_4g_1800_1'] or s_data['has_4g_1800_2'] or s_data['has_4g_2100']):
                    s_data['has_4g_1800_1'] = True

        sectors_list = list(sec_map.values())

        # 5. Tạo cấu trúc rf_summary hoàn chỉnh
        rf_summary = {
            'total_cells': len(c_list) if c_list else (3 if effective_has_5g else 0),
            'cells_3g': len(cells_3g),
            'cells_4g': len(cells_4g),
            'cells_5g': max(len(cells_5g), 3 if effective_has_5g else 0),
            'cells_5g_l1': max(len([c for c in cells_5g if c.get('layer_5g') == 1]), 3 if has_nr26 else 0),
            'cells_5g_l2': max(len([c for c in cells_5g if c.get('layer_5g') == 2]), 3 if has_nr38 else 0),
            'has_5g': effective_has_5g,
            'is_dual_5g': effective_is_dual_5g,
            'is_sran_swap': is_sran_swap,
            'swap_solution': sran_row.get('swap_solution'),
            'config_3g4g': sran_row.get('config_3g4g'),
            'config_5g': sran_row.get('config_5g') or cfg5 or None,
            'sectors': sectors_list,
            'last_sync': datetime.utcnow().isoformat()
        }

        # Cập nhật vào technical_info
        current_tech = ds.get('technical_info') or {}
        if not isinstance(current_tech, dict): current_tech = {}
        current_tech['rf_summary'] = rf_summary
        
        # Log đặc biệt cho 5 trạm quan trọng
        if site_id_old in ['DNLK05', 'DNTN04', 'DNTN44', 'DNLK09', 'DNLK76']:
            print(f"  ⭐ ĐẶC BIỆT CẬP NHẬT TRẠM {site_id_old} ({site_id}):")
            print(f"     is_sran_swap={is_sran_swap} (Sol: {sran_row.get('swap_solution')})")
            print(f"     has_5g={effective_has_5g}, is_dual_5g={effective_is_dual_5g}, config_5g={cfg5}")
            print(f"     sectors count={len(sectors_list)}")

        try:
            supabase.table('datasites').update({'technical_info': current_tech}).eq('site_id', site_id).execute()
            updated_sites.append(site_id)
        except Exception as e:
            print(f"  ⚠️ Lỗi cập nhật trạm {site_id}: {e}")

    print(f"\n🎉 HOÀN TẤT ĐỒNG BỘ: Đã cập nhật thành công {len(updated_sites)}/{len(datasites)} trạm!")

if __name__ == '__main__':
    main()
