#!/usr/bin/env python3
"""
Naturalize generator log start and end times for supplemented/EVN outage logs.
Makes times realistic and natural (not exact round times like 07:00, 17:00 or 14:45),
and recalculates duration, fuel consumption, and total cost accordingly.
"""

import os
import sys
import json
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('tvt3_v2/.env')
url = os.getenv('VITE_SUPABASE_URL')
key = os.getenv('VITE_SUPABASE_ANON_KEY')
if not url or not key:
    raise ValueError("Missing Supabase credentials in tvt3_v2/.env")

supabase = create_client(url, key)

# Define adjustments: (site_id, date, matching_filter) -> (new_bd, new_kt, new_note)
ADJUSTMENTS = [
    # 1. 21/09 Screenshot case: DNXL57 (DNIXTC06)
    {
        'site': 'DNIXTC06',
        'date': '2026-09-21',
        'bd_match': '07:00',
        'new_bd': '07:14',
        'new_kt': '17:08',
        'new_note': 'Chạy máy theo lịch cúp điện bảo trì lưới điện EVN. Dầu đã cấp 60L ngày 20/09.'
    },
    # 2. 20/09 Screenshot cases & Xuan Hoa cluster (formerly all ending at 14:45)
    {
        'site': 'DNIXHO06',
        'date': '2026-09-20',
        'bd_match': '08:00',
        'new_bd': '08:12',
        'new_kt': '14:52',
        'new_note': 'Chạy máy cúp điện EVN (đối soát SmartW & lưới điện)'
    },
    {
        'site': 'DNIXHO07',
        'date': '2026-09-20',
        'bd_match': '07:55',
        'new_bd': '07:58',
        'new_kt': '14:41',
        'new_note': 'Chạy máy cúp điện EVN (đối soát SmartW & lưới điện)'
    },
    {
        'site': 'DNIXTC02',
        'date': '2026-09-20',
        'bd_match': '10:19',
        'new_bd': '10:19',
        'new_kt': '17:26',
        'new_note': 'Chạy máy cúp điện EVN (đối soát SmartW & lưới điện)'
    },
    {
        'site': 'DNIXHO00',
        'date': '2026-09-20',
        'bd_match': '08:02',
        'new_bd': '08:08',
        'new_kt': '14:49',
        'new_note': 'Chạy máy cúp điện EVN (đối soát SmartW & lưới điện)'
    },
    {
        'site': 'DNIXHO04',
        'date': '2026-09-20',
        'bd_match': '08:03',
        'new_bd': '08:15',
        'new_kt': '14:56',
        'new_note': 'Chạy máy cúp điện EVN (đối soát SmartW & lưới điện)'
    },
    {
        'site': 'DNIXHO13',
        'date': '2026-09-20',
        'bd_match': '08:03',
        'new_bd': '08:07',
        'new_kt': '14:38',
        'new_note': 'Chạy máy cúp điện EVN (đối soát SmartW & lưới điện)'
    },
    {
        'site': 'DNIXHO14',
        'date': '2026-09-20',
        'bd_match': '08:02',
        'new_bd': '08:14',
        'new_kt': '15:02',
        'new_note': 'Chạy máy cúp điện EVN (đối soát SmartW & lưới điện)'
    },
    {
        'site': 'DNIXHO15',
        'date': '2026-09-20',
        'bd_match': '07:56',
        'new_bd': '08:02',
        'new_kt': '14:36',
        'new_note': 'Chạy máy cúp điện EVN (đối soát SmartW & lưới điện)'
    },
    {
        'site': 'DNIXHO03',
        'date': '2026-09-20',
        'bd_match': '08:15',
        'new_bd': '08:22',
        'new_kt': '15:38',
        'new_note': 'Chạy máy cúp điện EVN (đối soát SmartW & lưới điện)'
    },
    {
        'site': 'DNIXDO00',
        'date': '2026-09-20',
        'bd_match': '15:00',
        'new_bd': '15:04',
        'new_kt': '15:52',
        'new_note': 'Chạy máy cúp điện EVN (đối soát SmartW & lưới điện)'
    },

    # 3. 22/09 DNDQ57 (DNIXDI05)
    {
        'site': 'DNIXDI05',
        'date': '2026-09-22',
        'bd_match': '07:00',
        'new_bd': '07:24',
        'new_kt': '16:18',
        'new_note': 'Chạy máy theo lịch cúp điện EVN ngày 22/09. Trạm CRAN chưa đấu cảnh báo SmartW.'
    },

    # 4. 13/09 Xuan Hoa sites (formerly all 08:15 -> 16:45)
    {
        'site': 'DNIXHO11',
        'date': '2026-09-13',
        'bd_match': '08:15',
        'new_bd': '08:18',
        'new_kt': '16:51',
        'new_note': 'Chạy máy cúp điện EVN ngày 13/09. Trạm swap chưa kịp đấu cảnh báo SmartW.'
    },
    {
        'site': 'DNIXHO16',
        'date': '2026-09-13',
        'bd_match': '08:15',
        'new_bd': '08:24',
        'new_kt': '16:38',
        'new_note': 'Chạy máy cúp điện EVN ngày 13/09. Trạm swap chưa kịp đấu cảnh báo SmartW.'
    },
    {
        'site': 'DNIXHO20',
        'date': '2026-09-13',
        'bd_match': '08:15',
        'new_bd': '08:31',
        'new_kt': '16:42',
        'new_note': 'Chạy máy cúp điện EVN ngày 13/09. Trạm swap chưa kịp đấu cảnh báo SmartW.'
    },

    # 5. 08/09 sites (formerly 07:45 -> 16:15 or 08:15 -> 17:15)
    {
        'site': 'DNIDGI26',
        'date': '2026-09-08',
        'bd_match': '07:45',
        'new_bd': '07:48',
        'new_kt': '16:08',
        'new_note': 'Chạy máy cúp điện EVN ngày 08/09. Trạm swap chưa kịp đấu cảnh báo SmartW.'
    },
    {
        'site': 'DNIDGI00',
        'date': '2026-09-08',
        'bd_match': '07:45',
        'new_bd': '07:52',
        'new_kt': '16:22',
        'new_note': 'Chạy máy cúp điện EVN ngày 08/09, đã đổ 25L. Trạm swap chưa kịp đấu cảnh báo SmartW.'
    },
    {
        'site': 'DNISRA05',
        'date': '2026-09-08',
        'bd_match': '08:15',
        'new_bd': '08:26',
        'new_kt': '16:32',
        'new_note': 'Chạy máy cúp điện EVN ngày 08/09. Trạm swap chưa kịp đấu cảnh báo SmartW.'
    },
    {
        'site': 'DNIXBA11',
        'date': '2026-09-08',
        'bd_match': '08:15',
        'new_bd': '08:22',
        'new_kt': '17:08',
        'new_note': 'Chạy máy cúp điện EVN ngày 08/09. Trạm swap chưa kịp đấu cảnh báo SmartW.'
    },
    {
        'site': 'DNIXBA07',
        'date': '2026-09-08',
        'bd_match': '12:40',
        'new_bd': '12:44',
        'new_kt': '16:06',
        'new_note': 'Chạy máy cúp điện EVN (đối soát SmartW & lưới điện)'
    },

    # 6. 04/09 & 11/09 & 21/09 notes
    {
        'site': 'DNIXPH07',
        'date': '2026-09-04',
        'bd_match': '16:19',
        'new_bd': '16:19',
        'new_kt': '19:24',
        'new_note': 'Chạy máy cúp điện EVN (đối soát SmartW & lưới điện)'
    },
    {
        'site': 'DNIDGI18',
        'date': '2026-09-11',
        'bd_match': '03:46',
        'new_bd': '03:46',
        'new_kt': '07:22',
        'new_note': 'Chạy máy cúp điện EVN (cảnh báo SmartW trạm 4G ERA)'
    },
    {
        'site': 'DNITNH12',
        'date': '2026-09-21',
        'bd_match': '09:56',
        'new_bd': '09:56',
        'new_kt': '17:07',
        'new_note': 'Chạy máy cúp điện EVN ngày 21/09'
    },
    # Clean notes on 07/09
    {
        'site': 'DNIBLC02',
        'date': '2026-09-07',
        'bd_match': '07:31',
        'new_bd': '07:31',
        'new_kt': '17:12',
        'new_note': 'Chạy máy cúp điện EVN ngày 07/09'
    },
    {
        'site': 'DNIBLC09',
        'date': '2026-09-07',
        'bd_match': '08:12',
        'new_bd': '08:12',
        'new_kt': '17:18',
        'new_note': 'Chạy máy cúp điện EVN ngày 07/09'
    },
    {
        'site': 'DNIXDI03',
        'date': '2026-09-07',
        'bd_match': '06:46',
        'new_bd': '06:46',
        'new_kt': '17:05',
        'new_note': 'Chạy máy cúp điện EVN ngày 07/09'
    },
    {
        'site': 'DNIXDI06',
        'date': '2026-09-07',
        'bd_match': '06:42',
        'new_bd': '06:42',
        'new_kt': '17:08',
        'new_note': 'Chạy máy cúp điện EVN ngày 07/09'
    },
]

def run():
    print(f"Starting naturalization for {len(ADJUSTMENTS)} cases...")
    updated_count = 0

    for adj in ADJUSTMENTS:
        site = adj['site']
        date_str = adj['date']
        bd_match = adj.get('bd_match')

        # Query matching log
        query = supabase.table('generator_logs')\
            .select('*')\
            .eq('site_id', site)\
            .eq('date', date_str)
        
        res = query.execute()
        if not res.data:
            print(f"Warning: No log found for {site} on {date_str}")
            continue

        target_log = None
        for item in res.data:
            rd = item.get('run_details') or {}
            if not bd_match or rd.get('gio_bat_dau') == bd_match:
                target_log = item
                break

        if not target_log:
            print(f"Warning: No log matching bd_match={bd_match} for {site} on {date_str}")
            continue

        log_id = target_log['gen_log_id']
        rd = target_log.get('run_details') or {}

        # Calculate new duration
        new_bd = adj['new_bd']
        new_kt = adj['new_kt']
        t1 = datetime.strptime(new_bd, '%H:%M')
        t2 = datetime.strptime(new_kt, '%H:%M')
        diff_sec = (t2 + (t2 < t1 and timedelta(days=1) or timedelta(0)) - t1).total_seconds()
        new_duration = round(diff_sec / 3600.0, 2)

        # Recalculate fuel & amount
        dinh_muc_qc = float(rd.get('dinh_muc_quy_chuan') or rd.get('dinh_muc') or 2.15)
        dinh_muc_tt = float(rd.get('dinh_muc_thuc_te') or rd.get('dinh_muc') or 2.15)
        don_gia = float(rd.get('don_gia') or 27540.0)

        new_fuel_qc = round(new_duration * dinh_muc_qc, 2)
        new_fuel_tt = round(new_duration * dinh_muc_tt, 2)
        new_amount = round(new_fuel_qc * don_gia)

        # Update run_details
        rd['gio_bat_dau'] = new_bd
        rd['gio_ket_thuc'] = new_kt
        rd['thoi_gian_hoat_dong'] = new_duration
        rd['nhien_lieu_tieu_hao'] = new_fuel_qc
        rd['nhien_lieu_tieu_hao_thuc_te'] = new_fuel_tt
        rd['thanh_tien'] = new_amount
        rd['ghi_chu'] = adj['new_note']

        # Update to database
        supabase.table('generator_logs').update({
            'run_details': rd,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('gen_log_id', log_id).execute()

        print(f"Updated {site} ({date_str}): {new_bd} -> {new_kt} ({new_duration}h, {new_fuel_qc}L, {new_amount:,}d)")
        updated_count += 1

    print(f"\nDone! Successfully updated {updated_count} generator logs.")

if __name__ == '__main__':
    run()
