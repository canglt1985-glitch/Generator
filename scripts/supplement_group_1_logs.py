#!/usr/bin/env python3
"""
Supplement generator logs for Group 1 missed 4G ERA runs:
1. DNIXLO00 (DNXL01) on 2026-09-16: 2 runs (08:13 - 09:15 and 18:10 - 20:15)
2. DNIDGI18 (DNTN35) on 2026-09-11: 1 run (03:46 - 07:30)
"""
import sys
import os

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from smartw_worker import supabase
from smartw.mfd_import import get_station_info, get_pretax_price

def supplement_group_1():
    print("=== BỔ SUNG LOG CHẠY MÁY PHÁT ĐIỆN NHÓM 1 ===")
    
    entries = [
        {
            "site_id": "DNIXLO00",
            "date": "2026-09-16",
            "start_time": "08:13",
            "end_time": "09:15",
            "duration_h": 0.78,
            "smartw_alarm_id": "DNIXLO00UL__16/09/2026 08:13:06",
            "ghi_chu": "Bổ sung từ cảnh báo chạy máy SmartW trạm 4G ERA DNIXLO00UL cúp điện 16/09 (Đợt 1)"
        },
        {
            "site_id": "DNIXLO00",
            "date": "2026-09-16",
            "start_time": "18:10",
            "end_time": "20:15",
            "duration_h": 1.83,
            "smartw_alarm_id": "DNIXLO00UL__16/09/2026 18:10:27",
            "ghi_chu": "Bổ sung từ cảnh báo chạy máy SmartW trạm 4G ERA DNIXLO00UL cúp điện 16/09 (Đợt 2)"
        },
        {
            "site_id": "DNIDGI18",
            "date": "2026-09-11",
            "start_time": "03:46",
            "end_time": "07:30",
            "duration_h": 3.73,
            "smartw_alarm_id": "DNIDGI18UL__11/09/2026 03:46:29",
            "ghi_chu": "Bổ sung từ cảnh báo chạy máy SmartW trạm 4G ERA DNIDGI18UL cúp điện 11/09"
        }
    ]
    
    inserted = 0
    for item in entries:
        sid = item["site_id"]
        dt = item["date"]
        st = item["start_time"]
        et = item["end_time"]
        hours = item["duration_h"]
        aid = item["smartw_alarm_id"]
        
        # Check duplicate
        res_exist = supabase.table("generator_logs").select("gen_log_id")\
            .eq("site_id", sid)\
            .eq("date", dt)\
            .eq("run_details->>gio_bat_dau", st)\
            .execute()
        if res_exist.data:
            print(f"  [ĐÃ CÓ] Trạm {sid} ngày {dt} lúc {st}, bỏ qua.")
            continue
            
        st_info = get_station_info(sid, date_str=dt) or {}
        loai_may = st_info.get("loai_may") or "KIBII"
        cong_suat = st_info.get("cong_suat_may") or "12"
        dinh_muc_qc = float(st_info.get("dinh_muc_quy_chuan") or st_info.get("dinh_muc") or 3.29)
        dinh_muc_tt = float(st_info.get("dinh_muc_thuc_te") or dinh_muc_qc)
        loai_nl = st_info.get("loai_nhien_lieu") or "Dầu"
        don_gia = get_pretax_price(loai_nl, date_str=dt) or 27540
        
        nhien_lieu_qc = round(hours * dinh_muc_qc, 2)
        nhien_lieu_tt = round(hours * dinh_muc_tt, 2)
        thanh_tien = round(nhien_lieu_qc * don_gia)
        
        run_details = {
            "gio_bat_dau": st,
            "gio_ket_thuc": et,
            "thoi_gian_hoat_dong": hours,
            "nhien_lieu_tieu_hao": nhien_lieu_qc,
            "nhien_lieu_tieu_hao_thuc_te": nhien_lieu_tt,
            "don_gia": don_gia,
            "thanh_tien": thanh_tien,
            "ghi_chu": item["ghi_chu"],
            "loai_may": loai_may,
            "cong_suat_may": cong_suat,
            "dinh_muc": dinh_muc_qc,
            "dinh_muc_quy_chuan": dinh_muc_qc,
            "dinh_muc_thuc_te": dinh_muc_tt,
            "nhien_lieu_loai": loai_nl,
            "status": "approved",
            "source": "smartw_era_sync",
            "smartw_alarm_id": aid
        }
        
        res_ins = supabase.table("generator_logs").insert({
            "site_id": sid,
            "date": dt,
            "run_details": run_details
        }).execute()
        
        if res_ins.data:
            print(f"  ✅ Đã chèn: Trạm {sid} | Ngày {dt} | {st}-{et} ({hours}h) | {nhien_lieu_qc}L {loai_nl} | {thanh_tien:,}đ")
            inserted += 1
        else:
            print(f"  ❌ Lỗi khi chèn trạm {sid}")
            
    print(f"\n=> Tổng cộng đã bổ sung thành công {inserted} bản ghi chạy máy!\n")

if __name__ == "__main__":
    supplement_group_1()
