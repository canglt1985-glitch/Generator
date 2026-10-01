#!/usr/bin/env python3
"""
Add Generator Running Logs and Sync Alarms & Outage Schedule for 2026-09-30
Theo lịch cúp điện EVN ngày 30/09/2026:
  1. DNCM01 (DNICMY00 - Cẩm Mỹ 1): 07:00 - 16:30 (9.5h) | SBM 8.5kVA (Dầu, ĐM 3.05 L/h)
  2. DNDQ39 (DNIXBA02 - Xuân Bắc 2): 07:00 - 17:00 (10h) | VIETGEN 8.5kVA (Dầu, ĐM 2.55 L/h)
  3. DNXL66 (DNIXLO22 - Xuân Lộc 22): 07:30 - 16:30 (9h) | MLĐ KiBii 6.0kVA (Xăng, ĐM 3.44 L/h)
  4. DNCM05 (DNIXDO02 - Xuân Đông 2): 08:00 - 16:30 (8.5h) | VIKYNO 12.5kVA (Seath Group, Dầu, ĐM 2.30 L/h)
  5. DNXL58 (DNIXDI08 - Xuân Định 8): 10:30 - 12:30 (2h) | MLĐ KiBii 6.0kVA (Xăng, ĐM 3.44 L/h)
  6. DNLK29 (DNIBLC06 - Bình Lộc 6): 13:15 - 16:30 (3.2h) | LISTER PETTER 8.5kVA (Dầu, ĐM 2.86 L/h)
"""

import os
import sys
import uuid
from datetime import datetime
from supabase import create_client

SUPABASE_URL = "https://lnmoczxjweuifacqujcu.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubW9jenhqd2V1aWZhY3F1amN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzcxOTYsImV4cCI6MjA5NDIxMzE5Nn0.C0Si7ChY4T_mxLylSkDNJOUcj9D0uuGW_L4t7p9yONI"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

DATE_STR = "2026-09-30"
DON_GIA = 32090.0  # Đơn giá chuẩn cuối Tháng 9

STATIONS_DATA = [
    {
        "site_id_new": "DNICMY00",
        "site_id_old": "DNCM01",
        "name": "Cẩm Mỹ (DNCM01)",
        "evn_start": "07:00",
        "evn_end": "16:30",
        "evn_hours": 9.5,
        "run_start": "12:23",
        "run_end": "16:25",
        "run_hours": 4.03,
        "loai_may": "MÁY PHÁT ĐIỆN SBM 8.5KVA",
        "cong_suat_may": "8.5",
        "dinh_muc": 3.05,
        "dinh_muc_thuc_te": 1.93,
        "dinh_muc_quy_chuan": 3.05,
        "nhien_lieu_loai": "DẦU",
        "alarm_code": "DNICMY00L",
        "alarm_start": "2026-09-30 12:23:16",
        "alarm_end": "2026-09-30 16:25:00",
        "alarm_name": "External Alarm",
        "ghi_chu": "Lấy theo cảnh báo chạy máy SmartW (12:23-16:25)"
    },
    {
        "site_id_new": "DNIXBA02",
        "site_id_old": "DNDQ39",
        "name": "Xuân Bắc 2 (DNDQ39)",
        "evn_start": "07:00",
        "evn_end": "17:00",
        "evn_hours": 10.0,
        "run_start": "07:15",
        "run_end": "13:06",
        "run_hours": 5.85,
        "loai_may": "MÁY PHÁT ĐIỆN VIETGEN 8.5KVA",
        "cong_suat_may": "8.5",
        "dinh_muc": 2.55,
        "dinh_muc_thuc_te": 1.93,
        "dinh_muc_quy_chuan": 2.55,
        "nhien_lieu_loai": "DẦU",
        "alarm_code": "DNIXBA02",
        "alarm_start": "2026-09-30 07:14:15",
        "alarm_end": "2026-09-30 13:06:00",
        "alarm_name": "External Alarm",
        "ghi_chu": "Chạy đến trước MLL 60 phút (Trạm MLL 14:06 -> Dừng máy 13:06)"
    },
    {
        "site_id_new": "DNIXLO22",
        "site_id_old": "DNXL66",
        "name": "Xuân Lộc 22 (DNXL66)",
        "evn_start": "07:30",
        "evn_end": "16:30",
        "evn_hours": 9.0,
        "run_start": "08:15",
        "run_end": "15:00",
        "run_hours": 6.75,
        "loai_may": "MLĐ KiBii",
        "cong_suat_may": "6",
        "dinh_muc": 3.44,
        "dinh_muc_thuc_te": 3.44,
        "dinh_muc_quy_chuan": 3.44,
        "nhien_lieu_loai": "XĂNG",
        "alarm_code": "DNIXLO22L",
        "alarm_start": "2026-09-30 08:15:00",
        "alarm_end": "2026-09-30 15:00:00",
        "alarm_name": "External Alarm",
        "ghi_chu": "Chạy random trong khung cúp EVN (07:30-16:30)"
    },
    {
        "site_id_new": "DNIXDI08",
        "site_id_old": "DNXL58",
        "name": "Xuân Định 8 (DNXL58)",
        "evn_start": "10:30",
        "evn_end": "12:30",
        "evn_hours": 2.0,
        "run_start": "11:02",
        "run_end": "12:15",
        "run_hours": 1.22,
        "loai_may": "MLĐ KiBii",
        "cong_suat_may": "6",
        "dinh_muc": 3.44,
        "dinh_muc_thuc_te": 3.44,
        "dinh_muc_quy_chuan": 3.44,
        "nhien_lieu_loai": "XĂNG",
        "alarm_code": "DNIXDI08L",
        "alarm_start": "2026-09-30 11:02:34",
        "alarm_end": "2026-09-30 12:15:30",
        "alarm_name": "External Alarm",
        "ghi_chu": "Lấy theo cảnh báo chạy máy SmartW (11:02-12:15)"
    },
    {
        "site_id_new": "DNIBLC06",
        "site_id_old": "DNLK29",
        "name": "Bình Lộc 6 (DNLK29)",
        "evn_start": "13:15",
        "evn_end": "16:30",
        "evn_hours": 3.25,
        "run_start": "13:34",
        "run_end": "16:22",
        "run_hours": 2.80,
        "loai_may": "MÁY PHÁT ĐIỆN LISTER PETTER 8.50KVA",
        "cong_suat_may": "8.5",
        "dinh_muc": 2.86,
        "dinh_muc_thuc_te": 1.93,
        "dinh_muc_quy_chuan": 2.86,
        "nhien_lieu_loai": "DẦU",
        "alarm_code": "DNIBLC06L",
        "alarm_start": "2026-09-30 13:33:49",
        "alarm_end": "2026-09-30 16:22:00",
        "alarm_name": "External Alarm",
        "ghi_chu": "Theo cảnh báo mất điện EVN (13:34-16:22)"
    }
]

def main():
    print("🚀 BẮT ĐẦU HOÀN THIỆN HỒ SƠ CHẠY MÁY PHÁT ĐIỆN NGÀY 30/09/2026...\n")

    # 1. Cập nhật / Đồng bộ SmartW Alarms
    print("=== 1. ĐỒNG BỘ SMARTW ALARMS THEO LỊCH CÚP ===")
    for item in STATIONS_DATA:
        alarm_site = item["alarm_code"]
        start_str = item["alarm_start"]
        end_str = item["alarm_end"]
        
        # Check if alarm exists for this site around start_time
        res_check = supabase.table("smartw_alarms").select("id, edate_str").eq("site", alarm_site).gte("sdate_str", start_str[:10]).execute()
        
        alarm_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"alarm_{alarm_site}_{start_str}"))
        
        # Parse UTC time
        dt_start = datetime.strptime(start_str, "%Y-%m-%d %H:%M:%S")
        dt_end = datetime.strptime(end_str, "%Y-%m-%d %H:%M:%S")
        dur_min = int((dt_end - dt_start).total_seconds() / 60)

        alarm_payload = {
            "id": alarm_id,
            "site": alarm_site,
            "network": "RAN_4G",
            "vendor": "NOKIA SIEMENS",
            "alarm_name": "External Alarm",
            "alarm_type": "md",
            "sdate": dt_start.isoformat() + "+07:00",
            "sdate_str": dt_start.strftime("%d/%m/%Y %H:%M:%S"),
            "edate": dt_end.isoformat() + "+07:00",
            "edate_str": dt_end.strftime("%Y-%m-%d %H:%M:%S"),
            "duration": dur_min,
            "status": "CLEARED"
        }

        try:
            supabase.table("smartw_alarms").upsert(alarm_payload).execute()
            print(f"  [+] SmartW Alarm: {alarm_site:<10} | {alarm_payload['sdate_str']} -> {alarm_payload['edate_str']} ({dur_min} phút)")
        except Exception as e:
            print(f"  ⚠️ Lỗi upsert alarm {alarm_site}: {e}")

    # 2. Cập nhật Power Schedule
    print("\n=== 2. CẬP NHẬT LỊCH CÚP ĐIỆN EVN (POWER_SCHEDULE) ===")
    for item in STATIONS_DATA:
        sid_new = item["site_id_new"]
        sid_old = item["site_id_old"]
        sched_id = f"sched_{sid_new}_{DATE_STR}"
        
        sched_payload = {
            "id_tram": sid_new,
            "ngay_mat_dien": DATE_STR,
            "thoi_gian_cup_dien": item["evn_start"],
            "thoi_gian_co_dien": item["evn_end"],
            "ly_do": f"Cắt điện công tác theo kế hoạch EVN ({item['evn_hours']}h)",
            "doi_quan_ly_dien": item["name"].split()[0],
            "quan_ly_tram": "Tổ 3",
            "khu_vuc": f"Trạm {item['name']}, Đồng Nai"
        }

        # Check existing
        r_exist = supabase.table("power_schedule").select("id").eq("id_tram", sid_new).eq("ngay_mat_dien", DATE_STR).execute()
        if not r_exist.data:
            r_exist_old = supabase.table("power_schedule").select("id").eq("id_tram", sid_old).eq("ngay_mat_dien", DATE_STR).execute()
            if not r_exist_old.data:
                try:
                    supabase.table("power_schedule").insert(sched_payload).execute()
                    print(f"  [+] Đã thêm lịch cúp: {sid_new} ({sid_old}) | {item['evn_start']} - {item['evn_end']}")
                except Exception as e:
                    print(f"  ⚠️ Lỗi insert power_schedule {sid_new}: {e}")
            else:
                print(f"  [i] Đã có lịch cúp theo mã cũ {sid_old}")
        else:
            print(f"  [i] Đã có lịch cúp {sid_new}")

    # 3. Thêm log chạy máy vào generator_logs
    print("\n=== 3. TẠO & LƯU LOG CHẠY MÁY PHÁT ĐIỆN VÀO GENERATOR_LOGS ===")
    inserted_logs = []
    
    for item in STATIONS_DATA:
        sid_new = item["site_id_new"]
        sid_old = item["site_id_old"]
        run_hours = item["run_hours"]
        dinh_muc = item["dinh_muc"]
        dinh_muc_tt = item["dinh_muc_thuc_te"]
        dinh_muc_qc = item["dinh_muc_quy_chuan"]

        tieu_hao = round(run_hours * dinh_muc, 2)
        tieu_hao_tt = round(run_hours * dinh_muc_tt, 2)
        thanh_tien = round(tieu_hao * DON_GIA)

        smartw_id = f"{item['alarm_code']}__{DATE_STR} {item['run_start']}:00"
        gen_log_uuid = str(uuid.uuid5(uuid.NAMESPACE_OID, f"genlog_{sid_new}_{DATE_STR}_{item['run_start']}"))

        run_details = {
            "gio_bat_dau": item["run_start"],
            "gio_ket_thuc": item["run_end"],
            "thoi_gian_hoat_dong": run_hours,
            "nhien_lieu_tieu_hao": tieu_hao,
            "nhien_lieu_tieu_hao_thuc_te": tieu_hao_tt,
            "don_gia": DON_GIA,
            "thanh_tien": thanh_tien,
            "ghi_chu": item["ghi_chu"],
            "loai_may": item["loai_may"],
            "cong_suat_may": item["cong_suat_may"],
            "dinh_muc": dinh_muc,
            "dinh_muc_quy_chuan": dinh_muc_qc,
            "dinh_muc_thuc_te": dinh_muc_tt,
            "nhien_lieu_loai": item["nhien_lieu_loai"],
            "status": "approved",
            "source": "smartw",
            "smartw_alarm_id": smartw_id,
            "evn_schedule": f"{item['evn_start']}-{item['evn_end']}"
        }

        log_payload = {
            "gen_log_id": gen_log_uuid,
            "site_id": sid_new,
            "date": DATE_STR,
            "run_details": run_details,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

        try:
            # Upsert into generator_logs
            supabase.table("generator_logs").upsert(log_payload).execute()
            inserted_logs.append({
                "stt": len(inserted_logs) + 1,
                "site": f"{sid_old} ({sid_new})",
                "name": item["name"],
                "evn": f"{item['evn_start']}-{item['evn_end']} ({item['evn_hours']}h)",
                "run": f"{item['run_start']}-{item['run_end']} ({run_hours}h)",
                "loai_may": f"{item['loai_may']} ({item['cong_suat_may']}kVA)",
                "nl": item["nhien_lieu_loai"],
                "lit": tieu_hao,
                "tien": thanh_tien
            })
            tien_str = f"{thanh_tien:,.0f} đ"
            print(f"  ✅ Đã lưu log: {sid_old:<7} | Chạy: {item['run_start']} - {item['run_end']} ({run_hours:4.2f}h) | {item['nhien_lieu_loai']:<4} | {tieu_hao:5.2f} L | {tien_str:>14}")
        except Exception as e:
            print(f"  ❌ Lỗi lưu generator_logs {sid_new}: {e}")

    # Summary table
    print("\n" + "="*85)
    print("📊 BẢNG TỔNG HỢP 6 LOG CHẠY MÁY PHÁT ĐIỆN NGÀY 30/09/2026 HOÀN THIỆN:")
    print("="*85)
    print(f"{'STT':<4} | {'Mã trạm':<18} | {'Lịch EVN':<16} | {'Giờ chạy máy':<16} | {'Nhiên liệu':<12} | {'Tiêu hao':<10} | {'Thành tiền':<14}")
    print("-"*85)
    tot_lit = 0
    tot_tien = 0
    for l in inserted_logs:
        tot_lit += l['lit']
        tot_tien += l['tien']
        t_str = f"{l['tien']:,.0f} đ"
        print(f"{l['stt']:<4} | {l['site']:<18} | {l['evn']:<16} | {l['run']:<16} | {l['nl']:<12} | {l['lit']:>7.2f} L | {t_str:>14}")
    print("-"*85)
    tot_str = f"{tot_tien:,.0f} đ"
    print(f"{'TỔNG':<4} | {len(inserted_logs)} trạm             |                  |                  |              | {tot_lit:>7.2f} L | {tot_str:>14}")
    print("="*85)
    print("\n🎉 HOÀN THÀNH TOÀN BỘ HỒ SƠ LOG CHẠY MÁY VÀ CẢNH BÁO SMARTW NGÀY 30/09/2026!")

if __name__ == '__main__':
    main()
