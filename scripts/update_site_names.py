import os
import math
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client

# ==========================================
# CẤU HÌNH ĐƯỜNG DẪN & MÔI TRƯỜNG
# ==========================================
current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(current_dir)
env_path = os.path.join(project_dir, 'tvt3_v2', '.env')

load_dotenv(env_path)

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

EXCEL_FILE = os.path.join(current_dir, "data", "Cap_nhat_cellname_Dong_Nai_V6.xlsx")

def chunked_upsert(client: Client, table: str, data: list, pk: str = None):
    if not data:
        print(f"  [!] Không có dữ liệu để upsert cho bảng {table}")
        return

    chunk_size = 500
    for i in range(0, len(data), chunk_size):
        chunk = data[i:i + chunk_size]
        try:
            if pk:
                res = client.table(table).upsert(chunk, on_conflict=pk).execute()
            else:
                res = client.table(table).upsert(chunk).execute()
            print(f"  [+] Đã update {len(res.data)} dòng vào bảng '{table}'")
        except Exception as e:
            print(f"  [!] Lỗi khi upsert vào '{table}': {e}")


if __name__ == "__main__":
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[!] Lỗi: Không tìm thấy VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong file .env")
        exit(1)
        
    if not os.path.exists(EXCEL_FILE):
        print(f"[!] Lỗi: Không tìm thấy file Excel tại: {EXCEL_FILE}")
        exit(1)

    print("📂 Đang nạp file Excel mapping...")
    try:
        df = pd.read_excel(EXCEL_FILE)
    except Exception as e:
        print(f"[!] Lỗi khi đọc file Excel: {e}")
        exit(1)
        
    # Tạo dictionary mapping: prefix (6 ký tự) -> Tên xã/phường
    # Lấy các cột cần thiết và drop na
    mapping_df = df[['6 Ký tự đầu', 'Phường/Xã mới']].dropna().drop_duplicates()
    
    prefix_map = {}
    for _, row in mapping_df.iterrows():
        prefix = str(row['6 Ký tự đầu']).strip()
        ward_name = str(row['Phường/Xã mới']).strip()
        if prefix and ward_name and prefix != "nan" and ward_name != "nan":
            prefix_map[prefix] = ward_name

    print(f"  [+] Tìm thấy {len(prefix_map)} prefix mapping hợp lệ.")

    print("🔌 Đang kết nối tới Supabase...")
    client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("🚀 Lấy danh sách datasites...")
    # Fetch all datasites (we might need pagination if > 1000, but let's assume < 1000 or use limit 5000)
    response = client.table('datasites').select('site_id', 'name').limit(10000).execute()
    sites = response.data
    
    print(f"  [+] Tìm thấy {len(sites)} trạm trên hệ thống.")

    updates = []
    
    for site in sites:
        site_id = site['site_id']
        if len(site_id) >= 6:
            prefix = site_id[:6]
            suffix = site_id[6:]
            
            if prefix in prefix_map:
                base_name = prefix_map[prefix]
                
                new_name = base_name
                # Parse suffix
                if suffix:
                    try:
                        num = int(suffix)
                        if num == 0:
                            new_name = base_name
                        else:
                            new_name = f"{base_name} {num}"
                    except ValueError:
                        # Nếu không phải số (ví dụ A1), gán thẳng
                        new_name = f"{base_name} {suffix}"
                
                # Nếu tên có thay đổi so với hiện tại
                if site['name'] != new_name:
                    updates.append({
                        "site_id": site_id,
                        "name": new_name
                    })

    print(f"📝 Có {len(updates)} trạm cần cập nhật tên.")
    
    if updates:
        print("🚀 Bắt đầu update lên Supabase...")
        # Since we are updating, we must include the PK. 
        # But we only want to update 'name'. Upsert will overwrite other fields with default if not provided?
        # Supabase upsert requires all NOT NULL fields, or you can use .update() individually.
        # It's safer to use .update() one by one, or update only specific fields if upsert supports it.
        # But python supabase client `.upsert()` can do partial if we don't have constraints, actually it might overwrite missing columns with NULL.
        # To be safe, let's use a batch update or individual update.
        print("  [+] Cập nhật từng record để đảm bảo không mất dữ liệu khác...")
        
        count = 0
        for u in updates:
            try:
                client.table('datasites').update({'name': u['name']}).eq('site_id', u['site_id']).execute()
                count += 1
                if count % 100 == 0:
                    print(f"      Đã cập nhật {count}/{len(updates)}")
            except Exception as e:
                print(f"      [!] Lỗi update {u['site_id']}: {e}")
                
        print(f"🎉 Hoàn tất cập nhật {count} trạm!")
    else:
        print("🎉 Mọi trạm đã có tên chuẩn, không cần cập nhật thêm.")
