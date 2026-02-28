# 💡 BRIEF: Tái cấu trúc Navigation — Tách /generator thành nhiều trang

**Ngày tạo:** 2026-02-27
**Brainstorm session:** Tối 27/02

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT

Trang `/generator` hiện gộp **6 tab** vào 1 trang duy nhất (~1700 dòng HTML), gây:
- Load chậm (query tất cả bảng cùng lúc)
- NV thường chỉ dùng 1-2 tab nhưng phải chờ load hết
- Code generator.html quá lớn, khó maintain
- Admin data lẫn với NV data

## 2. GIẢI PHÁP

Tách thành **nhiều trang nhỏ**, dùng **sidebar submenu** để nhóm lại. Mỗi trang chỉ load data của mình.

## 3. ĐỐI TƯỢNG SỬ DỤNG
- **NV (Nhân viên):** Nhập liệu hàng ngày (nhiên liệu, chi phí)
- **Admin:** Xem báo cáo, quản lý, duyệt bất thường

---

## 4. CẤU TRÚC SIDEBAR MỚI

```
📱 Sidebar:
│
├── 🏠 Dashboard                          (giữ nguyên /)
│
├── 📡 VHKT SmartW                        (giữ nguyên /vhkt)
│
├── ⚡ Máy Phát Điện  ▾
│   ├── 📅 Lịch Cúp Điện                 /lich-cup
│   ├── 🔧 Chạy Máy                      /chay-may       (import, giữ nguyên)
│   └── 📋 Thông Tin MPĐ                 /thong-tin-mpd
│
├── 💰 Chi Phí  ▾
│   ├── ⛽ Sổ Nhiên Liệu                 /nhien-lieu
│   ├── 📝 Chi Phí Khác                  /chi-phi-khac
│   └── 💳 Thanh Toán                     /thanh-toan
│
├── 📋 Công Việc Hàng Ngày               (giữ nguyên /daily-work)
│
└── 🔑 Quản Trị (Admin)  ▾               (chỉ admin thấy)
    ├── 📊 Báo Cáo Tổng Quan             /admin/bao-cao
    └── ⚙️ Cấu Hình                      /admin/settings
```

## 5. MAPPING: Tab cũ → Trang mới

| Tab cũ (generator) | Trang mới | Route | Ghi chú |
|---|---|---|---|
| Lịch Cúp | Lịch Cúp Điện | `/lich-cup` | Trang riêng, giữ nguyên chức năng |
| Nhiên Liệu | Sổ Nhiên Liệu | `/nhien-lieu` | Đổi tên "sổ cái" → "sổ" |
| Chi Phí | Chi Phí Khác | `/chi-phi-khac` | Trang riêng |
| Thanh Toán | Thanh Toán | `/thanh-toan` | Trang riêng |
| Chạy Máy | Chạy Máy | `/chay-may` | Giữ nguyên import, chỉnh sửa sau |
| Thông Tin | Thông Tin MPĐ | `/thong-tin-mpd` | Trang riêng |

## 6. PHASE PLAN

### 🚀 Phase 1: Tách trang (làm ngay)
- [ ] Tạo sidebar submenu (Tabler dropdown)
- [ ] Tách tab Lịch Cúp → `/lich-cup` (template + route riêng)
- [ ] Tách tab Nhiên Liệu → `/nhien-lieu` (đổi tên "Sổ Nhiên Liệu")
- [ ] Tách tab Chi Phí → `/chi-phi-khac`
- [ ] Tách tab Thanh Toán → `/thanh-toan`
- [ ] Tách tab Chạy Máy → `/chay-may` (giữ nguyên chức năng import)
- [ ] Tách tab Thông Tin → `/thong-tin-mpd`
- [ ] Tách trang Báo Cáo Admin → `/admin/bao-cao`
- [ ] Cập nhật layout.html sidebar
- [ ] Redirect `/generator?tab=X` → route mới (backward compatible)
- [ ] Cập nhật `/power-schedule` sidebar cho NV

### 🎁 Phase 2: Tính năng mới (làm sau)
- [ ] Quét tiền điện EVN → `/tien-dien`
- [ ] SmartW cross-check MĐ với lịch cúp (tham khảo)
- [ ] Chạy máy auto từ SmartW + duyệt bất thường
- [ ] Báo cáo doanh thu/chi phí tổng quan

### 💭 Backlog
- [ ] Backfill đơn giá cho phiếu STATION_OUT cũ
- [ ] Migration script dữ liệu cũ

## 7. ƯỚC TÍNH

| Phase | Độ phức tạp | Thời gian |
|---|---|---|
| Phase 1 (tách trang) | 🟢 Dễ | 1-2 ngày |
| Phase 2 (tính năng mới) | 🟡 Trung bình | 1-2 tuần |

## 8. BƯỚC TIẾP THEO
→ Chạy `/plan` để lên thiết kế chi tiết Phase 1
