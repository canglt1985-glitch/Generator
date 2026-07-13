import os
import sqlite3
from dotenv import load_dotenv
from supabase import create_client, Client

# Đường dẫn dự án
current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(current_dir)
sqlite_db_path = os.path.join(project_dir, 'web-app', 'instance', 'generator_manager.db')
env_path = os.path.join(project_dir, 'tvt3_v2', '.env')

# Load biến môi trường
load_dotenv(env_path)
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

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
    print("🚀 BẮT ĐẦU ĐỒNG BỘ TRUYỀN DẪN V1 -> V2...")
    
    if not os.path.exists(sqlite_db_path):
        print(f"❌ Không tìm thấy file SQLite V1 tại: {sqlite_db_path}")
        return
        
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Thiếu cấu hình Supabase URL hoặc API Key trong file .env!")
        return

    # Kết nối SQLite và Supabase
    conn = sqlite3.connect(sqlite_db_path)
    cur = conn.cursor()
    
    try:
        # Lấy thông tin các cột của bảng ds_transmissions
        cur.execute("PRAGMA table_info(ds_transmissions)")
        cols = [col[1] for col in cur.fetchall()]
        if not cols:
            print("❌ Không tìm thấy bảng ds_transmissions trong SQLite!")
            return
            
        cur.execute("SELECT count(*) FROM ds_transmissions")
        total_rows = cur.fetchone()[0]
        print(f"📦 Tìm thấy {total_rows} bản ghi truyền dẫn trong SQLite V1.")
        
        if total_rows == 0:
            print("⚠️ Bảng dữ liệu rỗng. Hãy copy file database SQLite V1 thật từ server vào và chạy lại.")
            return

        cur.execute("SELECT * FROM ds_transmissions")
        rows = cur.fetchall()
        
        # Khởi tạo Supabase client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        print("⏳ Đang đồng bộ lên Supabase...")
        success_count = 0
        
        for row in rows:
            # Map dữ liệu theo cấu trúc cột của ds_transmissions V1
            # id, site_id, loai_ket_noi, thiet_bi_td, huong_ket_noi, node_csg,
            # chung_loai_csg, chu_dau_tu_cap, don_vi_van_hanh_cap, chung_loai_cwdm, hang_sx_cwdm
            site_id = clean_val(row[1])
            if not site_id:
                continue
                
            transmission_info = {
                "loai_ket_noi": clean_val(row[2]),
                "thiet_bi_csg": clean_val(row[3]),           # thiet_bi_td
                "last_mile_primary": clean_val(row[4]),     # huong_ket_noi / Hướng chính
                "csg": clean_val(row[5]),                   # node_csg
                "thiet_bi_csg_model": clean_val(row[6]),     # chung_loai_csg
                "chu_dau_tu_cap": clean_val(row[7]),         # Chủ đầu tư cáp
                "don_vi_van_hanh_cap": clean_val(row[8]),    # Đơn vị vận hành cáp
                "thiet_bi_cwdm": clean_val(row[9]),          # chung_loai_cwdm
                "thiet_bi_cwdm_hang": clean_val(row[10])     # hang_sx_cwdm
            }
            
            clean_info = clean_dict(transmission_info)
            if not clean_info:
                continue
                
            try:
                # Cập nhật trực tiếp vào cột transmission_info của bảng datasites
                res = supabase.table("datasites")\
                    .update({"transmission_info": clean_info})\
                    .eq("site_id", site_id)\
                    .execute()
                
                if res.data:
                    success_count += 1
                else:
                    # Thử update theo site_id_old làm fallback
                    res_old = supabase.table("datasites")\
                        .update({"transmission_info": clean_info})\
                        .eq("site_id_old", site_id)\
                        .execute()
                    if res_old.data:
                        success_count += 1
                        
            except Exception as e:
                print(f"  [!] Lỗi khi cập nhật trạm {site_id}: {e}")
                
        print(f"✅ HOÀN TẤT: Đã đồng bộ thành công {success_count}/{total_rows} trạm truyền dẫn lên Supabase V2.")
        
    except Exception as e:
        print(f"❌ Có lỗi xảy ra trong quá trình đồng bộ: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_transmissions()
