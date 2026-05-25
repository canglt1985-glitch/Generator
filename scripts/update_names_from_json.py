import os
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

def format_site_name(site_id: str, base_name: str) -> str:
    """
    Format site name based on ID suffix and base name.
    Example: 
      site_id: DNIXDO01, base_name: Xuân Đông -> Xuân Đông 1
      site_id: DNIXDO00, base_name: Xuân Đông -> Xuân Đông
    """
    if not base_name or len(site_id) < 6:
        return base_name
        
    suffix = site_id[6:]
    if not suffix:
        return base_name
        
    try:
        num = int(suffix)
        if num == 0:
            return base_name
        else:
            return f"{base_name} {num}"
    except ValueError:
        # If suffix has letters, e.g. A1
        return f"{base_name} {suffix}"

if __name__ == "__main__":
    print("🔌 Đang kết nối tới Supabase...")
    client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("🚀 Đang lấy danh sách datasites...")
    response = client.table('datasites').select('site_id, name, location_info').limit(10000).execute()
    sites = response.data
    
    print(f"  [+] Tìm thấy {len(sites)} trạm trên hệ thống.")

    updates = []
    
    for site in sites:
        site_id = site.get('site_id')
        current_name = site.get('name')
        location_info = site.get('location_info') or {}
        
        # Prefer xa_moi, fallback to xa_cu if xa_moi is missing
        base_name = location_info.get('xa_moi') or location_info.get('xa_cu')
        
        if base_name:
            new_name = format_site_name(site_id, base_name.strip())
            
            if current_name != new_name:
                updates.append({
                    "site_id": site_id,
                    "name": new_name,
                    "old_name": current_name
                })

    print(f"📝 Có {len(updates)} trạm cần cập nhật tên tiếng Việt có dấu.")
    
    if updates:
        print("🚀 Bắt đầu update lên Supabase...")
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
        print("🎉 Mọi trạm đã chuẩn tên tiếng Việt, không cần cập nhật thêm.")
