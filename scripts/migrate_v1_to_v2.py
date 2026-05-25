import os
import json
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime

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

def chunked_upsert(v2_client: Client, table: str, data: list, pk: str = None):
    chunk_size = 500
    for i in range(0, len(data), chunk_size):
        chunk = data[i:i + chunk_size]
        try:
            if pk:
                res = v2_client.table(table).upsert(chunk, on_conflict=pk).execute()
            else:
                res = v2_client.table(table).upsert(chunk).execute()
            print(f"  [+] Upserted {len(res.data)} rows into {table}")
        except Exception as e:
            print(f"  [!] Upsert error on {table}: {e}")

def migrate_datasites(v1_client: Client, v2_client: Client):
    print("🚀 Bắt đầu migrate: datasites")
    response = v1_client.table("ds_stations").select("*").limit(2000).execute()
    old_stations = response.data
    
    new_datasites = []
    for st in old_stations:
        location_info = {
            "thanh_pho": st.get("province"),
            "huyen_cu": st.get("district"),
            "xa_cu": st.get("ward"),
            "dia_chi_cu": st.get("address"),
            "do_thi": st.get("urban_type"),
            "xa_moi": st.get("new_ward"),
            "kinh_do": st.get("longitude"),
            "vi_do": st.get("latitude")
        }
        management_info = {
            "to_ql": st.get("team"),
            "qlt": st.get("manager"),
            "ngay_phat_song": st.get("broadcast_date"),
            "pha_ptm": st.get("phase"),
            "ma_pe": st.get("pe_code"),
            "vung_phu": st.get("coverage_area"),
            "tram_main": st.get("main_station")
        }
        classification = {
            "loai_tram": st.get("category"),
            "hinh_thuc_dau_tu": st.get("investment_type"),
            "chu_csht": st.get("owner"),
            "phan_loai_tram": st.get("station_type"),
            "phan_lop_csht": st.get("infrastructure_class"),
            "chu_the_ky_hd": st.get("contract_party")
        }
        name = st.get("site_name") or st.get("name") or "Chưa có tên"
        new_datasites.append({
            "site_id": st.get("site_id"),
            "site_id_old": st.get("old_site_id"),
            "ptm_id": st.get("ptm_id"),
            "name": name,
            "status": st.get("status") or "ACTIVE",
            "location_info": clean_dict(location_info),
            "management_info": clean_dict(management_info),
            "classification": clean_dict(classification)
        })
    chunked_upsert(v2_client, "datasites", new_datasites, "site_id")

def migrate_contracts(v1_client: Client, v2_client: Client, valid_sites: set):
    print("🚀 Bắt đầu migrate: contracts")
    response = v1_client.table("ds_contracts").select("*").limit(3000).execute()
    old_contracts = response.data
    
    new_contracts = []
    for c in old_contracts:
        site_id = c.get("site_id")
        if not site_id or site_id not in valid_sites: continue
        
        dates = {
            "ngay_ky": c.get("ngay_ky_hd"),
            "ngay_ket_thuc": c.get("ngay_ket_thuc_hd")
        }
        financials = {
            "hang_muc_thue": "Thuê nhà trạm",
            "don_gia": c.get("gia_thue_khong_vat"),
            "gia_thue_co_vat": c.get("gia_thue_co_vat"),
            "chu_ky_thanh_toan": c.get("chu_ky_thanh_toan"),
            "da_thanh_toan_den": c.get("da_thanh_toan_den")
        }
        bank_info = {
            "chu_tai_khoan": c.get("chu_tai_khoan"),
            "so_tai_khoan": c.get("so_tai_khoan"),
            "ngan_hang": c.get("ngan_hang")
        }
        contractor_info = {
            "chu_the_hd": c.get("chu_the_hop_dong"),
            "dia_chi_lh": c.get("dia_chi_lien_he"),
            "sdt_lh": c.get("sdt_chu_nha"),
            "cccd": c.get("cccd")
        }
        new_contracts.append({
            "site_id": c.get("site_id"),
            "contract_number": c.get("so_hd"),
            "dates": clean_dict(dates),
            "financials": clean_dict(financials),
            "bank_info": clean_dict(bank_info),
            "contractor_info": clean_dict(contractor_info)
        })
    chunked_upsert(v2_client, "contracts", new_contracts)

def migrate_defects(v1_client: Client, v2_client: Client, valid_sites: set):
    print("🚀 Bắt đầu migrate: operation_defects_logs")
    response = v1_client.table("datasite_anomalies").select("*").limit(3000).execute()
    anomalies = response.data
    
    new_logs = []
    for a in anomalies:
        site_id = a.get("site_id")
        if not site_id or site_id not in valid_sites: continue
        date_str = a.get("detected_at")
        date_val = date_str.split("T")[0] if date_str else datetime.now().strftime("%Y-%m-%d")
        
        existing_issues = {
            "issue_type": a.get("issue_type"),
            "description": a.get("description"),
            "severity": a.get("severity"),
            "is_resolved": a.get("is_resolved")
        }
        proposed_solutions = {
            "resolved_at": a.get("resolved_at")
        }
        new_logs.append({
            "site_id": a.get("site_id"),
            "date": date_val,
            "existing_issues": clean_dict(existing_issues),
            "proposed_solutions": clean_dict(proposed_solutions)
        })
    chunked_upsert(v2_client, "operation_defects_logs", new_logs)

def migrate_generators(v1_client: Client, v2_client: Client, valid_sites: set):
    print("🚀 Bắt đầu migrate: generator_logs")
    response = v1_client.table("generator_log").select("*").limit(3000).execute()
    gen_logs = response.data
    
    new_logs = []
    for g in gen_logs:
        site_id = g.get("site") or g.get("id_tram")
        if not site_id or site_id not in valid_sites: continue
        
        date_val = g.get("ngay_van_hanh")
        if not date_val: continue
        
        run_details = {
            "gio_bat_dau": g.get("gio_bat_dau"),
            "gio_ket_thuc": g.get("gio_ket_thuc"),
            "thoi_gian_hoat_dong": g.get("thoi_gian_hoat_dong"),
            "nhien_lieu_tieu_hao": g.get("nhien_lieu_tieu_hao"),
            "loai_may": g.get("loai_may"),
            "cong_suat_may": g.get("cong_suat_may"),
            "ghi_chu": g.get("ghi_chu")
        }
        new_logs.append({
            "site_id": site_id,
            "date": date_val,
            "run_details": clean_dict(run_details)
        })
    chunked_upsert(v2_client, "generator_logs", new_logs)

def migrate_fuels(v1_client: Client, v2_client: Client, valid_sites: set):
    print("🚀 Bắt đầu migrate: fuel_and_expenses")
    response = v1_client.table("fuel_refill_log").select("*").limit(3000).execute()
    fuels = response.data
    
    new_fuels = []
    for f in fuels:
        site_id = f.get("id_tram")
        if not site_id or site_id not in valid_sites: continue
        
        date_val = f.get("ngay_cham") or f.get("ngay_cap_nhat")
        if not date_val: continue
        
        fuel_tracking = {
            "loai_nhien_lieu": f.get("loai_nhien_lieu"),
            "so_luong": f.get("so_luong"),
            "don_gia": f.get("don_gia"),
            "thanh_tien": f.get("thanh_tien"),
            "nguoi_cham": f.get("nguoi_cham"),
            "ghi_chu": f.get("ghi_chu")
        }
        new_fuels.append({
            "site_id": site_id,
            "date": date_val,
            "fuel_tracking": clean_dict(fuel_tracking),
            "other_expenses": {}
        })
    chunked_upsert(v2_client, "fuel_and_expenses", new_fuels)

if __name__ == "__main__":
    if not SUPABASE_KEY_V1 or not SUPABASE_KEY_V2:
        print("Missing Supabase Keys in .env")
        exit(1)
        
    v1_client: Client = create_client(SUPABASE_URL_V1, SUPABASE_KEY_V1)
    v2_client: Client = create_client(SUPABASE_URL_V2, SUPABASE_KEY_V2)
    
    # Execute migrations
    migrate_datasites(v1_client, v2_client)
    
    # Get valid sites to prevent foreign key errors
    valid_sites_resp = v2_client.table("datasites").select("site_id").execute()
    valid_sites = {s["site_id"] for s in valid_sites_resp.data}
    print(f"📦 Loaded {len(valid_sites)} valid site_ids to validate relations.")
    
    migrate_contracts(v1_client, v2_client, valid_sites)
    migrate_defects(v1_client, v2_client, valid_sites)
    migrate_generators(v1_client, v2_client, valid_sites)
    migrate_fuels(v1_client, v2_client, valid_sites)
    
    print("🎉 Hoàn tất toàn bộ quy trình đồng bộ ETL!")
