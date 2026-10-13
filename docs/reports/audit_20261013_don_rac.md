# 🏥 BÁO CÁO KHÁM TỔNG QUÁT & PHÁC ĐỒ DỌN RÁC (AUDIT REPORT)
**Ngày khám:** 13/10/2026  
**Bác sĩ phụ trách:** Khang (Security & Code Auditor)  
**Phạm vi:** Toàn bộ Workspace `TVT3` & Phân hệ mới `SmartW_DaLat`

---

## 🩺 TỔNG QUAN TÌNH TRẠNG SỨC KHỎE DỰ ÁN

| Chỉ số | Kết quả chẩn đoán | Đánh giá lâm sàng |
| :--- | :--- | :--- |
| **Tổng dung lượng Workspace** | ~1.2 GB | 🟡 Thừa cân nhẹ do dồn tích cache & log |
| **Rác Bytecode (`__pycache__`, `*.pyc`)** | 6 thư mục dự án | 🟢 Nhẹ, sinh ra trong quá trình chạy |
| **Build Artifacts dư thừa** | `tvt3_v2/dist` (12MB), `.vercel` (13MB) | 🟡 Cần giải phóng định kỳ |
| **Hồ sơ Log phình to** | `backend/logs/` (~4.2MB) | 🟡 `smartw_alarm.log` (1.9MB), `scheduler.log` (1.2MB) |
| **Dị vật / File tạm tại Root** | `Hoadon.JPG/` (7MB), `tracuuhoadon.jpg`, Excel T9 | 🟡 Nên quy hoạch về đúng thư mục |
| **An toàn Mật khẩu & Bí mật** | Git sạch, `.env` đã được ignore | 🟢 Không bị lộ password ra Git repo |
| **Xung đột cấu trúc Playwright** | `SmartW_DaLat/ms-playwright` hiện diện | 🟡 Cần chuẩn hóa `.gitignore` để tránh commit nhầm |

---

## 🔴 NHÓM VẤN ĐỀ CẦN LƯU Ý (CẨN TRỌNG)

### 1. Tránh commit nhầm Symlink Playwright Browser vào Git
- **Triệu chứng:** `SmartW_DaLat/ms-playwright` hiển thị dưới dạng untracked file (`??`) trong `git status`.
- **Nguy cơ lâm sàng:** Nếu vô tình `git add .` rồi push, Git sẽ đẩy symlink hoặc cố gắng track browser engine nặng >500MB lên remote repository gây lỗi repo hoặc tràn dung lượng GitHub.
- **Phác đồ xử lý:** Bổ sung `**/ms-playwright/` vào file `.gitignore` gốc.

### 2. Bảo mật thông tin SSO vừa khai báo
- **Triệu chứng:** Người dùng vừa cung cấp tài khoản SSO `Hung.ly` qua phiên chat để phân tích SmartW Đà Lạt.
- **Đánh giá an toàn:** Đã kiểm tra Git: Tài khoản/mật khẩu chỉ lưu trong file `.env` cục bộ (được `.gitignore` bảo vệ), **KHÔNG** bị hardcode trong source code hay file JSON nào được Git theo dõi.
- **Khuyến nghị:** Duy trì cơ chế đọc biến môi trường qua `.env` hoặc file `system_config.json` nằm ngoài Git.

---

## 🟡 DANH MỤC "Ổ RÁC" CÓ THỂ TIẾN HÀNH DỌN DẸP

### Khu vực 1: Rác Cache & Build (Giải phóng ~25MB - An toàn 100%)
1. **Bytecode Python:** Xóa toàn bộ `__pycache__` và `*.pyc` trong `backend/` và `SmartW_DaLat/`.
2. **Vercel & Vite build cache:** Xóa `tvt3_v2/dist/` (12MB) và `tvt3_v2/.vercel/` (13MB). Khi build lại Vite/Vercel sẽ tự sinh mới sạch sẽ.

### Khu vực 2: Tối ưu hóa Hồ sơ Log (Giải phóng ~3MB)
- `backend/logs/smartw_alarm.log` (1.9MB) và `backend/logs/scheduler.log` (1.2MB) đang lưu dồn log cũ từ các phiên trước.
- **Phác đồ:** Xén bớt (truncate) hoặc làm rỗng các file log này để giải phóng I/O và dung lượng ổ cứng.

### Khu vực 3: Dọn dẹp File tạm ở Thư mục gốc Root (Giải phóng ~7.5MB)
- Thư mục `Hoadon.JPG/` (7.0MB - chứa 15 file ảnh hóa đơn đợt quyết toán T9).
- File ảnh đơn lẻ: `tracuuhoadon.jpg` (244KB).
- File Excel: `Ho_So_Thanh_Toan_Chuan_Mau_09_2026.xlsx` (76KB).
- **Phác đồ:** Chuyển các file này vào thư mục lưu trữ `scratch/` hoặc `exports/archive/` để giữ thư mục gốc TVT3 luôn gọn gàng và chuẩn mực.

---

## 📋 PHÁC ĐỒ ĐIỀU TRỊ KHUYÊN DÙNG (ACTION PLAN)

Các phương án xử lý:
1. **Option 5 (Fix All - Dọn dẹp tự động)**:
   - Dọn sạch bytecode cache (`__pycache__`).
   - Xóa thư mục build cũ `dist/` và `.vercel/`.
   - Cập nhật `.gitignore` bổ sung `**/ms-playwright/`.
   - Truncate các file log nặng > 1MB.
   - Di chuyển các file ảnh và Excel tạm ở root vào `scratch/archive/`.
2. **Option 1-4**: Xem báo cáo, chọn dọn từng phần hoặc lưu lại vào não bộ.
