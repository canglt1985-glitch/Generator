# 🌲 SmartW Đà Lạt — Hệ Thống Tự Động Hóa Vận Hành Mạng Lưới

> **Đơn vị sử dụng:** Tổ Viễn thông Đà Lạt — MobiFone Tỉnh Lâm Đồng  
> **Phiên bản:** 1.0.0 (Scale từ kiến trúc TVT3 Đồng Nai)  
> **Ngôn ngữ & Nền tảng:** Python 3.10+ • Playwright Headless • Asyncio  

---

## 🎯 Giới Thiệu
Hệ thống **SmartW Đà Lạt** là giải pháp tự động hóa toàn diện dành cho anh em kỹ thuật Tổ Viễn thông Đà Lạt:
- 🚨 **Cào và cảnh báo MLL tức thời:** Quét trạng thái MLL Trạm & MLL Cell trên SmartW, phát thông báo tự động về nhóm Telegram/Viber của Tổ.
- ⚡ **Theo dõi Mất điện (AC Fail) & Máy phát điện:** Giám sát thời gian mất điện, đối soát lịch sử chạy máy.
- 🎫 **Cảnh báo Phản ánh khách hàng (PAKH):** Nhắc nhở xử lý phiếu khi có phát sinh mới.
- 🛡️ **Bộ lọc chống nhiễu (Anti-Flapping):** Chặn hoàn toàn tin nhắn spam do link truyền dẫn rung lắc chập chờn.
- 🔄 **Watchdog tự phục hồi:** Tiến trình chạy ngầm bền bỉ 24/7, tự động kết nối lại khi rớt mạng Internet.

---

## 🚀 Hướng Dẫn Cài Đặt (Trong 5 phút)

### Bước 1: Chuẩn bị môi trường Python
Yêu cầu máy tính cài đặt **Python 3.10** trở lên. Mở Terminal (hoặc Command Prompt trên Windows) tại thư mục dự án:

```bash
# 1. Tạo môi trường ảo
python3 -m venv .venv

# 2. Kích hoạt môi trường ảo
# Trên macOS / Linux:
source .venv/bin/activate
# Trên Windows:
# .venv\Scripts\activate

# 3. Cài đặt các thư viện cần thiết
pip install -r requirements.txt

# 4. Cài đặt trình duyệt Playwright Chromium
playwright install chromium
```

---

### Bước 2: Cấu hình biến môi trường (`.env`)
Sao chép file `.env.example` thành `.env`:

```bash
cp .env.example .env
```

Mở file `.env` và điền các thông tin:
```ini
# 1. Tài khoản đăng nhập SmartW
SMARTW_USER=ten_dang_nhap_sso
SMARTW_PASSWORD=mat_khau_sso

# 2. Tên đơn vị trên SmartW (Khớp với bộ lọc trên web SmartW)
SMARTW_TEAM="TVT Đà Lạt"          # Tên Tổ hiển thị trên SmartW
SMARTW_GROUP="PVT Lâm Đồng"       # Tên Nhóm/Phòng
SMARTW_TRUNG_TAM="MobiFone Lâm Đồng"
SMARTW_PROVINCE="Tỉnh Lâm Đồng"
SMARTW_REGION="MN"

# 3. Kênh nhận thông báo Telegram của Tổ
TELEGRAM_BOT_TOKEN="bot_token_tao_tu_botfather"
TELEGRAM_CHAT_ID="id_nhom_chat_telegram"
```

---

### Bước 3: Chạy thử nghiệm chẩn đoán kết nối
Chạy script kiểm tra để xác nhận đăng nhập SSO và tên Tổ trên SmartW:

```bash
python scripts/test_smartw_connection.py
```

*Nếu màn hình báo `🎉 ĐĂNG NHẬP SSO THÀNH CÔNG!` và quét ra cảnh báo của Tổ Đà Lạt là hệ thống đã sẵn sàng 100%!*

---

## 📊 Cập Nhật Danh Bạ Trạm Đà Lạt

Để hệ thống hiển thị chi tiết tên trạm, quản lý trạm và tỷ lệ rớt cell `(x/y)`:
1. **Danh bạ trạm:** Cập nhật file `data/sites_dalat.json` với danh sách trạm của Đà Lạt (mã mới, mã cũ, tên trạm, tên QLT, SĐT QLT).
2. **Tổng số cell trạm:** Cập nhật file `data/site_cell_count.json` với dạng `{"LDDL01": 6, "LDDL02": 9}` để bot tự động tính tỷ lệ cell rớt.

---

## 🏃 Vận Hành Tự Động 24/7

Khởi chạy daemon giám sát với Watchdog tự phục hồi:

```bash
python run_workers.py
```

- Watchdog sẽ tự động kích hoạt quét MLL mỗi **60 giây**.
- Quét PAKH mỗi **5 phút**.
- Mọi nhật ký hoạt động được ghi tự động vào thư mục `logs/watchdog.log` và `logs/smartw_worker.log`.

---

## 📁 Cấu Trúc Mã Nguồn

```
SmartW_DaLat/
├── .env.example             # File mẫu cấu hình
├── requirements.txt         # Danh mục thư viện
├── README.md                # Tài liệu hướng dẫn
├── run_workers.py           # Watchdog giám sát chạy nền
├── smartw_worker.py         # Entrypoint cào và phát cảnh báo
├── smartw/                  # Package lõi SmartW
│   ├── config.py            # Quản lý cấu hình & mã hóa mật khẩu
│   ├── scraper.py           # Playwright Scraper cào dữ liệu SmartW
│   ├── alarm_fsm.py         # Bộ lọc trạng thái FSM (Debounce & Flapping)
│   ├── site_resolver.py     # Nhận diện mã trạm Đà Lạt
│   └── mfd_import.py        # Xử lý máy phát điện
├── data/                    # Dữ liệu trạm & cache SmartW
│   ├── sites_dalat.json     # Danh bạ trạm Đà Lạt
│   └── site_cell_count.json # Bảng số lượng cell từng trạm
└── scripts/
    └── test_smartw_connection.py # Tool test đăng nhập & kiểm tra team
```
