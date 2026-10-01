#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script updating payment method notes (Tiền mặt / Chuyển khoản cây xăng)
for both Month 09/2026 and Month 08/2026 settlement workbooks:
- In HD sheets (Column P):
  * For dates where total invoices used > 5,000,000 VND:
    Notes: '💳 CHUYỂN KHOẢN CÂY XĂNG (Ngày DD/MM tổng HĐ X đ > 5tr) — Sử dụng 100% giá vốn'
    (Or if last invoice reducing cost: includes cost reduction breakdown)
    Formatted in bold red text with soft highlight fill!
  * For dates where total invoices used <= 5,000,000 VND:
    Notes: '💵 Tiền mặt (Ngày <= 5tr) — Sử dụng 100% giá vốn'
- In Map sheets (Column L):
  * Tags invoices belonging to days > 5M with '💳 HĐ ngày > 5tr (CK cây xăng)'
- Updates Desktop & Downloads files for both Month 9 and Month 8.
"""

import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from collections import defaultdict
import shutil
import os

FONT_NAME = 'Times New Roman'
FONT_MAIN = Font(name=FONT_NAME, size=11)
FONT_BOLD = Font(name=FONT_NAME, size=11, bold=True)
FONT_ITALIC = Font(name=FONT_NAME, size=10, italic=True)
FONT_CK_ALERT = Font(name=FONT_NAME, size=10, bold=True, color='C00000') # Bold Red
FONT_TM_REG = Font(name=FONT_NAME, size=10, italic=True, color='333333')
FONT_NOTE_SPECIAL = Font(name=FONT_NAME, size=10, bold=True, color='C00000')

FILL_CK_ALERT = PatternFill(start_color='FCE4D6', end_color='FCE4D6', fill_type='solid') # Soft peach/orange alert
FILL_SPECIAL = PatternFill(start_color='FFF2CC', end_color='FFF2CC', fill_type='solid')

THIN_SIDE = Side(border_style='thin', color='A6A6A6')
BORDER_ALL = Border(left=THIN_SIDE, right=THIN_SIDE, top=THIN_SIDE, bottom=THIN_SIDE)

ALIGN_LEFT = Alignment(horizontal='left', vertical='center', wrap_text=True)
ALIGN_CENTER = Alignment(horizontal='center', vertical='center')
ALIGN_RIGHT = Alignment(horizontal='right', vertical='center')

def process_workbook(file_path):
    print(f"\n==========================================")
    print(f">>> Processing: {file_path}")
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found!")
        return

    wb = openpyxl.load_workbook(file_path)

    # 1. Process HD sheets
    # Pairs of (hd_sheet, map_sheet, pn_name)
    pairs = [
        ('HD_DongNai_67Tram', 'Map_HD_Theo_Tram_Nhom1', 'Đồng Nai'),
        ('HD_ToanCau', 'Map_HD_Theo_Tram_Nhom2', 'Toàn Cầu')
    ]

    for hd_name, map_name, pn_name in pairs:
        if hd_name not in wb.sheetnames:
            continue
        ws_hd = wb[hd_name]

        # First pass: calculate total invoice amount by (Date, Seller)
        # Rule: "chỉ xét >5tr khi cùng 1 đơn vị xuất và 1 đơn vị nhận thôi, 2 đơn vị cộng lại mới vượt thì không cần chuyển khoản"
        seller_day_totals = defaultdict(float)
        seller_day_invoices = defaultdict(list)
        seller_day_names = {}
        for r in range(8, ws_hd.max_row):
            sohd = ws_hd.cell(r, 3).value
            if sohd and str(sohd).isdigit() and len(str(sohd)) >= 6:
                d = str(ws_hd.cell(r, 2).value)[:10]
                mst = str(ws_hd.cell(r, 8).value or '').strip()
                seller = str(ws_hd.cell(r, 4).value or '').strip()
                s_key = mst if mst else seller
                t = float(ws_hd.cell(r, 13).value or 0)
                seller_day_totals[(d, s_key)] += t
                seller_day_invoices[(d, s_key)].append(r)
                seller_day_names[(d, s_key)] = seller

        # Update Column P header
        ws_hd.cell(7, 16, "Hình Thức Thanh Toán (CK / Tiền Mặt) & Ghi Chú Giá Vốn")
        ws_hd.column_dimensions['P'].width = 56

        ck_cases = {k: tot for k, tot in seller_day_totals.items() if tot > 5000000}
        print(f"[{hd_name}] Total (Date, Seller) groups: {len(seller_day_totals)} | Groups > 5M (Bank transfer): {len(ck_cases)}")
        for (d, s_key), tot in sorted(ck_cases.items()):
            s_name = seller_day_names[(d, s_key)]
            print(f"   -> Date {d} | Seller: {s_name} | Total: {tot:,.0f} đ ({len(seller_day_invoices[(d, s_key)])} HĐ)")

        # Second pass: update Column P notes
        over_5m_sohds = set()
        for r in range(8, ws_hd.max_row):
            sohd = ws_hd.cell(r, 3).value
            if sohd and str(sohd).isdigit() and len(str(sohd)) >= 6:
                d = str(ws_hd.cell(r, 2).value)[:10]
                mst = str(ws_hd.cell(r, 8).value or '').strip()
                seller = str(ws_hd.cell(r, 4).value or '').strip()
                s_key = mst if mst else seller
                s_tot = seller_day_totals[(d, s_key)]

                c16 = ws_hd.cell(r, 16)
                cur_note = str(c16.value or '')
                d_fmt = f"{d[8:10]}/{d[5:7]}" if len(d) == 10 else d

                is_over_5m = (s_tot > 5000000)
                if is_over_5m:
                    over_5m_sohds.add(str(sohd).strip())

                # Check if it has cost reduction (trích một phần)
                if 'Trích sử dụng' in cur_note or 'Giảm giá vốn' in cur_note:
                    # extract the parts
                    clean_note = cur_note
                    for prefix in ['💵 Tiền mặt', '💳 CHUYỂN KHOẢN']:
                        if prefix in clean_note:
                            idx = clean_note.find('|')
                            if idx != -1:
                                clean_note = clean_note[idx+1:].strip()
                    if is_over_5m:
                        c16.value = f"💳 CHUYỂN KHOẢN CÂY XĂNG (Ngày {d_fmt} cây xăng {s_tot:,.0f} đ > 5tr) | {clean_note}"
                        c16.font = FONT_CK_ALERT
                        c16.fill = FILL_CK_ALERT
                    else:
                        c16.value = f"💵 Tiền mặt (Cây xăng <= 5tr/ngày) | {clean_note}"
                        c16.font = FONT_NOTE_SPECIAL
                        c16.fill = FILL_SPECIAL
                else:
                    if is_over_5m:
                        c16.value = f"💳 CHUYỂN KHOẢN CÂY XĂNG (Ngày {d_fmt} cây xăng {s_tot:,.0f} đ > 5tr) — Sử dụng 100% giá vốn"
                        c16.font = FONT_CK_ALERT
                        c16.fill = FILL_CK_ALERT
                    else:
                        c16.value = f"💵 Tiền mặt (Cây xăng <= 5tr/ngày) — Sử dụng 100% giá vốn thanh toán"
                        c16.font = FONT_TM_REG
                        c16.fill = PatternFill(fill_type=None)
                c16.alignment = ALIGN_LEFT
                c16.border = BORDER_ALL

        # Also update Map sheet if present
        if map_name in wb.sheetnames:
            ws_map = wb[map_name]
            ws_map.cell(4, 12, "Hình Thức TT & Ghi Chú Phân Bổ Giá Vốn")
            ws_map.column_dimensions['L'].width = 52

            for r in range(5, ws_map.max_row+1):
                sohd_m = ws_map.cell(r, 3).value
                if sohd_m and str(sohd_m).isdigit():
                    s_str = str(sohd_m).strip()
                    c12 = ws_map.cell(r, 12)
                    m_note = str(c12.value or '')
                    is_ck = (s_str in over_5m_sohds)

                    if 'Trích một phần' in m_note:
                        clean_m = m_note
                        for prefix in ['💵', '💳']:
                            if prefix in clean_m:
                                idx = clean_m.find('|')
                                if idx != -1:
                                    clean_m = clean_m[idx+1:].strip()
                        if is_ck:
                            c12.value = f"💳 HĐ > 5tr cùng cây xăng (CK cây xăng) | {clean_m}"
                            c12.font = FONT_CK_ALERT
                            c12.fill = FILL_CK_ALERT
                        else:
                            c12.value = f"💵 HĐ cây xăng <= 5tr (Tiền mặt) | {clean_m}"
                            c12.font = FONT_NOTE_SPECIAL
                            c12.fill = FILL_SPECIAL
                    else:
                        if is_ck:
                            c12.value = "💳 HĐ > 5tr cùng cây xăng (Chuyển khoản cây xăng)"
                            c12.font = FONT_CK_ALERT
                            c12.fill = FILL_CK_ALERT
                        else:
                            c12.value = "💵 Gán 100% chi phí trạm (Tiền mặt)"
                            c12.font = FONT_TM_REG
                            c12.fill = PatternFill(fill_type=None)
                    c12.alignment = ALIGN_LEFT
                    c12.border = BORDER_ALL

    # Save workbook
    wb.save(file_path)
    print(f">>> Successfully saved: {file_path}")

def main():
    targets = [
        ('/Users/cang_it/Desktop/Ho_So_Thanh_Toan_Chuan_Mau_09_2026_HSTT.xlsx', '/Users/cang_it/Downloads/Ho_So_Thanh_Toan_Chuan_Mau_09_2026_HSTT.xlsx'),
        ('/Users/cang_it/Desktop/Ho_So_Thanh_Toan_Chuan_Mau_08_2026_HSTT.xlsx', '/Users/cang_it/Downloads/Ho_So_Thanh_Toan_Chuan_Mau_08_2026_HSTT.xlsx')
    ]

    for desk_path, down_path in targets:
        process_workbook(desk_path)
        shutil.copy2(desk_path, down_path)
        print(f">>> Synchronized copy to: {down_path}")

if __name__ == '__main__':
    main()
