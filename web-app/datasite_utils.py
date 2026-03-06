"""
DataSite Import Utils v2.1 — Header khớp 100% với Excel gốc
Hỗ trợ import từ 14 file Excel vào các bảng mới.
Có Filter: Chỉ import trạm thuộc Tổ VT3 / Long Khánh.
"""
import pandas as pd
import logging
import os
from models import (
    DsStation, DsContract, DsInfrastructure, DsEquipment, DsTelecom,
    DataSiteAnomaly, GeneralInfo, DATASITE_PREFIXES, db
)


# ============================================================================
# HELPER
# ============================================================================

def is_valid_site(site_id):
    """Kiểm tra site_id có thuộc Tổ VT3/Long Khánh không."""
    if not site_id or not isinstance(site_id, str):
        return False
    site_id = site_id.strip().upper()
    for prefix in DATASITE_PREFIXES:
        if site_id.startswith(prefix):
            return True
    existing = GeneralInfo.query.filter_by(id_tram=site_id).first()
    return existing is not None


def find_header_row(df, keyword='SITE_ID'):
    """Tìm dòng chứa header keyword trong DataFrame."""
    for idx, row in df.head(10).iterrows():
        for val in row.values:
            if pd.notna(val) and str(val).strip().upper() == keyword.upper():
                return idx
    return -1


def read_excel_with_header(file_path, header_keyword='SITE_ID'):
    """Đọc file Excel, tự tìm dòng header bằng keyword."""
    try:
        df_raw = pd.read_excel(file_path, header=None)
    except Exception as e:
        logging.error(f"Lỗi đọc file {file_path}: {e}")
        return None

    header_idx = find_header_row(df_raw, header_keyword)
    if header_idx == -1:
        logging.warning(f"Không tìm thấy header '{header_keyword}' trong {file_path}")
        return None

    df = pd.read_excel(file_path, header=header_idx)
    sid_col = header_keyword
    # Chuẩn hóa tên cột (strip whitespace)
    df.columns = [str(c).strip() for c in df.columns]
    if sid_col not in df.columns:
        # Tìm cột gần đúng
        for c in df.columns:
            if c.upper() == sid_col.upper():
                df.rename(columns={c: sid_col}, inplace=True)
                break
    if sid_col not in df.columns:
        return None

    valid = df[df[sid_col].notna()]
    valid = valid[valid[sid_col].astype(str).str.len() > 2]
    return valid


def g(row, cols):
    """Lấy giá trị đầu tiên không null từ danh sách cột."""
    for c in cols:
        if c in row.index and pd.notna(row[c]):
            val = str(row[c]).strip()
            if val and val.lower() != 'nan':
                return val
    return ""


def safe_float(val):
    if not val:
        return None
    try:
        s = str(val).replace(',', '').strip()
        return float(s)
    except (ValueError, TypeError):
        return None


# ============================================================================
# NHÓM 1: Import THÔNG TIN CHUNG (DsStation + DsContract)
# ============================================================================

def import_thong_tin_chung(file_path):
    """Import thong tin chung.xlsx → DsStation. Header tại dòng 1, keyword 'Site_ID'."""
    try:
        df_raw = pd.read_excel(file_path, header=None)
    except Exception as e:
        logging.error(f"Lỗi đọc thong tin chung: {e}")
        return 0

    header_idx = find_header_row(df_raw, 'Site_ID')
    if header_idx == -1:
        logging.warning("Không tìm thấy header 'Site_ID' trong thong tin chung.xlsx")
        return 0

    df = pd.read_excel(file_path, header=header_idx)
    df.columns = [str(c).strip() for c in df.columns]
    valid = df[df['Site_ID'].notna()]
    valid = valid[valid['Site_ID'].astype(str).str.len() > 2]

    DsStation.query.delete()
    count = 0
    for _, row in valid.iterrows():
        site_id = str(row['Site_ID']).strip()
        if not is_valid_site(site_id):
            continue
        obj = DsStation(
            site_id=site_id,
            ten_tram=g(row, ['Tên đối tượng', 'SITE NAME VNPT']),
            loai_tram=g(row, ['Loại trạm', 'Phân loại trạm']),
            dia_chi=g(row, ['ĐỊA CHỈ', 'ĐỊA CHỈ MỚI']),
            tinh_tp=g(row, ['Tỉnh/TP', 'Tỉnh/TP Mới']),
            quan_huyen=g(row, ['Quận/Huyện']),
            phuong_xa=g(row, ['Phường/Xã', 'Phường/Xã Mới']),
            kinh_do=g(row, ['Kinh độ']),
            vi_do=g(row, ['Vĩ độ']),
            ngay_phat_song=g(row, ['Ngày phát sóng']),
            hinh_thuc_dau_tu=g(row, ['Hình thức đầu tư']),
            don_vi_dung_chung=g(row, ['CHUNG CỘT ANTEN', 'CHUNG PHÒNG MÁY']),
            extra_data={
                'ma_ptm': g(row, ['Mã PTM']),
                'dai_vt': g(row, ['Đài VT']),
                'to_ql': g(row, ['Tổ QL']),
                'nhom_ql': g(row, ['Nhóm QL']),
                'pha_ptm': g(row, ['Pha PTM']),
                'chu_csht': g(row, ['Chủ CSHT']),
                'ma_pe': g(row, ['Mã PE']),
                'vung_phu': g(row, ['Vùng phủ']),
                'cosite': g(row, ['Cosite']),
                'enodeb': g(row, ['ENodeB']),
                'ma_csht': g(row, ['Mã CSHT']),
                'tram_main': g(row, ['Trạm main']),
                'phan_lop_csht': g(row, ['Phân lớp CSHT']),
                'hd_thue': g(row, ['HĐ Thuê']),
                'so_kd_tcb': g(row, ['Số KĐ/TCB']),
                'han_kiem_dinh': g(row, ['Hạn kiểm định']),
                'gpxd': g(row, ['GPXD trạm']),
                'chu_the_ky_hd': g(row, ['Chủ thể ký hợp đồng']),
                'dien_thoai': g(row, ['Điện thoại']),
                'moran': g(row, ['MORAN']),
            }
        )
        db.session.add(obj)
        count += 1
    db.session.commit()
    return count


def import_nha_dan(file_path):
    """Import DATA Trạm Nhà Dân → DsContract. File multi-header phức tạp."""
    try:
        df_raw = pd.read_excel(file_path, header=None, nrows=8)
    except Exception as e:
        logging.error(f"Lỗi đọc file nhà dân: {e}")
        return 0

    # Header tại row 5 (0-indexed), dòng chi tiết
    # Row 4 = group header, Row 5 = detail header
    df = pd.read_excel(file_path, header=5)
    df.columns = [str(c).strip() for c in df.columns]

    # Tìm cột Mã trạm
    site_col = None
    for c in df.columns:
        if 'mã trạm' in c.lower() or c.lower() == 'mã trạm':
            site_col = c
            break
    if not site_col:
        logging.warning("Không tìm thấy cột 'Mã trạm' trong file nhà dân")
        return 0

    valid = df[df[site_col].notna()]
    valid = valid[valid[site_col].astype(str).str.len() > 2]

    DsContract.query.delete()
    count = 0
    for _, row in valid.iterrows():
        site_id = str(row[site_col]).strip()
        if not is_valid_site(site_id):
            continue
        obj = DsContract(
            site_id=site_id,
            chu_the_hop_dong=g(row, ['Chủ thể hợp đồng']),
            sdt_chu_nha=g(row, ['Số điện thoại chủ nhà']),
            cccd=g(row, ['Số CCCD/CMND']),
            dia_chi_lien_he=g(row, ['Địa chỉ liên hệ']),
            so_hd=g(row, ['Số HĐ']),
            ngay_ky_hd=g(row, ['Ngày ký HĐ']),
            ngay_ket_thuc_hd=g(row, ['Ngày kết thúc HĐ']),
            tinh_trang_hd=g(row, ['Tình trạng hợp đồng']),
            gia_thue_co_vat=safe_float(g(row, ['Giá thuê trạm (+VAT/tháng)'])),
            gia_thue_khong_vat=safe_float(g(row, ['Giá thuê trạm (-VAT/tháng)'])),
            gia_dien_khoan=safe_float(g(row, ['Giá điện khoán'])),
            chu_ky_thanh_toan=g(row, ['Chu kỳ thanh toán']),
            chu_tai_khoan=g(row, ['Tên tài khoản', 'Chủ tài khoản']),
            so_tai_khoan=g(row, ['Số tài khoản']),
            ngan_hang=g(row, ['Ngân hàng']),
            extra_data={
                'ten_tram': g(row, ['Tên trạm']),
                'ma_dtxd': g(row, ['Mã ĐTXD']),
                'ghi_chu': g(row, ['Ghi chú']),
                'so_hd_cu': g(row, ['Số HĐ cũ']),
                'ngay_ky_hd_cu': g(row, ['Ngày ký HĐ cũ']),
                'so_phu_luc': g(row, ['Số phụ lục']),
                'ngay_ky_phu_luc': g(row, ['Ngày ký phụ lục']),
                'so_hd_erp': g(row, ['Số HĐ ERP']),
                'ma_tram_erp': g(row, ['Mã trạm ERP']),
                'ma_ncc': g(row, ['Mã NCC']),
                'dia_chi_dat_tram': g(row, ['Địa chỉ đặt trạm']),
                'ma_so_thue': g(row, ['Mã số thuế']),
                'yeu_cau_kep_ho_so': g(row, ['YÊU CẦU KẸP HỒ SƠ']),
            }
        )
        db.session.add(obj)
        count += 1
    db.session.commit()
    return count


# ============================================================================
# NHÓM 2: Import CƠ SỞ HẠ TẦNG
# ============================================================================

def import_cot_anten(file_path):
    """Cột Anten — Header Excel: SITE_ID, Loại Cột, Chiều cao cột, ..."""
    df = read_excel_with_header(file_path)
    if df is None:
        return 0
    DsInfrastructure.query.filter_by(loai='COT_ANTEN').delete()
    count = 0
    for _, row in df.iterrows():
        site_id = g(row, ['SITE_ID'])
        if not is_valid_site(site_id):
            continue
        obj = DsInfrastructure(
            site_id=site_id, loai='COT_ANTEN',
            serial=g(row, ['Serial anten outdoor']),
            trang_thai=g(row, ['Trạng thái']),
            han_bao_hanh=g(row, ['Thời hạn bảo hành']),
            han_bao_duong=g(row, ['Thời hạn bảo dưỡng']),
            extra_data={
                'loai_cot': g(row, ['Loại Cột']),
                'chieu_cao_cot': g(row, ['Chiều cao cột']),
                'chieu_cao_cong_trinh': g(row, ['Chiều cao công trình']),
                'den_bao_khong': g(row, ['Đèn báo không']),
                'dv_dung_chung_cot': g(row, ['Đơn vị dùng chung Cột']),
                'chieu_dai_cau_cap': g(row, ['Chiều dài cầu cáp']),
                'dv_chu_quan_ccat': g(row, ['Đơn vị chủ quản CCAT']),
                'dai_vt': g(row, ['Đài VT']),
            }
        )
        db.session.add(obj)
        count += 1
    db.session.commit()
    return count


def import_phong_may(file_path):
    """Phòng Máy — Header Excel: SITE_ID, Loại PM, Vị trí, Diện tích Phòng máy, ..."""
    df = read_excel_with_header(file_path)
    if df is None:
        return 0
    DsInfrastructure.query.filter_by(loai='PHONG_MAY').delete()
    count = 0
    for _, row in df.iterrows():
        site_id = g(row, ['SITE_ID'])
        if not is_valid_site(site_id):
            continue
        obj = DsInfrastructure(
            site_id=site_id, loai='PHONG_MAY',
            serial=g(row, ['Serial phòng máy']),
            trang_thai=g(row, ['Trạng thái']),
            han_bao_hanh=g(row, ['Thời hạn bảo hành']),
            han_bao_duong=g(row, ['Thời hạn bảo dưỡng']),
            extra_data={
                'loai_pm': g(row, ['Loại PM']),
                'vi_tri': g(row, ['Vị trí']),
                'dien_tich': g(row, ['Diện tích Phòng máy']),
                'dv_dung_chung': g(row, ['Đơn vị dùng chung Phòng máy']),
                'dv_chu_quan': g(row, ['Đơn vị chủ quản Phòng máy']),
                'dai_vt': g(row, ['Đài VT']),
            }
        )
        db.session.add(obj)
        count += 1
    db.session.commit()
    return count


def import_phong_mpd(file_path):
    """Phòng MPĐ — Header Excel: SITE_ID, Vị trí, Diện tích Phòng MPĐ, ..."""
    df = read_excel_with_header(file_path)
    if df is None:
        return 0
    DsInfrastructure.query.filter_by(loai='PHONG_MPD').delete()
    count = 0
    for _, row in df.iterrows():
        site_id = g(row, ['SITE_ID'])
        if not is_valid_site(site_id):
            continue
        obj = DsInfrastructure(
            site_id=site_id, loai='PHONG_MPD',
            serial=g(row, ['Serial Phòng MPĐ']),
            trang_thai=g(row, ['Trạng thái']),
            han_bao_hanh=g(row, ['Thời hạn bảo hành']),
            han_bao_duong=g(row, ['Thời hạn bảo dưỡng']),
            extra_data={
                'vi_tri': g(row, ['Vị trí']),
                'dien_tich': g(row, ['Diện tích Phòng MPĐ']),
                'dv_dung_chung': g(row, ['Đơn vị dùng chung Phòng MPĐ']),
                'dv_chu_quan': g(row, ['Đơn vị chủ quản Phòng MPĐ']),
                'product_code': g(row, ['Product_code Phòng MPĐ']),
                'dai_vt': g(row, ['Đài VT']),
            }
        )
        db.session.add(obj)
        count += 1
    db.session.commit()
    return count


# ============================================================================
# NHÓM 3: Import PHỤ TRỢ (Thiết bị)
# ============================================================================

def import_may_lanh(file_path):
    """Máy lạnh — Header Excel: Nhãn hiệu Máy lạnh, Công suất lạnh (BTU), ..."""
    df = read_excel_with_header(file_path)
    if df is None:
        return 0
    DsEquipment.query.filter_by(loai='MAY_LANH').delete()
    count = 0
    for _, row in df.iterrows():
        site_id = g(row, ['SITE_ID'])
        if not is_valid_site(site_id):
            continue
        obj = DsEquipment(
            site_id=site_id, loai='MAY_LANH',
            nhan_hieu=g(row, ['Nhãn hiệu Máy lạnh']),
            serial=g(row, ['Serial máy lạnh (serial dàn lạnh/serial dàn nóng)']),
            trang_thai=g(row, ['Trạng thái']),
            han_bao_hanh=g(row, ['Thời hạn bảo hành']),
            han_bao_duong=g(row, ['Thời hạn bảo dưỡng']),
            ngay_su_dung=g(row, ['Ngày đưa vào sử dụng tại trạm']),
            extra_data={
                'cong_suat_btu': g(row, ['Công suất lạnh (BTU)']),
                'loai_may_lanh': g(row, ['Loại máy lạnh']),
                'ten_may_lanh': g(row, ['Tên Máy lạnh']),
                'product_code': g(row, ['Product_code máy lạnh']),
                'dv_chu_quan': g(row, ['Đơn vị chủ quản Máy lạnh']),
                'don_vi_tinh': g(row, ['Đơn vị tính']),
                'don_gia': g(row, ['Đơn giá']),
                'ghi_chu': g(row, ['Ghi chú']),
                'vi_tri_tai_san': g(row, ['Vị trí tài sản']),
                'ngay_sd_hop_dong': g(row, ['Ngày đưa vào sử dụng (theo hợp đồng trang bị)']),
                'dai_vt': g(row, ['Đài VT']),
            }
        )
        db.session.add(obj)
        count += 1
    db.session.commit()
    return count


def import_may_phat(file_path):
    """Máy phát điện — Header: Nhãn hiệu Máy phát điện, Công suất, Phase, ..."""
    df = read_excel_with_header(file_path)
    if df is None:
        return 0
    DsEquipment.query.filter_by(loai='MAY_PHAT').delete()
    count = 0
    for _, row in df.iterrows():
        site_id = g(row, ['SITE_ID'])
        if not is_valid_site(site_id):
            continue
        obj = DsEquipment(
            site_id=site_id, loai='MAY_PHAT',
            nhan_hieu=g(row, ['Nhãn hiệu Máy phát điện']),
            serial=g(row, ['Serial máy phát điện']),
            trang_thai=g(row, ['Trạng thái']),
            han_bao_hanh=g(row, ['Thời hạn bảo hành']),
            han_bao_duong=g(row, ['Thời hạn bảo dưỡng']),
            ngay_su_dung=g(row, ['Ngày đưa vào sử dụng tại trạm']),
            extra_data={
                'cong_suat': g(row, ['Công suất Máy phát điện']),
                'phase': g(row, ['Phase']),
                'nhien_lieu': g(row, ['Nhiên liệu']),
                'ats': g(row, ['ATS']),
                'ten_mpd': g(row, ['Tên Máy phát điện']),
                'product_code': g(row, ['Product_code máy phát điện']),
                'dv_chu_quan': g(row, ['Đơn vị chủ quản Máy phát điện']),
                'don_vi_tinh': g(row, ['Đơn vị tính']),
                'don_gia': g(row, ['Đơn giá']),
                'ghi_chu': g(row, ['Ghi chú']),
                'vi_tri_tai_san': g(row, ['Vị trí tài sản']),
                'ngay_sd_hop_dong': g(row, ['Ngày đưa vào sử dụng (theo hợp đồng trang bị)']),
                'dai_vt': g(row, ['Đài VT']),
            }
        )
        db.session.add(obj)
        count += 1
    db.session.commit()
    return count


def import_tu_nguon(file_path):
    """Tủ nguồn — Header: Nhãn hiệu Tủ nguồn (Vender), Số lượng khe rectifier, ..."""
    df = read_excel_with_header(file_path)
    if df is None:
        return 0
    DsEquipment.query.filter_by(loai='TU_NGUON').delete()
    count = 0
    for _, row in df.iterrows():
        site_id = g(row, ['SITE_ID'])
        if not is_valid_site(site_id):
            continue
        obj = DsEquipment(
            site_id=site_id, loai='TU_NGUON',
            nhan_hieu=g(row, ['Nhãn hiệu Tủ nguồn (Vender)']),
            serial=g(row, ['Serial tủ nguồn']),
            trang_thai=g(row, ['Trạng thái']),
            han_bao_hanh=g(row, ['Thời hạn bảo hành']),
            han_bao_duong=g(row, ['Thời hạn bảo dưỡng']),
            ngay_su_dung=g(row, ['Ngày đưa vào sử dụng tại trạm']),
            extra_data={
                'so_luong_khe_rect': g(row, ['Số lượng khe rectifier']),
                'so_luong_rect': g(row, ['Số lượng rectifier']),
                'cong_suat_rect_w': g(row, ['Công suất Rectifier (W)']),
                'thoi_gian_backup_phut': g(row, ['Thời gian Backup (phút)']),
                'dong_tai_a': g(row, ['Dòng tải thiết bị (A)']),
                'product_code': g(row, ['Product_code tủ nguồn (model/part name)']),
                'product_code_rect': g(row, ['Product code rectifier']),
                'hop_dong_du_an': g(row, ['Hợp đồng_Dự án trang bị']),
                'ngay_sd_hop_dong': g(row, ['Ngày đưa vào sử dụng (theo hợp đồng trang bị)']),
                'dai_vt': g(row, ['Đài VT']),
            }
        )
        db.session.add(obj)
        count += 1
    db.session.commit()
    return count


def import_accu(file_path):
    """Tổ Accu — Header: Nhãn hiệu Accu, Loại Accu, Dung lượng bình Accu, ..."""
    df = read_excel_with_header(file_path)
    if df is None:
        return 0
    DsEquipment.query.filter_by(loai='ACCU').delete()
    count = 0
    for _, row in df.iterrows():
        site_id = g(row, ['SITE_ID'])
        if not is_valid_site(site_id):
            continue
        obj = DsEquipment(
            site_id=site_id, loai='ACCU',
            nhan_hieu=g(row, ['Nhãn hiệu Accu']),
            serial=g(row, ['Serial ACCU']),
            trang_thai=g(row, ['Trạng thái']),
            han_bao_hanh=g(row, ['Thời hạn bảo hành']),
            han_bao_duong=g(row, ['Thời hạn bảo dưỡng']),
            ngay_su_dung=g(row, ['Ngày đưa vào sử dụng (theo hợp đồng trang bị)']),
            extra_data={
                'loai_accu': g(row, ['Loại Accu']),
                'dung_luong_binh': g(row, ['Dung lượng bình Accu']),
                'so_luong_binh': g(row, ['Số lượng Bình Accu']),
                'product_code': g(row, ['Product_code ACCU']),
                'ghi_chu': g(row, ['Ghi chú']),
                'dai_vt': g(row, ['Đài VT']),
            }
        )
        db.session.add(obj)
        count += 1
    db.session.commit()
    return count


# ============================================================================
# NHÓM 4: Import KỸ THUẬT (Telecom)
# ============================================================================

def import_bts_3g(file_path):
    """BTS 3G — Header: Chủng loại Tủ 3G, Hãng sản xuất tủ 3G, RRU 3G, BBU 3G, ..."""
    df = read_excel_with_header(file_path)
    if df is None:
        return 0
    DsTelecom.query.filter_by(loai='BTS_3G').delete()
    count = 0
    for _, row in df.iterrows():
        site_id = g(row, ['SITE_ID'])
        if not is_valid_site(site_id):
            continue
        obj = DsTelecom(
            site_id=site_id, loai='BTS_3G',
            serial=g(row, ['Serial tủ BTS 3G']),
            trang_thai=g(row, ['Trạng thái']),
            han_bao_hanh=g(row, ['Thời hạn bảo hành']),
            han_bao_duong=g(row, ['Thời hạn bảo dưỡng']),
            ngay_su_dung=g(row, ['Ngày đưa vào sử dụng tại trạm']),
            extra_data={
                'chung_loai': g(row, ['Chủng loại Tủ 3G']),
                'hang_sx': g(row, ['Hãng sản xuất tủ 3G']),
                'rru': g(row, ['RRU 3G']),
                'bbu': g(row, ['BBU 3G']),
                'ngay_sd_hop_dong': g(row, ['Ngày đưa vào sử dụng (theo hợp đồng trang bị)']),
            }
        )
        db.session.add(obj)
        count += 1
    db.session.commit()
    return count


def import_bts_4g(file_path):
    """BTS 4G — Header: Chủng loại Tủ 4G, Hãng sản xuất tủ 4G, RRU 4G, BBU 4G, ..."""
    df = read_excel_with_header(file_path)
    if df is None:
        return 0
    DsTelecom.query.filter_by(loai='BTS_4G').delete()
    count = 0
    for _, row in df.iterrows():
        site_id = g(row, ['SITE_ID'])
        if not is_valid_site(site_id):
            continue
        obj = DsTelecom(
            site_id=site_id, loai='BTS_4G',
            serial=g(row, ['Serial tủ BTS 4G']),
            trang_thai=g(row, ['Trạng thái']),
            han_bao_hanh=g(row, ['Thời hạn bảo hành']),
            han_bao_duong=g(row, ['Thời hạn bảo dưỡng']),
            ngay_su_dung=g(row, ['Ngày đưa vào sử dụng tại trạm']),
            extra_data={
                'chung_loai': g(row, ['Chủng loại Tủ 4G']),
                'hang_sx': g(row, ['Hãng sản xuất tủ 4G']),
                'rru': g(row, ['RRU 4G']),
                'bbu': g(row, ['BBU 4G']),
                'ngay_sd_hop_dong': g(row, ['Ngày đưa vào sử dụng (theo hợp đồng trang bị)']),
                'dai_vt': g(row, ['Đài VT']),
            }
        )
        db.session.add(obj)
        count += 1
    db.session.commit()
    return count


def import_thiet_bi_vt(file_path):
    """Thiết bị viễn thông — Header: Tên thiết bị VT, Product_code, Loại TB VT, ..."""
    df = read_excel_with_header(file_path)
    if df is None:
        return 0
    DsTelecom.query.filter_by(loai='THIET_BI_VT').delete()
    count = 0
    for _, row in df.iterrows():
        site_id = g(row, ['SITE_ID'])
        if not is_valid_site(site_id):
            continue
        obj = DsTelecom(
            site_id=site_id, loai='THIET_BI_VT',
            serial=g(row, ['Serial thiết bị viễn thông']),
            trang_thai=g(row, ['Trạng thái']),
            extra_data={
                'ten_thiet_bi': g(row, ['Tên thiết bị viễn thông']),
                'product_code': g(row, ['Product_code thiết bị viễn thông']),
                'loai_thiet_bi': g(row, ['Loại thiết bị viễn thông']),
                'nha_cung_cap': g(row, ['Nhà cung cấp thiết bị viễn thông']),
                'thuoc_tram_remote': g(row, ['Thuộc trạm remote']),
                'dai_vt': g(row, ['Đài VT']),
            }
        )
        db.session.add(obj)
        count += 1
    db.session.commit()
    return count


def import_datacell(file_path):
    """Data Cell — Header: Cell, Sector, SITE, Lat, Long, Height, Azimuth, ..."""
    try:
        df = pd.read_excel(file_path)
        df.columns = [str(c).strip() for c in df.columns]
    except Exception as e:
        logging.error(f"Lỗi đọc file datacell: {e}")
        return 0

    site_col = 'SITE'
    if site_col not in df.columns:
        return 0

    DsTelecom.query.filter_by(loai='DATA_CELL').delete()
    count = 0
    for _, row in df.iterrows():
        site_id = str(row.get(site_col, '')).strip()
        if not is_valid_site(site_id):
            continue
        obj = DsTelecom(
            site_id=site_id, loai='DATA_CELL',
            extra_data={
                'cell': g(row, ['Cell']),
                'sector': g(row, ['Sector']),
                'lat': g(row, ['Lat']),
                'long': g(row, ['Long']),
                'height': g(row, ['Height']),
                'azimuth': g(row, ['Azimuth']),
                'm_tilt': g(row, ['M-tilt']),
                'e_tilt': g(row, ['E-tilt']),
                'tilt': g(row, ['Tilt']),
                'enb_id': g(row, ['eNB-ID']),
                'c_id': g(row, ['C-ID']),
                'psc_pci': g(row, ['PSC/PCI']),
            }
        )
        db.session.add(obj)
        count += 1
    db.session.commit()
    return count


# ============================================================================
# MASTER IMPORT: Gọi tất cả
# ============================================================================

def import_all_datasite_samples():
    """Import toàn bộ file Excel từ D:\\Chuyen doi so\\datasite vào DB mới."""
    folder = r"D:\Chuyen doi so\datasite"

    file_handler_map = {
        # Nhóm 1: Thông tin chung
        'thong tin chung.xlsx': import_thong_tin_chung,
        'DATA Trạm Nhà Dân + Pháp Nhân + VNPT + VNPOST (12).xlsx': import_nha_dan,
        # Nhóm 2: Hạ tầng
        'cot anten.xlsx': import_cot_anten,
        'phong may.xlsx': import_phong_may,
        'phong mpd.xlsx': import_phong_mpd,
        # Nhóm 3: Phụ trợ
        'may lanh.xlsx': import_may_lanh,
        'may phat dien.xlsx': import_may_phat,
        'tu nguon.xlsx': import_tu_nguon,
        'to accu.xlsx': import_accu,
        # Nhóm 4: Kỹ thuật
        'BTS 3G.xlsx': import_bts_3g,
        'BTS 4G.xlsx': import_bts_4g,
        'Thiet bi vien thong.xlsx': import_thiet_bi_vt,
        'datacell.xlsx': import_datacell,
    }

    results = {}
    for filename, handler in file_handler_map.items():
        path = os.path.join(folder, filename)
        if os.path.exists(path):
            try:
                count = handler(path)
                results[filename] = count
                logging.info(f"✅ {filename}: {count} records imported")
            except Exception as e:
                results[filename] = f"ERROR: {e}"
                logging.error(f"❌ {filename}: {e}")
        else:
            results[filename] = "FILE_NOT_FOUND"

    return results
