# Báo Cáo Audit: Dọn Dẹp Rác & Tối Ưu Workspace TVT3

**Ngày thực hiện:** 03/10/2026  
**Người khám (Auditor):** Antigravity Code Doctor  
**Phạm vi:** Toàn bộ workspace dự án TVT3 (Python backend, React Vite frontend, thư mục scratch, cache & logs)

---

## 📊 Tổng Quan Triệu Chứng
- 🔴 **Vấn đề cần dọn dẹp cấp thiết:** 0 (Không có lỗi bảo mật nghiêm trọng)
- 🟡 **Cảnh báo file thừa & rác chiếm bộ nhớ:** 4 nhóm chính
  1. Thư mục build cũ `tvt3_v2/dist/` (~6.3 MB) chưa có trong `.gitignore`.
  2. Cache compiled Python bytecode (`__pycache__/`, 14 file `.pyc`).
  3. File ảnh crop tạm thời & file nháp test Excel ở root (`scratch_test_t9.xlsx`, các file crop ảnh template).
  4. Các file log rỗng 0 bytes trong `backend/logs/`.
- 🟢 **Gợi ý tối ưu:** Bổ sung `dist/` vào `.gitignore` để tránh commit nhầm file bundle.

---

## 🔍 Chi Tiết Các Hạng Mục "Rác" Đã Phát Hiện

### 1. Thư mục Build Frontend cũ (`tvt3_v2/dist/`)
- **Vị trí:** `tvt3_v2/dist/`
- **Dung lượng:** **6.3 MB**
- **Chẩn đoán:** Đây là thư mục sinh ra khi chạy lệnh build trước đây, không dùng trong môi trường dev và sẽ được sinh lại khi deploy.
- **Phác đồ:** Xóa bỏ thư mục `tvt3_v2/dist/` và thêm `dist/` vào file [.gitignore](file:///Users/cang_it/Antigravity/TVT3/.gitignore).

### 2. Python Cache Bytecode (`__pycache__`)
- **Vị trí:**
  - `./__pycache__/`
  - `./backend/__pycache__/`
  - `./backend/smartw/__pycache__/`
  - `./scripts/__pycache__/`
- **Chẩn đoán:** Bytecode biên dịch tạm thời của Python. Xóa đi giúp repo sạch sẽ, Python sẽ tự tạo lại khi cần mà không ảnh hưởng code.
- **Phác đồ:** Xóa toàn bộ các thư mục `__pycache__` và file `.pyc`.

### 3. File Nháp & Ảnh Crop Tạm Thời
- **Vị trí:**
  - `scratch/crop_*.jpg` (5 file ảnh crop phục vụ đo đạc template).
  - `scratch_test_t9.xlsx` (file test Excel cũ).
  - `Ho_So_Thanh_Toan_Chuan_Mau_09_2026_old_rollover_august.xlsx` (bản sao lưu tạm thời trước khi đồng bộ file chuẩn).
  - `scratch/network_map_headless.png` (ảnh chụp test bản đồ).
- **Phác đồ:** Dọn sạch các file nháp tạm thời này.

### 4. File Log Rỗng (0 Bytes)
- **Vị trí:**
  - `backend/logs/bot_mll_tvt3.log`
  - `backend/logs/daemon_stdout.log`
  - `backend/logs/weekly_report.log`
- **Phác đồ:** Xóa các file log 0 byte để thư mục logs gọn gàng.

---

## 📋 Đề Xuất Phác Đồ Xử Lý (Action Plan)

| Hành Động | Lợi Ích | Mức Độ An Toàn |
|---|---|---|
| **1. Xóa `tvt3_v2/dist/` & update `.gitignore`** | Giải phóng ~6.3 MB, chống phình Git | 🟢 100% An toàn |
| **2. Dọn sạch `__pycache__` và `*.pyc`** | Xóa sạch cache bytecode thừa | 🟢 100% An toàn |
| **3. Xóa các file crop nháp và Excel tạm** | Làm sạch workspace, tránh nhầm lẫn file | 🟢 100% An toàn |
| **4. Xóa log rỗng 0 bytes** | Gọn gàng thư mục log | 🟢 100% An toàn |
