# 💡 BRIEF: Tái Cấu Trúc App v2.0 — Xóa generator.html, Tối Ưu Tốc Độ

**Ngày tạo:** 2026-02-28
**Brainstorm:** Phân tích performance + UX flow

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT

### Hiện trạng:
- **generator.html** = 1 file **83KB, 1,499 dòng** chứa HTML cho 6 tab
- Server render toàn bộ HTML dù chỉ hiện 1 tab → **chậm**
- **GeneratorLog: 3,324 records** + **GeneralInfo: 391 records** load nặng
- Lịch Cúp Điện đặt ở trang riêng, tách biệt khỏi alarm vận hành → UX kém
- VHKT SmartW (vhkt.html) đã có kiến trúc API + lazy-load rất tốt nhưng thiếu lịch cúp

### Mục tiêu:
- Xóa bỏ generator.html (file khổng lồ)
- Tách thành các trang nhẹ, load nhanh
- Gộp lịch cúp vào VHKT cho UX liền mạch
- Data mặc định hiện tháng hiện tại, tra cứu khi cần

---

## 2. GIẢI PHÁP — Chia thành 3 khu vực

### 📡 VHKT RAN (`/vhkt`) — Giám sát vận hành

**Đổi tên:** VHKT SmartW → **VHKT RAN**

**Tab cards** (Lịch Cúp là tab đầu tiên, mặc định active):

| # | Tab | Data source | Ghi chú |
|---|-----|-------------|---------|
| 1 | 📅 **Lịch Cúp** ★ | API → PowerSchedule (ngày ≥ hôm nay) | Read-only, data EVN tự động fetch |
| 2 | ⚠️ MĐ | API → md.json | Giữ nguyên |
| 3 | 🟢 MPĐ | API → mpd.json | Giữ nguyên |
| 4 | 🔴 MLL | API → mll.json | Giữ nguyên |
| 5 | 📡 CellOff | API → mll_cell.json | Giữ nguyên |
| 6 | 📊 SLA | API → vhkt.json | Giữ nguyên |

**★ = mặc định active khi mở trang**

> Lịch Cúp chỉ XEM, không có CRUD. Data được scheduler tự động fetch từ EVNSPC (5:00 AM hàng ngày).

---

### 💰 Chi Phí (`/chi-phi`) — Quản lý tài chính

**1 trang, 3 tab bên trong:**

| # | Tab | Data | Mặc định |
|---|-----|------|----------|
| 1 | ⛽ **Nhiên Liệu** ★ | FuelLedger | Tháng hiện tại, tra cứu tháng cũ |
| 2 | 📝 **Chi Phí Khác** | OtherExpense | Tháng hiện tại |
| 3 | 📊 **Tổng Hợp** | Aggregation queries | Theo năm/tháng, nhóm thanh toán |

**Kiến trúc:**
- Chuyển sang load data qua API (giống VHKT) thay vì server-render
- Mỗi tab chỉ query data khi user bấm vào
- Default filter: tháng hiện tại → ít data → load nhanh

---

### 🔧 Quản Trị (`/admin/*`) — Admin only, mỗi mục = trang riêng

| Trang | URL | Chức năng | Data |
|-------|-----|-----------|------|
| 📊 Báo Cáo | `/admin/bao-cao` | Tổng hợp báo cáo | Aggregation queries |
| 🔧 Chạy Máy | `/admin/chay-may` | Log chạy máy phát | GeneratorLog (filter tháng) |
| 📋 Thông Tin MPĐ | `/admin/thong-tin-mpd` | Danh sách trạm | GeneralInfo (search) |
| ⚙️ Cấu Hình | `/admin/cau-hinh` | SmartW, settings | Config files |

**Tối ưu:**
- Chạy Máy: mặc định tháng hiện tại (không load cả năm 3,324 records)
- Thông Tin MPĐ: search theo mã trạm, không load full 391 records

---

## 3. SIDEBAR NAVIGATION

```
─── All Users ───────────────────
📡 VHKT RAN               → /vhkt
💰 Chi Phí                → /chi-phi
📋 Công Việc Hàng Ngày    → /daily-work

─── Admin Only ──────────────────
🔧 Quản Trị ▾
    📊 Báo Cáo             → /admin/bao-cao
    🔧 Chạy Máy            → /admin/chay-may
    📋 Thông Tin MPĐ       → /admin/thong-tin-mpd
    ⚙️ Cấu Hình            → /admin/cau-hinh
```

---

## 4. SO SÁNH TRƯỚC/SAU

| | Trước | Sau |
|---|---|---|
| **File chính** | generator.html (83KB) | Xóa bỏ → chia 3 trang nhẹ |
| **VHKT** | Không có lịch cúp | Có lịch cúp (tab đầu tiên) |
| **Tên** | VHKT SmartW | **VHKT RAN** |
| **Chi phí** | 3 tab trong generator.html | Trang riêng `/chi-phi` |
| **Admin** | Tab trong generator.html | 4 trang riêng `/admin/*` |
| **Data load** | Server render ALL | API lazy-load per tab |
| **Default filter** | Cả năm hoặc limit(200) | Tháng hiện tại |
| **Sidebar** | 6+ mục + submenu | 3 mục NV + 1 dropdown Admin |

---

## 5. FILES BỊ ẢNH HƯỞNG

### Xóa:
- `templates/generator.html` (83KB) → thay bằng `chi_phi.html` (~25KB)
- `templates/power_schedule.html` → không cần nữa (lịch cúp trong VHKT)

### Sửa lớn:
- `templates/vhkt.html` → Thêm tab Lịch Cúp, đổi tên VHKT RAN
- `templates/layout.html` → Sidebar mới
- `generator/routes.py` → Tách route Chi Phí + Admin
- `smartw/routes.py` → Thêm API lịch cúp (`/api/smartw/lich-cup`)

### Tạo mới:
- `templates/chi_phi.html` → Trang Chi Phí (3 tab)
- `templates/admin_chay_may.html` → Trang Chạy Máy
- `templates/admin_thong_tin.html` → Trang Thông Tin MPĐ  
- `templates/admin_bao_cao.html` → Trang Báo Cáo
- `templates/admin_cau_hinh.html` → Trang Cấu Hình

### Giữ nguyên:
- `smartw/scraper.py, worker.py, config.py` → Không đổi
- `models.py, extensions.py` → Không đổi
- `templates/daily_work.html` → Không đổi

---

## 6. ƯỚC TÍNH

| Hạng mục | Độ phức tạp | Ghi chú |
|----------|-------------|---------|
| Thêm tab Lịch Cúp vào VHKT | 🟢 Dễ | Đã có pattern, thêm 1 tab + 1 API |
| Tạo trang Chi Phí | 🟡 TB | Tách HTML + chuyển sang API load |
| Tạo 4 trang Admin | 🟡 TB | Tách từ generator.html |
| Sidebar mới | 🟢 Dễ | Đã có code layout.html |
| Backward compat redirects | 🟢 Dễ | /generator?tab=X → route mới |
| Xóa generator.html | 🟢 Dễ | Sau khi tất cả trang mới OK |

**Tổng ước tính:** 3-5 ngày (chia phase)

---

## 7. BƯỚC TIẾP THEO

→ Chạy `/plan` để lên thiết kế chi tiết từng phase
