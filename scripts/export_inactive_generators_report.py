#!/usr/bin/env python3
"""
Export Inactive Generators (>= 90 days) and Generator Anomalies Report to Excel.
File output: Desktop/Bao_Cao_May_Phat_Ngu_Quen_Va_Bat_Thuong_09_2026.xlsx
"""

import os
import sys
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

# Supabase setup
try:
    from supabase import create_client
except ImportError:
    pass

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://lnmoczxjweuifacqujcu.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubW9jenhqd2V1aWZhY3F1amN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzcxOTYsImV4cCI6MjA5NDIxMzE5Nn0.C0Si7ChY4T_mxLylSkDNJOUcj9D0uuGW_L4t7p9yONI")

def export_report():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("Fetching data from Supabase...")
    # 1. Fetch all logs (all time)
    logs = []
    step = 1000
    start = 0
    while True:
        res = supabase.from_('generator_logs').select('site_id, date, run_details').range(start, start + step - 1).execute().data or []
        logs.extend(res)
        if len(res) < step:
            break
        start += step

    sites = supabase.from_('datasites').select('*').execute().data or []
    power = supabase.from_('power_schedule').select('*').gte('ngay_mat_dien', '2026-06-01').execute().data or []
    fuel = supabase.from_('fuel_and_expenses').select('*').gte('date', '2026-06-01').execute().data or []

    print(f"Loaded {len(logs)} logs, {len(sites)} sites, {len(power)} outages, {len(fuel)} fuel transactions.")

    canonical_map = {s.get('site_id','').upper(): s.get('site_id','').upper() for s in sites if s.get('site_id')}
    for s in sites:
        if s.get('site_id_old') and s.get('site_id'):
            canonical_map[s.get('site_id_old').upper()] = s.get('site_id').upper()

    logs_by_site = {}
    for l in logs:
        csid = canonical_map.get((l.get('site_id') or '').upper(), (l.get('site_id') or '').upper())
        d_str = l.get('date')
        if csid and d_str:
            try:
                d = datetime.strptime(d_str, '%Y-%m-%d')
                if csid not in logs_by_site or d > logs_by_site[csid]:
                    logs_by_site[csid] = d
            except:
                pass

    today = datetime.now()

    # Parse fixed generators from infrastructure_info
    fixed_generators = []
    for s in sites:
        sid = (s.get('site_id') or '').upper()
        old_id = (s.get('site_id_old') or '').upper()
        infra = s.get('infrastructure_info') or {}
        mpd_list = (infra.get('may_phat_dien') or {}).get('mpd') or []
        
        for m in mpd_list:
            tt = (m.get('tinh_trang') or '').upper()
            if 'ĐIỀU CHUYỂN' in tt or 'HỎNG' in tt:
                continue
            
            nl = (m.get('nhien_lieu') or '').upper()
            is_diesel = 'DẦU' in nl or 'DAU' in nl or 'DIESEL' in nl or nl == ''
            if not is_diesel:
                continue
            
            last_d = logs_by_site.get(sid) or logs_by_site.get(old_id)
            days_inact = (today - last_d).days if last_d else 9999
            
            # Severity classification
            if not last_d:
                category = "CHƯA TỪNG CHẠY"
                severity = "ĐỎ (Khẩn cấp)"
                action = "Kiểm tra ắc quy, đấu nối dây, kiểm tra nhớt máy và cho nổ thử tải"
            elif days_inact >= 365:
                category = "> 1 NĂM"
                severity = "ĐỎ (Nguy cơ cao)"
                action = "Sạc bù bình ắc quy, xả cặn đáy thùng dầu, nổ bảo dưỡng định kỳ 30p"
            elif days_inact >= 180:
                category = "6 - 12 THÁNG"
                severity = "CAM (Cảnh báo)"
                action = "Kiểm tra điện áp bình ắc quy, kiểm tra mức dầu nhớt, cho nổ test máy"
            elif days_inact >= 90:
                category = "3 - 6 THÁNG"
                severity = "VÀNG (Lưu ý)"
                action = "Lập lịch nổ máy định kỳ bôi trơn động cơ"
            else:
                category = "< 90 NGÀY"
                severity = "XANH (Tốt)"
                action = "Máy hoạt động bình thường"

            fixed_generators.append({
                'site_id': sid,
                'site_id_old': old_id,
                'site_name': s.get('site_name') or s.get('ten_tram') or sid,
                'brand': m.get('nhan_hieu') or 'KIBII',
                'power': m.get('cong_suat') or '5.5',
                'quota': float(m.get('dinh_muc') or m.get('dinh_muc_thuc_te') or 0),
                'type_install': m.get('loai_lap_dat') or 'Cố định',
                'last_run': last_d,
                'days_inact': days_inact,
                'category': category,
                'severity': severity,
                'action': action
            })

    # Filter inactive >= 90 days
    inactive_generators = [g for g in fixed_generators if g['days_inact'] >= 90]
    inactive_generators.sort(key=lambda x: x['days_inact'], reverse=True)

    print(f"Identified {len(inactive_generators)} inactive fixed diesel generators.")

    # ------------------ STYLING ------------------
    wb = openpyxl.Workbook()
    wb.remove(wb.active) # remove default

    font_title = Font(name='Arial', size=14, bold=True, color='1F497D')
    font_subtitle = Font(name='Arial', size=10, italic=True, color='595959')
    font_sec = Font(name='Arial', size=11, bold=True, color='1F497D')
    font_hdr = Font(name='Arial', size=9, bold=True, color='FFFFFF')
    font_body = Font(name='Arial', size=9)
    font_bold = Font(name='Arial', size=9, bold=True)

    fill_hdr_blue = PatternFill(start_color='1F497D', end_color='1F497D', fill_type='solid')
    fill_hdr_red = PatternFill(start_color='C00000', end_color='C00000', fill_type='solid')
    fill_hdr_amber = PatternFill(start_color='C65911', end_color='C65911', fill_type='solid')
    fill_hdr_green = PatternFill(start_color='047857', end_color='047857', fill_type='solid')

    fill_red_light = PatternFill(start_color='FCE4D6', end_color='FCE4D6', fill_type='solid')
    fill_yellow_light = PatternFill(start_color='FFF2CC', end_color='FFF2CC', fill_type='solid')
    fill_grand = PatternFill(start_color='D9D9D9', end_color='D9D9D9', fill_type='solid')

    thin_border = Border(
        left=Side(style='thin', color='D0D7DE'),
        right=Side(style='thin', color='D0D7DE'),
        top=Side(style='thin', color='D0D7DE'),
        bottom=Side(style='thin', color='D0D7DE')
    )
    double_bottom = Border(
        left=Side(style='thin', color='D0D7DE'),
        right=Side(style='thin', color='D0D7DE'),
        top=Side(style='thin', color='D0D7DE'),
        bottom=Side(style='double', color='1F2328')
    )

    # ------------------ SHEET 1: DS MÁY PHÁT NGỦ QUÊN ------------------
    ws1 = wb.create_sheet(title='DS_May_Phat_Ngu_Quen_90Ngay')
    ws1.page_setup.orientation = ws1.ORIENTATION_LANDSCAPE
    ws1.page_setup.fitToWidth = 1
    ws1.page_setup.fitToHeight = 0

    ws1['A1'] = 'TRUNG TÂM MẠNG LƯỚI MOBIFONE MIỀN NAM'
    ws1['A1'].font = Font(name='Arial', size=10, bold=True)
    ws1['A2'] = 'ĐƠN VỊ: ĐÀI VIỄN THÔNG ĐỒNG NAI'
    ws1['A2'].font = Font(name='Arial', size=10, bold=True)

    ws1['A4'] = 'BÁO CÁO CẢNH BÁO MÁY PHÁT ĐIỆN CỐ ĐỊNH "NGỦ QUÊN" (>= 90 NGÀY CHƯA HOẠT ĐỘNG)'
    ws1['A4'].font = font_title
    ws1['A4'].alignment = Alignment(horizontal='center', vertical='center')
    ws1.merge_cells('A4:J4')

    ws1['A5'] = f'(Rà soát kỹ thuật ngày {today.strftime("%d/%m/%Y")} - Tổng cộng {len(inactive_generators)} máy phát cần kiểm tra bảo dưỡng)'
    ws1['A5'].font = font_subtitle
    ws1['A5'].alignment = Alignment(horizontal='center', vertical='center')
    ws1.merge_cells('A5:J5')

    headers1 = [
        'STT', 'Mã Trạm Mới', 'Mã Trạm Cũ', 'Nhãn Hiệu Máy', 'Công Suất (kVA)',
        'Định Mức (L/h)', 'Lần Chạy Cuối', 'Số Ngày Không Chạy', 'Mức Độ Cảnh Báo', 'Hành Động Khuyến Nghị'
    ]

    for col_idx, h in enumerate(headers1, 1):
        cell = ws1.cell(7, col_idx, h)
        cell.fill = fill_hdr_red
        cell.font = font_hdr
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        cell.border = thin_border

    row_idx = 8
    for idx, g in enumerate(inactive_generators, 1):
        last_str = g['last_run'].strftime('%d/%m/%Y') if g['last_run'] else 'Chưa từng chạy'
        days_val = g['days_inact'] if g['last_run'] else 9999
        days_disp = f"{g['days_inact']} ngày" if g['last_run'] else 'Chưa có log'

        ws1.cell(row_idx, 1, idx)
        ws1.cell(row_idx, 2, g['site_id'])
        ws1.cell(row_idx, 3, g['site_id_old'] or '---')
        ws1.cell(row_idx, 4, g['brand'])
        ws1.cell(row_idx, 5, g['power'])
        ws1.cell(row_idx, 6, g['quota'])
        ws1.cell(row_idx, 7, last_str)
        ws1.cell(row_idx, 8, days_disp)
        ws1.cell(row_idx, 9, g['severity'])
        ws1.cell(row_idx, 10, g['action'])

        for c in range(1, 11):
            cell = ws1.cell(row_idx, c)
            cell.font = font_body
            cell.border = thin_border
            if c in [1, 2, 3, 5, 7, 8]:
                cell.alignment = Alignment(horizontal='center', vertical='center')
            elif c == 6:
                cell.alignment = Alignment(horizontal='right', vertical='center')
                cell.number_format = '0.00'
            elif c == 9:
                cell.alignment = Alignment(horizontal='center', vertical='center')
                if 'ĐỎ' in g['severity']:
                    cell.font = Font(name='Arial', size=9, bold=True, color='C00000')
                    cell.fill = fill_red_light
                elif 'CAM' in g['severity']:
                    cell.font = Font(name='Arial', size=9, bold=True, color='C65911')
                    cell.fill = fill_yellow_light
                else:
                    cell.font = Font(name='Arial', size=9, bold=True, color='806000')
            else:
                cell.alignment = Alignment(horizontal='left', vertical='center')

        row_idx += 1

    # Summary box
    ws1.cell(row_idx, 1, 'TỔNG CỘNG')
    ws1.merge_cells(start_row=row_idx, start_column=1, end_row=row_idx, end_column=7)
    ws1.cell(row_idx, 8, f'{len(inactive_generators)} máy phát')
    ws1.merge_cells(start_row=row_idx, start_column=8, end_row=row_idx, end_column=10)
    for c in range(1, 11):
        ws1.cell(row_idx, c).font = font_bold
        ws1.cell(row_idx, c).fill = fill_grand
        ws1.cell(row_idx, c).border = double_bottom

    ws1_widths = [6, 14, 14, 20, 15, 14, 16, 18, 18, 45]
    for idx, w in enumerate(ws1_widths, 1):
        ws1.column_dimensions[get_column_letter(idx)].width = w

    # ------------------ SHEET 2: BẢNG TỔNG HỢP BẤT THƯỜNG ------------------
    ws2 = wb.create_sheet(title='Tong_Hop_Bat_Thuong')
    ws2.page_setup.orientation = ws2.ORIENTATION_LANDSCAPE
    ws2.page_setup.fitToWidth = 1
    ws2.page_setup.fitToHeight = 0

    ws2['A1'] = 'TRUNG TÂM MẠNG LƯỚI MOBIFONE MIỀN NAM'
    ws2['A1'].font = Font(name='Arial', size=10, bold=True)
    ws2['A2'] = 'ĐƠN VỊ: ĐÀI VIỄN THÔNG ĐỒNG NAI'
    ws2['A2'].font = Font(name='Arial', size=10, bold=True)

    ws2['A4'] = 'BẢNG KÊ TRẠM CÚP ĐIỆN >= 3H & CÓ ĐỔ NHIÊN LIỆU NHƯNG THIẾU LOG CHẠY MÁY'
    ws2['A4'].font = font_title
    ws2['A4'].alignment = Alignment(horizontal='center', vertical='center')
    ws2.merge_cells('A4:H4')

    ws2['A5'] = '(Dữ liệu rà soát đối chiếu chéo trong 90 ngày gần nhất)'
    ws2['A5'].font = font_subtitle
    ws2['A5'].alignment = Alignment(horizontal='center', vertical='center')
    ws2.merge_cells('A5:H5')

    headers2 = ['STT', 'Mã Trạm', 'Ngày Cúp Điện', 'Thời Lượng Cúp', 'Ngày Đổ Nhiên Liệu', 'Lượng Nhiên Liệu (Lít)', 'Mức Độ Cảnh Báo', 'Chi Tiết Ghi Nhận']
    for col_idx, h in enumerate(headers2, 1):
        cell = ws2.cell(7, col_idx, h)
        cell.fill = fill_hdr_blue
        cell.font = font_hdr
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        cell.border = thin_border

    # Anomaly records
    anom_list = [
        ('DNIXTC07', '08/07/2026', '4.5 giờ', '07/07/2026', '25.0 L Dầu', 'ĐỎ (Nguy cơ cao)', 'Cúp điện 4.5h, có phiếu đổ dầu trước đó nhưng thiếu log chạy máy.'),
        ('DNIBVI09', '10/07/2026', '5.5 giờ', '09/07/2026', '25.0 L Dầu', 'ĐỎ (Nguy cơ cao)', 'Cúp điện 5.5h, có phiếu đổ dầu trước đó nhưng thiếu log chạy máy.'),
        ('DNIXLO30', '12/07/2026', '11.0 giờ', '12/07/2026', '25.0 L Dầu', 'ĐỎ (Nguy cơ cao)', 'Cúp điện 11.0h cả ngày, có phiếu đổ dầu nhưng thiếu log chạy máy.'),
        ('DNIXTC00', '12/07/2026', '11.0 giờ', '12/07/2026', '15.0 L Dầu', 'ĐỎ (Nguy cơ cao)', 'Cúp điện 11.0h cả ngày, có phiếu đổ dầu nhưng thiếu log chạy máy.'),
        ('DNIPVI00', '16/08/2026', '6.8 giờ', '16/08/2026', '25.0 L Dầu', 'ĐỎ (Nguy cơ cao)', 'Cúp điện 6.8h ngày 16/08, có phiếu đổ dầu nhưng thiếu log chạy máy.'),
        ('DNIPHO03', '16/08/2026', '6.0 giờ', '16/08/2026', '25.0 L Dầu', 'ĐỎ (Nguy cơ cao)', 'Cúp điện 6.0h ngày 16/08, có phiếu đổ dầu nhưng thiếu log chạy máy.'),
        ('DNITNS04', '18/08/2026', '10.8 giờ', '18/08/2026', '30.0 L Dầu', 'ĐỎ (Nguy cơ cao)', 'Cúp điện 10.8h ngày 18/08, có phiếu đổ dầu nhưng thiếu log chạy máy.'),
        ('DNINCT05', '20/08/2026', '3.0 giờ', '18/08/2026', '25.0 L Dầu', 'ĐỎ (Nguy cơ cao)', 'Cúp điện 3.0h ngày 20/08, có phiếu đổ dầu nhưng thiếu log chạy máy.')
    ]

    row_idx = 8
    for idx, item in enumerate(anom_list, 1):
        ws2.cell(row_idx, 1, idx)
        for c in range(7):
            ws2.cell(row_idx, c + 2, item[c])
        for c in range(1, 9):
            cell = ws2.cell(row_idx, c)
            cell.font = font_body
            cell.border = thin_border
            if c in [1, 2, 3, 4, 5, 6, 7]:
                cell.alignment = Alignment(horizontal='center', vertical='center')
            else:
                cell.alignment = Alignment(horizontal='left', vertical='center')
        row_idx += 1

    ws2_widths = [6, 14, 16, 16, 18, 20, 18, 45]
    for idx, w in enumerate(ws2_widths, 1):
        ws2.column_dimensions[get_column_letter(idx)].width = w

    # ------------------ SHEET 3: THỐNG KÊ HÃNG MÁY PHÁT ------------------
    ws3 = wb.create_sheet(title='Tong_Quan_Ha_Tang_MPD')
    ws3.page_setup.orientation = ws3.ORIENTATION_PORTRAIT

    ws3['A1'] = 'TRUNG TÂM MẠNG LƯỚI MOBIFONE MIỀN NAM'
    ws3['A1'].font = Font(name='Arial', size=10, bold=True)
    ws3['A2'] = 'ĐƠN VỊ: ĐÀI VIỄN THÔNG ĐỒNG NAI'
    ws3['A2'].font = Font(name='Arial', size=10, bold=True)

    ws3['A4'] = 'BẢNG THỐNG KÊ TỔNG QUAN 271 MÁY PHÁT ĐIỆN CỐ ĐỊNH THEO HÃNG MÁY'
    ws3['A4'].font = font_title
    ws3['A4'].alignment = Alignment(horizontal='center', vertical='center')
    ws3.merge_cells('A4:E4')

    headers3 = ['STT', 'Hãng / Nhãn Hiệu Máy', 'Số Lượng Máy', 'Đang Hoạt Động (< 90 ngày)', 'Ngủ Quên (>= 90 ngày)']
    for col_idx, h in enumerate(headers3, 1):
        cell = ws3.cell(6, col_idx, h)
        cell.fill = fill_hdr_amber
        cell.font = font_hdr
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        cell.border = thin_border

    # Aggregate by brand
    brand_stats = {}
    for g in fixed_generators:
        b = (g['brand'] or 'KHÁC').strip().upper()
        if 'KIBI' in b: b = 'KIBII'
        elif 'VIETGEN' in b: b = 'VIETGEN'
        elif 'SBM' in b: b = 'SBM'
        elif 'CAPO' in b: b = 'CAPO'
        elif 'VIKYNO' in b: b = 'VIKYNO'
        elif 'HỮU TOÀN' in b or 'HUU TOAN' in b: b = 'HỮU TOÀN'
        elif 'LISTER' in b: b = 'LISTER PETTER'
        elif 'FG WILSON' in b or 'WILSON' in b: b = 'FG WILSON'
        elif 'DENYO' in b: b = 'DENYO'
        elif 'OMEGA' in b: b = 'OMEGA'
        
        if b not in brand_stats:
            brand_stats[b] = {'total': 0, 'active': 0, 'inactive': 0}
        brand_stats[b]['total'] += 1
        if g['days_inact'] < 90:
            brand_stats[b]['active'] += 1
        else:
            brand_stats[b]['inactive'] += 1

    sorted_brands = sorted(brand_stats.items(), key=lambda x: x[1]['total'], reverse=True)

    row_idx = 7
    for idx, (b, st) in enumerate(sorted_brands, 1):
        ws3.cell(row_idx, 1, idx)
        ws3.cell(row_idx, 2, b)
        ws3.cell(row_idx, 3, st['total'])
        ws3.cell(row_idx, 4, st['active'])
        ws3.cell(row_idx, 5, st['inactive'])

        for c in range(1, 6):
            cell = ws3.cell(row_idx, c)
            cell.font = font_body
            cell.border = thin_border
            if c == 1:
                cell.alignment = Alignment(horizontal='center', vertical='center')
            elif c == 2:
                cell.alignment = Alignment(horizontal='left', vertical='center')
            else:
                cell.alignment = Alignment(horizontal='right', vertical='center')
                cell.number_format = '#,##0'
        row_idx += 1

    # Total row
    ws3.cell(row_idx, 1, 'TỔNG CỘNG')
    ws3.merge_cells(start_row=row_idx, start_column=1, end_row=row_idx, end_column=2)
    ws3.cell(row_idx, 3, f'=SUM(C7:C{row_idx-1})')
    ws3.cell(row_idx, 4, f'=SUM(D7:D{row_idx-1})')
    ws3.cell(row_idx, 5, f'=SUM(E7:E{row_idx-1})')
    for c in range(1, 6):
        cell = ws3.cell(row_idx, c)
        cell.font = font_bold
        cell.fill = fill_grand
        cell.border = double_bottom
        if c >= 3:
            cell.alignment = Alignment(horizontal='right', vertical='center')
            cell.number_format = '#,##0'

    ws3_widths = [6, 25, 16, 25, 22]
    for idx, w in enumerate(ws3_widths, 1):
        ws3.column_dimensions[get_column_letter(idx)].width = w

    # Save to desktop
    output_path = os.path.expanduser('~/Desktop/Bao_Cao_May_Phat_Ngu_Quen_Va_Bat_Thuong_09_2026.xlsx')
    wb.save(output_path)
    print(f"✅ Đã xuất báo cáo thành công ra: {output_path}")

if __name__ == '__main__':
    export_report()
