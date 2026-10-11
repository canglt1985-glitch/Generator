# 📡 HỆ THỐNG QUẢN TRỊ & TỰ ĐỘNG HÓA VẬN HÀNH TVT3

Hệ thống quản trị kỹ thuật, điều hành máy phát điện, giám sát sự cố mạng vô tuyến (MLL/MPĐ/PAKH) và hợp đồng nhà trạm viễn thông khu vực Đồng Nai (**Tổ Viễn Thông 3 - MobiFone**).

---

## 🏛️ KIẾN TRÚC TỔNG THỂ

Hệ thống hoạt động theo mô hình 3 lớp phân tầng:

```
┌────────────────────────────────────────────────────────┐
│                   SUPABASE POSTGRESQL                  │
│       (datasites, generator_logs, invoices, etc.)      │
└───────────────▲────────────────────────▲───────────────┘
                │                        │
┌───────────────┴───────────────┐ ┌──────┴───────────────┐
│        BACKEND DAEMONS        │ │       FRONTEND       │
│     (Python 3.14 + asyncio)   │ │  (React 19 + Vite)   │
├───────────────────────────────┤ ├──────────────────────┤
│ • run_workers.py (Watchdog)   │ │ • Bản đồ GIS trạm    │
│ • bot_telegram.py             │ │ • Quản lý MPĐ & Cúp  │
│ • bot_mll_tvt3.py             │ │ • Xuất 02A TTNB & B4 │
│ • site_contract_bot.py        │ │ • Hồ sơ HĐ & CSHT    │
│ • smartw_worker.py (Playwright│ │ • Realtime Alerts    │
└───────────────────────────────┘ └──────────────────────┘
```

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY (LOCAL RUNNER)

### 1. Khởi chạy Backend Daemons (Workers & Bots)
Trên máy macOS hoặc Linux:
```bash
# Sử dụng môi trường ảo đã hợp nhất (.venv -> backend/.venv)
.venv/bin/python backend/run_workers.py
```

Trên Windows:
```cmd
run_workers.bat
```

Tiến trình `run_workers.py` là bộ điều phối đơn phiên (Single-Instance Watchdog) tự động quản lý vòng đời của:
- `bot_telegram.py`: Bot điều hành tổng hợp.
- `bot_mll_tvt3.py`: Bot cảnh báo MLL mạng vô tuyến.
- `bots/site_contract_bot.py`: Bot tra cứu DataSite, hợp đồng và GPS trạm.
- `smartw_worker.py`: Bộ cào dữ liệu định kỳ SmartW (MLL, MPĐ, PAKH).
- Tự động xoay vòng log an toàn ở ngưỡng **5 MB** (`open_rotating_log`).

### 2. Khởi chạy Frontend Web Desktop App
```bash
cd tvt3_v2
npm install
npm run dev
# Mở trình duyệt tại: http://localhost:5173
```

---

## 🤖 LỆNH ĐIỀU HÀNH BOT TELEGRAM

Bot tra cứu DataSite & Hợp đồng TVT3 (`@TVT3_NLMPD_BOT`):
- `/start` hoặc `/help`: Xem hướng dẫn sử dụng và trạng thái kết nối.
- `/tram [MãTrạm]`: Tra cứu hồ sơ đầy đủ trạm (tọa độ, địa chỉ, chủ nhà, thiết bị).
- `/csht [MãTrạm]`: Tra cứu hiện trạng cơ sở hạ tầng, cột anten, máy lạnh.
- `/hd [MãTrạm]`: Xem chi tiết hợp đồng thuê mặt bằng & CSHT.
- `/khoa [MãTrạm]`: Tra cứu loại khóa và vị trí chìa khóa vào trạm.
- `/vaotram [MãTrạm]`: Xem số điện thoại chủ nhà và người liên hệ dẫn đường.
- **Chia sẻ vị trí Live GPS:** Tự động tìm kiếm các trạm gần nhất trong bán kính 5km.

---

## 📚 TÀI LIỆU KỸ THUẬT QUAN TRỌNG

Tất cả các tài liệu quy chuẩn vận hành được lưu trữ tại thư mục [docs/](file:///Users/cang_it/Antigravity/TVT3/docs):
- [GENERATOR_INVOICE_SETTLEMENT_RULES.md](file:///Users/cang_it/Antigravity/TVT3/docs/GENERATOR_INVOICE_SETTLEMENT_RULES.md): Quy tắc phân bổ & giảm giá vốn hóa đơn chạy máy.
- [design-specs-datasites-v2.md](file:///Users/cang_it/Antigravity/TVT3/docs/design-specs-datasites-v2.md): Đặc tả kiến trúc DataSite V2.
- [design-specs-sran-tvt3.md](file:///Users/cang_it/Antigravity/TVT3/docs/design-specs-sran-tvt3.md): Đặc tả kỹ thuật dự án SRAN & 5G TVT3.
- [datasite_headers.md](file:///Users/cang_it/Antigravity/TVT3/docs/datasite_headers.md): Cấu trúc trường dữ liệu Excel DataSite.
- [docs/reports/](file:///Users/cang_it/Antigravity/TVT3/docs/reports): Báo cáo khám sức khỏe hệ thống và nhật ký kiểm tra định kỳ.