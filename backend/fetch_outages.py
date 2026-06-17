import requests
import re
import os
import time
from datetime import datetime, timedelta
from dotenv import load_dotenv
import html
from supabase import create_client, Client
import sys

# Configure stdout encoding
sys.stdout.reconfigure(encoding="utf-8")

# 1. Environment & Supabase V2 Client Configuration
current_dir = os.path.dirname(os.path.abspath(__file__))
# Load env
load_dotenv(os.path.join(current_dir, '.env'))
if not os.getenv("VITE_SUPABASE_URL"):
    parent_dir = os.path.dirname(current_dir)
    load_dotenv(os.path.join(parent_dir, 'tvt3_v2', '.env'))

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERROR: Missing Supabase credentials in environment variables.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Force stdout to flush
import builtins
def print_flush(*args, **kwargs):
    kwargs.setdefault('flush', True)
    builtins.print(*args, **kwargs)
print = print_flush

# 2. Helpers
def decode_html(text):
    return html.unescape(text).strip()

def parse_date(dmy):
    try:
        return datetime.strptime(dmy, "%d/%m/%Y").strftime("%Y-%m-%d")
    except:
        return None

def calculate_duration(start_time, end_time):
    try:
        t1 = datetime.strptime(start_time, "%H:%M")
        t2 = datetime.strptime(end_time, "%H:%M")
        if t2 < t1:
            diff = (t2 + timedelta(days=1) - t1).total_seconds()
        else:
            diff = (t2 - t1).total_seconds()
        hours = round(diff / 3600.0, 1)
        if hours.is_integer():
            return int(hours)
        return hours
    except:
        return "?"

def send_to_viber(new_outages, map_new_to_old):
    today_str = datetime.now().strftime("%Y-%m-%d")
    filtered_outages = [ot for ot in new_outages if ot.get("ngay") and ot["ngay"] >= today_str]
    
    if not filtered_outages:
        print("📢 Không có lịch cúp điện mới từ ngày hôm nay trở đi để gửi Viber.")
        return
    
    new_outages = filtered_outages
    grouped = {}
    for ot in new_outages:
        ngay_val = ot["ngay"]
        ngay_dmy = ngay_val
        if ngay_val:
            try:
                ngay_dmy = datetime.strptime(ngay_val, "%Y-%m-%d").strftime("%d/%m/%Y")
            except:
                pass
        
        if ngay_dmy not in grouped:
            grouped[ngay_dmy] = []
        grouped[ngay_dmy].append(ot)
        
    lines = []
    
    def parse_dmy(date_str):
        try:
            return datetime.strptime(date_str, "%d/%m/%Y")
        except:
            return datetime.max
            
    sorted_dates = sorted(grouped.keys(), key=parse_dmy)
    
    for date_str in sorted_dates:
        lines.append(f"📅 Ngày {date_str}:")
        for ot in grouped[date_str]:
            new_id = ot["id_tram"]
            old_id = map_new_to_old.get(new_id, new_id)
            dur = calculate_duration(ot["start"], ot["end"])
            lines.append(f"  • {old_id}: {ot['start']}-{ot['end']} ({dur}h)")
            
    text = "\n".join(lines)
    payload = {
        "from": "1B+9xBdRnqEQJXfWFZr4Dg==",
        "type": "text",
        "text": text
    }
    
    import json
    viber_token = None
    config_path = os.path.join(current_dir, 'data', 'system_config.json')
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                cfg = json.load(f)
                viber_token = cfg.get('viber_bot_token_outages')
        except:
            pass
    if not viber_token:
        viber_token = os.getenv("VIBER_TOKEN") or "56a990b99bf464bd-d406c456f5380df0-770d03e18af041d0"
    headers = {
        "X-Viber-Auth-Token": viber_token,
        "Content-Type": "application/json"
    }
    try:
        r = requests.post("https://chatapi.viber.com/pa/post", headers=headers, json=payload, timeout=15)
        print(f"Viber send status: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"❌ Failed to send Viber report: {e}")

# 3. Crawler Logic (with Retry mechanism for Robustness)
def fetch_for_customer(ma_khach_hang):
    today = datetime.now()
    today_str = today.strftime("%d/%m/%Y")
    den_ngay = (today + timedelta(days=10)).strftime("%d/%m/%Y")
    
    url = "https://www.cskh.evnspc.vn/TraCuu/GetThongTinLichNgungGiamCungCapDien"
    params = {
        "tuNgay": today_str,
        "denNgay": den_ngay,
        "maKH": ma_khach_hang,
        "ChucNang": "MaKhachHang"
    }
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.cskh.evnspc.vn/TraCuu/LichNgungGiamCungCapDien"
    }
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.get(url, params=params, headers=headers, timeout=15)
            if response.status_code != 200:
                print(f"⚠️ [Attempt {attempt+1}/{max_retries} - Status {response.status_code}] {ma_khach_hang}")
                time.sleep(1)
                continue
            
            content = decode_html(response.text)
            entry_blocks = re.findall(r'<div class="entry">([\s\S]*?)</div>', content)
            results = []
            
            khu_vuc_match = re.search(r'Địa chỉ:</b>\s*([^<]+)', content, re.I)
            khu_vuc_global = khu_vuc_match.group(1).strip() if khu_vuc_match else ""

            for block in entry_blocks:
                block = decode_html(block)
                tg_match = re.search(r'từ\s+(\d{2}:\d{2})(?::\d{2})?\s+ngày\s+(\d{2}/\d{2}/\d{4})\s+đến\s+(\d{2}:\d{2})(?::\d{2})?\s+ngày\s+(\d{2}/\d{2}/\d{4})', block, re.I)
                
                if tg_match:
                    start_time = tg_match.group(1)
                    start_date = tg_match.group(2)
                    end_time = tg_match.group(3)
                    
                    ly_do_match = re.search(r'LÝ DO NGỪNG CUNG CẤP ĐIỆN:</b>\s*<span>(.*?)</span>', block, re.I)
                    ly_do = ly_do_match.group(1).strip() if ly_do_match else ""
                    
                    results.append({
                        "ngay_mat_dien": parse_date(start_date),
                        "thoi_gian_cup_dien": start_time,
                        "thoi_gian_co_dien": end_time,
                        "ly_do": ly_do,
                        "khu_vuc": khu_vuc_global
                    })
                    
            return results
        except (requests.exceptions.RequestException, Exception) as e:
            print(f"❌ [Attempt {attempt+1}/{max_retries}] Exception for {ma_khach_hang}: {e}")
            if attempt < max_retries - 1:
                time.sleep(2)
            else:
                return []
    return []

# 4. Main Process
def main():
    print("🚀 Bắt đầu quét lịch cúp điện V2...")
    
    # 1. Lấy danh sách mã khách hàng từ bảng datasites (V2)
    try:
        res = supabase.table("datasites").select("site_id, site_id_old, management_info, location_info").execute()
        stations_data = res.data or []
    except Exception as e:
        print(f"❌ Không thể đọc bảng datasites từ Supabase V2: {e}")
        return
 
    customers = []
    map_new_to_old = {}
    
    for row in stations_data:
        site_id = row.get("site_id")
        site_old = row.get("site_id_old")
        if site_id and site_old:
            map_new_to_old[site_id.strip().upper()] = site_old.strip().upper()
            
        m_info = row.get("management_info") or {}
        l_info = row.get("location_info") or {}
        
        ma_kh = m_info.get("ma_pe")
        huyen = l_info.get("huyen_cu") or l_info.get("huyen")
        quan_ly = m_info.get("qlt") or m_info.get("manager")
        
        if ma_kh and ma_kh.strip() and "khoán điện" not in ma_kh.lower():
            customers.append((site_id, ma_kh.strip(), huyen, quan_ly))

    total_customers = len(customers)
    print(f"📋 Tìm thấy {total_customers} mã khách hàng hợp lệ trên V2.")

    new_records_count = 0
    total_detected = 0
    new_outages = []
    records_to_upsert = []
    
    # 2. Xử lý theo BATCH (30 mã mỗi lần)
    batch_size = 30
    for i in range(0, total_customers, batch_size):
        batch = customers[i:i + batch_size]
        print(f"📡 Đang xử lý Batch {i//batch_size + 1}/{(total_customers-1)//batch_size + 1} ({len(batch)} mã)...")
        
        for station in batch:
            site_id, ma_kh, huyen, quan_ly = station
            outages = fetch_for_customer(ma_kh)
            
            total_detected += len(outages)
            
            for ot in outages:
                records_to_upsert.append({
                    "ma_khach_hang": ma_kh,
                    "id_tram": site_id,
                    "khu_vuc": ot['khu_vuc'],
                    "ngay_mat_dien": ot['ngay_mat_dien'],
                    "thoi_gian_cup_dien": ot['thoi_gian_cup_dien'],
                    "thoi_gian_co_dien": ot['thoi_gian_co_dien'],
                    "ly_do": ot['ly_do'],
                    "doi_quan_ly_dien": huyen,
                    "quan_ly_tram": quan_ly
                })
                new_outages.append({
                    "id_tram": site_id,
                    "ngay": ot['ngay_mat_dien'],
                    "start": ot['thoi_gian_cup_dien'],
                    "end": ot['thoi_gian_co_dien']
                })
                
    # Fetch existing outages from DB to prevent duplicate database entries
    existing_keys = set()
    today_str = datetime.now().strftime("%Y-%m-%d")
    try:
        res_existing = supabase.table("power_schedule")\
            .select("id_tram, ngay_mat_dien, thoi_gian_cup_dien")\
            .gte("ngay_mat_dien", today_str)\
            .execute()
        for row in (res_existing.data or []):
            key = (row.get("id_tram"), row.get("ngay_mat_dien"), row.get("thoi_gian_cup_dien"))
            existing_keys.add(key)
    except Exception as e:
        print(f"⚠️ Không thể đọc lịch cúp điện hiện tại từ DB: {e}")

    # Filter out duplicate records (only insert ones that don't exist in DB)
    filtered_records_to_insert = []
    seen_keys = set()
    for r in records_to_upsert:
        key = (r["id_tram"], r["ngay_mat_dien"], r["thoi_gian_cup_dien"])
        if key not in existing_keys and key not in seen_keys:
            seen_keys.add(key)
            filtered_records_to_insert.append(r)

    # 3. Tiến hành Insert/Upsert hàng loạt bản ghi mới lên Supabase V2
    if filtered_records_to_insert:
        print(f"💾 Đang lưu {len(filtered_records_to_insert)} bản ghi lịch cúp điện mới lên Supabase V2...")
        try:
            chunk_size = 100
            for idx in range(0, len(filtered_records_to_insert), chunk_size):
                chunk = filtered_records_to_insert[idx:idx+chunk_size]
                supabase.table("power_schedule").upsert(
                    chunk, 
                    on_conflict="id_tram, ngay_mat_dien, thoi_gian_cup_dien"
                ).execute()
            print(f"✅ Lưu hoàn tất.")
        except Exception as e:
            print(f"❌ Lỗi lưu lên Supabase: {e}")
    else:
        print("📢 Không có lịch cúp điện mới nào cần lưu.")

    # 4. Lấy tất cả lịch cúp điện sắp tới (từ hôm nay trở đi) để gửi Viber
    upcoming_outages = []
    try:
        res_upcoming = supabase.table("power_schedule")\
            .select("id_tram, ngay_mat_dien, thoi_gian_cup_dien, thoi_gian_co_dien")\
            .gte("ngay_mat_dien", today_str)\
            .order("ngay_mat_dien", desc=False)\
            .order("thoi_gian_cup_dien", desc=False)\
            .execute()
            
        for row in (res_upcoming.data or []):
            upcoming_outages.append({
                "id_tram": row["id_tram"],
                "ngay": row["ngay_mat_dien"],
                "start": row["thoi_gian_cup_dien"],
                "end": row["thoi_gian_co_dien"]
            })
    except Exception as e:
        print(f"❌ Lỗi khi truy vấn lịch cúp điện từ Supabase: {e}")

    if upcoming_outages:
        print(f"📤 Gửi {len(upcoming_outages)} lịch cúp điện sắp tới lên Viber...")
        send_to_viber(upcoming_outages, map_new_to_old)
    else:
        print("📢 Không có lịch cúp điện sắp tới nào để thông báo.")

    summary = f"Tổng cộng: Phát hiện {total_detected} lịch cúp điện."
    print(f"\n🎉 HOÀN THÀNH! {summary}")
    return summary

if __name__ == "__main__":
    main()
