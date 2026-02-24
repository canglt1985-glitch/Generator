# 💡 BRIEF: Vận Hành Máy Phát Điện (Generator Operations)

**Ngày tạo:** 2026-01-20 (Cập nhật: 2026-02-13)  
**Trạng thái:** ✅ Đã triển khai — Đang restructure UI

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT

Tổ VT3 quản lý ~40 trạm viễn thông, mỗi trạm có máy phát điện dự phòng. Cần:
- Nhập nhật ký chạy máy (giờ bắt đầu, kết thúc, NL tiêu hao)
- Quản lý mua/xuất/tồn kho nhiên liệu (Dầu + Xăng)
- Theo dõi lịch cúp điện từ Điện Lực
- Tổng hợp báo cáo KPI, kiểm toán NL theo tháng/huyện

## 2. GIẢI PHÁP

Trang **`generator.html`** — trung tâm vận hành MPĐ với **6 tabs**:

## 3. CẤU TRÚC UI MỚI (Sau Restructure)

### Sidebar:
```
📡 VHKT SmartW              ← TRANG CHÍNH (login → redirect vào đây)
⚡ VH Máy Phát Điện         ← generator.html (6 tabs)
📋 Công Việc Hàng Ngày
⚙️ Quản Trị                 ← admin.html (admin only)
```

### Đổi tên file:
| Cũ | Mới | Lý do |
|---|---|---|
| `power_schedule.html` | **`generator.html`** | Bao quát hơn |
| `admin_panel.html` | **`admin.html`** | Gọn tên |
| `index.html` | **XÓA** | Không cần, chồng chéo |

### 6 Tabs trong `generator.html`:

```
⚡ VH Máy Phát Điện
├── 📅 Lịch Cúp Điện          (tất cả NV)
├── ⛽ Nhiên Liệu              (tất cả NV)
├── 💰 Chi Phí Khác            (tất cả NV)
├── 💳 Thanh Toán              (tất cả NV)
├── 🏭 Chạy Máy               (admin only) ← từ admin_panel
└── 🔧 Thông Tin MPĐ          (admin only) ← từ admin_panel, đổi tên "Trạm Site"
```

### Tabs trong `admin.html`:
```
⚙️ Quản Trị (admin only)
├── 📊 Báo Cáo
├── 👤 Users
├── ✅ Yêu Cầu Xóa
└── 📡 SmartW Config
```

---

## 4. BẢNG DỮ LIỆU — CỘT HIỂN THỊ WEB vs MOBILE

### Tab 1: Lịch Cúp Điện
| Cột | Web 🖥️ | Mobile 📱 | Ghi chú |
|-----|:---:|:---:|---------|
| ID Trạm | ✅ | ✅ | Badge click → station modal |
| Ngày Cúp | ✅ | ✅ | |
| Bắt đầu | ✅ | ✅ | Badge đỏ |
| Kết thúc | ✅ | ✅ | Badge xanh |
| Đội QL | ✅ | ❌ | `d-none d-md-table-cell` |
| Khu Vực | ✅ | ❌ | `d-none d-md-table-cell` |
| NV Quản Lý | ✅ | ❌ | Admin only |

### Tab 2: Nhiên Liệu (`FuelLedger`)
| Cột | Web 🖥️ | Mobile 📱 | Ghi chú |
|-----|:---:|:---:|---------|
| Ngày | ✅ | ✅ | |
| Loại (badge) | ✅ | ✅ | NHẬP KHO / XUẤT / ĐỔ NL / CHỈNH |
| NL (Dầu/Xăng) | ✅ | ✅ | Badge màu |
| Trạm / Kho | ✅ | ✅ | |
| Lượng (Lít) | ✅ | ✅ | **Key** |
| Đơn giá | ✅ | ❌ | Ẩn mobile |
| Thành tiền | ✅ | ❌ | Ẩn mobile |
| NCC | ✅ | ❌ | Ẩn mobile |
| Người mua | ✅ | ❌ | Ẩn mobile |
| Ghi chú | ✅ | ❌ | Ẩn mobile |
| Actions | ✅ | ✅ | Edit + Delete |

> **Summary card (trên bảng):** Tồn kho Dầu / Xăng / Tổng

### Tab 3: Chi Phí Khác (`OtherExpense`)
| Cột | Web 🖥️ | Mobile 📱 | Ghi chú |
|-----|:---:|:---:|---------|
| Ngày | ✅ | ✅ | |
| Nội Dung | ✅ | ✅ | **Key** |
| Số Tiền | ✅ | ✅ | **Key**, đỏ bold |
| Người Chi | ✅ | ✅ | Badge |
| Ghi Chú | ✅ | ❌ | `d-none d-md-table-cell` |
| Actions | ✅ | ✅ | Edit + Delete |

### Tab 4: Thanh Toán (tổng hợp theo NV)
| Cột | Web 🖥️ | Mobile 📱 | Ghi chú |
|-----|:---:|:---:|---------|
| Nhân viên | ✅ | ✅ | |
| Mua Lẻ | ✅ | ❌ | Ẩn mobile |
| CX222 | ✅ | ❌ | Ẩn mobile |
| VNPT-VTL | ✅ | ❌ | Ẩn mobile |
| Chi phí khác | ✅ | ❌ | Ẩn mobile |
| **Cần CK** | ✅ | ✅ | **Key**, bold xanh |

> **Filter:** Tháng + Năm dropdown

### Tab 5: Chạy Máy (`GeneratorLog`) — Admin only
| Cột | Web 🖥️ | Mobile 📱 | Ghi chú |
|-----|:---:|:---:|---------|
| Ngày VH | ✅ | ✅ | |
| Trạm | ✅ | ✅ | **Key**, bold |
| Site | ✅ | ❌ | Ẩn mobile |
| CS Máy | ✅ | ❌ | Ẩn mobile |
| Giờ BĐ | ✅ | ❌ | Ẩn mobile |
| Giờ KT | ✅ | ❌ | Ẩn mobile |
| Thời Gian | ✅ | ✅ | **Key** (giờ) |
| NL Hao | ✅ | ✅ | **Key** (lít) |
| Đơn Giá | ✅ | ❌ | Ẩn mobile |
| Thành Tiền | ✅ | ❌ | Ẩn mobile |
| Ghi Chú | ✅ | ❌ | Ẩn mobile |
| Actions | ✅ | ✅ | Delete |

> **Filter:** Tháng + Năm | **Toolbar:** Import, Export, Thêm

### Tab 6: Thông Tin MPĐ (`GeneralInfo`) — Admin only
| Cột | Web 🖥️ | Mobile 📱 | Ghi chú |
|-----|:---:|:---:|---------|
| ☑ Checkbox | ✅ | ❌ | Bulk delete |
| ID Trạm | ✅ | ✅ | **Key**, badge |
| Mã KH | ✅ | ❌ | |
| Huyện | ✅ | ✅ | |
| Quản lý | ✅ | ❌ | |
| Máy phát | ✅ | ❌ | |
| Dung tích | ✅ | ❌ | |
| ĐM TT (thực tế) | ✅ | ✅ | **Key**, bold |
| ĐM TT (tính toán) | ✅ | ❌ | |
| NL (Dầu/Xăng) | ✅ | ✅ | |
| Loại trạm | ✅ | ❌ | |
| Loại máy | ✅ | ❌ | |
| Actions | ✅ | ✅ | Edit + Delete |

> **Toolbar:** Import, Export, Thêm Mới, Xóa hàng loạt

---

## 5. CẢI TIẾN DẦU TỒN & BÁO CÁO (Phase 2)

### 5.1 Vấn đề hiện tại
Số liệu **dầu tồn** bị sai vì:
- Đang lấy từ `FuelRefillLog` (cũ), trong khi 2026+ dùng `FuelLedger`
- Filter ngày không nhất quán

### 5.2 Công thức mới
```
Dầu tồn trạm = Tổng NL nhận (STATION_OUT + DIRECT_BUY, lũy kế đến cuối kỳ)
              − Tổng tiêu hao (giờ × định mức, lũy kế đến cuối kỳ)
```

### 5.3 Filter mới cho báo cáo
- Tháng (dropdown T1-T12) + Năm (dropdown)
- Không chọn tháng → lũy kế cả năm

### 5.4 Checklist
**🚀 Làm ngay:**
- [ ] Sửa `get_audit_data()` → dùng `FuelLedger`
- [ ] Dầu tồn = lũy kế ALL TIME
- [ ] Filter tháng/năm thay date picker

**🎁 Làm sau:**
- [ ] Import dữ liệu 2025
- [ ] Cảnh báo tháng thiếu data chạy máy
- [ ] Xóa `FuelRefillLog` + `FuelPurchaseLog` legacy

---

## 6. DATA MODELS

```
GeneralInfo         # Thông tin trạm (tab "Thông Tin MPĐ")
├── id_tram, ma_khach_hang, huyen, quan_ly_tram
├── may_phat_dien, dung_tich, dinh_muc, dinh_muc_thuc_te
├── loai_nhien_lieu, loai_tram, loai_may
└── don_gia

GeneratorLog        # Nhật ký chạy máy (tab "Chạy Máy")
├── id_tram, site, cong_suat_may
├── ngay_van_hanh, gio_bat_dau, gio_ket_thuc
├── thoi_gian_hoat_dong, nhien_lieu_tieu_hao
└── don_gia, thanh_tien, ghi_chu

FuelLedger          # Sổ NL (tab "Nhiên Liệu")
├── type (STOCK_IN / STATION_OUT / DIRECT_BUY / ADJUSTMENT)
├── ngay, id_tram, loai_nhien_lieu
├── so_luong, don_gia, thanh_tien
└── nha_cung_cap, nguoi_thuc_hien, ghi_chu

PowerSchedule       # Lịch cúp điện (tab "Lịch Cúp")
├── id_tram, ma_khach_hang, ngay_mat_dien
├── thoi_gian_cup_dien, thoi_gian_co_dien
└── doi_quan_ly_dien, khu_vuc, quan_ly_tram

OtherExpense        # Chi phí khác (tab "Chi Phí Khác")
├── ngay_su_dung, noi_dung, du_an
├── so_tien, nguoi_tam_ung
└── ghi_chu
```

---

## 7. ROUTES

| Nhóm | Routes |
|------|--------|
| Trang chính | `/power-schedule` → đổi `/generator` |
| Chạy máy | `/generator-logs`, `/add-generator-log`, `/import-generator-log` |
| Nhiên liệu | `/fuel-ledger`, `/add-fuel-ledger` |
| Cúp điện | `/add-power-schedule`, `/manual-fetch-outages` |
| Thông tin trạm | `/general-info`, `/add-general-info`, `/edit-general-info/<id>` |
| Chi phí | `/other-expenses`, `/add-other-expense` |
| Export | `/export-*` (fuel, logs, expenses, power schedule) |

## 8. BACKGROUND JOBS

| Job | Schedule | Mô tả |
|-----|----------|-------|
| `scheduled_outage_fetch` | Cron 5:00 AM | Crawl lịch EVNSPC |

## 9. RESTRUCTURE CHECKLIST
- [ ] Rename `power_schedule.html` → `generator.html`
- [ ] Move tab "Chạy Máy" từ admin_panel → generator
- [ ] Move tab "Trạm Site" → "Thông Tin MPĐ" trong generator
- [ ] Rename `admin_panel.html` → `admin.html`
- [ ] Xóa `index.html` + route `/` redirect → VHKT
- [ ] Update sidebar: VHKT lên đầu
- [ ] Áp dụng responsive columns (ẩn cột trên mobile theo spec mục 4)
- [ ] Update routes trong `app.py`
