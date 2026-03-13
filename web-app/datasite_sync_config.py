"""
datasite_sync_config.py
────────────────────────────────────────────────────────────────────
Cấu hình cho DataSite Deep Sync (Phase 03).

Chiến lược: "Export-based Bulk Sync"
  - Scraper sẽ mở popup "Xuất dữ liệu báo cáo" trên DataSite.
  - Chọn từng "Đối tượng" trong dropdown.
  - Tải file Excel về và parse vào DB.

EXPORT_OBJECT_MAP:
  Key   = Tên Đối tượng CHÍNH XÁC như trên dropdown DataSite (uppercase).
  Value = dict với:
    - db_table   : Model DB để lưu ('infrastructure', 'equipment', 'telecom')
    - loai       : Giá trị cột `loai` (nhóm UI lớn)
    - ui_group   : Tên hiển thị nhóm trên giao diện App
    - ui_label   : Tên hiển thị đối tượng trên giao diện App
    - col_map    : Dict map column Excel → field DB (extra_data nếu không có cột cứng)
────────────────────────────────────────────────────────────────────
"""

# Nhóm UI hiển thị trên DataSite Dashboard (gộp các đối tượng nhỏ lại)
UI_GROUPS = {
    'HA_TANG':   {'label': 'Hạ Tầng',        'icon': 'bi-building',       'color': 'primary'},
    'PHU_TRO':   {'label': 'Phụ Trợ',         'icon': 'bi-tools',          'color': 'warning'},
    'KY_THUAT':  {'label': 'Kỹ Thuật',        'icon': 'bi-broadcast',      'color': 'info'},
    'TRUYEN_DAN':{'label': 'Truyền Dẫn',      'icon': 'bi-diagram-3',      'color': 'secondary'},
    'HOP_DONG':  {'label': 'Hợp Đồng',        'icon': 'bi-file-earmark-text', 'color': 'success'},
}

# ──────────────────────────────────────────────────────────────────
# EXPORT OBJECT MAP
# ──────────────────────────────────────────────────────────────────
EXPORT_OBJECT_MAP = {

    # ── HẠ TẦNG ──────────────────────────────────────────────────
    'PHÒNG MÁY': {
        'db_table': 'infrastructure',
        'loai':     'PHONG_MAY',
        'ui_group': 'HA_TANG',
        'ui_label': 'Phòng Máy',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
            'Hạn Bảo Dưỡng':   'han_bao_duong',
            # Còn lại → extra_data
        },
    },
    'PHÒNG MPĐ': {
        'db_table': 'infrastructure',
        'loai':     'PHONG_MPD',
        'ui_group': 'HA_TANG',
        'ui_label': 'Phòng MPĐ',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
            'Hạn Bảo Dưỡng':   'han_bao_duong',
        },
    },
    'NHÀ TRẠM (THEO BỘ)': {
        'db_table': 'infrastructure',
        'loai':     'NHA_TRAM_BO',
        'ui_group': 'HA_TANG',
        'ui_label': 'Nhà Trạm (Bộ)',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
            'Hạn Bảo Dưỡng':   'han_bao_duong',
        },
    },
    'NHÀ TRẠM (ĐƠN CHIẾC)': {
        'db_table': 'infrastructure',
        'loai':     'NHA_TRAM_DC',
        'ui_group': 'HA_TANG',
        'ui_label': 'Nhà Trạm (Đơn chiếc)',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
            'Hạn Bảo Dưỡng':   'han_bao_duong',
        },
    },
    'NHÀ ĐIỀU HÀNH': {
        'db_table': 'infrastructure',
        'loai':     'NHA_DIEU_HANH',
        'ui_group': 'HA_TANG',
        'ui_label': 'Nhà Điều Hành',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
            'Hạn Bảo Dưỡng':   'han_bao_duong',
        },
    },

    # ── PHỤ TRỢ ──────────────────────────────────────────────────
    'MÁY PHÁT ĐIỆN': {
        'db_table': 'equipment',
        'loai':     'MAY_PHAT',
        'ui_group': 'PHU_TRO',
        'ui_label': 'Máy Phát Điện',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Nhãn Hiệu':        'nhan_hieu',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
            'Hạn Bảo Dưỡng':   'han_bao_duong',
            'Ngày Sử Dụng':    'ngay_su_dung',
        },
    },
    'MÁY LẠNH': {
        'db_table': 'equipment',
        'loai':     'MAY_LANH',
        'ui_group': 'PHU_TRO',
        'ui_label': 'Máy Lạnh',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Nhãn Hiệu':        'nhan_hieu',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
            'Hạn Bảo Dưỡng':   'han_bao_duong',
            'Ngày Sử Dụng':    'ngay_su_dung',
        },
    },
    'RECTIFIER': {
        'db_table': 'equipment',
        'loai':     'TU_NGUON',
        'ui_group': 'PHU_TRO',
        'ui_label': 'Rectifier / Tủ Nguồn',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Nhãn Hiệu':        'nhan_hieu',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
            'Hạn Bảo Dưỡng':   'han_bao_duong',
            'Ngày Sử Dụng':    'ngay_su_dung',
        },
    },
    'NGUỒN ĐIỆN': {
        'db_table': 'equipment',
        'loai':     'TU_NGUON',
        'ui_group': 'PHU_TRO',
        'ui_label': 'Nguồn Điện',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Nhãn Hiệu':        'nhan_hieu',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
            'Hạn Bảo Dưỡng':   'han_bao_duong',
        },
    },
    'PIN NLMT': {
        'db_table': 'equipment',
        'loai':     'SOLAR',
        'ui_group': 'PHU_TRO',
        'ui_label': 'Pin Năng Lượng Mặt Trời',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Nhãn Hiệu':        'nhan_hieu',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
            'Hạn Bảo Dưỡng':   'han_bao_duong',
            'Ngày Sử Dụng':    'ngay_su_dung',
        },
    },
    'NĂNG LƯỢNG MẶT TRỜI': {
        'db_table': 'equipment',
        'loai':     'SOLAR',
        'ui_group': 'PHU_TRO',
        'ui_label': 'Năng Lượng Mặt Trời',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Nhãn Hiệu':        'nhan_hieu',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
            'Hạn Bảo Dưỡng':   'han_bao_duong',
        },
    },
    'QUẠT THÔNG GIÓ': {
        'db_table': 'equipment',
        'loai':     'QUAT',
        'ui_group': 'PHU_TRO',
        'ui_label': 'Quạt Thông Gió',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Nhãn Hiệu':        'nhan_hieu',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
        },
    },
    'MÁY ĐO': {
        'db_table': 'equipment',
        'loai':     'MAY_DO',
        'ui_group': 'PHU_TRO',
        'ui_label': 'Máy Đo',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Nhãn Hiệu':        'nhan_hieu',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
        },
    },

    # ── KỸ THUẬT ─────────────────────────────────────────────────
    'TBVT': {
        'db_table': 'telecom',
        'loai':     'THIET_BI_VT',
        'ui_group': 'KY_THUAT',
        'ui_label': 'Thiết Bị Viễn Thông (TBVT)',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
            'Hạn Bảo Dưỡng':   'han_bao_duong',
            'Ngày Sử Dụng':    'ngay_su_dung',
        },
    },
    'SFP BBU_RRU': {
        'db_table': 'telecom',
        'loai':     'THIET_BI_VT',
        'ui_group': 'KY_THUAT',
        'ui_label': 'SFP / BBU / RRU',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
        },
    },
    'PHẦN MỀM': {
        'db_table': 'telecom',
        'loai':     'PHAN_MEM',
        'ui_group': 'KY_THUAT',
        'ui_label': 'Phần Mềm',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
        },
    },
    'REPEATER': {
        'db_table': 'telecom',
        'loai':     'REPEATER',
        'ui_group': 'KY_THUAT',
        'ui_label': 'Repeater',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Nhãn Hiệu':        'nhan_hieu',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
            'Hạn Bảo Dưỡng':   'han_bao_duong',
        },
    },

    # ── TRUYỀN DẪN (dự phòng tương lai) ─────────────────────────
    'THIẾT BỊ TRUYỀN DẪN METRO': {
        'db_table': 'telecom',
        'loai':     'TRUYEN_DAN',
        'ui_group': 'TRUYEN_DAN',
        'ui_label': 'Truyền Dẫn Metro',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
        },
    },
    'THIẾT BỊ TRUYỀN DẪN QUANG (ACCESS)': {
        'db_table': 'telecom',
        'loai':     'TRUYEN_DAN',
        'ui_group': 'TRUYEN_DAN',
        'ui_label': 'Truyền Dẫn Quang (Access)',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
        },
    },
    'THIẾT BỊ (THEO BỘ)': {
        'db_table': 'telecom',
        'loai':     'THIET_BI_BO',
        'ui_group': 'KY_THUAT',
        'ui_label': 'Thiết Bị (Theo Bộ)',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
        },
    },
    'THIẾT BỊ (ĐƠN CHIẾC)': {
        'db_table': 'telecom',
        'loai':     'THIET_BI_DC',
        'ui_group': 'KY_THUAT',
        'ui_label': 'Thiết Bị (Đơn Chiếc)',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
        },
    },
    'THIẾT BỊ FTTX': {
        'db_table': 'telecom',
        'loai':     'FTTX',
        'ui_group': 'KY_THUAT',
        'ui_label': 'Thiết Bị FTTX',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
        },
    },
    'THIẾT BỊ CHỐNG SÉT (SPD)': {
        'db_table': 'equipment',
        'loai':     'CHONG_SET',
        'ui_group': 'PHU_TRO',
        'ui_label': 'Chống Sét (SPD)',
        'col_map': {
            'Mã Trạm':          'site_id',
            'Serial':           'serial',
            'Trạng Thái':       'trang_thai',
            'Hạn Bảo Hành':    'han_bao_hanh',
        },
    },
}

# Helper: Lấy tất cả các đối tượng theo UI_GROUP
def get_objects_by_group(group_key: str) -> list:
    """Trả về list tên đối tượng DataSite thuộc nhóm UI."""
    return [obj for obj, cfg in EXPORT_OBJECT_MAP.items() if cfg['ui_group'] == group_key]

# Helper: Lấy config của một đối tượng
def get_object_config(object_name: str) -> dict | None:
    return EXPORT_OBJECT_MAP.get(object_name.upper().strip())

# Danh sách tất cả tên đối tượng hợp lệ để validate
ALL_EXPORT_OBJECTS = list(EXPORT_OBJECT_MAP.keys())
