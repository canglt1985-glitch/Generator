import os
import json
from collections import defaultdict
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('tvt3_v2/.env')
supabase = create_client(os.getenv('VITE_SUPABASE_URL'), os.getenv('VITE_SUPABASE_ANON_KEY'))

gen_logs = supabase.table('generator_logs').select('*').gte('date', '2026-09-01').lte('date', '2026-09-30').execute().data
evn_sched = supabase.table('power_schedule').select('*').gte('ngay_mat_dien', '2026-09-01').lte('ngay_mat_dien', '2026-09-30').execute().data

# Site mapping
res_sites = supabase.table('datasites').select('site_id, site_id_old, name, location_info').execute()
old_to_new = {}
site_info = {}
for s in (res_sites.data or []):
    sid = (s.get('site_id') or '').strip().upper()
    sold = (s.get('site_id_old') or '').strip().upper()
    if sid:
        site_info[sid] = s
        if sold:
            old_to_new[sold] = sid

def get_canonical(s_id):
    if not s_id: return ''
    u = s_id.strip().upper()
    return old_to_new.get(u, u)

evn_map = set((get_canonical(p.get('id_tram')), p.get('ngay_mat_dien')) for p in evn_sched if p.get('id_tram'))

logs_no_evn = [l for l in gen_logs if (get_canonical(l.get('site_id')), l.get('date')) not in evn_map]

def parse_hm(t_str):
    if not t_str: return 0, 0
    parts = str(t_str).strip().split(':')
    h = int(parts[0]) if len(parts) > 0 and parts[0].isdigit() else 0
    m = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 0
    return h, m

overnight_list = []
for l in logs_no_evn:
    rd = l.get('run_details') or {}
    s_str = rd.get('gio_bat_dau', '')
    e_str = rd.get('gio_ket_thuc', '')
    sh, sm = parse_hm(s_str)
    eh, em = parse_hm(e_str)
    note = str(rd.get('note') or '')
    
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
        overnight_list.append(l)

# Map all runs across network by date and time
all_runs_by_date = defaultdict(list)
for l in gen_logs:
    all_runs_by_date[l.get('date')].append(l)

results = []
for l in sorted(overnight_list, key=lambda x: (x.get('date'), (x.get('run_details') or {}).get('gio_bat_dau'))):
    rd = l.get('run_details') or {}
    sid = l.get('site_id')
    csid = get_canonical(sid)
    loc = (site_info.get(csid) or {}).get('location_info') or {}
    dist = loc.get('huyen_cu') or ''
    ward = loc.get('xa_cu') or loc.get('xa_moi') or ''
    dt = l.get('date')
    s_time = rd.get('gio_bat_dau', '')
    e_time = rd.get('gio_ket_thuc', '')
    dur = float(rd.get('thoi_gian_hoat_dong') or 0)
    fuel = float(rd.get('nhien_lieu_tieu_hao') or 0)
    cost = int(rd.get('thanh_tien') or 0)
    status = rd.get('status') or ''
    
    sh, sm = parse_hm(s_time)
    eh, em = parse_hm(e_time)
    start_mins = sh * 60 + sm
    end_mins = eh * 60 + em
    if end_mins < start_mins:
        end_mins += 24 * 60
        
    # Check concurrent runs on the same date/district
    concurrent_district = []
    concurrent_network = []
    
    for other in all_runs_by_date[dt]:
        if other.get('gen_log_id') == l.get('gen_log_id'): continue
        osid = other.get('site_id')
        ocsid = get_canonical(osid)
        oloc = (site_info.get(ocsid) or {}).get('location_info') or {}
        odist = oloc.get('huyen_cu') or ''
        oward = oloc.get('xa_cu') or oloc.get('xa_moi') or ''
        ord = other.get('run_details') or {}
        osh, osm = parse_hm(ord.get('gio_bat_dau', ''))
        oeh, oem = parse_hm(ord.get('gio_ket_thuc', ''))
        ostart = osh * 60 + osm
        oend = oeh * 60 + oem
        if oend < ostart: oend += 24 * 60
        
        # Check overlap
        overlap = max(0, min(end_mins, oend) - max(start_mins, ostart))
        if overlap > 10:
            if odist == dist:
                concurrent_district.append({
                    'site_id': osid,
                    'ward': oward,
                    'start': ord.get('gio_bat_dau'),
                    'end': ord.get('gio_ket_thuc'),
                    'dur': ord.get('thoi_gian_hoat_dong')
                })
            else:
                concurrent_network.append({
                    'site_id': osid,
                    'dist': odist,
                    'start': ord.get('gio_bat_dau'),
                    'end': ord.get('gio_ket_thuc')
                })
                
    # Classify incident nature
    if len(concurrent_district) >= 2:
        nature = "CỤM SỰ CỐ DIỆN RỘNG (Nhiều trạm cùng huyện)"
        reliability = "Cao (Thực tế sự cố lưới)"
    elif len(concurrent_district) == 1:
        nature = "SỰ CỐ ĐƯỜNG DÂY NHÁNH (2 trạm cùng khu vực)"
        reliability = "Trung bình"
    else:
        if len(concurrent_network) >= 3:
            nature = "SỰ CỐ LƯỚI TOÀN TỈNH / GIÔNG BÃO ĐÊM"
            reliability = "Trung bình - Cao"
        else:
            nature = "ĐƠN LẺ CỤC BỘ (Chỉ 1 trạm nổ máy)"
            reliability = "Nghi vấn (ATS lỗi / Quên tắt máy)"

    results.append({
        'id': l.get('gen_log_id'),
        'site_id': sid,
        'district': dist,
        'ward': ward,
        'date': dt,
        'start': s_time,
        'end': e_time,
        'dur': dur,
        'fuel': fuel,
        'cost': cost,
        'status': status,
        'nature': nature,
        'reliability': reliability,
        'concurrent_district': concurrent_district,
        'concurrent_network': concurrent_network
    })

with open('scratch/overnight_runs_analysis.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"Hoàn thành phân tích {len(results)} ca chạy qua đêm! Lưu tại scratch/overnight_runs_analysis.json")
