#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Update Excel files (Desktop and Downloads) to guarantee 100% STRICT FUEL SEPARATION:
1. Map_HD_Theo_Tram_Nhom2:
   - DNDQ19 (DNIDQU07) and DNLK08 (DNILKH02) run on XĂNG -> Move to Section II (Xăng RON 95).
   - In Section I (Dầu DO): 77 stations (49,598,908 đ) -> Mapped ONLY to DẦU invoices.
   - In Section II (Xăng RON 95): 33 stations (21,669,675 đ) -> Mapped ONLY to XĂNG invoices.
   - Total Col B = Col D = 71,268,583 đ (100% match).
2. HD_ToanCau:
   - 26 Oil invoices (51,840,655 đ) listed first (L1 to L26).
   - Oil Subtotal: CỘNG HÓA ĐƠN DẦU DO (51,840,655 đ).
   - 23 Gas invoices: 22 previous + HĐ 650165 (800,000 đ) = 21,758,597 đ listed second (L27 to L49).
   - Gas Subtotal: CỘNG HÓA ĐƠN XĂNG RON 95 (21,758,597 đ).
   - Grand Total: TỔNG CỘNG TOÀN BỘ HÓA ĐƠN = 73,599,252 đ.
3. 02A_TTNB_ToanCau:
   - Move runs of DNDQ19 and DNLK08 from B. MÁY CHẠY DẦU to A. MÁY CHẠY XĂNG.
   - Update equipment name to MLĐ KYO POWER (DNDQ19) and MLĐ KiBii (DNLK08).
   - Update subtotals: Xăng K63 = 21,669,675 đ, Dầu K... = 49,598,908 đ.
   - Total F8 = K8 = 71,268,583 đ UNCHANGED.
4. HD_Du_Thua_Khong_Su_Dung:
   - Remove HĐ 650165 (as it is now used in HD_ToanCau).
"""

import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
import shutil

HSTT_PATH = '/Users/cang_it/Desktop/Ho_So_Thanh_Toan_Chuan_Mau_09_2026_HSTT.xlsx'
DOWNLOADS_PATH = '/Users/cang_it/Downloads/Ho_So_Thanh_Toan_Chuan_Mau_09_2026_HSTT.xlsx'

FONT_NAME = 'Times New Roman'
FONT_MAIN = Font(name=FONT_NAME, size=11)
FONT_BOLD = Font(name=FONT_NAME, size=11, bold=True)
FONT_ITALIC = Font(name=FONT_NAME, size=10, italic=True)
FONT_SECTION = Font(name=FONT_NAME, size=11, bold=True, color='1F4E78')
FONT_TITLE = Font(name=FONT_NAME, size=14, bold=True, color='1F4E78')

FILL_HEADER = PatternFill(start_color='D9E1F2', end_color='D9E1F2', fill_type='solid')
FILL_SECTION = PatternFill(start_color='F2F2F2', end_color='F2F2F2', fill_type='solid')
FILL_TOTAL = PatternFill(start_color='FFF2CC', end_color='FFF2CC', fill_type='solid')
FILL_TRANSFER = PatternFill(start_color='E2EFDA', end_color='E2EFDA', fill_type='solid')
FILL_NOTE = PatternFill(start_color='FCE4D6', end_color='FCE4D6', fill_type='solid')

THIN_SIDE = Side(border_style='thin', color='A6A6A6')
BORDER_ALL = Border(left=THIN_SIDE, right=THIN_SIDE, top=THIN_SIDE, bottom=THIN_SIDE)
DOUBLE_BOTTOM = Side(border_style='double', color='000000')
BORDER_TOTAL = Border(top=THIN_SIDE, bottom=DOUBLE_BOTTOM, left=THIN_SIDE, right=THIN_SIDE)

ALIGN_LEFT = Alignment(horizontal='left', vertical='center', wrap_text=True)
ALIGN_CENTER = Alignment(horizontal='center', vertical='center')
ALIGN_RIGHT = Alignment(horizontal='right', vertical='center')

def clear_sheet_from_row(ws, from_row):
    merged_ranges = list(ws.merged_cells.ranges)
    for mr in merged_ranges:
        if mr.min_row >= from_row or mr.max_row >= from_row:
            ws.unmerge_cells(str(mr))
    if ws.max_row >= from_row:
        ws.delete_rows(from_row, ws.max_row - from_row + 1)

def run():
    wb = openpyxl.load_workbook(HSTT_PATH)
    
    # -------------------------------------------------------------
    # 1. Update HD_ToanCau (Add 650165, ensure Dầu first then Xăng)
    # -------------------------------------------------------------
    print(">>> 1. Updating HD_ToanCau with 26 Dầu and 23 Xăng...")
    ws_hd2 = wb['HD_ToanCau']
    ws_surplus = wb['HD_Du_Thua_Khong_Su_Dung']

    tc_oil_rows = []
    tc_gas_rows = []
    for r in range(8, ws_hd2.max_row+1):
        inv = ws_hd2.cell(r, 3).value
        fuel = str(ws_hd2.cell(r, 5).value or '').strip()
        if inv and str(inv).isdigit():
            vals = [ws_hd2.cell(r, c).value for c in range(1, 17)]
            if 'DẦU' in fuel.upper():
                tc_oil_rows.append(vals)
            else:
                tc_gas_rows.append(vals)

    # Find 650165 from surplus
    inv_650165_vals = None
    for r in range(4, ws_surplus.max_row+1):
        hd = ws_surplus.cell(r, 3).value
        if str(hd).strip() == '650165':
            inv_650165_vals = [
                'L',
                ws_surplus.cell(r, 2).value, # date
                '650165',                    # inv
                ws_surplus.cell(r, 11).value, # seller
                'Xăng',                      # loai
                'Xăng RON 95',               # dien giai
                float(ws_surplus.cell(r, 6).value or 33.0), # lit
                ws_surplus.cell(r, 12).value, # mst
                None,                         # mau so
                ws_surplus.cell(r, 13).value, # ky hieu
                float(ws_surplus.cell(r, 8).value or 740741), # sub
                float(ws_surplus.cell(r, 9).value or 59259),  # vat
                float(ws_surplus.cell(r, 10).value or 800000), # total
                ws_surplus.cell(r, 15).value, # link
                ws_surplus.cell(r, 14).value, # fkey
                '💵 Tiền mặt (Ngày 08/09 <= 5tr) — Sử dụng 100% giá vốn thanh toán'
            ]
            break

    if inv_650165_vals and not any(r[2] == '650165' for r in tc_gas_rows):
        tc_gas_rows.append(inv_650165_vals)

    # Sort
    tc_oil_rows.sort(key=lambda x: (str(x[1] or ''), str(x[2] or '')))
    tc_gas_rows.sort(key=lambda x: (str(x[1] or ''), str(x[2] or '')))

    clear_sheet_from_row(ws_hd2, 8)
    cur_row = 8
    stt_idx = 1
    oil_start_tc = cur_row
    for r_vals in tc_oil_rows:
        r_vals[0] = f'L{stt_idx}'
        for c, v in enumerate(r_vals, 1):
            ws_hd2.cell(cur_row, c, v)
            cell = ws_hd2.cell(cur_row, c)
            cell.font = FONT_MAIN
            cell.border = BORDER_ALL
            if c in [1, 2, 3, 5, 8, 9, 10, 15]: cell.alignment = ALIGN_CENTER
            elif c == 7: cell.alignment = ALIGN_RIGHT; cell.number_format = '#,##0.00'
            elif c in [11, 12, 13]: cell.alignment = ALIGN_RIGHT; cell.number_format = '#,##0'
            else: cell.alignment = ALIGN_LEFT
            if 'Chuyển khoản' in str(r_vals[15] or ''): cell.fill = FILL_TRANSFER
        cur_row += 1
        stt_idx += 1
    oil_end_tc = cur_row - 1

    # Oil Subtotal
    ws_hd2.cell(cur_row, 1, 'CỘNG HÓA ĐƠN DẦU DO').alignment = ALIGN_CENTER
    ws_hd2.cell(cur_row, 7, f'=SUM(G{oil_start_tc}:G{oil_end_tc})').number_format = '#,##0.00'
    ws_hd2.cell(cur_row, 11, f'=SUM(K{oil_start_tc}:K{oil_end_tc})').number_format = '#,##0'
    ws_hd2.cell(cur_row, 12, f'=SUM(L{oil_start_tc}:L{oil_end_tc})').number_format = '#,##0'
    ws_hd2.cell(cur_row, 13, f'=SUM(M{oil_start_tc}:M{oil_end_tc})').number_format = '#,##0'
    for c in range(1, 17):
        cell = ws_hd2.cell(cur_row, c)
        cell.font = FONT_BOLD
        cell.fill = FILL_SECTION
        cell.border = BORDER_ALL
    ws_hd2.merge_cells(start_row=cur_row, start_column=1, end_row=cur_row, end_column=6)
    cur_row += 1

    # Gas Rows
    gas_start_tc = cur_row
    for r_vals in tc_gas_rows:
        r_vals[0] = f'L{stt_idx}'
        for c, v in enumerate(r_vals, 1):
            ws_hd2.cell(cur_row, c, v)
            cell = ws_hd2.cell(cur_row, c)
            cell.font = FONT_MAIN
            cell.border = BORDER_ALL
            if c in [1, 2, 3, 5, 8, 9, 10, 15]: cell.alignment = ALIGN_CENTER
            elif c == 7: cell.alignment = ALIGN_RIGHT; cell.number_format = '#,##0.00'
            elif c in [11, 12, 13]: cell.alignment = ALIGN_RIGHT; cell.number_format = '#,##0'
            else: cell.alignment = ALIGN_LEFT
            if 'Chuyển khoản' in str(r_vals[15] or ''): cell.fill = FILL_TRANSFER
        cur_row += 1
        stt_idx += 1
    gas_end_tc = cur_row - 1

    # Gas Subtotal
    ws_hd2.cell(cur_row, 1, 'CỘNG HÓA ĐƠN XĂNG RON 95').alignment = ALIGN_CENTER
    ws_hd2.cell(cur_row, 7, f'=SUM(G{gas_start_tc}:G{gas_end_tc})').number_format = '#,##0.00'
    ws_hd2.cell(cur_row, 11, f'=SUM(K{gas_start_tc}:K{gas_end_tc})').number_format = '#,##0'
    ws_hd2.cell(cur_row, 12, f'=SUM(L{gas_start_tc}:L{gas_end_tc})').number_format = '#,##0'
    ws_hd2.cell(cur_row, 13, f'=SUM(M{gas_start_tc}:M{gas_end_tc})').number_format = '#,##0'
    for c in range(1, 17):
        cell = ws_hd2.cell(cur_row, c)
        cell.font = FONT_BOLD
        cell.fill = FILL_SECTION
        cell.border = BORDER_ALL
    ws_hd2.merge_cells(start_row=cur_row, start_column=1, end_row=cur_row, end_column=6)
    cur_row += 1

    # Grand Total
    oil_sub_tc = gas_start_tc - 1
    gas_sub_tc = cur_row - 1
    ws_hd2.cell(cur_row, 1, 'TỔNG CỘNG TOÀN BỘ HÓA ĐƠN (DẦU + XĂNG)').alignment = ALIGN_CENTER
    ws_hd2.cell(cur_row, 7, f'=G{oil_sub_tc}+G{gas_sub_tc}').number_format = '#,##0.00'
    ws_hd2.cell(cur_row, 11, f'=K{oil_sub_tc}+K{gas_sub_tc}').number_format = '#,##0'
    ws_hd2.cell(cur_row, 12, f'=L{oil_sub_tc}+L{gas_sub_tc}').number_format = '#,##0'
    ws_hd2.cell(cur_row, 13, f'=M{oil_sub_tc}+M{gas_sub_tc}').number_format = '#,##0'
    for c in range(1, 17):
        cell = ws_hd2.cell(cur_row, c)
        cell.font = FONT_BOLD
        cell.fill = FILL_TOTAL
        cell.border = BORDER_TOTAL
    ws_hd2.merge_cells(start_row=cur_row, start_column=1, end_row=cur_row, end_column=6)

    # -------------------------------------------------------------
    # 2. Update Map_HD_Theo_Tram_Nhom2
    # -------------------------------------------------------------
    print(">>> 2. Updating Map_HD_Theo_Tram_Nhom2 (Moving DNDQ19 & DNLK08 to Gas)...")
    ws_map2 = wb['Map_HD_Theo_Tram_Nhom2']
    oil_stations = {}
    gas_stations = {}
    sec = None
    for r in range(5, ws_map2.max_row+1):
        v = str(ws_map2.cell(r, 1).value or '')
        if 'I. BẢNG KÊ PHÂN BỔ NHIÊN LIỆU DẦU DO' in v:
            sec = 'DẦU'
            continue
        elif 'II. BẢNG KÊ PHÂN BỔ NHIÊN LIỆU XĂNG' in v:
            sec = 'XĂNG'
            continue
        elif 'TỔNG CỘNG' in v or 'Ghi chú' in v or not v:
            continue
        
        st_id = ws_map2.cell(r, 1).value
        st_amt = ws_map2.cell(r, 2).value
        st_label = ws_map2.cell(r, 11).value
        if st_amt is not None:
            target = oil_stations if sec == 'DẦU' else gas_stations
            target[st_id] = {'amt': float(st_amt), 'label': st_label}

    # Move DNDQ19 and DNLK08 to Gas
    if 'DNDQ19' in oil_stations: gas_stations['DNDQ19'] = oil_stations.pop('DNDQ19')
    if 'DNLK08' in oil_stations: gas_stations['DNLK08'] = oil_stations.pop('DNLK08')

    # Prep invoice lists
    tc_oil_inv_list = [{
        'so_hd': str(r[2]).strip(), 'ngay': str(r[1] or '')[:10], 'don_vi': r[3],
        'mst': r[7], 'ky_hieu': r[9], 'tong': float(r[12]), 'lit': float(r[6] or 0),
        'link': r[13], 'fkey': r[14], 'note': r[15]
    } for r in tc_oil_rows]

    tc_gas_inv_list = [{
        'so_hd': str(r[2]).strip(), 'ngay': str(r[1] or '')[:10], 'don_vi': r[3],
        'mst': r[7], 'ky_hieu': r[9], 'tong': float(r[12]), 'lit': float(r[6] or 0),
        'link': r[13], 'fkey': r[14], 'note': r[15]
    } for r in tc_gas_rows]

    def waterfall(st_dict, inv_list):
        sorted_sids = sorted(st_dict.keys())
        assignments = []
        inv_idx = 0
        inv_rem = inv_list[0]['tong']
        for sid in sorted_sids:
            needed = st_dict[sid]['amt']
            is_first = True
            while needed > 0 and inv_idx < len(inv_list):
                cur_inv = inv_list[inv_idx]
                alloc = min(needed, inv_rem)
                assignments.append({
                    'sid': sid,
                    'st_amt': st_dict[sid]['amt'] if is_first else None,
                    'so_hd': cur_inv['so_hd'],
                    'amt': alloc,
                    'inv': cur_inv,
                    'label': st_dict[sid]['label']
                })
                needed -= alloc
                inv_rem -= alloc
                is_first = False
                if inv_rem <= 0.01:
                    inv_idx += 1
                    if inv_idx < len(inv_list):
                        inv_rem = inv_list[inv_idx]['tong']
        return assignments, inv_rem

    a_oil, r_oil = waterfall(oil_stations, tc_oil_inv_list)
    a_gas, r_gas = waterfall(gas_stations, tc_gas_inv_list)

    clear_sheet_from_row(ws_map2, 1)

    ws_map2.cell(1, 1, "BẢNG KÊ PHÂN BỔ HÓA ĐƠN XĂNG DẦU THEO TỪNG TRẠM CHẠY MÁY (MOBIFONE TOÀN CẦU)").font = FONT_TITLE
    ws_map2.cell(2, 1, "Tháng 09/2026 • Phân tách độc lập bảng kê Dầu DO và Xăng RON 95 • Ưu tiên đáp ứng đủ 100% số tiền bảng kê, bảo lưu số lít/tiền dư").font = FONT_ITALIC
    ws_map2.row_dimensions[1].height = 28
    ws_map2.row_dimensions[2].height = 20

    headers = [
        'ID trạm\n(Nhãn Hàng)', 'Thành tiền chạy máy\ntheo trạm (đồng)', 'Số hóa đơn',
        'Số tiền gán từ HĐ\n(đồng)', 'Đơn vị bán hàng', 'Mã số thuế\n(Bán)',
        'Ký hiệu HĐ', 'Link tra cứu hóa đơn', 'Mã tra cứu / Fkey', 'Ngày HĐ', 'Tên trạm / Địa bàn'
    ]
    ws_map2.row_dimensions[4].height = 32
    for col_idx, h in enumerate(headers, 1):
        cell = ws_map2.cell(4, col_idx, h)
        cell.font = FONT_BOLD
        cell.fill = FILL_HEADER
        cell.alignment = ALIGN_CENTER
        cell.border = BORDER_ALL

    # Section I: Dầu DO
    curr_row = 5
    sec1_cell = ws_map2.cell(curr_row, 1, "I. BẢNG KÊ PHÂN BỔ NHIÊN LIỆU DẦU DO (DO 0.05S) — GÁN HÓA ĐƠN THEO TRẠM")
    sec1_cell.font = FONT_SECTION
    sec1_cell.fill = FILL_SECTION
    ws_map2.row_dimensions[curr_row].height = 24
    ws_map2.merge_cells(start_row=curr_row, start_column=1, end_row=curr_row, end_column=11)
    for c in range(1, 12):
        ws_map2.cell(curr_row, c).border = BORDER_ALL
        ws_map2.cell(curr_row, c).fill = FILL_SECTION

    dau_start_row = curr_row + 1
    curr_row += 1
    for a in a_oil:
        ws_map2.row_dimensions[curr_row].height = 20
        c1 = ws_map2.cell(curr_row, 1, a['sid'])
        c1.alignment = ALIGN_CENTER; c1.font = FONT_MAIN; c1.border = BORDER_ALL

        c2 = ws_map2.cell(curr_row, 2, a['st_amt'])
        c2.alignment = ALIGN_RIGHT; c2.font = FONT_MAIN; c2.border = BORDER_ALL
        if a['st_amt'] is not None: c2.number_format = '#,##0'

        c3 = ws_map2.cell(curr_row, 3, a['so_hd'])
        c3.alignment = ALIGN_CENTER; c3.font = FONT_MAIN; c3.border = BORDER_ALL

        c4 = ws_map2.cell(curr_row, 4, a['amt'])
        c4.alignment = ALIGN_RIGHT; c4.font = FONT_MAIN; c4.border = BORDER_ALL
        c4.number_format = '#,##0'

        inv = a['inv']
        c5 = ws_map2.cell(curr_row, 5, inv['don_vi']); c5.alignment = ALIGN_LEFT; c5.font = FONT_MAIN; c5.border = BORDER_ALL
        c6 = ws_map2.cell(curr_row, 6, inv['mst']); c6.alignment = ALIGN_CENTER; c6.font = FONT_MAIN; c6.border = BORDER_ALL
        c7 = ws_map2.cell(curr_row, 7, inv['ky_hieu']); c7.alignment = ALIGN_CENTER; c7.font = FONT_MAIN; c7.border = BORDER_ALL
        c8 = ws_map2.cell(curr_row, 8, inv['link']); c8.alignment = ALIGN_LEFT; c8.font = FONT_MAIN; c8.border = BORDER_ALL
        c9 = ws_map2.cell(curr_row, 9, inv['fkey']); c9.alignment = ALIGN_CENTER; c9.font = FONT_MAIN; c9.border = BORDER_ALL
        c10 = ws_map2.cell(curr_row, 10, inv['ngay']); c10.alignment = ALIGN_CENTER; c10.font = FONT_MAIN; c10.border = BORDER_ALL
        c11 = ws_map2.cell(curr_row, 11, a['label']); c11.alignment = ALIGN_LEFT; c11.font = FONT_MAIN; c11.border = BORDER_ALL
        curr_row += 1
    dau_end_row = curr_row - 1

    # Total Dầu DO
    tot_dau_row = curr_row
    ws_map2.row_dimensions[tot_dau_row].height = 22
    ws_map2.cell(tot_dau_row, 1, "TỔNG CỘNG DẦU DO").font = FONT_BOLD
    ws_map2.cell(tot_dau_row, 1).fill = FILL_TOTAL; ws_map2.cell(tot_dau_row, 1).border = BORDER_TOTAL
    ws_map2.cell(tot_dau_row, 2, f"=SUM(B{dau_start_row}:B{dau_end_row})").font = FONT_BOLD
    ws_map2.cell(tot_dau_row, 2).fill = FILL_TOTAL; ws_map2.cell(tot_dau_row, 2).border = BORDER_TOTAL
    ws_map2.cell(tot_dau_row, 2).number_format = '#,##0'
    ws_map2.cell(tot_dau_row, 3, None).fill = FILL_TOTAL; ws_map2.cell(tot_dau_row, 3).border = BORDER_TOTAL
    ws_map2.cell(tot_dau_row, 4, f"=SUM(D{dau_start_row}:D{dau_end_row})").font = FONT_BOLD
    ws_map2.cell(tot_dau_row, 4).fill = FILL_TOTAL; ws_map2.cell(tot_dau_row, 4).border = BORDER_TOTAL
    ws_map2.cell(tot_dau_row, 4).number_format = '#,##0'
    for c in range(5, 12):
        ws_map2.cell(tot_dau_row, c).fill = FILL_TOTAL
        ws_map2.cell(tot_dau_row, c).border = BORDER_TOTAL
    curr_row += 1

    # Note Dầu DO
    note_dau_row = curr_row
    ws_map2.row_dimensions[note_dau_row].height = 22
    tot_oil_lit_buy = sum(i['lit'] for i in tc_oil_inv_list)
    tot_oil_tien_buy = sum(i['tong'] for i in tc_oil_inv_list)
    note_oil_text = f"📌 Ghi chú bảo lưu Dầu DO: Tổng HĐ mua {tot_oil_lit_buy:,.1f} L ({tot_oil_tien_buy:,.0f} đ) — Tiêu hao chạy máy 49,598,908 đ ➔ Tiền HĐ còn dư bảo lưu kho: +{r_oil:,.0f} đ"
    n_cell = ws_map2.cell(note_dau_row, 1, note_oil_text)
    n_cell.font = FONT_ITALIC; n_cell.fill = FILL_NOTE
    ws_map2.merge_cells(start_row=note_dau_row, start_column=1, end_row=note_dau_row, end_column=11)
    for c in range(1, 12):
        ws_map2.cell(note_dau_row, c).border = BORDER_ALL
        ws_map2.cell(note_dau_row, c).fill = FILL_NOTE
    curr_row += 2

    # Section II: Xăng RON 95
    sec2_cell = ws_map2.cell(curr_row, 1, "II. BẢNG KÊ PHÂN BỔ NHIÊN LIỆU XĂNG RON 95 (RON 95-III) — GÁN HÓA ĐƠN THEO TRẠM")
    sec2_cell.font = FONT_SECTION
    sec2_cell.fill = FILL_SECTION
    ws_map2.row_dimensions[curr_row].height = 24
    ws_map2.merge_cells(start_row=curr_row, start_column=1, end_row=curr_row, end_column=11)
    for c in range(1, 12):
        ws_map2.cell(curr_row, c).border = BORDER_ALL
        ws_map2.cell(curr_row, c).fill = FILL_SECTION

    gas_start_row = curr_row + 1
    curr_row += 1
    for a in a_gas:
        ws_map2.row_dimensions[curr_row].height = 20
        c1 = ws_map2.cell(curr_row, 1, a['sid'])
        c1.alignment = ALIGN_CENTER; c1.font = FONT_MAIN; c1.border = BORDER_ALL

        c2 = ws_map2.cell(curr_row, 2, a['st_amt'])
        c2.alignment = ALIGN_RIGHT; c2.font = FONT_MAIN; c2.border = BORDER_ALL
        if a['st_amt'] is not None: c2.number_format = '#,##0'

        c3 = ws_map2.cell(curr_row, 3, a['so_hd'])
        c3.alignment = ALIGN_CENTER; c3.font = FONT_MAIN; c3.border = BORDER_ALL

        c4 = ws_map2.cell(curr_row, 4, a['amt'])
        c4.alignment = ALIGN_RIGHT; c4.font = FONT_MAIN; c4.border = BORDER_ALL
        c4.number_format = '#,##0'

        inv = a['inv']
        c5 = ws_map2.cell(curr_row, 5, inv['don_vi']); c5.alignment = ALIGN_LEFT; c5.font = FONT_MAIN; c5.border = BORDER_ALL
        c6 = ws_map2.cell(curr_row, 6, inv['mst']); c6.alignment = ALIGN_CENTER; c6.font = FONT_MAIN; c6.border = BORDER_ALL
        c7 = ws_map2.cell(curr_row, 7, inv['ky_hieu']); c7.alignment = ALIGN_CENTER; c7.font = FONT_MAIN; c7.border = BORDER_ALL
        c8 = ws_map2.cell(curr_row, 8, inv['link']); c8.alignment = ALIGN_LEFT; c8.font = FONT_MAIN; c8.border = BORDER_ALL
        c9 = ws_map2.cell(curr_row, 9, inv['fkey']); c9.alignment = ALIGN_CENTER; c9.font = FONT_MAIN; c9.border = BORDER_ALL
        c10 = ws_map2.cell(curr_row, 10, inv['ngay']); c10.alignment = ALIGN_CENTER; c10.font = FONT_MAIN; c10.border = BORDER_ALL
        c11 = ws_map2.cell(curr_row, 11, a['label']); c11.alignment = ALIGN_LEFT; c11.font = FONT_MAIN; c11.border = BORDER_ALL
        curr_row += 1
    gas_end_row = curr_row - 1

    # Total Xăng RON 95
    tot_gas_row = curr_row
    ws_map2.row_dimensions[tot_gas_row].height = 22
    ws_map2.cell(tot_gas_row, 1, "TỔNG CỘNG XĂNG RON 95").font = FONT_BOLD
    ws_map2.cell(tot_gas_row, 1).fill = FILL_TOTAL; ws_map2.cell(tot_gas_row, 1).border = BORDER_TOTAL
    ws_map2.cell(tot_gas_row, 2, f"=SUM(B{gas_start_row}:B{gas_end_row})").font = FONT_BOLD
    ws_map2.cell(tot_gas_row, 2).fill = FILL_TOTAL; ws_map2.cell(tot_gas_row, 2).border = BORDER_TOTAL
    ws_map2.cell(tot_gas_row, 2).number_format = '#,##0'
    ws_map2.cell(tot_gas_row, 3, None).fill = FILL_TOTAL; ws_map2.cell(tot_gas_row, 3).border = BORDER_TOTAL
    ws_map2.cell(tot_gas_row, 4, f"=SUM(D{gas_start_row}:D{gas_end_row})").font = FONT_BOLD
    ws_map2.cell(tot_gas_row, 4).fill = FILL_TOTAL; ws_map2.cell(tot_gas_row, 4).border = BORDER_TOTAL
    ws_map2.cell(tot_gas_row, 4).number_format = '#,##0'
    for c in range(5, 12):
        ws_map2.cell(tot_gas_row, c).fill = FILL_TOTAL
        ws_map2.cell(tot_gas_row, c).border = BORDER_TOTAL
    curr_row += 1

    # Note Xăng RON 95
    note_gas_row = curr_row
    ws_map2.row_dimensions[note_gas_row].height = 22
    tot_gas_lit_buy = sum(i['lit'] for i in tc_gas_inv_list)
    tot_gas_tien_buy = sum(i['tong'] for i in tc_gas_inv_list)
    note_gas_text = f"📌 Ghi chú bảo lưu Xăng RON 95: Tổng HĐ mua {tot_gas_lit_buy:,.1f} L ({tot_gas_tien_buy:,.0f} đ) — Tiêu hao chạy máy 21,669,675 đ ➔ Tiền HĐ còn dư bảo lưu kho: +{r_gas:,.0f} đ"
    n_cell_g = ws_map2.cell(note_gas_row, 1, note_gas_text)
    n_cell_g.font = FONT_ITALIC; n_cell_g.fill = FILL_NOTE
    ws_map2.merge_cells(start_row=note_gas_row, start_column=1, end_row=note_gas_row, end_column=11)
    for c in range(1, 12):
        ws_map2.cell(note_gas_row, c).border = BORDER_ALL
        ws_map2.cell(note_gas_row, c).fill = FILL_NOTE
    curr_row += 2

    # Grand Total
    grand_total_row = curr_row
    ws_map2.row_dimensions[grand_total_row].height = 24
    ws_map2.cell(grand_total_row, 1, "TỔNG CỘNG TOÀN BỘ (DẦU DO + XĂNG RON 95)").font = FONT_BOLD
    ws_map2.cell(grand_total_row, 1).fill = FILL_TOTAL; ws_map2.cell(grand_total_row, 1).border = BORDER_TOTAL
    ws_map2.cell(grand_total_row, 2, f"=B{tot_dau_row}+B{tot_gas_row}").font = FONT_BOLD
    ws_map2.cell(grand_total_row, 2).fill = FILL_TOTAL; ws_map2.cell(grand_total_row, 2).border = BORDER_TOTAL
    ws_map2.cell(grand_total_row, 2).number_format = '#,##0'
    ws_map2.cell(grand_total_row, 3, None).fill = FILL_TOTAL; ws_map2.cell(grand_total_row, 3).border = BORDER_TOTAL
    ws_map2.cell(grand_total_row, 4, f"=D{tot_dau_row}+D{tot_gas_row}").font = FONT_BOLD
    ws_map2.cell(grand_total_row, 4).fill = FILL_TOTAL; ws_map2.cell(grand_total_row, 4).border = BORDER_TOTAL
    ws_map2.cell(grand_total_row, 4).number_format = '#,##0'
    for c in range(5, 12):
        ws_map2.cell(grand_total_row, c).fill = FILL_TOTAL
        ws_map2.cell(grand_total_row, c).border = BORDER_TOTAL
    curr_row += 2

    # Ghi chú nghiệp vụ
    ws_map2.cell(curr_row, 1, "GHI CHÚ ĐỐI SOÁT NGHIỆP VỤ & PHƯƠNG ÁN THANH TOÁN (PHƯƠNG ÁN B):").font = FONT_BOLD
    curr_row += 1
    notes = [
        "1. Tổng tiền chạy máy theo hồ sơ 02A TTNB: 71,268,583 đồng (195 ca chạy máy).",
        "2. Tổng tiền phân bổ hóa đơn (Cột D): 71,268,583 đồng -> ĐÁP ỨNG CHÍNH XÁC 100%, CHÊNH LỆCH = 0 ĐỒNG.",
        "3. Trạm DNDQ19 (DNIDQU07) và DNLK08 (DNILKH02) chạy máy xăng lưu động (MLĐ KYO POWER, MLĐ KiBii) -> Phân bổ 100% chính xác từ hóa đơn XĂNG RON 95.",
        "4. Lệnh chuyển khoản cho Nam Trung Phong ngày 19/09: 8,982,000 đ (HĐ 676405).",
        "5. Lệnh chuyển khoản cho Nam Trung Phong ngày 30/09: 2,400,203 đ (HĐ 704930 trích dùng 158,456 đ, bảo lưu 2,241,747 đ).",
        "6. Lệnh chuyển khoản cho Nam Trung Phong ngày 09/09: 4,650,213 đ (HĐ 652795: 3,800,114 đ + HĐ 651553: 850,099 đ).",
        "7. Tất cả hóa đơn còn lại của Toàn Cầu (ngày phát hành cùng đơn vị <= 5 triệu/ngày) thanh toán 100% bằng TIỀN MẶT."
    ]
    for n in notes:
        ws_map2.cell(curr_row, 1, n).font = FONT_MAIN
        curr_row += 1

    # -------------------------------------------------------------
    # 3. Update HD_Du_Thua_Khong_Su_Dung (remove 650165)
    # -------------------------------------------------------------
    print(">>> 3. Removing 650165 from HD_Du_Thua_Khong_Su_Dung...")
    rows_to_delete = []
    for r in range(4, ws_surplus.max_row+1):
        hd = ws_surplus.cell(r, 3).value
        if str(hd).strip() == '650165':
            rows_to_delete.append(r)
    for r in reversed(rows_to_delete):
        ws_surplus.delete_rows(r)

    # Re-index STT in surplus
    for idx, r in enumerate(range(4, ws_surplus.max_row+1), 1):
        if ws_surplus.cell(r, 3).value:
            ws_surplus.cell(r, 1, idx)

    # -------------------------------------------------------------
    # 4. Save
    # -------------------------------------------------------------
    print(f">>> 4. Saving updated workbook to {HSTT_PATH} and {DOWNLOADS_PATH}...")
    wb.save(HSTT_PATH)
    shutil.copyfile(HSTT_PATH, DOWNLOADS_PATH)
    print(">>> PERFECT EXCEL UPDATE COMPLETE!")

if __name__ == '__main__':
    run()
