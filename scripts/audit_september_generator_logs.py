import os
import json
from datetime import datetime, timedelta, time
from collections import defaultdict
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('tvt3_v2/.env')
url = os.getenv('VITE_SUPABASE_URL')
key = os.getenv('VITE_SUPABASE_ANON_KEY')
supabase = create_client(url, key)

def fetch_all(table_name, select_cols, date_col, start_date, end_date):
    records = []
    page = 0
    limit = 1000
    while True:
        query = supabase.table(table_name).select(select_cols).gte(date_col, start_date).lte(date_col, end_date)
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
smartw_alarms = fetch_all('smartw_alarms', '*', 'sdate', '2026-09-01T00:00:00', '2026-09-30T23:59:59')
fuel_txs = fetch_all('fuel_and_expenses', '*', 'date', '2026-09-01', '2026-09-30')

# Fetch datasites mapping
res_sites = supabase.table('datasites').select('site_id, site_id_old, name').execute()
site_map = {}
old_to_new = {}
for s in (res_sites.data or []):
    sid = s.get('site_id')
    sold = s.get('site_id_old')
    if sid:
        sid_u = sid.strip().upper()
        site_map[sid_u] = s
        if sold:
            sold_u = sold.strip().upper()
            site_map[sold_u] = s
            old_to_new[sold_u] = sid_u

def get_canonical_id(s_id):
    if not s_id: return ''
    u = s_id.strip().upper()
    return old_to_new.get(u, u)

print(f"✅ Tải thành công: {len(gen_logs)} log chạy máy, {len(power_schedules)} lịch cúp điện, {len(smartw_alarms)} cảnh báo SmartW, {len(fuel_txs)} GD nhiên liệu.")

# Parse helper
def parse_time(t_str):
    if not t_str: return None
    try:
        parts = t_str.strip().split(':')
        h = int(parts[0])
        m = int(parts[1]) if len(parts) > 1 else 0
        s = int(parts[2]) if len(parts) > 2 else 0
        return h * 60 + m + (s / 60.0)
    except:
        return None

# AUDIT 1: TRÙNG LẶP TIẾN TRÌNH / DUPLICATE LOGS & TIMEZONE SHIFT
duplicates = []
by_site_date = defaultdict(list)
for l in gen_logs:
    cid = get_canonical_id(l.get('site_id'))
    by_site_date[(cid, l.get('date'))].append(l)

for (cid, dt), logs in by_site_date.items():
    if len(logs) > 1:
        # Check pairwise
        for i in range(len(logs)):
            for j in range(i + 1, len(logs)):
                l1 = logs[i]
                l2 = logs[j]
                rd1 = l1.get('run_details') or {}
                rd2 = l2.get('run_details') or {}
                
                h1 = float(rd1.get('thoi_gian_hoat_dong') or 0)
                h2 = float(rd2.get('thoi_gian_hoat_dong') or 0)
                s1 = rd1.get('gio_bat_dau')
                s2 = rd2.get('gio_bat_dau')
                e1 = rd1.get('gio_ket_thuc')
                e2 = rd2.get('gio_ket_thuc')

                # Check exact duration match or very close (within 0.2h)
                close_dur = abs(h1 - h2) < 0.2 and h1 > 0
                
                # Check timezone shift (7 hours difference)
                t1 = parse_time(s1)
                t2 = parse_time(s2)
                tz_shift = False
                if t1 is not None and t2 is not None:
                    diff_t = abs(t1 - t2)
                    if abs(diff_t - 420) < 15 or abs(diff_t - 1020) < 15: # 7h = 420m
                        tz_shift = True
                
                # Check exact start time
                exact_start = (s1 == s2 and s1 is not None)

                if exact_start or (close_dur and tz_shift) or (close_dur and rd1.get('loai_may') == rd2.get('loai_may')):
                    reason = "Trùng lặp chính xác giờ & thời lượng" if exact_start else ("Lệch múi giờ UTC/GMT+7 (7 giờ)" if tz_shift else "Trùng lặp thời lượng & máy phát")
                    duplicates.append({
                        'site_id': cid,
                        'date': dt,
                        'log1_id': l1.get('gen_log_id'),
                        'log2_id': l2.get('gen_log_id'),
                        'run1': f"{s1} - {e1} ({h1}h, {rd1.get('nhien_lieu_tieu_hao')}L)",
                        'run2': f"{s2} - {e2} ({h2}h, {rd2.get('nhien_lieu_tieu_hao')}L)",
                        'smartw_id1': rd1.get('smartw_alarm_id'),
                        'smartw_id2': rd2.get('smartw_alarm_id'),
                        'reason': reason
                    })

# AUDIT 2: GIỜ CHẠY MÁY BẤT THƯỜNG (Quá dài, Quá ngắn, Giờ âm/lỗi)
long_runs = [] # >= 8h
short_runs = [] # < 0.17h (dưới 10p)
invalid_times = [] # Giờ kết thúc < bắt đầu mà không có chạy qua đêm, hoặc thời lượng tính sai
fuel_discrepancies = [] # Tiêu hao nhiên liệu lệch định mức > 15% hoặc dinh_muc = 0

for l in gen_logs:
    cid = get_canonical_id(l.get('site_id'))
    dt = l.get('date')
    rd = l.get('run_details') or {}
    
    h = float(rd.get('thoi_gian_hoat_dong') or 0)
    s = rd.get('gio_bat_dau')
    e = rd.get('gio_ket_thuc')
    fuel = float(rd.get('nhien_lieu_tieu_hao') or 0)
    quota = float(rd.get('dinh_muc') or rd.get('dinh_muc_thuc_te') or 0)
    note = rd.get('ghi_chu') or ''
    loai_may = rd.get('loai_may') or ''

    # 1. Chạy quá dài (>= 8h)
    if h >= 8.0:
        long_runs.append({
            'site_id': cid,
            'date': dt,
            'hours': h,
            'time_range': f"{s} - {e}",
            'fuel': fuel,
            'quota': quota,
            'loai_may': loai_may,
            'note': note,
            'log_id': l.get('gen_log_id')
        })

    # 2. Chạy siêu ngắn (< 10 phút)
    if 0 < h < 0.17: # < 10 phút
        short_runs.append({
            'site_id': cid,
            'date': dt,
            'hours': h,
            'time_range': f"{s} - {e}",
            'fuel': fuel,
            'loai_may': loai_may,
            'log_id': l.get('gen_log_id')
        })

    # 3. Giờ bắt đầu/kết thúc vô lý
    t_start = parse_time(s)
    t_end = parse_time(e)
    if t_start is not None and t_end is not None:
        if t_end < t_start and "qua đêm" not in note.lower() and "qua dem" not in note.lower():
            calc_h = (t_end + 1440 - t_start) / 60.0
            invalid_times.append({
                'site_id': cid,
                'date': dt,
                'time_range': f"{s} - {e}",
                'hours': h,
                'calc_hours': round(calc_h, 2),
                'issue': 'Giờ kết thúc < giờ bắt đầu (thiếu ghi chú Chạy qua đêm hoặc đảo ngược giờ)',
                'log_id': l.get('gen_log_id')
            })
        elif t_end > t_start:
            calc_h = (t_end - t_start) / 60.0
            if abs(calc_h - h) > 0.2:
                invalid_times.append({
                    'site_id': cid,
                    'date': dt,
                    'time_range': f"{s} - {e}",
                    'hours': h,
                    'calc_hours': round(calc_h, 2),
                    'issue': f'Thời lượng khai báo ({h}h) lệch so với khoảng giờ ({round(calc_h, 2)}h)',
                    'log_id': l.get('gen_log_id')
                })

    # 4. Nhiên liệu / Định mức
    if quota <= 0 and h > 0:
        fuel_discrepancies.append({
            'site_id': cid,
            'date': dt,
            'issue': 'Định mức trạm bằng 0 hoặc chưa khai báo',
            'hours': h,
            'fuel': fuel,
            'quota': quota,
            'log_id': l.get('gen_log_id')
        })
    elif h > 0 and fuel <= 0:
        fuel_discrepancies.append({
            'site_id': cid,
            'date': dt,
            'issue': 'Có chạy máy nhưng tiêu hao nhiên liệu = 0',
            'hours': h,
            'fuel': fuel,
            'quota': quota,
            'log_id': l.get('gen_log_id')
        })

# AUDIT 3: OVERLAPPING RUNS (Cùng trạm bị trùng giờ trong ngày)
overlapping_runs = []
for (cid, dt), logs in by_site_date.items():
    if len(logs) > 1:
        time_intervals = []
        for l in logs:
            rd = l.get('run_details') or {}
            s = parse_time(rd.get('gio_bat_dau'))
            e = parse_time(rd.get('gio_ket_thuc'))
            if s is not None and e is not None:
                if e < s: e += 1440 # overnight
                time_intervals.append((s, e, l))
        
        for i in range(len(time_intervals)):
            for j in range(i + 1, len(time_intervals)):
                s1, e1, l1 = time_intervals[i]
                s2, e2, l2 = time_intervals[j]
                # Check overlap: max(s1, s2) < min(e1, e2)
                if max(s1, s2) < min(e1, e2) - 5: # overlap > 5 mins
                    rd1 = l1.get('run_details') or {}
                    rd2 = l2.get('run_details') or {}
                    overlapping_runs.append({
                        'site_id': cid,
                        'date': dt,
                        'run1': f"{rd1.get('gio_bat_dau')} - {rd1.get('gio_ket_thuc')} ({rd1.get('thoi_gian_hoat_dong')}h)",
                        'run2': f"{rd2.get('gio_bat_dau')} - {rd2.get('gio_ket_thuc')} ({rd2.get('thoi_gian_hoat_dong')}h)",
                        'log1_id': l1.get('gen_log_id'),
                        'log2_id': l2.get('gen_log_id')
                    })

os.makedirs('scratch', exist_ok=True)
report = {
    'total_logs': len(gen_logs),
    'duplicates_count': len(duplicates),
    'duplicates': duplicates,
    'long_runs_count': len(long_runs),
    'long_runs': sorted(long_runs, key=lambda x: x['hours'], reverse=True),
    'short_runs_count': len(short_runs),
    'short_runs': short_runs,
    'invalid_times_count': len(invalid_times),
    'invalid_times': invalid_times,
    'overlapping_runs_count': len(overlapping_runs),
    'overlapping_runs': overlapping_runs,
    'fuel_discrepancies_count': len(fuel_discrepancies),
    'fuel_discrepancies': fuel_discrepancies
}

with open('scratch/september_audit_report.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, ensure_ascii=False, indent=2)

print("\n================= KẾT QUẢ RÀ SOÁT LOG THÁNG 9/2026 =================")
print(f"Tổng số bản ghi log chạy máy: {len(gen_logs)}")
print(f"1. Số cặp log bị TRÙNG LẶP / LỆCH MÚI GIỜ (UTC vs GMT+7): {len(duplicates)}")
print(f"2. Số lượt chạy máy BẤT THƯỜNG KÉO DÀI (>= 8 giờ): {len(long_runs)}")
print(f"3. Số lượt chạy máy SIÊU NGẮN (< 10 phút): {len(short_runs)}")
print(f"4. Số lượt giờ kết thúc/bắt đầu BẤT HỢP LÝ / LỆCH THỜI LƯỢNG: {len(invalid_times)}")
print(f"5. Số cặp log bị TRÙNG LẤN KHUNG GIỜ NHAU: {len(overlapping_runs)}")
print(f"6. Số bản ghi NHIÊN LIỆU / ĐỊNH MỨC BẤT THƯỜNG: {len(fuel_discrepancies)}")
print("=====================================================================")
