# 🚀 BÁO CÁO REVIEW VÀ KẾ HOẠCH CHUYỂN GIAO: TVT3 -> TVT3_v2

## 📍 Trạng thái hiện tại
Dự án đang trong quá trình chuyển đổi kiến trúc từ monolithic truyền thống sang kiến trúc hiện đại phân tán. 
- **Legacy (TVT3/web-app):** Python Flask Server-side rendering, quản lý mọi thứ từ scraper, job scheduler, đến UI.
- **New (TVT3_v2):** Chuyển giao UI sang React (Vite + Tailwind) và Database sang Supabase PostgreSQL (BaaS). Hướng tới chia tách Frontend hiển thị và Backend/Worker chỉ xử lý background jobs (scrape/sinh file Word).

Module đang được focus chuyển giao là **Hợp đồng nhà trạm** (gần hoàn thiện UI và logic tính toán trên React).

## 📁 Cấu trúc chính hiện tại
```
TVT3/
├── tvt3_v2/          # Kiến trúc mới (Frontend React)
│   ├── src/pages/    # Dashboard, Datasites, ContractDashboard
│   └── ...
├── web-app/          # Kiến trúc cũ (Python Flask)
│   ├── generator/    # Quản lý máy phát điện (MFD)
│   ├── daily_work/   # Nhật ký công việc
│   ├── smartw/       # Scraper SmartW, VHKT, cảnh báo
│   └── bot_telegram/ # Bot thông báo
├── scripts/          # Các script import (import_excel_to_v2.py, v.v.)
└── .brain/           # Antigravity Context Memory
```

---

## ⬆️ Kế hoạch chuyển giao tính năng (Migration Plan)

### Phân tích hệ thống cũ (TVT3)
Hệ thống cũ gánh 2 vai trò chính: **1. Hiển thị UI** và **2. Background Jobs/Scraper**. 
Chiến lược chuyển giao: **Chuyển UI qua React + Supabase. Giữ lại Python làm Background Worker.**

### Lộ trình chi tiết:

#### 1. Module Hợp đồng nhà trạm (Đang thực hiện) - Ưu tiên: 🔴 Cao
- **Hiện tại (v2):** Đã có giao diện Dashboard, quản lý trạm, tính chu kỳ thanh toán, import từ Excel lên Supabase.
- **Cần làm:** 
  - Xây dựng API (Flask/NodeJS) kết nối thư viện `docxtemplater` để sinh file Word (Phụ lục/Hợp đồng) từ dữ liệu Supabase.
  - Tích hợp nút "Tải xuống Word" từ UI React gọi qua API.
  - Hoàn thiện tính năng Thêm/Sửa/Xóa (CRUD) hợp đồng trực tiếp trên React.

#### 2. Module Máy phát điện (Generator) - Ưu tiên: 🟡 Trung bình
- **Legacy:** Form nhập thông tin MFD, API lấy thông tin trạm, tính toán tiêu hao và scrape giá dầu PVOil hàng ngày.
- **Cần làm (v2):**
  - Khởi tạo schema `generator_logs` trên Supabase.
  - Xây dựng trang nhập log chạy MFD trên React (UI trực quan, responsive cho mobile).
  - Tách job scrape giá dầu (`fuel_price.py`) thành job độc lập ghi vào Supabase.

#### 3. Module Nhật ký công việc (Daily Work) - Ưu tiên: 🟡 Trung bình
- **Legacy:** Quản lý công việc hàng ngày của nhân viên.
- **Cần làm (v2):**
  - Khởi tạo bảng `daily_tasks` trên Supabase (có RLS để phân quyền user).
  - Tạo trang To-do / Kanban board trên React.

#### 4. Module Tự động hóa / Scraper (SmartW, Cúp điện) - Ưu tiên: 🟢 Thấp (Tách riêng backend)
- **Legacy:** `smartw_bp`, `fetch_outages.py`, `bot_telegram.py`. Chạy bằng `APScheduler`.
- **Cần làm (v2):** 
  - Các job này **không thể** chạy trên Frontend React.
  - Lên kế hoạch biến thư mục `web-app` thành một "Microservice Worker" hoặc Cloud Function: Chỉ chạy ngầm, cào dữ liệu và push thẳng vào bảng Supabase. React sẽ tự động cập nhật real-time nhờ tính năng subscription của Supabase.

---

## ⚠️ Rủi ro khi nâng cấp
1. **Lệ thuộc vào Background Worker:** Do Supabase và React không tự scrape dữ liệu nội bộ được, bắt buộc phải có một server (VPS) chạy 24/7 cho các job bằng Python. Cần setup dockerize/systemd cẩn thận.
2. **Đứt gãy dữ liệu (Data Drift):** Trong thời gian chuyển giao, nếu user nhập data vào web cũ, có thể không sync sang Supabase mới. Cần đóng tính năng nhập liệu trên app cũ ngay khi module mới lên sóng.

---
Báo cáo này được tự động generate bởi Antigravity AWF.
