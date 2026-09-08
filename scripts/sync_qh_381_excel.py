import os
import math
import ssl
import json
import urllib.request
import pandas as pd

# Environment config
SUPABASE_URL = "https://lnmoczxjweuifacqujcu.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubW9jenhqd2V1aWZhY3F1amN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzcxOTYsImV4cCI6MjA5NDIxMzE5Nn0.C0Si7ChY4T_mxLylSkDNJOUcj9D0uuGW_L4t7p9yONI"

EXCEL_FILE = "/Users/cang_it/Desktop/QH_381_PTM_SKHCN_05_09_2026_Tổ VT5_Ghi chú.xlsx"

tvt3_districts = ['Cẩm Mỹ', 'Thống Nhất', 'Xuân Lộc', 'Long Khánh', 'Định Quán', 'Tân Phú']

def clean_val(v):
    if v is None:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    s = str(v).strip()
    if s == '' or s.lower() == 'nan' or s == '0':
        return None
    return s

def clean_num(v):
    if v is None:
        return None
    try:
        f = float(v)
        if math.isnan(f):
            return None
        return f
    except:
        return None

def main():
    print(f"Reading Excel: {EXCEL_FILE}")
    df = pd.read_excel(EXCEL_FILE, sheet_name='Sheet1', header=1)
    print(f"Total rows in Excel: {len(df)}")

    # Prepare SSL context for Supabase HTTP REST API
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    records_to_upsert = []

    for idx, row in df.iterrows():
        ma_qh_new = clean_val(row.get('MÃ QH mới'))
        if not ma_qh_new:
            continue

        ma_qh_old = clean_val(row.get('Mã QH cũ')) or ma_qh_new
        huyen = clean_val(row.get('Huyện'))
        vung = clean_val(row.get('Vùng'))
        
        # If district is missing, check if prefix indicates TVT3 or district can be mapped
        if not huyen:
            if ma_qh_new.startswith(('TVT3_', 'VTV3_')):
                huyen = 'TVT3'
            elif ma_qh_new.startswith('VKD3_'):
                huyen = 'Tân Phú'
            elif ma_qh_new.startswith('VKD4_'):
                huyen = 'Thống Nhất'

        lat_plan = clean_num(row.get('Vĩ độ'))
        lon_plan = clean_num(row.get('Kinh độ'))
        do_cao = clean_num(row.get('Độ cao'))

        y_kien_skhcn = clean_val(row.get('Ý kiến SKHCN'))
        vb_skhcn = clean_val(row.get('Văn bản SKHCN phản hồi'))
        
        lat_skhcn = clean_num(row.get('Vĩ độ SKHCN chấp thuận'))
        lon_skhcn = clean_num(row.get('Kinh độ SKHCN chấp thuận'))
        do_cao_skhcn = clean_val(row.get('Độ cao SKHCN chấp thuận'))
        kieu_cot_skhcn = clean_val(row.get('Kiểu cột SKHCN chấp thuận'))
        nguyen_nhan_nok = clean_val(row.get('Nguyên nhân SKHCN không chấp thuận xây dựng mới'))
        van_de_cu_the = clean_val(row.get('Vấn đề cụ thể'))
        
        dist_tram_hh = clean_val(row.get('Khoảng cách đến trạm hiện hữu'))
        goi = clean_val(row.get('Gói'))
        viec_can_lam = clean_val(row.get('Việc cần làm'))
        to_comment = clean_val(row.get('Tổ Comment'))
        thong_tin = clean_val(row.get('Thông tin'))

        # Build notes
        notes_parts = []
        if viec_can_lam:
            notes_parts.append(f"Việc cần làm: {viec_can_lam}")
        if to_comment:
            notes_parts.append(f"Ghi chú Tổ: {to_comment}")
        if thong_tin:
            notes_parts.append(f"Thông tin: {thong_tin}")
        
        full_notes = " | ".join(notes_parts) if notes_parts else None

        # Build conflict_notes
        conflict_parts = []
        if nguyen_nhan_nok:
            conflict_parts.append(f"Sở KHCN: {nguyen_nhan_nok}")
        if van_de_cu_the:
            conflict_parts.append(f"Vấn đề: {van_de_cu_the}")
        full_conflict = " | ".join(conflict_parts) if conflict_parts else None

        # Determine stage & status
        current_stage = 'permits'
        overall_status = 'PLANNING'

        if viec_can_lam in ['Trình ký hợp đồng', 'Chuẩn bị hợp đồng', 'Khảo sát để ra hợp đồng']:
            current_stage = 'contract'
            overall_status = 'IN_PROGRESS'
        elif viec_can_lam in ['Thương lượng CSHT có sẵn', 'Triển khai hồ sơ thầu']:
            current_stage = 'permits'
            overall_status = 'IN_PROGRESS'
        elif viec_can_lam in ['Trụ sở Công an', 'Sân bay Long Thành']:
            current_stage = 'survey'
            overall_status = 'IN_PROGRESS'
        elif viec_can_lam == 'Tạm gác lại':
            overall_status = 'CANCELLED'

        record = {
            "planning_id_new": ma_qh_new,
            "planning_id_old": ma_qh_old,
            "latitude_plan": lat_plan,
            "longitude_plan": lon_plan,
            "height": do_cao,
            "region": vung,
            "district": huyen,
            "skhcn_status": y_kien_skhcn,
            "skhcn_confirmed": vb_skhcn,
            "latitude_survey": lat_skhcn,
            "longitude_survey": lon_skhcn,
            "antenna_height_survey": str(do_cao_skhcn) if do_cao_skhcn else None,
            "antenna_type_survey": kieu_cot_skhcn,
            "conflict_notes": full_conflict,
            "power_distance": str(dist_tram_hh) if dist_tram_hh else None,
            "deployment_package": goi,
            "notes": full_notes,
            "current_stage": current_stage,
            "overall_status": overall_status,
            "updated_at": pd.Timestamp.now().isoformat()
        }
        records_to_upsert.append(record)

    # Deduplicate records by planning_id_new (keep last or merge)
    unique_records = {}
    for r in records_to_upsert:
        pid = r["planning_id_new"]
        unique_records[pid] = r
    records_to_upsert = list(unique_records.values())

    print(f"Total unique records to upsert: {len(records_to_upsert)}")

    # Upsert in chunks to Supabase REST API
    url = f"{SUPABASE_URL}/rest/v1/infrastructure_projects?on_conflict=planning_id_new"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    }

    chunk_size = 50
    success_count = 0
    for i in range(0, len(records_to_upsert), chunk_size):
        chunk = records_to_upsert[i:i + chunk_size]
        body = json.dumps(chunk, ensure_ascii=False).encode('utf-8')
        req = urllib.request.Request(url, data=body, headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req, context=ctx) as resp:
                print(f"Upserted chunk {i//chunk_size + 1}/{(len(records_to_upsert)-1)//chunk_size + 1} (Status: {resp.status})")
                success_count += len(chunk)
        except Exception as e:
            print(f"Error upserting chunk {i}: {e}")
            if hasattr(e, 'read'):
                print("Response error body:", e.read().decode())

    print(f"\nSuccessfully synced {success_count} / {len(records_to_upsert)} sites to Supabase!")

if __name__ == '__main__':
    main()
