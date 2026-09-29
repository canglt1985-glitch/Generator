#!/usr/bin/env python3
import os
import json
from datetime import datetime, timedelta
from collections import defaultdict
from dotenv import load_dotenv
from supabase import create_client

# 1. Connect to Supabase
load_dotenv('tvt3_v2/.env')
url = os.getenv('VITE_SUPABASE_URL')
key = os.getenv('VITE_SUPABASE_ANON_KEY')

if not url or not key:
    raise ValueError("Thiếu biến môi trường Supabase trong tvt3_v2/.env")

supabase = create_client(url, key)
print("🚀 Bắt đầu chuẩn hóa dữ liệu log máy phát điện tháng 08/2026...")

# 2. Load all August logs
res_aug = supabase.table('generator_logs').select('*').gte('date', '2026-08-01').lte('date', '2026-08-31').execute()
logs_aug = res_aug.data or []
print(f"📦 Đã tải {len(logs_aug)} logs tháng 8 từ Supabase.")

# 3. Create full backup before any modification
timestamp_str = datetime.now().strftime('%Y%m%d_%H%M%S')
backup_filename = f"backend/backup_generator_logs_august_{timestamp_str}.json"
os.makedirs(os.path.dirname(backup_filename), exist_ok=True)
with open(backup_filename, 'w', encoding='utf-8') as f:
    json.dump(logs_aug, f, ensure_ascii=False, indent=2, default=str)
print(f"💾 Đã sao lưu dữ liệu gốc an toàn tại: {backup_filename}")

# Helper: parse alarm timestamp
def parse_alarm(alarm_id):
    if not alarm_id or '__' not in alarm_id:
        return None, None
    site, ts_str = alarm_id.split('__', 1)
    for fmt in [
        '%d/%m/%Y %H:%M:%S',
        '%d/%m/%Y %H:%M',
        '%b %d, %Y %I:%M:%S %p',
        '%b %d, %Y %I:%M %p',
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%d %H:%M'
    ]:
        try:
            return site.strip().upper(), datetime.strptime(ts_str.strip(), fmt)
        except:
            pass
    return site.strip().upper(), None

def is_utc_record(log):
    rd = log.get('run_details') or {}
    start_t = rd.get('gio_bat_dau', '')
    aid = rd.get('smartw_alarm_id', '')
    site, adt = parse_alarm(aid)
    if not adt or not start_t or ':' not in start_t:
        return False
    sh, sm = map(int, start_t.split(':')[:2])
    diff = (adt.hour * 60 + adt.minute - (sh * 60 + sm)) % 1440
    return diff in [420, 419, 421]

# 4. Identify 54 UTC duplicate records
by_alarm_event = defaultdict(list)
for l in logs_aug:
    rd = l.get('run_details') or {}
    aid = rd.get('smartw_alarm_id', '')
    site, adt = parse_alarm(aid)
    if adt:
        by_alarm_event[(site, adt.strftime('%Y-%m-%d %H:%M:%S'))].append(l)

utc_dups_to_delete = []
kept_logs = []

for event_key, elist in by_alarm_event.items():
    vn_records = [l for l in elist if not is_utc_record(l)]
    utc_records = [l for l in elist if is_utc_record(l)]
    if vn_records and utc_records:
        utc_dups_to_delete.extend(utc_records)
        kept_logs.extend(vn_records)
    elif vn_records:
        kept_logs.extend(vn_records)
    elif utc_records:
        kept_logs.extend(utc_records)

print(f"\n🔍 Phát hiện {len(utc_dups_to_delete)} bản ghi UTC trùng lặp cần xóa.")
print(f"📌 Số bản ghi độc nhất giữ lại: {len(kept_logs)}")

# Delete the 54 duplicate records
del_count = 0
for d in utc_dups_to_delete:
    gid = d['gen_log_id']
    supabase.table('generator_logs').delete().eq('gen_log_id', gid).execute()
    del_count += 1
print(f"🗑️ Đã xóa thành công {del_count} bản ghi UTC trùng lặp.")

# 5. Fix +7h timezone shift for standalone UTC records
print("\n⏰ Tiến hành hiệu chỉnh múi giờ (+7h) cho các bản ghi đơn lẻ UTC...")
shift_count = 0
logs_after_shift = []

for l in kept_logs:
    gid = l['gen_log_id']
    rd = dict(l.get('run_details') or {})
    
    if is_utc_record(l):
        aid = rd.get('smartw_alarm_id', '')
        site, adt = parse_alarm(aid)
        h = float(rd.get('thoi_gian_hoat_dong') or 0)
        
        # Real local start and end time
        real_start_dt = adt
        real_end_dt = real_start_dt + timedelta(minutes=int(round(h * 60)))
        
        new_date = real_start_dt.strftime('%Y-%m-%d')
        new_s = real_start_dt.strftime('%H:%M')
        new_e = real_end_dt.strftime('%H:%M')
        
        rd['gio_bat_dau'] = new_s
        rd['gio_ket_thuc'] = new_e
        
        supabase.table('generator_logs').update({
            'date': new_date,
            'run_details': rd
        }).eq('gen_log_id', gid).execute()
        
        l['date'] = new_date
        l['run_details'] = rd
        shift_count += 1
        
    logs_after_shift.append(l)

print(f"✅ Đã hiệu chỉnh múi giờ +7h thành công cho {shift_count} bản ghi.")

# 6. Load EVN schedules in August for note tagging
res_sched = supabase.table('power_schedule').select('*').gte('ngay_mat_dien', '2026-08-01').lte('ngay_mat_dien', '2026-08-31').execute()
schedules = res_sched.data or []

res_sites = supabase.table('datasites').select('site_id, site_id_old').execute()
old_to_new = {}
for s in res_sites.data or []:
    sid = (s.get('site_id') or '').strip().upper()
    sold = (s.get('site_id_old') or '').strip().upper()
    if sid and sold:
        old_to_new[sold] = sid

def canonical(sid):
    if not sid: return ''
    u = sid.strip().upper()
    return old_to_new.get(u, u)

sched_site_dates = set()
for s in schedules:
    csid = canonical(s.get('id_tram') or s.get('site_id'))
    dt = s.get('ngay_mat_dien')
    if csid and dt:
        sched_site_dates.add((csid, dt))

# 7. Merge continuous / overlapping runs strictly abiding by rule:
# Only gap <= 1 min or overlap (gap < 0). Discrete runs (gap > 1 min) are KEPT SEPARATE.
def to_mins(t_str):
    sh, sm = map(int, t_str.split(':')[:2])
    return sh * 60 + sm

by_site_date = defaultdict(list)
for l in logs_after_shift:
    by_site_date[(l['site_id'].upper(), l['date'])].append(l)

final_logs = []
merged_clusters_count = 0
secondary_logs_deleted = 0

for (site, dt), slist in by_site_date.items():
    if len(slist) == 1:
        final_logs.append(slist[0])
        continue
        
    # Sort by start time
    slist_sorted = sorted(slist, key=lambda x: to_mins(x['run_details'].get('gio_bat_dau', '00:00')))
    current_cluster = [slist_sorted[0]]
    
    clusters = []
    for next_log in slist_sorted[1:]:
        prev_log = current_cluster[-1]
        prev_e = to_mins(prev_log['run_details']['gio_ket_thuc'])
        next_s = to_mins(next_log['run_details']['gio_bat_dau'])
        gap = next_s - prev_e
        if gap <= 1:
            current_cluster.append(next_log)
        else:
            clusters.append(current_cluster)
            current_cluster = [next_log]
    clusters.append(current_cluster)
    
    for cluster in clusters:
        if len(cluster) == 1:
            final_logs.append(cluster[0])
        else:
            merged_clusters_count += 1
            primary = cluster[0]
            primary_id = primary['gen_log_id']
            primary_rd = dict(primary['run_details'])
            
            earliest_s = min(to_mins(l['run_details']['gio_bat_dau']) for l in cluster)
            latest_e = max(to_mins(l['run_details']['gio_ket_thuc']) for l in cluster)
            total_h = round(sum(float(l['run_details'].get('thoi_gian_hoat_dong') or 0) for l in cluster), 2)
            quota = float(primary_rd.get('dinh_muc') or 3.0)
            don_gia = float(primary_rd.get('don_gia') or 27540)
            fuel = round(total_h * quota, 2)
            cost = round(fuel * don_gia)
            
            s_str = f'{earliest_s//60:02d}:{earliest_s%60:02d}'
            e_str = f'{latest_e//60:02d}:{latest_e%60:02d}'
            span_str = f'{s_str}-{e_str}'
            
            primary_rd['gio_bat_dau'] = s_str
            primary_rd['gio_ket_thuc'] = e_str
            primary_rd['thoi_gian_hoat_dong'] = total_h
            primary_rd['nhien_lieu_tieu_hao'] = fuel
            primary_rd['thanh_tien'] = cost
            primary_rd['ghi_chu'] = f'Nối ca ({span_str})'
            
            # Update primary log
            supabase.table('generator_logs').update({
                'run_details': primary_rd
            }).eq('gen_log_id', primary_id).execute()
            
            primary['run_details'] = primary_rd
            final_logs.append(primary)
            
            # Delete secondary logs
            for sec in cluster[1:]:
                supabase.table('generator_logs').delete().eq('gen_log_id', sec['gen_log_id']).execute()
                secondary_logs_deleted += 1

print(f"\n🔗 Đã nối {merged_clusters_count} cụm ca chạy liên tục / chồng lấn.")
print(f"🗑️ Đã xóa {secondary_logs_deleted} log phụ sau khi gộp vào log chính.")

# 8. Standardize note labels for all remaining logs
print("\n📝 Chuẩn hóa nhãn ghi chú (ghi_chu) cho toàn bộ log tháng 8...")
note_updated_count = 0
note_summary = defaultdict(int)

for l in final_logs:
    gid = l['gen_log_id']
    rd = dict(l['run_details'])
    existing_note = (rd.get('ghi_chu') or '').strip()
    csid = canonical(l['site_id'])
    dt = l['date']
    
    if existing_note.startswith('Nối ca'):
        note = existing_note
    elif (csid, dt) in sched_site_dates:
        note = 'Lịch EVN'
    else:
        sh, sm = map(int, rd['gio_bat_dau'].split(':')[:2])
        eh, em = map(int, rd['gio_ket_thuc'].split(':')[:2])
        if eh * 60 + em < sh * 60 + sm:
            note = 'Chạy qua đêm'
        else:
            note = 'Sự cố lưới'
            
    if existing_note != note:
        rd['ghi_chu'] = note
        supabase.table('generator_logs').update({
            'run_details': rd
        }).eq('gen_log_id', gid).execute()
        note_updated_count += 1
        
    note_summary[note] += 1

print(f"✅ Đã chuẩn hóa nội dung ghi chú cho {note_updated_count} bản ghi.")
print("\n📊 Phân bổ ghi chú tháng 8/2026 sau khi hoàn tất:")
for k, v in sorted(note_summary.items(), key=lambda x: x[1], reverse=True):
    print(f"  • {k}: {v} ca")

# 9. Final Validation
res_final = supabase.table('generator_logs').select('*').gte('date', '2026-08-01').lte('date', '2026-08-31').execute()
logs_done = res_final.data or []

total_hours = sum(float((l.get('run_details') or {}).get('thoi_gian_hoat_dong') or 0) for l in logs_done)
total_fuel = sum(float((l.get('run_details') or {}).get('nhien_lieu_tieu_hao') or 0) for l in logs_done)
total_cost = sum(float((l.get('run_details') or {}).get('thanh_tien') or 0) for l in logs_done)

print("\n🎉 === TỔNG KẾT CHUẨN HÓA THÁNG 08/2026 ===")
print(f"Tổng số log ban đầu:       {len(logs_aug)}")
print(f"Đã xóa bản sao UTC:        -{del_count}")
print(f"Đã gộp vào log chính:      -{secondary_logs_deleted}")
print(f"Tổng số log chuẩn cuối:    {len(logs_done)}")
print(f"Tổng giờ hoạt động:        {total_hours:.2f} h")
print(f"Tổng nhiên liệu tiêu hao:  {total_fuel:.2f} L")
print(f"Tổng thành tiền:           {total_cost:,.0f} đ")
print("============================================\n")
