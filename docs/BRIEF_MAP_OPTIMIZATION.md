# 💡 BRIEF: Tối Ưu Bản Đồ Số — Chuẩn Hóa Theo Quy Hoạch Vô Tuyến & Chuẩn 5G-A (5G-Advanced)

**Ngày cập nhật:** 01/10/2026  
**Chủ đề:** Bản đồ Trạm Vô Tuyến & Hiệu năng hệ thống (TVT3 Web App)  
**Tài liệu tham chiếu:** DataSite TVT2 (`tvt2.web.app/datasite.html`)  
**Quy chuẩn thuật ngữ:** **5G 2 lớp chính là 5G-A (5G-Advanced)** gộp sóng đa băng tần (Carrier Aggregation NR2600 + NR3800).

---

## 1. QUY CHUẨN THUẬT NGỮ CÔNG NGHỆ (CHUẨN 5G-A)

- **5G Đơn lớp (1 băng tần 2.6 GHz):** Ký hiệu chuẩn là **`5G`**.
- **5G Hai lớp (gộp 2 băng tần 2.6 GHz + 3.8 GHz):** Ký hiệu chuẩn là **`5G-A`** (5G-Advanced).
- Khi kết hợp với trạm quy hoạch SRAN:
  - Trạm SRAN có 5G-A: **`SRAN / 5G-A`** (Màu tím `#a855f7`, huy hiệu 👑).
  - Trạm SRAN có 5G 1 lớp: **`SRAN / 5G`** (Màu đỏ `#ef4444`, huy hiệu ⚡).
  - Trạm SRAN 3G/4G: **`SRAN`** (Màu cyan `#06b6d4`).
  - Trạm ngoài SRAN có 5G-A: **`5G-A`** (hoặc `3G/4G/5G-A`).
  - Trạm ngoài SRAN có 5G 1 lớp: **`3G/4G/5G`**.
  - Trạm ngoài SRAN 3G/4G hiện hữu (Nokia như `DNDQ37`): **`3G/4G`** (Màu xanh dương `#3b82f6`).
  - Trạm đơn công nghệ: **`4G`** (Xanh dương) / **`3G`** (Xanh lá).

---

## 2. MA TRẬN PHÂN LOẠI CÔNG NGHỆ QUY HOẠCH CHUẨN HÓA

| Phân Loại Quy Hoạch | Nhãn Hiển Thị (`tech`) | Huy Hiệu Đầy Đủ (`label`) | Màu Sắc | Tiêu Chí Nhận Diện Quy Hoạch |
|---|---|---|---|---|
| **Quy hoạch SRAN + 5G-A** | `SRAN / 5G-A` | 5G-A (2.6G + 3.8G) 👑 | 🟣 Tím (`#a855f7`) | File ERA có cả 2 lớp NR2600 + NR3800 |
| **Quy hoạch SRAN + 5G** | `SRAN / 5G` | SRAN / 5G (2.6 GHz) ⚡ | 🔴 Đỏ tươi (`#ef4444`) | File ERA có lớp NR2600 |
| **Quy hoạch SRAN (3G/4G)** | `SRAN` | Swap SRAN (3G/4G) | 🔵 Cyan (`#06b6d4`) | File ERA (4G/3G) chưa có 5G |
| **Ngoài SRAN + Có 5G-A** | `5G-A` | 5G-Advanced Hiện hữu 👑 | 🟣 Tím (`#a855f7`) | Ngoài ERA, có cell NR2600 + NR3800 |
| **Ngoài SRAN + Có 5G** | `3G/4G/5G` | 3G/4G/5G Hiện hữu | 🟠 Cam (`#f97316`) | Ngoài ERA nhưng có cell 5G |
| **Ngoài SRAN (Hiện hữu)** | `3G/4G` | 3G/4G Hiện hữu | 🔷 Xanh dương (`#3b82f6`) | Ngoài ERA, phát 3G + 4G (VD: Nokia `DNDQ37`) |
| **Đơn công nghệ 4G** | `4G` | 4G LTE | 🔷 Xanh dương (`#3b82f6`) | Chỉ có cell 4G |
| **Đơn công nghệ 3G** | `3G` | 3G Only | 🟢 Xanh lá (`#22c55e`) | Chỉ có cell 3G |

---

## 3. THỂ HIỆN TRÊN BẢN ĐỒ & CÁNH SÓNG VÔ TUYẾN

### 3.1. Cánh Sóng Đa Tầng (Cell Sector Wedges)
- **Vòng 1 (Trong cùng - R: 18m–42m):** 🟢 **3G** (`#22c55e`).
- **Vòng 2 (Giữa - R: 46m–72m):** 🔵 **4G / 4G SRAN** (`#06b6d4`).
- **Vòng 3 (Ngoài - R: 76m–104m):** 🔴 **5G** (NR 2600 MHz, `#ef4444`).
- **Vòng 4 (Ngoài cùng - R: 108m–136m):** 🟠 **5G-A** (NR 3800 MHz, `#f97316` - Chỉ xuất hiện tại các trạm 5G-A).

### 3.2. Danh Sách Cell Gom Nhóm Theo Góc Hướng (Chuẩn TVT2)
```text
DANH SÁCH CELL (19) - Trạm 5G-A (DNLK07)
├── Az: 0°    [3G] [4G] [5G-A (3800/2600)]
├── Az: 150°  [3G] [4G] [5G-A (3800/2600)]
└── Az: 250°  [3G] [4G] [5G-A (3800/2600)]
```
*(Trạm không có 5G như DNDQ37):*
```text
DANH SÁCH CELL (7) - Trạm 3G/4G Hiện Hữu (DNDQ37)
├── Sector A (Chờ cập nhật góc hướng)  [3G] [4G]
├── Sector B (Chờ cập nhật góc hướng)  [3G] [4G]
├── Sector C (Chờ cập nhật góc hướng)  [3G] [4G]
└── Sector D (Chờ cập nhật góc hướng)  [3G]
```

### 3.3. Các Tinh Chỉnh Khác
1. **Nhãn mã trạm:** Text chữ trắng không hộp nền/viền đen, phủ `text-shadow` đen tương phản cao.
2. **Lấy tọa độ:** Chuyển sang **Double Click (2 click)** để không bị click nhầm.
3. **Hiệu năng:** `preferCanvas: true` của Leaflet cho render Canvas 60fps.
