#!/usr/bin/env python3
import os
import sys
from datetime import datetime
from collections import defaultdict
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('tvt3_v2/.env')
url = os.getenv('VITE_SUPABASE_URL')
key = os.getenv('VITE_SUPABASE_ANON_KEY')
sb = create_client(url, key)

def fetch_all(table_name, select_cols, date_col, start_date, end_date):
    records = []
    page = 0
    limit = 1000
    while True:
        query = sb.table(table_name).select(select_cols).gte(date_col, start_date).lte(date_col, end_date)
        res = query.range(page * limit, (page + 1) * limit - 1).execute()
        data = res.data or []
        records.extend(data)
        if len(data) < limit:
            break
        page += 1
    return records

print("📡 Đang tải dữ liệu tháng 9/2026 từ Supabase...")
gen_logs = fetch_all('generator_logs', '*', 'date', '2026-09-01', '2026-09-30')
power_schedules = fetch_all('power_schedule', '*', 'ngay_mat_dien', '2026-09-01', '2026-09-30')
res_sites = sb.table('datasites').select('site_id, site_id_old, name, location_info').execute()
sites = res_sites.data or []

old_to_new = {}
new_to_old = {}
site_info = {}
for s in sites:
    sid = (s.get('site_id') or '').strip().upper()
    sold = (s.get('site_id_old') or '').strip().upper()
    if sid:
        site_info[sid] = s
        if sold:
            site_info[sold] = s
            old_to_new[sold] = sid
            new_to_old[sid] = sold

def get_canonical(sid):
    if not sid: return ''
    u = sid.strip().upper()
    return old_to_new.get(u, u)

def get_display_name(sid):
    if not sid: return ''
    u = sid.strip().upper()
    old = new_to_old.get(u, u)
    new = old_to_new.get(u, u)
    return f"{old} ({new})" if old != new else old

def parse_duration(start_str, end_str):
    try:
        sh, sm = map(int, str(start_str).split(':'))
        eh, em = map(int, str(end_str).split(':'))
        diff = (eh * 60 + em) - (sh * 60 + sm)
        if diff < 0:
            diff += 24 * 60
        return round(diff / 60.0, 2)
    except:
        return 0.0

# 1. Map Power Schedules by (canonical_site, date)
schedules_by_site_date = defaultdict(list)
for ps in power_schedules:
    csid = get_canonical(ps.get('id_tram'))
    pdate = ps.get('ngay_mat_dien')
    if csid and pdate:
        schedules_by_site_date[(csid, pdate)].append(ps)

# 2. Map Generator Logs by (canonical_site, date)
logs_by_site_date = defaultdict(list)
for l in gen_logs:
    csid = get_canonical(l.get('site_id'))
    ldate = l.get('date')
    if csid and ldate:
        logs_by_site_date[(csid, ldate)].append(l)

print(f"\n=======================================================")
print(f"📊 TỔNG QUAN DỮ LIỆU THÁNG 9/2026 (01/09 - 30/09)")
print(f" • Tổng số lượt cúp điện EVN thông báo: {len(power_schedules)} lượt")
print(f" • Tổng số log chạy máy ghi nhận:      {len(gen_logs)} ca chạy")
print(f"=======================================================\n")

# A. CASE 1: LỊCH CÚP ĐIỆN NHƯNG KHÔNG CÓ LOG CHẠY MÁY
sched_no_log = []
for (csid, pdate), ps_list in schedules_by_site_date.items():
    if (csid, pdate) not in logs_by_site_date:
        for ps in ps_list:
            dur = parse_duration(ps.get('thoi_gian_cup_dien'), ps.get('thoi_gian_co_dien'))
            sched_no_log.append({
                'canonical_site': csid,
                'display': get_display_name(csid),
                'date': pdate,
                'start': ps.get('thoi_gian_cup_dien'),
                'end': ps.get('thoi_gian_co_dien'),
                'duration': dur,
                'reason': ps.get('ly_do') or 'Cúp điện EVN',
                'area': ps.get('khu_vuc') or ''
            })

sched_no_log.sort(key=lambda x: (x['duration'], x['date']), reverse=True)

print(f"⚠️ 1. CÓ LỊCH CÚP ĐIỆN NHƯNG KHÔNG CÓ LOG CHẠY MÁY ({len(sched_no_log)} lượt):")
long_sched_no_log = [s for s in sched_no_log if s['duration'] >= 3.0]
short_sched_no_log = [s for s in sched_no_log if s['duration'] < 3.0]
print(f"  - Cúp điện dài (≥ 3h) chưa có log: {len(long_sched_no_log)} lượt (Cần chú ý kiểm tra)")
print(f"  - Cúp điện ngắn (< 3h) không chạy: {len(short_sched_no_log)} lượt (Bình thường do Ắc quy / Pin dự phòng gánh)\n")

if long_sched_no_log:
    print(f"  Chi tiết các đợt cúp điện ≥ 3h không chạy máy:")
    for s in long_sched_no_log:
        print(f"   • {s['display']:20s} | {s['date']} | {s['start']:5s} - {s['end']:5s} ({s['duration']:4.1f}h) | {s['reason']}")

# B. CASE 2: CÓ LOG CHẠY MÁY NHƯNG KHÔNG CÓ LỊCH CÚP ĐIỆN
logs_no_sched = []
for (csid, ldate), l_list in logs_by_site_date.items():
    if (csid, ldate) not in schedules_by_site_date:
        for l in l_list:
            rd = l.get('run_details') or {}
            dur = float(rd.get('thoi_gian_hoat_dong') or 0)
            fuel = float(rd.get('nhien_lieu_tieu_hao') or 0)
            rate = round(fuel / dur, 2) if dur > 0 else 0
            logs_no_sched.append({
                'gen_log_id': l.get('gen_log_id'),
                'canonical_site': csid,
                'display': get_display_name(csid),
                'date': ldate,
                'start': rd.get('gio_bat_dau'),
                'end': rd.get('gio_ket_thuc'),
                'duration': dur,
                'fuel': fuel,
                'rate': rate,
                'status': rd.get('status'),
                'note': rd.get('note') or ''
            })

logs_no_sched.sort(key=lambda x: x['duration'], reverse=True)

print(f"\n⚠️ 2. CÓ LOG CHẠY MÁY NHƯNG KHÔNG CÓ LỊCH CÚP ĐIỆN EVN ({len(logs_no_sched)} ca):")
runs_ge_10h = [l for l in logs_no_sched if l['duration'] >= 10.0]
runs_short = [l for l in logs_no_sched if 0 < l['duration'] < 0.25]
runs_overnight = [l for l in logs_no_sched if l['start'] and l['end'] and (int(str(l['start']).split(':')[0]) >= 18 or int(str(l['end']).split(':')[0]) < int(str(l['start']).split(':')[0]))]
runs_normal = [l for l in logs_no_sched if l not in runs_ge_10h and l not in runs_short]

print(f"  - Ca chạy rất dài (≥ 10h không có EVN): {len(runs_ge_10h)} ca")
print(f"  - Ca chạy thử / siêu ngắn (< 15p):      {len(runs_short)} ca")
print(f"  - Ca chạy qua đêm (sự cố đêm):         {len(runs_overnight)} ca")
print(f"  - Ca sự cố ban ngày thông thường (1-8h):{len(runs_normal)} ca (Mất điện đột xuất/nhảy CB lưới)")

if runs_ge_10h:
    print(f"\n  Chi tiết các ca chạy ≥ 10h không có EVN:")
    for l in runs_ge_10h:
        print(f"   • {l['display']:20s} | {l['date']} | {l['start']:5s} -> {l['end']:5s} | {l['duration']:5.2f}h | {l['fuel']:5.1f}L ({l['rate']}L/h) | Ghi chú: {l['note']}")

# C. RÀ SOÁT CÁC BẤT THƯỜNG KHÁC (ĐỊNH MỨC XĂNG DẦU, THỜI GIAN, TRÙNG LẶP)
print(f"\n=======================================================")
print(f"🔍 3. RÀ SOÁT TOÀN BỘ LOG CHẠY MÁY TÌM DẤU HIỆU BẤT THƯỜNG:")

anomalies = []
for l in gen_logs:
    rd = l.get('run_details') or {}
    dur = float(rd.get('thoi_gian_hoat_dong') or 0)
    fuel = float(rd.get('nhien_lieu_tieu_hao') or 0)
    rate = fuel / dur if dur > 0 else 0
    sid = l.get('site_id')
    csid = get_canonical(sid)
    disp = get_display_name(csid)
    ldate = l.get('date')
    
    # 1. Rate bất thường
    if dur >= 1.0 and (rate > 3.8 or rate < 0.5):
        anomalies.append({
            'type': 'Định mức nhiên liệu bất thường',
            'desc': f"{rate:.2f} L/h (Tiêu thụ {fuel}L / {dur}h)",
            'log': l,
            'disp': disp,
            'date': ldate
        })
    # 2. Thời gian hoạt động = 0
    if dur <= 0:
        anomalies.append({
            'type': 'Thời gian hoạt động bằng 0',
            'desc': f"Bắt đầu {rd.get('gio_bat_dau')} - Kết thúc {rd.get('gio_ket_thuc')}",
            'log': l,
            'disp': disp,
            'date': ldate
        })

print(f"Tổng số bản ghi phát hiện dấu hiệu bất thường: {len(anomalies)}")
for a in anomalies:
    print(f" • [{a['type']}] Trạm {a['disp']} ngày {a['date']}: {a['desc']}")

# D. KIỂM TRA TRÙNG LẶP TRONG CÙNG TRẠM CÙNG NGÀY
print(f"\n🔍 4. KIỂM TRA TRÙNG LẶP (DUPLICATE) TRONG CÙNG TRẠM CÙNG NGÀY:")
dup_count = 0
for (csid, ldate), l_list in logs_by_site_date.items():
    if len(l_list) > 1:
        # Check if times overlap
        times = []
        for l in l_list:
            rd = l.get('run_details') or {}
            times.append(f"{rd.get('gio_bat_dau')}-{rd.get('gio_ket_thuc')} ({rd.get('thoi_gian_hoat_dong')}h)")
        disp = get_display_name(csid)
        print(f" • Trạm {disp} ngày {ldate} có {len(l_list)} ca chạy: {', '.join(times)}")
        dup_count += 1

if dup_count == 0:
    print(" ✅ Không có trạm nào bị trùng lặp ca chạy!")
else:
    print(f" ℹ️ Có {dup_count} ngày trạm chạy nhiều hơn 1 ca (chia ca hoặc mất điện nhiều lần).")
