import os
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime

# Cấu hình đường dẫn
current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(current_dir)
env_path = os.path.join(project_dir, 'tvt3_v2', '.env')
load_dotenv(env_path)

SUPABASE_URL_V1 = os.getenv("VITE_SUPABASE_URL_V1")
SUPABASE_KEY_V1 = os.getenv("VITE_SUPABASE_ANON_KEY_V1")

SUPABASE_URL_V2 = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY_V2 = os.getenv("VITE_SUPABASE_ANON_KEY")

def format_datetime(dt_str):
    if not dt_str:
        return None
    try:
        # Nhập dạng '2026-03-04 14:23:33'
        dt_str = str(dt_str).strip()
        dt = datetime.strptime(dt_str, '%Y-%m-%d %H:%M:%S')
        return dt.isoformat()
    except Exception:
        try:
            dt = datetime.strptime(dt_str, '%Y-%m-%d')
            return dt.isoformat()
        except:
            return None

def main():
    if not SUPABASE_KEY_V1 or not SUPABASE_KEY_V2:
        print("Lỗi: Thiếu API Keys trong file env.")
        return

    v1 = create_client(SUPABASE_URL_V1, SUPABASE_KEY_V1)
    v2 = create_client(SUPABASE_URL_V2, SUPABASE_KEY_V2)

    print("🚀 1. Đọc dữ liệu mobile_equipment từ V1...")
    res_equip = v1.table("mobile_equipment").select("*").execute()
    v1_equips = res_equip.data
    print(f"   [+] Đọc được {len(v1_equips)} thiết bị từ V1.")

    # Insert mobile_equipment và lưu mapping v1_id -> v2_uuid
    v1_to_v2_id_map = {}
    
    # Để tránh trùng lặp nếu chạy lại script, ta nên xoá sạch hoặc upsert theo equipment_code
    # Ta sẽ xoá sạch bảng equipment_transfers trước, sau đó xoá sạch bảng mobile_equipment trên V2
    print("🧹 2. Làm sạch bảng mobile_equipment và equipment_transfers trên V2...")
    v2.table("equipment_transfers").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    v2.table("mobile_equipment").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

    print("📤 3. Đang chèn thiết bị lưu động vào V2...")
    for eq in v1_equips:
        payload = {
            "equipment_code": eq.get("ma_thiet_bi"),
            "type": eq.get("loai"),
            "specifications": eq.get("thong_so"),
            "status": eq.get("trang_thai") or "Tốt",
            "current_location": eq.get("vi_tri_hien_tai") or "KHO",
            "fuel_balance": eq.get("nl_ton") or 0,
            "notes": eq.get("ghi_chu"),
            "created_at": format_datetime(eq.get("ngay_tao")) or datetime.now().isoformat()
        }
        
        try:
            res = v2.table("mobile_equipment").insert([payload]).execute()
            if res.data:
                inserted_eq = res.data[0]
                v1_to_v2_id_map[eq["id"]] = inserted_eq["id"]
        except Exception as e:
            print(f"   [!] Lỗi chèn thiết bị {eq.get('ma_thiet_bi')}: {e}")

    print(f"   [+] Đã chèn {len(v1_to_v2_id_map)} thiết bị thành công.")

    print("🚀 4. Đọc dữ liệu lịch sử điều chuyển (equipment_transfer) từ V1...")
    res_trans = v1.table("equipment_transfer").select("*").execute()
    v1_trans = res_trans.data
    print(f"   [+] Đọc được {len(v1_trans)} dòng lịch sử điều chuyển từ V1.")

    print("📤 5. Đang chèn lịch sử điều chuyển vào V2...")
    inserted_trans_count = 0
    for tr in v1_trans:
        v1_eq_id = tr.get("equipment_id")
        v2_eq_uuid = v1_to_v2_id_map.get(v1_eq_id)
        
        if not v2_eq_uuid:
            print(f"   [!] Bỏ qua dòng chuyển do không tìm thấy thiết bị tương ứng (V1 ID: {v1_eq_id})")
            continue

        payload = {
            "equipment_id": v2_eq_uuid,
            "from_location": tr.get("tu_vi_tri"),
            "to_location": tr.get("den_vi_tri"),
            "transfer_date": format_datetime(tr.get("ngay_dieu_chuyen")) or datetime.now().isoformat(),
            "operator": tr.get("nguoi_dieu_chuyen"),
            "notes": tr.get("ghi_chu")
        }

        try:
            v2.table("equipment_transfers").insert([payload]).execute()
            inserted_trans_count += 1
        except Exception as e:
            print(f"   [!] Lỗi chèn dòng chuyển thiết bị: {e}")

    print(f"🎉 Hoàn tất! Đã đồng bộ {len(v1_to_v2_id_map)} thiết bị lưu động và {inserted_trans_count} lịch sử điều chuyển sang V2!")

if __name__ == "__main__":
    main()
