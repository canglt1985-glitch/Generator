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
    role = db.Column(db.String(20), default='user')
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

