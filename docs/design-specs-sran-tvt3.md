# 🖼️ BẢN ĐẶC TẢ GIAO DIỆN & MOCKUP: DỰ ÁN SRAN 5G TVT3 (VISUAL SPECS)
**Ngày tạo:** 30/09/2026  
**UX Designer:** Mai — Creative Partner (AWF v2.0)  
**Tài liệu kỹ thuật:** [docs/DESIGN_SRAN_TVT3.md](file:///Users/cang_it/Antigravity/TVT3/docs/DESIGN_SRAN_TVT3.md)

---

## 🎨 1. HỆ THỐNG MÀU SẮC (Design System & Color Tokens)

| Nhãn màu | Mã Hex | Ý nghĩa & Vị trí sử dụng |
| :--- | :--- | :--- |
| **Brand Blue** | `#2563eb` / `#1d4ed8` | Màu thương hiệu MobiFone, tiêu đề trang, tab active |
| **Brand Red** | `#ef4444` / `#dc2626` | Huy hiệu MobiFone, cảnh báo trạm vướng (Bottleneck) |
| **On-air Success** | `#10b981` / `#059669` | Trạng thái Đã phát sóng Swap / Đã On-air 5G |
| **Installing Amber**| `#f59e0b` / `#d97706` | Trạng thái Đang thi công / Đang lắp đặt / Giao hàng |
| **Dark Slate Surface**| `#0f172a` (Nền chính) | Nền trang tối hiện đại, dịu mắt khi xem ban đêm |
| **Card Surface** | `#1e293b` / `rgba(30,41,59,0.7)` | Mặt thẻ cụm, mặt bảng dữ liệu (Glassmorphism) |
| **Border Glass** | `rgba(255,255,255,0.08)` | Đường viền mỏng kính mờ cao cấp |

---

## 📱 2. WIREFRAME MOCKUP CHI TIẾT (ASCII Mockups)

### 2.1. Header Điều Hành & Thanh Chuyển Tab (Desktop & Mobile)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  📡 DỰ ÁN HOÁN ĐỔI SRAN & PHÁT SÓNG 5G — TỔ VIỄN THÔNG 3                     │
│  Phạm vi: Cẩm Mỹ • Thống Nhất • Xuân Lộc • Long Khánh • Định Quán • Tân Phú │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐ │
│  │ 📦 TỔNG QUY MÔ│ │ 🔄 SWAP 3G/4G │ │ ⚡ 5G ON-AIR   │ │ ⚠️ TRẠM VƯỚNG   │ │
│  │ 384 Trạm      │ │ 265 / 384     │ │ 119 / 151     │ │ 2 Trạm Đề Xuất  │ │
│  │ 15 Cụm Thi Công│ │ 69.0% Hoàn Thành│ 78.8% On-air  │ │ DNDQ15 & DNDQ33 │ │
│  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────┤
│  [ 📑 15 Cụm Thi Công ]    [ ⚡ Trọng Điểm 5G ]    [ 📋 Tra Cứu & Điều Hành ]│
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.2. Tab 1: Lưới 15 Cụm Thi Công (Cluster Board)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🔍 Lọc theo huyện: [Tất cả] [Cẩm Mỹ] [Thống Nhất] [Xuân Lộc] [Long Khánh]... │
│ 📅 Đợt thi công:   [Tất cả] [Đợt 1: Pilot] [Đợt 2: Tháng 9] [Đợt 3: Tháng 10]│
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────┐ ┌───────────────────────────┐                  │
│ │ DAY_02 • DNI_09_CM        │ │ DAY_04 • DNI_10_TN        │                  │
│ │ Huyện Cẩm Mỹ • Kế hoạch: 25-Aug │ Huyện Thống Nhất • Kế hoạch: 27-Aug       │
│ │ ───────────────────────── │ │ ───────────────────────── │                  │
│ │ Swap 4G: 26/26 [██████]100%│ │ Swap 4G: 24/25 [█████░] 96%│                 │
│ │ 5G Onair: 15/17 [█████░]88%│ │ 5G Onair: 10/10 [██████]100%│                │
│ │ 🟢 Hoàn thành cơ bản     │ │ 🟢 100% 5G On-air         │                  │
│ └───────────────────────────┘ └───────────────────────────┘                  │
│ ┌───────────────────────────┐ ┌───────────────────────────┐                  │
│ │ DAY_19 • DNI_20_DQ        │ │ DAY_20 • DNI_21_DQ        │                  │
│ │ Huyện Định Quán • 25-Sep  │ │ Huyện Định Quán • 02-Oct  │                  │
│ │ ───────────────────────── │ │ ───────────────────────── │                  │
│ │ Swap 4G: 22/26 [█████░] 85%│ │ Đã giao hàng: 24/25 trạm │                  │
│ │ 5G Onair: 6/7  [█████░] 86%│ │ Đang lắp đặt: 19/25 trạm │                  │
│ │ 🟡 Đang hoàn thiện        │ │ 🔵 Đang triển khai        │                  │
│ └───────────────────────────┘ └───────────────────────────┘                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.3. Tab 2: Chiến Dịch 5G TVT3 & Hộp Điều Hành Trạm Vướng
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ⚠️ HỘP ĐIỀU HÀNH TRẠM VƯỚNG 5G ĐỊNH QUÁN:                                     │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ • DNDQ15 (Suối Nho): Vướng cột mặt bằng ➔ Đổi qua DNDQ17 (2.1km) / DNDQ19│ │
│ │ • DNDQ33 (Phú Vinh): Vướng vị trí không lắp được ➔ Đổi qua DNDQ11 (1.8km)│ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ⚡ TIẾN ĐỘ 151 VỊ TRÍ 5G TVT3: (Lọc: [Tất cả 151] [Đã Onair 119] [Chưa Onair 32])
├──────┬──────────┬───────────┬─────────────┬───────────┬─────────────┬────────┤
│ STT  │ Mã Trạm  │ Mã Cũ     │ Huyện       │ Cấu hình  │ Tiến độ     │ Trạng  │
├──────┼──────────┼───────────┼─────────────┼───────────┼─────────────┼────────┤
│ 1    │ DNICMY00 │ DNCM01    │ Cẩm Mỹ      │ 2 Lớp     │ Đã phát sóng│ 🟢 ONAIR
│ 2    │ DNIDQU24 │ DNDQ24    │ Định Quán   │ Đơn lớp   │ Đã phát sóng│ 🟢 ONAIR
│ 3    │ DNDQ15   │ DNDQ15    │ Định Quán   │ Đơn lớp   │ Vướng đổi   │ 🔴 VƯỚNG
└──────┴──────────┴───────────┴─────────────┴───────────┴─────────────┴────────┘
```

---

### 2.4. Tab 3: Tra Cứu Toàn Diện & Xuất Báo Cáo
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [🔍 Nhập mã trạm mới / cũ...]  [Lọc Huyện ▼]  [Lọc Trạng Thái ▼] [📥 Xuất Excel]│
├──────┬──────────┬──────────┬──────────┬────────────┬───────────┬─────────────┤
│ STT  │ Site ID  │ Site Cũ  │ Huyện    │ Cụm        │ Swap 4G   │ 5G Status   │
├──────┼──────────┼──────────┼──────────┼────────────┼───────────┼─────────────┤
│ 1    │ DNICMY00 │ DNCM01   │ Cẩm Mỹ   │ DNI_09_CM  │ 🟢 ĐÃ SWAP│ 🟢 5G ONAIR │
│ 2    │ DNTNS002 │ DNTN02   │ Thống Nhất│ DNI_10_TN │ 🟢 ĐÃ SWAP│ 🟢 5G ONAIR │
│ 3    │ DNITPH10 │ DNTP10   │ Tân Phú  │ DNI_23_TP  │ 🔵 ĐANG LẮP│ ⚪ CHƯA      │
└──────┴──────────┴──────────┴──────────┴────────────┴───────────┴─────────────┘
```

---

### 2.5. Modal Cập Nhật Tiến Độ Bằng Excel (SranImportModal)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  📥 CẬP NHẬT TIẾN ĐỘ DỰ ÁN SRAN 5G TỪ EXCEL DAILY PROGRESS                   │
│  Tự động nhận diện file dạng MBF Dong Nai_S1S4_Daily_Progress_YYYYMMDD.xlsx  │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐   │
│  │                     📁 KÉO & THẢ FILE EXCEL VÀO ĐÂY                   │   │
│  │                 hoặc bấm vào đây để chọn file từ máy tính             │   │
│  └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘   │
│                                                                              │
│  📊 KẾT QUẢ PHÂN TÍCH NHANH (PREVIEW DIFF):                                  │
│  • Tên file: MBF Dong Nai_S1S4_Daily_Progress_ 20260929.xlsx                 │
│  • Tìm thấy sheet: Master_Tracker (1.127 trạm toàn tỉnh)                     │
│  • Khớp địa bàn TVT3 (6 huyện): 384 trạm                                     │
│    + Giao hàng: 371 trạm (96.6%)                                             │
│    + Đã lắp đặt: 336 trạm (87.5%)                                            │
│    + Đã tích hợp: 289 trạm (75.3%)                                           │
│    + Phát sóng On-air: 265 trạm (69.0%)                                      │
│    + Vị trí 5G On-air: 119 / 151 trạm (78.8%)                                │
│                                                                              │
│  🔘 PHẠM VI CẬP NHẬT:                                                        │
│  (●) Chỉ cập nhật 384 trạm thuộc TVT3 (Khuyên dùng - Nhanh, ~2s)            │
│  ( ) Cập nhật toàn bộ 1.127 trạm toàn tỉnh                                  │
│                                                                              │
│  [ Hủy bỏ ]                                       [ 🚀 TIẾN HÀNH CẬP NHẬT ]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 📐 3. BẢNG TIÊU CHUẨN THIẾT KẾ (Component Specs)

### 3.1. Typography
- **Tiêu đề chính (H1):** `text-xl md:text-2xl font-bold tracking-tight text-white`
- **Tiêu đề thẻ / cụm (H2/H3):** `text-base md:text-lg font-semibold text-slate-100`
- **Chỉ số số liệu (Numbers):** `text-2xl md:text-3xl font-extrabold text-emerald-400`
- **Nhãn phụ (Labels):** `text-xs text-slate-400 uppercase tracking-wider`

### 3.2. Spacing & Borders
- **Bo góc thẻ (Radius):** `rounded-xl` (12px) hoặc `rounded-2xl` (16px)
- **Khoảng cách lưới (Grid Gap):** `gap-3 md:gap-4`
- **Màu nền thẻ (Card Background):** `bg-slate-900/60 backdrop-blur-md border border-slate-800/80`
- **Hover Card Effect:** `hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200`
