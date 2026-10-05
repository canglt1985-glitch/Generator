#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script: sync_b4_assets_tvt3.py
Description:
  1. Đọc 4 file nguồn dữ liệu:
     - Danh_sach_thiet_bi_MPD.xlsx (EAM MPD: Mã VT 14 số, Serial, Model, Hãng, Công suất)
     - Danh_sach_thiet_bi_may lanh.xls (EAM Máy lạnh: Mã VT, Serial, BTU, Model)
     - datasite.xlsx (Sheet MPD & MayLanh: Mã tài sản cũ 5300B..., Ngày sử dụng)
     - MBF_Mapping_Ma_TS_DONVI_CU.xlsx (Mapping 5300B... sang 2027B... mới)
     - Danh_sach_17_tram_lech_so_sach_vs_thuc_te.xlsx (17 trạm điều chuyển thực tế vs sổ sách)
     - TVT3-B4. Biểu mẫu chuyên môn sua DHKK &  MPD.xlsx (28 trạm MPĐ đã duyệt chính thức)
  2. Làm giàu dữ liệu vào bảng datasites trên Supabase:
     - infrastructure_info.may_phat_dien.mpd[0]
     - infrastructure_info.may_lanh (danh sách máy lạnh)
  3. Dọn dẹp bảng operation_defects_logs:
     - Quét và sửa lại các bản ghi mô tả sửa máy nổ (như 'Máy hư BO AVR', 'Accu đề máy nổ hỏng', 'Máy đề không được', 'Hư mạch sạc'...)
       nhưng đang bị lưu nhầm category = 'Cột anten' về đúng category = 'Máy phát điện'.
"""

import os
import ssl
import json
import urllib.request
import openpyxl
import pandas as pd
import warnings
warnings.filterwarnings('ignore')

BASE_DATA_DIR = '/Users/cang_it/Library/CloudStorage/GoogleDrive-canglt1985@gmail.com/My Drive/datasite/'
REPAIR_DIR = os.path.join(BASE_DATA_DIR, 'sua chua mpd-dhkk/')

SUPABASE_URL = 'https://lnmoczxjweuifacqujcu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubW9jenhqd2V1aWZhY3F1amN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzcxOTYsImV4cCI6MjA5NDIxMzE5Nn0.C0Si7ChY4T_mxLylSkDNJOUcj9D0uuGW_L4t7p9yONI'

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch_all_datasites():
    print("⏳ Đang tải toàn bộ trạm từ Supabase...")
    url = f"{SUPABASE_URL}/rest/v1/datasites?select=site_id,site_id_old,name,infrastructure_info"
    req = urllib.request.Request(url, headers={
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    })
    with urllib.request.urlopen(req, context=ctx) as resp:
        sites = json.loads(resp.read().decode())
    print(f"✅ Đã tải {len(sites)} trạm từ Supabase.")
    return sites

def update_site_infrastructure(site_id, new_infra):
    url = f"{SUPABASE_URL}/rest/v1/datasites?site_id=eq.{site_id}"
    data = json.dumps({'infrastructure_info': new_infra}).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='PATCH', headers={
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    })
    with urllib.request.urlopen(req, context=ctx) as resp:
        return resp.status in (200, 204)

def load_mbf_mapping():
    print("⏳ Đang tải MBF_Mapping_Ma_TS_DONVI_CU.xlsx...")
    fpath = os.path.join(REPAIR_DIR, 'MBF_Mapping_Ma_TS_DONVI_CU.xlsx')
    wb = openpyxl.load_workbook(fpath, data_only=True)
    s1 = wb['Sheet1']
    mapping = {}
    for r in range(2, s1.max_row + 1):
        m_cu = str(s1.cell(r, 5).value or '').strip()
        m_moi = str(s1.cell(r, 3).value or '').strip()
        if m_cu and m_moi:
            mapping[m_cu] = m_moi
    print(f"✅ Đã tải {len(mapping)} cặp mã chuyển đổi tài sản.")
    return mapping

def load_17_transferred_stations():
    print("⏳ Đang tải danh sách 17 trạm điều chuyển...")
    fpath = os.path.join(REPAIR_DIR, 'Danh_sach_17_tram_lech_so_sach_vs_thuc_te.xlsx')
    wb = openpyxl.load_workbook(fpath, data_only=True)
    s = wb.active
    transferred = {}
    for r in range(2, s.max_row + 1):
        actual = str(s.cell(r, 2).value or '').strip().upper()
        book = str(s.cell(r, 3).value or '').strip().upper()
        erp_code = str(s.cell(r, 4).value or '').strip()
        ma_vt = str(s.cell(r, 5).value or '').strip()
        serial = str(s.cell(r, 6).value or '').strip()
        desc = str(s.cell(r, 7).value or '').strip()
        note = str(s.cell(r, 8).value or '').strip()
        if actual:
            transferred[actual] = {
                'book_site': book if book and book != 'NONE' else actual,
                'erp_code': erp_code,
                'ma_vt': ma_vt,
                'serial': serial,
                'desc': desc,
                'note': note
            }
    print(f"✅ Đã tải {len(transferred)} trạm điều chuyển.")
    return transferred

def load_b4_approved_stations():
    print("⏳ Đang tải 28 trạm MPĐ đã duyệt từ TVT3-B4...")
    fpath = os.path.join(REPAIR_DIR, 'TVT3-B4. Biểu mẫu chuyên môn sua DHKK &  MPD.xlsx')
    wb = openpyxl.load_workbook(fpath, data_only=True)
    s = wb['Máy phát điện_Cố định']
    approved = {}
    for r in range(3, 31):
        site = str(s.cell(r, 3).value or '').strip().upper()
        if site:
            approved[site] = {
                'ma_vt': str(s.cell(r, 6).value or '').strip(),
                'ma_tscd_moi': str(s.cell(r, 7).value or '').strip(),
                'serial': str(s.cell(r, 8).value or '').strip(),
                'start_date': str(s.cell(r, 9).value or '').strip(),
                'brand': str(s.cell(r, 10).value or '').strip(),
                'power': str(s.cell(r, 11).value or '').strip(),
                'repair_count': s.cell(r, 13).value or 0
            }
    print(f"✅ Đã tải {len(approved)} trạm MPĐ đã duyệt.")
    return approved

def load_datasite_excel(mbf_mapping):
    print("⏳ Đang tải datasite.xlsx (MPD & MayLanh)...")
    fpath = os.path.join(BASE_DATA_DIR, 'datasite.xlsx')
    wb = openpyxl.load_workbook(fpath, data_only=True)
    
    # 1. MPD
    s_mpd = wb['MPD']
    ds_mpd = {}
    for r in range(2, s_mpd.max_row + 1):
        sid = str(s_mpd.cell(r, 1).value or '').strip().upper()
        if sid:
            ma_ts_cu = str(s_mpd.cell(r, 10).value or '').strip()
            ma_ts_moi = mbf_mapping.get(ma_ts_cu, '')
            start_date = str(s_mpd.cell(r, 11).value or '').strip()
            # Convert date format DD/MM/YYYY to YYYY-MM-DD
            if '/' in start_date:
                parts = start_date.split('/')
                if len(parts) == 3:
                    start_date = f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
            
            ds_mpd[sid] = {
                'brand': str(s_mpd.cell(r, 3).value or '').strip(),
                'power': str(s_mpd.cell(r, 4).value or '').strip(),
                'serial': str(s_mpd.cell(r, 9).value or '').strip(),
                'ma_ts_cu': ma_ts_cu,
                'ma_ts_moi': ma_ts_moi,
                'start_date': start_date,
                'ma_vt': str(s_mpd.cell(r, 14).value or '').strip()
            }
            
    # 2. MayLanh
    s_ml = wb['MayLanh']
    ds_ml = {}
    for r in range(2, s_ml.max_row + 1):
        sid = str(s_ml.cell(r, 1).value or '').strip().upper()
        if sid:
            if sid not in ds_ml: ds_ml[sid] = []
            s_date = str(s_ml.cell(r, 6).value or '').strip()
            if '/' in s_date:
                parts = s_date.split('/')
                if len(parts) == 3:
                    s_date = f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
            ds_ml[sid].append({
                'name': str(s_ml.cell(r, 2).value or '').strip(),
                'brand': str(s_ml.cell(r, 3).value or '').strip(),
                'power_btu': str(s_ml.cell(r, 4).value or '').strip(),
                'type': str(s_ml.cell(r, 5).value or '').strip(),
                'start_date': s_date,
                'status': str(s_ml.cell(r, 7).value or 'HOẠT ĐỘNG TỐT').strip(),
                'model': str(s_ml.cell(r, 10).value or '').strip(),
                'serial': str(s_ml.cell(r, 11).value or '').strip()
            })
    print(f"✅ datasite.xlsx: {len(ds_mpd)} MPD sites, {len(ds_ml)} MayLanh sites.")
    return ds_mpd, ds_ml

def load_eam_mpd():
    print("⏳ Đang tải Danh_sach_thiet_bi_MPD.xlsx...")
    fpath = os.path.join(REPAIR_DIR, 'Danh_sach_thiet_bi_MPD.xlsx')
    wb = openpyxl.load_workbook(fpath, data_only=True)
    s = wb.active
    eam = {}
    for r in range(3, s.max_row + 1):
        tram = str(s.cell(r, 4).value or '').strip().upper()
        code = tram.split(' - ')[-1].strip() if ' - ' in tram else tram
        ma_vt = str(s.cell(r, 5).value or '').strip()
        if len(ma_vt) < 14 and ma_vt.isdigit():
            ma_vt = ma_vt.zfill(14)
        if code:
            eam[code] = {
                'tram_raw': tram,
                'ma_vt': ma_vt,
                'desc': str(s.cell(r, 6).value or '').strip(),
                'model': str(s.cell(r, 10).value or '').strip(),
                'serial': str(s.cell(r, 12).value or '').strip()
            }
    print(f"✅ Đã tải {len(eam)} thiết bị EAM MPD.")
    return eam

def load_eam_may_lanh():
    print("⏳ Đang tải Danh_sach_thiet_bi_may lanh.xls...")
    fpath = os.path.join(REPAIR_DIR, 'Danh_sach_thiet_bi_may lanh.xls')
    df = pd.read_html(fpath)[0]
    eam_ml = {}
    for _, row in df.iterrows():
        tram = str(row.get('Trạm') or '').strip().upper()
        code = tram.split(' - ')[-1].strip() if ' - ' in tram else tram
        ma_vt = str(row.get('Thiết bị/ vật tư') or '').strip()
        if ma_vt and ma_vt != 'nan':
            # normalize to 14 chars
            ma_vt = ma_vt.split('.')[0]
            if len(ma_vt) < 14 and ma_vt.isdigit():
                ma_vt = ma_vt.zfill(14)
        else:
            ma_vt = ''
            
        serial = str(row.get('Số Serial') or '').strip()
        if serial == 'nan': serial = ''
        
        desc = str(row.get('Tên nhóm TB') or '').strip()
        model = str(row.get('Product code') or '').strip()
        if model == 'nan': model = ''
        
        if code:
            if code not in eam_ml: eam_ml[code] = []
            eam_ml[code].append({
                'tram_raw': tram,
                'ma_vt': ma_vt,
                'desc': desc,
                'model': model,
                'serial': serial
            })
    print(f"✅ Đã tải EAM Máy lạnh cho {len(eam_ml)} trạm.")
    return eam_ml

def clean_operation_defects_logs():
    print("\n🧹 BẮT ĐẦU DỌN DẸP OPERATION_DEFECTS_LOGS...")
    # Fetch all logs with category = 'Cột anten' or 'Nhà trạm' but description is about generator
    url = f"{SUPABASE_URL}/rest/v1/operation_defects_logs?select=log_id,site_id,existing_issues"
    req = urllib.request.Request(url, headers={
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    })
    with urllib.request.urlopen(req, context=ctx) as resp:
        logs = json.loads(resp.read().decode())
    
    mpd_keywords = [
        'máy hư', 'bo avr', 'củ đề', 'bình đề', 'accu đề', 'máy nổ', 'két nước',
        'ats', 'dầu diesel', 'máy phát điện', 'khởi động', 'cháy kích từ',
        'mất pha', 'đề không nổ', 'đề không được', 'mạch sạc', 'sụt bình'
    ]
    
    fixed_count = 0
    for l in logs:
        log_id = l['log_id']
        issues = l.get('existing_issues') or {}
        cat = str(issues.get('category') or '').strip()
        desc = str(issues.get('description') or '').lower()
        dev_type = issues.get('device_type')
        
        # Check if category is mislabeled as Cột anten / Nhà trạm but it's clearly MPD
        if cat in ('Cột anten', 'Nhà trạm', 'Khác') or dev_type == 'MPD_CO_DINH':
            is_mpd = any(k in desc for k in mpd_keywords) or dev_type == 'MPD_CO_DINH'
            if is_mpd and cat != 'Máy phát điện':
                print(f"  Fixing Log {log_id} at {l.get('site_id')}: Category '{cat}' -> 'Máy phát điện' | Desc: '{issues.get('description')}'")
                issues['category'] = 'Máy phát điện'
                issues['device_type'] = 'MPD_CO_DINH'
                
                # Update Supabase
                patch_url = f"{SUPABASE_URL}/rest/v1/operation_defects_logs?log_id=eq.{log_id}"
                pdata = json.dumps({'existing_issues': issues}).encode('utf-8')
                preq = urllib.request.Request(patch_url, data=pdata, method='PATCH', headers={
                    'apikey': SUPABASE_KEY,
                    'Authorization': f'Bearer {SUPABASE_KEY}',
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                })
                with urllib.request.urlopen(preq, context=ctx) as presp:
                    if presp.status in (200, 204):
                        fixed_count += 1
                        
    print(f"✅ Đã dọn dẹp và chuẩn hóa {fixed_count} bản ghi tồn tại bị gán nhầm sang 'Máy phát điện'.")

def main():
    print("=" * 60)
    print("🚀 BẮT ĐẦU ĐỒNG BỘ DỮ LIỆU TÀI SẢN MPĐ & ĐIỀU HÒA B4 (TVT3)")
    print("=" * 60)
    
    # 1. Load data sources
    mbf_map = load_mbf_mapping()
    transferred = load_17_transferred_stations()
    approved_b4 = load_b4_approved_stations()
    ds_mpd, ds_ml = load_datasite_excel(mbf_map)
    eam_mpd = load_eam_mpd()
    eam_ml = load_eam_may_lanh()
    
    # 2. Fetch sites from DB
    sites = fetch_all_datasites()
    
    updated_mpd_count = 0
    updated_ml_count = 0
    total_updated = 0
    
    print("\n⏳ Bắt đầu cập nhật Master Data vào từng trạm...")
    for s in sites:
        db_site_id = s['site_id']
        sid = (s.get('site_id') or '').strip().upper()
        sid_old = (s.get('site_id_old') or '').strip().upper()
        name = s.get('name') or ''
        
        infra = s.get('infrastructure_info') or {}
        infra_modified = False
        
        # --- A. LÀM GIÀU MÁY PHÁT ĐIỆN ---
        # Find matching MPD info
        match_mpd = (
            approved_b4.get(sid) or approved_b4.get(sid_old) or
            transferred.get(sid) or transferred.get(sid_old) or
            ds_mpd.get(sid) or ds_mpd.get(sid_old)
        )
        match_eam_mpd = eam_mpd.get(sid) or eam_mpd.get(sid_old)
        
        # Ensure infra.may_phat_dien exists
        mpd_info = infra.get('may_phat_dien') or {}
        mpds = mpd_info.get('mpd') or []
        
        if match_mpd or match_eam_mpd:
            if not mpds:
                mpds = [{}]
            
            cur_mpd = mpds[0]
            
            # Determine values
            # 1. Mã trạm sổ sách ERP (nếu điều chuyển)
            trans_info = transferred.get(sid) or transferred.get(sid_old)
            if trans_info:
                cur_mpd['ma_erp_tram_so_sach'] = trans_info['book_site']
                cur_mpd['ghi_chu_dieu_chuyen'] = trans_info['note']
            elif 'ma_erp_tram_so_sach' not in cur_mpd:
                cur_mpd['ma_erp_tram_so_sach'] = sid
                
            # 2. Mã VT (14 số)
            ma_vt = (
                approved_b4.get(sid, {}).get('ma_vt') or
                approved_b4.get(sid_old, {}).get('ma_vt') or
                trans_info.get('ma_vt') if trans_info else None or
                match_eam_mpd.get('ma_vt') if match_eam_mpd else None or
                ds_mpd.get(sid, {}).get('ma_vt') or
                ds_mpd.get(sid_old, {}).get('ma_vt') or
                cur_mpd.get('ma_vat_tu') or ''
            )
            if ma_vt and len(ma_vt) < 14 and ma_vt.isdigit():
                ma_vt = ma_vt.zfill(14)
            cur_mpd['ma_vat_tu'] = ma_vt
            
            # 3. Mã TSCĐ mới (15 số, đầu 2027B...)
            ma_tscd = (
                approved_b4.get(sid, {}).get('ma_tscd_moi') or
                approved_b4.get(sid_old, {}).get('ma_tscd_moi') or
                ds_mpd.get(sid, {}).get('ma_ts_moi') or
                ds_mpd.get(sid_old, {}).get('ma_ts_moi') or
                cur_mpd.get('ma_tai_san_moi') or ''
            )
            cur_mpd['ma_tai_san_moi'] = ma_tscd
            
            # 4. Mã tài sản cũ (5300B...)
            ma_ts_cu = (
                ds_mpd.get(sid, {}).get('ma_ts_cu') or
                ds_mpd.get(sid_old, {}).get('ma_ts_cu') or
                cur_mpd.get('ma_tai_san_cu') or ''
            )
            cur_mpd['ma_tai_san_cu'] = ma_ts_cu
            
            # 5. Serial
            serial = (
                approved_b4.get(sid, {}).get('serial') or
                approved_b4.get(sid_old, {}).get('serial') or
                trans_info.get('serial') if trans_info else None or
                match_eam_mpd.get('serial') if match_eam_mpd else None or
                ds_mpd.get(sid, {}).get('serial') or
                ds_mpd.get(sid_old, {}).get('serial') or
                cur_mpd.get('serial') or ''
            )
            cur_mpd['serial'] = serial
            
            # 6. Ngày đưa vào sử dụng
            start_date = (
                approved_b4.get(sid, {}).get('start_date') or
                approved_b4.get(sid_old, {}).get('start_date') or
                ds_mpd.get(sid, {}).get('start_date') or
                ds_mpd.get(sid_old, {}).get('start_date') or
                cur_mpd.get('ngay_dua_vao_su_dung') or ''
            )
            cur_mpd['ngay_dua_vao_su_dung'] = start_date
            
            # 7. Nhãn hiệu & Công suất
            brand = (
                approved_b4.get(sid, {}).get('brand') or
                ds_mpd.get(sid, {}).get('brand') or
                cur_mpd.get('nhan_hieu') or 'KIBII'
            )
            cur_mpd['nhan_hieu'] = brand
            
            power = (
                approved_b4.get(sid, {}).get('power') or
                ds_mpd.get(sid, {}).get('power') or
                cur_mpd.get('cong_suat') or '12'
            )
            cur_mpd['cong_suat'] = power
            
            # 8. Phân loại & Nguồn quản lý
            cur_mpd['phan_loai'] = 'TSCĐ' if ma_tscd else 'Hiện vật'
            cur_mpd['cong_cu_quan_ly'] = 'Datasite'
            if 'so_lan_sua_2025' not in cur_mpd:
                cur_mpd['so_lan_sua_2025'] = approved_b4.get(sid, {}).get('repair_count', 0)
                
            mpd_info['mpd'] = mpds
            infra['may_phat_dien'] = mpd_info
            infra_modified = True
            updated_mpd_count += 1
            
        # --- B. LÀM GIÀU MÁY LẠNH / ĐIỀU HÒA ---
        match_ds_ml = ds_ml.get(sid) or ds_ml.get(sid_old) or []
        match_eam_ml = eam_ml.get(sid) or eam_ml.get(sid_old) or []
        
        if match_ds_ml or match_eam_ml:
            cur_ml_list = infra.get('may_lanh') or []
            if isinstance(cur_ml_list, dict):
                # old format {"so_luong": 2} -> convert to list
                cur_ml_list = []
                
            new_ml_list = []
            
            # Prioritize ds_ml which has start_date, brand, power
            max_len = max(len(match_ds_ml), len(match_eam_ml), len(cur_ml_list), 1)
            for i in range(max_len):
                existing_item = cur_ml_list[i] if i < len(cur_ml_list) else {}
                ds_item = match_ds_ml[i] if i < len(match_ds_ml) else {}
                eam_item = match_eam_ml[i] if i < len(match_eam_ml) else {}
                
                ma_vt = eam_item.get('ma_vt') or existing_item.get('ma_vat_tu') or ''
                serial = ds_item.get('serial') or eam_item.get('serial') or existing_item.get('serial') or ''
                power_btu = ds_item.get('power_btu') or existing_item.get('cong_suat') or '12.000'
                brand = ds_item.get('brand') or existing_item.get('nhan_hieu') or 'DAIKIN-INVERTER'
                start_date = ds_item.get('start_date') or existing_item.get('ngay_dua_vao_su_dung') or '2020-01-01'
                model = ds_item.get('model') or eam_item.get('model') or existing_item.get('product_code') or ''
                status = ds_item.get('status') or existing_item.get('status') or 'HOẠT ĐỘNG TỐT'
                
                new_ml_list.append({
                    'ten': f"MÁY LẠNH ({i+1})",
                    'nhan_hieu': brand,
                    'cong_suat': power_btu,
                    'loai': 'TREO TƯỜNG',
                    'status': status,
                    'serial': serial,
                    'product_code': model,
                    'ma_vat_tu': ma_vt,
                    'ma_tai_san_cu': '',
                    'ma_tai_san_moi': '',
                    'ngay_dua_vao_su_dung': start_date,
                    'phan_loai': 'CCDC',
                    'cong_cu_quan_ly': 'Datasite',
                    'so_lan_sua_2025': 0
                })
                
            infra['may_lanh'] = new_ml_list
            infra_modified = True
            updated_ml_count += 1
            
        if infra_modified:
            ok = update_site_infrastructure(db_site_id, infra)
            if ok:
                total_updated += 1
                if total_updated % 50 == 0:
                    print(f"  ...Đã cập nhật {total_updated} trạm.")
                    
    print(f"\n🎉 HOÀN TẤT ĐỒNG BỘ MASTER DATA:")
    print(f"  - Tổng số trạm đã cập nhật: {total_updated}/{len(sites)}")
    print(f"  - Trạm được làm giàu MPĐ: {updated_mpd_count}")
    print(f"  - Trạm được làm giàu Máy lạnh: {updated_ml_count}")
    
    # 3. Clean defects logs
    clean_operation_defects_logs()
    
    print("\n✅ PHASE 1 ĐÃ HOÀN THÀNH 100%!")

if __name__ == '__main__':
    main()
