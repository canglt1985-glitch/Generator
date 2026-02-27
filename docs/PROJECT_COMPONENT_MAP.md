# 🗺️ Bản Đồ Thành Phần Dự Án — Quick Reference

> Dùng tài liệu này để gọi đúng tên khi nhờ AI chỉnh sửa.

---

## 📌 Sidebar Navigation (layout.html)

| Tên hiển thị | Code / Route | URL |
|---|---|---|
| **VHKT SmartW** | `smartw.vhkt` | `/vhkt` |
| **VH Máy Phát Điện** | `generator.generator` | `/power-schedule` |
| **Công việc hàng ngày** | `daily_work.daily_work` | `/daily-work` |
| **Quản Trị** *(admin only)* | `core.admin` | `/admin` |

---

## 1️⃣ Trang VHKT SmartW — `vhkt.html`

**Page header:** "Vận Hành Khai Thác"

### Nav Cards (4 thẻ)

| Thẻ | Code | Icon | Hiển thị | Màu | Data source |
|---|---|---|---|---|---|
| MĐ (Mất Điện) | `tab-md` / `tableMd` | ⚠️ | Số trạm MĐ | warning (vàng) | `/api/smartw/md` |
| MPĐ (Máy Phát Điện) | `tab-mpd` / `tableMpd` | 🟢 | Số alarm MPĐ | success (xanh lá) | `/api/smartw/mpd` |
| MLL (Mất Liên Lạc) | `tab-mll` / `tableMll` | 🔴 | Số alarm MLL | danger (đỏ) | `/api/smartw/mll` |
| SLA (VHKT) | `tab-vhkt` / `tableVhkt` | 📊 | Bảng SLA | azure (xanh dương) | `/api/smartw/vhkt` |

### Bảng MĐ — `tableMd`
| Cột | Hiển thị |
|---|---|
| `site_id` | Site ID |
| `mang` | Mạng *(ẩn mobile)* |
| `canh_bao` | Cảnh báo |
| `bat_dau` | Bắt đầu |
| `so_phut` | Số phút |

### Bảng MPĐ — `tableMpd`
| Cột | Hiển thị |
|---|---|
| `site_id` | Site ID |
| `loai_thiet_bi` | Loại TB *(ẩn mobile)* |
| `canh_bao` | Cảnh báo |
| `bat_dau` | Bắt đầu |
| `so_phut` | Số phút |

### Bảng MLL — `tableMll`
| Cột | Hiển thị |
|---|---|
| `site_id` | Site ID |
| `mang` | Mạng |
| `bat_dau` | Bắt đầu |
| `so_phut` | Số phút |
| `nguyen_nhan_1` | Cấp 1 *(ẩn mobile)* |
| `nguyen_nhan_2` | Cấp 2 *(ẩn mobile)* |
| `nguyen_nhan_3` | Cấp 3 *(ẩn mobile)* |

### Bảng SLA/VHKT — `tableVhkt`
| Cột | Hiển thị |
|---|---|
| `tram` | Trạm |
| `md_so_lan` / `md_phut` / `md_sla` | Mất điện: Lần / Phút / SLA |
| `mpd_so_lan` / `mpd_phut` | Chạy máy phát: Lần / Phút |
| `mll_so_lan` / `mll_phut` / `mll_sla` | Mất liên lạc: Lần / Phút / SLA |

---

## 2️⃣ Trang VH Máy Phát Điện — `generator.html`

**Page header:** "Vận Hành Máy Phát Điện"

### Nav Cards (6 thẻ — 2 thẻ cuối admin-only)

| Thẻ | Tab ID | Icon | Hiển thị | Màu | DB Model |
|---|---|---|---|---|---|
| 📅 Lịch Cúp | `schedule` | 📅 | Lịch Cúp | warning | `PowerSchedule` |
| ⛽ Nhiên Liệu | `fuel` | ⛽ | Nhiên Liệu | teal | `FuelLedger` |
| 💳 Chi Phí | `expense` | 💳 | Chi Phí | pink | `OtherExpense` |
| 💰 Thanh Toán | `payment` | 💰 | Thanh Toán | success | Tổng hợp từ FuelLedger + OtherExpense |
| 🏭 Chạy Máy *(admin)* | `logs` | 🏭 | Chạy Máy | azure | `GeneratorLog` |
| 🔧 Thông Tin *(admin)* | `infos` | 🔧 | Thông Tin | purple | `GeneralInfo` |

### Tab Lịch Cúp (`schedule`) → Model `PowerSchedule`

| Cột DB | Hiển thị | Ghi chú |
|---|---|---|
| `id_tram` | ID Trạm | Badge xanh, click → Station Info Modal |
| `ngay_mat_dien` | Ngày Cúp | |
| `thoi_gian_cup_dien` | Bắt đầu | Badge đỏ |
| `thoi_gian_co_dien` | Kết thúc | Badge xanh lá |
| `quan_ly_tram` | NV Quản Lý | *(admin only, ẩn mobile)* |
| `doi_quan_ly_dien` | Đội QL | *(ẩn mobile)* |
| `khu_vuc` | Khu Vực | *(ẩn mobile)* |

### Tab Nhiên Liệu (`fuel`) → Model `FuelLedger`

| Cột DB | Hiển thị | Ghi chú |
|---|---|---|
| `id_tram` | Trạm | Hiện "KHO" nếu trống |
| `ngay` | Ngày | |
| `type` | Loại | Badge: ĐỔ NL / NHẬP KHO / XUẤT KHO / CHỈNH TỒN |
| `loai_nhien_lieu` | NL | Badge: Dầu (cyan) / Xăng (yellow) |
| `so_luong` | Lượng | |
| `don_gia` | Đơn giá | |
| `thanh_tien` | Thành tiền | |
| `nha_cung_cap` | NCC | Giá trị: `MUA LẺ` / `CX222` / `VNPT-VTL` |
| `nguoi_thuc_hien` | Người | |
| `ghi_chu` | Ghi chú | |

**FuelLedger.type mapping:**

| DB value | Hiển thị badge | Tab trong modal |
|---|---|---|
| `DIRECT_BUY` | ĐỔ NL | "ĐỔ NL (MUA)" |
| `STOCK_IN` | NHẬP KHO | "NHẬP KHO" |
| `STATION_OUT` | XUẤT KHO | "XUẤT KHO" |
| `ADJUSTMENT` | CHỈNH TỒN | *(auto-generated)* |

**Card tồn kho:** Hiện `Dầu: __L | Xăng: __L | Tổng: __L`

### Tab Chi Phí (`expense`) → Model `OtherExpense`

| Cột DB | Hiển thị |
|---|---|
| `nguoi_tam_ung` | Người Chi |
| `ngay_su_dung` | Ngày |
| `so_tien` | Số Tiền |
| `noi_dung` | Nội Dung |
| `ghi_chu` | Ghi Chú *(ẩn mobile)* |

### Tab Thanh Toán (`payment`) — Tổng hợp, không phải 1 model

**2 Card nhóm chi phí:**

| Card | Code ID | Nguồn dữ liệu |
|---|---|---|
| Chi Phí Mua Ngoài | `card-mua-ngoai` | FuelLedger (NCC=MUA LẺ, VNPT-VTL) + OtherExpense |
| Chi Phí CX222 | `card-cx222` | FuelLedger (NCC=CX222) |

Mỗi card hiển thị: Tổng phát sinh → Đã TT đến ngày → Số tiền đã TT → Phát sinh mới → **Còn phải trả**

**Bảng Thanh Toán:** header "Bảng Thanh Toán"

| Cột | Hiển thị |
|---|---|
| `name` | Nhân viên |
| `mua_le` | Mua Lẻ |
| `cx222` | CX222 *(ẩn mobile)* |
| `vnpt_vtl` | VNPT-VTL |
| `other_exp` | Chi phí khác |
| `can_ck` | Tổng cộng (TC trên mobile) |

### Tab Chạy Máy (`logs`) → Model `GeneratorLog` *(admin only)*

| Cột DB | Hiển thị |
|---|---|
| `ngay_van_hanh` | Ngày VH |
| `id_tram` | Trạm |
| `site` | Site |
| `cong_suat_may` | CS Máy |
| `gio_bat_dau` | Giờ BĐ |
| `gio_ket_thuc` | Giờ KT |
| `thoi_gian_hoat_dong` | Thời Gian |
| `nhien_lieu_tieu_hao` | NL Hao |
| `don_gia` | Đơn Giá |
| `thanh_tien` | Thành Tiền |
| `ghi_chu` | Ghi Chú |

### Tab Thông Tin (`infos`) → Model `GeneralInfo` *(admin only)*

| Cột DB | Hiển thị |
|---|---|
| `id_tram` | ID Trạm |
| `ma_khach_hang` | Mã KH |
| `huyen` | Huyện |
| `quan_ly_tram` | Quản lý |
| `may_phat_dien` | Máy phát |
| `dung_tich` | Dung tích |
| `dinh_muc_thuc_te` | ĐM TT (thực tế) |
| `dinh_muc` | ĐM TT (thanh toán) |
| `loai_nhien_lieu` | NL |
| `loai_tram` | Loại trạm |
| `loai_may` | Loại máy |

---

## 3️⃣ Trang Công Việc Hàng Ngày — `daily_work.html`

**Page header:** "Công Việc Hàng Ngày" → Model `DailyWork`

| Cột DB | Hiển thị |
|---|---|
| `ngay` | Ngày |
| `id_tram` | ID Trạm |
| `noi_dung` | Nội Dung |
| `hang_muc` | Hạng Mục |
| `ton_tai_vhkt` | Tồn tại VHKT |
| `ton_tai_csht` | Tồn tại CSHT |
| `ghi_chu` | Ghi chú |
| `nhan_vien` | Người Thực Hiện |

---

## 4️⃣ Trang Quản Trị — `admin_panel.html` *(admin only)*

**Page header:** "Quản Trị Hệ Thống"

### 5 Tab

| Tab | ID | Hiển thị | DB Model |
|---|---|---|---|
| Báo Cáo | `#reports` | Báo Cáo | Tổng hợp |
| Trạm Site | `#infos` | Trạm Site | `GeneralInfo` |
| User | `#users` | User | `User` |
| Yêu Cầu | `#requests` | Yêu Cầu | `DeletionRequest` |
| SmartW | `#smartw` | SmartW | Config (Fernet) |

### Tab Báo Cáo (`#reports`) — Bảng "Tổng Hợp Theo Trạm"

Bảng con phía trên (nếu có): **"Trạm Tiêu Hao Bất Thường"**

Bảng chính gồm 5 nhóm cột:

| Nhóm | Cột |
|---|---|
| Thông tin trạm | Máy phát, Dung tích, Loại máy, Loại NL |
| Định mức | Thực tế, Thanh toán |
| Chạy máy | Số lần, Giờ (h), NL hao (L), Thành tiền |
| Nhiên liệu (Sổ cái) | Mua TT (L), Xuất kho (L), Tổng đổ (L), Chi phí mua |
| Tồn kho | Tiêu hao ĐM, NL tồn, Tồn (min) |
| + Cúp điện, Chênh lệch |

### Tab User (`#users`) → Model `User`

| Cột DB | Hiển thị |
|---|---|
| `full_name` | Họ Tên |
| `username` | Username |
| `phone_number` | SĐT |
| `role` | Vai trò (ADMIN / USER) |

### Tab Yêu Cầu (`#requests`) → Model `DeletionRequest`

Header: "Phê duyệt yêu cầu điều chỉnh"

| Cột DB | Hiển thị |
|---|---|
| `timestamp` | Ngày gửi |
| `requested_by` | Người yêu cầu |
| `table_name` + `record_id` + `reason` | Nội dung |

---

## 🔲 Modals (Popup)

| Modal | ID | Nằm ở file | Mô tả |
|---|---|---|---|
| Đổi Mật Khẩu | `changePasswordModal` | `layout.html` | Đổi pass user |
| Thông Tin Trạm | `stationInfoModal` | `layout.html` | Click vào ID Trạm → hiện NL tồn, đổ gần nhất |
| Cập Nhật Thanh Toán | `paymentGroupModal` | `layout.html` | Cập nhật Mua Ngoài / CX222 |
| Giao Dịch NL | `smartFuelModal` | `generator.html` | Tạo/sửa giao dịch nhiên liệu |
| Thêm Chi Phí | `addExpenseModal` | `generator.html` | Tạo/sửa chi phí khác |
| Thêm Công Việc | `addWorkModal` | `daily_work.html` | Tạo công việc mới |
| Sửa Công Việc | `editWorkModal` | `daily_work.html` | Chỉnh sửa công việc |

---

## 💾 DB Models → Tên Bảng

| Model (code) | DB Table | Hiển thị ở | Ghi chú |
|---|---|---|---|
| `GeneralInfo` | `general_info` | Tab Thông Tin + Admin Trạm Site | Thông tin trạm |
| `PowerSchedule` | `power_schedule` | Tab Lịch Cúp | Lịch cúp điện |
| `GeneratorLog` | `generator_log` | Tab Chạy Máy | Dữ liệu chạy MPĐ |
| `FuelLedger` | `fuel_ledger` | Tab Nhiên Liệu + Thanh Toán | Sổ cái NL (v2) |
| `OtherExpense` | `other_expense` | Tab Chi Phí + Thanh Toán | Chi phí phát sinh |
| `User` | `user` | Admin Tab User | Quản lý nhân viên |
| `DailyWork` | `daily_work` | Trang Công Việc | Công việc hàng ngày |
| `DeletionRequest` | `deletion_request` | Admin Tab Yêu Cầu | Phê duyệt xóa |
| `FuelRefillLog` | `fuel_refill_log` | *(không hiển thị)* | ⚠️ LEGACY |
| `FuelPurchaseLog` | `fuel_purchase_log` | *(không hiển thị)* | ⚠️ LEGACY |

---

## 📁 SmartW Data (JSON files, không qua DB)

| File | Nội dung |
|---|---|
| `data/smartw/md.json` | Alarm Mất Điện |
| `data/smartw/mpd.json` | Alarm Máy Phát Điện |
| `data/smartw/mll.json` | Alarm Mất Liên Lạc |
| `data/smartw/vhkt.json` | Báo cáo VHKT/SLA |
| `data/payment_groups.json` | Thanh toán nhóm (Mua Ngoài + CX222) |
