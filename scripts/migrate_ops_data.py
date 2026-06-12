import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Config paths
current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(current_dir)
env_path = os.path.join(project_dir, 'tvt3_v2', '.env')

load_dotenv(env_path)

SUPABASE_URL_V1 = os.getenv("VITE_SUPABASE_URL_V1")
SUPABASE_KEY_V1 = os.getenv("VITE_SUPABASE_ANON_KEY_V1")

SUPABASE_URL_V2 = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY_V2 = os.getenv("VITE_SUPABASE_ANON_KEY")

def chunked_upsert(v2_client: Client, table: str, data: list):
    chunk_size = 300
    for i in range(0, len(data), chunk_size):
        chunk = data[i:i + chunk_size]
        try:
            res = v2_client.table(table).upsert(chunk).execute()
            print(f"  [+] Upserted {len(res.data)} rows into {table}")
        except Exception as e:
            print(f"  [!] Upsert error on {table}: {e}")

def fetch_all_records(client: Client, table: str):
    start = 0
    limit = 1000
    all_data = []
    while True:
        res = client.table(table).select("*").range(start, start + limit - 1).execute()
        chunk = res.data
        if not chunk:
            break
        all_data.extend(chunk)
        if len(chunk) < limit:
            break
        start += limit
    return all_data

def migrate_daily_work(v1: Client, v2: Client):
    print("🚀 Bắt đầu migrate: daily_work...")
    records = fetch_all_records(v1, "daily_work")
    print(f"  [+] Lấy tổng cộng {len(records)} dòng từ V1.")
    
    # Format and clean data
    v2_records = []
    for r in records:
        v2_records.append({
            "id": r.get("id"),
            "ngay": r.get("ngay"),
            "id_tram": r.get("id_tram"),
            "nhan_vien": r.get("nhan_vien"),
            "noi_dung": r.get("noi_dung"),
            "hang_muc": r.get("hang_muc"),
            "ton_tai_vhkt": r.get("ton_tai_vhkt"),
            "ton_tai_csht": r.get("ton_tai_csht"),
            "ghi_chu": r.get("ghi_chu"),
            "ngay_cap_nhat": r.get("ngay_cap_nhat")
        })
    
    chunked_upsert(v2, "daily_work", v2_records)

def migrate_power_schedule(v1: Client, v2: Client):
    print("🚀 Bắt đầu migrate: power_schedule...")
    records = fetch_all_records(v1, "power_schedule")
    print(f"  [+] Lấy tổng cộng {len(records)} dòng từ V1.")
    
    v2_records = []
    for r in records:
        v2_records.append({
            "id": r.get("id"),
            "ma_khach_hang": r.get("ma_khach_hang"),
            "id_tram": r.get("id_tram"),
            "khu_vuc": r.get("khu_vuc"),
            "ngay_mat_dien": r.get("ngay_mat_dien"),
            "thoi_gian_cup_dien": r.get("thoi_gian_cup_dien"),
            "thoi_gian_co_dien": r.get("thoi_gian_co_dien"),
            "ly_do": r.get("ly_do"),
            "doi_quan_ly_dien": r.get("doi_quan_ly_dien"),
            "quan_ly_tram": r.get("quan_ly_tram")
        })
        
    chunked_upsert(v2, "power_schedule", v2_records)

def main():
    if not SUPABASE_KEY_V1 or not SUPABASE_KEY_V2:
        print("Lỗi: Thiếu Supabase API keys trong file env.")
        return
        
    v1 = create_client(SUPABASE_URL_V1, SUPABASE_KEY_V1)
    v2 = create_client(SUPABASE_URL_V2, SUPABASE_KEY_V2)
    
    migrate_daily_work(v1, v2)
    migrate_power_schedule(v1, v2)
    print("🎉 Hoàn tất toàn bộ quy trình đồng bộ dữ liệu vận hành!")

if __name__ == "__main__":
    main()
