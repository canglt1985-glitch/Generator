import os, sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('tvt3_v2/.env')
url = os.getenv('VITE_SUPABASE_URL')
key = os.getenv('VITE_SUPABASE_ANON_KEY')
supabase = create_client(url, key)

don_gia = 27540.0
date_label = "2026-09-16"

logs_to_insert = [
    {
        "site_id": "DNIXLO01",
        "date": date_label,
        "run_details": {
            "gio_bat_dau": "07:34",
            "gio_ket_thuc": "14:04",
            "thoi_gian_hoat_dong": 6.50,
            "nhien_lieu_tieu_hao": round(6.50 * 3.29, 2),
            "nhien_lieu_tieu_hao_thuc_te": round(6.50 * 2.59, 2),
            "don_gia": don_gia,
            "thanh_tien": round(round(6.50 * 3.29, 2) * don_gia),
            "ghi_chu": "Cúp điện bảo trì lưới điện (SmartW ERA Generator running)",
            "loai_may": "KIBII",
            "cong_suat_may": "12",
            "dinh_muc": 3.29,
            "dinh_muc_quy_chuan": 3.29,
            "dinh_muc_thuc_te": 2.59,
            "nhien_lieu_loai": "Dầu",
            "status": "approved",
            "source": "smartw",
            "smartw_alarm_id": "DNIXLO01L__16/09/2026 07:34:50"
        }
    },
    {
        "site_id": "DNIXLO10",
        "date": date_label,
        "run_details": {
            "gio_bat_dau": "07:32",
            "gio_ket_thuc": "08:30",
            "thoi_gian_hoat_dong": 0.97,
            "nhien_lieu_tieu_hao": round(0.97 * 3.56, 2),
            "nhien_lieu_tieu_hao_thuc_te": round(0.97 * 2.70, 2),
            "don_gia": don_gia,
            "thanh_tien": round(round(0.97 * 3.56, 2) * don_gia),
            "ghi_chu": "Cúp điện sáng đợt 1 (SmartW ERA Generator running)",
            "loai_may": "OMEGA",
            "cong_suat_may": "12.5",
            "dinh_muc": 3.56,
            "dinh_muc_quy_chuan": 3.56,
            "dinh_muc_thuc_te": 2.70,
            "nhien_lieu_loai": "Dầu",
            "status": "approved",
            "source": "smartw",
            "smartw_alarm_id": "DNIXLO10L__16/09/2026 07:32:37"
        }
    },
    {
        "site_id": "DNIXLO10",
        "date": date_label,
        "run_details": {
            "gio_bat_dau": "09:36",
            "gio_ket_thuc": "16:45",
            "thoi_gian_hoat_dong": 7.15,
            "nhien_lieu_tieu_hao": round(7.15 * 3.56, 2),
            "nhien_lieu_tieu_hao_thuc_te": round(7.15 * 2.70, 2),
            "don_gia": don_gia,
            "thanh_tien": round(round(7.15 * 3.56, 2) * don_gia),
            "ghi_chu": "Cúp điện bảo trì lưới điện (SmartW ERA Generator running)",
            "loai_may": "OMEGA",
            "cong_suat_may": "12.5",
            "dinh_muc": 3.56,
            "dinh_muc_quy_chuan": 3.56,
            "dinh_muc_thuc_te": 2.70,
            "nhien_lieu_loai": "Dầu",
            "status": "approved",
            "source": "smartw",
            "smartw_alarm_id": "DNIXLO10L__16/09/2026 09:36:48"
        }
    },
    {
        "site_id": "DNIXLO16",
        "date": date_label,
        "run_details": {
            "gio_bat_dau": "08:20",
            "gio_ket_thuc": "15:45",
            "thoi_gian_hoat_dong": 7.42,
            "nhien_lieu_tieu_hao": round(7.42 * 2.55, 2),
            "nhien_lieu_tieu_hao_thuc_te": round(7.42 * 1.93, 2),
            "don_gia": don_gia,
            "thanh_tien": round(round(7.42 * 2.55, 2) * don_gia),
            "ghi_chu": "Cúp điện bảo trì lưới điện (SmartW ERA Generator running)",
            "loai_may": "VIETGEN",
            "cong_suat_may": "8.5",
            "dinh_muc": 2.55,
            "dinh_muc_quy_chuan": 2.55,
            "dinh_muc_thuc_te": 1.93,
            "nhien_lieu_loai": "Dầu",
            "status": "approved",
            "source": "smartw",
            "smartw_alarm_id": "DNIXLO16L__16/09/2026 08:20:49"
        }
    }
]

for log in logs_to_insert:
    # Check if duplicate exists
    res_exist = supabase.table("generator_logs")\
        .select("gen_log_id")\
        .eq("site_id", log["site_id"])\
        .eq("date", log["date"])\
        .eq("run_details->>gio_bat_dau", log["run_details"]["gio_bat_dau"])\
        .execute()
    if res_exist.data:
        print(f"Skipping existing log for {log['site_id']} at {log['run_details']['gio_bat_dau']}")
        continue
    res_ins = supabase.table("generator_logs").insert(log).execute()
    if res_ins.data:
        print(f"Inserted log for {log['site_id']}: {log['run_details']['gio_bat_dau']} - {log['run_details']['gio_ket_thuc']} ({log['run_details']['thoi_gian_hoat_dong']}h)")
    else:
        print(f"Failed to insert for {log['site_id']}: {res_ins}")
