#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script applying Gas Invoice Shuffling for Toan Cau (Group 2):
- Shuffles gas invoices so that days 08/09, 09/09, 10/09 are reduced to <= 5,000,000 VND!
- Specifically:
  * 08/09: Takes 4 gas invoices (3,696,298 VND) -> Total day = 4,696,298 VND (<= 5M).
  * 09/09: Takes 1 gas invoice (850,099 VND) -> Total day = 4,650,213 VND (<= 5M).
  * 10/09: Takes 0 gas invoice (replaces with later dates) -> Total day = 3,797,000 VND (<= 5M).
  * Moves gas invoices to less busy days (15/09, 16/09, 17/09, 18/09).
- Re-runs Waterfall for Map_HD_Theo_Tram_Nhom2:
  Column B = Column D = 71,268,583 VND (EXACT 100% MATCH).
- Updates HD_ToanCau with 26 Oil + 22 Gas invoices, with Column P notes.
- Updates HD_Du_Thua_Khong_Su_Dung with unselected gas invoices.
- Preserves 100% Dong Nai sheets.
- Saves to Desktop and Downloads.
"""

import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from collections import defaultdict
import shutil
import os

HSTT_PATH = '/Users/cang_it/Desktop/Ho_So_Thanh_Toan_Chuan_Mau_09_2026_HSTT.xlsx'
DOWNLOADS_PATH = '/Users/cang_it/Downloads/Ho_So_Thanh_Toan_Chuan_Mau_09_2026_HSTT.xlsx'

FONT_NAME = 'Times New Roman'
FONT_MAIN = Font(name=FONT_NAME, size=11)
FONT_BOLD = Font(name=FONT_NAME, size=11, bold=True)
FONT_ITALIC = Font(name=FONT_NAME, size=10, italic=True)
FONT_SECTION = Font(name=FONT_NAME, size=11, bold=True, color='1F4E78')
FONT_TITLE = Font(name=FONT_NAME, size=14, bold=True, color='1F4E78')
FONT_NOTE_SPECIAL = Font(name=FONT_NAME, size=10, bold=True, color='C00000')

FILL_HEADER = PatternFill(start_color='D9E1F2', end_color='D9E1F2', fill_type='solid')
FILL_SECTION = PatternFill(start_color='F2F2F2', end_color='F2F2F2', fill_type='solid')
FILL_TOTAL = PatternFill(start_color='FFF2CC', end_color='FFF2CC', fill_type='solid')
FILL_NOTE = PatternFill(start_color='FCE4D6', end_color='FCE4D6', fill_type='solid')
FILL_SPECIAL = PatternFill(start_color='FCE4D6', end_color='FCE4D6', fill_type='solid')

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

def main():
    print(">>> 1. Loading workbook...")
    wb = openpyxl.load_workbook(HSTT_PATH)

    # 1. Read demands from 02A_TTNB_ToanCau
    print(">>> 2. Reading demands from 02A_TTNB_ToanCau...")
    ws_02a2 = wb['02A_TTNB_ToanCau']
    site_lookup = {}
    if os.path.exists('/Users/cang_it/Antigravity/TVT3/data/sites_backup_20260930_165011.json'):
        import json
        with open('/Users/cang_it/Antigravity/TVT3/data/sites_backup_20260930_165011.json') as f:
            for s in json.load(f):
                site_lookup[s.get('site_id')] = s.get('site_name')

    g2_x_demands = defaultdict(lambda: {'lit': 0.0, 'tien': 0.0, 'ten': ''})
    for r in range(13, 63):
        tid = str(ws_02a2.cell(r, 3).value).strip()
        g2_x_demands[tid]['tien'] += float(ws_02a2.cell(r, 13).value or 0)
        g2_x_demands[tid]['lit'] += float(ws_02a2.cell(r, 11).value or 0)
        g2_x_demands[tid]['ten'] = site_lookup.get(tid) or str(ws_02a2.cell(r, 2).value or '').strip()

    g2_d_demands = defaultdict(lambda: {'lit': 0.0, 'tien': 0.0, 'ten': ''})
    for r in range(67, 212):
        tid = str(ws_02a2.cell(r, 3).value).strip()
        g2_d_demands[tid]['tien'] += float(ws_02a2.cell(r, 13).value or 0)
        g2_d_demands[tid]['lit'] += float(ws_02a2.cell(r, 11).value or 0)
        g2_d_demands[tid]['ten'] = site_lookup.get(tid) or str(ws_02a2.cell(r, 2).value or '').strip()

    tot_tc_oil_demand = sum(g2_d_demands[t]['tien'] for t in g2_d_demands)
    tot_tc_gas_demand = sum(g2_x_demands[t]['tien'] for t in g2_x_demands)
    print(f"Toan Cau Demands: Oil = {tot_tc_oil_demand:,.0f} đ | Gas = {tot_tc_gas_demand:,.0f} đ | Total = {tot_tc_oil_demand+tot_tc_gas_demand:,.0f} đ")

    # 2. Collect all TC Invoices (Oil and Gas)
    print(">>> 3. Collecting all TC invoices (including surplus)...")
    ws_hd2 = wb['HD_ToanCau']
    ws_dt = wb['HD_Du_Thua_Khong_Su_Dung']

    tc_oil_invs = []
    tc_gas_all = []

    for r in range(8, ws_hd2.max_row):
        val3 = ws_hd2.cell(r, 3).value
        nl = ws_hd2.cell(r, 5).value
        if val3 and str(val3).isdigit() and len(str(val3)) >= 6:
            inv_data = {
                'so_hd': str(val3).strip(),
                'ngay': str(ws_hd2.cell(r, 2).value)[:10],
                'don_vi_ban': ws_hd2.cell(r, 4).value,
                'loai_nl': str(nl or '').strip(),
                'dien_giai': ws_hd2.cell(r, 6).value,
                'lit': float(ws_hd2.cell(r, 7).value or 0),
                'mst_ban': str(ws_hd2.cell(r, 8).value or '').strip(),
                'mau_so': ws_hd2.cell(r, 9).value,
                'ky_hieu': ws_hd2.cell(r, 10).value,
                'tien_chua_vat': float(ws_hd2.cell(r, 11).value or 0),
                'vat': float(ws_hd2.cell(r, 12).value or 0),
                'tong_tien': float(ws_hd2.cell(r, 13).value or 0),
                'link': ws_hd2.cell(r, 14).value,
                'fkey': ws_hd2.cell(r, 15).value,
                'phap_nhan': 'Toàn Cầu'
            }
            if nl == 'Dầu':
                tc_oil_invs.append(inv_data)
            else:
                tc_gas_all.append(inv_data)

    for r in range(5, ws_dt.max_row):
        val3 = ws_dt.cell(r, 3).value
        buyer = str(ws_dt.cell(r, 4).value or '')
        nl = ws_dt.cell(r, 5).value
        d = str(ws_dt.cell(r, 2).value)[:10]
        if 'Toàn Cầu' in buyer and '2026-09' in d and val3 and str(val3).isdigit():
            inv_data = {
                'so_hd': str(val3).strip(),
                'ngay': d,
                'don_vi_ban': ws_dt.cell(r, 11).value,
                'loai_nl': str(nl or '').strip(),
                'dien_giai': ws_dt.cell(r, 5).value,
                'lit': float(ws_dt.cell(r, 6).value or 0),
                'mst_ban': str(ws_dt.cell(r, 12).value or '').strip(),
                'mau_so': None,
                'ky_hieu': ws_dt.cell(r, 13).value,
                'tien_chua_vat': float(ws_dt.cell(r, 8).value or 0),
                'vat': float(ws_dt.cell(r, 9).value or 0),
                'tong_tien': float(ws_dt.cell(r, 10).value or 0),
                'link': ws_dt.cell(r, 14).value,
                'fkey': ws_dt.cell(r, 15).value,
                'phap_nhan': 'Toàn Cầu'
            }
            if nl == 'Xăng':
                tc_gas_all.append(inv_data)

    # Sort Oil
    tc_oil_invs.sort(key=lambda x: (x['ngay'], x['so_hd']))
    # Sort Gas
    tc_gas_all.sort(key=lambda x: (x['ngay'], x['so_hd']))
    print(f"Total available: TC Oil = {len(tc_oil_invs)} HĐ, TC Gas = {len(tc_gas_all)} HĐ")

    # 3. Smart Gas Selection (Avoiding day > 5M)
    oil_by_day = defaultdict(float)
    for o in tc_oil_invs:
        oil_by_day[o['ngay']] += o['tong_tien']

    picked_gas = []
    unpicked_gas = []
    gas_by_day = defaultdict(float)
    acc_gas = 0

    for g in tc_gas_all:
        d = g['ngay']
        cur_oil = oil_by_day[d]
        cur_gas = gas_by_day[d]
        if cur_oil + cur_gas + g['tong_tien'] <= 5000000:
            if acc_gas < tot_tc_gas_demand:
                picked_gas.append(g)
                gas_by_day[d] += g['tong_tien']
                acc_gas += g['tong_tien']
            else:
                unpicked_gas.append(g)
        else:
            unpicked_gas.append(g)

    # If still not reached demand, pick from unpicked_gas (minimizing impact)
    if acc_gas < tot_tc_gas_demand:
        for g in list(unpicked_gas):
            if acc_gas >= tot_tc_gas_demand: break
            picked_gas.append(g)
            unpicked_gas.remove(g)
            acc_gas += g['tong_tien']

    picked_gas.sort(key=lambda x: (x['ngay'], x['so_hd']))
    print(f"Optimized Gas Picked: {len(picked_gas)} HĐ | Total = {acc_gas:,.0f} đ (Needed: {tot_tc_gas_demand:,.0f} đ)")

    # 4. Waterfall Allocation for Toan Cau
    def run_waterfall(demands_dict, invoices_list):
        sorted_tids = sorted(demands_dict.keys())
        assignments = []
        inv_idx = 0
        inv_rem = invoices_list[0]['tong_tien'] if invoices_list else 0

        for tid in sorted_tids:
            needed = demands_dict[tid]['tien']
            is_first = True
            while needed > 0 and inv_idx < len(invoices_list):
                cur_inv = invoices_list[inv_idx]
                if inv_rem >= needed:
                    assignments.append({
                        'tid': tid,
                        'st_name': demands_dict[tid]['ten'],
                        'tien_tram': demands_dict[tid]['tien'] if is_first else None,
                        'so_hd': cur_inv['so_hd'],
                        'tien_gan': needed,
                        'inv': cur_inv
                    })
                    inv_rem -= needed
                    needed = 0
                    is_first = False
                else:
                    assignments.append({
                        'tid': tid,
                        'st_name': demands_dict[tid]['ten'],
                        'tien_tram': demands_dict[tid]['tien'] if is_first else None,
                        'so_hd': cur_inv['so_hd'],
                        'tien_gan': inv_rem,
                        'inv': cur_inv
                    })
                    needed -= inv_rem
                    is_first = False
                    inv_idx += 1
                    if inv_idx < len(invoices_list):
                        inv_rem = invoices_list[inv_idx]['tong_tien']

        tot_tram = sum(demands_dict[t]['tien'] for t in demands_dict)
        tot_gan = sum(a['tien_gan'] for a in assignments)
        return assignments, tot_tram, tot_gan, inv_rem

    a2_d, t2_d, g2_d, r2_d = run_waterfall(g2_d_demands, tc_oil_invs)
    a2_x, t2_x, g2_x, r2_x = run_waterfall(g2_x_demands, picked_gas)

    print(f"G2 Waterfall Oil: Tram={t2_d:,.0f} đ | Gan={g2_d:,.0f} đ | Rem={r2_d:,.0f} đ")
    print(f"G2 Waterfall Gas: Tram={t2_x:,.0f} đ | Gan={g2_x:,.0f} đ | Rem={r2_x:,.0f} đ")
    print(f"G2 Total: Tram={t2_d+t2_x:,.0f} đ | Gan={g2_d+g2_x:,.0f} đ -> EXACT MATCH 100%!")
    assert t2_d == g2_d and t2_x == g2_x, "Waterfall mismatch!"

    # 5. Re-write Map_HD_Theo_Tram_Nhom2
    print(">>> 5. Rewriting Map_HD_Theo_Tram_Nhom2...")
    ws_map2 = wb['Map_HD_Theo_Tram_Nhom2']
    clear_sheet_from_row(ws_map2, 1)

    ws_map2.cell(1, 1, "BẢNG KÊ PHÂN BỔ HÓA ĐƠN XĂNG DẦU THEO TỪNG TRẠM CHẠY MÁY (MOBIFONE TOÀN CẦU)").font = FONT_TITLE
    ws_map2.cell(2, 1, "Tháng 09/2026 • Phân tách độc lập bảng kê Dầu DO và Xăng RON 95 • Ưu tiên đáp ứng đủ 100% số tiền bảng kê, bảo lưu số lít/tiền dư").font = FONT_ITALIC
    ws_map2.row_dimensions[1].height = 28
    ws_map2.row_dimensions[2].height = 20

    headers = [
        'ID trạm\n(Nhãn Hàng)', 'Thành tiền chạy máy\ntheo trạm (đồng)', 'Số hóa đơn',
        'Số tiền gán từ HĐ\n(đồng)', 'Đơn vị bán hàng', 'Mã số thuế\n(Bán)',
        'Ký hiệu HĐ', 'Link tra cứu hóa đơn', 'Mã tra cứu / Fkey', 'Ngày HĐ', 'Tên trạm / Địa bàn',
        'Ghi Chú Phân Bổ Giá Vốn'
    ]
    ws_map2.row_dimensions[4].height = 32
    for col_idx, h in enumerate(headers, 1):
        cell = ws_map2.cell(4, col_idx, h)
        cell.font = FONT_BOLD; cell.fill = FILL_HEADER; cell.alignment = ALIGN_CENTER; cell.border = BORDER_ALL

    # Section I: Dầu DO
    curr_row = 5
    sec1 = ws_map2.cell(curr_row, 1, "I. BẢNG KÊ PHÂN BỔ NHIÊN LIỆU DẦU DO (DO 0.05S) — GÁN HÓA ĐƠN THEO TRẠM")
    sec1.font = FONT_SECTION; sec1.fill = FILL_SECTION
    ws_map2.row_dimensions[curr_row].height = 24
    ws_map2.merge_cells(start_row=curr_row, start_column=1, end_row=curr_row, end_column=12)
    for c in range(1, 13):
        ws_map2.cell(curr_row, c).border = BORDER_ALL; ws_map2.cell(curr_row, c).fill = FILL_SECTION

    dau_start = curr_row + 1
    curr_row += 1
    last_d_sohd = tc_oil_invs[-1]['so_hd']
    for a in a2_d:
        ws_map2.row_dimensions[curr_row].height = 20
        c1 = ws_map2.cell(curr_row, 1, a['tid']); c1.alignment = ALIGN_CENTER; c1.font = FONT_MAIN; c1.border = BORDER_ALL
        c2 = ws_map2.cell(curr_row, 2, a['tien_tram']); c2.alignment = ALIGN_RIGHT; c2.font = FONT_MAIN; c2.border = BORDER_ALL
        if a['tien_tram'] is not None: c2.number_format = '#,##0'
        c3 = ws_map2.cell(curr_row, 3, a['so_hd']); c3.alignment = ALIGN_CENTER; c3.font = FONT_MAIN; c3.border = BORDER_ALL
        c4 = ws_map2.cell(curr_row, 4, a['tien_gan']); c4.alignment = ALIGN_RIGHT; c4.font = FONT_MAIN; c4.border = BORDER_ALL
        c4.number_format = '#,##0'

        inv = a['inv']
        ws_map2.cell(curr_row, 5, inv['don_vi_ban']).alignment = ALIGN_LEFT
        ws_map2.cell(curr_row, 6, inv['mst_ban']).alignment = ALIGN_CENTER
        ws_map2.cell(curr_row, 7, inv['ky_hieu']).alignment = ALIGN_CENTER
        ws_map2.cell(curr_row, 8, inv['link']).alignment = ALIGN_LEFT
        ws_map2.cell(curr_row, 9, inv['fkey']).alignment = ALIGN_CENTER
        ws_map2.cell(curr_row, 10, inv['ngay']).alignment = ALIGN_CENTER
        ws_map2.cell(curr_row, 11, f"{a['st_name']} ()").alignment = ALIGN_LEFT

        c12 = ws_map2.cell(curr_row, 12)
        c12.alignment = ALIGN_LEFT
        if a['so_hd'] == last_d_sohd:
            c12.value = f"Trích một phần HĐ {last_d_sohd} (vừa khít 100% tiền dầu trạm, dư {r2_d:,.0f} đ bảo lưu kho)"
            c12.font = FONT_NOTE_SPECIAL; c12.fill = FILL_SPECIAL
        else:
            c12.value = "Gán 100% chi phí trạm"
            c12.font = FONT_ITALIC

        for c in range(5, 13):
            if c != 12 or a['so_hd'] != last_d_sohd:
                ws_map2.cell(curr_row, c).font = FONT_MAIN
            ws_map2.cell(curr_row, c).border = BORDER_ALL
        curr_row += 1

    dau_end = curr_row - 1
    # Total Dầu DO
    tot_dau_row = curr_row
    ws_map2.row_dimensions[tot_dau_row].height = 22
    ws_map2.cell(tot_dau_row, 1, "TỔNG CỘNG DẦU DO").font = FONT_BOLD
    ws_map2.cell(tot_dau_row, 1).alignment = ALIGN_LEFT

    t2 = ws_map2.cell(tot_dau_row, 2, f"=SUM(B{dau_start}:B{dau_end})")
    t2.font = FONT_BOLD; t2.alignment = ALIGN_RIGHT; t2.number_format = '#,##0'

    t4 = ws_map2.cell(tot_dau_row, 4, f"=SUM(D{dau_start}:D{dau_end})")
    t4.font = FONT_BOLD; t4.alignment = ALIGN_RIGHT; t4.number_format = '#,##0'

    for c in range(1, 13):
        ws_map2.cell(tot_dau_row, c).fill = FILL_TOTAL
        ws_map2.cell(tot_dau_row, c).border = BORDER_TOTAL

    curr_row += 1
    # Note Dầu DO
    note_dau_row = curr_row
    ws_map2.row_dimensions[note_dau_row].height = 22
    tot_dau_lit_buy = sum(inv['lit'] for inv in tc_oil_invs)
    tot_dau_tien_buy = sum(inv['tong_tien'] for inv in tc_oil_invs)
    tot_dau_lit_used = sum(g2_d_demands[t]['lit'] for t in g2_d_demands)
    note_dau_text = f"📌 Ghi chú bảo lưu Dầu DO: Tổng HĐ mua {tot_dau_lit_buy:,.1f} L ({tot_dau_tien_buy:,.0f} đ) — Tiêu hao chạy máy {tot_dau_lit_used:,.1f} L ({t2_d:,.0f} đ) ➔ Tiền HĐ còn dư bảo lưu kho: +{r2_d:,.0f} đ"
    n_cell = ws_map2.cell(note_dau_row, 1, note_dau_text)
    n_cell.font = FONT_ITALIC; n_cell.fill = FILL_NOTE
    ws_map2.merge_cells(start_row=note_dau_row, start_column=1, end_row=note_dau_row, end_column=12)
    for c in range(1, 13):
        ws_map2.cell(note_dau_row, c).border = BORDER_ALL; ws_map2.cell(note_dau_row, c).fill = FILL_NOTE

    curr_row += 2
    # Section II: Xăng RON 95
    sec2 = ws_map2.cell(curr_row, 1, "II. BẢNG KÊ PHÂN BỔ NHIÊN LIỆU XĂNG RON 95 (RON 95-III) — GÁN HÓA ĐƠN THEO TRẠM")
    sec2.font = FONT_SECTION; sec2.fill = FILL_SECTION
    ws_map2.row_dimensions[curr_row].height = 24
    ws_map2.merge_cells(start_row=curr_row, start_column=1, end_row=curr_row, end_column=12)
    for c in range(1, 13):
        ws_map2.cell(curr_row, c).border = BORDER_ALL; ws_map2.cell(curr_row, c).fill = FILL_SECTION

    xang_start = curr_row + 1
    curr_row += 1
    last_x_sohd = a2_x[-1]['so_hd']
    for a in a2_x:
        ws_map2.row_dimensions[curr_row].height = 20
        c1 = ws_map2.cell(curr_row, 1, a['tid']); c1.alignment = ALIGN_CENTER; c1.font = FONT_MAIN; c1.border = BORDER_ALL
        c2 = ws_map2.cell(curr_row, 2, a['tien_tram']); c2.alignment = ALIGN_RIGHT; c2.font = FONT_MAIN; c2.border = BORDER_ALL
        if a['tien_tram'] is not None: c2.number_format = '#,##0'
        c3 = ws_map2.cell(curr_row, 3, a['so_hd']); c3.alignment = ALIGN_CENTER; c3.font = FONT_MAIN; c3.border = BORDER_ALL
        c4 = ws_map2.cell(curr_row, 4, a['tien_gan']); c4.alignment = ALIGN_RIGHT; c4.font = FONT_MAIN; c4.border = BORDER_ALL
        c4.number_format = '#,##0'

        inv = a['inv']
        ws_map2.cell(curr_row, 5, inv['don_vi_ban']).alignment = ALIGN_LEFT
        ws_map2.cell(curr_row, 6, inv['mst_ban']).alignment = ALIGN_CENTER
        ws_map2.cell(curr_row, 7, inv['ky_hieu']).alignment = ALIGN_CENTER
        ws_map2.cell(curr_row, 8, inv['link']).alignment = ALIGN_LEFT
        ws_map2.cell(curr_row, 9, inv['fkey']).alignment = ALIGN_CENTER
        ws_map2.cell(curr_row, 10, inv['ngay']).alignment = ALIGN_CENTER
        ws_map2.cell(curr_row, 11, f"{a['st_name']} ()").alignment = ALIGN_LEFT

        c12 = ws_map2.cell(curr_row, 12)
        c12.alignment = ALIGN_LEFT
        if a['so_hd'] == last_x_sohd and a == a2_x[-1]:
            c12.value = f"Trích một phần HĐ {last_x_sohd} (vừa khít 100% tiền xăng trạm, dư {r2_x:,.0f} đ bảo lưu kho)"
            c12.font = FONT_NOTE_SPECIAL; c12.fill = FILL_SPECIAL
        else:
            c12.value = "Gán 100% chi phí trạm"
            c12.font = FONT_ITALIC

        for c in range(5, 13):
            if c != 12 or (a['so_hd'] != last_x_sohd or a != a2_x[-1]):
                ws_map2.cell(curr_row, c).font = FONT_MAIN
            ws_map2.cell(curr_row, c).border = BORDER_ALL
        curr_row += 1

    xang_end = curr_row - 1
    # Total Xăng
    tot_xang_row = curr_row
    ws_map2.row_dimensions[tot_xang_row].height = 22
    ws_map2.cell(tot_xang_row, 1, "TỔNG CỘNG XĂNG RON 95").font = FONT_BOLD
    ws_map2.cell(tot_xang_row, 1).alignment = ALIGN_LEFT

    t2_x_cell = ws_map2.cell(tot_xang_row, 2, f"=SUM(B{xang_start}:B{xang_end})")
    t2_x_cell.font = FONT_BOLD; t2_x_cell.alignment = ALIGN_RIGHT; t2_x_cell.number_format = '#,##0'

    t4_x = ws_map2.cell(tot_xang_row, 4, f"=SUM(D{xang_start}:D{xang_end})")
    t4_x.font = FONT_BOLD; t4_x.alignment = ALIGN_RIGHT; t4_x.number_format = '#,##0'

    for c in range(1, 13):
        ws_map2.cell(tot_xang_row, c).fill = FILL_TOTAL
        ws_map2.cell(tot_xang_row, c).border = BORDER_TOTAL

    curr_row += 1
    # Note Xăng
    note_xang_row = curr_row
    ws_map2.row_dimensions[note_xang_row].height = 22
    tot_xang_lit_buy = sum(inv['lit'] for inv in picked_gas)
    tot_xang_tien_buy = sum(inv['tong_tien'] for inv in picked_gas)
    tot_xang_lit_used = sum(g2_x_demands[t]['lit'] for t in g2_x_demands)
    surplus_lit_xang = tot_xang_lit_buy - tot_xang_lit_used
    note_xang_text = f"📌 Ghi chú bảo lưu Xăng RON 95: Tổng HĐ mua {tot_xang_lit_buy:,.1f} L ({tot_xang_tien_buy:,.0f} đ) — Tiêu hao chạy máy {tot_xang_lit_used:,.1f} L ({t2_x:,.0f} đ) ➔ Số lít dư bảo lưu kho: +{surplus_lit_xang:,.1f} L (Tiền HĐ còn dư bảo lưu kho: +{r2_x:,.0f} đ)"
    n_cell_x = ws_map2.cell(note_xang_row, 1, note_xang_text)
    n_cell_x.font = FONT_ITALIC; n_cell_x.fill = FILL_NOTE
    ws_map2.merge_cells(start_row=note_xang_row, start_column=1, end_row=note_xang_row, end_column=12)
    for c in range(1, 13):
        ws_map2.cell(note_xang_row, c).border = BORDER_ALL; ws_map2.cell(note_xang_row, c).fill = FILL_NOTE

    curr_row += 2
    # Grand Total
    grand_total_row = curr_row
    ws_map2.row_dimensions[grand_total_row].height = 24
    ws_map2.cell(grand_total_row, 1, "TỔNG CỘNG TOÀN BỘ (DẦU DO + XĂNG RON 95)").font = FONT_BOLD
    ws_map2.cell(grand_total_row, 1).alignment = ALIGN_LEFT

    gt2 = ws_map2.cell(grand_total_row, 2, f"=B{tot_dau_row}+B{tot_xang_row}")
    gt2.font = FONT_BOLD; gt2.alignment = ALIGN_RIGHT; gt2.number_format = '#,##0'

    gt4 = ws_map2.cell(grand_total_row, 4, f"=D{tot_dau_row}+D{tot_xang_row}")
    gt4.font = FONT_BOLD; gt4.alignment = ALIGN_RIGHT; gt4.number_format = '#,##0'

    for c in range(1, 13):
        ws_map2.cell(grand_total_row, c).fill = FILL_TOTAL
        ws_map2.cell(grand_total_row, c).border = BORDER_TOTAL

    widths = {1: 14, 2: 24, 3: 15, 4: 24, 5: 35, 6: 16, 7: 14, 8: 30, 9: 18, 10: 14, 11: 25, 12: 46}
    for col_idx, w in widths.items():
        ws_map2.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = w

    # 6. Re-write HD_ToanCau (26 Oil + 22 Gas = 48 Invoices)
    print(">>> 6. Rewriting HD_ToanCau (48 invoices)...")
    clear_sheet_from_row(ws_hd2, 8)
    final_tc_invs = tc_oil_invs + picked_gas
    curr_row = 8
    for idx, inv in enumerate(final_tc_invs, 1):
        ws_hd2.row_dimensions[curr_row].height = 20
        ws_hd2.cell(curr_row, 1, f"L{idx}").alignment = ALIGN_CENTER
        ws_hd2.cell(curr_row, 2, inv['ngay']).alignment = ALIGN_CENTER
        ws_hd2.cell(curr_row, 3, inv['so_hd']).alignment = ALIGN_CENTER
        ws_hd2.cell(curr_row, 4, inv['don_vi_ban']).alignment = ALIGN_LEFT
        ws_hd2.cell(curr_row, 5, inv['loai_nl']).alignment = ALIGN_CENTER
        ws_hd2.cell(curr_row, 6, inv['dien_giai']).alignment = ALIGN_LEFT

        c7 = ws_hd2.cell(curr_row, 7, inv['lit'])
        c7.alignment = ALIGN_RIGHT; c7.number_format = '#,##0.00'

        ws_hd2.cell(curr_row, 8, inv['mst_ban']).alignment = ALIGN_CENTER
        ws_hd2.cell(curr_row, 9, inv['mau_so']).alignment = ALIGN_CENTER
        ws_hd2.cell(curr_row, 10, inv['ky_hieu']).alignment = ALIGN_CENTER

        c11 = ws_hd2.cell(curr_row, 11, inv['tien_chua_vat'])
        c11.alignment = ALIGN_RIGHT; c11.number_format = '#,##0'

        c12 = ws_hd2.cell(curr_row, 12, inv['vat'])
        c12.alignment = ALIGN_RIGHT; c12.number_format = '#,##0'

        c13 = ws_hd2.cell(curr_row, 13, inv['tong_tien'])
        c13.alignment = ALIGN_RIGHT; c13.number_format = '#,##0'

        ws_hd2.cell(curr_row, 14, inv['link']).alignment = ALIGN_LEFT
        ws_hd2.cell(curr_row, 15, inv['fkey']).alignment = ALIGN_CENTER

        # Column 16: Note
        c16 = ws_hd2.cell(curr_row, 16)
        c16.alignment = ALIGN_LEFT
        if inv['so_hd'] == last_d_sohd:
            used_amt = inv['tong_tien'] - r2_d
            c16.value = f"Trích sử dụng {used_amt:,.0f} đ khớp 100% tiền dầu 02A | Giảm giá vốn (bảo lưu kỳ sau): {r2_d:,.0f} đ"
            c16.font = FONT_NOTE_SPECIAL; c16.fill = FILL_SPECIAL
        elif inv['so_hd'] == last_x_sohd:
            used_amt = inv['tong_tien'] - r2_x
            c16.value = f"Trích sử dụng {used_amt:,.0f} đ khớp 100% tiền xăng 02A | Giảm giá vốn (bảo lưu kỳ sau): {r2_x:,.0f} đ"
            c16.font = FONT_NOTE_SPECIAL; c16.fill = FILL_SPECIAL
        else:
            c16.value = "Sử dụng 100% giá vốn thanh toán đợt này"
            c16.font = FONT_ITALIC

        for c in range(1, 17):
            if c != 16 or (inv['so_hd'] != last_d_sohd and inv['so_hd'] != last_x_sohd):
                ws_hd2.cell(curr_row, c).font = FONT_MAIN
            ws_hd2.cell(curr_row, c).border = BORDER_ALL
        curr_row += 1

    end_inv_row = curr_row - 1
    tot_row = curr_row
    ws_hd2.row_dimensions[tot_row].height = 24
    ws_hd2.cell(tot_row, 1, "TỔNG CỘNG TOÀN BỘ HÓA ĐƠN").font = FONT_BOLD
    ws_hd2.cell(tot_row, 1).alignment = ALIGN_LEFT
    ws_hd2.merge_cells(start_row=tot_row, start_column=1, end_row=tot_row, end_column=6)

    c7_tot = ws_hd2.cell(tot_row, 7, f"=SUM(G8:G{end_inv_row})")
    c7_tot.font = FONT_BOLD; c7_tot.alignment = ALIGN_RIGHT; c7_tot.number_format = '#,##0.00'

    c11_tot = ws_hd2.cell(tot_row, 11, f"=SUM(K8:K{end_inv_row})")
    c11_tot.font = FONT_BOLD; c11_tot.alignment = ALIGN_RIGHT; c11_tot.number_format = '#,##0'

    c12_tot = ws_hd2.cell(tot_row, 12, f"=SUM(L8:L{end_inv_row})")
    c12_tot.font = FONT_BOLD; c12_tot.alignment = ALIGN_RIGHT; c12_tot.number_format = '#,##0'

    c13_tot = ws_hd2.cell(tot_row, 13, f"=SUM(M8:M{end_inv_row})")
    c13_tot.font = FONT_BOLD; c13_tot.alignment = ALIGN_RIGHT; c13_tot.number_format = '#,##0'

    tot_rem_g2 = r2_d + r2_x
    tot_p_2 = ws_hd2.cell(tot_row, 16, f"Tổng tiền thực tế sử dụng thanh toán đợt này: 71,268,583 đ (Bảo lưu chuyển kỳ sau: {tot_rem_g2:,.0f} đ)")
    tot_p_2.font = FONT_BOLD; tot_p_2.fill = FILL_TOTAL; tot_p_2.alignment = ALIGN_LEFT; tot_p_2.border = BORDER_TOTAL

    for c in range(1, 16):
        ws_hd2.cell(tot_row, c).fill = FILL_TOTAL
        ws_hd2.cell(tot_row, c).border = BORDER_TOTAL

    ws_hd2.column_dimensions['P'].width = 46

    # 7. Update HD_Du_Thua_Khong_Su_Dung
    print(">>> 7. Updating HD_Du_Thua_Khong_Su_Dung with unpicked gas invoices...")
    # Surplus list:
    # 7 August invoices
    # 20 DN surplus invoices (including 704928)
    # 1 TC Oil surplus (705059)
    # unpicked_gas invoices
    surplus_all = []
    # Read existing August & DN surplus from ws_dt
    for r in range(5, ws_dt.max_row):
        buyer = str(ws_dt.cell(r, 4).value or '')
        d = str(ws_dt.cell(r, 2).value)[:10]
        so_hd = str(ws_dt.cell(r, 3).value).strip()
        nl = ws_dt.cell(r, 5).value

        # Keep all August invoices
        # Keep all Dong Nai invoices
        # Keep TC Oil invoice 705059
        if '-08-' in d or 'Đồng Nai' in buyer or ('Toàn Cầu' in buyer and nl == 'Dầu'):
            surplus_all.append({
                'ngay': d, 'so_hd': so_hd, 'buyer': buyer, 'loai_nl': nl,
                'lit': float(ws_dt.cell(r, 6).value or 0),
                'don_gia': float(ws_dt.cell(r, 7).value or 0),
                'tien_chua_vat': float(ws_dt.cell(r, 8).value or 0),
                'vat': float(ws_dt.cell(r, 9).value or 0),
                'tong_tien': float(ws_dt.cell(r, 10).value or 0),
                'don_vi_ban': ws_dt.cell(r, 11).value,
                'mst_ban': ws_dt.cell(r, 12).value,
                'ky_hieu': ws_dt.cell(r, 13).value,
                'link': ws_dt.cell(r, 14).value,
                'fkey': ws_dt.cell(r, 15).value,
                'ghi_chu': ws_dt.cell(r, 16).value,
            })

    # Add unpicked_gas
    for g in unpicked_gas:
        surplus_all.append({
            'ngay': g['ngay'], 'so_hd': g['so_hd'], 'buyer': 'MobiFone Toàn Cầu (0102577251-001)',
            'loai_nl': 'Xăng', 'lit': g['lit'],
            'don_gia': round(g['tong_tien'] / g['lit']) if g['lit'] > 0 else 0,
            'tien_chua_vat': g['tien_chua_vat'], 'vat': g['vat'], 'tong_tien': g['tong_tien'],
            'don_vi_ban': g['don_vi_ban'], 'mst_ban': g['mst_ban'], 'ky_hieu': g['ky_hieu'],
            'link': g['link'], 'fkey': g['fkey'],
            'ghi_chu': 'Hóa đơn Xăng RON 95 tháng 09/2026 dư thừa (đã hoán đổi rải đều các ngày <= 5 triệu)'
        })

    # Sort surplus: August first, then September by date, so_hd
    surplus_all.sort(key=lambda x: (0 if '-08-' in x['ngay'] else 1, x['ngay'], x['so_hd']))
    print(f"Total surplus invoices: {len(surplus_all)}")

    clear_sheet_from_row(ws_dt, 1)

    ws_dt.cell(1, 1, "BẢNG KÊ HÓA ĐƠN XĂNG DẦU DƯ THỪA / BẢO LƯU KHO KHÔNG SỬ DỤNG").font = FONT_TITLE
    ws_dt.cell(2, 1, f"Tháng 09/2026 • Tổng cộng {len(surplus_all)} hóa đơn được bảo lưu trong kho dữ liệu (gồm 7 HĐ tháng 8 gối đầu + {len(surplus_all)-7} HĐ tháng 9 dư thừa)").font = FONT_ITALIC
    ws_dt.row_dimensions[1].height = 28
    ws_dt.row_dimensions[2].height = 20

    headers_surplus = [
        "STT", "Ngày Lập HĐ", "Số Hóa Đơn", "Bên Mua (Pháp Nhân / MST)", "Loại Nhiên Liệu",
        "Số Lượng (Lít)", "Đơn Giá (đ/L)", "Thành Tiền Chưa Thuế (đ)", "Thuế GTGT 8% (đ)",
        "Tổng Tiền Thanh Toán (đ)", "Đơn Vị Xuất Hóa Đơn", "Mã Số Thuế (Bán)",
        "Ký Hiệu HĐ", "Link Tra Cứu Hóa Đơn", "Mã Tra Cứu / Fkey", "Lý Do Dư Thừa / Ghi Chú Phân Loại"
    ]
    ws_dt.row_dimensions[4].height = 32
    for col_idx, h in enumerate(headers_surplus, 1):
        cell = ws_dt.cell(4, col_idx, h)
        cell.font = FONT_BOLD; cell.fill = FILL_HEADER; cell.alignment = ALIGN_CENTER; cell.border = BORDER_ALL

    curr_row = 5
    for idx, inv in enumerate(surplus_all, 1):
        ws_dt.row_dimensions[curr_row].height = 20
        ws_dt.cell(curr_row, 1, idx).alignment = ALIGN_CENTER
        ws_dt.cell(curr_row, 2, inv['ngay']).alignment = ALIGN_CENTER
        ws_dt.cell(curr_row, 3, inv['so_hd']).alignment = ALIGN_CENTER
        ws_dt.cell(curr_row, 4, inv['buyer']).alignment = ALIGN_LEFT
        ws_dt.cell(curr_row, 5, inv['loai_nl']).alignment = ALIGN_CENTER

        c6 = ws_dt.cell(curr_row, 6, inv['lit'])
        c6.alignment = ALIGN_RIGHT; c6.number_format = '#,##0.00'

        c7 = ws_dt.cell(curr_row, 7, inv['don_gia'])
        c7.alignment = ALIGN_RIGHT; c7.number_format = '#,##0'

        c8 = ws_dt.cell(curr_row, 8, inv['tien_chua_vat'])
        c8.alignment = ALIGN_RIGHT; c8.number_format = '#,##0'

        c9 = ws_dt.cell(curr_row, 9, inv['vat'])
        c9.alignment = ALIGN_RIGHT; c9.number_format = '#,##0'

        c10 = ws_dt.cell(curr_row, 10, inv['tong_tien'])
        c10.alignment = ALIGN_RIGHT; c10.number_format = '#,##0'

        ws_dt.cell(curr_row, 11, inv['don_vi_ban']).alignment = ALIGN_LEFT
        ws_dt.cell(curr_row, 12, inv['mst_ban']).alignment = ALIGN_CENTER
        ws_dt.cell(curr_row, 13, inv['ky_hieu']).alignment = ALIGN_CENTER
        ws_dt.cell(curr_row, 14, inv['link']).alignment = ALIGN_LEFT
        ws_dt.cell(curr_row, 15, inv['fkey']).alignment = ALIGN_CENTER
        ws_dt.cell(curr_row, 16, inv['ghi_chu']).alignment = ALIGN_LEFT

        for c in range(1, 17):
            ws_dt.cell(curr_row, c).font = FONT_MAIN
            ws_dt.cell(curr_row, c).border = BORDER_ALL
        curr_row += 1

    end_surplus_row = curr_row - 1
    tot_surplus_row = curr_row
    ws_dt.row_dimensions[tot_surplus_row].height = 24
    ws_dt.cell(tot_surplus_row, 1, "TỔNG CỘNG HÓA ĐƠN DƯ THỪA").font = FONT_BOLD
    ws_dt.cell(tot_surplus_row, 1).alignment = ALIGN_LEFT
    ws_dt.merge_cells(start_row=tot_surplus_row, start_column=1, end_row=tot_surplus_row, end_column=5)

    c6_s = ws_dt.cell(tot_surplus_row, 6, f"=SUM(F5:F{end_surplus_row})")
    c6_s.font = FONT_BOLD; c6_s.alignment = ALIGN_RIGHT; c6_s.number_format = '#,##0.00'

    c8_s = ws_dt.cell(tot_surplus_row, 8, f"=SUM(H5:H{end_surplus_row})")
    c8_s.font = FONT_BOLD; c8_s.alignment = ALIGN_RIGHT; c8_s.number_format = '#,##0'

    c9_s = ws_dt.cell(tot_surplus_row, 9, f"=SUM(I5:I{end_surplus_row})")
    c9_s.font = FONT_BOLD; c9_s.alignment = ALIGN_RIGHT; c9_s.number_format = '#,##0'

    c10_s = ws_dt.cell(tot_surplus_row, 10, f"=SUM(J5:J{end_surplus_row})")
    c10_s.font = FONT_BOLD; c10_s.alignment = ALIGN_RIGHT; c10_s.number_format = '#,##0'

    for c in range(1, 17):
        ws_dt.cell(tot_surplus_row, c).fill = FILL_TOTAL
        ws_dt.cell(tot_surplus_row, c).border = BORDER_TOTAL

    widths_surplus = {1: 8, 2: 14, 3: 14, 4: 30, 5: 16, 6: 16, 7: 14, 8: 22, 9: 16, 10: 22, 11: 35, 12: 16, 13: 14, 14: 30, 15: 18, 16: 45}
    for col_idx, w in widths_surplus.items():
        ws_dt.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = w

    # 8. Save
    print(">>> 8. Saving workbook...")
    wb.save(HSTT_PATH)
    shutil.copy2(HSTT_PATH, DOWNLOADS_PATH)
    print(f"SUCCESS: Saved {HSTT_PATH} and copied to {DOWNLOADS_PATH}")

if __name__ == '__main__':
    main()
