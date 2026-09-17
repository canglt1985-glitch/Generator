import os
import json
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client
from collections import defaultdict

# 1. Khởi tạo kết nối Supabase
load_dotenv('tvt3_v2/.env')
url = os.getenv('VITE_SUPABASE_URL')
key = os.getenv('VITE_SUPABASE_ANON_KEY')

if not url or not key:
    raise ValueError("Thiếu biến môi trường Supabase trong tvt3_v2/.env")

supabase = create_client(url, key)
print("🚀 Bắt đầu tiến trình làm sạch và chuẩn hóa log máy phát điện tháng 09/2026...")

# 2. Tải toàn bộ log chạy máy tháng 9/2026
res = supabase.table('generator_logs').select('*').gte('date', '2026-09-01').lte('date', '2026-09-30').execute()
all_logs = res.data or []
print(f"📦 Đã tải {len(all_logs)} logs tháng 9 từ Supabase.")

# 3. Sao lưu (Backup) toàn bộ dữ liệu trước khi sửa đổi
backup_filename = f"/Users/cang_it/Antigravity/TVT3/scratch/backup_generator_logs_september_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
os.makedirs(os.path.dirname(backup_filename), exist_ok=True)
with open(backup_filename, 'w', encoding='utf-8') as f:
    json.dump(all_logs, f, ensure_ascii=False, indent=2, default=str)
print(f"💾 Đã sao lưu dữ liệu gốc an toàn tại: {backup_filename}")

# Helper parse timestamp SmartW
def normalize_smartw_timestamp(alarm_id):
    if not alarm_id or '__' not in alarm_id:
        return None
    _, ts_str = alarm_id.split('__', 1)
    for fmt in [
        '%b %d, %Y %I:%M:%S %p',
        '%b %d, %Y %I:%M %p',
        '%d/%m/%Y %H:%M:%S',
        '%d/%m/%Y %H:%M',
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%d %H:%M'
    ]:
        try:
            return datetime.strptime(ts_str.strip(), fmt).strftime('%Y-%m-%d %H:%M:%S')
        except:
            pass
    return None

def to_mins(t_str):
    try:
        p = t_str.split(':')
        return int(p[0]) * 60 + int(p[1])
    except:
        return None

# 4. Xác định các bản ghi UTC duplicate
by_site_date = defaultdict(list)
for l in all_logs:
    by_site_date[(l['site_id'].upper(), l['date'])].append(l)

confirmed_utc_ids = set()
for (site, dt), site_logs in by_site_date.items():
    if len(site_logs) < 2:
        continue
    for i in range(len(site_logs)):
        for j in range(i + 1, len(site_logs)):
            l1, l2 = site_logs[i], site_logs[j]
            rd1 = l1.get('run_details') or {}
            rd2 = l2.get('run_details') or {}
            sw1 = normalize_smartw_timestamp(rd1.get('smartw_alarm_id'))
            sw2 = normalize_smartw_timestamp(rd2.get('smartw_alarm_id'))
            s1, s2 = rd1.get('gio_bat_dau', ''), rd2.get('gio_bat_dau', '')
            
            m1, m2 = to_mins(s1), to_mins(s2)
            diff_7h = False
            if m1 is not None and m2 is not None:
                d = abs(m1 - m2)
                if abs(d - 420) <= 5 or abs(d - 1020) <= 5:
                    diff_7h = True
            
            same_alarm = (sw1 and sw2 and sw1 == sw2)
            same_raw = (rd1.get('smartw_alarm_id') and rd1.get('smartw_alarm_id') == rd2.get('smartw_alarm_id'))
            
            if same_alarm or same_raw or (diff_7h and (sw1 or sw2)):
                if diff_7h:
                    if (m2 - m1) % 1440 in [420, 419, 421]:
                        utc_log = l1
                    else:
                        utc_log = l2
                else:
                    if m1 is not None and m2 is not None and m1 < m2:
                        utc_log = l1
                    else:
                        utc_log = l2
                confirmed_utc_ids.add(utc_log['gen_log_id'])

print(f"🔍 Phát hiện {len(confirmed_utc_ids)} log bản sao UTC cần xóa.")

# 5. Xóa các log UTC duplicate
deleted_count = 0
for uid in confirmed_utc_ids:
    del_res = supabase.table('generator_logs').delete().eq('gen_log_id', uid).execute()
    deleted_count += 1

print(f"🗑️ Đã xóa thành công {deleted_count} log bản sao UTC khỏi cơ sở dữ liệu.")

# 6. Sửa các log bị lỗi cộng dồn +24h và thời lượng bất thường
remaining_logs = [l for l in all_logs if l['gen_log_id'] not in confirmed_utc_ids]
updated_count = 0

for l in remaining_logs:
    gid = l['gen_log_id']
    rd = dict(l.get('run_details') or {})
    s = rd.get('gio_bat_dau')
    e = rd.get('gio_ket_thuc')
    h = float(rd.get('thoi_gian_hoat_dong') or 0)
    quota = float(rd.get('dinh_muc') or rd.get('dinh_muc_quy_chuan') or 0)
    quota_tt = float(rd.get('dinh_muc_thuc_te') or 0)
    note = rd.get('ghi_chu') or ''
    changed = False

    ms, me = to_mins(s), to_mins(e)
    
    # Sửa các log bị nhảy +24h (chạy trong ngày nhưng bị tính > 20h)
    if ms is not None and me is not None and me >= ms:
        real_h = round((me - ms) / 60.0, 2)
        if h > 20 and real_h < 3.0:
            print(f"  ✏️ Hiệu chỉnh {l['site_id']} ({l['date']}): {s} - {e} từ {h}h -> {real_h}h")
            rd['thoi_gian_hoat_dong'] = real_h
            if quota > 0:
                rd['nhien_lieu_tieu_hao'] = round(real_h * quota, 2)
            if quota_tt > 0:
                rd['nhien_lieu_tieu_hao_thuc_te'] = round(real_h * quota_tt, 2)
            changed = True

    # Sửa ca DNISRA05 (03/09/2026) từ 40h -> 16.02h
    if l['site_id'] == 'DNISRA05' and l['date'] == '2026-09-03':
        print(f"  ✏️ Hiệu chỉnh DNISRA05 (03/09/2026): {s} - {e} từ {h}h -> 16.02h")
        rd['thoi_gian_hoat_dong'] = 16.02
        if quota > 0:
            rd['nhien_lieu_tieu_hao'] = round(16.02 * quota, 2)
        rd['ghi_chu'] = (note + ' (Hiệu chỉnh từ 40h do cảnh báo kéo dài)').strip()
        changed = True

    # Bổ sung tag (Chạy qua đêm) cho 3 ca hợp lệ
    if ms is not None and me is not None and me < ms:
        if '(Chạy qua đêm)' not in note:
            rd['ghi_chu'] = (note + ' (Chạy qua đêm)').strip()
            print(f"  🌙 Bổ sung ghi chú (Chạy qua đêm) cho {l['site_id']} ({l['date']}) {s} - {e}")
            changed = True

    if changed:
        supabase.table('generator_logs').update({'run_details': rd}).eq('gen_log_id', gid).execute()
        updated_count += 1

print(f"✅ Đã cập nhật và chuẩn hóa {updated_count} log chạy máy.")

# 7. Kiểm tra lại toàn bộ số liệu sau khi dọn dẹp
res_after = supabase.table('generator_logs').select('run_details').gte('date', '2026-09-01').lte('date', '2026-09-30').execute()
logs_after = res_after.data or []
final_h = sum(float((l.get('run_details') or {}).get('thoi_gian_hoat_dong') or 0) for l in logs_after)
final_f = sum(float((l.get('run_details') or {}).get('nhien_lieu_tieu_hao') or 0) for l in logs_after)

print("\n🎉 === KẾT QUẢ SAU KHI XỬ LÝ ===")
print(f"Tổng số log tháng 9: {len(logs_after)} (Đã loại bỏ {len(all_logs) - len(logs_after)} log dư thừa)")
print(f"Tổng giờ chạy máy chuẩn: {final_h:.2f} h")
print(f"Tổng nhiên liệu tiêu thụ chuẩn: {final_f:.2f} L")
print(f"Đã thu hồi số giờ đội khống: -{1803.33 - final_h:.2f} h")
print(f"Đã thu hồi lượng dầu đội khống: -{5600.11 - final_f:.2f} L")
