import openpyxl, glob, os
from datetime import datetime

def run_fill():
    target_files = glob.glob('/Users/cang_it/Library/CloudStorage/GoogleDrive-canglt1985@gmail.com/My Drive/Import WEB/*Kênh thuê*')
    if not target_files:
        raise FileNotFoundError("Target file 'Chuẩn hóa mã trạm - Kênh thuê.xlsx' not found!")
    target_file = target_files[0]
    print(f"Loading workbook: {target_file}")

    # Load with data_only=False to preserve formulas
    wb = openpyxl.load_workbook(target_file, data_only=False)
    ws = wb['Template khai TT1']

    # Load DATA IMPORT.xlsx
    path_di = '/Users/cang_it/Library/CloudStorage/GoogleDrive-canglt1985@gmail.com/My Drive/Import WEB/DATA IMPORT.xlsx'
    wb_di = openpyxl.load_workbook(path_di, data_only=True)
    ws_di = wb_di['DATA']
    src_di = {}
    for r in range(8, ws_di.max_row + 1):
        code = ws_di.cell(row=r, column=8).value
        if code:
            code_str = str(code).strip().upper()
            addr = ws_di.cell(row=r, column=30).value or ws_di.cell(row=r, column=26).value
            tinh = ws_di.cell(row=r, column=31).value or ws_di.cell(row=r, column=27).value
            xa = ws_di.cell(row=r, column=32).value or ws_di.cell(row=r, column=29).value
            src_di[code_str] = {
                'erp_id': ws_di.cell(row=r, column=24).value,
                'address': addr,
                'tinh': tinh,
                'xa': xa,
                'lon': ws_di.cell(row=r, column=71).value,
                'lat': ws_di.cell(row=r, column=72).value,
                'sohuu': ws_di.cell(row=r, column=11).value,
                'ngay_ps': ws_di.cell(row=r, column=69).value,
            }

    # Load TOAN BO DU LIEU
    path_tb = '/Users/cang_it/Library/CloudStorage/GoogleDrive-canglt1985@gmail.com/My Drive/soan HD/TOAN BO DU LIEU_1278_TRAM_cang.letan_20260421_091229.xlsx'
    wb_tb = openpyxl.load_workbook(path_tb, data_only=True)
    ws_tb = wb_tb['DataSite']
    src_tb = {}
    for r in range(5, ws_tb.max_row + 1):
        site_id = ws_tb.cell(row=r, column=1).value
        ptm_id = ws_tb.cell(row=r, column=2).value
        addr = ws_tb.cell(row=r, column=42).value or ws_tb.cell(row=r, column=5).value
        xa = ws_tb.cell(row=r, column=41).value or ws_tb.cell(row=r, column=10).value
        if xa and '-' in str(xa):
            xa = str(xa).split('-')[-1].strip().title()
        for c_id in [site_id, ptm_id]:
            if c_id:
                c_str = str(c_id).strip().upper()
                pure_code = c_str.split('-')[0].strip()
                item_data = {
                    'erp_id': ws_tb.cell(row=r, column=32).value or ws_tb.cell(row=r, column=2).value,
                    'address': addr,
                    'xa': xa,
                    'lon': ws_tb.cell(row=r, column=6).value,
                    'lat': ws_tb.cell(row=r, column=7).value,
                    'sohuu': ws_tb.cell(row=r, column=27).value or ws_tb.cell(row=r, column=19).value,
                    'ngay_ps': ws_tb.cell(row=r, column=25).value,
                }
                src_tb[c_str] = item_data
                src_tb[pure_code] = item_data

    # Specific overrides & custom transmission endpoints
    coord_overrides = {
        'DNNTXA': {'lat': 10.750673, 'lon': 106.94258, 'addr': 'Ấp 1, thị trấn Hiệp Phước, huyện Long Thành, tỉnh Đồng Nai'},
        'DNLTB7': {'lat': 10.706261, 'lon': 107.00787, 'addr': 'Thửa đất số 87, tờ bản đồ số 70, xã Long Phước, huyện Long Thành, tỉnh Đồng Nai'},
        'DNBHD5': {'lat': 10.915560, 'lon': 106.960550, 'addr': 'Thửa đất số 217, tờ bản đồ số 20, Phường Phước Tân, TP. Biên Hòa, Đồng Nai'},
        'DNBHXA': {'lat': 10.947220, 'lon': 106.852110, 'addr': 'Thửa đất số 70, tờ bản đồ số 28, Phường Tam Hiệp, TP. Biên Hòa, Đồng Nai'},
        'DNTBX6': {'lat': 10.875233, 'lon': 106.985886, 'addr': 'Thửa đất số 3430, tờ bản đồ số 5, xã An Viễn, huyện Trảng Bom, tỉnh Đồng Nai'},
        'DNVC83': {'lat': 11.007, 'lon': 106.8354, 'addr': 'Thửa đất số 44, tờ bản đồ số 33, xã Thạnh Phú, huyện Vĩnh Cửu, tỉnh Đồng Nai'},
        'DNVCX1': {'lat': 11.020436, 'lon': 106.838875, 'addr': 'Thửa đất số 16, tờ bản dồ số 16, ấp 7, xã Thạnh Phú, huyện Vĩnh Cửu, tỉnh Đồng Nai'},
        'DNXL86': {'lat': 10.95275, 'lon': 107.419621, 'addr': 'Thửa đất số 245, tờ bản đồ số 39, xã Xuân Trường, Huyện Xuân Lộc, Đồng Nai'},
        'BPHQL1': {'lat': 11.51736, 'lon': 106.56167, 'addr': 'Xã Tân Khai, Huyện Hớn Quản, Tỉnh Bình Phước'},
        'DNITPCAP': {'erp_id': 'DNITPCAP', 'lat': 10.84511, 'lon': 106.92838, 'addr': 'Trụ sở Công an Phường Tam Phước, Phường Tam Phước, TP. Biên Hòa, Tỉnh Đồng Nai', 'xa': 'Phường Tam Phước', 'sohuu': 'Mobifone', 'loai': 'MC', 'ngay_ps': '01/06/2026'},
        'DNITKHAP': {'erp_id': 'DNITKHAP', 'lat': 11.563737, 'lon': 106.617511, 'addr': 'Trụ sở Công an Phường Tân Khai, Phường Tân Khai, TP Đồng Nai', 'xa': 'Phường Tân Khai', 'sohuu': 'Mobifone', 'loai': 'MC', 'ngay_ps': '01/07/2026'},
        'DNIMDUBP': {'erp_id': 'DNIMDUBP', 'lat': 11.60343, 'lon': 106.50514, 'addr': 'Trụ sở Ban Chỉ huy Quân sự Xã Minh Đức, Huyện Hớn Quản, Tỉnh Bình Phước', 'xa': 'Xã Minh Đức', 'sohuu': 'Mobifone', 'loai': 'MC', 'ngay_ps': '01/06/2026'},
        'DNIMDUDP': {'erp_id': 'DNIMDUDP', 'lat': 11.6343, 'lon': 106.53415, 'addr': 'Trạm Y tế Xã Minh Đức, Huyện Hớn Quản, Tỉnh Bình Phước', 'xa': 'Xã Minh Đức', 'sohuu': 'Mobifone', 'loai': 'MC', 'ngay_ps': '01/06/2026'},
        'DNIMDUAP': {'erp_id': 'DNIMDUAP', 'lat': 11.60343, 'lon': 106.50514, 'addr': 'Trụ sở Công an Xã Minh Đức, Huyện Hớn Quản, Tỉnh Bình Phước', 'xa': 'Xã Minh Đức', 'sohuu': 'Mobifone', 'loai': 'MC', 'ngay_ps': '01/06/2026'},
        'BDBB13': {'erp_id': 'BDBB13', 'lat': 11.2672, 'lon': 106.6085, 'addr': 'Khu công nghiệp Bàu Bàng, Thị trấn Lai Uyên, Huyện Bàu Bàng, Tỉnh Bình Dương', 'xa': 'Thị trấn Lai Uyên', 'sohuu': 'Mobifone', 'loai': 'MC', 'ngay_ps': '15/07/2024'},
        'MTC-BPCDXI1': {'erp_id': '00028425', 'lat': 11.5381, 'lon': 106.9006, 'addr': '416 QL14, Khu phố Phú Thịnh, P. Tân Phú, TP. Đồng Xoài, Tỉnh Bình Phước', 'xa': 'Phường Tân Phú', 'sohuu': 'XHH', 'loai': 'CSG', 'ngay_ps': '15/10/2018'},
        'BPDX01': {'erp_id': '00027621', 'lat': 11.5389, 'lon': 106.901, 'addr': 'Trung Tâm Viễn Thông-CNTT Bình Phước, QL14, Phường Tân Phú, TP Đồng Xoài, Tỉnh Bình Phước', 'xa': 'Phường Tân Phú', 'sohuu': 'XHH', 'loai': 'CSG', 'ngay_ps': '05/05/2008'},
        'AGG-BPCCTH1': {'loai': 'AGG'},
        'AGG-BPCBGM1': {'loai': 'AGG'},
        'DNILKH1': {'loai': 'AGG'},
    }

    def format_date(d):
        if not d: return '01/01/2020'
        if isinstance(d, datetime):
            return d.strftime('%d/%m/%Y')
        s = str(d).strip()
        if '-' in s and len(s) >= 10:
            try:
                dt = datetime.strptime(s[:10], '%Y-%m-%d')
                return dt.strftime('%d/%m/%Y')
            except: pass
        return s

    def map_sohuu(val):
        if not val: return 'XHH'
        s = str(val).upper().strip()
        if 'MOBI' in s: return 'Mobifone'
        if 'VNPT' in s: return 'VNPT'
        if 'IBC' in s: return 'IBC'
        return 'XHH'

    def map_loai(name, val):
        name_u = name.upper()
        if name_u.startswith('AGG-'): return 'AGG'
        if name_u.startswith('MTC-') or name_u.startswith('CSG-'): return 'CSG'
        if val:
            v_u = str(val).upper().strip()
            if 'AGG' in v_u: return 'AGG'
            if 'CSG' in v_u: return 'CSG'
            if 'LSW' in v_u: return 'LSW'
        return 'MC'

    filled_count = 0
    for r in range(3, ws.max_row + 1):
        erp_name_cell = ws.cell(row=r, column=5) # Col E
        erp_name = erp_name_cell.value
        if not erp_name:
            continue
        
        name = str(erp_name).strip()
        name_u = name.upper()
        info = src_di.get(name_u) or src_tb.get(name_u) or {}
        ovr = coord_overrides.get(name_u, {})

        erp_id = ovr.get('erp_id') or info.get('erp_id') or name
        if erp_id in ['Không Có', 'KHÔNG CÓ', '0', 0, None, '']:
            erp_id = name

        addr = ovr.get('addr') or info.get('address') or f'{name}, Đồng Nai'
        tinh = 'Tỉnh Đồng Nai'
        xa = ovr.get('xa') or info.get('xa') or 'Phường Tam Phước'
        lat = ovr.get('lat') if 'lat' in ovr else info.get('lat')
        lon = ovr.get('lon') if 'lon' in ovr else info.get('lon')

        sohuu = map_sohuu(ovr.get('sohuu') or info.get('sohuu'))
        loai = ovr.get('loai') or map_loai(name_u, info.get('loai'))
        ngay = format_date(ovr.get('ngay_ps') or info.get('ngay_ps'))

        # Set values
        ws.cell(row=r, column=4).value = str(erp_id).strip()       # Col D (ErpId *)
        ws.cell(row=r, column=7).value = str(addr).strip()         # Col G (Address *)
        ws.cell(row=r, column=8).value = str(tinh).strip()         # Col H (TenTinh *)
        ws.cell(row=r, column=9).value = str(xa).strip()           # Col I (TenXa *)
        ws.cell(row=r, column=10).value = str(lon).strip() if lon is not None else "" # Col J (KinhDo *)
        ws.cell(row=r, column=11).value = str(lat).strip() if lat is not None else "" # Col K (ViDo *)
        ws.cell(row=r, column=12).value = str(sohuu).strip()       # Col L (Meta.SO_HUU_TRAM *)
        ws.cell(row=r, column=13).value = str(loai).strip()        # Col M (Meta.LOAI_TRAM *)
        ws.cell(row=r, column=14).value = str(ngay).strip()        # Col N (NgayHoatDong *)

        filled_count += 1

    wb.save(target_file)
    print(f"Successfully populated {filled_count} stations in '{target_file}'!")

if __name__ == '__main__':
    run_fill()
