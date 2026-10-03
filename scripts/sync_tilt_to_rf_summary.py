#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script đồng bộ dữ liệu Tilt (tilt_total, tilt_mech, tilt_elec) từ bảng 'datacells'
vào trường 'technical_info.rf_summary.sectors' của bảng 'datasites'.
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

def main():
    print("🚀 Bắt đầu đồng bộ Tilt từ datacells -> datasites.technical_info.rf_summary...")
    
    # 1. Đọc toàn bộ datacells
    cells = []
    page = 0
    while True:
        res = sb.table('datacells').select(
            'site_id,site_id_old,sector,azimuth,height,tilt_total,tilt_mech,tilt_elec'
        ).range(page * 1000, (page + 1) * 1000 - 1).execute()
        if not res.data:
            break
        cells.extend(res.data)
        page += 1
        if len(res.data) < 1000:
            break

    print(f"📖 Đã đọc {len(cells)} cells từ bảng datacells.")

    # 2. Xây dựng mapping (site, sector) -> tilt info
    site_sec_tilt = {}
    for c in cells:
        s_id = (c.get('site_id') or '').strip().upper()
        s_old = (c.get('site_id_old') or '').strip().upper()
        sec = (c.get('sector') or '').strip().upper()
        tt = c.get('tilt_total')
        tm = c.get('tilt_mech')
        te = c.get('tilt_elec')
        if tt is not None or tm is not None or te is not None:
            data = {'tilt_total': tt, 'tilt_mech': tm, 'tilt_elec': te}
            if s_id and sec and (s_id, sec) not in site_sec_tilt:
                site_sec_tilt[(s_id, sec)] = data
            if s_old and sec and (s_old, sec) not in site_sec_tilt:
                site_sec_tilt[(s_old, sec)] = data

    print(f"🎯 Đã ánh xạ {len(site_sec_tilt)} tổ hợp (trạm, sector) có tilt.")

    # 3. Đọc danh sách datasites
    ds_res = sb.table('datasites').select('site_id,site_id_old,technical_info').execute()
    datasites = ds_res.data or []
    print(f"📍 Đã đọc {len(datasites)} trạm từ bảng datasites.")

    updated_count = 0
    for r in datasites:
        s_id = (r.get('site_id') or '').strip().upper()
        s_old = (r.get('site_id_old') or '').strip().upper()
        ti = r.get('technical_info') or {}
        rf = ti.get('rf_summary')
        if not rf or not rf.get('sectors'):
            continue

        changed = False
        for sec in rf['sectors']:
            sec_name = (sec.get('sector') or '').strip().upper()
            tilt_info = site_sec_tilt.get((s_id, sec_name)) or site_sec_tilt.get((s_old, sec_name))
            if tilt_info:
                if (sec.get('tilt_total') != tilt_info['tilt_total'] or
                    sec.get('tilt_mech') != tilt_info['tilt_mech'] or
                    sec.get('tilt_elec') != tilt_info['tilt_elec']):
                    sec['tilt_total'] = tilt_info['tilt_total']
                    sec['tilt_mech'] = tilt_info['tilt_mech']
                    sec['tilt_elec'] = tilt_info['tilt_elec']
                    changed = True

        if changed:
            ti['rf_summary'] = rf
            try:
                sb.table('datasites').update({'technical_info': ti}).eq('site_id', r['site_id']).execute()
                updated_count += 1
            except Exception as e:
                print(f"⚠️ Lỗi update trạm {r['site_id']}: {e}")

    print(f"✅ Hoàn tất! Đã cập nhật Tilt vào technical_info.rf_summary cho {updated_count} trạm!")

if __name__ == '__main__':
    main()
