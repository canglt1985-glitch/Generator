#!/usr/bin/env python3
"""
Import verified generator logs for events where there was an EVN power outage >= 4 hours (power_schedule)
and an actual generator running alarm on SmartW (smartw_alarms) that was not yet recorded in generator_logs.
"""

import os
import sys
import json
import argparse
from datetime import datetime, timedelta, timezone
from collections import defaultdict

backend_dir = os.path.abspath('backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from dotenv import load_dotenv
from supabase import create_client

load_dotenv('tvt3_v2/.env')
url = os.getenv('VITE_SUPABASE_URL')
key = os.getenv('VITE_SUPABASE_ANON_KEY')
if not url or not key:
    raise ValueError("Missing Supabase credentials in tvt3_v2/.env")

supabase = create_client(url, key)
tz_vn = timezone(timedelta(hours=7))

from smartw.mfd_import import get_station_info, get_pretax_price, classify_event

def resolve_site_proper(code, code_map):
    if not code:
        return ''
    c = code.strip().upper()
    if c in code_map:
        return code_map[c]
    for suf in ['UL', '_4G', '-4G', 'L', 'N']:
        if c.endswith(suf):
            stripped = c[:-len(suf)]
            if stripped in code_map:
                return code_map[stripped]
    for k in code_map:
        if c == k:
            return code_map[k]
    return c

def to_min(t_str):
    if not t_str:
        return 0
    p = t_str.split(':')
    return int(p[0]) * 60 + int(p[1])

def calc_outage_h(st, et):
    try:
        t1 = datetime.strptime(st.strip(), '%H:%M')
        t2 = datetime.strptime(et.strip(), '%H:%M')
        diff = (t2 + timedelta(days=1) - t1).total_seconds() if t2 < t1 else (t2 - t1).total_seconds()
        return round(diff / 3600.0, 2)
    except:
        return 0.0

def fetch_all_logs(month=9, year=2026):
    all_logs = []
    page = 0
    start_d = f"{year:04d}-{month:02d}-01"
    end_d = f"{year:04d}-{month:02d}-30"
    while True:
        res = supabase.table('generator_logs').select('*')\
            .gte('date', start_d)\
            .lte('date', end_d)\
            .range(page * 1000, (page + 1) * 1000 - 1)\
            .execute()
        d = res.data or []
        all_logs.extend(d)
        if len(d) < 1000:
            break
        page += 1
    return all_logs

def run_import(apply=False, min_outage_hours=4.0):
    print("=" * 80)
    print(f"🚀 BẮT ĐẦU RÀ SOÁT & NHẬP LOG CHẠY MÁY CHO CÁC ĐỢT CÚP ĐIỆN DÀI >= {min_outage_hours}H (THÁNG 09/2026)")
    print("=" * 80)

    # 1. Fetch datasites
    res_sites = supabase.table('datasites').select('site_id, site_id_old, infrastructure_info').execute()
    datasites = res_sites.data or []
    code_map = {}
    for s in datasites:
        s_new = (s.get('site_id') or '').strip().upper()
        s_old = (s.get('site_id_old') or '').strip().upper()
        if s_new:
            code_map[s_new] = s_new
        if s_old:
            code_map[s_old] = s_new

    # 2. Existing logs
    existing_logs = fetch_all_logs()
    print(f"📦 Số log chạy máy hiện có trong tháng 9: {len(existing_logs)}")

    existing_intervals = defaultdict(list)
    for g in existing_logs:
        s = resolve_site_proper(g.get('site_id'), code_map)
        dt = g.get('date')
        rd = g.get('run_details') or {}
        st = rd.get('gio_bat_dau')
        et = rd.get('gio_ket_thuc')
        if st and et:
            sm = to_min(st)
            em = to_min(et)
            if em < sm:
                em += 1440
            existing_intervals[(s, dt)].append((sm, em))

    # 3. Power schedules >= min_outage_hours
    res_ps = supabase.table('power_schedule').select('*').gte('ngay_mat_dien', '2026-09-01').lte('ngay_mat_dien', '2026-09-30').execute()
    schedules = res_ps.data or []

    candidates = []
    for ps in schedules:
        st_evn = ps.get('thoi_gian_cup_dien') or ''
        et_evn = ps.get('thoi_gian_co_dien') or ''
        o_h = calc_outage_h(st_evn, et_evn)
        if o_h < min_outage_hours:
            continue

        raw_tram = ps.get('id_tram')
        site_id = resolve_site_proper(raw_tram, code_map)
        o_date = ps.get('ngay_mat_dien')

        res_sw = supabase.table('smartw_alarms').select('*')\
            .ilike('site', f'{site_id}%')\
            .gte('sdate', f'{o_date}T00:00:00')\
            .lte('sdate', f'{o_date}T23:59:59')\
            .execute()
        alarms = res_sw.data or []

        for a in alarms:
            atype = (a.get('alarm_type') or '').lower()
            aname = (a.get('alarm_name') or '').lower()
            ainfo = (a.get('alarm_info') or '').lower()

            is_gen = (atype == 'mpd') or ('generat' in aname) or ('generat' in ainfo) or ('máy phát' in aname)
            if not is_gen:
                continue

            sdate_raw = a.get('sdate')
            edate_raw = a.get('edate')
            if not sdate_raw or not edate_raw:
                continue

            try:
                dt_start = datetime.fromisoformat(sdate_raw.replace('Z', '+00:00')).astimezone(tz_vn)
                dt_end = datetime.fromisoformat(edate_raw.replace('Z', '+00:00')).astimezone(tz_vn)
            except:
                continue

            dur_min = int((dt_end - dt_start).total_seconds() / 60)
            hours = round(dur_min / 60.0, 2)
            if dur_min < 10:
                continue

            vn_date = dt_start.strftime('%Y-%m-%d')
            vn_st = dt_start.strftime('%H:%M')
            vn_et = dt_end.strftime('%H:%M')

            sm = dt_start.hour * 60 + dt_start.minute
            em = sm + dur_min

            # Check if covered by existing logs
            covered = False
            for (e_sm, e_em) in existing_intervals.get((site_id, vn_date), []):
                if not (em <= e_sm + 15 or sm >= e_em - 15):
                    covered = True
                    break

            if not covered:
                alarm_id = f"{a.get('site')}__{dt_start.strftime('%d/%m/%Y %H:%M:%S')}"
                candidates.append({
                    'site_id': site_id,
                    'raw_site': a.get('site'),
                    'date': vn_date,
                    'dt_start': dt_start,
                    'dt_end': dt_end,
                    'gio_bd': vn_st,
                    'gio_kt': vn_et,
                    'hours': hours,
                    'dur_min': dur_min,
                    'alarm_id': alarm_id,
                    'alarm_name': a.get('alarm_name'),
                    'alarm_info': a.get('alarm_info'),
                    'evn_time': f"{st_evn} - {et_evn}",
                    'evn_hours': o_h,
                    'evn_reason': ps.get('ly_do')
                })

    # Deduplicate & merge overlapping candidate intervals
    by_site_dt = defaultdict(list)
    for c in candidates:
        by_site_dt[(c['site_id'], c['date'])].append(c)

    final_candidates = []
    for (s, dt), items in by_site_dt.items():
        if len(items) == 1:
            final_candidates.append(items[0])
        else:
            items.sort(key=lambda x: x['dt_start'])
            merged = []
            for curr in items:
                if not merged:
                    merged.append(curr)
                else:
                    prev = merged[-1]
                    # Overlap or contiguous within 15 mins
                    if curr['dt_start'] < prev['dt_end'] + timedelta(minutes=15):
                        if curr['dt_end'] > prev['dt_end']:
                            prev['dt_end'] = curr['dt_end']
                            prev['gio_kt'] = curr['gio_kt']
                            prev['dur_min'] = int((prev['dt_end'] - prev['dt_start']).total_seconds() / 60)
                            prev['hours'] = round(prev['dur_min'] / 60.0, 2)
                    else:
                        merged.append(curr)
            final_candidates.extend(merged)

    final_candidates.sort(key=lambda x: (x['date'], x['site_id'], x['gio_bd']))
    print(f"\n📋 Xác định được {len(final_candidates)} ca chạy máy khớp đợt cúp điện >= {min_outage_hours}h cần bổ sung:\n")

    records_to_insert = []
    total_fuel = 0.0
    total_cost = 0

    for i, c in enumerate(final_candidates, 1):
        site_id = c['site_id']
        date_str = c['date']
        info = get_station_info(site_id, date_str) or {}

        dm = float(info.get('dinh_muc_quy_chuan') or info.get('dinh_muc') or 3.0)
        dm_thuc_te = float(info.get('dinh_muc_thuc_te') or dm)
        fuel_type = info.get('loai_nhien_lieu') or 'Dầu'
        may = info.get('loai_may') or 'MLĐ'
        cong_suat = info.get('cong_suat_may') or ''
        price = get_pretax_price(fuel_type, date_str)
        tieu_hao = round(c['hours'] * dm, 2)
        tieu_hao_thuc_te = round(c['hours'] * dm_thuc_te, 2)
        thanh_tien = round(tieu_hao * price)
        status = classify_event(c['dt_start'], c['dt_end'], c['dur_min'])

        total_fuel += tieu_hao
        total_cost += thanh_tien

        is_overnight = c['dt_end'].date() > c['dt_start'].date() or c['gio_kt'] < c['gio_bd']
        ghi_chu_parts = ["Bổ sung từ cảnh báo SmartW & lịch cúp điện EVN"]
        if is_overnight:
            ghi_chu_parts.append("(Chạy qua đêm)")

        run_details = {
            "gio_bat_dau": c['gio_bd'],
            "gio_ket_thuc": c['gio_kt'],
            "thoi_gian_hoat_dong": c['hours'],
            "nhien_lieu_tieu_hao": tieu_hao,
            "nhien_lieu_tieu_hao_thuc_te": tieu_hao_thuc_te,
            "don_gia": price,
            "thanh_tien": thanh_tien,
            "ghi_chu": " ".join(ghi_chu_parts),
            "loai_may": may,
            "cong_suat_may": cong_suat,
            "dinh_muc": dm,
            "dinh_muc_quy_chuan": dm,
            "dinh_muc_thuc_te": dm_thuc_te,
            "nhien_lieu_loai": fuel_type,
            "status": status,
            "source": "smartw_supplement",
            "smartw_alarm_id": c['alarm_id']
        }

        print(f"{i:2d}. Trạm {site_id:10s} | Ngày {date_str} | Chạy: {c['gio_bd']} -> {c['gio_kt']} ({c['hours']:5.2f}h) | Cúp EVN: {c['evn_time']} ({c['evn_hours']}h) | {may:15s} | {fuel_type:4s} | DM: {dm:4.2f} | Tiêu hao: {tieu_hao:5.2f}L | {thanh_tien:9,d}đ | Status: {status}")

        records_to_insert.append({
            "site_id": site_id,
            "date": date_str,
            "run_details": run_details
        })

    print("-" * 80)
    print(f"📊 TỔNG CỘNG: {len(records_to_insert)} ca | Tổng tiêu hao: {total_fuel:.2f}L | Tổng chi phí: {total_cost:,.0f} VND")
    print("-" * 80)

    if not apply:
        print("\n⚠️ Chế độ DRY-RUN (Xem trước). Chạy với flag `--apply` để chính thức chèn vào Supabase.")
        return

    # Backup
    backup_file = f"scratch/backup_generator_logs_before_import_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    os.makedirs(os.path.dirname(backup_file), exist_ok=True)
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(existing_logs, f, ensure_ascii=False, indent=2, default=str)
    print(f"\n💾 Đã sao lưu dữ liệu generator_logs hiện tại tại: {backup_file}")

    # Insert into Supabase
    inserted_count = 0
    chunk_size = 10
    for idx in range(0, len(records_to_insert), chunk_size):
        chunk = records_to_insert[idx:idx + chunk_size]
        res = supabase.table("generator_logs").insert(chunk).execute()
        if res.data:
            inserted_count += len(res.data)
            print(f"  ✅ Đã chèn {inserted_count}/{len(records_to_insert)} bản ghi...")
        else:
            print(f"  ❌ Lỗi khi chèn chunk {idx} - {idx + chunk_size}")

    print(f"\n🎉 HOÀN TẤT: Đã bổ sung thành công {inserted_count} bản ghi log chạy máy vào bảng generator_logs!")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Import verified generator runs matching long EVN outages (>=4h) and SmartW alarms.")
    parser.add_argument('--apply', action='store_true', help="Execute insert into Supabase")
    parser.add_argument('--min-hours', type=float, default=4.0, help="Minimum outage duration in hours (default: 4.0)")
    args = parser.parse_args()
    run_import(apply=args.apply, min_outage_hours=args.min_hours)
