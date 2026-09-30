# Báo Cáo Khám Bệnh Dự Án (Audit Report) - 30/09/2026
**Bác sĩ phụ trách:** BS. Khang (Code Doctor & Security Engineer)  
**Chuyên khoa:** Vệ sinh mã nguồn & Kiểm soát rác hệ thống (Garbage & Cache Cleansing)

---

## 📊 Tổng Quan Bệnh Án (Summary)
- 🔴 **Vấn Đề Nghiêm Trọng (Critical): 1** (Tràn bộ nhớ do rác tự sinh liên tục: 121 ảnh debug screenshot trong worker SmartW không tự hủy sau khi thành công)
- 🟡 **Cảnh Báo Cần Sửa (Warnings): 3** (Các file Excel test nháp trong backend, file log nằm sai vị trí, cache build frontend phình to)
- 🟢 **Gợi Ý Tối Ưu (Suggestions): 2** (Dọn dẹp `__pycache__`, gom nhóm các script one-off migration cũ)

---

## 🔴 1. Triệu Chứng Nghiêm Trọng (Phải sửa ngay)
### 1.1. "Khối u" rác ảnh tự sinh liên tục trong Scraper SmartW
- **Vị trí:** `backend/data/smartw/debug_*.png`
- **Số lượng & Kích thước:** **121 file ảnh PNG** (~18 MB)
- **Triệu chứng & Nguyên nhân:** Trong [scraper.py](file:///Users/cang_it/Antigravity/TVT3/backend/smartw/scraper.py#L311-L339), mỗi chu kỳ 15 phút khi worker thực hiện đăng nhập SSO SmartW, hệ thống tự chụp 2 ảnh màn hình (`debug_pre_submit_*.png` và `debug_post_submit_*.png`). Khi đăng nhập thành công, các ảnh này **không được xóa** mà cứ tích tụ vô tận, gây hao mòn dung lượng đĩa và làm chậm các thao tác filesystem.
- **Phác đồ điều trị:**
  1. Xóa sạch 121 file ảnh debug png cũ.
  2. Cập nhật [scraper.py](file:///Users/cang_it/Antigravity/TVT3/backend/smartw/scraper.py) để tự động xóa 2 ảnh debug tạm này ngay khi đăng nhập thành công (chỉ lưu lại khi có lỗi xác thực để phục vụ chẩn đoán).
  3. Rút ngắn thời gian lưu debug screenshot trong [smartw_worker.py](file:///Users/cang_it/Antigravity/TVT3/backend/smartw_worker.py#L663) từ 24h xuống 2h.

---

## 🟡 2. Cảnh Báo Nên Khắc Phục (Warnings)
### 2.1. File Excel test / nháp nằm lẫn trong thư mục chạy Backend
- **Vị trí:** `backend/data/`
- **Danh sách file rác:**
  - `backend/data/test_seath_T08_2026.xlsx`
  - `backend/data/test_seath_T09_2026.xlsx`
  - `backend/data/test_tnr_merge.xlsx`
  - `backend/data/test_tnr_merge2.xlsx`
  - `danh_sach_tram_luong_dung_bca.xlsx` (ở thư mục gốc repo)
- **Tác hại:** Làm rối thư mục dữ liệu production của backend, dễ gây nhầm lẫn với các file dữ liệu cấu hình thật.
- **Phác đồ điều trị:** Xóa bỏ hoặc chuyển vào kho lưu trữ tạm thời `scratch/`.

### 2.2. File log mồ côi nằm sai thư mục chuẩn
- **Vị trí:** `backend/bot_mll.log` (nằm ở thư mục backend gốc thay vì trong `backend/logs/`)
- **Tác hại:** Làm ô nhiễm cấu trúc thư mục backend.
- **Phác đồ điều trị:** Xóa file `backend/bot_mll.log` (hệ thống đã ghi log vào `backend/logs/bot_mll.log`).

### 2.3. Thư mục Build Frontend cũ (`dist/`)
- **Vị trí:** `tvt3_v2/dist/` (~6.4 MB)
- **Tác hại:** Đây là tàn dư từ các lần build test local trước đây. Vercel tự động build độc lập trên Cloud từ mã nguồn, nên bản build local này chiếm bộ nhớ không cần thiết.
- **Phác đồ điều trị:** Xóa thư mục `tvt3_v2/dist/`.

---

## 🟢 3. Gợi Ý Tối Ưu Thêm (Suggestions)
### 3.1. Dọn dẹp Python Bytecode Cache (`__pycache__`, `*.pyc`)
- **Vị trí:** Rải rác trong `backend/`, `backend/smartw/`, `scripts/`.
- **Phác đồ điều trị:** Chạy lệnh quét sạch toàn bộ `__pycache__` và `.DS_Store` để giải phóng inode.

### 3.2. Sàng lọc thư mục `scratch/`
- **Vị trí:** Thư mục `scratch/` hiện có 37 file (~10.8 MB), chủ yếu là các bản backup JSON cũ của tháng 8 và đầu tháng 9.
- **Phác đồ điều trị:** Giữ lại các bản backup quan trọng gần nhất (28-29/09), gom các file backup cũ tháng 8 vào thư mục nén nếu cần giải phóng thêm không gian.

---

## 📋 Đánh Giá Tổng Thể
| Hạng mục | Tình trạng | Mức độ ưu tiên |
| :--- | :--- | :--- |
| **Ảnh debug rác scraper** | 121 file PNG (~18MB) | 🔴 Khẩn cấp (ngăn sinh thêm) |
| **File Excel test tạm** | 5 files nháp | 🟡 Cần dọn dẹp |
| **Log mồ côi & dist cũ** | ~6.5MB | 🟡 Cần dọn dẹp |
| **Python cache & DS_Store** | Rải rác | 🟢 Tối ưu |
