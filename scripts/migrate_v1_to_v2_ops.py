import os
import json
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime

# Config paths
current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(current_dir)
env_path = os.path.join(project_dir, 'tvt3_v2', '.env')

load_dotenv(env_path)

SUPABASE_URL_V1 = os.getenv("VITE_SUPABASE_URL_V1")
SUPABASE_KEY_V1 = os.getenv("VITE_SUPABASE_ANON_KEY_V1")

SUPABASE_URL_V2 = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY_V2 = os.getenv("VITE_SUPABASE_ANON_KEY")

def clean_dict(d):
    """Xóa các key có giá trị null, rỗng, hoặc chuỗi toàn khoảng trắng để JSONB gọn gàng."""
    if not isinstance(d, dict):
        return d
    return {k: v for k, v in d.items() if v is not None and str(v).strip() != ""}

def chunked_upsert(v2_client: Client, table: str, data: list):
    chunk_size = 400
    total_upserted = 0
    for i in range(0, len(data), chunk_size):
        chunk = data[i:i + chunk_size]
        try:
            res = v2_client.table(table).upsert(chunk).execute()
            total_upserted += len(res.data)
            print(f"  [+] Upserted {total_upserted}/{len(data)} rows into {table}")
        except Exception as e:
            print(f"  [!] Upsert error on {table} (index {i}-{i+chunk_size}): {e}")
            if chunk:
                print(f"  [!] Sample row: {chunk[0]}")

def fetch_all_records(client: Client, table: str):
    start = 0
    limit = 1000
    all_data = []
    while True:
        try:
            res = client.table(table).select("*").range(start, start + limit - 1).execute()
            chunk = res.data
            if not chunk:
                break
            all_data.extend(chunk)
            if len(chunk) < limit:
                break
            start += limit
        except Exception as e:
            print(f"  [!] Error fetching from {table}: {e}")
            break
    return all_data

def format_date(date_str):
    if not date_str:
        return None
    date_str = str(date_str).strip()
    if "T" in date_str:
        date_str = date_str.split("T")[0]
    elif " " in date_str:
        date_str = date_str.split(" ")[0]
    
    parts = date_str.split("-")
    if len(parts) == 3 and len(parts[0]) == 4:
        return date_str
    
    parts_slash = date_str.split("/")
    if len(parts_slash) == 3:
        try:
            if len(parts_slash[0]) == 4:
                return f"{parts_slash[0]}-{parts_slash[1].zfill(2)}-{parts_slash[2].zfill(2)}"
            return f"{parts_slash[2]}-{parts_slash[1].zfill(2)}-{parts_slash[0].zfill(2)}"
        except:
            pass
            
    return None

def resolve_site_id(raw_id_tram, raw_site, valid_new_ids, map_old_to_new):
    id_tram = str(raw_id_tram).strip().upper() if raw_id_tram else ""
    site = str(raw_site).strip().upper() if raw_site else ""
    
    # 1. Khớp site (ID mới) trực tiếp
    if site in valid_new_ids:
        return site
    # 2. Khớp id_tram (ID cũ) qua map_old_to_new
    if id_tram in map_old_to_new:
        return map_old_to_new[id_tram]
    # 3. Khớp id_tram (ID mới) trực tiếp
    if id_tram in valid_new_ids:
        return id_tram
    # 4. Khớp site (ID cũ) qua map_old_to_new
    if site in map_old_to_new:
        return map_old_to_new[site]
        
    return None

def migrate_generator_logs(v1: Client, v2: Client, valid_new_ids: set, map_old_to_new: dict):
    print("🚀 Bắt đầu migrate: generator_log -> generator_logs")
    records = fetch_all_records(v1, "generator_log")
    print(f"  [+] Lấy được {len(records)} dòng từ V1.")
    
    v2_records = []
    invalid_site_count = 0
    
    for r in records:
        site_id = resolve_site_id(r.get("id_tram"), r.get("site"), valid_new_ids, map_old_to_new)
        
        if not site_id:
            invalid_site_count += 1
            continue
            
        date_val = format_date(r.get("ngay_van_hanh"))
        if not date_val:
            date_val = datetime.now().strftime("%Y-%m-%d")
            
        run_details = {
            "gio_bat_dau": r.get("gio_bat_dau"),
            "gio_ket_thuc": r.get("gio_ket_thuc"),
            "thoi_gian_hoat_dong": r.get("thoi_gian_hoat_dong"),
            "nhien_lieu_tieu_hao": r.get("nhien_lieu_tieu_hao"),
            "don_gia": r.get("don_gia"),
            "thanh_tien": r.get("thanh_tien"),
            "ghi_chu": r.get("ghi_chu"),
            "loai_may": r.get("loai_may"),
            "cong_suat_may": r.get("cong_suat_may"),
            "dinh_muc": r.get("dinh_muc"),
            "nhien_lieu_loai": r.get("nhien_lieu"),
            "status": r.get("status"),
            "source": r.get("source"),
            "smartw_alarm_id": r.get("smartw_alarm_id"),
            "v1_id": r.get("id")
        }
        
        v2_records.append({
            "site_id": site_id,
            "date": date_val,
            "run_details": clean_dict(run_details)
        })
        
    print(f"  [+] Kết quả khớp: {len(v2_records)} hợp lệ, {invalid_site_count} trạm không nhận diện được.")
    chunked_upsert(v2, "generator_logs", v2_records)

def migrate_fuel_and_expenses(v1: Client, v2: Client, valid_new_ids: set, map_old_to_new: dict):
    print("🚀 Bắt đầu migrate: fuel_ledger & other_expense -> fuel_and_expenses")
    
    # 1. Fetch fuel_ledger
    ledger_records = fetch_all_records(v1, "fuel_ledger")
    print(f"  [+] Lấy được {len(ledger_records)} dòng fuel_ledger từ V1.")
    
    v2_records = []
    invalid_site_count = 0
    
    for r in ledger_records:
        site_id = resolve_site_id(r.get("id_tram"), None, valid_new_ids, map_old_to_new)
        
        if r.get("id_tram") and not site_id:
            invalid_site_count += 1
            # Không bỏ qua hoàn toàn, đưa về null để lưu vào giao dịch kho chung
            site_id = None
            
        date_val = format_date(r.get("ngay"))
        if not date_val:
            date_val = datetime.now().strftime("%Y-%m-%d")
            
        fuel_tracking = {
            "type": r.get("type"),
            "is_approved": r.get("is_approved"),
            "fuel_type": r.get("loai_nhien_lieu"),
            "quantity": r.get("so_luong"),
            "unit_price": r.get("don_gia"),
            "total_amount": r.get("thanh_tien"),
            "vendor": r.get("nha_cung_cap"),
            "operator": r.get("nguoi_thuc_hien"),
            "notes": r.get("ghi_chu"),
            "balance_after": r.get("ton_sau_gd"),
            "v1_id": r.get("id")
        }
        
        v2_records.append({
            "site_id": site_id,
            "date": date_val,
            "fuel_tracking": clean_dict(fuel_tracking),
            "other_expenses": {}
        })
        
    # 2. Fetch other_expense
    expense_records = fetch_all_records(v1, "other_expense")
    print(f"  [+] Lấy được {len(expense_records)} dòng other_expense từ V1.")
    
    for r in expense_records:
        date_val = format_date(r.get("ngay_su_dung"))
        if not date_val:
            date_val = datetime.now().strftime("%Y-%m-%d")
            
        other_expenses = {
            "content": r.get("noi_dung"),
            "project": r.get("du_an"),
            "amount": r.get("so_tien"),
            "advance_person": r.get("nguoi_tam_ung"),
            "notes": r.get("ghi_chu"),
            "v1_id": r.get("id")
        }
        
        v2_records.append({
            "site_id": None,
            "date": date_val,
            "fuel_tracking": {},
            "other_expenses": clean_dict(other_expenses)
        })
        
    print(f"  [+] Tổng cộng {len(v2_records)} dòng giao dịch chuẩn bị đẩy lên. ({invalid_site_count} trạm không khớp đã đưa về Kho chung)")
    chunked_upsert(v2, "fuel_and_expenses", v2_records)

def migrate_operation_defects_logs(v1: Client, v2: Client, valid_new_ids: set, map_old_to_new: dict):
    print("🚀 Bắt đầu migrate: station_issue -> operation_defects_logs")
    records = fetch_all_records(v1, "station_issue")
    print(f"  [+] Lấy được {len(records)} dòng station_issue từ V1.")
    
    v2_records = []
    invalid_site_count = 0
    
    for r in records:
        site_id = resolve_site_id(r.get("id_tram"), None, valid_new_ids, map_old_to_new)
        
        if not site_id:
            invalid_site_count += 1
            continue
            
        date_val = format_date(r.get("ngay_phat_hien"))
        if not date_val:
            date_val = datetime.now().strftime("%Y-%m-%d")
            
        existing_issues = {
            "category": r.get("hang_muc"),
            "description": r.get("mo_ta"),
            "status": r.get("trang_thai"),
            "reporter": r.get("nguoi_bao_cao"),
            "v1_id": r.get("id")
        }
        
        v2_records.append({
            "site_id": site_id,
            "date": date_val,
            "existing_issues": clean_dict(existing_issues),
            "proposed_solutions": {}
        })
        
    print(f"  [+] Kết quả khớp: {len(v2_records)} hợp lệ, {invalid_site_count} trạm không nhận diện được.")
    chunked_upsert(v2, "operation_defects_logs", v2_records)

def migrate_parsed_invoices(v1: Client, v2: Client):
    print("🚀 Bắt đầu migrate: parsed_invoice -> parsed_invoices")
    records = fetch_all_records(v1, "parsed_invoice")
    print(f"  [+] Lấy được {len(records)} dòng parsed_invoice từ V1.")
    
    v2_records = []
    for r in records:
        date_val = format_date(r.get("ngay_lap"))
        
        items_data = []
        raw_items = r.get("items_json")
        if raw_items:
            try:
                if isinstance(raw_items, str):
                    items_data = json.loads(raw_items)
                else:
                    items_data = raw_items
            except Exception as e:
                print(f"  [!] Lỗi parse items_json cho hóa đơn {r.get('so_hd')}: {e}")
        
        v2_records.append({
            "invoice_date": date_val,
            "invoice_number": r.get("so_hd"),
            "seller_name": r.get("seller_name"),
            "seller_mst": r.get("seller_mst"),
            "buyer_name": r.get("buyer_name"),
            "buyer_mst": r.get("buyer_mst"),
            "total_amount": r.get("tong_tien"),
            "expense_type": r.get("loai_chi_phi") or "Mua dầu",
            "items": items_data,
            "source": r.get("source"),
            "status": r.get("status") or "Pending",
            "invoice_url": r.get("invoice_url"),
            "kh_hd": r.get("kh_hd"),
            "ma_tra_cuu": r.get("ma_tra_cuu"),
            "sub_total": r.get("sub_total"),
            "vat_amount": r.get("vat_amount")
        })
        
    chunked_upsert(v2, "parsed_invoices", v2_records)

def main():
    if not SUPABASE_KEY_V1 or not SUPABASE_KEY_V2:
        print("Lỗi: Thiếu Supabase API keys trong file env.")
        return
        
    v1 = create_client(SUPABASE_URL_V1, SUPABASE_KEY_V1)
    v2 = create_client(SUPABASE_URL_V2, SUPABASE_KEY_V2)
    
    # 1. Load V2 stations to map old_id -> new_id
    stations_resp = v2.table("datasites").select("site_id, site_id_old").execute()
    
    map_old_to_new = {}
    valid_new_ids = set()
    for s in stations_resp.data:
        new_id = s["site_id"].strip().upper()
        valid_new_ids.add(new_id)
        
        old_id = s.get("site_id_old")
        if old_id:
            map_old_to_new[old_id.strip().upper()] = new_id
            
    print(f"📦 Đã tải {len(valid_new_ids)} mã trạm mới từ V2. Đã tạo {len(map_old_to_new)} ánh xạ mã cũ -> mã mới.")
    
    # 2. Execute migrations
    migrate_generator_logs(v1, v2, valid_new_ids, map_old_to_new)
    migrate_fuel_and_expenses(v1, v2, valid_new_ids, map_old_to_new)
    migrate_operation_defects_logs(v1, v2, valid_new_ids, map_old_to_new)
    migrate_parsed_invoices(v1, v2)
    
    print("🎉 Hoàn tất quy trình migrate dữ liệu vận hành & tài chính từ V1 sang V2!")

if __name__ == "__main__":
    main()
