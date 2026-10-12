import os
import requests
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def build_report():
    print("🚀 Đang xây dựng Báo cáo Rà soát CSHT chuẩn hóa: Gói 2,3,4 | Hạ Tầng Có Sẵn (HTCS) | TSCA Công An...")

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

    dict_tvt3 = {str(r.get('MÃ QH mới')).strip(): r for r in rows_tvt3}
    print(f"📦 Đọc được {len(rows_tvt3)} trạm TVT3 từ file quy hoạch tỉnh.")

    # 3. Phân định rạch ròi 3 nhóm mục tiêu theo chỉ đạo:
    # -------------------------------------------------------------
    # NHÓM 1: MBF TỰ ĐẦU TƯ GÓI 2, 3, 4 (Tổng 20 trạm)
    # (Đã thu nạp 6 trạm chuyển hướng từ HTCS sang tìm đất xây mới)
    g2_sites = ['26DNa242', '26DNa244', '26DNa175', '26DNa187', '26DNa250']
    g3_sites = ['26DNa162', '26DNa245', '26DNa247', '26DNa164', '26DNa166', '26DNa258', '26DNa168']
    g4_sites = ['26DNa165', '26DNa167', '26DNa163', '26DNa158', '26DNa255', '26DNa185', '26DNa181', '26DNa179']
    
    g4_salvaged_from_htcs = ['26DNa158', '26DNa185', '26DNa181', '26DNa165', '26DNa179', '26DNa255']

    # -------------------------------------------------------------
    # NHÓM 2: MỤC RIÊNG TSCA - TRỤ SỞ CÔNG AN (Tổng 13 trạm)
    # Tách hoàn toàn khỏi mục Hạ tầng có sẵn thông thường
    tsca_sites_all = [
        '26DNa060', '26DNa170', '26DNa052', '26DNa061', '26DNa072', 
        '26DNa071', '26DNa034', '26DNa053', '26DNa069', '26DNa070', 
        '26DNa160', '26DNa076', '26DNa080'
    ]

    # -------------------------------------------------------------
    # NHÓM 3: HẠ TẦNG CÓ SẴN (HTCS) THUẦN TÚY (Tổng 18 trạm)
    # (ĐÃ LOẠI TRỪ 6 trạm đã chuyển sang Gói 4 và LOẠI TRỪ 13 trạm TSCA)
    pure_htcs_sids = [
        '26DNa186', '26DNa184', '26DNa155', '26DNa156', '26DNa157', 
        '26DNa159', '26DNa131', 'DNTNL1', 'DNTNL2', 'DNXL10', 
        '26DNa311', '26DNa316', '26DNa318', '26DNa330', '26DNa290', 
        '26DNa291', '26DNa295', '26DNa246'
    ]

    # Styles
    font_title = Font(name="Arial", size=14, bold=True, color="1E3A8A")
    font_subtitle = Font(name="Arial", size=10, italic=True, color="475569")
    font_sec = Font(name="Arial", size=11, bold=True, color="1E293B")
    font_header = Font(name="Arial", size=10, bold=True, color="FFFFFF")
    font_bold = Font(name="Arial", size=10, bold=True)
    font_normal = Font(name="Arial", size=10)
    font_italic = Font(name="Arial", size=9, italic=True, color="64748B")

    header_fill_blue = PatternFill(start_color="1E40AF", end_color="1E40AF", fill_type="solid")
    header_fill_amber = PatternFill(start_color="92400E", end_color="92400E", fill_type="solid")
    header_fill_purple = PatternFill(start_color="5B21B6", end_color="5B21B6", fill_type="solid")
    header_fill_slate = PatternFill(start_color="334155", end_color="334155", fill_type="solid")

    thin_border = Border(
        left=Side(style='thin', color='D1D5DB'),
        right=Side(style='thin', color='D1D5DB'),
        top=Side(style='thin', color='D1D5DB'),
        bottom=Side(style='thin', color='D1D5DB')
    )

    align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
    align_right = Alignment(horizontal="right", vertical="center")

    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    # =========================================================================
    # SHEET 1: DASHBOARD TỔNG QUAN
    # =========================================================================
    ws0 = wb.create_sheet(title="Tong_Quan_Dashboard")
    ws0.views.sheetView[0].showGridLines = True

    ws0.merge_cells("A1:H1")
    ws0["A1"] = "BÁO CÁO RÀ SOÁT CƠ SỞ HẠ TẦNG TVT3: ĐẦU TƯ GÓI 2,3,4 | HẠ TẦNG CÓ SẴN | TSCA CÔNG AN"
    ws0["A1"].font = font_title
    ws0["A1"].alignment = align_center

    ws0.merge_cells("A2:H2")
    ws0["A2"] = "Tổ Kỹ Thuật Viễn Thông 3 (TVT3) - MobiFone Tỉnh Đồng Nai | Rà soát phân loại thực địa tháng 10/2026"
    ws0["A2"].font = font_subtitle
    ws0["A2"].alignment = align_center

    ws0.cell(row=4, column=1, value="1. TỔNG HỢP PHÂN LOẠI 3 TRỤ CỘT THEO CHỈ ĐẠO").font = font_sec

    headers_db1 = ["STT", "Hạng Mục Quy Hoạch", "Số Lượng", "Đã Khảo Sát", "Chưa Khảo Sát", "Tỷ Lệ %", "Đặc Điểm Triển Khai", "Sheet Chi Tiết"]
    for c_i, h in enumerate(headers_db1, 1):
        c = ws0.cell(row=5, column=c_i, value=h)
        c.fill = header_fill_slate
        c.font = font_header
        c.alignment = align_center
        c.border = thin_border

    db1_rows = [
        [1, "MBF Tự Đầu Tư (Gói 2, 3, 4)", 20, 20, 0, "23.3%", "20 trạm MBF tự xây mới (đã bao gồm 6 trạm chuyển hướng từ HTCS sang)", "Sheet: 1_MBF_Dau_Tu_Goi_2_3_4"],
        [2, "Hạ Tầng Có Sẵn - HTCS (Thuần túy)", 18, 7, 11, "20.9%", "18 trạm dùng chung hạ tầng (ĐÃ LOẠI TRỪ trạm chuyển Gói 4 và TSCA)", "Sheet: 2_Ha_Tang_Co_San_HTCS"],
        [3, "Mục Riêng: TSCA - Trụ Sở Công An", 13, 10, 3, "15.1%", "13 trạm xây dựng / dùng chung trên đất Công An theo đề án Bộ", "Sheet: 3_TSCA_Tru_So_Cong_An"],
        [4, "Sở KH&CN Duyệt Đầu Tư - Chờ TCT Phê Duyệt", 34, 34, 0, "39.5%", "34 trạm 100% đã khảo sát có tọa độ, Sở chấp thuận xây mới, chờ QĐĐT TCT", "Quỹ điểm 69 trạm"],
        [5, "Trạm quy hoạch khác (26DNa342)", 1, 1, 0, "1.2%", "Trạm quy hoạch đã có tọa độ khảo sát thực tế", "Danh mục chung"],
        ["", "TỔNG CỘNG ĐỊA BÀN TVT3", 86, 72, 14, "100.0%", "Toàn bộ 86 trạm kế hoạch PTM đối soát giữa Tỉnh và TVT3", "Toàn tỉnh"]
    ]

    for r_i, row_data in enumerate(db1_rows, 6):
        is_total = (r_i == 6 + len(db1_rows) - 1)
        for c_i, val in enumerate(row_data, 1):
            cell = ws0.cell(row=r_i, column=c_i, value=val)
            cell.font = font_bold if is_total else font_normal
            cell.border = thin_border
            if c_i in [1, 3, 4, 5, 6]:
                cell.alignment = align_center
            else:
                cell.alignment = align_left
            if is_total:
                cell.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

    # Bảng phân tích chi tiết HTCS
    ws0.cell(row=14, column=1, value="2. ĐỐI SOÁT VÀ NGUYÊN TẮC LOẠI TRỪ NHÓM HẠ TẦNG CÓ SẴN (HTCS)").font = font_sec

    headers_db2 = ["Nội Dung Phân Bổ", "Số Lượng Trạm", "Chi Tiết Danh Sách Mã Trạm", "Nguyên Tắc Xử Lý"]
    for c_i, h in enumerate(headers_db2, 1):
        c = ws0.cell(row=15, column=c_i, value=h)
        c.fill = header_fill_amber
        c.font = font_header
        c.alignment = align_center
        c.border = thin_border

    db2_rows = [
        ["Tổng điểm TCT duyệt ban đầu có yếu tố HTCS", 30, "29 trạm SKHCN phản hồi dùng chung + 1 trạm 26DNa246 từ Gói 3", "Điểm gốc ban đầu"],
        ["(-) Trừ các trạm TVT3 đã chuyển sang Gói 4 Đầu tư", 6, "26DNa158, 26DNa185, 26DNa181, 26DNa165, 26DNa179, 26DNa255", "LOẠI TRỪ KHỎI HTCS - Đưa toàn bộ vào Gói 4 xây mới"],
        ["(-) Trừ các trạm thuộc đề án Trụ sở Công An (TSCA)", 6, "26DNa170, 26DNa052, 26DNa053, 26DNa070, 26DNa076, 26DNa080", "LOẠI TRỪ KHỎI HTCS - Tách riêng sang Mục TSCA"],
        ["(=) SỐ LƯỢNG HẠ TẦNG CÓ SẴN (HTCS) THUẦN TÚY CÒN LẠI", 18, "186, 184, 155, 156, 157, 159, 246, 131, DNTNL1, DNTNL2, DNXL10, 311, 316, 318, 330, 290, 291, 295", "Gồm 7 trạm ĐÃ KHẢO SÁT & 11 trạm CHƯA KHẢO SÁT"]
    ]

    for r_i, row_data in enumerate(db2_rows, 16):
        is_highlight = (r_i == 16 + len(db2_rows) - 1)
        for c_i, val in enumerate(row_data, 1):
            cell = ws0.cell(row=r_i, column=c_i, value=val)
            cell.font = font_bold if is_highlight else font_normal
            cell.border = thin_border
            if c_i in [2]:
                cell.alignment = align_center
            else:
                cell.alignment = align_left
            if is_highlight:
                cell.fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")

    # =========================================================================
    # SHEET 2: MBF TỰ ĐẦU TƯ GÓI 2, 3, 4 (20 TRẠM)
    # =========================================================================
    ws1 = wb.create_sheet(title="1_MBF_Dau_Tu_Goi_2_3_4")
    ws1.views.sheetView[0].showGridLines = True

    ws1.merge_cells("A1:P1")
    ws1["A1"] = "DANH SÁCH 20 TRẠM MOBIFONE TỰ ĐẦU TƯ XÂY MỚI (GÓI 2, 3, 4)"
    ws1["A1"].font = font_title
    ws1["A1"].alignment = align_center

    ws1.merge_cells("A2:P2")
    ws1["A2"] = "Bao gồm 5 trạm Gói 2 + 7 trạm Gói 3 + 8 trạm Gói 4 (Đã bao gồm 6 trạm tìm được đất chuyển từ HTCS sang)"
    ws1["A2"].font = font_subtitle
    ws1["A2"].alignment = align_center

    headers_1 = [
        "STT", "Gói Thầu", "Mã QH Mới", "Mã QH Cũ", "Huyện", "Xã / Phường", 
        "Tọa Độ KS (Vĩ Độ)", "Tọa Độ KS (Kinh Độ)", "Điều Kiện Trình HĐ", 
        "Họ Tên Chủ Đất", "Số Điện Thoại", "Số CCCD", "Số Thửa", "Tờ Bản Đồ", "Giá Thuê (đ/tháng)", "Ghi Chú & Nguồn Gốc Trạm"
    ]
    ws1.append([])
    ws1.append(headers_1)
    header_row_1 = 4
    for c_i, h in enumerate(headers_1, 1):
        cell = ws1.cell(row=header_row_1, column=c_i)
        cell.fill = header_fill_blue
        cell.font = font_header
        cell.alignment = align_center
        cell.border = thin_border

    all_20_investment = []
    for sid in g2_sites: all_20_investment.append(('Gói 2', sid))
    for sid in g3_sites: all_20_investment.append(('Gói 3', sid))
    for sid in g4_sites: all_20_investment.append(('Gói 4', sid))

    for idx, (pkg, sid) in enumerate(all_20_investment, 1):
        sb_p = sb_projects.get(sid, {})
        xl_r = dict_tvt3.get(sid, {})
        
        old_id = sb_p.get('planning_id_old') or xl_r.get('Mã QH cũ') or ''
        district = sb_p.get('district') or xl_r.get('Huyện') or ''
        ward = sb_p.get('ward') or ''
        lat_ks = sb_p.get('latitude_survey') or sb_p.get('latitude_plan') or xl_r.get('Vĩ độ SKHCN chấp thuận') or ''
        lng_ks = sb_p.get('longitude_survey') or sb_p.get('longitude_plan') or xl_r.get('Kinh độ SKHCN chấp thuận') or ''
        
        landowner = sb_p.get('landowner_name') or ''
        phone = sb_p.get('landlord_phone') or ''
        cccd = sb_p.get('landlord_cccd') or ''
        plot = sb_p.get('plot_number') or ''
        sheet = sb_p.get('map_sheet') or ''
        rent = sb_p.get('proposed_rent') or 3000000

        if landowner and plot and sheet and phone and cccd:
            hd_status = "ĐỦ ĐIỀU KIỆN TRÌNH HĐ"
        elif landowner and plot and sheet:
            hd_status = "ĐÃ CÓ CHỦ / THỬA ĐẤT"
        else:
            hd_status = "THIẾU THÔNG TIN CHỦ ĐẤT"

        if sid in g4_salvaged_from_htcs:
            note = "Trạm chuyển hướng từ HTCS sang Gói 4 tự đầu tư xây mới"
        elif sid == '26DNa250':
            note = "Đã có chủ đất và thửa đất, đang bổ sung SĐT và CCCD"
        elif "ĐỦ ĐIỀU KIỆN" in hd_status:
            note = "Hồ sơ pháp lý hoàn chỉnh, sẵn sàng ký HĐ"
        else:
            note = "Cần thu thập bổ sung CCCD/STK"

        row_vals = [
            idx, pkg, sid, old_id, district, ward,
            lat_ks, lng_ks, hd_status,
            landowner or "---", phone or "---", cccd or "---", plot or "---", sheet or "---",
            f"{int(rent):,}" if rent else "---", note
        ]
        ws1.append(row_vals)
        curr_row = header_row_1 + idx
        for c_idx in range(1, len(row_vals) + 1):
            cell = ws1.cell(row=curr_row, column=c_idx)
            cell.font = font_normal
            cell.border = thin_border
            if c_idx in [1, 2, 3, 4, 5, 7, 8, 9, 11, 12, 13, 14]:
                cell.alignment = align_center
            elif c_idx == 15:
                cell.alignment = align_right
            else:
                cell.alignment = align_left

            if c_idx == 9:
                if "ĐỦ ĐIỀU KIỆN" in hd_status:
                    cell.fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
                    cell.font = Font(name="Arial", size=10, bold=True, color="166534")
                elif "ĐÃ CÓ" in hd_status:
                    cell.fill = PatternFill(start_color="FEF9C3", end_color="FEF9C3", fill_type="solid")
                    cell.font = Font(name="Arial", size=10, bold=True, color="854D0E")
                else:
                    cell.fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
                    cell.font = Font(name="Arial", size=10, bold=True, color="991B1B")

    # =========================================================================
    # SHEET 3: HẠ TẦNG CÓ SẴN (HTCS) THUẦN TÚY (18 TRẠM)
    # (ĐÃ LOẠI TRỪ HOÀN TOÀN CÁC TRẠM CHUYỂN GÓI 4 VÀ TSCA)
    # =========================================================================
    ws2 = wb.create_sheet(title="2_Ha_Tang_Co_San_HTCS")
    ws2.views.sheetView[0].showGridLines = True

    ws2.merge_cells("A1:M1")
    ws2["A1"] = "DANH SÁCH 18 TRẠM THUẦN TÚY LÀM HẠ TẦNG CÓ SẴN (HTCS - DÙNG CHUNG CỘT)"
    ws2["A1"].font = font_title
    ws2["A1"].alignment = align_center

    ws2.merge_cells("A2:M2")
    ws2["A2"] = "Đã loại trừ 6 trạm chuyển Gói 4 và các trạm TSCA. Phân tách rõ: 7 trạm Đã khảo sát (có tọa độ) vs 11 trạm Chưa khảo sát"
    ws2["A2"].font = font_subtitle
    ws2["A2"].alignment = align_center

    headers_2 = [
        "STT", "Nhóm Khảo Sát", "Mã QH Mới", "Mã QH Cũ", "Huyện", "Xã / Phường", 
        "Tình Trạng Khảo Sát", "Tọa Độ (Vĩ Độ)", "Tọa Độ (Kinh Độ)", 
        "Nhà Mạng Đối Tác Lân Cận", "Khoảng Cách (m)", "Lý Do Sở KH&CN Không Cho Xây Mới", "Kế Hoạch Đàm Phán / Xử Lý"
    ]
    ws2.append([])
    ws2.append(headers_2)
    header_row_2 = 4
    for c_i, h in enumerate(headers_2, 1):
        cell = ws2.cell(row=header_row_2, column=c_i)
        cell.fill = header_fill_amber
        cell.font = font_header
        cell.alignment = align_center
        cell.border = thin_border

    # Sắp xếp 18 trạm: 7 trạm đã khảo sát trước, 11 trạm chưa khảo sát sau
    sorted_pure_htcs = sorted(pure_htcs_sids, key=lambda s: (0 if bool(sb_projects.get(s, {}).get('latitude_survey')) else 1, s))

    for idx, sid in enumerate(sorted_pure_htcs, 1):
        sb_p = sb_projects.get(sid, {})
        xl_r = dict_tvt3.get(sid, {})

        old_id = sb_p.get('planning_id_old') or xl_r.get('Mã QH cũ') or ''
        district = sb_p.get('district') or xl_r.get('Huyện') or ''
        ward = sb_p.get('ward') or ''
        
        lat_ks = sb_p.get('latitude_survey') or xl_r.get('Vĩ độ SKHCN chấp thuận') or ''
        lng_ks = sb_p.get('longitude_survey') or xl_r.get('Kinh độ SKHCN chấp thuận') or ''
        has_ks = bool(sb_p.get('latitude_survey') and sb_p.get('longitude_survey'))

        ks_group = "🟢 ĐÃ KHẢO SÁT (7 trạm)" if has_ks else "⚪ CHƯA KHẢO SÁT (11 trạm)"
        ks_str = "ĐÃ KHẢO SÁT" if has_ks else "CHƯA KHẢO SÁT"

        reason_skhcn = xl_r.get('Nguyên nhân SKHCN không chấp thuận xây dựng mới') or ''
        if sid == '26DNa246':
            reason_skhcn = "Đất không có sổ đỏ - Đã rút khỏi Gói 3 chuyển sang Dùng chung CSHT"

        dist_m = xl_r.get('Khoảng cách đến trạm hiện hữu') or ''
        r_lower = str(reason_skhcn).lower()
        if "viettel" in r_lower: partner_carrier = "Viettel"
        elif "vinaphone" in r_lower or "vnpt" in r_lower: partner_carrier = "VNPT / Vinaphone"
        elif "mobifone" in r_lower: partner_carrier = "MobiFone đề nghị HTCS"
        else: partner_carrier = "Nhà mạng lân cận"

        if has_ks:
            action_desc = "Đã có tọa độ: Soạn văn bản đàm phán hợp đồng thuê vị trí cột với đối tác"
        else:
            action_desc = "Cần tổ chức đi tuyến đo kiểm thực tế xác định vị trí cột và khoảng cách đối tác"

        row_vals = [
            idx, ks_group, sid, old_id, district, ward,
            ks_str, lat_ks, lng_ks,
            partner_carrier, dist_m or "---", reason_skhcn or "---", action_desc
        ]
        ws2.append(row_vals)
        curr_row = header_row_2 + idx
        for c_idx in range(1, len(row_vals) + 1):
            cell = ws2.cell(row=curr_row, column=c_idx)
            cell.font = font_normal
            cell.border = thin_border
            if c_idx in [1, 2, 3, 4, 5, 7, 8, 9, 10, 11]:
                cell.alignment = align_center
            else:
                cell.alignment = align_left

            if c_idx == 7:
                if has_ks:
                    cell.fill = PatternFill(start_color="D1FAE5", end_color="D1FAE5", fill_type="solid")
                    cell.font = Font(name="Arial", size=10, bold=True, color="065F46")
                else:
                    cell.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
                    cell.font = Font(name="Arial", size=10, italic=True, color="64748B")

    # =========================================================================
    # SHEET 4: MỤC RIÊNG TSCA - TRỤ SỞ CÔNG AN (13 TRẠM)
    # =========================================================================
    ws3 = wb.create_sheet(title="3_TSCA_Tru_So_Cong_An")
    ws3.views.sheetView[0].showGridLines = True

    ws3.merge_cells("A1:L1")
    ws3["A1"] = "DANH SÁCH 13 TRẠM ĐỀ ÁN TRỤ SỞ CÔNG AN (TSCA LƯỠNG DỤNG - TVT3)"
    ws3["A1"].font = font_title
    ws3["A1"].alignment = align_center

    ws3.merge_cells("A2:L2")
    ws3["A2"] = "Tách riêng thành mục độc lập theo đề án Bộ Công An: gồm 7 trạm TSCA_Đầu tư (xây mới) và 6 trạm TSCA_HTCS (dùng chung cột)"
    ws3["A2"].font = font_subtitle
    ws3["A2"].alignment = align_center

    headers_3 = [
        "STT", "Phân Loại TSCA", "Mã QH Mới", "Mã QH Cũ", "Huyện", "Xã / Trụ Sở Công An", 
        "Tình Trạng Khảo Sát", "Tọa Độ KS (Vĩ Độ)", "Tọa Độ KS (Kinh Độ)", 
        "Sở KH&CN Phê Duyệt", "Lý Do / Vị Trí Công An", "Kế Hoạch Triển Khai Phối Hợp CATP"
    ]
    ws3.append([])
    ws3.append(headers_3)
    header_row_3 = 4
    for c_i, h in enumerate(headers_3, 1):
        cell = ws3.cell(row=header_row_3, column=c_i)
        cell.fill = header_fill_purple
        cell.font = font_header
        cell.alignment = align_center
        cell.border = thin_border

    # Sắp xếp TSCA: Đầu tư lên trước, Dùng chung HTCS sau
    def sort_tsca_key(sid):
        xl_r = dict_tvt3.get(sid, {})
        ptm = str(xl_r.get('Đề xuất loại hình PTM') or '')
        is_dau_tu = 'đầu tư' in ptm.lower()
        return (0 if is_dau_tu else 1, sid)

    sorted_tsca = sorted(tsca_sites_all, key=sort_tsca_key)

    for idx, sid in enumerate(sorted_tsca, 1):
        sb_p = sb_projects.get(sid, {})
        xl_r = dict_tvt3.get(sid, {})

        old_id = sb_p.get('planning_id_old') or xl_r.get('Mã QH cũ') or ''
        district = sb_p.get('district') or xl_r.get('Huyện') or ''
        ward = sb_p.get('ward') or ''
        
        lat_ks = sb_p.get('latitude_survey') or xl_r.get('Vĩ độ SKHCN chấp thuận') or ''
        lng_ks = sb_p.get('longitude_survey') or xl_r.get('Kinh độ SKHCN chấp thuận') or ''
        has_ks = bool(sb_p.get('latitude_survey') and sb_p.get('longitude_survey'))
        ks_str = "ĐÃ KHẢO SÁT" if has_ks else "CHƯA KHẢO SÁT"

        ptm = str(xl_r.get('Đề xuất loại hình PTM') or '')
        if 'đầu tư' in ptm.lower():
            tsca_group = "TSCA_Đầu Tư (Xây mới)"
        else:
            tsca_group = "TSCA_HTCS (Dùng chung)"

        so_duyet = str(xl_r.get('Sở KHCN Phê duyệt') or '')
        khu_vuc = str(xl_r.get('Khu vực') or xl_r.get('Nguyên nhân SKHCN không chấp thuận xây dựng mới') or 'Trụ sở Công An')

        if "Đầu Tư" in tsca_group:
            plan_tsca = "Triển khai thỏa thuận vị trí và mặt bằng với Công An huyện/xã để MBF tự đầu tư cột mới"
        else:
            plan_tsca = "Thương lượng dùng chung cột hiện hữu hoặc lắp trạm ngụy trang tại khuôn viên Công An"

        row_vals = [
            idx, tsca_group, sid, old_id, district, ward or khu_vuc,
            ks_str, lat_ks, lng_ks,
            so_duyet, khu_vuc, plan_tsca
        ]
        ws3.append(row_vals)
        curr_row = header_row_3 + idx
        for c_idx in range(1, len(row_vals) + 1):
            cell = ws3.cell(row=curr_row, column=c_idx)
            cell.font = font_normal
            cell.border = thin_border
            if c_idx in [1, 2, 3, 4, 5, 7, 8, 9, 10]:
                cell.alignment = align_center
            else:
                cell.alignment = align_left

            if c_idx == 2:
                if "Đầu Tư" in tsca_group:
                    cell.fill = PatternFill(start_color="EDE9FE", end_color="EDE9FE", fill_type="solid")
                    cell.font = Font(name="Arial", size=10, bold=True, color="5B21B6")
                else:
                    cell.fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")
                    cell.font = Font(name="Arial", size=10, bold=True, color="92400E")

            if c_idx == 7:
                if has_ks:
                    cell.fill = PatternFill(start_color="D1FAE5", end_color="D1FAE5", fill_type="solid")
                    cell.font = Font(name="Arial", size=10, bold=True, color="065F46")
                else:
                    cell.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
                    cell.font = Font(name="Arial", size=10, italic=True, color="64748B")

    # =========================================================================
    # TỰ ĐỘNG CĂN CHỈNH ĐỘ RỘNG CỘT CHO CẢ 4 SHEET
    # =========================================================================
    for ws in [ws0, ws1, ws2, ws3]:
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                if cell.row in [1, 2]: continue
                v = str(cell.value or '')
                max_len = max(max_len, len(v))
            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 11), 46)

    # 4. Lưu file Excel đa thư mục
    out_name = "Bao_Cao_Ra_Soat_TCT_HTCS_va_Goi_2_3_4.xlsx"
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

    print(f"🎉 XUẤT THÀNH CÔNG BÁO CÁO CHUẨN HÓA 3 TRỤ CỘT: {out_name}")

if __name__ == '__main__':
    build_report()
