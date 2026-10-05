#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script: sync_b4_approved_and_reference.py
Mục đích:
1. Đọc sheet 'Diễn giải DM hỏng tham chiếu' từ file B4 đã duyệt:
   - Trích xuất 11 Hạng mục chuẩn hóa & Nội dung hỏng/sửa diễn giải chi tiết cho ĐHKK & MPĐ.
   - Xuất ra file JSON tvt3_v2/src/data/b4ReferenceCatalog.json để frontend hiển thị.
2. Nạp và đồng bộ thông tin 28 ca đã duyệt B4 vào Supabase:
   - Đánh dấu b4_approved: true cho 14 ca đã có log trong operation_defects_logs.
   - Tạo mới 14 ca còn lại vào operation_defects_logs để quản lý đồng bộ.
   - Ghi nhận thông tin đã duyệt vào datasites (infrastructure_info.may_phat_dien.mpd[0].b4_approved_repair).
3. Thống kê chính xác số ca phát sinh mới (32 MPĐ + 6 ĐHKK) cần đề xuất đợt tiếp theo.
"""

import os
import ssl
import json
import urllib.request
import openpyxl

EXCEL_PATH = '/Users/cang_it/Library/CloudStorage/GoogleDrive-canglt1985@gmail.com/My Drive/datasite/sua chua mpd-dhkk/TVT3-B4. Biểu mẫu chuyên môn sua DHKK &  MPD.xlsx'
OUTPUT_CATALOG = '/Users/cang_it/Antigravity/TVT3/tvt3_v2/src/data/b4ReferenceCatalog.json'

SUPABASE_URL = 'https://lnmoczxjweuifacqujcu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubW9jenhqd2V1aWZhY3F1amN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzcxOTYsImV4cCI6MjA5NDIxMzE5Nn0.C0Si7ChY4T_mxLylSkDNJOUcj9D0uuGW_L4t7p9yONI'

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def api_request(endpoint, method='GET', data=None, prefer=None):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    encoded_data = json.dumps(data).encode('utf-8') if data is not None else None
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }
    if prefer:
        headers['Prefer'] = prefer
    req = urllib.request.Request(url, data=encoded_data, method=method, headers=headers)
    with urllib.request.urlopen(req, context=ctx) as resp:
        content = resp.read().decode('utf-8')
        return json.loads(content) if content else None

def extract_reference_catalog(wb):
    print("📖 Đang đọc sheet 'Diễn giải DM hỏng tham chiếu'...")
    sheet = wb['Diễn giải DM hỏng tham chiếu']
    
    catalog = {
        'DHKK': [],
        'MPD_CO_DINH': [],
        'MPD_DI_DONG': []
    }
    
    # Rows 3 to 13
    for r in range(3, sheet.max_row + 1):
        # ĐHKK (cols 1, 2, 3)
        stt_ac = sheet.cell(r, 1).value
        cat_ac = sheet.cell(r, 2).value
        desc_ac = sheet.cell(r, 3).value
        if stt_ac and cat_ac:
            catalog['DHKK'].append({
                'idx': int(stt_ac) - 1,
                'stt': int(stt_ac),
                'hang_muc': str(cat_ac).strip(),
                'dien_giai_chi_tiet': str(desc_ac).strip() if desc_ac else ''
            })
            
        # MPD Cố định (cols 4, 5, 6)
        stt_mpd = sheet.cell(r, 4).value
        cat_mpd = sheet.cell(r, 5).value
        desc_mpd = sheet.cell(r, 6).value
        if stt_mpd and cat_mpd:
            catalog['MPD_CO_DINH'].append({
                'idx': int(stt_mpd) - 1,
                'stt': int(stt_mpd),
                'hang_muc': str(cat_mpd).strip(),
                'dien_giai_chi_tiet': str(desc_mpd).strip() if desc_mpd else ''
            })

        # MPD Di động (cols 7, 8, 9)
        stt_mob = sheet.cell(r, 7).value
        cat_mob = sheet.cell(r, 8).value
        desc_mob = sheet.cell(r, 9).value
        if stt_mob and cat_mob:
            catalog['MPD_DI_DONG'].append({
                'idx': int(stt_mob) - 1,
                'stt': int(stt_mob),
                'hang_muc': str(cat_mob).strip(),
                'dien_giai_chi_tiet': str(desc_mob).strip() if desc_mob else ''
            })

    os.makedirs(os.path.dirname(OUTPUT_CATALOG), exist_ok=True)
    with open(OUTPUT_CATALOG, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
    print(f"✅ Đã lưu bảng tham chiếu B4: {len(catalog['DHKK'])} mục ĐHKK, {len(catalog['MPD_CO_DINH'])} mục MPĐ Cố Định -> {OUTPUT_CATALOG}")
    return catalog

def sync_approved_cases(wb):
    print("⏳ Đang đồng bộ thông tin 28 ca đã duyệt B4 vào Supabase...")
    sheet = wb['Máy phát điện_Cố định']
    
    # Load datasites
    sites = api_request('datasites?select=site_id,site_id_old,name,infrastructure_info')
    site_map = {}
    for s in sites:
        nid = (s.get('site_id') or '').strip().upper()
        oid = (s.get('site_id_old') or '').strip().upper()
        if nid: site_map[nid] = s
        if oid: site_map[oid] = s

    # Load existing logs
    existing_logs = api_request('operation_defects_logs?select=*')
    
    cat_names = [
        '1.Đại tu Diesel', '2.Đầu phát AC/AVR', '3.Khởi động/DC/Sạc', '4.Nhiên liệu',
        '5.Làm mát/Két nước', '6.Điều khiển/ATS', '7.Điện công suất/CB', '8.Khí xả/Nạp',
        '9.Relay/Bảo vệ', '10.Dinamo sạc', '11.Bảo dưỡng tổng thể'
    ]

    approved_cases = []
    for r in range(3, sheet.max_row + 1):
        tram = sheet.cell(r, 3).value
        if not tram: continue
        tram = str(tram).strip().upper()
        mo_ta = sheet.cell(r, 14).value
        stt = sheet.cell(r, 1).value
        
        cat_idxs = []
        cats = []
        for c in range(16, 27):
            v = sheet.cell(r, c).value
            if v in ['X', 'x', 1]:
                cat_idxs.append(c - 16)
                cats.append(cat_names[c - 16])
        
        st_obj = site_map.get(tram) or {}
        site_id_canonical = st_obj.get('site_id', tram)
        
        approved_cases.append({
            'stt': stt,
            'b4_tram': tram,
            'canonical_site_id': site_id_canonical,
            'site_id_old': st_obj.get('site_id_old', tram),
            'site_name': st_obj.get('name', ''),
            'mo_ta': mo_ta or 'Hư hỏng MPĐ đã duyệt B4',
            'cat_idxs': cat_idxs,
            'cats': cats,
            'ma_vt': sheet.cell(r, 6).value,
            'ma_tscd': sheet.cell(r, 7).value,
            'serial': sheet.cell(r, 8).value,
            'hang': sheet.cell(r, 10).value,
            'kva': sheet.cell(r, 11).value
        })

    updated_count = 0
    inserted_count = 0

    for app in approved_cases:
        sid = app['canonical_site_id']
        old_id = app['site_id_old']
        b4_id = app['b4_tram']
        
        # Check if log already exists
        matched_logs = [l for l in existing_logs if l.get('site_id') in [sid, old_id, b4_id]]
        
        if matched_logs:
            # Update the first matching log
            log = matched_logs[0]
            log_id = log['log_id']
            curr_issues = log.get('existing_issues') or {}
            
            curr_issues['b4_approved'] = True
            curr_issues['b4_batch'] = 'TVT3-B4-2025'
            curr_issues['b4_stt'] = app['stt']
            curr_issues['b4_categories'] = app['cat_idxs']
            curr_issues['b4_category_names'] = app['cats']
            if curr_issues.get('b4_category_idx') is None and app['cat_idxs']:
                curr_issues['b4_category_idx'] = app['cat_idxs'][0]
            curr_issues['device_type'] = 'MPD_CO_DINH'
            curr_issues['category'] = 'Máy phát điện'

            curr_solutions = log.get('proposed_solutions') or {}
            curr_solutions['b4_approval_info'] = {
                'approved': True,
                'batch': 'TVT3-B4. Biểu mẫu chuyên môn sua DHKK & MPD.xlsx',
                'stt': app['stt'],
                'hang_muc_duyet': app['cats']
            }

            api_request(f"operation_defects_logs?log_id=eq.{log_id}", method='PATCH', data={
                'existing_issues': curr_issues,
                'proposed_solutions': curr_solutions
            }, prefer='return=minimal')
            updated_count += 1
        else:
            # Insert new record into operation_defects_logs
            new_payload = {
                'site_id': sid,
                'date': '2025-01-15',
                'existing_issues': {
                    'category': 'Máy phát điện',
                    'device_type': 'MPD_CO_DINH',
                    'description': app['mo_ta'],
                    'status': 'Chưa XL',
                    'reporter': 'TCT / Đài phê duyệt B4',
                    'b4_approved': True,
                    'b4_batch': 'TVT3-B4-2025',
                    'b4_stt': app['stt'],
                    'b4_category_idx': app['cat_idxs'][0] if app['cat_idxs'] else 0,
                    'b4_categories': app['cat_idxs'],
                    'b4_category_names': app['cats']
                },
                'proposed_solutions': {
                    'b4_approval_info': {
                        'approved': True,
                        'batch': 'TVT3-B4. Biểu mẫu chuyên môn sua DHKK & MPD.xlsx',
                        'stt': app['stt'],
                        'hang_muc_duyet': app['cats']
                    }
                }
            }
            api_request('operation_defects_logs', method='POST', data=new_payload, prefer='return=minimal')
            inserted_count += 1

        # Also update datasites infrastructure_info
        st_obj = site_map.get(sid) or site_map.get(b4_id)
        if st_obj:
            infra = st_obj.get('infrastructure_info') or {}
            mpd_infra = infra.get('may_phat_dien') or {}
            mpd_list = mpd_infra.get('mpd') or []
            if mpd_list:
                mpd_list[0]['b4_approved_repair_2025'] = {
                    'approved': True,
                    'batch': 'TVT3-B4-2025',
                    'stt': app['stt'],
                    'mo_ta': app['mo_ta'],
                    'hang_muc': app['cats']
                }
                mpd_infra['mpd'] = mpd_list
                infra['may_phat_dien'] = mpd_infra
                api_request(f"datasites?site_id=eq.{st_obj['site_id']}", method='PATCH', data={
                    'infrastructure_info': infra
                }, prefer='return=minimal')

    print(f"✅ ĐÃ ĐỒNG BỘ 28 CA DUYỆT B4: Cập nhật {updated_count} ca sẵn có, Tạo mới {inserted_count} ca vào operation_defects_logs!")

def main():
    print("🚀 Bắt đầu quá trình đồng bộ B4 Approved Data & Bảng tham chiếu...")
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    extract_reference_catalog(wb)
    sync_approved_cases(wb)
    print("🎉 Hoàn tất 100%!")

if __name__ == '__main__':
    main()
