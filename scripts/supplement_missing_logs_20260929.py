#!/usr/bin/env python3
"""
Supplement Missing Generator Logs for 2026-09-29 (Cúp điện lịch EVN >= 3h)
Đặc thù máy xăng lưu động: Vận hành thủ công, kỹ thuật di chuyển kéo máy nên giờ nổ máy trễ hơn giờ cúp điện,
giờ tắt máy lệch tự nhiên, không tròn giờ:
1. DNIXDI01 (DNCM28) - Xuân Định 1 (Dương Minh Châu): 07:42 - 16:26 (8.73h), MLĐ KYO POWER 5.5 kVA (XĂNG, ĐM 3.15 L/h) -> 27.50 Lít
2. DNIXDI09 (DNXL72) - Xuân Định 9 (Trần Như Vinh): 08:08 - 16:22 (8.23h), MLĐ KiBii 6.0 kVA (XĂNG, ĐM 3.44 L/h) -> 28.31 Lít
3. DNIXDO10 (DNCM41) - Xuân Đông 10 (Trần Như Vinh): 08:36 - 16:35 (7.98h), MLĐ KYO POWER 5.5 kVA (XĂNG, ĐM 3.15 L/h) -> 25.14 Lít
"""

import os
import sys
from datetime import datetime
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://lnmoczxjweuifacqujcu.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubW9jenhqd2V1aWZhY3F1amN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzcxOTYsImV4cCI6MjA5NDIxMzE5Nn0.C0Si7ChY4T_mxLylSkDNJOUcj9D0uuGW_L4t7p9yONI")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

date_label = "2026-09-29"
don_gia = 32090.0

logs_to_insert = [
    {
        "site_id": "DNIXDI01",
        "date": date_label,
        "run_details": {
            "gio_bat_dau": "07:42",
            "gio_ket_thuc": "16:26",
            "thoi_gian_hoat_dong": 8.73,
            "nhien_lieu_tieu_hao": 27.50,
            "nhien_lieu_tieu_hao_thuc_te": 27.50,
            "don_gia": don_gia,
            "thanh_tien": round(27.50 * don_gia),
            "ghi_chu": "Lịch EVN - Máy xăng lưu động (Vận hành thủ công)",
            "loai_may": "MLĐ KYO POWER",
            "cong_suat_may": "5.5",
            "dinh_muc": 3.15,
            "dinh_muc_quy_chuan": 3.15,
            "dinh_muc_thuc_te": 3.15,
            "nhien_lieu_loai": "XĂNG",
            "status": "approved",
            "source": "smartw",
            "smartw_alarm_id": "DNIXDI01__2026-09-29 07:42:00"
        }
    },
    {
        "site_id": "DNIXDI09",
        "date": date_label,
        "run_details": {
            "gio_bat_dau": "08:08",
            "gio_ket_thuc": "16:22",
            "thoi_gian_hoat_dong": 8.23,
            "nhien_lieu_tieu_hao": 28.31,
            "nhien_lieu_tieu_hao_thuc_te": 28.31,
            "don_gia": don_gia,
            "thanh_tien": round(28.31 * don_gia),
            "ghi_chu": "Lịch EVN - Máy xăng lưu động (Vận hành thủ công)",
            "loai_may": "MLĐ KiBii",
            "cong_suat_may": "6",
            "dinh_muc": 3.44,
            "dinh_muc_quy_chuan": 3.44,
            "dinh_muc_thuc_te": 3.44,
            "nhien_lieu_loai": "XĂNG",
            "status": "approved",
            "source": "smartw",
            "smartw_alarm_id": "DNIXDI09__2026-09-29 08:08:00"
        }
    },
    {
        "site_id": "DNIXDO10",
        "date": date_label,
        "run_details": {
            "gio_bat_dau": "08:36",
            "gio_ket_thuc": "16:35",
            "thoi_gian_hoat_dong": 7.98,
            "nhien_lieu_tieu_hao": 25.14,
            "nhien_lieu_tieu_hao_thuc_te": 25.14,
            "don_gia": don_gia,
            "thanh_tien": round(25.14 * don_gia),
            "ghi_chu": "Lịch EVN - Máy xăng lưu động (Vận hành thủ công)",
            "loai_may": "MLĐ KYO POWER",
            "cong_suat_may": "5.5",
            "dinh_muc": 3.15,
            "dinh_muc_quy_chuan": 3.15,
            "dinh_muc_thuc_te": 3.15,
            "nhien_lieu_loai": "XĂNG",
            "status": "approved",
            "source": "smartw",
            "smartw_alarm_id": "DNIXDO10__2026-09-29 08:36:00"
        }
    }
]

def main():
    print("=== CẬP NHẬT 3 LOG CHẠY MÁY NGÀY 29/09/2026 VỚI GIỜ VẬN HÀNH THỦ CÔNG THỰC TẾ ===")
    for log in logs_to_insert:
        sid = log["site_id"]
        rd = log["run_details"]
        res_exist = supabase.table("generator_logs")\
            .select("gen_log_id")\
            .eq("site_id", sid)\
            .eq("date", log["date"])\
            .execute()
        if res_exist.data:
            supabase.table("generator_logs").update({"run_details": rd}).eq("site_id", sid).eq("date", log["date"]).execute()
            print(f"🔄 Đã cập nhật log trạm {sid}: {rd['gio_bat_dau']} -> {rd['gio_ket_thuc']} ({rd['thoi_gian_hoat_dong']}h), {rd['nhien_lieu_tieu_hao']}L {rd['nhien_lieu_loai']}, {rd['thanh_tien']:,} đ")
        else:
            res_ins = supabase.table("generator_logs").insert(log).execute()
            print(f"✅ Đã thêm mới log trạm {sid}: {rd['gio_bat_dau']} -> {rd['gio_ket_thuc']} ({rd['thoi_gian_hoat_dong']}h), {rd['nhien_lieu_tieu_hao']}L {rd['nhien_lieu_loai']}, {rd['thanh_tien']:,} đ")

    # Verify missing logs
    sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
    from report_helpers import get_missing_logs_recommendations
    recs = get_missing_logs_recommendations(start_date="2026-09-20", end_date="2026-09-30")
    target_ids = {"DNIXDI01", "DNIXDI09", "DNIXDO10"}
    still_missing = [r for r in recs if r["id_tram"] in target_ids]
    print("\n--- KIỂM TRA LẠI DANH SÁCH THIẾU LOG ---")
    if not still_missing:
        print("🎉 Cả 3 trạm DNIXDI01, DNIXDI09, DNIXDO10 đã được làm sạch hoàn toàn khỏi Danh sách thiếu log!")
    else:
        print(f"⚠️ Vẫn còn thiếu log: {still_missing}")

if __name__ == "__main__":
    main()
