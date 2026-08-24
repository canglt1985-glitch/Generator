import os
import json
import re
import unicodedata
from dotenv import load_dotenv
from supabase import create_client, Client

def remove_accents(input_str):
    """Chuyển chuỗi tiếng Việt có dấu thành không dấu sử dụng phân rã Unicode NFKD"""
    if not input_str:
        return ""
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    only_ascii = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    only_ascii = only_ascii.replace('đ', 'd').replace('Đ', 'D')
    return only_ascii.lower().strip()

def clean_name(name, no_accent=False):
    """Chuẩn hóa tên địa danh để so khớp dễ hơn"""
    if not name:
        return ""
    name = name.strip().lower()
    # Loại bỏ tiền tố không cần thiết
    name = re.sub(r'^(xã|phường|thị trấn|quận|huyện|thành phố|tỉnh)\s+', '', name)
    # Loại bỏ khoảng trắng thừa
    name = re.sub(r'\s+', ' ', name)
    if no_accent:
        return remove_accents(name)
    return name

def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(current_dir)
    env_path = os.path.join(project_dir, 'tvt3_v2', '.env')
    
    # 1. Load cấu hình env
    load_dotenv(env_path)
    SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
    SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Không tìm thấy VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong file .env")
        return
        
    print("🔌 Đang kết nối tới Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # 2. Lấy dữ liệu xã phường chuẩn từ DB mới (bảng public.wards)
    print("📖 Đang lấy dữ liệu wards từ database...")
    wards_res = supabase.table("wards").select("code, name, full_name, province_code").execute()
    db_wards = wards_res.data
    print(f"  [+] Đã load {len(db_wards)} xã phường từ bảng public.wards.")
    
    # Tạo danh sách tra cứu nhanh (lookup map)
    wards_lookup_accent = {}
    wards_lookup_no_accent = {}
    
    for w in db_wards:
        # Khớp có dấu chuẩn hóa (sử dụng NFC cho đồng bộ dựng sẵn)
        std_name = clean_name(unicodedata.normalize('NFC', w['full_name']), no_accent=False)
        wards_lookup_accent[std_name] = w
        
        # Khớp không dấu
        no_acc_name = clean_name(w['full_name'], no_accent=True)
        wards_lookup_no_accent[no_acc_name] = w
        
    # 3. Lấy dữ liệu datasites để migrate
    print("🚀 Đang lấy danh sách datasites...")
    sites_res = supabase.table("datasites").select("site_id, site_id_old, name, location_info").execute()
    sites = sites_res.data
    print(f"  [+] Tìm thấy {len(sites)} trạm cần xử lý.")
    
    updates_count = 0
    skipped_count = 0
    
    # 4. Tiến hành so khớp và cập nhật
    for site in sites:
        site_id = site.get('site_id')
        site_id_old = site.get('site_id_old')
        site_name = site.get('name')
        loc_info = site.get('location_info') or {}
        
        xa_moi = loc_info.get('xa_moi') or ""
        xa_cu = loc_info.get('xa_cu') or ""
        
        target_names = [xa_moi, xa_cu]
        matched_ward = None
        
        # Thử khớp có dấu trước
        for name in target_names:
            if not name:
                continue
            std_target = clean_name(unicodedata.normalize('NFC', name), no_accent=False)
            if std_target in wards_lookup_accent:
                matched_ward = wards_lookup_accent[std_target]
                break
                
        # Thử khớp không dấu nếu chưa được
        if not matched_ward:
            for name in target_names:
                if not name:
                    continue
                std_target = clean_name(name, no_accent=True)
                if std_target in wards_lookup_no_accent:
                    matched_ward = wards_lookup_no_accent[std_target]
                    break
                    
        # Nếu khớp thành công, chuẩn bị dữ liệu cập nhật
        if matched_ward:
            new_loc_info = dict(loc_info)
            new_loc_info['ward_code'] = matched_ward['code']
            
            # Chỉ update nếu ward_code thay đổi hoặc chưa có
            if loc_info.get('ward_code') != matched_ward['code']:
                try:
                    supabase.table("datasites").update({
                        "location_info": new_loc_info
                    }).eq("site_id", site_id).execute()
                    updates_count += 1
                    print(f"✅ Khớp và cập nhật thành công: {site_id} ({site_name}) -> Xã chuẩn: '{matched_ward['full_name']}' (Mã: {matched_ward['code']})")
                except Exception as e:
                    print(f"❌ Lỗi cập nhật trạm {site_id}: {e}")
            else:
                skipped_count += 1
        else:
            print(f"⚠️ Bỏ qua (Không tìm thấy xã khớp): {site_id} ({site_name}) | Xã trong DB: '{xa_moi}'/'{xa_cu}' | Địa chỉ: {loc_info.get('dia_chi_cu')}")
            skipped_count += 1
            
    print(f"\n🎉 Hoàn tất quá trình migration:")
    print(f"  - Tổng số trạm xử lý: {len(sites)}")
    print(f"  - Số trạm được cập nhật ward_code mới: {updates_count}")
    print(f"  - Số trạm giữ nguyên (đã có hoặc không khớp): {skipped_count}")

if __name__ == "__main__":
    main()
