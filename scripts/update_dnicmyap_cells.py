#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cập nhật số cell & thông số RF cho trạm DNICMYAP:
- 3 cell 3G: DNICMYAPDM3GA, DNICMYAPDM3GB, DNICMYAPDM3GC
- 3 cell 4G: DNICMYAPCM4CA, DNICMYAPCM4CB, DNICMYAPCM4CC
Đồng bộ Supabase (datasites, datacells) và các file cục bộ (site_cell_count, site_sectors, snapshot, cache).
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

def update_supabase():
    print("🚀 1. Cập nhật DNICMYAP trên Supabase...")
    
    # 1. datasites
    res = sb.table('datasites').select('*').eq('site_id', 'DNICMYAP').execute()
    if res.data:
        site = res.data[0]
        tech = site.get('technical_info') or {}
        rf = tech.get('rf_summary') or {}
        
        rf['cells_3g'] = 3
        rf['cells_4g'] = 3
        rf['total_cells'] = 6
        rf['sectors'] = [
            {
                "sector": "A",
                "azimuth": 0,
                "height": 40,
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
                "azimuth": 120,
                "height": 40,
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
                "azimuth": 240,
                "height": 40,
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
            }
        ]
        rf['last_sync'] = datetime.now().isoformat()
        tech['rf_summary'] = rf
        sb.table('datasites').update({'technical_info': tech}).eq('site_id', 'DNICMYAP').execute()
        print("  ✅ Đã cập nhật bảng datasites cho DNICMYAP (3 cells 3G, 3 cells 4G).")

    # 2. datacells
    cells = [
        {"cell_id": "DNICMYAPDM3GA", "site_id": "DNICMYAP", "band": "2100", "sector": "A", "azimuth": 0, "height": 40, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4, "status": "Active"},
        {"cell_id": "DNICMYAPDM3GB", "site_id": "DNICMYAP", "band": "2100", "sector": "B", "azimuth": 120, "height": 40, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4, "status": "Active"},
        {"cell_id": "DNICMYAPDM3GC", "site_id": "DNICMYAP", "band": "2100", "sector": "C", "azimuth": 240, "height": 40, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4, "status": "Active"},
        {"cell_id": "DNICMYAPCM4CA", "site_id": "DNICMYAP", "band": "1800", "sector": "A", "azimuth": 0, "height": 40, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4, "status": "Active"},
        {"cell_id": "DNICMYAPCM4CB", "site_id": "DNICMYAP", "band": "1800", "sector": "B", "azimuth": 120, "height": 40, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4, "status": "Active"},
        {"cell_id": "DNICMYAPCM4CC", "site_id": "DNICMYAP", "band": "1800", "sector": "C", "azimuth": 240, "height": 40, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4, "status": "Active"},
    ]
    for c in cells:
        res = sb.table('datacells').select('cell_id').eq('cell_id', c['cell_id']).execute()
        if res.data:
            sb.table('datacells').update(c).eq('cell_id', c['cell_id']).execute()
            print(f"  ✅ Đã cập nhật cell: {c['cell_id']}")
        else:
            sb.table('datacells').insert(c).execute()
            print(f"  ✨ Đã thêm mới cell: {c['cell_id']}")

def update_local_files():
    print("\n🚀 2. Cập nhật các file dữ liệu cục bộ...")
    
    # 1. site_cell_count.json
    for path in ['backend/data/site_cell_count.json', 'tvt3_v2/src/data/site_cell_count.json']:
        if not os.path.exists(path): continue
        with open(path, 'r', encoding='utf-8') as f:
            counts = json.load(f)
        counts['DNICMYAP'] = {'3G': 3, '4G': 3}
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(counts, f, ensure_ascii=False, indent=2)
        print(f"  ✅ Đã cập nhật site_cell_count (3G: 3, 4G: 3) trong {path}")

    # 2. site_sectors.json
    for path in ['backend/data/site_sectors.json', 'tvt3_v2/src/data/site_sectors.json']:
        if not os.path.exists(path): continue
        with open(path, 'r', encoding='utf-8') as f:
            sectors = json.load(f)
        sectors['DNICMYAP'] = {'3G': ['A', 'B', 'C'], '4G': ['A', 'B', 'C']}
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(sectors, f, ensure_ascii=False, indent=2)
        print(f"  ✅ Đã cập nhật site_sectors (3G: [A,B,C], 4G: [A,B,C]) trong {path}")

    # 3. tvt3_sites_snapshot.json & tvt3_sites_cache.json
    for path in ['backend/data/tvt3_sites_snapshot.json', 'backend/data/tvt3_sites_cache.json']:
        if not os.path.exists(path): continue
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        def update_obj(s):
            if s.get('site_id') == 'DNICMYAP':
                rf = s.setdefault('technical_info', {}).setdefault('rf_summary', {})
                rf['cells_3g'] = 3
                rf['cells_4g'] = 3
                rf['total_cells'] = 6
                rf['sectors'] = [
                    {"sector": "A", "azimuth": 0, "height": 40, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4, "has_3g": True, "has_4g": True},
                    {"sector": "B", "azimuth": 120, "height": 40, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4, "has_3g": True, "has_4g": True},
                    {"sector": "C", "azimuth": 240, "height": 40, "tilt_mech": 0, "tilt_elec": 4, "tilt_total": 4, "has_3g": True, "has_4g": True}
                ]

        if isinstance(data, list):
            for s in data:
                if isinstance(s, dict): update_obj(s)
        elif isinstance(data, dict):
            for k, s in data.items():
                if isinstance(s, dict): update_obj(s)
                
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  ✅ Đã cập nhật rf_summary cho DNICMYAP trong {path}")

if __name__ == '__main__':
    update_supabase()
    update_local_files()
    print("\n🎉 Hoàn tất cập nhật DNICMYAP!")
