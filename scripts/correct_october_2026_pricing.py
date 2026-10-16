#!/usr/bin/env python3
"""
Correct October 2026 generator logs pricing on Supabase generator_logs table.
Ensures 100% compliance with historical fuel prices and 15h Next-day rule.
"""
import os
import sys
import json
from datetime import datetime
from supabase import create_client

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
from fuel_price import get_fuel_price_for_date

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://lnmoczxjweuifacqujcu.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubW9jenhqd2V1aWZhY3F1amN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzcxOTYsImV4cCI6MjA5NDIxMzE5Nn0.C0Si7ChY4T_mxLylSkDNJOUcj9D0uuGW_L4t7p9yONI")

def main():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("=== BẮT ĐẦU QUÉT VÀ CHUẨN HÓA ĐƠN GIÁ THÁNG 10/2026 ===")
    res = sb.table("generator_logs")\
        .select("gen_log_id, site_id, date, run_details")\
        .gte("date", "2026-10-01")\
        .lte("date", "2026-10-31")\
        .order("date")\
        .execute()
        
    records = res.data or []
    print(f"Tổng số bản ghi Tháng 10: {len(records)}")
    
    updated_count = 0
    total_tien_truoc = 0
    total_tien_sau = 0
    update_log = []
    
    for r in records:
        gen_log_id = r["gen_log_id"]
        site_id = r["site_id"]
        date_str = r["date"]
        rd = r.get("run_details") or {}
        
        fuel = rd.get("nhien_lieu_loai") or "Dầu"
        current_don_gia = float(rd.get("don_gia") or 0)
        lit = float(rd.get("nhien_lieu_tieu_hao") or 0)
        current_thanh_tien = float(rd.get("thanh_tien") or round(lit * current_don_gia))
        
        expected_don_gia = float(get_fuel_price_for_date(date_str, fuel))
        expected_thanh_tien = round(lit * expected_don_gia)
        
        if abs(current_don_gia - expected_don_gia) >= 1:
            # Prepare updated run_details
            new_rd = dict(rd)
            new_rd["don_gia"] = expected_don_gia
            new_rd["thanh_tien"] = expected_thanh_tien
            
            # Execute update
            update_res = sb.table("generator_logs")\
                .update({
                    "run_details": new_rd,
                    "updated_at": datetime.now().isoformat()
                })\
                .eq("gen_log_id", gen_log_id)\
                .execute()
                
            updated_count += 1
            total_tien_truoc += current_thanh_tien
            total_tien_sau += expected_thanh_tien
            
            update_log.append({
                "date": date_str,
                "site_id": site_id,
                "loai_may": rd.get("loai_may", ""),
                "fuel": fuel,
                "lit": lit,
                "old_don_gia": current_don_gia,
                "new_don_gia": expected_don_gia,
                "old_tien": current_thanh_tien,
                "new_tien": expected_thanh_tien,
                "diff": current_thanh_tien - expected_thanh_tien
            })
            
    print(f"\n=> ĐÃ CẬP NHẬT THÀNH CÔNG: {updated_count} ca.")
    print(f"Tổng tiền trước điều chỉnh: {total_tien_truoc:,.0f} đ")
    print(f"Tổng tiền sau điều chỉnh:   {total_tien_sau:,.0f} đ")
    print(f"Tiết kiệm / Giảm dôi dư:    {total_tien_truoc - total_tien_sau:,.0f} đ\n")
    
    # Audit verification
    print("=== KIỂM TRA LẠI TOÀN BỘ CƠ SỞ DỮ LIỆU THÁNG 10 ===")
    res_verify = sb.table("generator_logs")\
        .select("gen_log_id, site_id, date, run_details")\
        .gte("date", "2026-10-01")\
        .lte("date", "2026-10-31")\
        .execute()
        
    errors = []
    for r in res_verify.data:
        rd = r.get("run_details") or {}
        fuel = rd.get("nhien_lieu_loai") or "Dầu"
        dg = float(rd.get("don_gia") or 0)
        exp = float(get_fuel_price_for_date(r["date"], fuel))
        if abs(dg - exp) >= 1:
            errors.append((r["site_id"], r["date"], fuel, dg, exp))
            
    if not errors:
        print(">>> TUYỆT VỜI: 100% bản ghi Tháng 10/2026 đã khớp hoàn toàn với bảng giá chuẩn!")
    else:
        print(f">>> CẢNH BÁO: Vẫn còn {len(errors)} bản ghi lệch giá:")
        for e in errors:
            print(e)

if __name__ == "__main__":
    main()
