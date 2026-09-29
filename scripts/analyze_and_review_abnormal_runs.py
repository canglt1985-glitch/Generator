import os
import json
from datetime import datetime
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

print("📡 Đang tải dữ liệu từ Supabase...")
gen_logs = fetch_all('generator_logs', '*', 'date', '2026-09-01', '2026-09-30')
power_schedules = fetch_all('power_schedule', '*', 'ngay_mat_dien', '2026-09-01', '2026-09-30')

# datasites mapping
res_sites = supabase.table('datasites').select('site_id, site_id_old, name, location_info').execute()
site_info = {}
old_to_new = {}
for s in (res_sites.data or []):
    sid = (s.get('site_id') or '').strip().upper()
    sold = (s.get('site_id_old') or '').strip().upper()
    if sid:
        site_info[sid] = s
        if sold:
            site_info[sold] = s
            old_to_new[sold] = sid

def get_canonical(s_id):
    if not s_id: return ''
    u = s_id.strip().upper()
    return old_to_new.get(u, u)

# Map EVN schedules
evn_by_site_date = defaultdict(list)
for ps in power_schedules:
    csid = get_canonical(ps.get('id_tram'))
    pdate = ps.get('ngay_mat_dien')
    if csid and pdate:
        evn_by_site_date[(csid, pdate)].append(ps)

logs_no_evn = []
logs_with_evn = []
for l in gen_logs:
    csid = get_canonical(l.get('site_id'))
    ldate = l.get('date')
    if evn_by_site_date.get((csid, ldate)):
        logs_with_evn.append(l)
    else:
        logs_no_evn.append(l)

print(f"Tổng số log tháng 9: {len(gen_logs)}")
print(f"Có EVN: {len(logs_with_evn)}")
print(f"Không có EVN: {len(logs_no_evn)}")

def parse_hm(t_str):
    if not t_str: return 0, 0
    parts = str(t_str).strip().split(':')
    h = int(parts[0]) if len(parts) > 0 and parts[0].isdigit() else 0
    m = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 0
    return h, m

print("\n================== 1. NHÓM 1 (≥ 10h không có EVN) ==================")
g1_candidates = []
for l in logs_no_evn:
    rd = l.get('run_details') or {}
    dur = float(rd.get('thoi_gian_hoat_dong') or 0)
    if dur >= 10.0:
        g1_candidates.append(l)

g1_sorted = sorted(g1_candidates, key=lambda x: float((x.get('run_details') or {}).get('thoi_gian_hoat_dong') or 0), reverse=True)
for l in g1_sorted:
    rd = l.get('run_details') or {}
    sid = l.get('site_id')
    csid = get_canonical(sid)
    site = site_info.get(csid) or {}
    loc = site.get('location_info') or {}
    huyen = loc.get('huyen_cu') or ''
    print(f"gen_log_id: '{l.get('gen_log_id')}' | {sid:8s} ({huyen:10s}) | {l.get('date')} | {rd.get('gio_bat_dau'):5s} -> {rd.get('gio_ket_thuc'):5s} | {rd.get('thoi_gian_hoat_dong'):5.2f}h | {rd.get('nhien_lieu_tieu_hao'):5.2f}L | {rd.get('status'):8s} | {rd.get('note')}")

print("\n================== 2. NHÓM 3 (Chạy < 15 phút) ==================")
g3_candidates = []
for l in logs_no_evn:
    rd = l.get('run_details') or {}
    dur = float(rd.get('thoi_gian_hoat_dong') or 0)
    if 0 < dur < 0.25: # < 15 mins
        g3_candidates.append(l)

for l in sorted(g3_candidates, key=lambda x: x.get('date')):
    rd = l.get('run_details') or {}
    sid = l.get('site_id')
    print(f"gen_log_id: '{l.get('gen_log_id')}' | {sid:8s} | {l.get('date')} | {rd.get('gio_bat_dau'):5s} -> {rd.get('gio_ket_thuc'):5s} | {rd.get('thoi_gian_hoat_dong'):.2f}h | {rd.get('nhien_lieu_tieu_hao'):.2f}L | {rd.get('status')}")

print("\n================== 3. NHÓM 2 (29 ca chạy qua đêm) ==================")
# Let's inspect exactly all overnight runs in logs_no_evn
# Let's check which ones were considered overnight in the 29 ca
g2_list = []
for l in logs_no_evn:
    rd = l.get('run_details') or {}
    s_str = rd.get('gio_bat_dau', '')
    e_str = rd.get('gio_ket_thuc', '')
    sh, sm = parse_hm(s_str)
    eh, em = parse_hm(e_str)
    note = str(rd.get('note') or '')
    
    # Check if overnight:
    # starts in evening/night (>= 18:00) and ends next day morning (< 12:00 or end < start)
    # or starts midnight/early morning (< 05:00)
    # or note mentions qua đêm
    is_overnight = False
    if 'qua đêm' in note.lower() or 'qua đêm' in str(rd).lower():
        is_overnight = True
    elif (eh * 60 + em) < (sh * 60 + sm):
        is_overnight = True
    elif sh >= 18 and eh <= 12:
        is_overnight = True
    elif sh < 5 and eh <= 12:
        is_overnight = True
        
    if is_overnight:
        g2_list.append(l)

print(f"Tổng số ca qua đêm tìm thấy trong logs_no_evn: {len(g2_list)}")

# Analyze each overnight run:
# Look for concurrent runs across the network on the same date/time
date_runs = defaultdict(list)
for l in gen_logs:
    date_runs[l.get('date')].append(l)

print("\nChi tiết 29 ca qua đêm & Đánh giá sự cố lưới:")
print(f"{'STT':3s} | {'Mã trạm':8s} | {'Huyện':10s} | {'Ngày':10s} | {'Bắt đầu':7s} | {'Kết thúc':8s} | {'Số giờ':6s} | {'Lít':6s} | {'Trạng thái':10s} | {'Chạy đến sáng':14s} | {'Đánh giá sự cố'}")
print("-" * 130)

g2_sorted = sorted(g2_list, key=lambda x: (x.get('date'), (x.get('run_details') or {}).get('gio_bat_dau', '')))

for idx, l in enumerate(g2_sorted, 1):
    rd = l.get('run_details') or {}
    sid = l.get('site_id')
    csid = get_canonical(sid)
    site = site_info.get(csid) or {}
    loc = site.get('location_info') or {}
    huyen = loc.get('huyen_cu') or ''
    ldate = l.get('date')
    s_str = rd.get('gio_bat_dau', '')
    e_str = rd.get('gio_ket_thuc', '')
    sh, sm = parse_hm(s_str)
    eh, em = parse_hm(e_str)
    dur = float(rd.get('thoi_gian_hoat_dong') or 0)
    lit = float(rd.get('nhien_lieu_tieu_hao') or 0)
    status = rd.get('status') or ''
    
    # Check concurrent runs on same date & district
    concurrent = []
    for other in date_runs[ldate]:
        if other.get('gen_log_id') == l.get('gen_log_id'): continue
        osid = other.get('site_id')
        ocsid = get_canonical(osid)
        osite = site_info.get(ocsid) or {}
        oloc = osite.get('location_info') or {}
        ohuyen = oloc.get('huyen_cu') or ''
        ord = other.get('run_details') or {}
        osh, osm = parse_hm(ord.get('gio_bat_dau', ''))
        oeh, oem = parse_hm(ord.get('gio_ket_thuc', ''))
        
        # Check overlap
        if ohuyen == huyen or (abs((sh*60+sm) - (osh*60+osm)) <= 60):
            concurrent.append(f"{osid}({ohuyen}) {ord.get('gio_bat_dau')}-{ord.get('gio_ket_thuc')}")
            
    # Sáng lúc mấy giờ
    morning_end = f"Tắt lúc {e_str}"
    
    # Đánh giá
    assessment = ""
    if len(concurrent) >= 2:
        assessment = f"✅ Có cụm ({len(concurrent)} trạm cùng chạy): Sự cố lưới khu vực {huyen}"
    elif len(concurrent) == 1:
        assessment = f"🟡 Trùng 1 trạm khác: Có thể sự cố lưới nhánh"
    else:
        assessment = "⚠️ Đơn lẻ (chỉ 1 trạm chạy): Mất điện cục bộ hoặc lỗi ATS"
        
    print(f"{idx:3d} | {sid:8s} | {huyen:10s} | {ldate:10s} | {s_str:7s} | {e_str:8s} | {dur:5.2f}h | {lit:5.1f}L | {status:10s} | {morning_end:14s} | {assessment}")
    if concurrent:
        print(f"    └─ Cùng thời điểm: {', '.join(concurrent[:3])}")
