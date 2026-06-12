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

    @property
    def end_datetime_formatted(self):
        if not self.gio_ket_thuc or not self.ngay_van_hanh:
            return self.gio_ket_thuc or '--'
        try:
            from datetime import datetime, timedelta
            start_dt = datetime.strptime(f"{self.ngay_van_hanh} {self.gio_bat_dau}", "%Y-%m-%d %H:%M")
            start_time = datetime.strptime(self.gio_bat_dau, "%H:%M").time()
            end_time = datetime.strptime(self.gio_ket_thuc, "%H:%M").time()
            end_dt = datetime.combine(start_dt.date(), end_time)
            
            # If end time is earlier in the day than start time, it's likely overnight
            if end_time < start_time:
                end_dt += timedelta(days=1)
                return end_dt.strftime("%d/%m/%Y %H:%M")
            else:
                return end_dt.strftime("%H:%M")
        except Exception:
            return self.gio_ket_thuc



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
    sdt_chu_nha = db.Column(db.String(255))
    cccd = db.Column(db.String(100))
    dia_chi_lien_he = db.Column(db.String(500))
    # Hợp đồng
    so_hd = db.Column(db.String(200))
    ngay_ky_hd = db.Column(db.String(50))
    ngay_ket_thuc_hd = db.Column(db.String(50))
    tinh_trang_hd = db.Column(db.String(100))        # Còn hạn, Hết hạn, Thanh lý...
    # Giá
    gia_thue_co_vat = db.Column(db.Float)
    gia_thue_khong_vat = db.Column(db.Float)
    gia_dien_khoan = db.Column(db.Float)
    # Thanh toán
    chu_ky_thanh_toan = db.Column(db.String(100))     # Quý, Tháng...
    ngay_bat_dau_thanh_toan = db.Column(db.String(50))
    da_thanh_toan_den = db.Column(db.String(50))
    # Ngân hàng
    chu_tai_khoan = db.Column(db.String(200))
    so_tai_khoan = db.Column(db.String(100))
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
    loai = db.Column(db.String(50), nullable=False)  # Nhóm UI: COT_ANTEN, PHONG_MAY, PHONG_MPD
    subcategory = db.Column(db.String(100))          # Đối tượng thực tế từ DataSite Export (VD: 'PHÒNG MÁY')
    # Cột cứng (áp dụng cho các loại)
    serial = db.Column(db.String(200))
    trang_thai = db.Column(db.String(100))
    han_bao_hanh = db.Column(db.String(100))
    han_bao_duong = db.Column(db.String(100))
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
    loai = db.Column(db.String(50), nullable=False)  # Nhóm UI: MAY_LANH, MAY_PHAT, TU_NGUON...
    subcategory = db.Column(db.String(100))          # Đối tượng thực tế từ DataSite Export (VD: 'MÁY PHÁT ĐIỆN')
    # Cột cứng (chung cho tất cả thiết bị)
    nhan_hieu = db.Column(db.String(200))
    serial = db.Column(db.String(200))
    trang_thai = db.Column(db.String(100))           # Hoạt động tốt, Hỏng, Mới...
    han_bao_hanh = db.Column(db.String(100))
    han_bao_duong = db.Column(db.String(100))
    ngay_su_dung = db.Column(db.String(100))           # Ngày đưa vào sử dụng tại trạm
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
    loai = db.Column(db.String(50), nullable=False)  # Nhóm UI: BTS_3G, DATA_CELL, THIET_BI_VT, TRUYEN_DAN...
    subcategory = db.Column(db.String(100))          # Đối tượng thực tế từ DataSite Export (VD: 'THIẾT BỊ TRUYỀN DẪN METRO')
    # Cột cứng
    serial = db.Column(db.String(200))
    trang_thai = db.Column(db.String(100))
    han_bao_hanh = db.Column(db.String(100))
    han_bao_duong = db.Column(db.String(100))
    ngay_su_dung = db.Column(db.String(100))
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


# --- NHÓM 6: TRUYỀN DẪN (Bổ sung 2026-04-03) ---

class DsTransmission(db.Model):
    """Thông tin Truyền dẫn tại trạm (Bổ sung 2026-04-03)"""
    __tablename__ = 'ds_transmissions'
    id = db.Column(db.Integer, primary_key=True)
    site_id = db.Column(db.String(50), nullable=False, index=True)
    loai_ket_noi = db.Column(db.String(50))           # FO/MW/LL
    thiet_bi_td = db.Column(db.String(200))           # Thiết bị TD 3G/4G/FO
    huong_ket_noi = db.Column(db.String(500))         # Hướng(Viba/FO/LL/SW/IDU share)
    node_csg = db.Column(db.String(100))              # Node CSG
    chung_loai_csg = db.Column(db.String(200))        # Chủng loại CSG
    chu_dau_tu_cap = db.Column(db.String(200))        # Chủ đầu tư cáp
    don_vi_van_hanh_cap = db.Column(db.String(200))   # đơn vị vận hành cáp
    chung_loai_cwdm = db.Column(db.String(255))       # Chủng loại CWDM
    hang_sx_cwdm = db.Column(db.String(100))          # hãng SX CWDM
    sync_date = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


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
                                cascade="all, delete-orphan",
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

class SystemConfig(db.Model):
    """Cấu hình hệ thống (lưu mật khẩu, mốc thời gian, thông số chung)"""
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), nullable=False, unique=True, index=True)
    value = db.Column(db.String(500))
    description = db.Column(db.String(200))
    updated_at = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    updated_by = db.Column(db.String(100))


# ============================================================================
# WIRELESS REGISTRY v1 - ENTERPRISE GRADE (2026-04-06)
# Quản lý danh mục Site/Cell và Lịch sử thay đổi thông số Anten
# ============================================================================

class DsSiteRegistry(db.Model):
    """Bảng Registry quản lý ánh xạ Site ID cũ và mới + Thông số hạ tầng anten"""
    __tablename__ = 'ds_site_registry'
    id = db.Column(db.Integer, primary_key=True)
    site_id_new = db.Column(db.String(50), unique=True, nullable=False, index=True)
    site_id_old = db.Column(db.String(50), index=True)
    ten_tram_moi = db.Column(db.String(255))
    tinh = db.Column(db.String(100))
    huyen = db.Column(db.String(100))
    xa = db.Column(db.String(100))
    lat = db.Column(db.Float)
    long = db.Column(db.Float)
    antenna_height = db.Column(db.Float) # Chiều cao anten (m)
    team = db.Column(db.String(50))      # Tổ kỹ thuật
    zone = db.Column(db.String(50))      # KV 7, KV 8...
    sync_date = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    # Link tới các cell
    cells = db.relationship('DsCellRegistry', backref='site', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


class DsCellRegistry(db.Model):
    """Bảng chi tiết từng Cell/Sector: Tilt, Azimuth hiện tại"""
    __tablename__ = 'ds_cell_registry'
    id = db.Column(db.Integer, primary_key=True)
    site_id_new = db.Column(db.String(50), db.ForeignKey('ds_site_registry.site_id_new'), nullable=False, index=True)
    cell_id_new = db.Column(db.String(100), unique=True, index=True)
    cell_id_old = db.Column(db.String(100), index=True)
    ran_type = db.Column(db.String(20)) # 3G / 4G
    pci_psc = db.Column(db.String(50))
    node_id = db.Column(db.String(50))
    cell_id_num = db.Column(db.String(50)) # ID số của cell
    azimuth = db.Column(db.Float)
    tilt = db.Column(db.Float)
    antenna_height = db.Column(db.Float) # Chiều cao anten riêng biệt cho từng Cell (m)
    vendor = db.Column(db.String(50))
    sync_date = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


class DsWirelessHistory(db.Model):
    """Nhật ký thay đổi thông số vô tuyến (Audit Log - ENTERPRISE LEVEL)"""
    __tablename__ = 'ds_wireless_history'
    id = db.Column(db.Integer, primary_key=True)
    cell_id_new = db.Column(db.String(100), index=True, nullable=False)
    parameter = db.Column(db.String(50))       # 'TILT', 'AZIMUTH', 'PCI'...
    old_value = db.Column(db.String(100))
    new_value = db.Column(db.String(100))
    change_type = db.Column(db.String(50))     # 'IMPORT' (từ Excel), 'MANUAL' (Sửa tay)
    changed_by = db.Column(db.String(100))     # Username
    changed_at = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    note = db.Column(db.String(500))

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


class ParsedInvoice(db.Model):
    __tablename__ = 'parsed_invoice'
    id = db.Column(db.Integer, primary_key=True)
    ngay_lap = db.Column(db.String(20))
    so_hd = db.Column(db.String(50))
    seller_name = db.Column(db.String(255))
    seller_mst = db.Column(db.String(50))
    buyer_name = db.Column(db.String(255))
    buyer_mst = db.Column(db.String(50))
    tong_tien = db.Column(db.Float)
    loai_chi_phi = db.Column(db.String(50))  # 'Mua dầu' hoặc 'Chi phí khác'
    items_json = db.Column(db.JSON)         # Chi tiết các mặt hàng
    source = db.Column(db.String(100))       # e.g., 'Gmail: abc@gmail.com' hoặc 'Tải lên thủ công'
    status = db.Column(db.String(20), default='Pending') # Pending / Approved / Discarded
    fuel_qty = db.Column(db.Float)
    fuel_price = db.Column(db.Float)
    fuel_item_name = db.Column(db.String(255))
    invoice_url = db.Column(db.String(500))
    kh_hd = db.Column(db.String(50))
    ma_tra_cuu = db.Column(db.String(50))
    sub_total = db.Column(db.Float)
    vat_amount = db.Column(db.Float)
    created_at = db.Column(db.String(20), default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    @property
    def fuel_details(self):
        import re
        import json
        
        def safe_float(val):
            try:
                if val is None:
                    return 0.0
                val_str = str(val).replace(',', '').strip()
                return float(val_str)
            except:
                return 0.0

        items = self.items_json or []
        if isinstance(items, str):
            try:
                items = json.loads(items)
            except:
                items = []
        if not isinstance(items, list):
            items = []
            
        qty_d = 0.0
        price_d = 0.0
        amount_d = 0.0
        qty_x = 0.0
        price_x = 0.0
        amount_x = 0.0
        
        prices_d = []
        prices_x = []
        
        for it in items:
            if not isinstance(it, dict):
                continue
            ten = (it.get("ten") or "").strip()
            ten_lower = ten.lower()
            qty = safe_float(it.get("sl"))
            price = safe_float(it.get("dg"))
            amount = safe_float(it.get("tt"))
            
            is_dau = any(k in ten_lower for k in ["dầu", "dau", "diesel", "điêzen", "diezen"]) or (re.search(r'\bdo\b', ten_lower) is not None)
            is_xang = any(k in ten_lower for k in ["xăng", "xang", "ron", "e5", "a95", "95", "92"])
            
            if is_dau:
                qty_d += qty
                amount_d += amount
                if price > 0:
                    prices_d.append(price)
            elif is_xang:
                qty_x += qty
                amount_x += amount
                if price > 0:
                    prices_x.append(price)
                    
        # Fallback to general fuel fields if no items parsed yet or totals are zero
        if qty_d == 0.0 and qty_x == 0.0:
            fuel_name = (self.fuel_item_name or "").lower()
            qty = safe_float(self.fuel_qty)
            price = safe_float(self.fuel_price)
            amount = safe_float(self.sub_total or self.tong_tien)
            
            if fuel_name:
                if any(k in fuel_name for k in ["xăng", "xang", "ron", "e5", "95", "92"]):
                    qty_x = qty
                    price_x = price
                    amount_x = amount
                else:
                    qty_d = qty
                    price_d = price
                    amount_d = amount
            else:
                # If there's fuel qty/price in database, assume Dầu as default
                if qty > 0:
                    qty_d = qty
                    price_d = price
                    amount_d = amount

        # Get first price or fallback
        price_d = prices_d[0] if prices_d else (price_d or (safe_float(self.fuel_price) if qty_d > 0 else 0.0))
        price_x = prices_x[0] if prices_x else (price_x or (safe_float(self.fuel_price) if qty_x > 0 else 0.0))
        
        # Determine fuel type string
        if qty_d > 0 and qty_x > 0:
            loai_nl = "Dầu + Xăng"
        elif qty_d > 0:
            loai_nl = "Dầu"
        elif qty_x > 0:
            loai_nl = "Xăng"
        else:
            loai_nl = "Khác"
            
        return {
            "qty_d": qty_d,
            "price_d": price_d,
            "amount_d": amount_d,
            "qty_x": qty_x,
            "price_x": price_x,
            "amount_x": amount_x,
            "loai_nl": loai_nl
        }

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


