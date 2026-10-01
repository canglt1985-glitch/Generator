#!/usr/bin/env python3
"""
apply_hstt_without_august.py
Cập nhật file Ho_So_Thanh_Toan_Chuan_Mau_09_2026_HSTT.xlsx:
1. Dựa theo file HSTT:
   - Giữ nguyên 100% 02A đã import hệ thống (30,337,339 đ và 71,268,583 đ), đã sort 2 cấp (Ngày ASC -> ID Trạm ASC).
   - Bảng Map hóa đơn sort theo ID Trạm (A -> Z).
2. Không sử dụng hóa đơn tháng 8 và hóa đơn thừa:
   - HD_DongNai_67Tram: Chỉ gồm 12 HĐ thực tế sử dụng của tháng 9 (11 Dầu + 1 Xăng 656300).
   - HD_ToanCau: Chỉ gồm 41 HĐ thực tế sử dụng của tháng 9 (21 Dầu + 20 Xăng).
3. Chuyển hóa đơn tháng 8 qua sheet hóa đơn dư thừa:
   - Toàn bộ 7 HĐ tháng 8 (626737, 629143, 630818, 624714, 625216, 191836, 629141) được chuyển sang HD_Du_Thua_Khong_Su_Dung.
   - Toàn bộ hóa đơn thừa (17 HĐ xăng ĐN, 10 HĐ xăng TC, cùng các HĐ dự phòng khác) cũng nằm trong HD_Du_Thua_Khong_Su_Dung.
"""

import os
from collections import defaultdict
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

SUPABASE_URL = "https://lnmoczxjweuifacqujcu.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubW9jenhqd2V1aWZhY3F1amN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzcxOTYsImV4cCI6MjA5NDIxMzE5Nn0.C0Si7ChY4T_mxLylSkDNJOUcj9D0uuGW_L4t7p9yONI")

def get_site_lookup():
    try:
        from supabase import create_client
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        res = supabase.from_("datasites").select("site_id, site_id_old, name, location_info").execute()
        sites = {}
        for s in res.data or []:
            name = s.get("name") or ""
            loc = s.get("location_info") or {}
            dist = loc.get("district") or ""
            sid = s.get("site_id")
            sold = s.get("site_id_old")
            label = f"{name} ({dist})" if name and dist else (name or dist)
            if sid: sites[sid] = label
            if sold: sites[sold] = label
        return sites
    except Exception as e:
        print(f"Warning: Failed to fetch site lookup from Supabase: {e}")
        return {}

def clear_sheet_from_row(ws, from_row):
    for rng in list(ws.merged_cells.ranges):
        if rng.min_row >= from_row:
            ws.unmerge_cells(str(rng))
    if ws.max_row >= from_row:
        ws.delete_rows(from_row, ws.max_row - from_row + 1)

def extract_and_sort_02a(ws, xang_range, dau_range):
    xang_rows = []
    for r in range(xang_range[0], xang_range[1] + 1):
        vals = [ws.cell(r, c).value for c in range(1, 16)]
        xang_rows.append(vals)

    dau_rows = []
    for r in range(dau_range[0], dau_range[1] + 1):
        vals = [ws.cell(r, c).value for c in range(1, 16)]
        dau_rows.append(vals)

    # Sort key: Col 7 (Ngày vận hành ASC), Col 3 (ID Trạm ASC)
    xang_sorted = sorted(xang_rows, key=lambda x: (str(x[6])[:10], str(x[2]).strip()))
    dau_sorted = sorted(dau_rows, key=lambda x: (str(x[6])[:10], str(x[2]).strip()))

    for idx, row in enumerate(xang_sorted, 1):
        row[0] = idx
    for idx, row in enumerate(dau_sorted, 1):
        row[0] = idx

    return xang_sorted, dau_sorted

def run_waterfall_allocation(stations_dict, inv_list):
    sorted_trams = sorted(stations_dict.keys())
    sorted_invs = sorted(inv_list, key=lambda x: (x['ngay'], x['so_hd']))

    allocations = []
    inv_idx = 0
    inv_rem_money = sorted_invs[0]['tong_tien'] if sorted_invs else 0
    inv_used = defaultdict(float)

    for tram_id in sorted_trams:
        needed = stations_dict[tram_id]['tien']
        tram_lit = stations_dict[tram_id]['lit']
        first_row = True
        while needed > 0.01:
            if inv_idx >= len(sorted_invs):
                break
            cur_inv = sorted_invs[inv_idx]
            alloc_amt = min(needed, inv_rem_money)
            allocations.append({
                'tram_id': tram_id,
                'tram_tien': stations_dict[tram_id]['tien'] if first_row else None,
                'tram_lit': tram_lit if first_row else None,
                'so_hd': cur_inv['so_hd'],
                'tien_gan': alloc_amt,
                'inv': cur_inv,
                'ten_tram': stations_dict[tram_id]['ten'],
            })
            first_row = False
            needed -= alloc_amt
            inv_rem_money -= alloc_amt
            inv_used[cur_inv['so_hd']] += alloc_amt

            if inv_rem_money <= 0.01:
                inv_idx += 1
                if inv_idx < len(sorted_invs):
                    inv_rem_money = sorted_invs[inv_idx]['tong_tien']

    used_inv_list = [inv for inv in sorted_invs if inv_used[inv['so_hd']] > 0]
    unused_inv_list = [inv for inv in sorted_invs if inv_used[inv['so_hd']] == 0]
    return allocations, used_inv_list, unused_inv_list, inv_used

def main():
    hstt_path = "/Users/cang_it/Desktop/Ho_So_Thanh_Toan_Chuan_Mau_09_2026_HSTT.xlsx"
    hstt_backup_path = "/Users/cang_it/Desktop/Ho_So_Thanh_Toan_Chuan_Mau_09_2026_HSTT_backup.xlsx"
    file_111_path = "/Users/cang_it/Desktop/Ho_So_Thanh_Toan_Chuan_Mau_09_2026_111.xlsx"

    print("Loading pristine workbooks...")
    wb_hstt = openpyxl.load_workbook(hstt_backup_path)
    wb_111 = openpyxl.load_workbook(file_111_path, data_only=True)

    site_lookup = get_site_lookup()

    # Common styles
    thin_side = Side(style='thin', color='D0D7DE')
    thin_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
    double_bottom_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=Side(style='double', color='000000'))
    sum_fill = PatternFill(start_color='FEF08A', end_color='FEF08A', fill_type='solid')

    font_body = Font(name='Times New Roman', size=9)
    font_bold = Font(name='Times New Roman', size=9, bold=True)
    font_link = Font(name='Times New Roman', size=9, color='0284C7', underline='single')

    # =========================================================================
    # STEP 1: SORT 02A (2 CẤP: NGÀY ASC -> ID TRẠM ASC)
    # =========================================================================
    print("Sorting 02A Nhóm 1...")
    ws_02a_g1 = wb_hstt['02A_TTNB_DongNai_67Tram']
    g1_xang_sorted, g1_dau_sorted = extract_and_sort_02a(ws_02a_g1, (13, 21), (26, 118))
    for idx, row in enumerate(g1_xang_sorted, 13):
        for c_idx, val in enumerate(row, 1):
            ws_02a_g1.cell(idx, c_idx, val)
    for idx, row in enumerate(g1_dau_sorted, 26):
        for c_idx, val in enumerate(row, 1):
            ws_02a_g1.cell(idx, c_idx, val)

    print("Sorting 02A Nhóm 2...")
    ws_02a_g2 = wb_hstt['02A_TTNB_ToanCau']
    g2_xang_sorted, g2_dau_sorted = extract_and_sort_02a(ws_02a_g2, (13, 62), (67, 211))
    for idx, row in enumerate(g2_xang_sorted, 13):
        for c_idx, val in enumerate(row, 1):
            ws_02a_g2.cell(idx, c_idx, val)
    for idx, row in enumerate(g2_dau_sorted, 67):
        for c_idx, val in enumerate(row, 1):
            ws_02a_g2.cell(idx, c_idx, val)

    # =========================================================================
    # STEP 2: EXTRACT INVOICES & DEMANDS
    # =========================================================================
    def get_demands_from_rows(xang_rows, dau_rows):
        x_tram = defaultdict(lambda: {'lit': 0.0, 'tien': 0.0, 'ten': ''})
        d_tram = defaultdict(lambda: {'lit': 0.0, 'tien': 0.0, 'ten': ''})
        for r in xang_rows:
            tid = str(r[2]).strip()
            x_tram[tid]['lit'] += float(r[10] or 0)
            x_tram[tid]['tien'] += float(r[12] or 0)
            x_tram[tid]['ten'] = site_lookup.get(tid) or str(r[1] or '').strip()
        for r in dau_rows:
            tid = str(r[2]).strip()
            d_tram[tid]['lit'] += float(r[10] or 0)
            d_tram[tid]['tien'] += float(r[12] or 0)
            d_tram[tid]['ten'] = site_lookup.get(tid) or str(r[1] or '').strip()
        return x_tram, d_tram

    g1_x_tram, g1_d_tram = get_demands_from_rows(g1_xang_sorted, g1_dau_sorted)
    g2_x_tram, g2_d_tram = get_demands_from_rows(g2_xang_sorted, g2_dau_sorted)

    # 1. Extract original HSTT September invoices
    def extract_hstt_invoices(ws, phap_nhan):
        invs = []
        for r in range(8, ws.max_row+1):
            c1 = ws.cell(r, 1).value
            if not c1 or 'TỔNG' in str(c1): continue
            invs.append({
                'stt': c1, 'ngay': str(ws.cell(r, 2).value)[:10], 'so_hd': str(ws.cell(r, 3).value).strip(),
                'don_vi_ban': ws.cell(r, 4).value, 'loai_nl': ws.cell(r, 5).value, 'dien_giai': ws.cell(r, 6).value,
                'lit': float(ws.cell(r, 7).value or 0), 'mst_ban': str(ws.cell(r, 8).value or '').strip(),
                'mau_so': ws.cell(r, 9).value, 'ky_hieu': ws.cell(r, 10).value,
                'tien_chua_vat': float(ws.cell(r, 11).value or 0), 'vat': float(ws.cell(r, 12).value or 0),
                'tong_tien': float(ws.cell(r, 13).value or 0), 'link': ws.cell(r, 14).value, 'fkey': ws.cell(r, 15).value,
                'phap_nhan': phap_nhan
            })
        return invs

    # In HSTT_backup, read from pristine sheets
    g1_hstt_invs = extract_hstt_invoices(wb_hstt['HD_DongNai_67Tram'], 'Đồng Nai')
    g2_hstt_invs = extract_hstt_invoices(wb_hstt['HD_ToanCau'], 'Toàn Cầu')

    # Ensure 193490, 193491, 193783, 194098 have proper values
    real_fixes = {
        '193490': {'loai_nl': 'Dầu', 'dien_giai': 'Dầu Điêzen 0,001S', 'lit': 50.2, 'don_gia': 29880, 'tong_tien': 1500000, 'tien_chua_vat': 1500000, 'vat': 0, 'link': 'https://vinvoice.viettel.vn/utilities/invoice-search', 'fkey': 'CSN0A8B94HCNLW9'},
        '193491': {'loai_nl': 'Dầu', 'dien_giai': 'Dầu Điêzen 0,001S', 'lit': 50.535, 'don_gia': 29880, 'tong_tien': 1510000, 'tien_chua_vat': 1510000, 'vat': 0, 'link': 'https://vinvoice.viettel.vn/utilities/invoice-search', 'fkey': 'MV56CAW2E2YEN95'},
        '193783': {'loai_nl': 'Dầu', 'dien_giai': 'Dầu Điêzen 0,05S', 'lit': 53.417, 'don_gia': 28080, 'tong_tien': 1500000, 'tien_chua_vat': 1500000, 'vat': 0, 'link': 'https://vinvoice.viettel.vn/utilities/invoice-search', 'fkey': 'ZH2X9ETXYM2XXWT'},
        '194098': {'loai_nl': 'Xăng', 'dien_giai': 'Xăng E10 RON 95', 'lit': 60.0, 'don_gia': 22600, 'tong_tien': 1356000, 'tien_chua_vat': 1356000, 'vat': 0, 'link': 'https://vinvoice.viettel.vn/utilities/invoice-search', 'fkey': 'Z2DQEGVB77YYYC8'},
    }
    for inv in g2_hstt_invs:
        if inv['so_hd'] in real_fixes:
            inv.update(real_fixes[inv['so_hd']])

    g1_dau_sep = sorted([x for x in g1_hstt_invs if 'Dầu' in x['loai_nl']], key=lambda x: (x['ngay'], x['so_hd']))
    g1_xang_sep = sorted([x for x in g1_hstt_invs if 'Xăng' in x['loai_nl']], key=lambda x: (x['ngay'], x['so_hd']))
    g2_dau_sep = sorted([x for x in g2_hstt_invs if 'Dầu' in x['loai_nl']], key=lambda x: (x['ngay'], x['so_hd']))
    g2_xang_sep = sorted([x for x in g2_hstt_invs if 'Xăng' in x['loai_nl']], key=lambda x: (x['ngay'], x['so_hd']))

    # 2. Extract 7 August invoices from 111
    aug_invs = []
    for ws_name in ['HD_DongNai_67Tram', 'HD_ToanCau']:
        ws = wb_111[ws_name]
        for r in range(8, ws.max_row+1):
            d = str(ws.cell(r, 2).value)[:10]
            if '-08-' in d:
                bname = 'MobiFone Đồng Nai (0100686209-129)' if 'DongNai' in ws_name else 'MobiFone Toàn Cầu (0102577251-001)'
                pname = 'Đồng Nai' if 'DongNai' in ws_name else 'Toàn Cầu'
                aug_invs.append({
                    'ngay': d, 'so_hd': str(ws.cell(r, 3).value).strip(), 'buyer': bname, 'phap_nhan': pname,
                    'loai_nl': ws.cell(r, 5).value, 'dien_giai': ws.cell(r, 6).value,
                    'lit': float(ws.cell(r, 7).value or 0),
                    'don_gia': round(float(ws.cell(r, 13).value or 0) / float(ws.cell(r, 7).value or 1)),
                    'tien_chua_vat': float(ws.cell(r, 11).value or 0), 'vat': float(ws.cell(r, 12).value or 0),
                    'tong_tien': float(ws.cell(r, 13).value or 0), 'don_vi_ban': ws.cell(r, 4).value,
                    'mst_ban': str(ws.cell(r, 8).value or '').strip(), 'ky_hieu': ws.cell(r, 10).value,
                    'fkey': ws.cell(r, 15).value, 'link': ws.cell(r, 14).value,
                    'ghi_chu': 'Hóa đơn tháng 08/2026 gối đầu bảo lưu kho (không đưa vào thanh toán tháng 9)'
                })

    # =========================================================================
    # STEP 3: WATERFALL ALLOCATION (ONLY SEPTEMBER INVOICES FROM HSTT)
    # =========================================================================
    print("Running Waterfall Nhóm 1 (Strict September)...")
    a1_d, u1_d, un1_d, m1_d = run_waterfall_allocation(g1_d_tram, g1_dau_sep)
    a1_x, u1_x, un1_x, m1_x = run_waterfall_allocation(g1_x_tram, g1_xang_sep)

    print("Running Waterfall Nhóm 2 (Strict September)...")
    a2_d, u2_d, un2_d, m2_d = run_waterfall_allocation(g2_d_tram, g2_dau_sep)
    a2_x, u2_x, un2_x, m2_x = run_waterfall_allocation(g2_x_tram, g2_xang_sep)

    # Active invoices for Group 1: 11 Dầu + 1 Xăng = 12 HĐ
    g1_active_invs = u1_d + u1_x
    # Active invoices for Group 2: 21 Dầu + 20 Xăng = 41 HĐ
    g2_active_invs = u2_d + u2_x

    print(f"G1 Active Invoices: {len(g1_active_invs)} (11 Dầu + 1 Xăng)")
    print(f"G2 Active Invoices: {len(g2_active_invs)} (21 Dầu + 20 Xăng)")

    # Unused / Surplus invoices
    # 1. August invoices (7)
    # 2. G1 unused Xăng (17)
    # 3. G2 unused Xăng (10)
    surplus_list = []
    # Add August invoices
    surplus_list.extend(aug_invs)

    # Add G1 unused Xăng
    for inv in un1_x:
        inv['buyer'] = 'MobiFone Đồng Nai (0100686209-129)'
        inv['don_gia'] = round(inv['tong_tien'] / inv['lit']) if inv['lit'] else 0
        inv['ghi_chu'] = 'Hóa đơn xăng dư thừa bảo lưu kho (không dùng trong tháng 09/2026)'
        surplus_list.append(inv)

    # Add G2 unused Xăng
    for inv in un2_x:
        inv['buyer'] = 'MobiFone Toàn Cầu (0102577251-001)'
        inv['don_gia'] = round(inv['tong_tien'] / inv['lit']) if inv['lit'] else 0
        inv['ghi_chu'] = 'Hóa đơn xăng dư thừa bảo lưu kho (không dùng trong tháng 09/2026)'
        surplus_list.append(inv)

    # Sort surplus: August invoices first (by date, so_hd), then September surplus invoices (by phap_nhan, date, so_hd)
    surplus_list.sort(key=lambda x: (0 if '-08-' in x['ngay'] else 1, x.get('phap_nhan', ''), x['ngay'], x['so_hd']))
    print(f"Total Surplus Invoices in HD_Du_Thua_Khong_Su_Dung: {len(surplus_list)}")

    # =========================================================================
    # STEP 4: REBUILD HD_DongNai_67Tram (ONLY 12 USED INVOICES)
    # =========================================================================
    print("Rebuilding HD_DongNai_67Tram (12 used invoices)...")
    ws_hd1 = wb_hstt['HD_DongNai_67Tram']
    clear_sheet_from_row(ws_hd1, 8)

    cur = 8
    for idx, inv in enumerate(g1_active_invs, 1):
        ws_hd1.cell(cur, 1, f"L{idx}").alignment = Alignment(horizontal='center')
        ws_hd1.cell(cur, 2, inv['ngay']).alignment = Alignment(horizontal='center')
        c3 = ws_hd1.cell(cur, 3, inv['so_hd']); c3.font = font_bold; c3.alignment = Alignment(horizontal='center')
        ws_hd1.cell(cur, 4, inv['don_vi_ban'])
        ws_hd1.cell(cur, 5, 'Dầu' if 'Dầu' in inv['loai_nl'] else 'Xăng').alignment = Alignment(horizontal='center')
        ws_hd1.cell(cur, 6, inv['dien_giai'] or ('Dầu Điêzen' if 'Dầu' in inv['loai_nl'] else 'Xăng RON 95'))
        c7 = ws_hd1.cell(cur, 7, inv['lit']); c7.number_format = '#,##0.00'; c7.alignment = Alignment(horizontal='right')
        c8 = ws_hd1.cell(cur, 8, inv['mst_ban']); c8.alignment = Alignment(horizontal='center')
        ws_hd1.cell(cur, 9, inv.get('mau_so'))
        c10 = ws_hd1.cell(cur, 10, inv['ky_hieu']); c10.alignment = Alignment(horizontal='center')
        c11 = ws_hd1.cell(cur, 11, inv['tien_chua_vat']); c11.number_format = '#,##0'; c11.alignment = Alignment(horizontal='right')
        c12 = ws_hd1.cell(cur, 12, inv['vat']); c12.number_format = '#,##0'; c12.alignment = Alignment(horizontal='right')
        c13 = ws_hd1.cell(cur, 13, inv['tong_tien']); c13.number_format = '#,##0'; c13.alignment = Alignment(horizontal='right')
        c14 = ws_hd1.cell(cur, 14, inv['link']); c14.font = font_link
        c15 = ws_hd1.cell(cur, 15, inv['fkey']); c15.font = font_bold; c15.alignment = Alignment(horizontal='center')

        for c in range(1, 16):
            cell = ws_hd1.cell(cur, c)
            if cell.font.name != 'Times New Roman': cell.font = font_body
            cell.border = thin_border
        cur += 1

    end_data_r = cur - 1
    ws_hd1.cell(cur, 1, 'TỔNG CỘNG TOÀN BỘ HÓA ĐƠN').font = Font(name='Times New Roman', size=10, bold=True)
    ws_hd1.merge_cells(start_row=cur, start_column=1, end_row=cur, end_column=6)
    c7 = ws_hd1.cell(cur, 7, f"=SUM(G8:G{end_data_r})"); c7.font = Font(name='Times New Roman', size=10, bold=True); c7.number_format = '#,##0.00'
    c11 = ws_hd1.cell(cur, 11, f"=SUM(K8:K{end_data_r})"); c11.font = Font(name='Times New Roman', size=10, bold=True); c11.number_format = '#,##0'
    c12 = ws_hd1.cell(cur, 12, f"=SUM(L8:L{end_data_r})"); c12.font = Font(name='Times New Roman', size=10, bold=True); c12.number_format = '#,##0'
    c13 = ws_hd1.cell(cur, 13, f"=SUM(M8:M{end_data_r})"); c13.font = Font(name='Times New Roman', size=10, bold=True); c13.number_format = '#,##0'
    for c in range(1, 16):
        c_tot = ws_hd1.cell(cur, c)
        c_tot.fill = sum_fill
        c_tot.border = double_bottom_border
    ws_hd1.row_dimensions[cur].height = 24

    # =========================================================================
    # STEP 5: REBUILD HD_ToanCau (ONLY 41 USED INVOICES)
    # =========================================================================
    print("Rebuilding HD_ToanCau (41 used invoices)...")
    ws_hd2 = wb_hstt['HD_ToanCau']
    clear_sheet_from_row(ws_hd2, 8)

    cur = 8
    for idx, inv in enumerate(g2_active_invs, 1):
        ws_hd2.cell(cur, 1, f"L{idx}").alignment = Alignment(horizontal='center')
        ws_hd2.cell(cur, 2, inv['ngay']).alignment = Alignment(horizontal='center')
        c3 = ws_hd2.cell(cur, 3, inv['so_hd']); c3.font = font_bold; c3.alignment = Alignment(horizontal='center')
        ws_hd2.cell(cur, 4, inv['don_vi_ban'])
        ws_hd2.cell(cur, 5, 'Dầu' if 'Dầu' in inv['loai_nl'] else 'Xăng').alignment = Alignment(horizontal='center')
        ws_hd2.cell(cur, 6, inv['dien_giai'] or ('Dầu Điêzen' if 'Dầu' in inv['loai_nl'] else 'Xăng RON 95'))
        c7 = ws_hd2.cell(cur, 7, inv['lit']); c7.number_format = '#,##0.00'; c7.alignment = Alignment(horizontal='right')
        c8 = ws_hd2.cell(cur, 8, inv['mst_ban']); c8.alignment = Alignment(horizontal='center')
        ws_hd2.cell(cur, 9, inv.get('mau_so'))
        c10 = ws_hd2.cell(cur, 10, inv['ky_hieu']); c10.alignment = Alignment(horizontal='center')
        c11 = ws_hd2.cell(cur, 11, inv['tien_chua_vat']); c11.number_format = '#,##0'; c11.alignment = Alignment(horizontal='right')
        c12 = ws_hd2.cell(cur, 12, inv['vat']); c12.number_format = '#,##0'; c12.alignment = Alignment(horizontal='right')
        c13 = ws_hd2.cell(cur, 13, inv['tong_tien']); c13.number_format = '#,##0'; c13.alignment = Alignment(horizontal='right')
        c14 = ws_hd2.cell(cur, 14, inv['link']); c14.font = font_link
        c15 = ws_hd2.cell(cur, 15, inv['fkey']); c15.font = font_bold; c15.alignment = Alignment(horizontal='center')

        for c in range(1, 16):
            cell = ws_hd2.cell(cur, c)
            if cell.font.name != 'Times New Roman': cell.font = font_body
            cell.border = thin_border
        cur += 1

    end_data_r = cur - 1
    ws_hd2.cell(cur, 1, 'TỔNG CỘNG TOÀN BỘ HÓA ĐƠN').font = Font(name='Times New Roman', size=10, bold=True)
    ws_hd2.merge_cells(start_row=cur, start_column=1, end_row=cur, end_column=6)
    c7 = ws_hd2.cell(cur, 7, f"=SUM(G8:G{end_data_r})"); c7.font = Font(name='Times New Roman', size=10, bold=True); c7.number_format = '#,##0.00'
    c11 = ws_hd2.cell(cur, 11, f"=SUM(K8:K{end_data_r})"); c11.font = Font(name='Times New Roman', size=10, bold=True); c11.number_format = '#,##0'
    c12 = ws_hd2.cell(cur, 12, f"=SUM(L8:L{end_data_r})"); c12.font = Font(name='Times New Roman', size=10, bold=True); c12.number_format = '#,##0'
    c13 = ws_hd2.cell(cur, 13, f"=SUM(M8:M{end_data_r})"); c13.font = Font(name='Times New Roman', size=10, bold=True); c13.number_format = '#,##0'
    for c in range(1, 16):
        c_tot = ws_hd2.cell(cur, c)
        c_tot.fill = sum_fill
        c_tot.border = double_bottom_border
    ws_hd2.row_dimensions[cur].height = 24

    # =========================================================================
    # STEP 6: REBUILD MAP SHEETS (SORTED BY ID TRẠM A -> Z)
    # =========================================================================
    def render_map_sheet(ws, title, sec_oil_alloc, sec_gas_alloc, oil_pool, gas_pool, actual_oil_m, actual_gas_m, actual_oil_l, actual_gas_l):
        clear_sheet_from_row(ws, 5)

        fill_yellow = PatternFill(start_color='FFFF00', end_color='FFFF00', fill_type='solid')
        fill_sec_oil = PatternFill(start_color='E0F2FE', end_color='E0F2FE', fill_type='solid')
        fill_sec_gas = PatternFill(start_color='FEF3C7', end_color='FEF3C7', fill_type='solid')
        fill_subtot = PatternFill(start_color='F1F5F9', end_color='F1F5F9', fill_type='solid')

        font_sec_oil = Font(name='Times New Roman', size=10, bold=True, color='0369A1')
        font_sec_gas = Font(name='Times New Roman', size=10, bold=True, color='B45309')
        font_red = Font(name='Times New Roman', size=9, bold=True, color='DC2626')
        font_black = Font(name='Times New Roman', size=9)
        font_link_local = Font(name='Times New Roman', size=9, color='0284C7', underline='single')

        headers_map = [
            'ID trạm\n(Nhãn Hàng)', 'Thành tiền chạy máy\ntheo trạm (đồng)', 'Số hóa đơn', 'Số tiền gán từ HĐ\n(đồng)',
            'Đơn vị bán hàng', 'Mã số thuế\n(Bán)', 'Ký hiệu HĐ', 'Link tra cứu hóa đơn', 'Mã tra cứu / Fkey', 'Ngày HĐ', 'Tên trạm / Địa bàn'
        ]

        for col_idx, h in enumerate(headers_map, 1):
            cell = ws.cell(4, col_idx, h)
            cell.fill = fill_yellow
            cell.font = Font(name='Times New Roman', size=9, bold=True, color='000000')
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            cell.border = thin_border
        ws.row_dimensions[4].height = 35

        cur = 5
        def render_sec(sec_title, sec_fill, sec_font, alloc_rows, fuel_name, pool_invs, actual_money, actual_lit):
            nonlocal cur
            ws.merge_cells(start_row=cur, start_column=1, end_row=cur, end_column=11)
            c_sec = ws.cell(cur, 1, sec_title)
            c_sec.fill = sec_fill
            c_sec.font = sec_font
            c_sec.alignment = Alignment(horizontal='left', vertical='center')
            for ci in range(1, 12): ws.cell(cur, ci).border = thin_border
            ws.row_dimensions[cur].height = 24
            cur += 1

            start_r = cur
            for r in alloc_rows:
                c1 = ws.cell(cur, 1, r['tram_id']); c1.font = font_red; c1.alignment = Alignment(horizontal='center')
                c2 = ws.cell(cur, 2, r['tram_tien']); c2.font = font_red; c2.number_format = '#,##0'; c2.alignment = Alignment(horizontal='right')
                c3 = ws.cell(cur, 3, r['so_hd']); c3.font = font_red; c3.alignment = Alignment(horizontal='center')
                c4 = ws.cell(cur, 4, r['tien_gan']); c4.font = font_black; c4.number_format = '#,##0'; c4.alignment = Alignment(horizontal='right')
                ws.cell(cur, 5, r['inv']['don_vi_ban'])
                c6 = ws.cell(cur, 6, r['inv']['mst_ban']); c6.alignment = Alignment(horizontal='center')
                c7 = ws.cell(cur, 7, r['inv']['ky_hieu']); c7.alignment = Alignment(horizontal='center')
                c8 = ws.cell(cur, 8, r['inv']['link']); c8.font = font_link_local
                c9 = ws.cell(cur, 9, r['inv']['fkey']); c9.font = font_bold; c9.alignment = Alignment(horizontal='center')
                c10 = ws.cell(cur, 10, r['inv']['ngay']); c10.alignment = Alignment(horizontal='center')
                ws.cell(cur, 11, r['ten_tram'])

                for ci in range(1, 12):
                    cell = ws.cell(cur, ci)
                    if not cell.font or cell.font.name != 'Times New Roman': cell.font = font_black
                    cell.border = thin_border
                cur += 1

            end_r = cur - 1
            # Subtotal row
            ws.cell(cur, 1, f"TỔNG CỘNG {fuel_name.upper()}").font = Font(name='Times New Roman', size=9, bold=True)
            ws.cell(cur, 2, f"=SUM(B{start_r}:B{end_r})").font = Font(name='Times New Roman', size=9, bold=True); ws.cell(cur, 2).number_format = '#,##0'
            ws.cell(cur, 4, f"=SUM(D{start_r}:D{end_r})").font = Font(name='Times New Roman', size=9, bold=True); ws.cell(cur, 4).number_format = '#,##0'
            for ci in range(1, 12):
                c_sub = ws.cell(cur, ci)
                c_sub.fill = fill_subtot
                c_sub.border = thin_border
            ws.row_dimensions[cur].height = 20
            cur += 1

            # Surplus calculation
            tot_hd_lit = sum(inv['lit'] for inv in pool_invs)
            tot_hd_money = sum(inv['tong_tien'] for inv in pool_invs)
            surplus_m = max(0.0, tot_hd_money - actual_money)
            surplus_l = tot_hd_lit - actual_lit

            # Note row
            ws.merge_cells(start_row=cur, start_column=1, end_row=cur, end_column=11)
            sign = "+" if surplus_l >= 0 else "+-"
            note_str = f"📌 Ghi chú bảo lưu {fuel_name}: Tổng HĐ mua {tot_hd_lit:,.1f} L ({tot_hd_money:,.0f} đ) — Tiêu hao chạy máy {actual_lit:,.1f} L ({actual_money:,.0f} đ) ➔ Số lít dư bảo lưu kho: {sign}{abs(surplus_l):,.1f} L (Tiền HĐ còn dư bảo lưu: +{surplus_m:,.0f} đ)"
            note_c = ws.cell(cur, 1, note_str)
            note_c.font = Font(name='Times New Roman', size=8.5, italic=True, color='047857' if surplus_l >= 0 else 'DC2626')
            note_c.alignment = Alignment(horizontal='left', vertical='center')
            for ci in range(1, 12): ws.cell(cur, ci).border = thin_border
            ws.row_dimensions[cur].height = 20
            cur += 1

        # Section 1: OIL
        render_sec(
            "I. BẢNG KÊ PHÂN BỔ NHIÊN LIỆU DẦU DO (DO 0.05S) — GÁN HÓA ĐƠN THEO TRẠM",
            fill_sec_oil, font_sec_oil, sec_oil_alloc, "Dầu DO", oil_pool, actual_oil_m, actual_oil_l
        )
        cur += 1 # blank row

        # Section 2: GAS
        render_sec(
            "II. BẢNG KÊ PHÂN BỔ NHIÊN LIỆU XĂNG RON 95 (RON 95-III) — GÁN HÓA ĐƠN THEO TRẠM",
            fill_sec_gas, font_sec_gas, sec_gas_alloc, "Xăng RON 95", gas_pool, actual_gas_m, actual_gas_l
        )

        # Grand Total Row
        cur += 1
        ws.cell(cur, 1, 'TỔNG CỘNG TOÀN BỘ (DẦU DO + XĂNG RON 95)').font = Font(name='Times New Roman', size=10, bold=True, color='1E3A8A')
        c2 = ws.cell(cur, 2, actual_oil_m + actual_gas_m); c2.font = Font(name='Times New Roman', size=10, bold=True, color='DC2626'); c2.number_format = '#,##0'
        c4 = ws.cell(cur, 4, actual_oil_m + actual_gas_m); c4.font = Font(name='Times New Roman', size=10, bold=True, color='047857'); c4.number_format = '#,##0'
        for ci in range(1, 12):
            c_gtot = ws.cell(cur, ci)
            c_gtot.fill = sum_fill
            c_gtot.border = double_bottom_border
        ws.row_dimensions[cur].height = 24

        # Column widths
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 10), 45)
        ws.column_dimensions['A'].width = 14
        ws.column_dimensions['B'].width = 22
        ws.column_dimensions['C'].width = 14
        ws.column_dimensions['D'].width = 22
        ws.column_dimensions['E'].width = 40
        ws.column_dimensions['H'].width = 35
        ws.column_dimensions['I'].width = 20

    print("Rendering Map_HD_Theo_Tram_Nhom1 (Strict September)...")
    g1_act_oil_m = sum(v['tien'] for v in g1_d_tram.values())
    g1_act_gas_m = sum(v['tien'] for v in g1_x_tram.values())
    g1_act_oil_l = sum(v['lit'] for v in g1_d_tram.values())
    g1_act_gas_l = sum(v['lit'] for v in g1_x_tram.values())
    render_map_sheet(
        wb_hstt['Map_HD_Theo_Tram_Nhom1'],
        'MobiFone Đồng Nai - 67 Trạm Đặc Thù',
        a1_d, a1_x, u1_d, u1_x,
        g1_act_oil_m, g1_act_gas_m, g1_act_oil_l, g1_act_gas_l
    )

    print("Rendering Map_HD_Theo_Tram_Nhom2 (Strict September)...")
    g2_act_oil_m = sum(v['tien'] for v in g2_d_tram.values())
    g2_act_gas_m = sum(v['tien'] for v in g2_x_tram.values())
    g2_act_oil_l = sum(v['lit'] for v in g2_d_tram.values())
    g2_act_gas_l = sum(v['lit'] for v in g2_x_tram.values())
    render_map_sheet(
        wb_hstt['Map_HD_Theo_Tram_Nhom2'],
        'MobiFone Toàn Cầu',
        a2_d, a2_x, u2_d, u2_x,
        g2_act_oil_m, g2_act_gas_m, g2_act_oil_l, g2_act_gas_l
    )

    # =========================================================================
    # STEP 7: REBUILD HD_Du_Thua_Khong_Su_Dung (CHUYỂN HÓA ĐƠN THÁNG 8 + THỪA QUA ĐÂY)
    # =========================================================================
    print("Rebuilding HD_Du_Thua_Khong_Su_Dung...")
    ws_sur = wb_hstt['HD_Du_Thua_Khong_Su_Dung']
    clear_sheet_from_row(ws_sur, 5)

    headers_sur = [
        'STT', 'Ngày Lập HĐ', 'Số Hóa Đơn', 'Bên Mua (Pháp Nhân / MST)', 'Loại Nhiên Liệu',
        'Số Lượng (Lít)', 'Đơn Giá (đ/L)', 'Thành Tiền Chưa Thuế (đ)', 'Thuế GTGT 8% (đ)',
        'Tổng Tiền Có Thuế (đ)', 'Tên Đơn Vị Bán Hàng', 'MST Người Bán', 'Ký Hiệu HĐ',
        'Mã Tra Cứu / Fkey', 'Link Tra Cứu Gốc', 'Ghi Chú Phân Loại'
    ]

    fill_red_hdr = PatternFill(start_color='991B1B', end_color='991B1B', fill_type='solid')
    font_white_bold = Font(name='Times New Roman', size=9, bold=True, color='FFFFFF')

    for col_idx, h in enumerate(headers_sur, 1):
        cell = ws_sur.cell(4, col_idx, h)
        cell.fill = fill_red_hdr
        cell.font = font_white_bold
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        cell.border = thin_border
    ws_sur.row_dimensions[4].height = 30

    cur = 5
    for idx, inv in enumerate(surplus_list, 1):
        bname = inv.get('buyer') or ('MobiFone Đồng Nai (0100686209-129)' if inv['phap_nhan'] == 'Đồng Nai' else 'MobiFone Toàn Cầu (0102577251-001)')
        is_oil = 'Dầu' in inv['loai_nl']
        dg = inv.get('don_gia', 0)
        if not dg and inv.get('lit'):
            dg = round(inv['tong_tien'] / inv['lit'])

        ws_sur.cell(cur, 1, idx).alignment = Alignment(horizontal='center')
        ws_sur.cell(cur, 2, inv['ngay']).alignment = Alignment(horizontal='center')
        c3 = ws_sur.cell(cur, 3, inv['so_hd']); c3.font = font_bold; c3.alignment = Alignment(horizontal='center')
        ws_sur.cell(cur, 4, bname)
        ws_sur.cell(cur, 5, 'Dầu DO 0.05S' if is_oil else 'Xăng RON 95').alignment = Alignment(horizontal='center')
        c6 = ws_sur.cell(cur, 6, inv['lit']); c6.number_format = '0.0'; c6.alignment = Alignment(horizontal='right')
        c7 = ws_sur.cell(cur, 7, dg); c7.number_format = '#,##0'; c7.alignment = Alignment(horizontal='right')
        c8 = ws_sur.cell(cur, 8, inv['tien_chua_vat']); c8.number_format = '#,##0'; c8.alignment = Alignment(horizontal='right')
        c9 = ws_sur.cell(cur, 9, inv['vat']); c9.number_format = '#,##0'; c9.alignment = Alignment(horizontal='right')
        c10 = ws_sur.cell(cur, 10, inv['tong_tien']); c10.number_format = '#,##0'; c10.font = font_bold; c10.alignment = Alignment(horizontal='right')
        ws_sur.cell(cur, 11, inv['don_vi_ban'])
        c12 = ws_sur.cell(cur, 12, inv['mst_ban']); c12.alignment = Alignment(horizontal='center')
        c13 = ws_sur.cell(cur, 13, inv['ky_hieu']); c13.alignment = Alignment(horizontal='center')
        c14 = ws_sur.cell(cur, 14, inv['fkey']); c14.font = font_bold; c14.alignment = Alignment(horizontal='center')
        c15 = ws_sur.cell(cur, 15, inv['link']); c15.font = font_link
        ws_sur.cell(cur, 16, inv.get('ghi_chu', 'Hóa đơn dư thừa bảo lưu kho (không dùng trong tháng 09/2026)'))

        for ci in range(1, 17):
            cell = ws_sur.cell(cur, ci)
            if not cell.font or cell.font.name != 'Times New Roman': cell.font = font_body
            cell.border = thin_border
        cur += 1

    end_sur_r = cur - 1
    ws_sur.cell(cur, 1, 'TỔNG CỘNG HÓA ĐƠN DƯ THỪA').font = font_bold
    ws_sur.merge_cells(start_row=cur, start_column=1, end_row=cur, end_column=5)
    c6 = ws_sur.cell(cur, 6, f"=SUM(F5:F{end_sur_r})"); c6.number_format = '0.0'; c6.font = font_bold
    c8 = ws_sur.cell(cur, 8, f"=SUM(H5:H{end_sur_r})"); c8.number_format = '#,##0'; c8.font = font_bold
    c9 = ws_sur.cell(cur, 9, f"=SUM(I5:I{end_sur_r})"); c9.number_format = '#,##0'; c9.font = font_bold
    c10 = ws_sur.cell(cur, 10, f"=SUM(J5:J{end_sur_r})"); c10.number_format = '#,##0'; c10.font = font_bold
    for ci in range(1, 17):
        c_tot = ws_sur.cell(cur, ci)
        c_tot.fill = sum_fill
        c_tot.border = double_bottom_border
    ws_sur.row_dimensions[cur].height = 24

    for col in ws_sur.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws_sur.column_dimensions[col_letter].width = min(max(max_len + 3, 11), 45)
    ws_sur.column_dimensions['A'].width = 8
    ws_sur.column_dimensions['D'].width = 35
    ws_sur.column_dimensions['K'].width = 38
    ws_sur.column_dimensions['O'].width = 35
    ws_sur.column_dimensions['P'].width = 45

    # =========================================================================
    # STEP 8: SAVE WORKBOOK
    # =========================================================================
    print(f"Saving to {hstt_path}...")
    wb_hstt.save(hstt_path)

    downloads_path = "/Users/cang_it/Downloads/Ho_So_Thanh_Toan_Chuan_Mau_09_2026_HSTT.xlsx"
    wb_hstt.save(downloads_path)
    print(f"Saved copy to {downloads_path} successfully!")

if __name__ == '__main__':
    main()
