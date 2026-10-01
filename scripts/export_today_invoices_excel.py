#!/usr/bin/env python3
"""
Xuất Bảng Kê Chi Tiết Hóa Đơn Xăng Dầu Ngày Hôm Nay (30/09/2026) Ra File Excel
Gồm 2 Sheet:
  1. Hóa Đơn Ngày 30-09-2026 (Chi tiết 5 HĐ phát hành hôm nay)
  2. Toàn Bộ Đợt Quét (29-30.09) (Bao gồm các HĐ quét đợt này)
"""

import os
import sys
import json
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from supabase import create_client

SUPABASE_URL = "https://lnmoczxjweuifacqujcu.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubW9jenhqd2V1aWZhY3F1amN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzcxOTYsImV4cCI6MjA5NDIxMzE5Nn0.C0Si7ChY4T_mxLylSkDNJOUcj9D0uuGW_L4t7p9yONI"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def format_date_vn(date_str):
    if not date_str:
        return ""
    try:
        parts = date_str.split("-")
        if len(parts) == 3:
            return f"{parts[2]}/{parts[1]}/{parts[0]}"
    except:
        pass
    return date_str

def style_sheet(ws, title_text, invoices_data, date_label):
    # Setup styles
    font_title = Font(name='Segoe UI', size=16, bold=True, color='1F4E78')
    font_subtitle = Font(name='Segoe UI', size=10, italic=True, color='595959')
    font_kpi_num = Font(name='Segoe UI', size=14, bold=True, color='1F4E78')
    font_kpi_label = Font(name='Segoe UI', size=9, bold=True, color='595959')
    font_header = Font(name='Segoe UI', size=10, bold=True, color='FFFFFF')
    font_data = Font(name='Segoe UI', size=9)
    font_data_bold = Font(name='Segoe UI', size=9, bold=True)
    font_link = Font(name='Segoe UI', size=9, color='0563C1', underline='single')

    fill_header = PatternFill(start_color='1F4E78', end_color='1F4E78', fill_type='solid')
    fill_alt = PatternFill(start_color='F9FAFB', end_color='F9FAFB', fill_type='solid')
    fill_total = PatternFill(start_color='E2EFDA', end_color='E2EFDA', fill_type='solid')
    fill_kpi = PatternFill(start_color='F2F4F7', end_color='F2F4F7', fill_type='solid')

    border_thin = Border(
        left=Side(style='thin', color='D9D9D9'),
        right=Side(style='thin', color='D9D9D9'),
        top=Side(style='thin', color='D9D9D9'),
        bottom=Side(style='thin', color='D9D9D9')
    )
    border_total = Border(
        left=Side(style='thin', color='D9D9D9'),
        right=Side(style='thin', color='D9D9D9'),
        top=Side(style='medium', color='1F4E78'),
        bottom=Side(style='double', color='1F4E78')
    )

    # 1. Title & Subtitle
    ws.merge_cells('A1:Q1')
    ws['A1'] = title_text
    ws['A1'].font = font_title
    ws['A1'].alignment = Alignment(horizontal='left', vertical='center')

    ws.merge_cells('A2:Q2')
    ws['A2'] = f"Đơn vị: MobiFone Tỉnh Đồng Nai - Đội VHKT TVT3 | Thời gian xuất: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
    ws['A2'].font = font_subtitle
    ws['A2'].alignment = Alignment(horizontal='left', vertical='center')

    # Calculate KPIs
    total_count = len(invoices_data)
    total_amount = sum(float(inv.get('total_amount') or 0) for inv in invoices_data)
    
    total_liters = 0.0
    for inv in invoices_data:
        items = inv.get('items') or []
        for it in items:
            total_liters += float(it.get('sl') or 0.0)

    # 2. KPI Cards (Row 4-5)
    # Card 1: Số hóa đơn
    ws.merge_cells('A4:C4')
    ws.merge_cells('A5:C5')
    ws['A4'] = "TỔNG SỐ HÓA ĐƠN"
    ws['A4'].font = font_kpi_label
    ws['A4'].alignment = Alignment(horizontal='center', vertical='center')
    ws['A4'].fill = fill_kpi
    ws['A5'] = f"{total_count} HĐ"
    ws['A5'].font = font_kpi_num
    ws['A5'].alignment = Alignment(horizontal='center', vertical='center')
    ws['A5'].fill = fill_kpi

    # Card 2: Tổng lượng nhiên liệu
    ws.merge_cells('D4:G4')
    ws.merge_cells('D5:G5')
    ws['D4'] = "TỔNG NHIÊN LIỆU (LÍT)"
    ws['D4'].font = font_kpi_label
    ws['D4'].alignment = Alignment(horizontal='center', vertical='center')
    ws['D4'].fill = fill_kpi
    ws['D5'] = f"{total_liters:,.2f} Lít"
    ws['D5'].font = font_kpi_num
    ws['D5'].alignment = Alignment(horizontal='center', vertical='center')
    ws['D5'].fill = fill_kpi

    # Card 3: Tổng tiền thanh toán
    ws.merge_cells('H4:L4')
    ws.merge_cells('H5:L5')
    ws['H4'] = "TỔNG TIỀN THANH TOÁN (VNĐ)"
    ws['H4'].font = font_kpi_label
    ws['H4'].alignment = Alignment(horizontal='center', vertical='center')
    ws['H4'].fill = fill_kpi
    ws['H5'] = f"{total_amount:,.0f} đ"
    ws['H5'].font = font_kpi_num
    ws['H5'].alignment = Alignment(horizontal='center', vertical='center')
    ws['H5'].fill = fill_kpi

    # Border for KPI cards
    for row in range(4, 6):
        for col in range(1, 13):
            cell = ws.cell(row=row, column=col)
            cell.border = border_thin

    # 3. Table Headers (Row 7)
    headers = [
        ("STT", 6, 'center'),
        ("Số HĐ", 12, 'center'),
        ("Ngày lập", 12, 'center'),
        ("Ký hiệu HĐ", 12, 'center'),
        ("Mã tra cứu", 15, 'center'),
        ("Đơn vị phát hành (Người bán)", 34, 'left'),
        ("MST Người bán", 15, 'center'),
        ("Đơn vị mua hàng", 34, 'left'),
        ("MST Người mua", 16, 'center'),
        ("Tên mặt hàng", 24, 'left'),
        ("ĐVT", 8, 'center'),
        ("Số lượng", 12, 'right'),
        ("Đơn giá (đ)", 14, 'right'),
        ("Tiền hàng (đ)", 16, 'right'),
        ("Thuế GTGT (đ)", 14, 'right'),
        ("Tổng tiền (đ)", 18, 'right'),
        ("Link Tra Cứu / Hóa Đơn", 35, 'left')
    ]

    header_row = 7
    for col_idx, (h_name, width, align) in enumerate(headers, 1):
        cell = ws.cell(row=header_row, column=col_idx, value=h_name)
        cell.font = font_header
        cell.fill = fill_header
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        cell.border = border_thin
        ws.column_dimensions[get_column_letter(col_idx)].width = width

    ws.row_dimensions[header_row].height = 28

    # 4. Populate Data Rows
    current_row = header_row + 1
    stt = 1

    for inv in invoices_data:
        so_hd = inv.get('invoice_number') or ''
        ngay_lap = format_date_vn(inv.get('invoice_date') or '')
        kh_hd = inv.get('kh_hd') or ''
        ma_tra_cuu = inv.get('ma_tra_cuu') or ''
        seller_name = inv.get('seller_name') or ''
        seller_mst = inv.get('seller_mst') or ''
        buyer_name = inv.get('buyer_name') or ''
        buyer_mst = inv.get('buyer_mst') or ''
        total_amt = float(inv.get('total_amount') or 0.0)
        sub_total = float(inv.get('sub_total') or total_amt)
        vat_amount = float(inv.get('vat_amount') or 0.0)
        inv_url = inv.get('invoice_url') or ''

        items = inv.get('items') or []
        if not items:
            items = [{
                'ten': 'Dầu Điêzen 0,05S',
                'dvt': 'Lít',
                'sl': 0.0,
                'dg': 0.0,
                'tt': sub_total
            }]

        for item_idx, it in enumerate(items):
            item_name = it.get('ten') or ''
            dvt = it.get('dvt') or 'Lít'
            sl = float(it.get('sl') or 0.0)
            dg = float(it.get('dg') or 0.0)
            tt = float(it.get('tt') or sub_total)

            is_first_item = (item_idx == 0)
            is_alt = (stt % 2 == 0)
            row_fill = fill_alt if is_alt else None

            row_data = [
                (stt if is_first_item else "", 'center', None),
                (so_hd if is_first_item else "", 'center', font_data_bold if is_first_item else font_data),
                (ngay_lap if is_first_item else "", 'center', font_data),
                (kh_hd if is_first_item else "", 'center', font_data),
                (ma_tra_cuu if is_first_item else "", 'center', font_data),
                (seller_name if is_first_item else "", 'left', font_data),
                (seller_mst if is_first_item else "", 'center', font_data),
                (buyer_name if is_first_item else "", 'left', font_data),
                (buyer_mst if is_first_item else "", 'center', font_data),
                (item_name, 'left', font_data),
                (dvt, 'center', font_data),
                (sl if sl > 0 else "-", 'right', font_data),
                (dg if dg > 0 else "-", 'right', font_data),
                (tt if is_first_item else "", 'right', font_data),
                (vat_amount if is_first_item else "", 'right', font_data),
                (total_amt if is_first_item else "", 'right', font_data_bold),
                ("Xem hóa đơn trực tuyến" if inv_url and is_first_item else "", 'left', font_link if inv_url and is_first_item else font_data)
            ]

            ws.row_dimensions[current_row].height = 20
            for col_idx, (val, align, c_font) in enumerate(row_data, 1):
                cell = ws.cell(row=current_row, column=col_idx, value=val)
                cell.alignment = Alignment(horizontal=align, vertical='center')
                cell.font = c_font or font_data
                if row_fill:
                    cell.fill = row_fill
                cell.border = border_thin

                # Number formats
                if col_idx == 12 and isinstance(val, (int, float)):
                    cell.number_format = '#,##0.00'
                elif col_idx in [13, 14, 15, 16] and isinstance(val, (int, float)):
                    cell.number_format = '#,##0'

                # Link
                if col_idx == 17 and inv_url and is_first_item:
                    cell.hyperlink = inv_url

            current_row += 1

        stt += 1

    # 5. Summary Total Row
    ws.row_dimensions[current_row].height = 24
    ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=11)
    cell_total_label = ws.cell(row=current_row, column=1, value="TỔNG CỘNG THANH TOÁN")
    cell_total_label.font = font_data_bold
    cell_total_label.alignment = Alignment(horizontal='center', vertical='center')

    # Sum Qty
    cell_total_sl = ws.cell(row=current_row, column=12, value=total_liters)
    cell_total_sl.font = font_data_bold
    cell_total_sl.alignment = Alignment(horizontal='right', vertical='center')
    cell_total_sl.number_format = '#,##0.00'

    # Empty dg
    ws.cell(row=current_row, column=13, value="")

    # Sum subtotal
    sub_total_sum = sum(float(inv.get('sub_total') or inv.get('total_amount') or 0.0) for inv in invoices_data)
    cell_total_sub = ws.cell(row=current_row, column=14, value=sub_total_sum)
    cell_total_sub.font = font_data_bold
    cell_total_sub.alignment = Alignment(horizontal='right', vertical='center')
    cell_total_sub.number_format = '#,##0'

    # Sum VAT
    vat_sum = sum(float(inv.get('vat_amount') or 0.0) for inv in invoices_data)
    cell_total_vat = ws.cell(row=current_row, column=15, value=vat_sum)
    cell_total_vat.font = font_data_bold
    cell_total_vat.alignment = Alignment(horizontal='right', vertical='center')
    cell_total_vat.number_format = '#,##0'

    # Sum total amount
    cell_total_amt = ws.cell(row=current_row, column=16, value=total_amount)
    cell_total_amt.font = Font(name='Segoe UI', size=10, bold=True, color='1F4E78')
    cell_total_amt.alignment = Alignment(horizontal='right', vertical='center')
    cell_total_amt.number_format = '#,##0'

    # Empty link
    ws.cell(row=current_row, column=17, value="")

    for c in range(1, 18):
        cell = ws.cell(row=current_row, column=c)
        cell.fill = fill_total
        cell.border = border_total

    # Freeze panes
    ws.freeze_panes = f"A{header_row + 1}"
    ws.views.sheetView[0].showGridLines = True

def main():
    print("🚀 Đang truy xuất danh sách hóa đơn từ cơ sở dữ liệu Supabase...")
    
    # 1. Hóa đơn hôm nay (30/09/2026)
    res_today = supabase.table('parsed_invoices').select('*').eq('invoice_date', '2026-09-30').order('invoice_number', desc=False).execute()
    today_invoices = res_today.data or []
    print(f"  [+] Hóa đơn ngày hôm nay (30/09/2026): {len(today_invoices)} HĐ")

    # 2. Toàn bộ hóa đơn đợt quét (29/09 & 30/09/2026, bao gồm cả 28/09 nhận bổ sung)
    res_all = supabase.table('parsed_invoices').select('*').gte('invoice_date', '2026-09-28').order('invoice_date', desc=True).order('invoice_number', desc=False).execute()
    all_invoices = res_all.data or []
    print(f"  [+] Toàn bộ hóa đơn đợt quét (28/09 - 30/09): {len(all_invoices)} HĐ")

    # Tạo file Excel
    wb = openpyxl.Workbook()
    wb.remove(wb.active) # Remove default sheet

    # Sheet 1: Hôm nay 30/09/2026
    ws_today = wb.create_sheet(title="Hóa Đơn Ngày 30-09-2026")
    style_sheet(
        ws_today,
        title_text="BẢNG KÊ CHI TIẾT HÓA ĐƠN XĂNG DẦU HÔM NAY (30/09/2026)",
        invoices_data=today_invoices,
        date_label="30/09/2026"
    )

    # Sheet 2: Toàn bộ đợt quét
    ws_all = wb.create_sheet(title="Toàn Bộ Đợt Quét (28-30.09)")
    style_sheet(
        ws_all,
        title_text="BẢNG KÊ TỔNG HỢP HÓA ĐƠN XĂNG DẦU ĐỢT QUÉT (28/09 - 30/09/2026)",
        invoices_data=all_invoices,
        date_label="28/09 - 30/09/2026"
    )

    # Output paths
    desktop_dir = "/Users/cang_it/Desktop"
    scratch_dir = "/Users/cang_it/Antigravity/TVT3/scratch"

    file_name = "Hoa_Don_Xang_Dau_Ngay_30_09_2026.xlsx"
    desktop_path = os.path.join(desktop_dir, file_name)
    scratch_path = os.path.join(scratch_dir, file_name)

    wb.save(desktop_path)
    wb.save(scratch_path)

    print(f"\n🎉 ĐÃ XUẤT THÀNH CÔNG FILE EXCEL:")
    print(f"  📁 Desktop: {desktop_path}")
    print(f"  📁 Scratch: {scratch_path}")

if __name__ == '__main__':
    main()
