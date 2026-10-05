import os
import requests
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def build_report():
    print("🚀 Đang xây dựng Báo cáo Excel Rà soát Dự án CSHT TVT3...")

    # 1. Đọc Supabase
    env = {}
    with open('tvt3_v2/.env') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k.strip()] = v.strip().strip('"').strip("'")

    url = env.get('VITE_SUPABASE_URL')
    key = env.get('VITE_SUPABASE_ANON_KEY')
    headers = {'apikey': key, 'Authorization': f'Bearer {key}'}

    res = requests.get(f'{url}/rest/v1/infrastructure_projects?select=*&limit=1000', headers=headers)
    sb_projects = {p['planning_id_new']: p for p in res.json()}

    # 2. Đọc file Excel Kế hoạch tỉnh
    xl_path = '/Users/cang_it/Desktop/DATA_PTM 210 (1).xlsx'
    wb_source = openpyxl.load_workbook(xl_path, data_only=True)
    ws_source = wb_source['Chi tiết']
    headers_src = [c for c in next(ws_source.iter_rows(min_row=2, max_row=2, values_only=True))]

    rows_tvt3 = []
    for row in ws_source.iter_rows(min_row=3, values_only=True):
        if not any(row): continue
        d = dict(zip(headers_src, row))
        if str(d.get('TVT')).strip() == 'TVT3':
            rows_tvt3.append(d)

    print(f"📦 Đọc được {len(rows_tvt3)} trạm TVT3 từ file quy hoạch tỉnh.")

    # 3. Tạo Workbook mới
    wb = openpyxl.Workbook()
    # Xóa sheet mặc định
    wb.remove(wb.active)

    # Styles
    header_fill_blue = PatternFill(start_color="1E40AF", end_color="1E40AF", fill_type="solid")
    header_fill_green = PatternFill(start_color="065F46", end_color="065F46", fill_type="solid")
    header_fill_amber = PatternFill(start_color="92400E", end_color="92400E", fill_type="solid")
    header_fill_purple = PatternFill(start_color="5B21B6", end_color="5B21B6", fill_type="solid")

    font_header = Font(name="Arial", size=10, bold=True, color="FFFFFF")
    font_title = Font(name="Arial", size=13, bold=True, color="1E3A8A")
    font_bold = Font(name="Arial", size=10, bold=True)
    font_normal = Font(name="Arial", size=10)
    font_italic = Font(name="Arial", size=9, italic=True, color="475569")

    thin_border = Border(
        left=Side(style='thin', color='D1D5DB'),
        right=Side(style='thin', color='D1D5DB'),
        top=Side(style='thin', color='D1D5DB'),
        bottom=Side(style='thin', color='D1D5DB')
    )

    align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
    align_right = Alignment(horizontal="right", vertical="center")

    desktop_8_sites = ['26DNa165', '26DNa167', '26DNa163', '26DNa158', '26DNa255', '26DNa185', '26DNa181', '26DNa129']

    # ==========================================
    # SHEET 1: CÁC GÓI MBF TỰ ĐẦU TƯ (GÓI 2, 3, 4)
    # ==========================================
    ws1 = wb.create_sheet(title="4_Goi_MBF_Dau_Tu")
    ws1.views.sheetView[0].showGridLines = True

    ws1.merge_cells("A1:O1")
    ws1["A1"] = "DANH SÁCH 21 TRẠM THUỘC CÁC GÓI MOBIFONE TỰ ĐẦU TƯ XÂY MỚI (TVT3 - 2026)"
    ws1["A1"].font = font_title
    ws1["A1"].alignment = align_center

    ws1.merge_cells("A2:O2")
    ws1["A2"] = "Đối soát dữ liệu quy hoạch, tình trạng khảo sát thực địa & Điều kiện xuất hồ sơ ký hợp đồng mặt bằng"
    ws1["A2"].font = font_italic
    ws1["A2"].alignment = align_center

    headers_1 = [
        "STT", "Gói", "Mã QH Mới", "Mã QH Cũ", "Huyện", "Xã / Phường", 
        "Tọa độ KS (Vĩ độ)", "Tọa độ KS (Kinh độ)", "Điều Kiện Trình HĐ", 
        "Họ Tên Chủ Đất", "SĐT", "Số CCCD", "Số Thửa", "Tờ Bản Đồ", "Giá Thuê (đ/tháng)"
    ]
    ws1.append([])
    ws1.append(headers_1)
    header_row_1 = 4
    for col_idx in range(1, len(headers_1) + 1):
        cell = ws1.cell(row=header_row_1, column=col_idx)
        cell.fill = header_fill_blue
        cell.font = font_header
        cell.alignment = align_center

    # Danh sách chuẩn hóa Gói 4 gồm 8 trạm dự kiến trình hợp đồng (STT 21 -> 28)
    goi_4_ordered = [
        (21, '26DNa165'), (22, '26DNa167'), (23, '26DNa163'), (24, '26DNa158'),
        (25, '26DNa255'), (26, '26DNa185'), (27, '26DNa181'), (28, '26DNa129')
    ]
    goi_4_codes = [c[1] for c in goi_4_ordered]

    # Thu thập tất cả các trạm thuộc Gói 2, Gói 3 và Gói 4
    four_pkgs_list = []
    
    # Gói 2
    for sid, p in sb_projects.items():
        if p.get('deployment_package') == 'Gói 2':
            four_pkgs_list.append(('Gói 2', sid, p))
            
    # Gói 3
    for sid, p in sb_projects.items():
        if p.get('deployment_package') == 'Gói 3':
            four_pkgs_list.append(('Gói 3', sid, p))
            
    # Gói 4 theo đúng thứ tự 21-28
    for stt_num, sid in goi_4_ordered:
        p = sb_projects.get(sid, {})
        four_pkgs_list.append(('Gói 4', sid, p))

    for idx, (pkg_name, sid, sb_p) in enumerate(four_pkgs_list):
        old_id = sb_p.get('planning_id_old') or ''
        huyen = sb_p.get('district') or ''
        ward = sb_p.get('ward') or ''
        lat_ks = sb_p.get('latitude_survey') or sb_p.get('latitude_plan') or ''
        lng_ks = sb_p.get('longitude_survey') or sb_p.get('longitude_plan') or ''
        landowner = sb_p.get('landowner_name') or ''
        phone = sb_p.get('landlord_phone') or ''
        cccd = sb_p.get('landlord_cccd') or ''
        plot = sb_p.get('plot_number') or ''
        sheet = sb_p.get('map_sheet') or ''
        rent = sb_p.get('proposed_rent') or 3000000

        # Kiểm tra điều kiện trình HĐ
        if landowner and plot and sheet and phone and cccd:
            hd_status = "ĐỦ ĐIỀU KIỆN TRÌNH HĐ"
        elif landowner and plot and sheet:
            hd_status = "ĐÃ CÓ CHỦ ĐẤT / THỬA ĐẤT"
        else:
            hd_status = "THIẾU CHỦ ĐẤT / CCCD"

        # Nếu thuộc Gói 4, đánh số STT từ 21 trở đi nếu là trạm gói 4
        stt_val = idx + 1
        if pkg_name == 'Gói 4':
            for stt_n, c_code in goi_4_ordered:
                if c_code == sid:
                    stt_val = stt_n
                    break

        row_vals = [
            stt_val, pkg_name, sid, old_id, huyen, ward,
            lat_ks, lng_ks, hd_status,
            landowner or "---", phone or "---", cccd or "---", plot or "---", sheet or "---",
            f"{int(rent):,}" if rent else "---"
        ]
        ws1.append(row_vals)
        curr_row = header_row_1 + 1 + idx
        for c_idx in range(1, len(row_vals) + 1):
            cell = ws1.cell(row=curr_row, column=c_idx)
            cell.font = font_normal
            cell.border = thin_border
            if c_idx in [1, 2, 3, 4, 7, 8, 9, 11, 12, 13, 14]:
                cell.alignment = align_center
            elif c_idx == 15:
                cell.alignment = align_right
            else:
                cell.alignment = align_left

            # Highlight trạng thái điều kiện HĐ
            if c_idx == 9:
                if "ĐỦ ĐIỀU KIỆN" in hd_status:
                    cell.fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
                    cell.font = Font(name="Times New Roman", size=10, bold=True, color="166534")
                elif "ĐÃ CÓ" in hd_status:
                    cell.fill = PatternFill(start_color="FEF9C3", end_color="FEF9C3", fill_type="solid")
                    cell.font = Font(name="Times New Roman", size=10, bold=True, color="854D0E")
                else:
                    cell.fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
                    cell.font = Font(name="Times New Roman", size=10, bold=True, color="991B1B")


    # ==========================================
    # SHEET 2: TCT DUYỆT - SỞ DÙNG CHUNG (29 TRẠM)
    # ==========================================
    ws2 = wb.create_sheet(title="TCT_Duyet_So_Dung_Chung")
    ws2.views.sheetView[0].showGridLines = True

    ws2.merge_cells("A1:I1")
    ws2["A1"] = "DANH SÁCH 29 TRẠM TCT DUYỆT ĐẦU TƯ NHƯNG SỞ KH&CN YÊU CẦU DÙNG CHUNG CSHT"
    ws2["A1"].font = font_title
    ws2["A1"].alignment = align_center

    ws2.merge_cells("A2:I2")
    ws2["A2"] = "Phân loại theo tình trạng khảo sát thực địa: 15 trạm đã khảo sát (có tọa độ) vs 14 trạm chưa khảo sát"
    ws2["A2"].font = font_italic
    ws2["A2"].alignment = align_center

    headers_2 = [
        "STT", "Mã QH Mới", "Mã QH Cũ", "Huyện", "Xã / Phường", 
        "Tình Trạng Khảo Sát", "Vĩ Độ KS", "Kinh Độ KS", "Ghi Chú Tiến Độ"
    ]
    ws2.append([])
    ws2.append(headers_2)
    header_row_2 = 4
    for col_idx in range(1, len(headers_2) + 1):
        cell = ws2.cell(row=header_row_2, column=col_idx)
        cell.fill = header_fill_amber
        cell.font = font_header
        cell.alignment = align_center

    tct_ok_so_htcs = [r for r in rows_tvt3 if str(r.get('TCT Phê duyệt')).strip() == 'OK' and 'dùng chung' in str(r.get('Sở KHCN Phê duyệt')).lower()]
    # Sắp xếp trạm đã khảo sát lên đầu
    def sort_ks(r):
        sid = str(r.get('MÃ QH mới')).strip()
        sb_p = sb_projects.get(sid, {})
        has_ks = bool(sb_p.get('latitude_survey') and sb_p.get('longitude_survey'))
        return (0 if has_ks else 1, sid)
    tct_ok_so_htcs.sort(key=sort_ks)

    for idx, r in enumerate(tct_ok_so_htcs):
        sid = str(r.get('MÃ QH mới')).strip()
        old_id = str(r.get('Mã QH cũ') or '').strip()
        huyen = str(r.get('Huyện') or '').strip()
        sb_p = sb_projects.get(sid, {})
        ward = sb_p.get('ward') or ''
        lat_ks = sb_p.get('latitude_survey') or ''
        lng_ks = sb_p.get('longitude_survey') or ''
        has_ks = bool(lat_ks and lng_ks)
        ks_status = "ĐÃ KHẢO SÁT" if has_ks else "CHƯA KHẢO SÁT"

        note = ""
        if sid in desktop_8_sites:
            note = "Đã có HĐ mặt bằng xuất đợt 30/09"
        elif has_ks:
            note = "Đã có tọa độ KS thực địa, Sở yêu cầu dùng chung"
        else:
            note = "Chưa có tọa độ khảo sát trên hệ thống"

        row_vals = [idx + 1, sid, old_id, huyen, ward, ks_status, lat_ks, lng_ks, note]
        ws2.append(row_vals)
        curr_row = header_row_2 + 1 + idx
        for c_idx in range(1, len(row_vals) + 1):
            cell = ws2.cell(row=curr_row, column=c_idx)
            cell.font = font_normal
            cell.border = thin_border
            if c_idx in [1, 2, 3, 4, 6, 7, 8]:
                cell.alignment = align_center
            else:
                cell.alignment = align_left
            if c_idx == 6:
                if has_ks:
                    cell.fill = PatternFill(start_color="D1FAE5", end_color="D1FAE5", fill_type="solid")
                    cell.font = Font(name="Arial", size=10, bold=True, color="065F46")
                else:
                    cell.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
                    cell.font = Font(name="Arial", size=10, italic=True, color="64748B")

    # ==========================================
    # SHEET 3: SỞ DUYỆT ĐẦU TƯ - CHỜ TCT (34 TRẠM)
    # ==========================================
    ws3 = wb.create_sheet(title="So_Duyet_Cho_TCT")
    ws3.views.sheetView[0].showGridLines = True

    ws3.merge_cells("A1:H1")
    ws3["A1"] = "DANH SÁCH 34 TRẠM SỞ KH&CN DUYỆT ĐẦU TƯ XÂY MỚI (CHỜ TCT RA QUYẾT ĐỊNH ĐẦU TƯ)"
    ws3["A1"].font = font_title
    ws3["A1"].alignment = align_center

    ws3.merge_cells("A2:H2")
    ws3["A2"] = "100% trạm (34/34) đã được TVT3 khảo sát thực tế và Sở KH&CN chấp thuận vị trí xây dựng mới"
    ws3["A2"].font = font_italic
    ws3["A2"].alignment = align_center

    headers_3 = [
        "STT", "Mã QH Mới", "Mã QH Cũ", "Huyện", "Xã / Phường", 
        "Trạng Thái Khảo Sát", "Vĩ Độ KS", "Kinh Độ KS"
    ]
    ws3.append([])
    ws3.append(headers_3)
    header_row_3 = 4
    for col_idx in range(1, len(headers_3) + 1):
        cell = ws3.cell(row=header_row_3, column=col_idx)
        cell.fill = header_fill_purple
        cell.font = font_header
        cell.alignment = align_center

    so_ok_tct_nok = [r for r in rows_tvt3 if 'đầu tư' in str(r.get('Sở KHCN Phê duyệt')).lower() and str(r.get('TCT Phê duyệt')).strip() == 'NOK']
    so_ok_tct_nok.sort(key=lambda x: str(x.get('MÃ QH mới')))

    for idx, r in enumerate(so_ok_tct_nok):
        sid = str(r.get('MÃ QH mới')).strip()
        old_id = str(r.get('Mã QH cũ') or '').strip()
        huyen = str(r.get('Huyện') or '').strip()
        sb_p = sb_projects.get(sid, {})
        ward = sb_p.get('ward') or ''
        lat_ks = sb_p.get('latitude_survey') or ''
        lng_ks = sb_p.get('longitude_survey') or ''
        ks_status = "ĐÃ CÓ TỌA ĐỘ KS" if (lat_ks and lng_ks) else "CHƯA KS"

        row_vals = [idx + 1, sid, old_id, huyen, ward, ks_status, lat_ks, lng_ks]
        ws3.append(row_vals)
        curr_row = header_row_3 + 1 + idx
        for c_idx in range(1, len(row_vals) + 1):
            cell = ws3.cell(row=curr_row, column=c_idx)
            cell.font = font_normal
            cell.border = thin_border
            if c_idx in [1, 2, 3, 4, 6, 7, 8]:
                cell.alignment = align_center
            else:
                cell.alignment = align_left
            if c_idx == 6:
                cell.fill = PatternFill(start_color="EDE9FE", end_color="EDE9FE", fill_type="solid")
                cell.font = Font(name="Arial", size=10, bold=True, color="5B21B6")

    # ==========================================
    # SHEET 4: TỔNG HỢP TOÀN BỘ 86 TRẠM TVT3
    # ==========================================
    ws4 = wb.create_sheet(title="Tong_Hop_86_Tram")
    ws4.views.sheetView[0].showGridLines = True

    ws4.merge_cells("A1:K1")
    ws4["A1"] = "BẢNG TỔNG HỢP TOÀN BỘ 86 TRẠM QUY HOẠCH CSHT TỔ VIỄN THÔNG 3 (2026)"
    ws4["A1"].font = font_title
    ws4["A1"].alignment = align_center

    headers_4 = [
        "STT", "Mã QH Mới", "Mã QH Cũ", "Huyện", "Xã", 
        "TCT Phê Duyệt", "Sở KHCN Phê Duyệt", "Phân Nhóm Đề Xuất", "Gói", "Có Tọa Độ KS", "Ghi Chú"
    ]
    ws4.append([])
    ws4.append(headers_4)
    header_row_4 = 3
    for col_idx in range(1, len(headers_4) + 1):
        cell = ws4.cell(row=header_row_4, column=col_idx)
        cell.fill = header_fill_green
        cell.font = font_header
        cell.alignment = align_center

    for idx, r in enumerate(rows_tvt3):
        sid = str(r.get('MÃ QH mới')).strip()
        old_id = str(r.get('Mã QH cũ') or '').strip()
        huyen = str(r.get('Huyện') or '').strip()
        tct = str(r.get('TCT Phê duyệt') or '').strip()
        so = str(r.get('Sở KHCN Phê duyệt') or '').strip()
        ptm = str(r.get('Đề xuất loại hình PTM') or '').strip()
        goi = str(r.get('Gói') or '').strip()
        note = str(r.get('Ghi chú') or '').strip()

        sb_p = sb_projects.get(sid, {})
        ward = sb_p.get('ward') or ''
        has_ks = "CÓ" if (sb_p.get('latitude_survey') and sb_p.get('longitude_survey')) else "CHƯA"

        row_vals = [idx + 1, sid, old_id, huyen, ward, tct, so, ptm, goi, has_ks, note]
        ws4.append(row_vals)
        curr_row = header_row_4 + 1 + idx
        for c_idx in range(1, len(row_vals) + 1):
            cell = ws4.cell(row=curr_row, column=c_idx)
            cell.font = font_normal
            cell.border = thin_border
            if c_idx in [1, 2, 3, 4, 6, 7, 9, 10]:
                cell.alignment = align_center
            else:
                cell.alignment = align_left

    # Tự động căn chỉnh độ rộng cột cho cả 4 sheet
    for ws in [ws1, ws2, ws3, ws4]:
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                # Bỏ qua hàng tiêu đề gộp
                if cell.row in [1, 2]: continue
                v = str(cell.value or '')
                max_len = max(max_len, len(v))
            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 10), 45)

    # 4. Lưu file Excel
    out_name = "Bao_Cao_Ra_Soat_CSHT_TVT3_2026.xlsx"
    targets = [
        f"tvt3_v2/public/reports/{out_name}",
        f"tvt3_v2/dist/reports/{out_name}",
        os.path.expanduser(f"~/Downloads/{out_name}"),
        os.path.expanduser(f"~/Desktop/{out_name}")
    ]
    for t in targets:
        os.makedirs(os.path.dirname(t), exist_ok=True)
        wb.save(t)
        print(f"  🎯 Đã lưu file: {t} ({os.path.getsize(t):,} bytes)")

    print("🎉 XUẤT BÁO CÁO EXCEL RÀ SOÁT CSHT HOÀN TẤT THÀNH CÔNG!")

if __name__ == '__main__':
    build_report()
