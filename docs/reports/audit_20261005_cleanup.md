# Audit Report - 2026-10-05: Khám Tổng Quát & Dọn Rác Hệ Thống (TVT3)

## Summary
- 🔴 **Critical Issues:** 0
- 🟡 **Warnings (Đã xử lý & Dọn dẹp):** 3
- 🟢 **Suggestions (Tối ưu hóa):** 2

---

## 🟡 Warnings (Đã Xử Lý & Dọn Dẹp Rác Thành Công)

1. **Dead Code: `Dashboard.jsx` (Legacy Prototype)**
   - **File:** `tvt3_v2/src/pages/Dashboard.jsx` (363 dòng, 15 KB)
   - **Chẩn đoán:** File nguyên mẫu giai đoạn đầu của Dashboard quản lý trạm/hợp đồng. Hiện tại `App.jsx` đã chuyển toàn bộ luồng sang `Home.jsx` và `ContractDashboard.jsx`. File này không còn bất kỳ import nào, chiếm dụng bundle và gây hiểu nhầm khi maintain.
   - **Xử lý:** Đã xóa bỏ an toàn file chết. Build Vite giảm tải, bundle gọn gàng.

2. **Dead Function: `handleBulkUnapproveB4`**
   - **File:** `tvt3_v2/src/pages/DailyWork.jsx` (29 dòng)
   - **Chẩn đoán:** Hàm xử lý hủy duyệt B4 cũ bằng cờ `b4_approved: false`. Hệ thống đã được nâng cấp sang cơ chế phân đợt động (`handleBulkRemoveBatch`), hàm này bị bỏ quên không còn ai gọi.
   - **Xử lý:** Đã loại bỏ triệt để khỏi code base.

3. **Cấu hình ESLint quét nhầm thư mục Build Vercel & Lockfile rác**
   - **File:** `tvt3_v2/eslint.config.js`, `.gitignore`
   - **Chẩn đoán:** 
     - Thư mục `.vercel/output/` chứa bundle build tĩnh minified của Vercel CLI không được đưa vào `globalIgnores` của ESLint, làm chậm quá trình linting.
     - File khóa `backend/data/smartw/worker.lock` từ daemon worker sinh ra làm bẩn `git status`.
   - **Xử lý:** 
     - Thêm `.vercel` vào `globalIgnores` trong `tvt3_v2/eslint.config.js`.
     - Thêm `backend/data/smartw/*.lock`, `.vercel/`, `tvt3_v2/.vercel/` vào `.gitignore` gốc.
     - Dọn dẹp cache rác `scratch/__pycache__`.

---

## 🟢 Suggestions (Tối Ưu & Bảo Trì)

1. **Vite Bundle Splitting:**
   - Thư viện `exceljs` (~930 KB) và `xlsx` (~424 KB) đã được lazy loading tối ưu, không ảnh hưởng đến initial payload của người dùng.
2. **Backend Workers Daemon Stability:**
   - Các worker daemon (`run_workers.py`, `smartw_worker`, Telegram/Viber bot) đang chạy nền ổn định trên máy local. Tệp định kỳ `backend/data/fuel_prices.json` cập nhật giá PVOIL tự động mượt mà.

---

## Next Steps
1. Chạy `/test` để kiểm tra toàn bộ luồng sau khi dọn rác.
2. Chạy `/save-brain` để lưu lại kiến thức và lịch sử dọn dẹp.
3. Chạy `/next` để tiếp tục các hạng mục công việc tiếp theo.
