#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script xuất hồ sơ độc lập Bảng kê chạy máy phát điện Seath Group Tháng 09/2026:
- Tách riêng 100% 11 trạm XHH thuộc đối tác Seath Group.
- Định dạng chuẩn mực: Times New Roman, đầy đủ công thức SUM, borders, căn lề.
- Tạo file tại: /Users/cang_it/Desktop/Bang_Ke_Chay_May_Phat_Dien_Seath_Group_T09_2026.xlsx
"""

import os
import sys
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend'))
from fuel_price import get_fuel_price_for_date

OUTPUT_PATH = '/Users/cang_it/Desktop/Bang_Ke_Chay_May_Phat_Dien_Seath_Group_T09_2026.xlsx'

SEATH_STATIONS_INFO = {
    'DNCM05': {'canonical': 'DNIXDO02', 'name': 'Xuân Đông 2', 'district': 'Cẩm Mỹ', 'gen': 'VIKYNO 12.5kVA', 'cs': '12.5', 'quota': 2.30},
    'DNDQ09': {'canonical': 'DNIPHO01', 'name': 'Phú Hòa 1', 'district': 'Định Quán', 'gen': 'VIKYNO 10kVA', 'cs': '10.0', 'quota': 2.30},
    'DNDQ12': {'canonical': 'DNILNA02', 'name': 'La Ngà 2', 'district': 'Định Quán', 'gen': 'VIKYNO 10kVA', 'cs': '10.0', 'quota': 2.30},
    'DNDQ13': {'canonical': 'DNILNA03', 'name': 'La Ngà 3', 'district': 'Định Quán', 'gen': 'VIKYNO 10kVA', 'cs': '10.0', 'quota': 2.30},
    'DNDQ14': {'canonical': 'DNILNA04', 'name': 'La Ngà 4', 'district': 'Định Quán', 'gen': 'VIKYNO 10kVA', 'cs': '10.0', 'quota': 2.30},
    'DNTN07': {'canonical': 'DNIDGI05', 'name': 'Dầu Giây 5', 'district': 'Thống Nhất', 'gen': 'VIKYNO 10kVA', 'cs': '10.0', 'quota': 2.30},
    'DNTP11': {'canonical': 'DNITPU03', 'name': 'Tân Phú 3', 'district': 'Tân Phú', 'gen': 'VIKYNO 10kVA', 'cs': '10.0', 'quota': 2.30},
    'DNTP12': {'canonical': 'DNITLA03', 'name': 'Tà Lài 3', 'district': 'Tân Phú', 'gen': 'VIKYNO 10kVA', 'cs': '10.0', 'quota': 2.30},
    'DNTP13': {'canonical': 'DNITPU04', 'name': 'Tân Phú 4', 'district': 'Tân Phú', 'gen': 'VIKYNO 10kVA', 'cs': '10.0', 'quota': 2.30},
    'DNXL28': {'canonical': 'DNIXHO08', 'name': 'Xuân Hòa 8', 'district': 'Xuân Lộc', 'gen': 'VIKYNO 12.5kVA', 'cs': '12.5', 'quota': 2.30},
    'DNXL31': {'canonical': 'DNIXBA07', 'name': 'Xuân Bảo 7', 'district': 'Xuân Lộc', 'gen': 'VIKYNO 12.5kVA', 'cs': '12.5', 'quota': 2.30},
}

# 8 ca chạy thực tế tháng 9/2026 của Seath Group
SEATH_RUNS = [
    {
        'date': '2026-09-06',
        'raw_site': 'DNXL28',
        'canonical_site': 'DNIXHO08',
        'start': '06:27',
        'end': '06:45',
        'hours': 0.30,
        'liters': 0.90,
        'price': 29540,
        'amount': round(0.90 * 29540), # 26,586 đ
        'ktv': 'Trần Trọng Cường',
        'reason': 'Mất điện lưới địa bàn Xuân Hòa',
    },
    {
        'date': '2026-09-06',
        'raw_site': 'DNXL28',
        'canonical_site': 'DNIXHO08',
        'start': '10:43',
        'end': '11:19',
        'hours': 0.60,
        'liters': 1.38,
        'price': 29540,
        'amount': 40765,
        'ktv': 'Trần Trọng Cường',
        'reason': 'Mất điện lưới địa bàn Xuân Hòa',
    },
    {
        'date': '2026-09-06',
        'raw_site': 'DNXL28',
        'canonical_site': 'DNIXHO08',
        'start': '12:45',
        'end': '13:26',
        'hours': 0.68,
        'liters': 1.56,
        'price': 29540,
        'amount': 46082,
        'ktv': 'Trần Trọng Cường',
        'reason': 'Mất điện lưới địa bàn Xuân Hòa',
    },
    {
        'date': '2026-09-07',
        'raw_site': 'DNDQ13',
        'canonical_site': 'DNILNA03',
        'start': '08:53',
        'end': '17:10',
        'hours': 8.28,
        'liters': 19.04,
        'price': 29540,
        'amount': 562442,
        'ktv': 'Lê Hoàng Ân',
        'reason': 'Sự cố lưới điện trung thế La Ngà',
    },
    {
        'date': '2026-09-08',
        'raw_site': 'DNXL31',
        'canonical_site': 'DNIXBA07',
        'start': '05:40',
        'end': '12:40',
        'hours': 7.00,
        'liters': 16.10,
        'price': 29540,
        'amount': 475594,
        'ktv': 'Nguyễn Văn Long',
        'reason': 'Cắt điện sửa chữa đường dây Xuân Bảo',
    },
    {
        'date': '2026-09-08',
        'raw_site': 'DNXL31',
        'canonical_site': 'DNIXBA07',
        'start': '12:44',
        'end': '16:06',
        'hours': 3.37,
        'liters': 7.75,
        'price': 29540,
        'amount': round(7.75 * 29540), # 228,935 đ (sửa giá đúng ngày 08/09 là 29540)
        'ktv': 'Nguyễn Văn Long',
        'reason': 'Cắt điện sửa chữa đường dây Xuân Bảo',
    },
    {
        'date': '2026-09-09',
        'raw_site': 'DNXL28',
        'canonical_site': 'DNIXHO08',
        'start': '16:31',
        'end': '19:09',
        'hours': 2.63,
        'liters': 6.05,
        'price': 29540,
        'amount': 178717,
        'ktv': 'Trần Trọng Cường',
        'reason': 'Giông lốc mất điện diện rộng Xuân Hòa',
    },
    {
        'date': '2026-09-09',
        'raw_site': 'DNXL28',
        'canonical_site': 'DNIXHO08',
        'start': '22:20',
        'end': '22:45',
        'hours': 0.42,
        'liters': 0.97,
        'price': 29540,
        'amount': 28654,
        'ktv': 'Trần Trọng Cường',
        'reason': 'Nhảy aptomat trạm biến áp',
    },
]

def export_seath_statement():
    wb = openpyxl.Workbook()
    ws_detail = wb.active
    ws_detail.title = '02A_Chi_Tiet_Seath'

    font_name = 'Times New Roman'
    font_main = Font(name=font_name, size=11)
    font_bold = Font(name=font_name, size=11, bold=True)
    font_header = Font(name=font_name, size=11, bold=True, color='FFFFFF')
    font_title = Font(name=font_name, size=14, bold=True, color='1F4E78')
    font_subtitle = Font(name=font_name, size=11, italic=True)

    fill_header = PatternFill(start_color='1F4E78', end_color='1F4E78', fill_type='solid')
    fill_summary = PatternFill(start_color='D9E1F2', end_color='D9E1F2', fill_type='solid')
    fill_total = PatternFill(start_color='FFF2CC', end_color='FFF2CC', fill_type='solid')

    thin_side = Side(border_style='thin', color='A6A6A6')
    border_all = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
    double_bottom = Side(border_style='double', color='000000')
    border_total = Border(left=thin_side, right=thin_side, top=thin_side, bottom=double_bottom)

    align_center = Alignment(horizontal='center', vertical='center')
    align_left = Alignment(horizontal='left', vertical='center')
    align_right = Alignment(horizontal='right', vertical='center')

    # Header Titles
    ws_detail['A1'] = 'TRUNG TÂM MẠNG LƯỚI MOBIFONE MIỀN NAM'
    ws_detail['A1'].font = Font(name=font_name, size=10, bold=True)
    ws_detail['A2'] = 'ĐƠN VỊ: TỔ VIỄN THÔNG 3 (TVT3) - ĐỒNG NAI'
    ws_detail['A2'].font = Font(name=font_name, size=10, bold=True)

    ws_detail['A4'] = 'BẢNG KÊ CHI TIẾT NHIÊN LIỆU CHẠY MÁY PHÁT ĐIỆN ĐỐI TÁC SEATH GROUP'
    ws_detail['A4'].font = font_title
    ws_detail['A4'].alignment = align_center
    ws_detail.merge_cells('A4:O4')

    ws_detail['A5'] = '(Tháng 09/2026 - Áp dụng cho 11 Trạm Xã Hội Hóa Đối Tác Seath Group)'
    ws_detail['A5'].font = font_subtitle
    ws_detail['A5'].alignment = align_center
    ws_detail.merge_cells('A5:O5')

    # Summary box
    ws_detail['A7'] = 'STT'; ws_detail['B7'] = 'Nội dung nghiệm thu quyết toán'; ws_detail.merge_cells('B7:E7')
    ws_detail['F7'] = 'Số ca chạy'; ws_detail.merge_cells('F7:G7')
    ws_detail['H7'] = 'Tổng giờ chạy (h)'; ws_detail.merge_cells('H7:I7')
    ws_detail['J7'] = 'Tổng tiêu hao (Lít)'; ws_detail.merge_cells('J7:K7')
    ws_detail['L7'] = 'Tổng thành tiền (VNĐ)'; ws_detail.merge_cells('L7:O7')

    for c in range(1, 16):
        cell = ws_detail.cell(7, c)
        cell.font = font_bold
        cell.fill = fill_summary
        cell.alignment = align_center
        cell.border = border_all

    ws_detail['A8'] = 1
    ws_detail['B8'] = 'Nhiên liệu Dầu DO vận hành MPĐ cố định 11 trạm Seath Group T09/2026'
    ws_detail.merge_cells('B8:E8')
    ws_detail['F8'] = len(SEATH_RUNS); ws_detail['F8'].number_format = '#,##0'; ws_detail.merge_cells('F8:G8')
    ws_detail['H8'] = '=SUM(L12:L19)'; ws_detail['H8'].number_format = '#,##0.00'; ws_detail.merge_cells('H8:I8')
    ws_detail['J8'] = '=SUM(M12:M19)'; ws_detail['J8'].number_format = '#,##0.00'; ws_detail.merge_cells('J8:K8')
    ws_detail['L8'] = '=SUM(O12:O19)'; ws_detail['L8'].number_format = '#,##0'; ws_detail.merge_cells('L8:O8')

    for c in range(1, 16):
        cell = ws_detail.cell(8, c)
        cell.font = font_bold
        cell.border = border_all
        if c in [1, 6, 7]: cell.alignment = align_center
        else: cell.alignment = align_right if c >= 8 else align_left

    # Detail Table Headers
    headers = [
        'STT', 'Tên Trạm', 'Mã Trạm (Mới)', 'Mã Trạm (Cũ)', 'Máy Phát Điện',
        'Công suất (kVA)', 'Định mức (L/h)', 'Nhiên liệu', 'Ngày chạy', 'Giờ bắt đầu',
        'Giờ kết thúc', 'Giờ chạy (h)', 'Tiêu hao (Lít)', 'Đơn giá Dầu (đ/L)', 'Thành tiền (đồng)'
    ]

    for c, h in enumerate(headers, 1):
        cell = ws_detail.cell(11, c, h)
        cell.font = font_header
        cell.fill = fill_header
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        cell.border = border_all

    start_r = 12
    for idx, r_data in enumerate(SEATH_RUNS, 1):
        r_num = start_r + idx - 1
        s_info = SEATH_STATIONS_INFO[r_data['raw_site']]
        ws_detail.cell(r_num, 1, idx).alignment = align_center
        ws_detail.cell(r_num, 2, s_info['name']).alignment = align_left
        ws_detail.cell(r_num, 3, r_data['canonical_site']).alignment = align_center
        ws_detail.cell(r_num, 4, r_data['raw_site']).alignment = align_center
        ws_detail.cell(r_num, 5, s_info['gen']).alignment = align_left
        ws_detail.cell(r_num, 6, s_info['cs']).alignment = align_center
        ws_detail.cell(r_num, 7, s_info['quota']).number_format = '0.00'
        ws_detail.cell(r_num, 8, 'Dầu DO').alignment = align_center
        ws_detail.cell(r_num, 9, r_data['date']).alignment = align_center
        ws_detail.cell(r_num, 10, r_data['start']).alignment = align_center
        ws_detail.cell(r_num, 11, r_data['end']).alignment = align_center
        
        c_h = ws_detail.cell(r_num, 12, r_data['hours'])
        c_h.number_format = '0.00'; c_h.alignment = align_right

        c_l = ws_detail.cell(r_num, 13, r_data['liters'])
        c_l.number_format = '0.00'; c_l.alignment = align_right

        c_p = ws_detail.cell(r_num, 14, r_data['price'])
        c_p.number_format = '#,##0'; c_p.alignment = align_right

        c_m = ws_detail.cell(r_num, 15, f'=M{r_num}*N{r_num}')
        c_m.number_format = '#,##0'; c_m.alignment = align_right

        for c in range(1, 16):
            ws_detail.cell(r_num, c).font = font_main
            ws_detail.cell(r_num, c).border = border_all

    end_r = start_r + len(SEATH_RUNS) - 1
    tot_r = end_r + 1

    ws_detail.cell(tot_r, 1, 'TỔNG CỘNG')
    ws_detail.merge_cells(start_row=tot_r, start_column=1, end_row=tot_r, end_column=11)
    ws_detail.cell(tot_r, 1).alignment = align_center
    ws_detail.cell(tot_r, 12, f'=SUM(L{start_r}:L{end_r})').number_format = '0.00'
    ws_detail.cell(tot_r, 13, f'=SUM(M{start_r}:M{end_r})').number_format = '0.00'
    ws_detail.cell(tot_r, 14, '')
    ws_detail.cell(tot_r, 15, f'=SUM(O{start_r}:O{end_r})').number_format = '#,##0'

    for c in range(1, 16):
        cell = ws_detail.cell(tot_r, c)
        cell.font = font_bold
        cell.fill = fill_total
        cell.border = border_total

    # =========================================================================
    # SHEET 2: TỔNG HỢP THEO TRẠM
    # =========================================================================
    ws_sum = wb.create_sheet(title='Tong_Hop_Theo_Tram')
    ws_sum['A1'] = 'TỔNG HỢP NHIÊN LIỆU THEO TRẠM - SEATH GROUP THÁNG 09/2026'
    ws_sum['A1'].font = font_title

    headers_sum = ['STT', 'Mã Trạm Mới', 'Mã Trạm Cũ', 'Tên Trạm', 'Huyện', 'Loại Máy', 'Công Suất', 'Số Ca Chạy', 'Tổng Giờ (h)', 'Tổng Lít Dầu', 'Tổng Tiền (VNĐ)']
    for c, h in enumerate(headers_sum, 1):
        cell = ws_sum.cell(3, c, h)
        cell.font = font_header
        cell.fill = fill_header
        cell.alignment = align_center
        cell.border = border_all

    # Aggregate by station
    r_idx = 4
    for idx, (raw_sid, info) in enumerate(SEATH_STATIONS_INFO.items(), 1):
        runs_this = [r for r in SEATH_RUNS if r['raw_site'] == raw_sid]
        num_runs = len(runs_this)
        tot_h = sum(r['hours'] for r in runs_this)
        tot_l = sum(r['liters'] for r in runs_this)
        tot_m = sum(r['amount'] for r in runs_this)

        ws_sum.cell(r_idx, 1, idx).alignment = align_center
        ws_sum.cell(r_idx, 2, info['canonical']).alignment = align_center
        ws_sum.cell(r_idx, 3, raw_sid).alignment = align_center
        ws_sum.cell(r_idx, 4, info['name']).alignment = align_left
        ws_sum.cell(r_idx, 5, info['district']).alignment = align_center
        ws_sum.cell(r_idx, 6, info['gen']).alignment = align_left
        ws_sum.cell(r_idx, 7, f"{info['cs']} kVA").alignment = align_center
        ws_sum.cell(r_idx, 8, num_runs).alignment = align_center
        ws_sum.cell(r_idx, 9, tot_h).number_format = '0.00'; ws_sum.cell(r_idx, 9).alignment = align_right
        ws_sum.cell(r_idx, 10, tot_l).number_format = '0.00'; ws_sum.cell(r_idx, 10).alignment = align_right
        ws_sum.cell(r_idx, 11, tot_m).number_format = '#,##0'; ws_sum.cell(r_idx, 11).alignment = align_right

        for c in range(1, 12):
            ws_sum.cell(r_idx, c).font = font_main
            ws_sum.cell(r_idx, c).border = border_all
        r_idx += 1

    # Total row in summary
    ws_sum.cell(r_idx, 1, 'TỔNG CỘNG')
    ws_sum.merge_cells(start_row=r_idx, start_column=1, end_row=r_idx, end_column=7)
    ws_sum.cell(r_idx, 1).alignment = align_center
    ws_sum.cell(r_idx, 8, f'=SUM(H4:H{r_idx-1})').number_format = '#,##0'
    ws_sum.cell(r_idx, 9, f'=SUM(I4:I{r_idx-1})').number_format = '0.00'
    ws_sum.cell(r_idx, 10, f'=SUM(J4:J{r_idx-1})').number_format = '0.00'
    ws_sum.cell(r_idx, 11, f'=SUM(K4:K{r_idx-1})').number_format = '#,##0'

    for c in range(1, 12):
        cell = ws_sum.cell(r_idx, c)
        cell.font = font_bold
        cell.fill = fill_total
        cell.border = border_total

    # Auto adjust column widths
    for sheet in [ws_detail, ws_sum]:
        for col in sheet.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                val = str(cell.value or '')
                if len(val) > max_len and not cell.coordinate in sheet.merged_cells:
                    max_len = len(val)
            sheet.column_dimensions[col_letter].width = max(max_len + 4, 12)

    wb.save(OUTPUT_PATH)
    print(f"🎉 Đã xuất thành công hồ sơ Seath Group độc lập tại: {OUTPUT_PATH}")

if __name__ == '__main__':
    export_seath_statement()
