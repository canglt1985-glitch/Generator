# 💡 BRIEF: Di Chuyển & Chuẩn Hóa Backend Workers Sang V2

**Ngày tạo:** 2026-06-16
**Người thực hiện:** Antigravity (Brainstorm Partner)

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
Hiện tại, hệ thống V2 (`tvt3_v2` chạy React SPA + Supabase) hoạt động rất tốt cho luồng nghiệp vụ Frontend. Tuy nhiên, các cấu phần chạy ngầm (Workers/Scrapers/Bots) vẫn đang nằm lẫn lộn trong thư mục `web-app/` của V1.
- Code V2 bị ràng buộc bởi các thư viện cũ của Flask và SQLAlchemy.
- Khó cấu hình chạy daemon độc lập cho V2 vì các biến môi trường và tệp tin cấu hình chồng chéo.
- Một số tác vụ (như quét Gmail đọc hóa đơn XML) vẫn đang chạy qua HTTP route của Flask chứ chưa được tách thành Worker độc lập chạy tự động.

---

## 2. GIẢI PHÁP ĐỀ XUẤT (KIẾN TRÚC WORKER V2 DECOUPLED)

Quy hoạch toàn bộ backend thành **Mô hình Worker Độc lập (Decoupled Workers)** chạy trực tiếp với Supabase V2:

```
┌────────────────────────────────────────────────────────┐
│               SUPABASE DATABASE V2 (Mây)               │
└───────────────────────────▲────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               │  Supabase Python Client │
               └────────────▲────────────┘
                            │
┌───────────────────────────┴────────────────────────────┐
│                  PYTHON WORKERS DAEMON                 │
│                                                        │
│ 🤖 1. Telegram Bot (bot_telegram.py)                   │
│    - Ghi nhận nhật ký chạy máy, phiếu dầu trực tiếp     │
│                                                        │
│ 🔌 2. EVN Outage Scraper (fetch_outages.py)            │
│    - Cào lịch mất điện EVN đưa vào power_schedule      │
│                                                        │
│ 🧠 3. SmartW Alarm Poll (smartw_worker.py)            │
│    - Giám sát cảnh báo trạm, bắn thông báo Viber/Tele  │
│                                                        │
│ ⛽ 4. PVOil Price Scraper (fuel_price.py)               │
│    - Cào giá dầu PVOil tự động                         │
│                                                        │
│ 🧾 5. Gmail Invoice Scanner (invoice_worker.py) [NEW]  │
│    - Quét Gmail tự động, parse XML hóa đơn chờ duyệt   │
└────────────────────────────────────────────────────────┘
```

---

## 3. PHẠM VI MVP & CÁC BƯỚC THỰC HIỆN

### 🚀 MVP (Bắt buộc có):
1. **Thiết lập thư mục `/backend` mới** ở thư mục gốc của dự án, hoàn toàn tách biệt khỏi `web-app` (V1).
2. **Khởi tạo môi trường ảo Python venv riêng biệt** cho V2 Backend với các thư viện cần thiết (`supabase-py`, `playwright`, `beautifulsoup4`, `python-dotenv`).
3. **Di chuyển và chuẩn hóa các script V2 đã có**:
   - `bot_telegram_v2.py` → `backend/bot_telegram.py`
   - `fetch_outages_v2.py` → `backend/fetch_outages.py`
   - `smartw/worker_v2.py` → `backend/smartw_worker.py`
4. **Tách và di chuyển các crawler/scrapers phụ trợ**:
   - `fuel_price.py` → `backend/fuel_price.py`
5. **Xây dựng `backend/invoice_worker.py` mới**:
   - Tách logic kết nối IMAP Gmail và parse XML từ `web-app/generator/routes_invoice.py`.
   - Lưu trực tiếp hóa đơn được quét vào bảng `parsed_invoices` của Supabase V2.

### 🎁 Phase 2 (Lưu trữ và Tối ưu hóa):
- Viết file `backend/run_workers.py` làm trình quản lý chạy luân phiên (Daemon Manager) bằng Python hoặc dùng `pm2`/`Task Scheduler`.
- Triển khai phân quyền biến môi trường `.env` riêng biệt, không dùng chung với Frontend.

---

## 4. ƯỚC TÍNH SƠ BỘ
- **Độ phức tạp:** Trung bình (các cấu phần cốt lõi đã có sẵn code python, chủ yếu là tái cấu trúc thư mục, chuẩn hóa thư viện và viết thêm `invoice_worker.py` độc lập).
- **Thời gian dự kiến:** 2-3 sessions làm việc.

---

## 5. BƯỚC TIẾP THEO
→ Xác nhận Brief này để tạo thư mục `/backend` và chuẩn bị các file.
