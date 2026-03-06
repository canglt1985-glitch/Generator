"""
Database Models for Quản Lý Máy Phát Điện
Extracted from app.py for cleaner code organization.
"""
from datetime import datetime
from extensions import db


class GeneralInfo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    id_tram = db.Column(db.String(50), nullable=False)
    ma_khach_hang = db.Column(db.String(50))
    huyen = db.Column(db.String(100))
    quan_ly_tram = db.Column(db.String(100))
    may_phat_dien = db.Column(db.String(100))    # Tên đầy đủ (VD: "KIBII 6KVA")
    cong_suat = db.Column(db.Float)               # Công suất máy (KVA)
    dung_tich = db.Column(db.Integer)              # Dung tích bồn nhiên liệu (lít)
    dinh_muc_thuc_te = db.Column(db.Float)
    dinh_muc = db.Column(db.Float)                 # Định mức thanh toán (l/h)
    loai_tram = db.Column(db.String(100))
    vung_phu = db.Column(db.String(100))
    loai_nhien_lieu = db.Column(db.String(50))
    loai_may = db.Column(db.String(100))           # Nhãn hiệu máy (VD: "KIBII")
    nl_ton = db.Column(db.Float, default=0)        # NL tồn thực tế tại trạm (nhập tay khi kiểm kê)
    ngay_cap_nhat = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))


class PowerSchedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ma_khach_hang = db.Column(db.String(50))
    id_tram = db.Column(db.String(50))
    khu_vuc = db.Column(db.String(100))
    ngay_mat_dien = db.Column(db.String(20))
    thoi_gian_cup_dien = db.Column(db.String(10))
    thoi_gian_co_dien = db.Column(db.String(10))
    ly_do = db.Column(db.String(500))
    doi_quan_ly_dien = db.Column(db.String(200))
    quan_ly_tram = db.Column(db.String(200))

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


class GeneratorLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    id_tram = db.Column(db.String(50))
    site = db.Column(db.String(100))
    cong_suat_may = db.Column(db.String(50))
    loai_may = db.Column(db.String(100))
    dinh_muc = db.Column(db.String(50))
    ngay_van_hanh = db.Column(db.String(20))
    gio_bat_dau = db.Column(db.String(10))
    gio_ket_thuc = db.Column(db.String(10))
    thoi_gian_hoat_dong = db.Column(db.Float)
    nhien_lieu_tieu_hao = db.Column(db.Float)
    don_gia = db.Column(db.Float)
    thanh_tien = db.Column(db.Float)
    ghi_chu = db.Column(db.String(500))
    ket_qua_doi_soat = db.Column(db.String(200))
    nhien_lieu = db.Column(db.String(100))
    # Auto-import support (MFĐ from SmartW)
    status = db.Column(db.String(20), default='approved')   # approved / pending / rejected
    source = db.Column(db.String(20), default='manual')      # manual / smartw
    smartw_alarm_id = db.Column(db.String(100))               # Unique alarm ID (chống duplicate)


class FuelLedger(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # type: STOCK_IN (Nhập), STATION_OUT (Xuất), DIRECT_BUY (Mua thẳng), ADJUSTMENT (Hiệu chỉnh)
    type = db.Column(db.String(20), nullable=False)
    is_approved = db.Column(db.Boolean, default=True)
    ngay = db.Column(db.String(20))
    id_tram = db.Column(db.String(50))
    loai_nhien_lieu = db.Column(db.String(50))
    so_luong = db.Column(db.Float)
    don_gia = db.Column(db.Float)
    thanh_tien = db.Column(db.Float)
    nha_cung_cap = db.Column(db.String(200))
    nguoi_thuc_hien = db.Column(db.String(100))
    ghi_chu = db.Column(db.String(500))
    ton_sau_gd = db.Column(db.Float)               # NL tồn snapshot sau giao dịch (auto-calc, user có thể override)
    ngay_cap_nhat = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


class OtherExpense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ngay_su_dung = db.Column(db.String(20))
    noi_dung = db.Column(db.String(500))
    du_an = db.Column(db.String(200))
    so_tien = db.Column(db.Float)
    nguoi_tam_ung = db.Column(db.String(100))
    ghi_chu = db.Column(db.String(500))
    ngay_cap_nhat = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='nhanvien')  # admin / nhanvien / chuyenvien
    full_name = db.Column(db.String(100))
    phone_number = db.Column(db.String(20))


class DeletionRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    table_name = db.Column(db.String(50), nullable=False)
    record_id = db.Column(db.Integer, nullable=False)
    requested_by = db.Column(db.String(50), nullable=False)
    reason = db.Column(db.String(500))
    status = db.Column(db.String(20), default='Pending')
    timestamp = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))


class DailyWork(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ngay = db.Column(db.String(20))
    id_tram = db.Column(db.String(50))
    nhan_vien = db.Column(db.String(100))
    noi_dung = db.Column(db.Text)
    hang_muc = db.Column(db.String(200))
    ton_tai_vhkt = db.Column(db.Text)
    ton_tai_csht = db.Column(db.Text)
    ghi_chu = db.Column(db.Text)
    ngay_cap_nhat = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))


class StationIssue(db.Model):
    """Tồn tại kỹ thuật tại trạm BTS."""
    id = db.Column(db.Integer, primary_key=True)
    ngay_phat_hien = db.Column(db.String(20))           # YYYY-MM-DD
    id_tram = db.Column(db.String(50))
    hang_muc = db.Column(db.String(100))                # Dropdown 10 hạng mục
    mo_ta = db.Column(db.Text)                          # Free text
    trang_thai = db.Column(db.String(30), default='Chưa XL')  # Chưa XL / Đã XL
    nguoi_bao_cao = db.Column(db.String(100))
    ngay_cap_nhat = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))


# ============================================================================
# DATASITE v2 - 5 NHÓM MODELS (Refactor 2026-03-06)
# Nhóm 1: Thông Tin Chung (DsStation + DsContract)
# Nhóm 2: Cơ Sở Hạ Tầng (DsInfrastructure)
# Nhóm 3: Phụ Trợ (DsEquipment — category=PHU_TRO)
# Nhóm 4: Kỹ Thuật (DsTelecom — category=KY_THUAT)
# Nhóm 5: Cross-check (DataSiteAnomaly — giữ nguyên tên)
# ============================================================================

# Prefixes: Chỉ import trạm bắt đầu bằng DNTN, DNLK, DNXL, DNDQ, DNCM, DNTP
DATASITE_PREFIXES = ['DNTN', 'DNLK', 'DNXL', 'DNDQ', 'DNCM', 'DNTP']


# --- NHÓM 1: THÔNG TIN CHUNG ---

class DsStation(db.Model):
    """Thông tin chung trạm (gom từ thong tin chung.xlsx + data trạm nhà dân.xlsx)"""
    __tablename__ = 'ds_stations'
    id = db.Column(db.Integer, primary_key=True)
    site_id = db.Column(db.String(50), nullable=False, unique=True, index=True)
    ten_tram = db.Column(db.String(255))
    loai_tram = db.Column(db.String(100))           # Nhà Dân, Pháp Nhân, VNPT, VNPOST...
    dia_chi = db.Column(db.String(500))
    tinh_tp = db.Column(db.String(100))
    quan_huyen = db.Column(db.String(100))
    phuong_xa = db.Column(db.String(100))
    kinh_do = db.Column(db.String(50))
    vi_do = db.Column(db.String(50))
    ngay_phat_song = db.Column(db.String(20))
    hinh_thuc_dau_tu = db.Column(db.String(100))
    don_vi_dung_chung = db.Column(db.String(200))
    # Thông tin chung mở rộng (từ thong tin chung.xlsx) — lưu dạng JSON
    extra_data = db.Column(db.JSON)                    # Chứa thêm các thông tin: vùng 6 khu vực, loại cột, diện tích...
    sync_date = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    def to_dict(self):
        d = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        return d


class DsContract(db.Model):
    """Hợp đồng thuê trạm (gom từ data trạm nhà dân.xlsx)"""
    __tablename__ = 'ds_contracts'
    id = db.Column(db.Integer, primary_key=True)
    site_id = db.Column(db.String(50), nullable=False, index=True)
    # Chủ thể
    chu_the_hop_dong = db.Column(db.String(255))
    sdt_chu_nha = db.Column(db.String(50))
    cccd = db.Column(db.String(50))
    dia_chi_lien_he = db.Column(db.String(500))
    # Hợp đồng
    so_hd = db.Column(db.String(100))
    ngay_ky_hd = db.Column(db.String(20))
    ngay_ket_thuc_hd = db.Column(db.String(20))
    tinh_trang_hd = db.Column(db.String(100))        # Còn hạn, Hết hạn, Thanh lý...
    # Giá
    gia_thue_co_vat = db.Column(db.Float)
    gia_thue_khong_vat = db.Column(db.Float)
    gia_dien_khoan = db.Column(db.Float)
    # Thanh toán
    chu_ky_thanh_toan = db.Column(db.String(50))     # Quý, Tháng...
    ngay_bat_dau_thanh_toan = db.Column(db.String(20))
    da_thanh_toan_den = db.Column(db.String(20))
    # Ngân hàng
    chu_tai_khoan = db.Column(db.String(200))
    so_tai_khoan = db.Column(db.String(50))
    ngan_hang = db.Column(db.String(200))
    # Metadata mở rộng (phụ lục, ERP, thanh toán các tháng...)
    extra_data = db.Column(db.JSON)
    sync_date = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    def to_dict(self):
        d = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        return d


# --- NHÓM 2: CƠ SỞ HẠ TẦNG ---

class DsInfrastructure(db.Model):
    """Cơ sở hạ tầng trạm: Cột Anten, Phòng Máy, Phòng MFĐ"""
    __tablename__ = 'ds_infrastructure'
    id = db.Column(db.Integer, primary_key=True)
    site_id = db.Column(db.String(50), nullable=False, index=True)
    loai = db.Column(db.String(50), nullable=False)  # COT_ANTEN, PHONG_MAY, PHONG_MPD
    # Cột cứng (áp dụng cho các loại)
    serial = db.Column(db.String(200))
    trang_thai = db.Column(db.String(100))
    han_bao_hanh = db.Column(db.String(20))
    han_bao_duong = db.Column(db.String(20))
    # Metadata theo loại (JSON linh hoạt)
    # COT_ANTEN: {loai_cot, chieu_cao, den_bao_khong, dv_dung_chung, chieu_dai_cau_cap, dv_chu_quan}
    # PHONG_MAY: {loai_pm, vi_tri, dien_tich, dv_dung_chung, dv_chu_quan}
    # PHONG_MPD: {vi_tri, dien_tich, dv_dung_chung, dv_chu_quan}
    extra_data = db.Column(db.JSON)
    sync_date = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    def to_dict(self):
        d = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        return d


# --- NHÓM 3: PHỤ TRỢ (Thiết bị nguồn, môi trường) ---

class DsEquipment(db.Model):
    """Thiết bị Phụ trợ: Máy lạnh, MPĐ, Tủ nguồn, Accu, Solar, PCCC"""
    __tablename__ = 'ds_equipments'
    id = db.Column(db.Integer, primary_key=True)
    site_id = db.Column(db.String(50), nullable=False, index=True)
    loai = db.Column(db.String(50), nullable=False)  # MAY_LANH, MAY_PHAT, TU_NGUON, ACCU, SOLAR, PCCC
    # Cột cứng (chung cho tất cả thiết bị)
    nhan_hieu = db.Column(db.String(200))
    serial = db.Column(db.String(200))
    trang_thai = db.Column(db.String(100))           # Hoạt động tốt, Hỏng, Mới...
    han_bao_hanh = db.Column(db.String(20))
    han_bao_duong = db.Column(db.String(20))
    ngay_su_dung = db.Column(db.String(20))           # Ngày đưa vào sử dụng tại trạm
    # Metadata đặc thù loại (JSON linh hoạt) — VÔ HẠN THUỘC TÍNH
    # MAY_LANH:  {btu, loai_may_lanh, product_code, dv_chu_quan, don_vi_tinh, don_gia, vi_tri}
    # MAY_PHAT:  {cong_suat, phase, nhien_lieu, ats, product_code, dv_chu_quan, don_vi_tinh, don_gia, vi_tri}
    # TU_NGUON:  {so_khe_rect, so_luong_rect, cs_rect_w, dong_tai_a, backup_phut, product_code, hop_dong_du_an}
    # ACCU:      {loai_accu, dung_luong_ah, so_luong_binh, product_code}
    extra_data = db.Column(db.JSON)
    sync_date = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    def to_dict(self):
        d = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        return d


# --- NHÓM 4: KỸ THUẬT (Thiết bị Viễn Thông) ---

class DsTelecom(db.Model):
    """Thiết bị Kỹ thuật: BTS 2G/3G/4G/5G, DataCell, Truyền dẫn, Kiểm định"""
    __tablename__ = 'ds_telecom'
    id = db.Column(db.Integer, primary_key=True)
    site_id = db.Column(db.String(50), nullable=False, index=True)
    loai = db.Column(db.String(50), nullable=False)  # BTS_3G, BTS_4G, DATA_CELL, THIET_BI_VT, TRUYEN_DAN, KIEM_DINH
    # Cột cứng
    serial = db.Column(db.String(200))
    trang_thai = db.Column(db.String(100))
    han_bao_hanh = db.Column(db.String(20))
    han_bao_duong = db.Column(db.String(20))
    ngay_su_dung = db.Column(db.String(20))
    # Metadata đặc thù (JSON linh hoạt)
    # BTS_3G:    {chung_loai, hang_sx, rru, bbu}
    # BTS_4G:    {chung_loai, hang_sx, rru, bbu}
    # DATA_CELL: {cell, sector, enb_id, c_id, psc_pci, azimuth, height, m_tilt, e_tilt, tilt, voice, data, vlr}
    # THIET_BI_VT: {ten_tb, product_code, loai_tb, nha_cung_cap, thuoc_tram_remote}
    extra_data = db.Column(db.JSON)
    sync_date = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    def to_dict(self):
        d = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        return d


# --- NHÓM 5: CROSS-CHECK / DATA QUALITY ---

class DataSiteAnomaly(db.Model):
    """Bảng bắt lỗi dữ liệu DataSite (Cross-check)"""
    __tablename__ = 'datasite_anomalies'
    id = db.Column(db.Integer, primary_key=True)
    site_id = db.Column(db.String(50), nullable=False, index=True)
    issue_type = db.Column(db.String(50), nullable=False)  # MISSING, LOGIC_ERROR, EXPIRED, DUPLICATE
    description = db.Column(db.String(500))
    severity = db.Column(db.String(20), default='warning')  # info, warning, critical
    detected_at = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    is_resolved = db.Column(db.Boolean, default=False)
    resolved_at = db.Column(db.String(20))

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


# --- LEGACY: DataSiteAsset (sẽ xóa sau Phase 02 Migration) ---

class DataSiteAsset(db.Model):
    """LEGACY — Sẽ xóa sau khi Migration sang ds_equipments + ds_telecom + ds_infrastructure."""
    __tablename__ = 'datasite_assets'
    id = db.Column(db.Integer, primary_key=True)
    site_id = db.Column(db.String(50), nullable=False, index=True)
    asset_type = db.Column(db.String(50), nullable=False)
    asset_name = db.Column(db.String(255))
    brand = db.Column(db.String(100))
    capacity = db.Column(db.String(100))
    quantity = db.Column(db.Integer, default=1)
    status = db.Column(db.String(50))
    extra_info_1 = db.Column(db.String(255))
    extra_info_2 = db.Column(db.String(255))
    sync_date = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


# --- LEGACY MODELS (kept for DB compatibility, not used in new code) ---

class FuelRefillLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    id_tram = db.Column(db.String(50))
    ngay_cham = db.Column(db.String(20))
    so_luong = db.Column(db.Float)
    nguoi_cham = db.Column(db.String(100))
    loai_nhien_lieu = db.Column(db.String(100))
    ngay_cap_nhat = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    ghi_chu = db.Column(db.String(500))
    may_phat_dien = db.Column(db.String(100))
    dung_tich_may = db.Column(db.String(50))
    nhien_lieu_ton_uoc_luong = db.Column(db.Float)
    don_gia = db.Column(db.Float)
    thanh_tien = db.Column(db.Float)


class FuelPurchaseLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ngay_mua = db.Column(db.String(20))
    so_luong = db.Column(db.Float)
    don_gia = db.Column(db.Float)
    thanh_tien = db.Column(db.Float)
    nha_cung_cap = db.Column(db.String(200))
    loai_nhien_lieu = db.Column(db.String(100))
    ngay_cap_nhat = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    ghi_chu = db.Column(db.String(500))
    nguoi_mua = db.Column(db.String(100))
    id_tram = db.Column(db.String(50))


class MobileEquipment(db.Model):
    """Thiết bị lưu động: MPĐ lưu động, Pin lưu động"""
    id = db.Column(db.Integer, primary_key=True)
    ma_thiet_bi = db.Column(db.String(50), unique=True, nullable=False)  # MPD-01, PIN-01
    loai = db.Column(db.String(20), nullable=False)  # MPĐ / Pin
    thong_so = db.Column(db.String(100))  # 5KVA, 48V/100Ah
    trang_thai = db.Column(db.String(20), default='Tốt')  # Tốt / Hư
    vi_tri_hien_tai = db.Column(db.String(50), default='KHO')  # KHO / id_tram
    nl_ton = db.Column(db.Float, default=0)  # NL tồn theo máy (xăng)
    ghi_chu = db.Column(db.Text)
    ngay_tao = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    transfers = db.relationship('EquipmentTransfer', backref='equipment', lazy=True,
                                order_by='EquipmentTransfer.ngay_dieu_chuyen.desc()')


class EquipmentTransfer(db.Model):
    """Lịch sử điều chuyển thiết bị lưu động"""
    id = db.Column(db.Integer, primary_key=True)
    equipment_id = db.Column(db.Integer, db.ForeignKey('mobile_equipment.id'), nullable=False)
    tu_vi_tri = db.Column(db.String(50), nullable=False)  # KHO / id_tram
    den_vi_tri = db.Column(db.String(50), nullable=False)  # id_tram / KHO
    ngay_dieu_chuyen = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    nguoi_dieu_chuyen = db.Column(db.String(100))
    ghi_chu = db.Column(db.String(500))

