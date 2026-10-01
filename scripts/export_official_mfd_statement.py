#!/usr/bin/env python3
"""
Official MFD Statement & Invoice Exporter (Mẫu 02A-TTNB_NLMPD & HD)
Xuất hồ sơ thanh toán máy phát điện và hóa đơn nhiên liệu chuẩn đẹp ra file Excel.
"""

import os
import sys
import argparse
import json
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

# Special 67 Sites for MobiFone Dong Nai (Group 1 - Raw & Canonical IDs)
SPECIAL_67_SITES_RAW = [
    'DNCM00', 'DNCM02', 'DNCM12', 'DNCM13', 'DNCM15', 'DNCM24', 'DNCM31', 'DNCM34', 'DNCM43', 'DNCM47',
    'DNDQ00', 'DNDQ01', 'DNDQ02', 'DNDQ03', 'DNDQ06', 'DNDQ10', 'DNDQ12', 'DNDQ15', 'DNDQ16', 'DNDQ22',
    'DNDQ30', 'DNDQ31', 'DNDQ33', 'DNDQ34', 'DNDQ35', 'DNDQ44', 'DNDQ47', 'DNIDQN1', 'DNITNT1', 'DNTNL1',
    'DNLK00', 'DNLK09', 'DNLK15', 'DNLK17', 'DNLK25', 'DNLK46', 'DNLT22', 'DNTN00', 'DNTN05', 'DNTN06',
    'DNTN10', 'DNTN27', 'DNTN31', 'DNTN35', 'DNTP00', 'DNTP05', 'DNTP10', 'DNTP26', 'DNTP28', 'DNTP32',
    'DNTP37', 'DNTP45', 'DNTP47', 'DNTP48', 'DNTP52', 'DNVC35', 'DNXL00', 'DNXL01', 'DNXL03', 'DNXL07',
    'DNXL09', 'DNXL20', 'DNXL44', 'DNXL46', 'DNXL47', 'DNXL48', 'DNXL65'
]

SPECIAL_67_CANONICAL_SITES = [
    'DNISRA00', 'DNIXDO00', 'DNICMY04', 'DNICMY05', 'DNIXQU01', 'DNISRA03', 'DNIXDO05', 'DNIXDO07', 'DNISRA06', 'DNIXDO13',
    'DNIDQU00', 'DNIDQU01', 'DNIDQU02', 'DNIDQU03', 'DNIDQU05', 'DNIDQU08', 'DNIDQU10', 'DNIDQU11', 'DNIDQU12', 'DNIDQU17',
    'DNIDQU21', 'DNIDQU22', 'DNIDQU24', 'DNIDQU25', 'DNIDQU26', 'DNIDQU28', 'DNIDQU31', 'DNIDQN1', 'DNIDGI31',
    'DNILKH00', 'DNIBLC00', 'DNILKH04', 'DNILKH05', 'DNILKH06', 'DNIBLC10', 'DNIXTC06', 'DNIBLC16', 'DNIBLC18', 'DNIBLC19',
    'DNIBLC21', 'DNIBLC29', 'DNIBLC32', 'DNIBLC35', 'DNIBVI00', 'DNIBVI03', 'DNIBVI07', 'DNITPU03', 'DNITPU05', 'DNITPU08',
    'DNITPU11', 'DNITPU17', 'DNITPU19', 'DNITPU20', 'DNITPU23', 'DNIPVI02', 'DNIXPH00', 'DNIXPH01', 'DNIXPH02', 'DNIXPH04',
    'DNIXPH06', 'DNIXPH11', 'DNIXPH21', 'DNIXPH23', 'DNIXPH24', 'DNIXPH25', 'DNIXPH30'
]

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
try:
    from seath_group_config import SEATH_GROUP_SITES_SET, is_seath_group_site
except ImportError:
    from backend.seath_group_config import SEATH_GROUP_SITES_SET, is_seath_group_site

ORIGINAL_67_SITES_SET = set(s.upper() for s in SPECIAL_67_SITES_RAW + SPECIAL_67_CANONICAL_SITES)
SPECIAL_67_SITES = ORIGINAL_67_SITES_SET - SEATH_GROUP_SITES_SET

def is_original_group_1(site_id, site_id_old=""):
    s1 = (site_id or "").upper().strip()
    s2 = (site_id_old or "").upper().strip()
    return s1 in ORIGINAL_67_SITES_SET or s2 in ORIGINAL_67_SITES_SET

def is_group_1(site_id, site_id_old=""):
    if is_seath_group_site(site_id, site_id_old):
        return False
    s1 = (site_id or "").upper().strip()
    s2 = (site_id_old or "").upper().strip()
    return s1 in SPECIAL_67_SITES or s2 in SPECIAL_67_SITES

def create_styled_workbook(month=8, year=2026, output_path=None):
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # 1. Query logs for the month
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year+1}-01-01"
    else:
        end_date = f"{year}-{month+1:02d}-01"
        
    print(f"Fetching logs from {start_date} to {end_date}...")
    logs_res = supabase.from_("generator_logs").select("*").gte("date", start_date).lt("date", end_date).execute()
    logs = logs_res.data or []
    
    invoices_res = supabase.from_("parsed_invoices").select("*").gte("invoice_date", start_date).lt("invoice_date", end_date).execute()
    invoices = invoices_res.data or []
    
    sites_res = supabase.from_("datasites").select("*").execute()
    sites = {s.get("site_id"): s for s in (sites_res.data or [])}

    print(f"Found {len(logs)} generator logs, {len(invoices)} invoices.")

    # Build workbook
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    thin_border = Border(
        left=Side(style='thin', color='D0D7DE'),
        right=Side(style='thin', color='D0D7DE'),
        top=Side(style='thin', color='D0D7DE'),
        bottom=Side(style='thin', color='D0D7DE')
    )
    thick_bottom = Border(
        left=Side(style='thin', color='D0D7DE'),
        right=Side(style='thin', color='D0D7DE'),
        top=Side(style='thin', color='D0D7DE'),
        bottom=Side(style='medium', color='1F2328')
    )
    double_bottom = Border(
        left=Side(style='thin', color='D0D7DE'),
        right=Side(style='thin', color='D0D7DE'),
        top=Side(style='thin', color='D0D7DE'),
        bottom=Side(style='double', color='1F2328')
    )

    header_fill_blue = PatternFill(start_color='1E3A8A', end_color='1E3A8A', fill_type='solid')
    header_fill_amber = PatternFill(start_color='B45309', end_color='B45309', fill_type='solid')
    header_fill_green = PatternFill(start_color='047857', end_color='047857', fill_type='solid')
    light_blue = PatternFill(start_color='EFF6FF', end_color='EFF6FF', fill_type='solid')
    light_amber = PatternFill(start_color='FFFBEB', end_color='FFFBEB', fill_type='solid')
    sum_fill = PatternFill(start_color='F1F5F9', end_color='F1F5F9', fill_type='solid')

    def add_02a_sheet(sheet_title, target_logs, group_name):
        ws = wb.create_sheet(title=sheet_title)
        
        ws['A1'] = 'TRUNG TÂM MẠNG LƯỚI MOBIFONE MIỀN NAM'
        ws['A1'].font = Font(name='Arial', size=10, bold=True)
        ws['A2'] = 'ĐƠN VỊ: ĐÀI VIỄN THÔNG ĐỒNG NAI'
        ws['A2'].font = Font(name='Arial', size=10, bold=True)

        ws['A4'] = 'BẢNG KÊ CHI TIẾT NHIÊN LIỆU CHẠY MÁY PHÁT ĐIỆN ĐÃ ĐƯỢC ĐỐI SOÁT'
        ws['A4'].font = Font(name='Arial', size=13, bold=True, color='1E3A8A')
        ws['A4'].alignment = Alignment(horizontal='center', vertical='center')
        ws.merge_cells('A4:O4')

        ws['A5'] = f'(Tháng {month:02d}/{year} - {group_name})'
        ws['A5'].font = Font(name='Arial', size=10, italic=True)
        ws['A5'].alignment = Alignment(horizontal='center', vertical='center')
        ws.merge_cells('A5:O5')

        # Separate Xăng vs Dầu
        xang_list = []
        dau_list = []
        for l in target_logs:
            rd = l.get('run_details') or {}
            st = sites.get(l.get('site_id')) or {}
            nl = (rd.get('nhien_lieu_loai') or rd.get('nhien_lieu') or st.get('nhien_lieu') or '').lower()
            lm = (rd.get('loai_may') or st.get('loai_may') or '').lower()
            if 'xăng' in nl or 'xang' in nl or 'honda' in lm or 'elemax' in lm or 'kyo' in lm or 'mlđ' in lm or 'mld' in lm or ('kibii' in lm and ('mlđ' in lm or 'lưu động' in lm or 'xăng' in nl)):
                xang_list.append((l, rd, st))
            else:
                dau_list.append((l, rd, st))

        # Sort by date ASC, then site_id ASC, then gio_bat_dau ASC for easy auditing and spotting anomalies
        sort_key = lambda item: (item[0].get('date') or '', item[0].get('site_id') or '', item[1].get('gio_bat_dau') or '')
        xang_list.sort(key=sort_key)
        dau_list.sort(key=sort_key)

        tot_m_x = sum(float(r[1].get('thanh_tien') or 0) for r in xang_list)
        tot_m_d = sum(float(r[1].get('thanh_tien') or 0) for r in dau_list)
        tot_m_all = tot_m_x + tot_m_d

        # Top summary
        ws['A7'] = 'STT'; ws['B7'] = 'Nội dung thanh toán'; ws.merge_cells('B7:E7')
        ws['F7'] = 'Số tiền chưa VAT (VNĐ)'; ws.merge_cells('F7:H7')
        ws['I7'] = 'Tiền thuế VAT (VNĐ)'; ws.merge_cells('I7:J7')
        ws['K7'] = 'Tổng tiền có VAT (VNĐ)'; ws.merge_cells('K7:L7')
        ws['M7'] = 'Ghi chú'; ws.merge_cells('M7:O7')
        
        for c in range(1, 16):
            cell = ws.cell(7, c)
            cell.fill = header_fill_blue
            cell.font = Font(name='Arial', size=9, bold=True, color='FFFFFF')
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border

        ws['A8'] = 1; ws['B8'] = f'Nhiên liệu chạy máy phát điện tháng {month:02d}/{year} ({group_name})'
        ws.merge_cells('B8:E8')
        ws['F8'] = round(tot_m_all); ws['F8'].number_format = '#,##0'; ws.merge_cells('F8:H8')
        ws['I8'] = 0; ws['I8'].number_format = '#,##0'; ws.merge_cells('I8:J8')
        ws['K8'] = '=F8+I8'; ws['K8'].number_format = '#,##0'; ws.merge_cells('K8:L8')
        ws['M8'] = 'Theo đối soát thực tế'; ws.merge_cells('M8:O8')
        for c in range(1, 16):
            ws.cell(8, c).font = Font(name='Arial', size=9)
            ws.cell(8, c).border = thin_border
            if c in [6, 9, 11]: ws.cell(8, c).alignment = Alignment(horizontal='right')

        ws['A9'] = 'TỔNG CỘNG THANH TOÁN'; ws.merge_cells('A9:E9')
        ws['F9'] = '=F8'; ws['F9'].number_format = '#,##0'; ws.merge_cells('F9:H9')
        ws['I9'] = '=I8'; ws['I9'].number_format = '#,##0'; ws.merge_cells('I9:J9')
        ws['K9'] = '=K8'; ws['K9'].number_format = '#,##0'; ws.merge_cells('K9:L9')
        for c in range(1, 16):
            ws.cell(9, c).font = Font(name='Arial', size=9, bold=True, color='1E3A8A')
            ws.cell(9, c).fill = sum_fill
            ws.cell(9, c).border = thick_bottom

        # Table headers
        headers_detail = [
            'STT', 'Tên Trạm', 'ID Trạm', 'Công suất máy (kVA)', 'Loại máy nổ',
            'Định mức (L/h)', 'Ngày vận hành', 'Giờ bắt đầu', 'Giờ kết thúc',
            'Thời gian hoạt động (giờ)', 'Nhiên liệu tiêu hao (lít)', 'Đơn giá trước VAT',
            'Thành tiền trước VAT (đồng)', 'Ghi chú', 'Kết quả đối soát'
        ]

        # Section A: Xăng
        ws['A11'] = 'A. MÁY CHẠY XĂNG'; ws['A11'].font = Font(name='Arial', size=11, bold=True, color='1E3A8A')
        for c, h in enumerate(headers_detail, 1):
            cell = ws.cell(12, c, h)
            cell.fill = header_fill_blue
            cell.font = Font(name='Arial', size=9, bold=True, color='FFFFFF')
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            cell.border = thin_border

        cur_row = 13
        stt = 1
        start_xang = cur_row
        for l, rd, st in xang_list:
            ws.cell(cur_row, 1, stt)
            ws.cell(cur_row, 2, l.get('site_id') or '')
            ws.cell(cur_row, 3, st.get('site_id_old') or l.get('site_id') or '')
            ws.cell(cur_row, 4, rd.get('cong_suat_may') or st.get('cong_suat') or 6)
            ws.cell(cur_row, 5, rd.get('loai_may') or st.get('loai_may') or 'KIBI')
            ws.cell(cur_row, 6, float(rd.get('dinh_muc') or 3.44))
            ws.cell(cur_row, 7, l.get('date') or '')
            ws.cell(cur_row, 8, rd.get('gio_bat_dau') or '')
            ws.cell(cur_row, 9, rd.get('gio_ket_thuc') or '')
            ws.cell(cur_row, 10, float(rd.get('thoi_gian_hoat_dong') or 0)).number_format = '0.00'
            ws.cell(cur_row, 11, float(rd.get('nhien_lieu_tieu_hao') or 0)).number_format = '0.00'
            ws.cell(cur_row, 12, float(rd.get('don_gia') or 0)).number_format = '#,##0'
            ws.cell(cur_row, 13, float(rd.get('thanh_tien') or 0)).number_format = '#,##0'
            ws.cell(cur_row, 14, rd.get('ghi_chu') or '')
            ws.cell(cur_row, 15, rd.get('ket_qua_doi_soat') or 'OK')

            for c in range(1, 16):
                ws.cell(cur_row, c).font = Font(name='Arial', size=9)
                ws.cell(cur_row, c).border = thin_border
            stt += 1
            cur_row += 1
        end_xang = cur_row - 1

        # Sum Xang
        ws.cell(cur_row, 1, 'Tổng cộng máy chạy xăng')
        ws.merge_cells(start_row=cur_row, start_column=1, end_row=cur_row, end_column=9)
        ws.cell(cur_row, 10, f'=SUM(J{start_xang}:J{end_xang})').number_format = '0.00'
        ws.cell(cur_row, 11, f'=SUM(K{start_xang}:K{end_xang})').number_format = '0.00'
        ws.cell(cur_row, 13, f'=SUM(M{start_xang}:M{end_xang})').number_format = '#,##0'
        for c in range(1, 16):
            ws.cell(cur_row, c).font = Font(name='Arial', size=9, bold=True, color='1E3A8A')
            ws.cell(cur_row, c).fill = light_blue
            ws.cell(cur_row, c).border = thick_bottom
        sum_xang_row = cur_row
        cur_row += 2

        # Section B: Dầu
        ws.cell(cur_row, 1, 'B. MÁY CHẠY DẦU').font = Font(name='Arial', size=11, bold=True, color='B45309')
        cur_row += 1
        for c, h in enumerate(headers_detail, 1):
            cell = ws.cell(cur_row, c, h)
            cell.fill = header_fill_amber
            cell.font = Font(name='Arial', size=9, bold=True, color='FFFFFF')
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            cell.border = thin_border
        cur_row += 1

        start_dau = cur_row
        stt = 1
        for l, rd, st in dau_list:
            ws.cell(cur_row, 1, stt)
            ws.cell(cur_row, 2, l.get('site_id') or '')
            ws.cell(cur_row, 3, st.get('site_id_old') or l.get('site_id') or '')
            ws.cell(cur_row, 4, rd.get('cong_suat_may') or st.get('cong_suat') or 8.5)
            ws.cell(cur_row, 5, rd.get('loai_may') or st.get('loai_may') or 'HỮU TOÀN')
            ws.cell(cur_row, 6, float(rd.get('dinh_muc') or 3.05))
            ws.cell(cur_row, 7, l.get('date') or '')
            ws.cell(cur_row, 8, rd.get('gio_bat_dau') or '')
            ws.cell(cur_row, 9, rd.get('gio_ket_thuc') or '')
            ws.cell(cur_row, 10, float(rd.get('thoi_gian_hoat_dong') or 0)).number_format = '0.00'
            ws.cell(cur_row, 11, float(rd.get('nhien_lieu_tieu_hao') or 0)).number_format = '0.00'
            ws.cell(cur_row, 12, float(rd.get('don_gia') or 0)).number_format = '#,##0'
            ws.cell(cur_row, 13, float(rd.get('thanh_tien') or 0)).number_format = '#,##0'
            ws.cell(cur_row, 14, rd.get('ghi_chu') or '')
            ws.cell(cur_row, 15, rd.get('ket_qua_doi_soat') or 'OK')

            for c in range(1, 16):
                ws.cell(cur_row, c).font = Font(name='Arial', size=9)
                ws.cell(cur_row, c).border = thin_border
            stt += 1
            cur_row += 1
        end_dau = cur_row - 1

        # Sum Dau
        ws.cell(cur_row, 1, 'Tổng cộng máy chạy dầu')
        ws.merge_cells(start_row=cur_row, start_column=1, end_row=cur_row, end_column=9)
        ws.cell(cur_row, 10, f'=SUM(J{start_dau}:J{end_dau})').number_format = '0.00'
        ws.cell(cur_row, 11, f'=SUM(K{start_dau}:K{end_dau})').number_format = '0.00'
        ws.cell(cur_row, 13, f'=SUM(M{start_dau}:M{end_dau})').number_format = '#,##0'
        for c in range(1, 16):
            ws.cell(cur_row, c).font = Font(name='Arial', size=9, bold=True, color='B45309')
            ws.cell(cur_row, c).fill = light_amber
            ws.cell(cur_row, c).border = thick_bottom
        sum_dau_row = cur_row
        cur_row += 1

        # Grand total
        ws.cell(cur_row, 1, 'TỔNG CỘNG (XĂNG + DẦU)')
        ws.merge_cells(start_row=cur_row, start_column=1, end_row=cur_row, end_column=9)
        ws.cell(cur_row, 10, f'=J{sum_xang_row}+J{sum_dau_row}').number_format = '0.00'
        ws.cell(cur_row, 11, f'=K{sum_xang_row}+K{sum_dau_row}').number_format = '0.00'
        ws.cell(cur_row, 13, f'=M{sum_xang_row}+M{sum_dau_row}').number_format = '#,##0'
        for c in range(1, 16):
            ws.cell(cur_row, c).font = Font(name='Arial', size=10, bold=True, color='000000')
            ws.cell(cur_row, c).fill = sum_fill
            ws.cell(cur_row, c).border = double_bottom

        # Auto width
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 11)
        ws.column_dimensions['A'].width = 8
        ws.column_dimensions['B'].width = 16
        ws.column_dimensions['C'].width = 14
        ws.column_dimensions['M'].width = 20

    def add_hd_sheet(sheet_title, target_invoices, group_name):
        ws = wb.create_sheet(title=sheet_title)
        ws['A1'] = 'TRUNG TÂM MẠNG LƯỚI MOBIFONE MIỀN NAM'; ws['A1'].font = Font(name='Arial', size=10, bold=True)
        ws['A2'] = 'ĐƠN VỊ: ĐÀI VIỄN THÔNG ĐỒNG NAI'; ws['A2'].font = Font(name='Arial', size=10, bold=True)
        ws['A4'] = f'BẢNG KÊ HÓA ĐƠN NHIÊN LIỆU MÁY PHÁT ĐIỆN THÁNG {month:02d}/{year}'
        ws['A4'].font = Font(name='Arial', size=13, bold=True, color='047857')
        ws['A4'].alignment = Alignment(horizontal='center', vertical='center')
        ws.merge_cells('A4:O4')
        ws['A5'] = f'({group_name})'; ws['A5'].font = Font(name='Arial', size=10, italic=True)
        ws['A5'].alignment = Alignment(horizontal='center', vertical='center')
        ws.merge_cells('A5:O5')

        headers_hd = [
            'STT', 'Ngày lập chứng từ', 'Số chứng từ (HĐ)', 'Đơn vị xuất hóa đơn',
            'Loại NL', 'Diễn giải', 'Số lượng (Lít)', 'Mã số thuế', 'Mẫu số HĐ',
            'Ký hiệu HĐ', 'Thành tiền trước VAT', 'Thuế VAT', 'Tổng cộng thanh toán',
            'Link tra cứu hóa đơn', 'Mã tra cứu'
        ]
        for c, h in enumerate(headers_hd, 1):
            cell = ws.cell(7, c, h)
            cell.fill = header_fill_green
            cell.font = Font(name='Arial', size=9, bold=True, color='FFFFFF')
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            cell.border = thin_border

        cur_row = 8
        stt = 1
        for inv in target_invoices:
            items = inv.get('items') or []
            if isinstance(items, str):
                import json
                try: items = json.loads(items)
                except: items = []
            
            is_xang = False
            qty = 0
            dien_giai = "Nhiên liệu chạy máy"
            for it in items:
                name = (it.get('ten') or it.get('name') or '').lower()
                q = float(it.get('sl') or it.get('quantity') or 0)
                qty += q
                if 'xăng' in name or 'xang' in name or 'ron' in name:
                    is_xang = True
                    dien_giai = "Xăng RON 95"
                elif 'dầu' in name or 'dau' in name or 'diesel' in name:
                    dien_giai = "Dầu Điêzen"

            sub = float(inv.get('sub_total') or 0)
            vat = float(inv.get('vat_amount') or 0)
            tot = float(inv.get('total_amount') or (sub + vat))

            ws.cell(cur_row, 1, f"L{stt}")
            ws.cell(cur_row, 2, inv.get('invoice_date') or '')
            ws.cell(cur_row, 3, inv.get('invoice_number') or '')
            ws.cell(cur_row, 4, inv.get('seller_name') or '')
            ws.cell(cur_row, 5, 'Xăng' if is_xang else 'Dầu')
            ws.cell(cur_row, 6, dien_giai)
            ws.cell(cur_row, 7, qty).number_format = '0.0'
            ws.cell(cur_row, 8, inv.get('seller_mst') or '')
            ws.cell(cur_row, 9, inv.get('mau_so') or '')
            ws.cell(cur_row, 10, inv.get('kh_hd') or '')
            ws.cell(cur_row, 11, sub).number_format = '#,##0'
            ws.cell(cur_row, 12, vat).number_format = '#,##0'
            ws.cell(cur_row, 13, tot).number_format = '#,##0'
            ws.cell(cur_row, 14, inv.get('invoice_url') or '')
            ws.cell(cur_row, 15, inv.get('ma_tra_cuu') or '')

            for c in range(1, 16):
                ws.cell(cur_row, c).font = Font(name='Arial', size=9)
                ws.cell(cur_row, c).border = thin_border
            stt += 1
            cur_row += 1

        end_inv = cur_row - 1
        ws.cell(cur_row, 1, 'TỔNG CỘNG TOÀN BỘ HÓA ĐƠN')
        ws.merge_cells(start_row=cur_row, start_column=1, end_row=cur_row, end_column=6)
        ws.cell(cur_row, 7, f'=SUM(G8:G{end_inv})').number_format = '0.0'
        ws.cell(cur_row, 11, f'=SUM(K8:K{end_inv})').number_format = '#,##0'
        ws.cell(cur_row, 12, f'=SUM(L8:L{end_inv})').number_format = '#,##0'
        ws.cell(cur_row, 13, f'=SUM(M8:M{end_inv})').number_format = '#,##0'
        for c in range(1, 16):
            ws.cell(cur_row, c).font = Font(name='Arial', size=10, bold=True, color='047857')
            ws.cell(cur_row, c).fill = sum_fill
            ws.cell(cur_row, c).border = double_bottom

        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 11)
        ws.column_dimensions['A'].width = 8
        ws.column_dimensions['D'].width = 38
        ws.column_dimensions['N'].width = 36
        ws.column_dimensions['O'].width = 24

    def add_map_sheet(sheet_name, group_logs, group_invoices, group_label):
        ws = wb.create_sheet(sheet_name)
        ws.views.sheetView[0].showGridLines = True

        ws['A1'] = f"BẢNG KÊ PHÂN BỔ HÓA ĐƠN XĂNG DẦU THEO TỪNG TRẠM CHẠY MÁY ({group_label.upper()})"
        ws['A1'].font = Font(name='Arial', size=12, bold=True, color='1E3A8A')
        ws['A2'] = f"Tháng {month:02d}/{year} • Phân tách độc lập bảng kê Dầu DO và Xăng RON 95 • Ưu tiên đáp ứng đủ 100% số tiền bảng kê, bảo lưu số lít/tiền dư"
        ws['A2'].font = Font(name='Arial', size=10, italic=True, color='4B5563')

        # Separate logs into Oil and Gas
        oil_site_costs = {}
        gas_site_costs = {}

        for l in group_logs:
            sid = l.get('site_id', '')
            st_info = sites.get(sid, {})
            sid_old = st_info.get('site_id_old', '')
            sname = st_info.get('site_name', '')
            sdist = st_info.get('district', '')
            ldate = l.get('date', '')
            rd = l.get('run_details') or {}
            hours = float(rd.get('thoi_gian_hoat_dong') or 0)
            lit = float(rd.get('nhien_lieu_tieu_hao') or 0)
            tt = float(rd.get('thanh_tien') or 0)
            nl = (rd.get('nhien_lieu_loai') or rd.get('nhien_lieu') or 'DẦU').upper()
            is_x = 'XĂNG' in nl or 'XANG' in nl

            target_dict = gas_site_costs if is_x else oil_site_costs
            if sid not in target_dict:
                target_dict[sid] = {
                    'site_id': sid, 'site_id_old': sid_old, 'site_name': sname, 'district': sdist,
                    'runs': 0, 'hours': 0.0, 'lit': 0.0, 'tt_truoc_vat': 0.0,
                    'earliest_date': ldate, 'latest_date': ldate
                }
            sc = target_dict[sid]
            sc['runs'] += 1
            sc['hours'] += hours
            sc['lit'] += lit
            sc['tt_truoc_vat'] += tt
            if ldate and ldate < sc['earliest_date']: sc['earliest_date'] = ldate
            if ldate and ldate > sc['latest_date']: sc['latest_date'] = ldate

        def is_xang_inv(inv):
            it = str(inv.get('items', '')).lower()
            return 'xăng' in it or 'ron' in it

        oil_invs = sorted([i for i in group_invoices if not is_xang_inv(i)], key=lambda x: (x.get('invoice_date', ''), x.get('invoice_number', '')))
        gas_invs = sorted([i for i in group_invoices if is_xang_inv(i)], key=lambda x: (x.get('invoice_date', ''), x.get('invoice_number', '')))

        def perform_waterfall(site_dict, inv_list):
            s_list = sorted(site_dict.values(), key=lambda x: (x['earliest_date'], x['site_id_old'] or x['site_id']))
            mapped = []
            inv_idx = 0
            inv_rem = float(inv_list[0].get('total_amount_with_vat') or inv_list[0].get('total_amount') or 0) if inv_list else 0

            for site in s_list:
                disp_site = site['site_id_old'] or site['site_id']
                site_rem = round(site['tt_truoc_vat'])
                is_first_chunk = True

                while site_rem > 0 and inv_idx < len(inv_list):
                    cur_inv = inv_list[inv_idx]
                    allocated = min(site_rem, inv_rem)

                    mapped.append({
                        'site_id': disp_site,
                        'site_total_before_vat': site['tt_truoc_vat'] if is_first_chunk else None,
                        'invoice_number': cur_inv.get('invoice_number', ''),
                        'invoice_date': cur_inv.get('invoice_date', ''),
                        'allocated_amount': allocated,
                        'seller_name': cur_inv.get('seller_name') or 'CÔNG TY TNHH MTV TM XĂNG DẦU NAM TRUNG PHONG',
                        'seller_mst': cur_inv.get('seller_mst') or '3600642702',
                        'kh_hd': cur_inv.get('kh_hd') or '1C26MTP',
                        'invoice_url': cur_inv.get('invoice_url') or '',
                        'ma_tra_cuu': cur_inv.get('ma_tra_cuu') or '',
                        'site_label': f"{site['site_name']} ({site['district']})"
                    })

                    is_first_chunk = False
                    site_rem -= allocated
                    inv_rem -= allocated

                    if inv_rem <= 0.01:
                        inv_idx += 1
                        if inv_idx < len(inv_list):
                            inv_rem = float(inv_list[inv_idx].get('total_amount_with_vat') or inv_list[inv_idx].get('total_amount') or 0)

            return mapped, inv_rem

        oil_mapped_rows, oil_surplus_amount = perform_waterfall(oil_site_costs, oil_invs)
        gas_mapped_rows, gas_surplus_amount = perform_waterfall(gas_site_costs, gas_invs)

        headers_map = [
            'ID trạm\n(Nhãn Hàng)',
            'Thành tiền chạy máy\ntheo trạm (đồng)',
            'Số hóa đơn',
            'Số tiền gán từ HĐ\n(đồng)',
            'Đơn vị bán hàng',
            'Mã số thuế\n(Bán)',
            'Ký hiệu HĐ',
            'Link tra cứu hóa đơn',
            'Mã tra cứu / Fkey',
            'Ngày HĐ',
            'Tên trạm / Địa bàn'
        ]

        fill_yellow = PatternFill(start_color='FFFF00', end_color='FFFF00', fill_type='solid')
        fill_sec_oil = PatternFill(start_color='E0F2FE', end_color='E0F2FE', fill_type='solid') # Sky 100
        fill_sec_gas = PatternFill(start_color='FEF3C7', end_color='FEF3C7', fill_type='solid') # Amber 100
        fill_subtot = PatternFill(start_color='F1F5F9', end_color='F1F5F9', fill_type='solid')

        font_sec_oil = Font(name='Arial', size=10, bold=True, color='0369A1')
        font_sec_gas = Font(name='Arial', size=10, bold=True, color='B45309')
        font_red_txt = Font(name='Arial', size=9, bold=True, color='DC2626')
        font_black_txt = Font(name='Arial', size=9)
        font_link_txt = Font(name='Arial', size=9, color='0284C7', underline='single')

        for col_idx, h in enumerate(headers_map, 1):
            cell = ws.cell(4, col_idx, h)
            cell.fill = fill_yellow
            cell.font = Font(name='Arial', size=9, bold=True, color='000000')
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            cell.border = thin_border
        ws.row_dimensions[4].height = 35

        cur = 5

        # Helper to render section
        def render_section(sec_title, sec_fill, sec_font, mapped_rows, fuel_label, total_hd_lit, total_hd_money, actual_lit, actual_money, surplus_amt):
            nonlocal cur
            # Section Header
            ws.merge_cells(start_row=cur, start_column=1, end_row=cur, end_column=len(headers_map))
            sec_cell = ws.cell(cur, 1, sec_title)
            sec_cell.fill = sec_fill
            sec_cell.font = sec_font
            sec_cell.alignment = Alignment(horizontal='left', vertical='center')
            for ci in range(1, len(headers_map) + 1):
                ws.cell(cur, ci).border = thin_border
            ws.row_dimensions[cur].height = 24
            cur += 1

            start_row = cur
            for r in mapped_rows:
                c1 = ws.cell(cur, 1, r['site_id'])
                c1.font = font_red_txt; c1.alignment = Alignment(horizontal='center')

                c2 = ws.cell(cur, 2, r['site_total_before_vat'])
                c2.font = font_red_txt; c2.number_format = '#,##0'
                c2.alignment = Alignment(horizontal='right')

                c3 = ws.cell(cur, 3, r['invoice_number'])
                c3.font = font_red_txt; c3.alignment = Alignment(horizontal='center')

                c4 = ws.cell(cur, 4, r['allocated_amount'])
                c4.font = font_black_txt; c4.number_format = '#,##0'
                c4.alignment = Alignment(horizontal='right')

                ws.cell(cur, 5, r['seller_name'])
                c6 = ws.cell(cur, 6, r['seller_mst']); c6.alignment = Alignment(horizontal='center')
                c7 = ws.cell(cur, 7, r['kh_hd']); c7.alignment = Alignment(horizontal='center')
                c8 = ws.cell(cur, 8, r['invoice_url']); c8.font = font_link_txt
                c9 = ws.cell(cur, 9, r['ma_tra_cuu']); c9.font = Font(name='Arial', size=9, bold=True); c9.alignment = Alignment(horizontal='center')
                c10 = ws.cell(cur, 10, r['invoice_date']); c10.alignment = Alignment(horizontal='center')
                ws.cell(cur, 11, r['site_label'])

                for ci in range(1, len(headers_map) + 1):
                    ws.cell(cur, ci).border = thin_border
                cur += 1

            end_row = cur - 1
            # Subtotal row
            ws.cell(cur, 1, f'TỔNG CỘNG {fuel_label.upper()}').font = Font(name='Arial', size=9, bold=True)
            ws.cell(cur, 2, f'=SUM(B{start_row}:B{end_row})').font = Font(name='Arial', size=9, bold=True)
            ws.cell(cur, 2).number_format = '#,##0'
            ws.cell(cur, 4, f'=SUM(D{start_row}:D{end_row})').font = Font(name='Arial', size=9, bold=True)
            ws.cell(cur, 4).number_format = '#,##0'
            for ci in range(1, len(headers_map) + 1):
                c_tot = ws.cell(cur, ci)
                c_tot.fill = fill_subtot
                c_tot.border = thin_border
            ws.row_dimensions[cur].height = 20
            cur += 1

            # Note row for reserves
            surplus_lit = total_hd_lit - actual_lit
            ws.merge_cells(start_row=cur, start_column=1, end_row=cur, end_column=len(headers_map))
            note_str = f"📌 Ghi chú bảo lưu {fuel_label}: Tổng HĐ mua {total_hd_lit:,.1f} L ({total_hd_money:,.0f} đ) — Tiêu hao chạy máy {actual_lit:,.1f} L ({actual_money:,.0f} đ) ➔ Số lít dư bảo lưu kho: +{surplus_lit:,.1f} L (Tiền HĐ còn dư bảo lưu: +{surplus_amt:,.0f} đ)"
            note_c = ws.cell(cur, 1, note_str)
            note_c.font = Font(name='Arial', size=8.5, italic=True, color='047857' if surplus_lit >= 0 else 'DC2626')
            note_c.alignment = Alignment(horizontal='left', vertical='center')
            for ci in range(1, len(headers_map) + 1):
                ws.cell(cur, ci).border = thin_border
            ws.row_dimensions[cur].height = 20
            cur += 1

        # Render Section 1: OIL
        total_oil_hd_lit = sum(sum(float(it.get('sl', 0)) for it in i.get('items', [])) for i in oil_invs)
        total_oil_hd_money = sum(float(i.get('total_amount_with_vat') or i.get('total_amount') or 0) for i in oil_invs)
        actual_oil_lit = sum(s['lit'] for s in oil_site_costs.values())
        actual_oil_money = sum(s['tt_truoc_vat'] for s in oil_site_costs.values())

        render_section(
            "I. BẢNG KÊ PHÂN BỔ NHIÊN LIỆU DẦU DO (DO 0.05S) — GÁN HÓA ĐƠN THEO TRẠM",
            fill_sec_oil, font_sec_oil, oil_mapped_rows, "Dầu DO",
            total_oil_hd_lit, total_oil_hd_money, actual_oil_lit, actual_oil_money, oil_surplus_amount
        )

        cur += 1 # Empty row between sections

        # Render Section 2: GAS
        total_gas_hd_lit = sum(sum(float(it.get('sl', 0)) for it in i.get('items', [])) for i in gas_invs)
        total_gas_hd_money = sum(float(i.get('total_amount_with_vat') or i.get('total_amount') or 0) for i in gas_invs)
        actual_gas_lit = sum(s['lit'] for s in gas_site_costs.values())
        actual_gas_money = sum(s['tt_truoc_vat'] for s in gas_site_costs.values())

        render_section(
            "II. BẢNG KÊ PHÂN BỔ NHIÊN LIỆU XĂNG RON 95 (RON 95-III) — GÁN HÓA ĐƠN THEO TRẠM",
            fill_sec_gas, font_sec_gas, gas_mapped_rows, "Xăng RON 95",
            total_gas_hd_lit, total_gas_hd_money, actual_gas_lit, actual_gas_money, gas_surplus_amount
        )

        # Grand Total Row
        cur += 1
        ws.cell(cur, 1, 'TỔNG CỘNG TOÀN BỘ (DẦU DO + XĂNG RON 95)').font = Font(name='Arial', size=10, bold=True, color='1E3A8A')
        ws.cell(cur, 2, actual_oil_money + actual_gas_money).font = Font(name='Arial', size=10, bold=True, color='DC2626')
        ws.cell(cur, 2).number_format = '#,##0'
        ws.cell(cur, 4, actual_oil_money + actual_gas_money).font = Font(name='Arial', size=10, bold=True, color='047857')
        ws.cell(cur, 4).number_format = '#,##0'
        for ci in range(1, len(headers_map) + 1):
            c_tot = ws.cell(cur, ci)
            c_tot.fill = sum_fill
            c_tot.border = double_bottom
        ws.row_dimensions[cur].height = 24

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

    def add_surplus_hd_sheet(sheet_name, surplus_invoices, group_label):
        if not surplus_invoices:
            return
        ws = wb.create_sheet(sheet_name)
        ws.views.sheetView[0].showGridLines = True

        ws['A1'] = f"DANH MỤC HÓA ĐƠN XĂNG DẦU DƯ THỪA / DỰ PHÒNG KHÔNG ĐƯA VÀO THANH TOÁN ({group_label.upper()})"
        ws['A1'].font = Font(name='Arial', size=12, bold=True, color='DC2626')
        ws['A2'] = f"Tháng {month:02d}/{year} • Tổng cộng {len(surplus_invoices)} hóa đơn được bảo lưu trong kho dữ liệu"
        ws['A2'].font = Font(name='Arial', size=10, italic=True, color='4B5563')

        headers = [
            'STT', 'Ngày Lập HĐ', 'Số Hóa Đơn', 'Bên Mua (Pháp Nhân / MST)', 'Loại Nhiên Liệu',
            'Số Lượng (Lít)', 'Đơn Giá (đ/L)', 'Thành Tiền Chưa Thuế (đ)', 'Thuế GTGT 8% (đ)',
            'Tổng Tiền Có Thuế (đ)', 'Tên Đơn Vị Bán Hàng', 'MST Người Bán', 'Ký Hiệu HĐ',
            'Mã Tra Cứu / Fkey', 'Link Tra Cứu Gốc', 'Ghi Chú Phân Loại'
        ]

        fill_red_hdr = PatternFill(start_color='991B1B', end_color='991B1B', fill_type='solid')
        font_white_bold = Font(name='Arial', size=9, bold=True, color='FFFFFF')

        for col_idx, h in enumerate(headers, 1):
            cell = ws.cell(4, col_idx, h)
            cell.fill = fill_red_hdr
            cell.font = font_white_bold
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            cell.border = thin_border
        ws.row_dimensions[4].height = 30

        cur = 5
        font_txt = Font(name='Arial', size=9)
        font_bold_txt = Font(name='Arial', size=9, bold=True)
        font_link_txt = Font(name='Arial', size=9, color='0284C7', underline='single')

        for idx, inv in enumerate(surplus_invoices, 1):
            items = inv.get('items') or []
            if isinstance(items, str):
                try: items = json.loads(items)
                except: items = []
            lit = sum(float(it.get('sl', 0)) for it in items) if isinstance(items, list) else 0
            dg = items[0].get('dg', 0) if isinstance(items, list) and items else 0
            tot = float(inv.get('total_amount', 0))
            sub = round(tot / 1.08)
            vat = tot - sub
            if not dg and lit:
                dg = round(tot / lit)
            is_x = 'xăng' in str(items).lower() or 'ron' in str(items).lower()
            bmst = inv.get('buyer_mst') or ''
            bname = 'MobiFone Đồng Nai' if ('0100686209-129' in bmst or 'ĐỒNG NAI' in (inv.get('buyer_name') or '').upper()) else 'MobiFone Toàn Cầu'

            ws.cell(cur, 1, idx).alignment = Alignment(horizontal='center')
            ws.cell(cur, 2, inv.get('invoice_date', '')).alignment = Alignment(horizontal='center')
            c3 = ws.cell(cur, 3, inv.get('invoice_number', '')); c3.font = font_bold_txt; c3.alignment = Alignment(horizontal='center')
            ws.cell(cur, 4, f"{bname} ({bmst})")
            ws.cell(cur, 5, 'Xăng RON 95' if is_x else 'Dầu DO 0.05S').alignment = Alignment(horizontal='center')
            ws.cell(cur, 6, lit).number_format = '0.0'
            ws.cell(cur, 7, dg).number_format = '#,##0'
            ws.cell(cur, 8, sub).number_format = '#,##0'
            ws.cell(cur, 9, vat).number_format = '#,##0'
            c10 = ws.cell(cur, 10, tot); c10.number_format = '#,##0'; c10.font = font_bold_txt
            ws.cell(cur, 11, inv.get('seller_name', ''))
            ws.cell(cur, 12, inv.get('seller_mst', '')).alignment = Alignment(horizontal='center')
            ws.cell(cur, 13, inv.get('kh_hd', '')).alignment = Alignment(horizontal='center')
            c14 = ws.cell(cur, 14, inv.get('ma_tra_cuu', '')); c14.font = font_bold_txt; c14.alignment = Alignment(horizontal='center')
            c15 = ws.cell(cur, 15, inv.get('invoice_url', '')); c15.font = font_link_txt
            ws.cell(cur, 16, 'Dư thừa định mức / Giảm trừ hạn mức ngày')

            for ci in range(1, len(headers) + 1):
                ws.cell(cur, ci).border = thin_border
            cur += 1

        # Total Row
        ws.cell(cur, 1, 'TỔNG CỘNG HÓA ĐƠN DƯ THỪA').font = font_bold_txt
        ws.merge_cells(start_row=cur, start_column=1, end_row=cur, end_column=5)
        ws.cell(cur, 6, f'=SUM(F5:F{cur-1})').number_format = '0.0'
        ws.cell(cur, 8, f'=SUM(H5:H{cur-1})').number_format = '#,##0'
        ws.cell(cur, 9, f'=SUM(I5:I{cur-1})').number_format = '#,##0'
        ws.cell(cur, 10, f'=SUM(J5:J{cur-1})').number_format = '#,##0'
        for ci in range(1, len(headers) + 1):
            c_tot = ws.cell(cur, ci)
            c_tot.fill = sum_fill
            c_tot.border = double_bottom

        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 11), 45)
        ws.column_dimensions['A'].width = 8
        ws.column_dimensions['D'].width = 30
        ws.column_dimensions['K'].width = 38
        ws.column_dimensions['O'].width = 35
        ws.column_dimensions['P'].width = 32

    if month >= 8 and year >= 2026:
        # Split 2 Groups -> 6 Sheets Full Profile
        # In Month 8/2026: User requested: "tháng 8 ko gửi bảng kê seath nữa nha, vì đã chốt rồi, trả về thanh toán nội bộ"
        # All Month 8 runs belong to internal payment:
        # Group 1 (67 special sites MobiFone Dong Nai): includes original 67 sites (including DNTP11)
        # Group 2 (MobiFone Toan Cau - MBG): keeps all remaining sites intact
        # From Month 9/2026 onwards: exclude Seath Group normally
        if month == 8 and year == 2026:
            g1_logs = [l for l in logs if is_original_group_1(l.get('site_id'), sites.get(l.get('site_id'), {}).get('site_id_old'))]
            g2_logs = [l for l in logs if not is_original_group_1(l.get('site_id'), sites.get(l.get('site_id'), {}).get('site_id_old'))]
        else:
            g1_logs = [l for l in logs if is_group_1(l.get('site_id'), sites.get(l.get('site_id'), {}).get('site_id_old'))]
            g2_logs = [l for l in logs if not is_group_1(l.get('site_id'), sites.get(l.get('site_id'), {}).get('site_id_old')) and not is_seath_group_site(l.get('site_id'), sites.get(l.get('site_id'), {}).get('site_id_old'))]

        g1_invs = [i for i in invoices if '0100686209-129' in (i.get('buyer_mst') or i.get('buyer_tax_code') or '') or 'ĐỒNG NAI' in (i.get('buyer_name') or i.get('buyer_legal_name') or '').upper() or 'DONG NAI' in (i.get('buyer_name') or i.get('buyer_legal_name') or '').upper() or 'KHU VỰC 8' in (i.get('buyer_name') or i.get('buyer_legal_name') or '').upper()]
        g2_invs = [i for i in invoices if i not in g1_invs]

        if month == 8 and year == 2026:
            # Optimized Active Invoices for Group 1 (27 Invoices: 18 Oil + 9 Gas)
            # Guarantees: Dau L >= 1338.1L (+0.4L), Xang L >= 345.4L (+0.00L - EXACT MATCH 100.00%), Day <= 5.0M
            g1_active_nums = {
                # 18 Oil Invoices (1,338.5 L • 38.05M)
                '190312', '191122', '191123', '191394', '581998', '585859', '596943', '606852',
                '609292', '611529', '613760', '621240', '621846', '625217', '627024', '627559',
                '628521', '629836',
                # 9 Gas Invoices (345.40 L exactly • 7.75M)
                '586305', '586863', '593172', '596812', '603565', '606877', '614396', '623217',
                '626295'
            }
            g1_active_invs = [i for i in g1_invs if str(i.get('invoice_number')) in g1_active_nums]
            g1_surplus_invs = [i for i in g1_invs if str(i.get('invoice_number')) not in g1_active_nums]

            # Optimized Active Invoices for Group 2 (76 Invoices: 40 Oil + 36 Gas)
            g2_active_nums = {
                '00411655', '00411662', '00427072', '00439851', '00439924', '169269', '171080',
                '171081', '172320', '172321', '173719', '173725', '175241', '175338', '176299',
                '176300', '176432', '177950', '182342', '182736', '183734', '185597', '186044',
                '187319', '187330', '187645', '188674', '188759', '553057', '553085', '556866',
                '556990', '556991', '558060', '560899', '560956', '561638', '563337', '565739',
                '567766', '570470', '570828', '571663', '573398', '575231', '576729', '577949',
                '579524', '580455', '582060', '583408', '584919', '586304', '586919', '589157',
                '590940', '590941', '590942', '592438', '595435', '596806', '597763', '597876',
                '598581', '599491', '600815', '601319', '602040', '602938', '602940', '604349',
                '606978', '607487', '607841', '608028', '611527'
            }
            g2_active_invs = [i for i in g2_invs if str(i.get('invoice_number')) in g2_active_nums]
            g2_surplus_invs = [i for i in g2_invs if str(i.get('invoice_number')) not in g2_active_nums]
        elif month == 9 and year == 2026:
            # Optimized Active Invoices for Month 9/2026:
            # 1. Fetch late August rollover diesel invoices from warehouse reserve to guarantee "chủ yếu ko để thiếu":
            #    - G1 Rollover: '630818', '629143', '626737' (215.07 L • 6.33M) -> covers G1 deficit of 202.46 L
            #    - G2 Rollover: '629141', '191836', '625216', '624714' (270.34 L • 7.95M) -> covers G2 deficit of 233.27 L
            g1_roll_nums = {'630818', '629143', '626737'}
            g2_roll_nums = {'629141', '191836', '625216', '624714'}
            all_roll_nums = list(g1_roll_nums | g2_roll_nums)
            
            roll_res = supabase.from_("parsed_invoices").select("*").in_("invoice_number", all_roll_nums).execute()
            roll_invs = roll_res.data or []
            
            # Combine all candidate invoices (T9 + Rollover) and deduplicate
            candidate_invs = []
            seen_inv_keys = set()
            for inv in invoices + roll_invs:
                num = str(inv.get('invoice_number', ''))
                dt = str(inv.get('invoice_date', ''))
                tot = float(inv.get('total_amount') or 0)
                key = (num, dt)
                if key in seen_inv_keys and tot <= 0:
                    continue
                if key not in seen_inv_keys:
                    seen_inv_keys.add(key)
                    candidate_invs.append(inv)
                    
            cand_g1 = [i for i in candidate_invs if '0100686209-129' in (i.get('buyer_mst') or i.get('buyer_tax_code') or '') or 'ĐỒNG NAI' in (i.get('buyer_name') or i.get('buyer_legal_name') or '').upper() or 'DONG NAI' in (i.get('buyer_name') or i.get('buyer_legal_name') or '').upper() or 'KHU VỰC 8' in (i.get('buyer_name') or i.get('buyer_legal_name') or '').upper()]
            cand_g2 = [i for i in candidate_invs if i not in cand_g1]

            def is_xang_inv_fn(i):
                items = i.get('items') or []
                if isinstance(items, str):
                    try: items = json.loads(items)
                    except: items = []
                return 'xăng' in str(items).lower() or 'ron' in str(items).lower()

            def get_inv_lit(i):
                items = i.get('items') or []
                if isinstance(items, str):
                    try: items = json.loads(items)
                    except: items = []
                return sum(float(it.get('sl', 0)) for it in items) if isinstance(items, list) else 0

            # Dynamic fuel demand calculation from actual logs:
            def is_xang_log(log):
                rd = log.get('run_details') or {}
                st = sites.get(log.get('site_id'), {})
                nl = (rd.get('nhien_lieu_loai') or rd.get('nhien_lieu') or st.get('nhien_lieu') or '').lower()
                lm = (rd.get('loai_may') or st.get('loai_may') or '').lower()
                return 'xăng' in nl or 'xang' in nl or 'honda' in lm or 'elemax' in lm or 'kyo' in lm or 'mlđ' in lm or 'mld' in lm or ('kibii' in lm and ('mlđ' in lm or 'lưu động' in lm or 'xăng' in nl))

            # G1 demand:
            g1_oil_need_l = sum(float((l.get('run_details') or {}).get('nhien_lieu_tieu_hao') or 0) for l in g1_logs if not is_xang_log(l))
            g1_oil_need_m = sum(float((l.get('run_details') or {}).get('thanh_tien') or 0) for l in g1_logs if not is_xang_log(l))
            g1_gas_need_l = sum(float((l.get('run_details') or {}).get('nhien_lieu_tieu_hao') or 0) for l in g1_logs if is_xang_log(l))
            g1_gas_need_m = sum(float((l.get('run_details') or {}).get('thanh_tien') or 0) for l in g1_logs if is_xang_log(l))

            g1_oil_all = sorted([i for i in cand_g1 if not is_xang_inv_fn(i) and float(i.get('total_amount') or 0) > 0], key=lambda x: (x.get('invoice_date', ''), x.get('invoice_number', '')))
            g1_gas_all = sorted([i for i in cand_g1 if is_xang_inv_fn(i) and float(i.get('total_amount') or 0) > 0], key=lambda x: (x.get('invoice_date', ''), x.get('invoice_number', '')))

            # G1 Oil selection: pick just enough to cover 100% need (1,014.58 L / 29,529,792 đ)
            g1_oil_sel = []
            g1_oil_surplus = []
            cur_l_g1_oil = 0.0; cur_m_g1_oil = 0.0
            for i in g1_oil_all:
                l_val = get_inv_lit(i)
                m_val = float(i.get('total_amount') or 0)
                if cur_l_g1_oil < g1_oil_need_l or cur_m_g1_oil < g1_oil_need_m:
                    g1_oil_sel.append(i)
                    cur_l_g1_oil += l_val
                    cur_m_g1_oil += m_val
                else:
                    g1_oil_surplus.append(i)

            # G1 Gas selection: pick just enough to cover 100% need (61.71 L / 1,900,719 đ)
            g1_gas_sel = []
            g1_gas_surplus = []
            cur_l_g1_gas = 0.0; cur_m_g1_gas = 0.0
            for i in g1_gas_all:
                l_val = get_inv_lit(i)
                m_val = float(i.get('total_amount') or 0)
                if cur_l_g1_gas < g1_gas_need_l or cur_m_g1_gas < g1_gas_need_m:
                    g1_gas_sel.append(i)
                    cur_l_g1_gas += l_val
                    cur_m_g1_gas += m_val
                else:
                    g1_gas_surplus.append(i)

            g1_active_invs = g1_oil_sel + g1_gas_sel
            g1_surplus_invs = g1_oil_surplus + g1_gas_surplus + [i for i in cand_g1 if float(i.get('total_amount') or 0) <= 0]

            # G2 demand:
            g2_oil_need_l = sum(float((l.get('run_details') or {}).get('nhien_lieu_tieu_hao') or 0) for l in g2_logs if not is_xang_log(l))
            g2_oil_need_m = sum(float((l.get('run_details') or {}).get('thanh_tien') or 0) for l in g2_logs if not is_xang_log(l))
            g2_gas_need_l = sum(float((l.get('run_details') or {}).get('nhien_lieu_tieu_hao') or 0) for l in g2_logs if is_xang_log(l))
            g2_gas_need_m = sum(float((l.get('run_details') or {}).get('thanh_tien') or 0) for l in g2_logs if is_xang_log(l))

            g2_oil_all = sorted([i for i in cand_g2 if not is_xang_inv_fn(i) and float(i.get('total_amount') or 0) > 0], key=lambda x: (x.get('invoice_date', ''), x.get('invoice_number', '')))
            g2_gas_all = sorted([i for i in cand_g2 if is_xang_inv_fn(i) and float(i.get('total_amount') or 0) > 0], key=lambda x: (x.get('invoice_date', ''), x.get('invoice_number', '')))

            # G2 Oil selection: pick just enough (need 1,788.70 L / 51,609,155 đ)
            g2_oil_sel = []
            g2_oil_surplus = []
            cur_l_g2_oil = 0.0; cur_m_g2_oil = 0.0
            for i in g2_oil_all:
                l_val = get_inv_lit(i)
                m_val = float(i.get('total_amount') or 0)
                if cur_l_g2_oil < g2_oil_need_l or cur_m_g2_oil < g2_oil_need_m:
                    g2_oil_sel.append(i)
                    cur_l_g2_oil += l_val
                    cur_m_g2_oil += m_val
                else:
                    g2_oil_surplus.append(i)

            # G2 Gas selection: pick just enough (need 881.84 L / 25,302,473 đ)
            g2_gas_sel = []
            g2_gas_surplus = []
            cur_l_g2_gas = 0.0; cur_m_g2_gas = 0.0
            for i in g2_gas_all:
                l_val = get_inv_lit(i)
                m_val = float(i.get('total_amount') or 0)
                if cur_l_g2_gas < g2_gas_need_l or cur_m_g2_gas < g2_gas_need_m:
                    g2_gas_sel.append(i)
                    cur_l_g2_gas += l_val
                    cur_m_g2_gas += m_val
                else:
                    g2_gas_surplus.append(i)

            g2_active_invs = g2_oil_sel + g2_gas_sel
            g2_surplus_invs = g2_oil_surplus + g2_gas_surplus + [i for i in cand_g2 if float(i.get('total_amount') or 0) <= 0]
        else:
            # Default for other months: All valid invoices with amount > 0 belong to their respective groups
            g1_active_invs = [i for i in g1_invs if float(i.get('total_amount') or 0) > 0]
            g2_active_invs = [i for i in g2_invs if float(i.get('total_amount') or 0) > 0]
            g1_surplus_invs = [i for i in g1_invs if float(i.get('total_amount') or 0) <= 0]
            g2_surplus_invs = [i for i in g2_invs if float(i.get('total_amount') or 0) <= 0]

        # Combine all surplus invoices (0-amount or extra)
        surplus_invs = g1_surplus_invs + g2_surplus_invs
        surplus_invs.sort(key=lambda x: (x.get('invoice_date', ''), x.get('invoice_number', '')))

        # Sheet 1: 02A Nhóm 1
        add_02a_sheet('02A_TTNB_DongNai_67Tram', g1_logs, 'MobiFone Đồng Nai - 67 Trạm Đặc Thù')
        # Sheet 2: HD Nhóm 1
        add_hd_sheet('HD_DongNai_67Tram', g1_active_invs, 'MobiFone Đồng Nai - 67 Trạm Đặc Thù')
        # Sheet 3: Map Hóa Đơn Theo Trạm Nhóm 1 (Chuẩn Mẫu)
        add_map_sheet('Map_HD_Theo_Tram_Nhom1', g1_logs, g1_active_invs, 'MobiFone Đồng Nai - 67 Trạm Đặc Thù')
        # Sheet 4: 02A Nhóm 2
        add_02a_sheet('02A_TTNB_ToanCau', g2_logs, 'MobiFone Toàn Cầu')
        # Sheet 5: HD Nhóm 2
        add_hd_sheet('HD_ToanCau', g2_active_invs, 'MobiFone Toàn Cầu')
        # Sheet 6: Map Hóa Đơn Theo Trạm Nhóm 2 (Chuẩn Mẫu)
        add_map_sheet('Map_HD_Theo_Tram_Nhom2', g2_logs, g2_active_invs, 'MobiFone Toàn Cầu')
        # Sheet 7: Hóa đơn Dư Thừa Bảo Lưu Kho
        if surplus_invs:
            add_surplus_hd_sheet('HD_Du_Thua_Khong_Su_Dung', surplus_invs, 'Hóa Đơn Dư Thừa Bảo Lưu Kho')
    else:
        add_02a_sheet('02A-TTNB_NLMPD', logs, 'Toàn bộ trạm Đài Viễn thông Đồng Nai')
        add_hd_sheet('HD', invoices, 'Toàn bộ hóa đơn nhiên liệu')

    # Strict compliance: Enforce 100% Times New Roman across ALL sheets and cells (including merged ranges)
    for sheet in wb.worksheets:
        for r in range(1, sheet.max_row + 1):
            for c in range(1, sheet.max_column + 1):
                cell = sheet.cell(row=r, column=c)
                old_f = cell.font
                cell.font = Font(
                    name='Times New Roman',
                    size=old_f.size if old_f and old_f.size else 10,
                    bold=old_f.bold if old_f and old_f.bold else False,
                    italic=old_f.italic if old_f and old_f.italic else False,
                    color=old_f.color if old_f and old_f.color else None,
                    underline=old_f.underline if old_f and old_f.underline else None
                )

    if not output_path:
        output_path = f"/Users/cang_it/Desktop/Ho_So_Thanh_Toan_Chuan_Mau_{month:02d}_{year}.xlsx"

    wb.save(output_path)
    enforce_times_in_xlsx(output_path)
    print(f"✅ Đã xuất thành công hồ sơ chuẩn mẫu ra: {output_path}")
    return output_path

def enforce_times_in_xlsx(file_path):
    """Ensure 100% Times New Roman in styles.xml (purging default Calibri/Arial)"""
    import zipfile, io
    with open(file_path, "rb") as f:
        in_buf = io.BytesIO(f.read())
    
    out_buf = io.BytesIO()
    with zipfile.ZipFile(in_buf, "r") as zin:
        with zipfile.ZipFile(out_buf, "w", zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                content = zin.read(item.filename)
                if item.filename == "xl/styles.xml":
                    text = content.decode("utf-8")
                    text = text.replace('val="Calibri"', 'val="Times New Roman"')
                    text = text.replace('val="Arial"', 'val="Times New Roman"')
                    text = text.replace('val="Aptos"', 'val="Times New Roman"')
                    content = text.encode("utf-8")
                zout.writestr(item, content)
    
    with open(file_path, "wb") as f:
        f.write(out_buf.getvalue())

def create_seath_group_statement(month=8, year=2026, output_path=None):
    """
    Xuất Bảng kê chạy máy phát điện trạm thuê XHH cho Đối tác Seath Group tiếp nhận xử lý.
    Tuân thủ thể thức Nghị định 30/2020/NĐ-CP, toàn bộ font chữ Times New Roman.
    """
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year+1}-01-01"
    else:
        end_date = f"{year}-{month+1:02d}-01"
        
    print(f"Fetching Seath Group logs from {start_date} to {end_date}...")
    logs_res = supabase.from_("generator_logs").select("*").gte("date", start_date).lt("date", end_date).execute()
    all_logs = logs_res.data or []
    
    sites_res = supabase.from_("datasites").select("*").execute()
    sites = {s.get("site_id"): s for s in (sites_res.data or [])}

    if month == 8 and year == 2026:
        # User requested: "tháng 8 ko gửi bảng kê seath nữa nha, vì đã chốt rồi, trả về thanh toán nội bộ"
        print("⚠️ Tháng 8/2026 đã chốt hồ sơ và trả về thanh toán nội bộ, không xuất Bảng kê Seath Group.")
        for p in [
            "/Users/cang_it/Desktop/Bang_Ke_Chay_May_Phat_Dien_Seath_Group_T08_2026.xlsx",
            "/Users/cang_it/Desktop/Bang_Ke_Chay_May_Phat_Dien_Seath_Group_08_2026.xlsx"
        ]:
            if os.path.exists(p):
                try:
                    os.remove(p)
                    print(f"🗑️ Đã xóa file cũ không sử dụng: {p}")
                except Exception:
                    pass
        return None

    seath_logs = [l for l in all_logs if is_seath_group_site(l.get('site_id'), sites.get(l.get('site_id'), {}).get('site_id_old'))]
    seath_logs.sort(key=lambda x: (x.get('date') or '', x.get('site_id') or ''))

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Seath_Group"
    ws.views.sheetView[0].showGridLines = True

    # Styling Tokens (Times New Roman Font)
    font_header_agency = Font(name='Times New Roman', size=10, bold=True)
    font_sub_agency = Font(name='Times New Roman', size=10)
    font_title = Font(name='Times New Roman', size=15, bold=True, color='1E3A8A')
    font_subtitle = Font(name='Times New Roman', size=11, italic=True)
    font_th = Font(name='Times New Roman', size=10, bold=True, color='FFFFFF')
    font_data = Font(name='Times New Roman', size=10)
    font_data_bold = Font(name='Times New Roman', size=10, bold=True)
    font_total = Font(name='Times New Roman', size=10, bold=True)
    font_sig_title = Font(name='Times New Roman', size=10, bold=True)
    font_sig_sub = Font(name='Times New Roman', size=9, italic=True)

    header_fill = PatternFill(start_color='1F497D', end_color='1F497D', fill_type='solid')
    total_fill = PatternFill(start_color='F2F2F2', end_color='F2F2F2', fill_type='solid')

    border_thin = Border(
        top=Side(style='thin', color='D0D7DE'),
        left=Side(style='thin', color='D0D7DE'),
        bottom=Side(style='thin', color='D0D7DE'),
        right=Side(style='thin', color='D0D7DE')
    )

    # Agency Header
    ws['A1'] = 'TCT VIỄN THÔNG MOBIFONE'
    ws['A1'].font = font_header_agency
    ws['A1'].alignment = Alignment(horizontal='center', vertical='center')
    ws.merge_cells('A1:E1')

    ws['A2'] = 'CÔNG TY DỊCH VỤ MOBIFONE KHU VỰC 8'
    ws['A2'].font = font_header_agency
    ws['A2'].alignment = Alignment(horizontal='center', vertical='center')
    ws.merge_cells('A2:E2')

    ws['A3'] = 'TỔ VIỄN THÔNG 3 - ĐỒNG NAI'
    ws['A3'].font = font_sub_agency
    ws['A3'].alignment = Alignment(horizontal='center', vertical='center')
    ws.merge_cells('A3:E3')

    ws['G1'] = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'
    ws['G1'].font = font_header_agency
    ws['G1'].alignment = Alignment(horizontal='center', vertical='center')
    ws.merge_cells('G1:L1')

    ws['G2'] = 'Độc lập - Tự do - Hạnh phúc'
    ws['G2'].font = font_header_agency
    ws['G2'].alignment = Alignment(horizontal='center', vertical='center')
    ws.merge_cells('G2:L2')

    # Main Title
    ws['A5'] = 'BẢNG KÊ CHẠY MÁY PHÁT ĐIỆN SEATH GROUP'
    ws['A5'].font = font_title
    ws['A5'].alignment = Alignment(horizontal='center', vertical='center')
    ws.merge_cells('A5:L5')

    ws['A6'] = f'(Tháng {month:02d} năm {year} - Đối tác Seath Group tiếp nhận xử lý thanh toán)'
    ws['A6'].font = font_subtitle
    ws['A6'].alignment = Alignment(horizontal='center', vertical='center')
    ws.merge_cells('A6:L6')

    # Table Headers
    headers = [
        ('STT', 6),
        ('Mã Trạm (Mới)', 15),
        ('Mã Trạm (Cũ)', 14),
        ('Tên Trạm / Địa Bàn', 24),
        ('Ngày Chạy', 13),
        ('Bắt Đầu', 10),
        ('Kết Thúc', 10),
        ('Thời Gian Chạy (h)', 18),
        ('Định Mức (L/h)', 14),
        ('Nhiên Liệu (Lít)', 18),
        ('Lý Do Chạy Máy', 26),
        ('Người Vận Hành / Ghi Chú', 24)
    ]

    for col_idx, (h_title, col_width) in enumerate(headers, 1):
        cell = ws.cell(row=8, column=col_idx, value=h_title)
        cell.font = font_th
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        cell.border = border_thin
        col_letter = get_column_letter(col_idx)
        ws.column_dimensions[col_letter].width = col_width

    ws.row_dimensions[8].height = 28

    cur_row = 9
    tot_hours = 0.0
    tot_liters = 0.0

    for idx, log in enumerate(seath_logs, 1):
        st = sites.get(log.get('site_id')) or {}
        rd = log.get('run_details') or {}
        duration = float(rd.get('thoi_gian_hoat_dong') or 0.0)
        dinh_muc = float(rd.get('dinh_muc') or st.get('dinh_muc') or 2.3)
        fuel = float(rd.get('nhien_lieu_tieu_hao') or (duration * dinh_muc))
        
        tot_hours += duration
        tot_liters += fuel

        dt_display = log.get('date', '')
        if dt_display and '-' in dt_display:
            dt_display = '/'.join(dt_display.split('-')[::-1])

        row_vals = [
            idx,
            log.get('site_id', ''),
            st.get('site_id_old', ''),
            st.get('site_name') or st.get('name') or log.get('site_id', ''),
            dt_display,
            rd.get('gio_bat_dau') or rd.get('bat_dau') or '',
            rd.get('gio_ket_thuc') or rd.get('ket_thuc') or '',
            duration,
            dinh_muc,
            fuel,
            rd.get('ly_do') or rd.get('ghi_chu') or 'Sự cố mất điện',
            rd.get('nguoi_chay') or rd.get('operator') or ''
        ]

        for col_idx, val in enumerate(row_vals, 1):
            cell = ws.cell(row=cur_row, column=col_idx, value=val)
            cell.font = font_data_bold if col_idx in [2, 10] else font_data
            cell.border = border_thin
            
            if col_idx in [1, 2, 3, 5, 6, 7]:
                cell.alignment = Alignment(horizontal='center', vertical='center')
            elif col_idx in [8, 9, 10]:
                cell.alignment = Alignment(horizontal='right', vertical='center')
                cell.number_format = '#,##0.00'
            else:
                cell.alignment = Alignment(horizontal='left', vertical='center')

        cur_row += 1

    # Total Row
    ws.merge_cells(f'A{cur_row}:G{cur_row}')
    tot_label = ws.cell(row=cur_row, column=1, value='TỔNG CỘNG')
    tot_label.font = font_total
    tot_label.alignment = Alignment(horizontal='center', vertical='center')

    h_cell = ws.cell(row=cur_row, column=8, value=round(tot_hours, 2))
    h_cell.font = font_total
    h_cell.alignment = Alignment(horizontal='right', vertical='center')
    h_cell.number_format = '#,##0.00'

    ws.cell(row=cur_row, column=9, value='')

    f_cell = ws.cell(row=cur_row, column=10, value=round(tot_liters, 2))
    f_cell.font = Font(name='Times New Roman', size=10, bold=True, color='B45309')
    f_cell.alignment = Alignment(horizontal='right', vertical='center')
    f_cell.number_format = '#,##0.00'

    for col_idx in range(1, 13):
        c = ws.cell(row=cur_row, column=col_idx)
        c.border = border_thin
        c.fill = total_fill

    cur_row += 2

    # Date line
    ws.merge_cells(f'I{cur_row}:L{cur_row}')
    dt_cell = ws.cell(row=cur_row, column=9, value=f'Đồng Nai, ngày      tháng      năm {year}')
    dt_cell.font = font_sig_sub
    dt_cell.alignment = Alignment(horizontal='center', vertical='center')
    cur_row += 1

    # Signatures
    sig_titles = [
        (1, 4, 'NGƯỜI LẬP BẢNG KÊ'),
        (5, 8, 'TỔ TRƯỞNG TỔ VIỄN THÔNG 3'),
        (9, 12, 'ĐẠI DIỆN ĐỐI TÁC SEATH GROUP')
    ]

    for start_c, end_c, title in sig_titles:
        ws.merge_cells(start_row=cur_row, start_column=start_c, end_row=cur_row, end_column=end_c)
        c = ws.cell(row=cur_row, column=start_c, value=title)
        c.font = font_sig_title
        c.alignment = Alignment(horizontal='center', vertical='center')

    cur_row += 1
    for start_c, end_c, _ in sig_titles:
        ws.merge_cells(start_row=cur_row, start_column=start_c, end_row=cur_row, end_column=end_c)
        c = ws.cell(row=cur_row, column=start_c, value='(Ký, ghi rõ họ tên)')
        c.font = font_sig_sub
        c.alignment = Alignment(horizontal='center', vertical='center')

    # Strict compliance: Enforce 100% Times New Roman font across EVERY cell in worksheet
    for row in ws.iter_rows():
        for cell in row:
            old_f = cell.font
            cell.font = Font(
                name='Times New Roman',
                size=old_f.size if old_f and old_f.size else 10,
                bold=old_f.bold if old_f and old_f.bold else False,
                italic=old_f.italic if old_f and old_f.italic else False,
                color=old_f.color if old_f and old_f.color else None,
                underline=old_f.underline if old_f and old_f.underline else None
            )

    if not output_path:
        output_path = f"/Users/cang_it/Desktop/Bang_Ke_Chay_May_Phat_Dien_Seath_Group_T{month:02d}_{year}.xlsx"

    wb.save(output_path)
    enforce_times_in_xlsx(output_path)
    print(f"✅ Đã xuất thành công Bảng kê Seath Group ra: {output_path}")
    return output_path

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--month', type=int, default=8, help='Tháng đối soát (1-12)')
    parser.add_argument('--year', type=int, default=2026, help='Năm đối soát')
    parser.add_argument('--group', type=str, default='all', choices=['all', 'group1', 'group2', 'seath'], help='Nhóm hồ sơ cần xuất')
    parser.add_argument('--out', type=str, default='', help='Đường dẫn file đầu ra')
    args = parser.parse_args()

    out_file = args.out if args.out else None
    if args.group == 'seath':
        create_seath_group_statement(month=args.month, year=args.year, output_path=out_file)
    else:
        create_styled_workbook(month=args.month, year=args.year, output_path=out_file)
