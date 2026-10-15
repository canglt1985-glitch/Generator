#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script cập nhật thiết kế RF cho 3 trạm:
1. DNXL07 / DNIXLO02
2. DNDQ18 / DNIDQU06
3. DNLK06 / DNIBLC01
Đồng bộ cả Supabase (datasites, datacells) và file cục bộ (snapshot, cache, site_sectors, site_cell_count).
"""
import os
import sys
import json
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

def update_supabase_datasites():
    print("🚀 1. CẬP NHẬT BẢNG 'datasites' TRÊN SUPABASE...")
    
    # 1. DNIXLO02 (DNXL07)
    res_xlo = sb.table('datasites').select('*').eq('site_id', 'DNIXLO02').execute()
    if res_xlo.data:
        site = res_xlo.data[0]
        loc = site.get('location_info') or {}
        tech = site.get('technical_info') or {}
        rf = tech.get('rf_summary') or {}
        
        loc['vi_do'] = 10.91377
        loc['kinh_do'] = 107.39784
        
        rf['has_5g'] = True
        rf['config_5g'] = "NR26 64T"
        rf['sectors'] = [
            {
                "sector": "A",
                "azimuth": 0,
                "height": 50,
                "tilt_mech": 2,
                "tilt_elec": 5,
                "tilt_total": 7,
                "has_3g": True,
                "has_4g": True,
                "has_4g_1800_1": True,
                "has_4g_1800_2": False,
                "has_4g_2100": False,
                "has_5g_l1": True,
                "has_5g_l2": False
            },
            {
                "sector": "B",
                "azimuth": 120,
                "height": 50,
                "tilt_mech": 0,
                "tilt_elec": 5,
                "tilt_total": 5,
                "has_3g": True,
                "has_4g": True,
                "has_4g_1800_1": True,
                "has_4g_1800_2": False,
                "has_4g_2100": False,
                "has_5g_l1": True,
                "has_5g_l2": False
            },
            {
                "sector": "C",
                "azimuth": 240,
                "height": 50,
                "tilt_mech": 0,
                "tilt_elec": 6,
                "tilt_total": 6,
                "has_3g": True,
                "has_4g": True,
                "has_4g_1800_1": True,
                "has_4g_1800_2": False,
                "has_4g_2100": False,
                "has_5g_l1": True,
                "has_5g_l2": False
            }
        ]
        rf['last_sync'] = datetime.now().isoformat()
        tech['rf_summary'] = rf
        sb.table('datasites').update({'location_info': loc, 'technical_info': tech}).eq('site_id', 'DNIXLO02').execute()
        print("  ✅ Cập nhật DNIXLO02 (DNXL07) thành công.")

    # 2. DNIDQU06 (DNDQ18)
    res_dqu = sb.table('datasites').select('*').eq('site_id', 'DNIDQU06').execute()
    if res_dqu.data:
        site = res_dqu.data[0]
        loc = site.get('location_info') or {}
        tech = site.get('technical_info') or {}
        rf = tech.get('rf_summary') or {}
        
        loc['vi_do'] = 11.17971
        loc['kinh_do'] = 107.3859
        
        rf['sectors'] = [
            {
                "sector": "A",
                "azimuth": 60,
                "height": 42,
                "tilt_mech": 0,
                "tilt_elec": 4,
                "tilt_total": 4,
                "has_3g": True,
                "has_4g": True,
                "has_4g_1800_1": True,
                "has_4g_1800_2": False,
                "has_4g_2100": False,
                "has_5g_l1": False,
                "has_5g_l2": False
            },
            {
                "sector": "B",
                "azimuth": 140,
                "height": 42,
                "tilt_mech": 0,
                "tilt_elec": 4,
                "tilt_total": 4,
                "has_3g": True,
                "has_4g": True,
                "has_4g_1800_1": True,
                "has_4g_1800_2": False,
                "has_4g_2100": False,
                "has_5g_l1": False,
                "has_5g_l2": False
            },
            {
                "sector": "C",
                "azimuth": 300,
                "height": 42,
                "tilt_mech": 0,
                "tilt_elec": 6,
                "tilt_total": 6,
                "has_3g": True,
                "has_4g": True,
                "has_4g_1800_1": True,
                "has_4g_1800_2": False,
                "has_4g_2100": False,
                "has_5g_l1": False,
                "has_5g_l2": False
            }
        ]
        rf['last_sync'] = datetime.now().isoformat()
        tech['rf_summary'] = rf
        sb.table('datasites').update({'location_info': loc, 'technical_info': tech}).eq('site_id', 'DNIDQU06').execute()
        print("  ✅ Cập nhật DNIDQU06 (DNDQ18) thành công.")

    # 3. DNIBLC01 (DNLK06)
    res_blc = sb.table('datasites').select('*').eq('site_id', 'DNIBLC01').execute()
    if res_blc.data:
        site = res_blc.data[0]
        loc = site.get('location_info') or {}
        tech = site.get('technical_info') or {}
        rf = tech.get('rf_summary') or {}
        
        loc['vi_do'] = 10.93852
        loc['kinh_do'] = 107.2095
        
        rf['has_5g'] = True
        rf['config_5g'] = "NR2.6 32T"
        rf['cells_5g'] = 3
        rf['cells_5g_l1'] = 3
        rf['total_cells'] = 10
        rf['sectors'] = [
            {
                "sector": "A",
                "azimuth": 0,
                "height": 30,
                "tilt_mech": 0,
                "tilt_elec": 4,
                "tilt_total": 4,
                "has_3g": True,
                "has_4g": True,
                "has_4g_1800_1": True,
                "has_4g_1800_2": True,
                "has_4g_2100": False,
                "has_5g_l1": True,
                "has_5g_l2": False
            },
            {
                "sector": "B",
                "azimuth": 90,
                "height": 30,
                "tilt_mech": 0,
                "tilt_elec": 4,
                "tilt_total": 4,
                "has_3g": True,
                "has_4g": True,
                "has_4g_1800_1": True,
                "has_4g_1800_2": False,
                "has_4g_2100": False,
                "has_5g_l1": True,
                "has_5g_l2": False
            },
            {
                "sector": "C",
                "azimuth": 300,
                "height": 30,
                "tilt_mech": 0,
                "tilt_elec": 5,
                "tilt_total": 5,
                "has_3g": True,
                "has_4g": True,
                "has_4g_1800_1": True,
                "has_4g_1800_2": False,
                "has_4g_2100": False,
                "has_5g_l1": True,
                "has_5g_l2": False
            }
        ]
        rf['last_sync'] = datetime.now().isoformat()
        tech['rf_summary'] = rf
        sb.table('datasites').update({'location_info': loc, 'technical_info': tech}).eq('site_id', 'DNIBLC01').execute()
        print("  ✅ Cập nhật DNIBLC01 (DNLK06) thành công.")

def update_supabase_datacells():
    print("\n🚀 2. CẬP NHẬT BẢNG 'datacells' TRÊN SUPABASE...")
    
    cells_update = [
        # DNIXLO02
        {"cell_id": "DNIXLO02BM4CA", "site_id": "DNIXLO02", "band": "L1800F1", "sector": "A", "azimuth": 0, "height": 50, "tilt_mech": 2, "tilt_elec": 5, "tilt_total": 7},
        {"cell_id": "DNIXLO02BM4CB", "site_id": "DNIXLO02", "band": "L1800F1", "sector": "B", "azimuth": 120, "height": 50, "tilt_mech": 0, "tilt_elec": 5, "tilt_total": 5},
        {"cell_id": "DNIXLO02BM4CC", "site_id": "DNIXLO02", "band": "L1800F1", "sector": "C", "azimuth": 240, "height": 50, "tilt_mech": 0, "tilt_elec": 6, "tilt_total": 6},
        {"cell_id": "DNIXLO02BM5LA", "site_id": "DNIXLO02", "band": "2600", "sector": "A", "azimuth": 0, "height": 51, "tilt_mech": 0, "tilt_elec": 6, "tilt_total": 6},
        {"cell_id": "DNIXLO02BM5LB", "site_id": "DNIXLO02", "band": "2600", "sector": "B", "azimuth": 120, "height": 51, "tilt_mech": 0, "tilt_elec": 5, "tilt_total": 5},
        {"cell_id": "DNIXLO02BM5LC", "site_id": "DNIXLO02", "band": "2600", "sector": "C", "azimuth": 240, "height": 51, "tilt_mech": 0, "tilt_elec": 5, "tilt_total": 5},
        {"cell_id": "DNIXLO02BM3GA", "site_id": "DNIXLO02", "band": "2100", "sector": "A", "azimuth": 0, "height": 51, "tilt_mech": 0, "tilt_elec": 6, "tilt_total": 6},
        {"cell_id": "DNIXLO02BM3GB", "site_id": "DNIXLO02", "band": "2100", "sector": "B", "azimuth": 120, "height": 51, "tilt_mech": 0, "tilt_elec": 5, "tilt_total": 5},
        {"cell_id": "DNIXLO02BM3GC", "site_id": "DNIXLO02", "band": "2100", "sector": "C", "azimuth": 240, "height": 51, "tilt_mech": 0, "tilt_elec": 5, "tilt_total": 5},
        
        # DNIDQU06
        {"cell_id": "DNIDQU06CM4CA", "site_id": "DNIDQU06", "band": "1800", "sector": "A", "azimuth": 60, "height": 42, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4},
        {"cell_id": "DNIDQU06CM4CB", "site_id": "DNIDQU06", "band": "1800", "sector": "B", "azimuth": 140, "height": 42, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4},
        {"cell_id": "DNIDQU06CM4CC", "site_id": "DNIDQU06", "band": "1800", "sector": "C", "azimuth": 300, "height": 42, "tilt_mech": 0, "tilt_elec": 6, "tilt_total": 6},
        {"cell_id": "DNIDQU06CM3GA", "site_id": "DNIDQU06", "band": "2100", "sector": "A", "azimuth": 60, "height": 42, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4},
        {"cell_id": "DNIDQU06CM3GB", "site_id": "DNIDQU06", "band": "2100", "sector": "B", "azimuth": 140, "height": 42, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4},
        {"cell_id": "DNIDQU06CM3GC", "site_id": "DNIDQU06", "band": "2100", "sector": "C", "azimuth": 300, "height": 42, "tilt_mech": 0, "tilt_elec": 6, "tilt_total": 6},

        # DNIBLC01
        {"cell_id": "DNIBLC01CM3GA", "site_id": "DNIBLC01", "band": "2100", "sector": "A", "azimuth": 0, "height": 30, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4},
        {"cell_id": "DNIBLC01CM3GB", "site_id": "DNIBLC01", "band": "2100", "sector": "B", "azimuth": 90, "height": 30, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4},
        {"cell_id": "DNIBLC01CM3GC", "site_id": "DNIBLC01", "band": "2100", "sector": "C", "azimuth": 300, "height": 30, "tilt_mech": 0, "tilt_elec": 5, "tilt_total": 5},
        {"cell_id": "DNIBLC01CM4CA", "site_id": "DNIBLC01", "band": "1800", "sector": "A", "azimuth": 0, "height": 30, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4},
        {"cell_id": "DNIBLC01CM4CB", "site_id": "DNIBLC01", "band": "1800", "sector": "B", "azimuth": 90, "height": 30, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4},
        {"cell_id": "DNIBLC01CM4CC", "site_id": "DNIBLC01", "band": "1800", "sector": "C", "azimuth": 300, "height": 30, "tilt_mech": 0, "tilt_elec": 5, "tilt_total": 5},
        {"cell_id": "DNIBLC01CM4DA", "site_id": "DNIBLC01", "band": "1800", "sector": "A", "azimuth": 0, "height": 30, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4},
        # 5G cells for DNIBLC01
        {"cell_id": "DNIBLC01BM5LA", "site_id": "DNIBLC01", "band": "2600", "sector": "A", "azimuth": 0, "height": 32, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4, "status": "Active"},
        {"cell_id": "DNIBLC01BM5LB", "site_id": "DNIBLC01", "band": "2600", "sector": "B", "azimuth": 90, "height": 32, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4, "status": "Active"},
        {"cell_id": "DNIBLC01BM5LC", "site_id": "DNIBLC01", "band": "2600", "sector": "C", "azimuth": 300, "height": 32, "tilt_mech": 0, "tilt_elec": 5, "tilt_total": 5, "status": "Active"},
    ]

    for c in cells_update:
        # Check if cell exists
        res = sb.table('datacells').select('cell_id').eq('cell_id', c['cell_id']).execute()
        if res.data:
            sb.table('datacells').update(c).eq('cell_id', c['cell_id']).execute()
            print(f"  ✅ Đã cập nhật cell: {c['cell_id']}")
        else:
            sb.table('datacells').insert(c).execute()
            print(f"  ✨ Đã thêm mới cell: {c['cell_id']}")

def update_local_files():
    print("\n🚀 3. CẬP NHẬT CÁC FILE DỮ LIỆU CỤC BỘ...")
    
    # 1. tvt3_sites_snapshot.json (list) & tvt3_sites_cache.json (dict)
    for path in ['backend/data/tvt3_sites_snapshot.json', 'backend/data/tvt3_sites_cache.json']:
        if not os.path.exists(path): continue
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        modified = 0
        
        def update_site_obj(s):
            nonlocal modified
            sid = s.get('site_id')
            sold = s.get('site_id_old')
            if sid == 'DNIXLO02' or sold == 'DNXL07':
                s.setdefault('location_info', {})['vi_do'] = 10.91377
                s['location_info']['kinh_do'] = 107.39784
                rf = s.setdefault('technical_info', {}).setdefault('rf_summary', {})
                rf['has_5g'] = True
                rf['sectors'] = [
                    {"sector": "A", "azimuth": 0, "height": 50, "tilt_mech": 2, "tilt_elec": 5, "tilt_total": 7, "has_3g": True, "has_4g": True, "has_5g_l1": True, "has_4g_1800_1": True},
                    {"sector": "B", "azimuth": 120, "height": 50, "tilt_mech": 0, "tilt_elec": 5, "tilt_total": 5, "has_3g": True, "has_4g": True, "has_5g_l1": True, "has_4g_1800_1": True},
                    {"sector": "C", "azimuth": 240, "height": 50, "tilt_mech": 0, "tilt_elec": 6, "tilt_total": 6, "has_3g": True, "has_4g": True, "has_5g_l1": True, "has_4g_1800_1": True}
                ]
                modified += 1
            elif sid == 'DNIDQU06' or sold == 'DNDQ18':
                s.setdefault('location_info', {})['vi_do'] = 11.17971
                s['location_info']['kinh_do'] = 107.3859
                rf = s.setdefault('technical_info', {}).setdefault('rf_summary', {})
                rf['sectors'] = [
                    {"sector": "A", "azimuth": 60, "height": 42, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4, "has_3g": True, "has_4g": True, "has_4g_1800_1": True},
                    {"sector": "B", "azimuth": 140, "height": 42, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4, "has_3g": True, "has_4g": True, "has_4g_1800_1": True},
                    {"sector": "C", "azimuth": 300, "height": 42, "tilt_mech": 0, "tilt_elec": 6, "tilt_total": 6, "has_3g": True, "has_4g": True, "has_4g_1800_1": True}
                ]
                modified += 1
            elif sid == 'DNIBLC01' or sold == 'DNLK06':
                s.setdefault('location_info', {})['vi_do'] = 10.93852
                s['location_info']['kinh_do'] = 107.2095
                rf = s.setdefault('technical_info', {}).setdefault('rf_summary', {})
                rf['has_5g'] = True
                rf['config_5g'] = "NR2.6 32T"
                rf['cells_5g'] = 3
                rf['cells_5g_l1'] = 3
                rf['total_cells'] = 10
                rf['sectors'] = [
                    {"sector": "A", "azimuth": 0, "height": 30, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4, "has_3g": True, "has_4g": True, "has_5g_l1": True, "has_4g_1800_1": True, "has_4g_1800_2": True},
                    {"sector": "B", "azimuth": 90, "height": 30, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4, "has_3g": True, "has_4g": True, "has_5g_l1": True, "has_4g_1800_1": True},
                    {"sector": "C", "azimuth": 300, "height": 30, "tilt_mech": 0, "tilt_elec": 5, "tilt_total": 5, "has_3g": True, "has_4g": True, "has_5g_l1": True, "has_4g_1800_1": True}
                ]
                modified += 1

        if isinstance(data, list):
            for s in data:
                if isinstance(s, dict):
                    update_site_obj(s)
        elif isinstance(data, dict):
            for k, s in data.items():
                if isinstance(s, dict):
                    update_site_obj(s)
        
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  ✅ Đã cập nhật {modified} mục trong {path}")

    # 2. site_sectors.json
    for path in ['backend/data/site_sectors.json', 'tvt3_v2/src/data/site_sectors.json']:
        if not os.path.exists(path): continue
        with open(path, 'r', encoding='utf-8') as f:
            sectors = json.load(f)
        
        for k in ['DNLK06', 'DNIBLC01']:
            if k in sectors:
                sectors[k]['5G'] = ['A', 'B', 'C']
            else:
                sectors[k] = {'3G': ['A', 'B', 'C'], '4G': ['A', 'B', 'C'], '5G': ['A', 'B', 'C']}
        
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(sectors, f, ensure_ascii=False, indent=2)
        print(f"  ✅ Đã bổ sung 5G cho DNLK06/DNIBLC01 trong {path}")

    # 3. site_cell_count.json
    for path in ['backend/data/site_cell_count.json', 'tvt3_v2/src/data/site_cell_count.json']:
        if not os.path.exists(path): continue
        with open(path, 'r', encoding='utf-8') as f:
            counts = json.load(f)
        
        for k in ['DNLK06', 'DNIBLC01']:
            if k in counts:
                counts[k]['5G'] = 3
            else:
                counts[k] = {'3G': 3, '4G': 4, '5G': 3}
        
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(counts, f, ensure_ascii=False, indent=2)
        print(f"  ✅ Đã cập nhật 5G cell count (3) cho DNLK06/DNIBLC01 trong {path}")

if __name__ == '__main__':
    update_supabase_datasites()
    update_supabase_datacells()
    update_local_files()
    print("\n🎉 HOÀN TẤT CẬP NHẬT THIẾT KẾ RF CHO 3 TRẠM!")
