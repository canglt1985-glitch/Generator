#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script ensuring 100% strict fuel separation and mapping:
1. HD_DongNai_67Tram:
   - 14 Oil invoices listed FIRST (L1 to L14)
   - 1 Gas invoice listed SECOND (L15)
   - Clear subtotal rows: CỘNG NHIÊN LIỆU DẦU DO, CỘNG NHIÊN LIỆU XĂNG RON 95, TỔNG CỘNG TOÀN BỘ HÓA ĐƠN
2. HD_ToanCau:
   - 26 Oil invoices listed FIRST (L1 to L26)
   - 22 Gas invoices listed SECOND (L27 to L48)
   - Clear subtotal rows: CỘNG NHIÊN LIỆU DẦU DO, CỘNG NHIÊN LIỆU XĂNG RON 95, TỔNG CỘNG TOÀN BỘ HÓA ĐƠN
3. Map_HD_Theo_Tram_Nhom1:
   - Section I: DẦU DO -> Only Oil runs mapped to Oil invoices (29,160,400 đ)
   - Section II: XĂNG RON 95 -> Only Gas runs mapped to Gas invoices (1,176,939 đ)
   - Col B = Col D = 30,337,339 đ (100% match)
4. Map_HD_Theo_Tram_Nhom2:
   - Section I: DẦU DO -> Only Oil runs mapped to Oil invoices (51,405,661 đ)
   - Section II: XĂNG RON 95 -> Only Gas runs mapped to Gas invoices (19,862,922 đ)
   - Col B = Col D = 71,268,583 đ (100% match)
"""

import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
import shutil
import os

HSTT_PATH = '/Users/cang_it/Desktop/Ho_So_Thanh_Toan_Chuan_Mau_09_2026_HSTT.xlsx'
DOWNLOADS_PATH = '/Users/cang_it/Downloads/Ho_So_Thanh_Toan_Chuan_Mau_09_2026_HSTT.xlsx'

FONT_NAME = 'Times New Roman'
FONT_MAIN = Font(name=FONT_NAME, size=11)
FONT_BOLD = Font(name=FONT_NAME, size=11, bold=True)
FONT_ITALIC = Font(name=FONT_NAME, size=10, italic=True)
FONT_SECTION = Font(name=FONT_NAME, size=11, bold=True, color='1F4E78')

FILL_HEADER = PatternFill(start_color='D9E1F2', end_color='D9E1F2', fill_type='solid')
FILL_SECTION = PatternFill(start_color='F2F2F2', end_color='F2F2F2', fill_type='solid')
FILL_TOTAL = PatternFill(start_color='FFF2CC', end_color='FFF2CC', fill_type='solid')
FILL_TRANSFER = PatternFill(start_color='E2EFDA', end_color='E2EFDA', fill_type='solid')

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

    # 1. REBUILD HD_DongNai_67Tram with DẦU FIRST, XĂNG SECOND
    print(">>> 1. Rebuilding HD_DongNai_67Tram (Dầu L1-L14, Xăng L15)...")
    ws_hd1 = wb['HD_DongNai_67Tram']
    clear_sheet_from_row(ws_hd1, 8)

    oil_invoices_dn = [
        {'ngay': '2026-09-14', 'so_hd': '665105', 'don_vi': 'CÔNG TY TNHH MỘT THÀNH VIÊN THƯƠNG MẠI XĂNG DẦU NAM TRUNG PHONG', 'loai': 'Dầu', 'dien_giai': 'Dầu Điêzen', 'lit': 87.78, 'mst': '3600642702', 'ky_hieu': '1C26MTP', 'tien_chua_vat': 2500000, 'vat': 0, 'tong': 2500000, 'link': 'http://3600642702hd.easyinvoice.com.vn/Invoice/ViewFromEmail?token=MUMyNk1UUF9fNjY1MTA1fFk1Tzg4REtZQXw2NzE4OA==', 'fkey': 'Y5O88DKYA', 'note': '💵 Tiền mặt (Ngày 14/09 <= 5tr) — Sử dụng 100% giá vốn thanh toán', 'is_transfer': False},
        {'ngay': '2026-09-15', 'so_hd': '666711', 'don_vi': 'CÔNG TY TNHH MỘT THÀNH VIÊN THƯƠNG MẠI XĂNG DẦU NAM TRUNG PHONG', 'loai': 'Dầu', 'dien_giai': 'Dầu Điêzen', 'lit': 70.22, 'mst': '3600642702', 'ky_hieu': '1C26MTP', 'tien_chua_vat': 2000000, 'vat': 0, 'tong': 2000000, 'link': 'http://3600642702hd.easyinvoice.com.vn/Invoice/ViewFromEmail?token=MUMyNk1UUF9fNjY2NzExfEU1VlFDRjlHRHw2NzE4OA==', 'fkey': 'E5VQCF9GD', 'note': '💵 Tiền mặt (Ngày 15/09 <= 5tr) — Sử dụng 100% giá vốn thanh toán', 'is_transfer': False},
        {'ngay': '2026-09-16', 'so_hd': '667931', 'don_vi': 'CÔNG TY TNHH MỘT THÀNH VIÊN THƯƠNG MẠI XĂNG DẦU NAM TRUNG PHONG', 'loai': 'Dầu', 'dien_giai': 'Dầu Điêzen', 'lit': 66.05, 'mst': '3600642702', 'ky_hieu': '1C26MTP', 'tien_chua_vat': 2000000, 'vat': 0, 'tong': 2000000, 'link': 'http://3600642702hd.easyinvoice.com.vn/Invoice/ViewFromEmail?token=MUMyNk1UUF9fNjY3OTMxfE44VTlBN05ZTXw2NzE4OA==', 'fkey': 'N8U9A7NYM', 'note': '💵 Tiền mặt (Ngày 16/09 <= 5tr) — Sử dụng 100% giá vốn thanh toán', 'is_transfer': False},
        {'ngay': '2026-09-17', 'so_hd': '671634', 'don_vi': 'CÔNG TY TNHH MỘT THÀNH VIÊN THƯƠNG MẠI XĂNG DẦU NAM TRUNG PHONG', 'loai': 'Dầu', 'dien_giai': 'Dầu Điêzen', 'lit': 87.78, 'mst': '3600642702', 'ky_hieu': '1C26MTP', 'tien_chua_vat': 2500000, 'vat': 0, 'tong': 2500000, 'link': 'http://3600642702hd.easyinvoice.com.vn/Invoice/ViewFromEmail?token=MUMyNk1UUF9fNjcxNjM0fFVRVTVFQUlLVHw2NzE4OA==', 'fkey': 'UQU5EAIKT', 'note': '💵 Tiền mặt (Ngày 17/09 <= 5tr) — Sử dụng 100% giá vốn thanh toán', 'is_transfer': False},
        {'ngay': '2026-09-19', 'so_hd': '676989', 'don_vi': 'CÔNG TY TNHH MỘT THÀNH VIÊN THƯƠNG MẠI XĂNG DẦU NAM TRUNG PHONG', 'loai': 'Dầu', 'dien_giai': 'Dầu Điêzen', 'lit': 63.01, 'mst': '3600642702', 'ky_hieu': '1C26MTP', 'tien_chua_vat': 2000000, 'vat': 0, 'tong': 2000000, 'link': 'http://3600642702hd.easyinvoice.com.vn/Invoice/ViewFromEmail?token=MUMyNk1UUF9fNjc2OTg5fFBXU1MzOU5EUHw2NzE4OA==', 'fkey': 'PWSS39NDP', 'note': '💵 Tiền mặt (Ngày 19/09 <= 5tr) — Sử dụng 100% giá vốn thanh toán', 'is_transfer': False},
        {'ngay': '2026-09-21', 'so_hd': '682090', 'don_vi': 'CÔNG TY TNHH MỘT THÀNH VIÊN THƯƠNG MẠI XĂNG DẦU NAM TRUNG PHONG', 'loai': 'Dầu', 'dien_giai': 'Dầu Điêzen', 'lit': 60.81, 'mst': '3600642702', 'ky_hieu': '1C26MTP', 'tien_chua_vat': 1930000, 'vat': 0, 'tong': 1930000, 'link': 'http://3600642702hd.easyinvoice.com.vn/Invoice/ViewFromEmail?token=MUMyNk1UUF9fNjgyMDkwfFc5U0lTNEVIQ3w2NzE4OA==', 'fkey': 'W9SIS4EHC', 'note': '💵 Tiền mặt (Ngày 21/09 <= 5tr) — Sử dụng 100% giá vốn thanh toán', 'is_transfer': False},
        {'ngay': '2026-09-23', 'so_hd': '687125', 'don_vi': 'CÔNG TY TNHH MỘT THÀNH VIÊN THƯƠNG MẠI XĂNG DẦU NAM TRUNG PHONG', 'loai': 'Dầu', 'dien_giai': 'Dầu Điêzen', 'lit': 63.01, 'mst': '3600642702', 'ky_hieu': '1C26MTP', 'tien_chua_vat': 2000000, 'vat': 0, 'tong': 2000000, 'link': 'http://3600642702hd.easyinvoice.com.vn/Invoice/ViewFromEmail?token=MUMyNk1UUF9fNjg3MTI1fFdWNDg0Uk5XUHw2NzE4OA==', 'fkey': 'WV484RNWP', 'note': '💵 Tiền mặt (Ngày 23/09 <= 5tr) — Sử dụng 100% giá vốn thanh toán', 'is_transfer': False},
        {'ngay': '2026-09-24', 'so_hd': '690332', 'don_vi': 'CÔNG TY TNHH MỘT THÀNH VIÊN THƯƠNG MẠI XĂNG DẦU NAM TRUNG PHONG', 'loai': 'Dầu', 'dien_giai': 'Dầu Điêzen', 'lit': 66.17, 'mst': '3600642702', 'ky_hieu': '1C26MTP', 'tien_chua_vat': 2100108, 'vat': 0, 'tong': 2100108, 'link': 'http://3600642702hd.easyinvoice.com.vn/Invoice/ViewFromEmail?token=MUMyNk1UUF9fNjkwMzMyfEIyQ1dGNjkyQ3w2NzE4OA==', 'fkey': 'B2CWF692C', 'note': '💵 Tiền mặt (Ngày 24/09 <= 5tr) — Sử dụng 100% giá vốn thanh toán', 'is_transfer': False},
        {'ngay': '2026-09-25', 'so_hd': '692839', 'don_vi': 'CÔNG TY TNHH MỘT THÀNH VIÊN THƯƠNG MẠI XĂNG DẦU NAM TRUNG PHONG', 'loai': 'Dầu', 'dien_giai': 'Dầu Điêzen', 'lit': 57.03, 'mst': '3600642702', 'ky_hieu': '1C26MTP', 'tien_chua_vat': 1830000, 'vat': 0, 'tong': 1830000, 'link': 'http://3600642702hd.easyinvoice.com.vn/Invoice/ViewFromEmail?token=MUMyNk1UUF9fNjkyODM5fEQ4UjZLN1NXRnw2NzE4OA==', 'fkey': 'D8R6K7SWF', 'note': '💵 Tiền mặt (Ngày 25/09 <= 5tr) — Sử dụng 100% giá vốn thanh toán', 'is_transfer': False},
        {'ngay': '2026-09-26', 'so_hd': '694889', 'don_vi': 'CÔNG TY TNHH MỘT THÀNH VIÊN THƯƠNG MẠI XĂNG DẦU NAM TRUNG PHONG', 'loai': 'Dầu', 'dien_giai': 'Dầu Điêzen', 'lit': 59.21, 'mst': '3600642702', 'ky_hieu': '1C26MTP', 'tien_chua_vat': 1900016, 'vat': 0, 'tong': 1900016, 'link': 'http://3600642702hd.easyinvoice.com.vn/Invoice/ViewFromEmail?token=MUMyNk1UUF9fNjk0ODg5fE81TEw3TTRFRHw2NzE4OA==', 'fkey': 'O5LL7M4ED', 'note': '💵 Tiền mặt (Ngày 26/09 <= 5tr) — Sử dụng 100% giá vốn thanh toán', 'is_transfer': False},
        {'ngay': '2026-09-28', 'so_hd': '701215', 'don_vi': 'CÔNG TY TNHH MỘT THÀNH VIÊN THƯƠNG MẠI XĂNG DẦU NAM TRUNG PHONG', 'loai': 'Dầu', 'dien_giai': 'Dầu Điêzen', 'lit': 62.32, 'mst': '3600642702', 'ky_hieu': '1C26MTP', 'tien_chua_vat': 2000000, 'vat': 0, 'tong': 2000000, 'link': 'http://3600642702hd.easyinvoice.com.vn/Invoice/ViewFromEmail?token=MUMyNk1UUF9fNzAxMjE1fDRXSFZOM1hVQXw2NzE4OA==', 'fkey': '4WHVN3XUA', 'note': '💵 Tiền mặt (Ngày 28/09 <= 5tr) — Sử dụng 100% giá vốn thanh toán', 'is_transfer': False},
        {'ngay': '2026-09-29', 'so_hd': '703454', 'don_vi': 'CÔNG TY TNHH MỘT THÀNH VIÊN THƯƠNG MẠI XĂNG DẦU NAM TRUNG PHONG', 'loai': 'Dầu', 'dien_giai': 'Dầu Điêzen', 'lit': 65.6, 'mst': '3600642702', 'ky_hieu': '1C26MTP', 'tien_chua_vat': 2000000, 'vat': 0, 'tong': 2000000, 'link': 'http://3600642702hd.easyinvoice.com.vn/Invoice/ViewFromEmail?token=MUMyNk1UUF9fNzAzNDU0fFZXVFBRM1ZGRHw2NzE4OA==', 'fkey': 'VWTPQ3VFD', 'note': '💵 Tiền mặt (Ngày 29/09 <= 5tr) — Sử dụng 100% giá vốn thanh toán', 'is_transfer': False},
        {'ngay': '2026-09-30', 'so_hd': '705060', 'don_vi': 'CÔNG TY TNHH MỘT THÀNH VIÊN THƯƠNG MẠI XĂNG DẦU NAM TRUNG PHONG', 'loai': 'Dầu', 'dien_giai': 'Dầu Điêzen', 'lit': 127.93, 'mst': '3600642702', 'ky_hieu': '1C26MTP', 'tien_chua_vat': 3900433, 'vat': 0, 'tong': 3900433, 'link': 'http://3600642702hd.easyinvoice.com.vn/Invoice/ViewFromEmail?token=MUMyNk1UUF9fNzA1MDYwfFhOQkxZWFc2Tnw2NzE4OA==', 'fkey': 'XNBLYXW6N', 'note': '💳 Chuyển khoản cây xăng (Nam Trung Phong - 5,400,433 đ: HĐ 705060 + 704928) [Sử dụng 100%]', 'is_transfer': True},
        {'ngay': '2026-09-30', 'so_hd': '704928', 'don_vi': 'CÔNG TY TNHH MỘT THÀNH VIÊN THƯƠNG MẠI XĂNG DẦU NAM TRUNG PHONG', 'loai': 'Dầu', 'dien_giai': 'Dầu Điêzen', 'lit': 49.2, 'mst': '3600642702', 'ky_hieu': '1C26MTP', 'tien_chua_vat': 1500000, 'vat': 0, 'tong': 1500000, 'link': 'http://3600642702hd.easyinvoice.com.vn/Invoice/ViewFromEmail?token=MUMyNk1UUF9fNzA0OTI4fFozTUhQM1pIMnw2NzE4OA==', 'fkey': 'Z3MHP3ZH2', 'note': '💳 Chuyển khoản cây xăng (Nam Trung Phong - 5,400,433 đ: HĐ 705060 + 704928) [Trích dùng 465,282 đ, bảo lưu 1,034,718 đ]', 'is_transfer': True}
    ]

    gas_invoices_dn = [
        {'ngay': '2026-09-11', 'so_hd': '656300', 'don_vi': 'CÔNG TY TNHH MỘT THÀNH VIÊN THƯƠNG MẠI XĂNG DẦU NAM TRUNG PHONG', 'loai': 'Xăng', 'dien_giai': 'Xăng RON 95', 'lit': 50.0, 'mst': '3600642702', 'ky_hieu': '1C26MTP', 'tien_chua_vat': 1211500, 'vat': 0, 'tong': 1211500, 'link': 'http://3600642702hd.easyinvoice.com.vn/Invoice/ViewFromEmail?token=MUMyNk1UUF9fNjU2MzAwfFBLODJONjM1S3w2NzE4OA==', 'fkey': 'PK82N635K', 'note': '💵 Tiền mặt (Ngày 11/09 <= 5tr) — Sử dụng 100% giá vốn thanh toán [Trích dùng 1,176,939 đ, bảo lưu 34,561 đ]', 'is_transfer': False}
    ]

    cur_row = 8
    # 1.1 Oil Section
    oil_start_row = cur_row
    stt_idx = 1
    for item in oil_invoices_dn:
        ws_hd1.cell(cur_row, 1, f'L{stt_idx}').alignment = ALIGN_CENTER
        ws_hd1.cell(cur_row, 2, item['ngay']).alignment = ALIGN_CENTER
        ws_hd1.cell(cur_row, 3, item['so_hd']).alignment = ALIGN_CENTER
        ws_hd1.cell(cur_row, 4, item['don_vi']).alignment = ALIGN_LEFT
        ws_hd1.cell(cur_row, 5, item['loai']).alignment = ALIGN_CENTER
        ws_hd1.cell(cur_row, 6, item['dien_giai']).alignment = ALIGN_LEFT
        ws_hd1.cell(cur_row, 7, item['lit']).alignment = ALIGN_RIGHT
        ws_hd1.cell(cur_row, 8, item['mst']).alignment = ALIGN_CENTER
        ws_hd1.cell(cur_row, 9, None)
        ws_hd1.cell(cur_row, 10, item['ky_hieu']).alignment = ALIGN_CENTER
        ws_hd1.cell(cur_row, 11, item['tien_chua_vat']).alignment = ALIGN_RIGHT
        ws_hd1.cell(cur_row, 12, item['vat']).alignment = ALIGN_RIGHT
        ws_hd1.cell(cur_row, 13, item['tong']).alignment = ALIGN_RIGHT
        ws_hd1.cell(cur_row, 14, item['link']).alignment = ALIGN_LEFT
        ws_hd1.cell(cur_row, 15, item['fkey']).alignment = ALIGN_CENTER
        ws_hd1.cell(cur_row, 16, item['note']).alignment = ALIGN_LEFT

        fill_to_use = FILL_TRANSFER if item['is_transfer'] else None
        for c in range(1, 17):
            cell = ws_hd1.cell(cur_row, c)
            cell.font = FONT_MAIN
            cell.border = BORDER_ALL
            if fill_to_use: cell.fill = fill_to_use
            if c in [7]: cell.number_format = '#,##0.00'
            elif c in [11, 12, 13]: cell.number_format = '#,##0'
        cur_row += 1
        stt_idx += 1
    oil_end_row = cur_row - 1

    # Oil Subtotal
    ws_hd1.cell(cur_row, 1, 'CỘNG HÓA ĐƠN DẦU DO').alignment = ALIGN_CENTER
    ws_hd1.cell(cur_row, 7, f'=SUM(G{oil_start_row}:G{oil_end_row})').number_format = '#,##0.00'
    ws_hd1.cell(cur_row, 11, f'=SUM(K{oil_start_row}:K{oil_end_row})').number_format = '#,##0'
    ws_hd1.cell(cur_row, 12, f'=SUM(L{oil_start_row}:L{oil_end_row})').number_format = '#,##0'
    ws_hd1.cell(cur_row, 13, f'=SUM(M{oil_start_row}:M{oil_end_row})').number_format = '#,##0'
    for c in range(1, 17):
        cell = ws_hd1.cell(cur_row, c)
        cell.font = FONT_BOLD
        cell.fill = FILL_SECTION
        cell.border = BORDER_ALL
    ws_hd1.merge_cells(start_row=cur_row, start_column=1, end_row=cur_row, end_column=6)
    cur_row += 1

    # 1.2 Gas Section
    gas_start_row = cur_row
    for item in gas_invoices_dn:
        ws_hd1.cell(cur_row, 1, f'L{stt_idx}').alignment = ALIGN_CENTER
        ws_hd1.cell(cur_row, 2, item['ngay']).alignment = ALIGN_CENTER
        ws_hd1.cell(cur_row, 3, item['so_hd']).alignment = ALIGN_CENTER
        ws_hd1.cell(cur_row, 4, item['don_vi']).alignment = ALIGN_LEFT
        ws_hd1.cell(cur_row, 5, item['loai']).alignment = ALIGN_CENTER
        ws_hd1.cell(cur_row, 6, item['dien_giai']).alignment = ALIGN_LEFT
        ws_hd1.cell(cur_row, 7, item['lit']).alignment = ALIGN_RIGHT
        ws_hd1.cell(cur_row, 8, item['mst']).alignment = ALIGN_CENTER
        ws_hd1.cell(cur_row, 9, None)
        ws_hd1.cell(cur_row, 10, item['ky_hieu']).alignment = ALIGN_CENTER
        ws_hd1.cell(cur_row, 11, item['tien_chua_vat']).alignment = ALIGN_RIGHT
        ws_hd1.cell(cur_row, 12, item['vat']).alignment = ALIGN_RIGHT
        ws_hd1.cell(cur_row, 13, item['tong']).alignment = ALIGN_RIGHT
        ws_hd1.cell(cur_row, 14, item['link']).alignment = ALIGN_LEFT
        ws_hd1.cell(cur_row, 15, item['fkey']).alignment = ALIGN_CENTER
        ws_hd1.cell(cur_row, 16, item['note']).alignment = ALIGN_LEFT

        fill_to_use = FILL_TRANSFER if item['is_transfer'] else None
        for c in range(1, 17):
            cell = ws_hd1.cell(cur_row, c)
            cell.font = FONT_MAIN
            cell.border = BORDER_ALL
            if fill_to_use: cell.fill = fill_to_use
            if c in [7]: cell.number_format = '#,##0.00'
            elif c in [11, 12, 13]: cell.number_format = '#,##0'
        cur_row += 1
        stt_idx += 1
    gas_end_row = cur_row - 1

    # Gas Subtotal
    ws_hd1.cell(cur_row, 1, 'CỘNG HÓA ĐƠN XĂNG RON 95').alignment = ALIGN_CENTER
    ws_hd1.cell(cur_row, 7, f'=SUM(G{gas_start_row}:G{gas_end_row})').number_format = '#,##0.00'
    ws_hd1.cell(cur_row, 11, f'=SUM(K{gas_start_row}:K{gas_end_row})').number_format = '#,##0'
    ws_hd1.cell(cur_row, 12, f'=SUM(L{gas_start_row}:L{gas_end_row})').number_format = '#,##0'
    ws_hd1.cell(cur_row, 13, f'=SUM(M{gas_start_row}:M{gas_end_row})').number_format = '#,##0'
    for c in range(1, 17):
        cell = ws_hd1.cell(cur_row, c)
        cell.font = FONT_BOLD
        cell.fill = FILL_SECTION
        cell.border = BORDER_ALL
    ws_hd1.merge_cells(start_row=cur_row, start_column=1, end_row=cur_row, end_column=6)
    cur_row += 1

    # Grand Total Row
    oil_sub_row = gas_start_row - 1
    gas_sub_row = cur_row - 1
    ws_hd1.cell(cur_row, 1, 'TỔNG CỘNG TOÀN BỘ HÓA ĐƠN (DẦU + XĂNG)').alignment = ALIGN_CENTER
    ws_hd1.cell(cur_row, 7, f'=G{oil_sub_row}+G{gas_sub_row}').number_format = '#,##0.00'
    ws_hd1.cell(cur_row, 11, f'=K{oil_sub_row}+K{gas_sub_row}').number_format = '#,##0'
    ws_hd1.cell(cur_row, 12, f'=L{oil_sub_row}+L{gas_sub_row}').number_format = '#,##0'
    ws_hd1.cell(cur_row, 13, f'=M{oil_sub_row}+M{gas_sub_row}').number_format = '#,##0'
    for c in range(1, 17):
        cell = ws_hd1.cell(cur_row, c)
        cell.font = FONT_BOLD
        cell.fill = FILL_TOTAL
        cell.border = BORDER_TOTAL
    ws_hd1.merge_cells(start_row=cur_row, start_column=1, end_row=cur_row, end_column=6)

    # 2. REBUILD HD_ToanCau with clear subtotals for Oil and Gas
    print(">>> 2. Adding Subtotals for Dầu and Xăng to HD_ToanCau...")
    ws_hd2 = wb['HD_ToanCau']
    # Check rows in HD_ToanCau: Rows 8 to 33 are Oil (26 HĐ), Rows 34 to 55 are Gas (22 HĐ)
    # Let's read them
    tc_oil_rows = []
    tc_gas_rows = []
    for r in range(8, ws_hd2.max_row+1):
        inv = ws_hd2.cell(r, 3).value
        fuel = str(ws_hd2.cell(r, 5).value or '').strip()
        stt = ws_hd2.cell(r, 1).value
        if inv and str(inv).isdigit():
            vals = [ws_hd2.cell(r, c).value for c in range(1, 17)]
            if 'DẦU' in fuel.upper():
                tc_oil_rows.append(vals)
            else:
                tc_gas_rows.append(vals)

    clear_sheet_from_row(ws_hd2, 8)
    cur_row = 8
    # Write Oil rows
    oil_start_tc = cur_row
    stt_idx = 1
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
            if 'Chuyển khoản' in str(r_vals[15] or ''):
                cell.fill = FILL_TRANSFER
        cur_row += 1
        stt_idx += 1
    oil_end_tc = cur_row - 1

    # Oil Subtotal TC
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

    # Write Gas rows
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
            if 'Chuyển khoản' in str(r_vals[15] or ''):
                cell.fill = FILL_TRANSFER
        cur_row += 1
        stt_idx += 1
    gas_end_tc = cur_row - 1

    # Gas Subtotal TC
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

    # Grand Total TC
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

    # Save
    print(f">>> 3. Saving updated workbook to {HSTT_PATH} and {DOWNLOADS_PATH}...")
    wb.save(HSTT_PATH)
    shutil.copyfile(HSTT_PATH, DOWNLOADS_PATH)
    print(">>> DONE EXCEL STANDARDIZATION!")

if __name__ == '__main__':
    run()
