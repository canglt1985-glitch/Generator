# 🎨 BẢN THIẾT KẾ KỸ THUẬT: GIAO DIỆN LIGHT MODE & COMPACT CARDS
## DỰ ÁN SRAN & 5G TỔ VIỄN THÔNG 3 (TVT3)

**Ngày cập nhật:** 30/09/2026  
**Chủ đề:** Light Mode • Compact Card Density • Hiện đại & Tinh gọn  
**Mục tiêu:** Chuyển đổi 100% sang giao diện Sáng (Light Mode), thu nhỏ các thẻ thông tin gọn gàng để tối ưu không gian hiển thị, giúp nhân sự kỹ thuật TVT3 theo dõi tiến độ nhanh chóng mà không phải cuộn trang nhiều.

---

## 1. HỆ THỐNG MÀU SẮC LIGHT MODE (Light Color Tokens)

| Thành phần | Mã Tailwind CSS | Mô tả & Ứng dụng |
| :--- | :--- | :--- |
| **Nền trang chính** | `bg-slate-50` / `bg-gray-50` | Nền sáng dịu mắt, tương phản mềm mại với thẻ card |
| **Nền Card / Thẻ** | `bg-white` | Màu trắng tinh khôi, tạo chiều sâu thị giác |
| **Đường viền (Borders)** | `border-slate-200` | Đường nét thanh mảnh, chia tách tinh tế |
| **Chữ tiêu đề (Heading)** | `text-slate-900` / `text-slate-800` | Sắc nét, dễ đọc dưới ánh sáng mạnh |
| **Chữ nội dung phụ** | `text-slate-600` / `text-slate-500` | Dịu nhẹ, ghi chú thông số kỹ thuật |
| **Swap 4G Accent** | `text-emerald-700`, `bg-emerald-50`, `border-emerald-200` | Tiến độ Swap 4G hoàn thành |
| **5G Rollout Accent** | `text-purple-700`, `bg-purple-50`, `border-purple-200` | Chiến dịch 5G phát sóng |
| **Cụm / TVT3 Accent** | `text-blue-700`, `bg-blue-50`, `border-blue-200` | Màu thương hiệu Mobifone & Địa bàn |
| **Cảnh báo Vướng Accent** | `text-amber-800`, `bg-amber-50`, `border-amber-200` | Cảnh báo vướng trạm Định Quán |
| **Đổ bóng (Shadow)** | `shadow-sm hover:shadow-md` | Đổ bóng tinh tế, hiện đại, không thô ráp |

---

## 2. QUY CHUẨN THIẾT KẾ THẺ NHỎ GỌN (COMPACT DENSITY)

### 2.1. Banner Điều Hành KPI (Executive Header)
- **Trước đây (Dark mode):** Chiếm ~400px chiều cao với font chữ số khổng lồ (text-3xl) và gradient tối màu.
- **Thiết kế mới (Light Compact):** 
  - Chiều cao thu gọn còn ~140px.
  - Hàng tiêu đề inline gọn gàng kèm nút bấm `[📥 Nhập Excel]` và `[🔄 Làm mới]`.
  - 4 Thẻ KPI dẹp mỏng (padding `p-3`), số liệu `text-xl font-bold font-mono`, progress bar mỏng 4px (`h-1.5`).

### 2.2. Tab 1: 15 Thẻ Cụm Thi Công (Cluster Cards)
- **Bố cục lưới:** Mở rộng lên 4 cột trên màn hình lớn (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`).
- **Nội dung thẻ rút gọn:**
  - Header thẻ: Mã cụm (`Day_02 • DNI_09_CM`) + Tên Huyện + Ngày plan trên 1 dòng.
  - Thanh tiến độ kép:
    - Swap 4G: `26/26 trạm` (thanh xanh lá mỏng 4px, tỷ lệ %).
    - On-air 5G: `15/17 trạm` (thanh tím mỏng 4px, tỷ lệ %).
  - Dòng tóm tắt: `G:26 • L:26 • TH:26` (Giao/Lắp/Tích hợp) dạng inline mini chips.
  - Nút bấm xem trạm: Dạng link tinh gọn `Xem trạm ➔` thay vì nút bấm to toàn chiều rộng.

### 2.3. Tab 2: Chiến Dịch 5G & Hộp Điều Hành Vướng
- **Hộp trạm vướng Định Quán:**
  - Bọc trong dải Alert mỏng nền vàng nhạt `bg-amber-50 border-amber-200`.
  - Hiển thị 2 mini-cards cho `DNDQ15` và `DNDQ33` với phương án đổi trạm trực diện (`➔ DNDQ17/19` và `➔ DNDQ11/02`).
- **Bảng 151 trạm 5G:**
  - Compact Table Density: padding dòng `py-2 px-3` (thay vì `py-3 px-4`).
  - Badge trạng thái On-air gọn gàng: Chấm tròn xanh/vàng nhỏ.

### 2.4. Tab 3: Bảng Tra Cứu Toàn Diện (Master Table)
- **Thanh công cụ (Filter Bar):** Gộp Ô tìm kiếm + Bộ lọc Huyện + Lọc trạng thái + Nút Xuất Excel lên **1 hàng duy nhất** (hoặc 2 hàng trên mobile).
- **Table Density:** Hiển thị được 25 dòng trạm mà không bị tràn màn hình, xem nhanh các mốc ngày (Giao hàng, Lắp đặt, On-air).

### 2.5. Modals (Chi Tiết Trạm & Import Excel)
- Nền trắng `bg-white`, đường viền `border-slate-200`, backdrop mờ tối nhẹ `bg-slate-900/40 backdrop-blur-sm`.
- Timeline 6 bước dạng các ô card nhỏ bo góc `rounded-lg bg-slate-50 border-slate-200`.

---

## 3. WIREFRAME MÔ PHỎNG GIAO DIỆN LIGHT MODE (ASCII MOCKUP)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🏢 TỔ VIỄN THÔNG 3 (TVT3) — TIẾN ĐỘ DỰ ÁN SRAN & 5G (6 Huyện • 15 Cụm)      [📥 Nhập Excel]  [🔄 Làm Mới]   │
├─────────────────┬──────────────────────┬──────────────────────┬─────────────────────────────────────────────┤
│ 📍 Quy Mô TVT3  │ 📶 Swap 4G On-Air    │ ⚡ Chiến Dịch 5G     │ ⚠️ Trạm Vướng Đ.Quán                       │
│ 384 Trạm        │ 265 / 384  (69.0%)   │ 119 / 151  (78.8%)   │ 2 Trạm (DNDQ15, DNDQ33)                     │
│ 15 Cụm • 6 Huyện│ [████████░░░░] L:336 │ [█████████░░░] 2 Lớp │ Xem phương án xử lý ➔                       │
└─────────────────┴──────────────────────┴──────────────────────┴─────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [ 📑 15 Cụm Thi Công (15) ]    [ ⚡ Chiến Dịch 5G (151) ]    [ 📊 Bảng Tra Cứu & Xuất Excel (384) ]          │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

▼ TAB 1: 15 CỤM THI CÔNG (LƯỚI 4 CỘT COMPACT CARDS - NỀN TRẮNG)
┌──────────────────────────┐ ┌──────────────────────────┐ ┌──────────────────────────┐ ┌──────────────────────────┐
│ Day_02 • DNI_09_CM [100%]│ │ Day_04 • DNI_10_TN [96%] │ │ Day_06 • DNI_16_CM [100%]│ │ Day_08 • DNI_15_XL [96%] │
│ Cẩm Mỹ • Kế hoạch: 25-Aug│ │ Thống Nhất • 27-Aug      │ │ Cẩm Mỹ • 04-Sep          │ │ Xuân Lộc • 11-Sep        │
│ 4G: 26/26 [████████] 100%│ │ 4G: 24/25 [███████░] 96% │ │ 4G: 26/26 [████████] 100%│ │ 4G: 24/25 [███████░] 96% │
│ 5G: 15/17 [███████░] 88% │ │ 5G: 10/10 [████████] 100%│ │ 5G:  5/6  [███████░] 83% │ │ 5G: 10/14 [██████░░] 71% │
│ G:26 • L:26 • TH:26      │ │ G:24 • L:24 • TH:24      │ │ G:26 • L:26 • TH:26      │ │ G:25 • L:25 • TH:24      │
│ [ Xem 26 trạm ➔ ]        │ │ [ Xem 25 trạm ➔ ]        │ │ [ Xem 26 trạm ➔ ]        │ │ [ Xem 25 trạm ➔ ]        │
└──────────────────────────┘ └──────────────────────────┘ └──────────────────────────┘ └──────────────────────────┘
```

---

## 4. CHI TIẾT CÁC COMPONENT CẦN CHUYỂN ĐỔI

1. [Sran5gProject.jsx](file:///Users/cang_it/Antigravity/TVT3/tvt3_v2/src/pages/Sran5gProject.jsx):
   - Đổi container `min-h-screen bg-slate-50 text-slate-800`.
   - Header banner: `bg-white border-slate-200 shadow-sm`.
   - KPI cards: Nền trắng, viền xám nhạt `border-slate-200`, chữ số màu đậm, icon nổi bật.
   - Tab switchers: Nền xám nhạt `bg-slate-100`, tab active `bg-white shadow-sm text-blue-600 font-bold`.

2. [SranClusterBoard.jsx](file:///Users/cang_it/Antigravity/TVT3/tvt3_v2/src/components/sran/SranClusterBoard.jsx):
   - Filter bar: `bg-white border-slate-200 shadow-sm`.
   - Lưới 4 cột `xl:grid-cols-4`, mỗi card nền trắng `bg-white border-slate-200 hover:border-blue-400 hover:shadow-md`.
   - Thanh tiến độ: Nền `bg-slate-100`, vạch Swap xanh lá `bg-emerald-500`, vạch 5G tím `bg-purple-500`.

3. [Sran5gRollout.jsx](file:///Users/cang_it/Antigravity/TVT3/tvt3_v2/src/components/sran/Sran5gRollout.jsx):
   - Alert vướng trạm: `bg-amber-50 border-amber-200 text-amber-900`.
   - Filter & Bảng 5G: Nền trắng, table header `bg-slate-50 text-slate-600`, hàng hover `hover:bg-slate-50`.

4. [SranMasterTable.jsx](file:///Users/cang_it/Antigravity/TVT3/tvt3_v2/src/components/sran/SranMasterTable.jsx):
   - Ô tìm kiếm input: Nền trắng `bg-white border-slate-300 text-slate-900`.
   - Nút xuất Excel: Xanh lá cây tươi sáng `bg-emerald-600 hover:bg-emerald-700 text-white`.
   - Table rows: Nền trắng xen kẽ nhẹ, chữ số ngày tháng rõ ràng.

5. [SranSiteModal.jsx](file:///Users/cang_it/Antigravity/TVT3/tvt3_v2/src/components/sran/SranSiteModal.jsx) & [SranImportModal.jsx](file:///Users/cang_it/Antigravity/TVT3/tvt3_v2/src/components/sran/SranImportModal.jsx):
   - Modal container: `bg-white border-slate-200 shadow-2xl text-slate-800`.
   - Header & Footer: `bg-slate-50 border-slate-200`.
   - Dropzone import Excel: Nền `bg-slate-50 border-slate-300 hover:border-blue-500 hover:bg-blue-50/30`.

---

## 5. BẢNG SO SÁNH KÍCH THƯỚC & TRẢI NGHIỆM

| Tiêu chí | Bản Dark Mode cũ | Bản Light Mode Compact mới |
| :--- | :--- | :--- |
| **Tone màu chủ đạo** | Đen / Slate-950 / Tối | Trắng / Slate-50 / Xanh nhạt sáng sủa |
| **Chiều cao Header KPI** | ~380px (chiếm 45% màn hình) | ~140px (chiếm ~18% màn hình, siêu gọn) |
| **Số cột thẻ Cụm (Desktop)** | 3 cột (card to 280px) | **4 cột** (card compact 180px, thấy 8 cụm 1 lúc) |
| **Mật độ bảng (Density)** | Padding `py-3 px-4` | Padding `py-2 px-3` (tiết kiệm 30% diện tích) |
| **Độ rõ nét ngoài công trường** | Khó nhìn khi ra nắng | **Rõ ràng, tương phản cao, dễ nhìn ngoài trời** |
