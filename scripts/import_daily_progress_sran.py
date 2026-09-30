#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script import và cập nhật dữ liệu tiến độ dự án SRAN 5G từ file Daily Progress:
/Users/cang_it/Desktop/MBF Dong Nai_S1S4_Daily_Progress_ 20260929.xlsx
vào bảng sran_5g_tracker trên Supabase.
"""

import os
import sys
import json
from datetime import datetime, date
import openpyxl
from dotenv import load_dotenv
from supabase import create_client

# Load môi trường
load_dotenv('/Users/cang_it/Antigravity/TVT3/tvt3_v2/.env')
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL', 'https://lnmoczxjweuifacqujcu.supabase.co')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_KEY:
    print("❌ Không tìm thấy VITE_SUPABASE_ANON_KEY trong file .env!")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

EXCEL_FILE = "/Users/cang_it/Desktop/MBF Dong Nai_S1S4_Daily_Progress_ 20260929.xlsx"

if not os.path.exists(EXCEL_FILE):
    print(f"❌ File không tồn tại: {EXCEL_FILE}")
    sys.exit(1)

def format_date_str(val):
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.strftime("%Y-%m-%d")
    s = str(val).strip()
    if not s or s.lower() in ['none', 'null', 'nan', '-', '#n/a']:
        return None
    # Xử lý các định dạng ngày chuỗi thông dụng
    for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%m/%d/%Y', '%Y/%m/%d']:
        try:
            return datetime.strptime(s.split(' ')[0], fmt).strftime("%Y-%m-%d")
        except Exception:
            pass
    return s[:10]

def main():
    print(f"📂 Đang mở file Excel: {EXCEL_FILE}...")
    wb = openpyxl.load_workbook(EXCEL_FILE, data_only=True)
    
    if "Master_Tracker" not in wb.sheetnames:
        print("❌ Không tìm thấy sheet 'Master_Tracker' trong file Excel!")
        sys.exit(1)
        
    ws = wb["Master_Tracker"]
    print(f"✅ Đã tải sheet Master_Tracker (Số dòng: {ws.max_row}, Số cột: {ws.max_column})")
    
    # Đọc headers từ dòng 2
    headers = [cell.value for cell in ws[2]]
    col_map = {}
    for idx, h in enumerate(headers):
        if h:
            col_map[str(h).strip()] = idx
            
    print(f"📋 Tổng số cột header tìm thấy: {len(col_map)}")
    
    # Đọc dữ liệu từ dòng 3
    records = []
    tvt3_districts = {'Cẩm Mỹ', 'Thống Nhất', 'Xuân Lộc', 'Xuân Thành', 'Long Khánh', 'Định Quán', 'Tân Phú'}
    tvt3_count = 0
    
    for r in range(3, ws.max_row + 1):
        row_vals = [ws.cell(r, c + 1).value for c in range(len(headers))]
        if not any(row_vals):
            continue
            
        def get_val(h_name):
            idx = col_map.get(h_name)
            if idx is not None and idx < len(row_vals):
                v = row_vals[idx]
                return v if v is not None else None
            return None
            
        site_id_new = str(get_val('Site_ID (New)') or '').strip()
        site_id_old = get_val('Radio_ID') or get_val('Baseband_ID') or get_val('New_SiteID')
        site_id_old_str = str(site_id_old).strip() if site_id_old else None
        
        site_id = site_id_new if (site_id_new and site_id_new != '0') else site_id_old_str
        if not site_id:
            continue
            
        district = str(get_val('District_Old') or '').strip() or None
        if district in tvt3_districts:
            tvt3_count += 1
            
        # Giải pháp nguồn điện
        ps_sol = str(get_val('Power_Solution') or get_val('3G4G_Power_Solution') or get_val('5G_Power_Solution') or '').strip()
        new_cab = str(get_val('New_Power_Cabinet') or get_val('MBF_Add_Power_Cabinet') or get_val('MBF_Swap_Power_Cabinet') or '').strip()
        new_rect = str(get_val('New_Rectifier') or get_val('MBF_Add_Rectifier') or '').strip()
        ps_parts = []
        if ps_sol: ps_parts.push(ps_sol) if hasattr(ps_parts, 'push') else ps_parts.append(ps_sol)
        if new_cab == '1': ps_parts.append('Lắp Tủ Nguồn Mới')
        if new_rect and new_rect not in ['0', 'None']: ps_parts.append(f'Thêm Rectifier (+{new_rect})')
        power_solution_str = ' | '.join(ps_parts) if ps_parts else None

        # Phân định rõ ràng: Ngày Swap 4G SRAN vs Ngày Onair 5G
        swap_date_val = format_date_str(get_val('Onair_SRAN_Actual_Date'))
        onair_5g_val = format_date_str(get_val('Onair_Actual_Date') or get_val('Onair_NR26_Actual_Date') or get_val('Onair_NR38_Actual_Date'))

        raw_scope_5g = str(get_val('5G_Scope') or '').strip()
        scope_5g_val = None if (not raw_scope_5g or raw_scope_5g.lower() in ['none', 'null', '-']) else raw_scope_5g

        raw_cfg_5g = str(get_val('5G_Config') or '').strip()
        config_5g_val = None if (not raw_cfg_5g or raw_cfg_5g.lower() in ['none', 'null', '-', '0']) else raw_cfg_5g

        # Trích xuất raw_data bổ trợ cho UI
        raw_info = {
            "Cluster_New": str(get_val('Cluster_New') or '').strip() or None,
            "Cluster_Name": str(get_val('Cluster_Name') or '').strip() or None,
            "Order_Sep": str(get_val('Order_Sep') or get_val('Swap_Order') or '').strip() or None,
            "Swap_Order": str(get_val('Swap_Order') or '').strip() or None,
            "Partner_Name": str(get_val('Partner_Name') or get_val('Partner_Sub') or get_val('DVT') or '').strip() or 'HTKT',
            "DVT": str(get_val('DVT') or '').strip() or None,
            "Onair_SRAN_Actual_Date": swap_date_val,
            "Swap_3G4G": swap_date_val,
            "Onair_Actual_Date": onair_5g_val,
            "Onair_NR38_Actual_Date": format_date_str(get_val('Onair_NR38_Actual_Date')),
            "Onair_NR26_Actual_Date": format_date_str(get_val('Onair_NR26_Actual_Date')),
            "5G_Scope": scope_5g_val,
            "5G_Config": config_5g_val,
            "Site_Status": str(get_val('Site_Status') or '').strip() or None,
            "Monthly_Target_IM": str(get_val('Monthly_Target_IM') or '').strip() or None,
        }

        record = {
            "site_id": site_id,
            "site_id_old": site_id_old_str,
            "row_id": str(get_val('Row_ID') or '').strip() or None,
            "pack_po": str(get_val('Pack_PO') or '').strip() or None,
            "province": str(get_val('Province_old') or get_val('TVT') or 'Đồng Nai').strip(),
            "district": district,
            "unique_id": str(get_val('Unique_ID') or '').strip() or None,
            "scope_3g4g": str(get_val('3G4G_Scope') or '').strip() or None,
            "config_3g4g": str(get_val('3G4G Config') or '').strip() or None,
            "scope_5g": scope_5g_val,
            "config_5g": config_5g_val,
            "swap_solution": str(get_val('Swap_Solution') or get_val('Solution_Remark') or '').strip() or None,
            "power_solution": power_solution_str,
            "monthly_target_im": str(get_val('Monthly_Target_IM') or '').strip() or None,
            "survey_date": format_date_str(get_val('Survey_Actual_Date')),
            "tssr_sub_date": format_date_str(get_val('SSR_1st_Submitted_Date')),
            "ie_app_date": format_date_str(get_val('SSR_Checked_By_Eric_IE_Date')),
            "rf_app_date": format_date_str(get_val('SSR_Checked_By_Eric_RF_Date')),
            "rf_design_date": format_date_str(get_val('RF_Physical_Design_Approved_Date')),
            "script_date": format_date_str(get_val('Script_Readiness_Date')),
            "wh_pickup_date": format_date_str(get_val('WH_Pickup_Date')),
            "delivery_date": format_date_str(get_val('Delivery_Actual_Date')),
            "install_date": format_date_str(get_val('Installation_Actual_Date') or get_val('Installation_Completed_Date')),
            "integration_date": format_date_str(get_val('Integration_Actual_Date') or get_val('3G4G_Integration_Actual_Date')),
            "swap_date": swap_date_val,
            "onair_date": onair_5g_val,
            "issue_type": str(get_val('Issue_Type') or '').strip() or None,
            "remarks": str(get_val('Remarks') or get_val('Scope_Remarks') or '').strip() or None,
            "raw_data": raw_info,
            "updated_at": datetime.now().isoformat()
        }
        records.append(record)

    print(f"\n📊 Đã phân tích thành công {len(records)} trạm (Trong đó có {tvt3_count} trạm thuộc TVT3)")

    # Deduplicate by site_id
    unique_records = {}
    for r in records:
        unique_records[r["site_id"]] = r
    deduped = list(unique_records.values())

    print(f"🚀 Bắt đầu cập nhật {len(deduped)} trạm vào Supabase (bảng sran_5g_tracker)...")
    chunk_size = 100
    total_upserted = 0

    for i in range(0, len(deduped), chunk_size):
        chunk = deduped[i:i + chunk_size]
        try:
            res = supabase.table('sran_5g_tracker').upsert(chunk, on_conflict='site_id').execute()
            total_upserted += len(chunk)
            print(f"  ✓ Đã cập nhật lô {i // chunk_size + 1}: {total_upserted}/{len(deduped)} trạm")
        except Exception as e:
            print(f"  ❌ Lỗi lô {i // chunk_size + 1}: {e}")

    # Thống kê nhanh dữ liệu TVT3
    tvt3_items = [r for r in deduped if r['district'] in tvt3_districts]
    tvt3_onair = [r for r in tvt3_items if r['onair_date']]
    tvt3_integ = [r for r in tvt3_items if r['integration_date']]
    tvt3_install = [r for r in tvt3_items if r['install_date']]
    tvt3_delivery = [r for r in tvt3_items if r['delivery_date']]
    tvt3_5g = [r for r in tvt3_items if r['scope_5g'] and '5G' in str(r['scope_5g']).upper() and 'NONE' not in str(r['scope_5g']).upper()]
    tvt3_5g_onair = [r for r in tvt3_5g if r['onair_date'] or (r['raw_data'] and r['raw_data'].get('Onair_NR38_Actual_Date'))]

    print("\n" + "=" * 60)
    print("🎉 HOÀN TẤT ĐỒNG BỘ TIẾN ĐỘ DỰ ÁN SRAN 5G LÊN SUPABASE!")
    print("=" * 60)
    print(f"• Tổng số trạm đã cập nhật: {total_upserted} trạm")
    print(f"• Trạm thuộc địa bàn TVT3 (6 huyện): {len(tvt3_items)} trạm")
    print(f"  + Đã giao hàng (Delivery): {len(tvt3_delivery)}/{len(tvt3_items)} ({len(tvt3_delivery)/len(tvt3_items)*100:.1f}%)")
    print(f"  + Đã lắp đặt (Install): {len(tvt3_install)}/{len(tvt3_items)} ({len(tvt3_install)/len(tvt3_items)*100:.1f}%)")
    print(f"  + Đã tích hợp (Integration): {len(tvt3_integ)}/{len(tvt3_items)} ({len(tvt3_integ)/len(tvt3_items)*100:.1f}%)")
    print(f"  + Đã phát sóng On-air: {len(tvt3_onair)}/{len(tvt3_items)} ({len(tvt3_onair)/len(tvt3_items)*100:.1f}%)")
    print(f"  + Tổng vị trí có 5G: {len(tvt3_5g)} trạm (Đã phát sóng 5G: {len(tvt3_5g_onair)} trạm)")

if __name__ == '__main__':
    main()
