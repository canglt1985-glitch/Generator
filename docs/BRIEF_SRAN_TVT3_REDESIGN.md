# 💡 BRIEF: Thiết Kế Lại Module Dự Án SRAN 5G — Chuyên Biệt Cho TVT3
**Ngày tạo:** 30/09/2026  
**Chủ đề:** Tái cấu trúc và tinh gọn module Dự án SRAN & 5G chỉ phục vụ địa bàn Tổ Viễn Thông 3 (TVT3).

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT (Pain Points)
1. **Dữ liệu bị loãng toàn tỉnh:** Trang hiện tại nạp 1.131 trạm toàn tỉnh Đồng Nai (gồm cả Biên Hòa, Long Thành, Nhơn Trạch, Trảng Bom, Vĩnh Cửu của VT1 và VT2) cùng 25 Cluster toàn tỉnh. TVT3 thực tế chỉ quản lý **387 trạm (15 Cluster)**.
2. **Giao diện quá nặng và rối:** File code `Sran5gProject.jsx` phình to tới **3.975 dòng**, chứa nhiều bộ lọc thừa (chọn VT1/VT2/VT3, chọn toàn tỉnh, các mốc thời gian ngoài địa bàn).
3. **Trải nghiệm người dùng chưa tập trung:** Nhân sự TVT3 khi mở trang phải thực hiện nhiều thao tác lọc hoặc thấy các số liệu không thuộc trách nhiệm quản lý của mình.

---

## 2. MỤC TIÊU & GIẢI PHÁP ĐỀ XUẤT (Core Goals)
- **Tập trung 100% vào TVT3:** Khóa cứng phạm vi dữ liệu trong 6 huyện: **Long Khánh, Thống Nhất, Cẩm Mỹ, Xuân Lộc, Định Quán, Tân Phú**.
- **Cấu trúc lại thành 15 Cluster TVT3:** Loại bỏ 10 cluster của VT1/VT2, chia rõ ràng theo 3 đợt thi công thực tế của TVT3.
- **Đơn giản hóa giao diện (Clean UI/UX):** Giảm dung lượng code từ ~4.000 dòng xuống còn ~800 - 1.000 dòng, tải trang nhanh tức thì, tối ưu hiển thị trên cả Mobile và Desktop.
- **Tách bạch 2 trọng tâm nghiệp vụ:**
  - Tiến độ Hoán đổi thiết bị (Swap SRAN 3G/4G).
  - Tiến độ Phát sóng 5G mới (On-air 5G, trạm 2 lớp, xử lý trạm vướng).

---

## 3. PHẠM VI DỮ LIỆU CỦA TVT3 (Data Scope)

### 3.1. 6 Huyện / Thành phố thuộc TVT3:
| Địa bàn | Số trạm SRAN | Số trạm 5G | Ghi chú cụm thi công |
| :--- | :---: | :---: | :--- |
| **Xuân Lộc** | ~89 | 42 | Cụm 15, 17, 18, 19 |
| **Định Quán** | ~69 | 17 | Cụm 20, 21, 22 |
| **Long Khánh** | ~63 | 30 | Cụm 13, 14 |
| **Thống Nhất** | ~58 | 24 | Cụm 10, 12 |
| **Cẩm Mỹ** | ~58 | 23 | Cụm 09, 16 |
| **Tân Phú** | ~50 | 14 | Cụm 23, 24 |
| **TỔNG TVT3** | **~387 trạm** | **~150 trạm 5G** | **15 Cluster** |

### 3.2. 15 Cluster của TVT3 theo Lộ Trình:
- **Giai đoạn 1 (Pilot & Khởi động):**
  - `DNI_09_CM` (Cẩm Mỹ): 26 trạm 4G • 17 trạm 5G
  - `DNI_10_TN` (Thống Nhất): 25 trạm 4G • 10 trạm 5G
  - `DNI_16_CM` (Cẩm Mỹ): 26 trạm 4G • 6 trạm 5G
- **Giai đoạn 2 (Trọng điểm Tháng 9):**
  - `DNI_15_XL`, `DNI_17_XL`, `DNI_18_XL`, `DNI_19_XL` (Xuân Lộc - 99 trạm)
  - `DNI_13_LK`, `DNI_14_LK` (Long Khánh - 52 trạm)
  - `DNI_12_TN` (Thống Nhất - 26 trạm)
  - `DNI_20_DQ`, `DNI_21_DQ` (Định Quán - 50 trạm)
- **Giai đoạn 3 (Nước rút Tháng 10):**
  - `DNI_22_DQ` (Định Quán - 25 trạm)
  - `DNI_23_TP`, `DNI_24_TP` (Tân Phú - 51 trạm)

---

## 4. ĐỀ XUẤT CẤU TRÚC GIAO DIỆN MỚI (New Architecture)

### 📊 Banner Tổng Quan (Executive KPI Cards):
1. **Tổng quan Dự án TVT3:** Tổng trạm (387) • Trạm Swap (4G) • Trạm 5G Mới.
2. **Tỷ lệ Hoàn thành Swap SRAN (%):** Đã phát sóng swap / Kế hoạch.
3. **Tỷ lệ Lên sóng 5G (%):** Đã On-air / Kế hoạch (có phân biệt Single 5G & Dual 5G 2 lớp).
4. **Cảnh báo Vướng Mắc (Bottlenecks):** Số trạm vướng mặt bằng / nguồn điện / cần đổi trạm (như DNDQ15, DNDQ33).

---

### 📑 3 Tab Chức Năng Tinh Gọn:

#### 1️⃣ Tab "15 Cụm Thi Công" (Cluster View - Mặc định)
- Hiển thị danh sách 15 Cụm của TVT3 dưới dạng lưới thẻ (Grid Cards).
- Mỗi thẻ gồm: Tên cụm, Địa bàn huyện, Tiến độ thanh bar (Swap & 5G), Ngày kế hoạch, Đối tác thi công.
- Bộ lọc nhanh: Lọc theo Huyện (6 huyện) hoặc theo Đợt thi công (Đã xong / Đang làm / Tháng 10).
- Bấm vào cụm -> Mở danh sách trạm chi tiết của cụm đó.

#### 2️⃣ Tab "Chiến Dịch 5G TVT3" (5G Rollout Focus)
- Chuyên sâu cho dự án 5G: Danh sách ~150 vị trí trạm 5G TVT3.
- Các cột quan trọng: Mã trạm mới/cũ, Huyện, Cấu hình 5G (Đơn lớp 2600 / 2 lớp 2600+3800), Tiến độ các bước: Khảo sát -> TSSR -> Giao hàng -> Lắp đặt -> Tích hợp -> On-air.
- Khu vực xử lý trạm vướng: Đánh dấu các trạm không thi công được và phương án trạm thay thế lân cận.

#### 3️⃣ Tab "Tra Cứu & Điều Hành" (Master Table & Export)
- Bảng dữ liệu toàn bộ trạm TVT3 với thanh tìm kiếm nhanh (gõ mã trạm mới/cũ ra ngay).
- Bộ lọc đa chiều: Theo huyện, trạng thái (Chưa giao / Đang lắp / Đã On-air), loại thiết bị.
- Nút xuất báo cáo Excel chuẩn cho TVT3.

---

## 5. KẾ HOẠCH TRIỂN KHAI (Next Steps)
1. **Thảo luận & Thống nhất:** Duyệt phương án cấu trúc và bố cục.
2. **Kế hoạch chi tiết (`/plan`):**
   - Tách file cấu hình: `sranTvt3Config.js` chứa danh mục 15 Cluster và các hàm phân loại TVT3.
   - Viết lại component `Sran5gProject.jsx` tinh gọn, hiện đại, module hóa.
3. **Thực thi code (`/code`):** Triển khai giao diện mới.
4. **Kiểm thử (`/test`):** Đối soát số liệu trạm TVT3 trên Supabase khớp 100%.
