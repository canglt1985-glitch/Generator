#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script cập nhật chuẩn hóa cờ SRAN cho 26 trạm TVT3:
- 23 trạm Thống Nhất (DNTN)
- 3 trạm Tân Phú (DNTP)
Giữ nguyên các trạm Non-SRAN: DNTN60, DNTNL1, DNTN43, DNTN14, CRAN Outdoor, v.v.

Thực hiện:
1. Backup dữ liệu datasites & sran_5g_tracker của 26 trạm trước khi update.
2. Cập nhật datasites: technical_info.rf_summary.is_sran_swap = True, swap_solution = 'Swap:3G4G'.
3. Cập nhật sran_5g_tracker: swap_solution = 'SWAP:3G4G' để đồng bộ lâu dài.
4. Đối soát kiểm tra lại kết quả.
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

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

TARGET_SITES_DNTN = [
    'DNTN00', 'DNTN02', 'DNTN06', 'DNTN07', 'DNTN10',
    'DNTN12', 'DNTN13', 'DNTN15', 'DNTN16', 'DNTN17',
    'DNTN25', 'DNTN30', 'DNTN32', 'DNTN33', 'DNTN34',
    'DNTN35', 'DNTN36', 'DNTN39', 'DNTN40', 'DNTN42',
    'DNTN46', 'DNTN47', 'DNTN52'
]

TARGET_SITES_DNTP = [
    'DNTP01', 'DNTP20', 'DNTP29'
]

ALL_TARGET_SITES = TARGET_SITES_DNTN + TARGET_SITES_DNTP

def main():
    print("=" * 80)
    print(f"🚀 BẮT ĐẦU CẬP NHẬT CHUẨN HÓA SRAN CHO {len(ALL_TARGET_SITES)} TRẠM TVT3")
    print("=" * 80)

    # 1. Tải dữ liệu hiện tại từ datasites
    res = supabase.table('datasites').select('site_id, site_id_old, name, technical_info').in_('site_id_old', ALL_TARGET_SITES).execute()
    current_datasites = res.data
    print(f"✅ Đã tìm thấy {len(current_datasites)}/{len(ALL_TARGET_SITES)} trạm trong bảng datasites.")

    # 2. Tải dữ liệu từ sran_5g_tracker
    tr_res = supabase.table('sran_5g_tracker').select('*').in_('site_id_old', ALL_TARGET_SITES).execute()
    current_trackers = tr_res.data
    print(f"✅ Đã tìm thấy {len(current_trackers)} bản ghi trong sran_5g_tracker.")

    # 3. Tạo file backup
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(project_dir, 'scratch', f'backup_sran_update_26sites_{timestamp}.json')
    os.makedirs(os.path.dirname(backup_file), exist_ok=True)
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump({
            'datasites': current_datasites,
            'sran_5g_tracker': current_trackers
        }, f, ensure_ascii=False, indent=2)
    print(f"💾 Đã tạo file backup tại: {backup_file}")

    # 4. Cập nhật datasites
    print("\n🔄 Đang cập nhật bảng datasites...")
    success_ds = 0
    fail_ds = 0
    for s in current_datasites:
        sid_old = s['site_id_old']
        sid_new = s['site_id']
        t_info = s.get('technical_info') or {}
        rf_summary = t_info.get('rf_summary') or {}

        rf_summary['is_sran_swap'] = True
        rf_summary['swap_solution'] = 'Swap:3G4G'
        t_info['rf_summary'] = rf_summary

        try:
            up_res = supabase.table('datasites').update({
                'technical_info': t_info,
                'updated_at': datetime.now().isoformat()
            }).eq('site_id_old', sid_old).execute()
            if up_res.data:
                success_ds += 1
                print(f"  ✓ Đã cập nhật datasites: {sid_old:7s} ({sid_new}) -> is_sran_swap=True")
            else:
                fail_ds += 1
                print(f"  ❌ Không có data trả về khi update: {sid_old}")
        except Exception as e:
            fail_ds += 1
            print(f"  ❌ Lỗi khi update datasites {sid_old}: {e}")

    # 5. Cập nhật sran_5g_tracker
    print("\n🔄 Đang cập nhật bảng sran_5g_tracker...")
    success_tr = 0
    fail_tr = 0
    for sid in ALL_TARGET_SITES:
        try:
            up_tr = supabase.table('sran_5g_tracker').update({
                'swap_solution': 'SWAP:3G4G',
                'updated_at': datetime.now().isoformat()
            }).eq('site_id_old', sid).execute()
            if up_tr.data:
                success_tr += len(up_tr.data)
                print(f"  ✓ Đã cập nhật sran_5g_tracker: {sid:7s} -> swap_solution='SWAP:3G4G'")
            else:
                print(f"  ⚠️ Không có dòng trong sran_5g_tracker cho: {sid:7s} (bỏ qua)")
        except Exception as e:
            fail_tr += 1
            print(f"  ❌ Lỗi khi update tracker {sid}: {e}")

    # 6. Kiểm tra đối soát lại
    print("\n" + "=" * 80)
    print("🔍 BẮT ĐẦU ĐỐI SOÁT KIỂM TRA LẠI DỮ LIỆU:")
    print("=" * 80)
    verify_res = supabase.table('datasites').select('site_id_old, site_id, technical_info').in_('site_id_old', ALL_TARGET_SITES).execute()
    all_ok = True
    for s in verify_res.data:
        sid = s['site_id_old']
        rf = s.get('technical_info', {}).get('rf_summary', {})
        is_sran = rf.get('is_sran_swap')
        sol = rf.get('swap_solution')
        status = "OK" if is_sran and sol == 'Swap:3G4G' else "FAIL"
        if status == "FAIL": all_ok = False
        print(f"  [{status}] {sid:7s} ({s['site_id']}): is_sran_swap={is_sran} | swap_solution={sol}")

    print("\n" + "=" * 80)
    if all_ok and len(verify_res.data) == len(ALL_TARGET_SITES):
        print(f"🎉 HOÀN TẤT THÀNH CÔNG! Đã cập nhật đủ {len(ALL_TARGET_SITES)} trạm sang SRAN.")
    else:
        print(f"⚠️ Cảnh báo: Có trạm chưa cập nhật thành công ({success_ds}/{len(ALL_TARGET_SITES)}).")
    print("=" * 80)

if __name__ == '__main__':
    main()
