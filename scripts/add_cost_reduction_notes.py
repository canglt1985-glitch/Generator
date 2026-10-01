#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script adding Cost Reduction / Truncation Notes (Ghi chú giảm giá vốn):
1. In HD_DongNai_67Tram and HD_ToanCau:
   - Adds Column 16 (Col P): 'Ghi Chú Sử Dụng / Bảo Lưu Giá Vốn'.
   - Notes specifically for invoices with reduced cost basis:
     * HD 705060 (DN Oil): Original 3,900,433 VND -> Used 3,896,248 VND | Reduced/Surplus 4,185 VND.
     * HD 656300 (DN Gas): Original 1,211,500 VND -> Used 1,176,939 VND | Reduced/Surplus 34,561 VND.
     * HD 704930 (TC Oil): Original 2,400,203 VND -> Used 1,965,209 VND | Reduced/Surplus 434,994 VND.
     * HD 202984 (TC Gas): Original 1,200,000 VND -> Used 742,245 VND | Reduced/Surplus 457,755 VND.
   - Other invoices: 'Sử dụng 100% giá vốn thanh toán đợt này'.
   - Total row: 'Tổng tiền thực tế sử dụng thanh toán đợt này = [Total 02A] (Bảo lưu chuyển kỳ sau: [Total Surplus])'.
2. In Map_HD_Theo_Tram_Nhom1 and Map_HD_Theo_Tram_Nhom2:
   - Adds Column 12 (Col L): 'Ghi Chú Phân Bổ Giá Vốn'.
   - Labels the last station assignment row for Oil and Gas with partial allocation notes.
3. Synchronizes to Desktop and Downloads.
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
FONT_NOTE_SPECIAL = Font(name=FONT_NAME, size=10, bold=True, color='C00000') # Dark Red

FILL_HEADER = PatternFill(start_color='D9E1F2', end_color='D9E1F2', fill_type='solid')
FILL_TOTAL = PatternFill(start_color='FFF2CC', end_color='FFF2CC', fill_type='solid')
FILL_SPECIAL = PatternFill(start_color='FCE4D6', end_color='FCE4D6', fill_type='solid')

THIN_SIDE = Side(border_style='thin', color='A6A6A6')
BORDER_ALL = Border(left=THIN_SIDE, right=THIN_SIDE, top=THIN_SIDE, bottom=THIN_SIDE)
DOUBLE_BOTTOM = Side(border_style='double', color='000000')
BORDER_TOTAL = Border(top=THIN_SIDE, bottom=DOUBLE_BOTTOM, left=THIN_SIDE, right=THIN_SIDE)

ALIGN_LEFT = Alignment(horizontal='left', vertical='center', wrap_text=True)
ALIGN_CENTER = Alignment(horizontal='center', vertical='center')

def main():
    print(">>> 1. Loading workbook...")
    wb = openpyxl.load_workbook(HSTT_PATH)

    # ---------------------------------------------------------
    # 1. UPDATE HD_DongNai_67Tram
    # ---------------------------------------------------------
    print(">>> 2. Adding Column P notes to HD_DongNai_67Tram...")
    ws1 = wb['HD_DongNai_67Tram']
    # Header Col P
    col_p = 16
    h_cell = ws1.cell(7, col_p, "Ghi Chú Phân Bổ / Bảo Lưu Giá Vốn")
    h_cell.font = FONT_BOLD; h_cell.fill = FILL_HEADER; h_cell.alignment = ALIGN_CENTER; h_cell.border = BORDER_ALL
    ws1.column_dimensions['P'].width = 46

    # Iterate rows 8 to 21
    for r in range(8, ws1.max_row):
        so_hd = str(ws1.cell(r, 3).value).strip()
        cell = ws1.cell(r, col_p)
        cell.border = BORDER_ALL
        cell.alignment = ALIGN_LEFT
        if so_hd == '705060':
            cell.value = "Trích sử dụng 3,896,248 đ (127.79 L) khớp 100% tiền dầu 02A | Giảm giá vốn (bảo lưu kỳ sau): 4,185 đ (0.14 L)"
            cell.font = FONT_NOTE_SPECIAL
            cell.fill = FILL_SPECIAL
        elif so_hd == '656300':
            cell.value = "Trích sử dụng 1,176,939 đ (39.70 L) khớp 100% tiền xăng 02A | Giảm giá vốn (bảo lưu kỳ sau): 34,561 đ (10.30 L)"
            cell.font = FONT_NOTE_SPECIAL
            cell.fill = FILL_SPECIAL
        else:
            cell.value = "Sử dụng 100% giá vốn thanh toán đợt này"
            cell.font = FONT_ITALIC

    # Total row Col P
    tot_row_1 = ws1.max_row
    tot_p_1 = ws1.cell(tot_row_1, col_p, "Tổng tiền thực tế sử dụng thanh toán đợt này: 29,833,311 đ (Bảo lưu chuyển kỳ sau: 38,746 đ)")
    tot_p_1.font = FONT_BOLD; tot_p_1.fill = FILL_TOTAL; tot_p_1.alignment = ALIGN_LEFT; tot_p_1.border = BORDER_TOTAL

    # ---------------------------------------------------------
    # 2. UPDATE HD_ToanCau
    # ---------------------------------------------------------
    print(">>> 3. Adding Column P notes to HD_ToanCau...")
    ws2 = wb['HD_ToanCau']
    # Header Col P
    h2_cell = ws2.cell(7, col_p, "Ghi Chú Phân Bổ / Bảo Lưu Giá Vốn")
    h2_cell.font = FONT_BOLD; h2_cell.fill = FILL_HEADER; h2_cell.alignment = ALIGN_CENTER; h2_cell.border = BORDER_ALL
    ws2.column_dimensions['P'].width = 46

    # Iterate rows 8 to 53
    for r in range(8, ws2.max_row):
        so_hd = str(ws2.cell(r, 3).value).strip()
        cell = ws2.cell(r, col_p)
        cell.border = BORDER_ALL
        cell.alignment = ALIGN_LEFT
        if so_hd == '704930':
            cell.value = "Trích sử dụng 1,965,209 đ (61.24 L) khớp 100% tiền dầu 02A | Giảm giá vốn (bảo lưu kỳ sau): 434,994 đ (13.56 L)"
            cell.font = FONT_NOTE_SPECIAL
            cell.fill = FILL_SPECIAL
        elif so_hd == '202984':
            cell.value = "Trích sử dụng 742,245 đ (30.63 L) khớp 100% tiền xăng 02A | Giảm giá vốn (bảo lưu kỳ sau): 457,755 đ (18.89 L)"
            cell.font = FONT_NOTE_SPECIAL
            cell.fill = FILL_SPECIAL
        else:
            cell.value = "Sử dụng 100% giá vốn thanh toán đợt này"
            cell.font = FONT_ITALIC

    # Total row Col P
    tot_row_2 = ws2.max_row
    tot_p_2 = ws2.cell(tot_row_2, col_p, "Tổng tiền thực tế sử dụng thanh toán đợt này: 71,268,583 đ (Bảo lưu chuyển kỳ sau: 892,749 đ)")
    tot_p_2.font = FONT_BOLD; tot_p_2.fill = FILL_TOTAL; tot_p_2.alignment = ALIGN_LEFT; tot_p_2.border = BORDER_TOTAL

    # ---------------------------------------------------------
    # 3. UPDATE Map_HD_Theo_Tram_Nhom1
    # ---------------------------------------------------------
    print(">>> 4. Adding Column L notes to Map_HD_Theo_Tram_Nhom1...")
    ws_map1 = wb['Map_HD_Theo_Tram_Nhom1']
    col_l = 12
    ws_map1.cell(4, col_l, "Ghi Chú Phân Bổ Giá Vốn").font = FONT_BOLD
    ws_map1.cell(4, col_l).fill = FILL_HEADER; ws_map1.cell(4, col_l).alignment = ALIGN_CENTER; ws_map1.cell(4, col_l).border = BORDER_ALL
    ws_map1.column_dimensions['L'].width = 46

    # Iterate rows in Map 1
    for r in range(6, ws_map1.max_row + 1):
        tid = ws_map1.cell(r, 1).value
        so_hd = str(ws_map1.cell(r, 3).value).strip()
        cell = ws_map1.cell(r, col_l)
        if tid and 'TỔNG CỘNG' not in str(tid) and '📌' not in str(tid):
            cell.border = BORDER_ALL
            cell.alignment = ALIGN_LEFT
            if so_hd == '705060':
                cell.value = "Trích 3,536,125 đ từ HĐ 705060 (vừa khít 100% tiền dầu trạm, dư 4,185 đ bảo lưu kho)"
                cell.font = FONT_NOTE_SPECIAL; cell.fill = FILL_SPECIAL
            elif so_hd == '656300' and ws_map1.cell(r, 1).value == 'DNTN14':
                cell.value = "Trích 73,002 đ từ HĐ 656300 (vừa khít 100% tiền xăng trạm, dư 34,561 đ bảo lưu kho)"
                cell.font = FONT_NOTE_SPECIAL; cell.fill = FILL_SPECIAL
            else:
                cell.value = "Gán 100% chi phí trạm"
                cell.font = FONT_ITALIC

    # ---------------------------------------------------------
    # 4. UPDATE Map_HD_Theo_Tram_Nhom2
    # ---------------------------------------------------------
    print(">>> 5. Adding Column L notes to Map_HD_Theo_Tram_Nhom2...")
    ws_map2 = wb['Map_HD_Theo_Tram_Nhom2']
    ws_map2.cell(4, col_l, "Ghi Chú Phân Bổ Giá Vốn").font = FONT_BOLD
    ws_map2.cell(4, col_l).fill = FILL_HEADER; ws_map2.cell(4, col_l).alignment = ALIGN_CENTER; ws_map2.cell(4, col_l).border = BORDER_ALL
    ws_map2.column_dimensions['L'].width = 46

    for r in range(6, ws_map2.max_row + 1):
        tid = ws_map2.cell(r, 1).value
        so_hd = str(ws_map2.cell(r, 3).value).strip()
        cell = ws_map2.cell(r, col_l)
        if tid and 'TỔNG CỘNG' not in str(tid) and '📌' not in str(tid):
            cell.border = BORDER_ALL
            cell.alignment = ALIGN_LEFT
            if so_hd == '704930':
                cell.value = "Trích một phần HĐ 704930 (vừa khít 100% tiền dầu trạm, dư 434,994 đ bảo lưu kho)"
                cell.font = FONT_NOTE_SPECIAL; cell.fill = FILL_SPECIAL
            elif so_hd == '202984':
                cell.value = "Trích một phần HĐ 202984 (vừa khít 100% tiền xăng trạm, dư 457,755 đ bảo lưu kho)"
                cell.font = FONT_NOTE_SPECIAL; cell.fill = FILL_SPECIAL
            else:
                cell.value = "Gán 100% chi phí trạm"
                cell.font = FONT_ITALIC

    # ---------------------------------------------------------
    # 5. SAVE WORKBOOK
    # ---------------------------------------------------------
    print(">>> 6. Saving workbook...")
    wb.save(HSTT_PATH)
    shutil.copy2(HSTT_PATH, DOWNLOADS_PATH)
    print(f"SUCCESS: Saved {HSTT_PATH} and copied to {DOWNLOADS_PATH}")

if __name__ == '__main__':
    main()
