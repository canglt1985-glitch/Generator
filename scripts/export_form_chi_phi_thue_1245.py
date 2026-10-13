import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from supabase import create_client

def export_form():
    print("🚀 Bắt đầu điền form và xuất file dự kiến đăng ký chi phí thuê CSHT...")

    # 1. Đọc Supabase
    env = {}
    with open('tvt3_v2/.env') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k.strip()] = v.strip().strip('"').strip("'")

    sb = create_client(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY'])
    res = sb.table('infrastructure_projects').select('*').execute()
    projects = res.data or []
    p_map = {p.get('planning_id_new'): p for p in projects}

    # Danh sách 25 trạm MBF Đầu tư (Gói 2: 5 trạm, Gói 3: 7 trạm, Gói 4: 8 trạm, Gói 7203/bổ sung: 5 trạm)
    g2 = ['26DNa242', '26DNa244', '26DNa175', '26DNa187', '26DNa250']
    g3 = ['26DNa162', '26DNa245', '26DNa247', '26DNa164', '26DNa166', '26DNa258', '26DNa168']
    g4 = ['26DNa165', '26DNa167', '26DNa163', '26DNa158', '26DNa255', '26DNa185', '26DNa181', '26DNa179']
    g_bs = ['26DNa348', '26DNa352', '26DNa289', '26DNa281', '26DNa251']
    mbf_25_sids = g2 + g3 + g4 + g_bs

    # Danh sách 11 trạm Dùng chung CSHT (HTCS)
    htcs_sids = [
        'TVT3_20', '26DNa184', '26DNa186', '26DNa246',
        'TVT3_BS1', 'TVT3_BS2', 'TVT3_BS3',
        '26DNa155', '26DNa156', '26DNa157', '26DNa159'
    ]

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Chi_Phi_Thue_CSHT"
    ws.views.sheetView[0].showGridLines = True

    # Định dạng Font theo đúng mẫu (Times New Roman)
    font_header = Font(name="Times New Roman", size=10, bold=True)
    font_data = Font(name="Times New Roman", size=10)
    font_bold = Font(name="Times New Roman", size=10, bold=True)

    thin_border = Border(
        left=Side(style="thin", color="000000"),
        right=Side(style="thin", color="000000"),
        top=Side(style="thin", color="000000"),
        bottom=Side(style="thin", color="000000")
    )

    align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
    align_right = Alignment(horizontal="right", vertical="center")

    # Row 1: Header trống
    ws.row_dimensions[1].height = 15

    # Row 2: Headers bảng chuẩn xác theo ảnh
    headers = [
        "STT",
        "ID",
        "TỔ VT",
        "MBF Đầu tư/\nHTCS",
        "Đối tượng thuê (Cá\nnhân/ Pháp nhân/\nVNPT,...)",
        "SỐ HỢP ĐỒNG",
        "ĐƠN GIÁ (-VAT)",
        "NGÀY BẮT ĐẦU\nTÍNH TIỀN",
        "GHI CHÚ"
    ]

    ws.row_dimensions[2].height = 42
    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=2, column=col_idx, value=h)
        cell.font = font_header
        cell.alignment = align_center
        cell.border = thin_border

    row_num = 3

    # =========================================================================
    # 1. MOBIFONE ĐẦU TƯ (25 TRẠM)
    # =========================================================================
    for idx, sid in enumerate(mbf_25_sids, 1):
        p = p_map.get(sid, {})
        ward = p.get('ward') or ''
        dist = p.get('district') or ''
        is_phuong = 'phường' in ward.lower() or 'thị trấn' in ward.lower() or 'tt' in ward.lower()

        owner = p.get('landowner_name')
        owner_clean = owner.strip() if owner else "Chưa có tên"
        
        contract_raw = p.get('contract_number')
        has_real_contract = False
        is_draft_contract = False
        if contract_raw and str(contract_raw).strip() not in ['', '-', 'None']:
            c_str = str(contract_raw).strip()
            if c_str.startswith('-26/'):
                is_draft_contract = True
                contract_no = c_str
            else:
                has_real_contract = True
                contract_no = c_str
        else:
            contract_no = ""

        bbgn = p.get('bbgn_status')
        has_bbgn = (bbgn is not None and str(bbgn).strip().lower() not in ['', 'none'])
        proposed_rent = p.get('proposed_rent')

        # Đơn giá thuê: trạm đã có HĐ, BBGN hoặc thỏa thuận thì lấy đơn giá thực tế (3.000.000 đ)
        if proposed_rent:
            price = int(proposed_rent)
        else:
            price = 3000000

        # Ngày bắt đầu tính tiền: áp dụng thống nhất từ 01/01/2027 theo yêu cầu
        start_date = "01/01/2027"

        # Ghi chú tình trạng HĐ / BBGN
        if has_real_contract:
            c_date = p.get('contract_date')
            c_date_str = f" ngày {c_date}" if c_date else ""
            calc_note = f"Đã có HĐ ({contract_no}{c_date_str}). Đơn giá theo HĐ 3tr/th. Chủ đất: {owner_clean} ({dist})"
        elif is_draft_contract:
            calc_note = f"Đang ký HĐ (dự thảo {contract_no}). Đã có BBGN. Đơn giá 3tr/th. Chủ đất: {owner_clean} ({dist})"
        elif has_bbgn:
            calc_note = f"Đã có BBGN. Đơn giá theo BBGN 3tr/th. Chủ đất: {owner_clean} ({dist})"
        else:
            calc_note = f"Đơn giá thỏa thuận 3tr/th. Chủ đất: {owner_clean} ({dist})"

        vals = [
            idx,
            sid,
            "TVT3",
            "MBF Đầu tư",
            "Cá nhân",
            contract_no,
            price,
            start_date,
            calc_note
        ]

        ws.row_dimensions[row_num].height = 22
        for c_i, val in enumerate(vals, 1):
            c = ws.cell(row=row_num, column=c_i, value=val)
            c.font = font_data
            c.border = thin_border
            if c_i in [1, 2, 3, 4, 5, 6, 8]:
                c.alignment = align_center
            elif c_i == 7:
                c.alignment = align_right
                c.number_format = "#,##0"
            else:
                c.alignment = align_left
        row_num += 1

    # =========================================================================
    # 2. DÙNG CHUNG CSHT (11 TRẠM)
    # =========================================================================
    for idx, sid in enumerate(htcs_sids, 26):
        p = p_map.get(sid, {})
        ward = p.get('ward') or ''
        dist = p.get('district') or ''
        h = p.get('height') or p.get('antenna_height') or 42
        is_phuong = 'phường' in ward.lower() or 'thị trấn' in ward.lower() or 'tt' in ward.lower()

        bbgn = p.get('bbgn_status')
        has_bbgn = (bbgn is not None and str(bbgn).strip().lower() not in ['', 'none'])
        proposed_rent = p.get('proposed_rent')

        # Đối tác dùng chung dựa trên khảo sát / xung đột
        conflict = p.get('conflict_notes') or ''
        if 'Viettel' in conflict:
            partner = "Viettel"
        elif 'Vinaphone' in conflict or 'VNPT' in conflict:
            partner = "VNPT"
        else:
            partner = "Pháp nhân"

        contract_no = ""
        start_date = "01/01/2027"

        # Nếu đã có BBGN và đơn giá thỏa thuận (ví dụ 184, 186, 246) -> dùng đơn giá BBGN
        if proposed_rent and has_bbgn:
            price = int(proposed_rent)
            calc_note = f"Đã có BBGN. Đơn giá thỏa thuận {price//1000000}tr/th. Đối tác: {partner}. {ward} ({dist})"
        else:
            # Chưa có HĐ/BBGN: Áp dụng định mức 1245 (giảm trừ dùng chung cột -20%, bệ outdoor -20% + MPĐ 300k)
            if is_phuong:
                if h > 35:
                    price = 5456000
                    calc_note = f"Tạm tính 1245: MB 3.5tr + Cột {int(h)}m (1.256tr) + Bệ (0.4tr) + MPĐ (0.3tr). Đối tác: {partner}"
                else:
                    price = 5288000
                    calc_note = f"Tạm tính 1245: MB 3.5tr + Cột {int(h)}m (1.088tr) + Bệ (0.4tr) + MPĐ (0.3tr). Đối tác: {partner}"
            else:
                if h > 35:
                    price = 4356000
                    calc_note = f"Tạm tính 1245: MB 2.4tr + Cột {int(h)}m (1.256tr) + Bệ (0.4tr) + MPĐ (0.3tr). Đối tác: {partner}"
                else:
                    price = 4188000
                    calc_note = f"Tạm tính 1245: MB 2.4tr + Cột {int(h)}m (1.088tr) + Bệ (0.4tr) + MPĐ (0.3tr). Đối tác: {partner}"

        vals = [
            idx,
            sid,
            "TVT3",
            "HTCS",
            partner,
            contract_no,
            price,
            start_date,
            calc_note
        ]

        ws.row_dimensions[row_num].height = 22
        for c_i, val in enumerate(vals, 1):
            c = ws.cell(row=row_num, column=c_i, value=val)
            c.font = font_data
            c.border = thin_border
            if c_i in [1, 2, 3, 4, 5, 6, 8]:
                c.alignment = align_center
            elif c_i == 7:
                c.alignment = align_right
                c.number_format = "#,##0"
            else:
                c.alignment = align_left
        row_num += 1

    # =========================================================================
    # 3. HÀNG TỔNG CỘNG
    # =========================================================================
    ws.row_dimensions[row_num].height = 26
    ws.merge_cells(start_row=row_num, start_column=1, end_row=row_num, end_column=6)
    total_lbl = ws.cell(row=row_num, column=1, value="TỔNG CỘNG (36 TRẠM)")
    total_lbl.font = font_bold
    total_lbl.alignment = align_center

    for c_i in range(1, 7):
        ws.cell(row=row_num, column=c_i).border = thin_border

    total_val = ws.cell(row=row_num, column=7, value=f"=SUM(G3:G{row_num-1})")
    total_val.font = font_bold
    total_val.alignment = align_right
    total_val.number_format = "#,##0"
    total_val.border = thin_border

    for c_i in [8, 9]:
        c = ws.cell(row=row_num, column=c_i, value="")
        c.border = thin_border

    # Căn chỉnh độ rộng cột chuẩn đẹp
    col_widths = {
        1: 6,    # STT
        2: 13,   # ID
        3: 10,   # TỔ VT
        4: 15,   # MBF Đầu tư/ HTCS
        5: 18,   # Đối tượng thuê
        6: 25,   # SỐ HỢP ĐỒNG
        7: 18,   # ĐƠN GIÁ (-VAT)
        8: 18,   # NGÀY BẮT ĐẦU TÍNH TIỀN
        9: 60    # GHI CHÚ
    }
    for col_idx, width in col_widths.items():
        ws.column_dimensions[get_column_letter(col_idx)].width = width

    out_path = '/Users/cang_it/Desktop/Du_Kien_Chi_Phi_Thue_CSHT_TVT3.xlsx'
    wb.save(out_path)
    print(f"🎉 Xuất file thành công: {out_path}")
    return out_path

if __name__ == '__main__':
    export_form()
