import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load biến môi trường
current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(current_dir)
env_path = os.path.join(project_dir, 'tvt3_v2', '.env')

load_dotenv(env_path)
SUPABASE_URL_V1 = os.getenv("VITE_SUPABASE_URL_V1")
SUPABASE_KEY_V1 = os.getenv("VITE_SUPABASE_ANON_KEY_V1")
SUPABASE_URL_V2 = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY_V2 = os.getenv("VITE_SUPABASE_ANON_KEY")

def clean_val(val):
    if val is None:
        return None
    s = str(val).strip()
    if s.lower() in ('none', 'nan', '', 'null'):
        return None
    return s

def clean_dict(d):
    """Xóa các key có giá trị null để JSONB gọn gàng."""
    if not isinstance(d, dict):
        return d
    return {k: v for k, v in d.items() if v is not None}

def migrate_transmissions():
    print("🚀 BẮT ĐẦU ĐỒNG BỘ TRUYỀN DẪN TỪ SUPABASE V1 SANG V2...")
    
    if not SUPABASE_URL_V1 or not SUPABASE_KEY_V1:
        print("❌ Thiếu cấu hình Supabase V1 trong file .env!")
        return
        
    if not SUPABASE_URL_V2 or not SUPABASE_KEY_V2:
        print("❌ Thiếu cấu hình Supabase V2 trong file .env!")
        return

    # Khởi tạo clients
    v1_client: Client = create_client(SUPABASE_URL_V1, SUPABASE_KEY_V1)
    v2_client: Client = create_client(SUPABASE_URL_V2, SUPABASE_KEY_V2)
    
    try:
        # Lấy toàn bộ 368 dòng truyền dẫn từ bảng ds_transmissions trên Supabase V1
        response = v1_client.table("ds_transmissions").select("*").limit(1000).execute()
        v1_data = response.data
        total_rows = len(v1_data)
        print(f"📦 Đã tải {total_rows} bản ghi truyền dẫn từ Supabase V1.")
        
        if total_rows == 0:
            print("⚠️ Bảng ds_transmissions trên V1 rỗng!")
            return

        print("⏳ Đang đồng bộ và cập nhật sang Supabase V2...")
        success_count = 0
        
        for row in v1_data:
            site_id = clean_val(row.get('site_id'))
            if not site_id:
                continue
                
            transmission_info = {
                "loai_ket_noi": clean_val(row.get('loai_ket_noi')),
                "thiet_bi_csg": clean_val(row.get('thiet_bi_td')),           # thiet_bi_td
                "last_mile_primary": clean_val(row.get('huong_ket_noi')),     # huong_ket_noi / Hướng chính
                "csg": clean_val(row.get('node_csg')),                       # node_csg
                "thiet_bi_csg_model": clean_val(row.get('chung_loai_csg')),   # chung_loai_csg
                "chu_dau_tu_cap": clean_val(row.get('chu_dau_tu_cap')),       # Chủ đầu tư cáp
                "don_vi_van_hanh_cap": clean_val(row.get('don_vi_van_hanh_cap')),# Đơn vị vận hành cáp
                "thiet_bi_cwdm": clean_val(row.get('chung_loai_cwdm')),      # chung_loai_cwdm
                "thiet_bi_cwdm_hang": clean_val(row.get('hang_sx_cwdm'))     # hang_sx_cwdm
            }
            
            clean_info = clean_dict(transmission_info)
            if not clean_info:
                continue
                
            try:
                # Cập nhật trực tiếp vào cột technical_info của bảng datasites trên V2
                res = v2_client.table("datasites")\
                    .update({"technical_info": clean_info})\
                    .eq("site_id", site_id)\
                    .execute()
                
                if res.data:
                    success_count += 1
                else:
                    # Thử update theo site_id_old làm fallback
                    res_old = v2_client.table("datasites")\
                        .update({"technical_info": clean_info})\
                        .eq("site_id_old", site_id)\
                        .execute()
                    if res_old.data:
                        success_count += 1
                        
            except Exception as e:
                print(f"  [!] Lỗi khi cập nhật trạm {site_id}: {e}")
                
        print(f"✅ HOÀN TẤT: Đã đồng bộ thành công {success_count}/{total_rows} trạm truyền dẫn sang Supabase V2.")
        
    except Exception as e:
        print(f"❌ Có lỗi xảy ra trong quá trình đồng bộ: {e}")

if __name__ == "__main__":
    migrate_transmissions()
