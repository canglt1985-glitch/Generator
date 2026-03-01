# 💡 BRIEF: Tái cấu trúc Admin — Tách thành Quản lý MPĐ + Cấu hình

**Ngày tạo:** 2026-03-01
**Brainstorm cùng:** Admin VT3-VHKT

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT

Page Admin hiện tại load **tất cả data** cho 5 tabs cùng lúc (báo cáo, trạm site, user, 
yêu cầu, smartw). Trong đó báo cáo gọi `get_audit_data()` 2 lần + payment aggregation → rất nặng.

Page Chi Phí (`/generator`) chứa 5 tabs, trong đó 2 tabs admin-only (Chạy máy 3,300+ rows, 
Thông tin MPĐ 700+ rows) làm page nặng không cần thiết.

Bảng "Thông tin MPĐ" (GeneralInfo) xuất hiện **TRÙNG** ở cả 2 nơi:
- Generator tab `infos` (line 864 generator.html)  
- Admin tab `infos` (line 116 admin_panel.html)

## 2. GIẢI PHÁP ĐỀ XUẤT

Tách thành **3 pages riêng biệt** trên sidebar:

### Page 1: Chi Phí `/generator` (nhân viên + admin)
- ⛽ Nhiên liệu
- 💳 Chi phí khác  
- 📊 Tổng hợp thanh toán

### Page 2: Quản lý MPĐ `/admin/mpd` (ADMIN ONLY - submenu mới)
- 📊 Báo cáo (default tháng hiện tại, filter tháng/năm)
- 🔧 Chạy máy (default tháng hiện tại)
- 📡 Thông tin MPĐ (1 bản duy nhất, xoá bên generator)

### Page 3: Cấu hình `/admin` (ADMIN ONLY)
- 👤 User
- ✅ Yêu cầu (phê duyệt)
- 📡 SmartW config

## 3. ĐỐI TƯỢNG SỬ DỤNG

- **Nhân viên:** Chỉ thấy Dashboard, VHKT RAN, Chi Phí (nhẹ, nhanh)
- **Admin:** Thấy thêm Quản lý MPĐ + Cấu hình

## 4. CHI TIẾT KỸ THUẬT

### Sidebar thay đổi:
- Thêm menu "Quản lý MPĐ" với icon 🏭 (admin only)
- Đổi tên menu "Admin" thành "Cấu hình" với icon ⚙️
- Chi Phí giữ nguyên URL `/generator`

### Data loading:
- Mỗi page chỉ load data cho tab active (conditional load)
- Báo cáo + Chạy máy: default tháng hiện tại

### Template changes:
- `generator.html`: Xoá tab logs + infos (admin only) → giảm ~800 dòng
- `admin_panel.html`: Xoá tab báo cáo + trạm site → chỉ giữ user, yêu cầu, smartw  
- `admin_mpd.html`: Template MỚI cho Quản lý MPĐ (báo cáo, chạy máy, thông tin MPĐ)
- `layout.html`: Cập nhật sidebar

### Route changes:
- `core/routes.py` admin(): Bớt data loading (chỉ user, requests, smartw)
- Thêm route mới: `admin_mpd()` cho Quản lý MPĐ
- `generator/routes.py`: Bỏ load infos + logs data

## 5. TÍNH NĂNG

### 🚀 MVP (Làm ngay):
- [ ] Tạo route `/admin/mpd` + template `admin_mpd.html`
- [ ] Chuyển tab báo cáo từ admin sang admin_mpd
- [ ] Chuyển tab chạy máy từ generator sang admin_mpd
- [ ] Gom thông tin MPĐ vào admin_mpd (xoá trùng)
- [ ] Cập nhật sidebar (layout.html)
- [ ] Conditional tab rendering + data loading
- [ ] Default tháng hiện tại cho báo cáo + chạy máy

### 🎁 Phase 2:
- [ ] Tab chạy máy: pagination/lazy load cho data nặng
- [ ] Tab báo cáo: cache kết quả audit

## 6. ƯỚC TÍNH SƠ BỘ

- **Độ phức tạp:** 🟡 Trung bình (nhiều file cần sửa, nhưng logic đơn giản — chủ yếu move code)
- **Thời gian:** ~45-60 phút
- **Rủi ro:**
  - Cần test kỹ sidebar links
  - Đảm bảo các CRUD routes vẫn redirect đúng sau khi đổi page
  - Modal forms (thêm/sửa/xoá) cần update redirect URL

## 7. BƯỚC TIẾP THEO
→ Xem PLAN.md để thực hiện từng bước
