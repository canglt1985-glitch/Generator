import os
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
EXCEL_FILE = "/Users/cang_it/Library/CloudStorage/GoogleDrive-canglt1985@gmail.com/My Drive/datasite/PE.xlsx"

if __name__ == "__main__":
    if not os.path.exists(EXCEL_FILE):
        print(f"[!] Lỗi: Không tìm thấy file Excel tại: {EXCEL_FILE}")
        exit(1)

    print("📂 Đang nạp file Excel mapping...")
    try:
        df = pd.read_excel(EXCEL_FILE)
    except Exception as e:
        print(f"[!] Lỗi khi đọc file Excel: {e}")
        exit(1)
        
    mapping_df = df[['MÃ TRẠM MOBIFONE', 'MÃ KHÁCH HÀNG ĐIỆN LỰC']].dropna().drop_duplicates()
    
    pe_map = {}
    for _, row in mapping_df.iterrows():
        site_id_excel = str(row['MÃ TRẠM MOBIFONE']).strip().upper()
        pe_code = str(row['MÃ KHÁCH HÀNG ĐIỆN LỰC']).strip()
        if site_id_excel and pe_code and site_id_excel != "NAN" and pe_code != "NAN":
            pe_map[site_id_excel] = pe_code

    print(f"  [+] Tìm thấy {len(pe_map)} mã PE hợp lệ trong file Excel.")

    print("🔌 Đang kết nối tới Supabase...")
    client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("🚀 Lấy danh sách datasites...")
    response = client.table('datasites').select('site_id, site_id_old, management_info').limit(10000).execute()
    sites = response.data
    
    print(f"  [+] Tìm thấy {len(sites)} trạm trên hệ thống.")

    updates = []
    
    for site in sites:
        site_id = site['site_id']
        site_id_old = site.get('site_id_old')
        management_info = site.get('management_info') or {}
        
        pe_code_new = None
        
        # Thử match theo site_id_old trước (DNCM13)
        if site_id_old and site_id_old.upper() in pe_map:
            pe_code_new = pe_map[site_id_old.upper()]
        # Nếu không có, thử match theo site_id mới
        elif site_id.upper() in pe_map:
            pe_code_new = pe_map[site_id.upper()]
            
        if pe_code_new:
            current_pe = management_info.get('ma_pe')
            if current_pe != pe_code_new:
                management_info['ma_pe'] = pe_code_new
                updates.append({
                    "site_id": site_id,
                    "management_info": management_info,
                    "new_pe": pe_code_new,
                    "old_pe": current_pe
                })

    print(f"📝 Có {len(updates)} trạm cần cập nhật mã PE.")
    
    if updates:
        print("🚀 Bắt đầu update lên Supabase...")
        count = 0
        for u in updates:
            try:
                client.table('datasites').update({'management_info': u['management_info']}).eq('site_id', u['site_id']).execute()
                count += 1
                if count % 100 == 0:
                    print(f"      Đã cập nhật {count}/{len(updates)}")
            except Exception as e:
                print(f"      [!] Lỗi update {u['site_id']}: {e}")
                
        print(f"🎉 Hoàn tất cập nhật {count} trạm!")
    else:
        print("🎉 Mọi trạm đã có mã PE chuẩn xác, không cần cập nhật thêm.")
