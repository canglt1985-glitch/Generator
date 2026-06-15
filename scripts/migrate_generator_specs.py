import os
import json
from dotenv import load_dotenv
from supabase import create_client, Client

# Cấu hình đường dẫn
current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(current_dir)
env_path = os.path.join(project_dir, 'tvt3_v2', '.env')
load_dotenv(env_path)

SUPABASE_URL_V1 = os.getenv("VITE_SUPABASE_URL_V1")
SUPABASE_KEY_V1 = os.getenv("VITE_SUPABASE_ANON_KEY_V1")

SUPABASE_URL_V2 = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY_V2 = os.getenv("VITE_SUPABASE_ANON_KEY")

def main():
    if not SUPABASE_KEY_V1 or not SUPABASE_KEY_V2:
        print("Lỗi: Thiếu API Keys trong file env.")
        return

    v1 = create_client(SUPABASE_URL_V1, SUPABASE_KEY_V1)
    v2 = create_client(SUPABASE_URL_V2, SUPABASE_KEY_V2)

    print("🚀 1. Đọc dữ liệu general_info từ V1...")
    res_v1 = v1.table("general_info").select("*").execute()
    v1_stations = res_v1.data
    print(f"   [+] Lấy được {len(v1_stations)} trạm từ V1.")

    print("🚀 2. Đọc dữ liệu datasites từ V2...")
    res_v2 = v2.table("datasites").select("site_id, site_id_old, name, infrastructure_info").execute()
    v2_sites = res_v2.data
    print(f"   [+] Lấy được {len(v2_sites)} trạm từ V2.")

    # Tạo mapping để tìm nhanh trạm trên V2:
    # 1. Tìm theo site_id (mã mới)
    # 2. Tìm theo site_id_old (mã cũ)
    v2_by_id = {s["site_id"].strip().upper(): s for s in v2_sites}
    v2_by_old_id = {}
    for s in v2_sites:
        old_id = s.get("site_id_old")
        if old_id:
            v2_by_old_id[old_id.strip().upper()] = s

    print("🚀 3. Bắt đầu đối chiếu và đồng bộ định mức...")
    updated_count = 0
    not_found_count = 0

    for st in v1_stations:
        v1_id = st.get("id_tram", "").strip().upper()
        if not v1_id:
            continue

        # Tìm trạm tương ứng trên V2
        target_site = v2_by_id.get(v1_id)
        if not target_site:
            target_site = v2_by_old_id.get(v1_id)

        if not target_site:
            print(f"   [!] Không tìm thấy trạm tương ứng cho {v1_id} trên V2 (Bỏ qua)")
            not_found_count += 1
            continue

        # Trích xuất định mức từ V1
        dinh_muc = st.get("dinh_muc")
        dinh_muc_thuc_te = st.get("dinh_muc_thuc_te")
        dung_tich = st.get("dung_tich")
        nl_ton = st.get("nl_ton")
        cong_suat = st.get("cong_suat")
        loai_may = st.get("loai_may")
        loai_nl = st.get("loai_nhien_lieu") or "Dầu"

        # Lấy infrastructure_info hiện tại ở V2
        infra = target_site.get("infrastructure_info") or {}
        
        # Đảm bảo có cấu trúc 'may_phat_dien' và 'mpd'
        if "may_phat_dien" not in infra:
            infra["may_phat_dien"] = {"mpd": []}
        elif not isinstance(infra["may_phat_dien"], dict):
            # Nếu sai kiểu, reset về object
            infra["may_phat_dien"] = {"mpd": []}
            
        if "mpd" not in infra["may_phat_dien"] or not isinstance(infra["may_phat_dien"]["mpd"], list):
            infra["may_phat_dien"]["mpd"] = []

        mpd_list = infra["may_phat_dien"]["mpd"]

        if len(mpd_list) > 0:
            # Nếu đã có máy phát điện, cập nhật định mức vào máy phát đầu tiên
            mpd = mpd_list[0]
            mpd["dinh_muc"] = dinh_muc
            mpd["dinh_muc_thuc_te"] = dinh_muc_thuc_te
            mpd["dung_tich"] = dung_tich
            mpd["nl_ton"] = nl_ton
            if cong_suat and not mpd.get("cong_suat"):
                mpd["cong_suat"] = str(cong_suat)
            if loai_may and not mpd.get("nhan_hieu"):
                mpd["nhan_hieu"] = loai_may
            if loai_nl and not mpd.get("nhien_lieu"):
                mpd["nhien_lieu"] = loai_nl
        else:
            # Nếu chưa có máy phát điện, tạo mới một đối tượng máy phát điện
            new_mpd = {
                "ten": "MÁY PHÁT ĐIỆN (1)",
                "nhien_lieu": loai_nl.upper() if loai_nl else "DẦU",
                "trang_thai": "HOẠT ĐỘNG TỐT",
                "dinh_muc": dinh_muc,
                "dinh_muc_thuc_te": dinh_muc_thuc_te,
                "dung_tich": dung_tich,
                "nl_ton": nl_ton
            }
            if cong_suat:
                new_mpd["cong_suat"] = str(cong_suat)
            if loai_may:
                new_mpd["nhan_hieu"] = loai_may
            mpd_list.append(new_mpd)

        # Cập nhật ngược lại vào database V2
        try:
            v2.table("datasites").update({
                "infrastructure_info": infra
            }).eq("site_id", target_site["site_id"]).execute()
            updated_count += 1
        except Exception as e:
            print(f"   [!] Lỗi cập nhật trạm {target_site['site_id']}: {e}")

    print(f"\n🎉 Đồng bộ hoàn tất!")
    print(f"   [+] Đã cập nhật thành công định mức cho {updated_count} trạm trên V2.")
    print(f"   [+] Số trạm không đối chiếu được: {not_found_count}.")

if __name__ == "__main__":
    main()
