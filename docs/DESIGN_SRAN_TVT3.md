# 🎨 BẢN THIẾT KẾ KỸ THUẬT: DỰ ÁN SRAN & 5G TVT3 (DESIGN SPECIFICATION)
**Ngày tạo:** 30/09/2026  
**Kiến trúc sư:** Minh — Solution Architect (AWF v2.1)  
**Phạm vi:** Tổ Viễn Thông 3 (TVT3 - Đồng Nai)  
**Tài liệu cơ sở:** [docs/BRIEF_SRAN_TVT3_REDESIGN.md](file:///Users/cang_it/Antigravity/TVT3/docs/BRIEF_SRAN_TVT3_REDESIGN.md)

---

## 1. KIẾN TRÚC DỮ LIỆU & LUỒNG XỬ LÝ (Data Architecture)

### 1.1. Nguồn Dữ Liệu
- **Cơ sở dữ liệu Supabase:** Bảng `sran_5g_tracker` (đã cập nhật tiến độ mới nhất ngày 29/09/2026).
- **Bộ lọc phạm vi dữ liệu cứng:** Chỉ nạp dữ liệu thuộc 6 huyện TVT3:
  `['Cẩm Mỹ', 'Thống Nhất', 'Xuân Lộc', 'Long Khánh', 'Định Quán', 'Tân Phú']` (bao gồm `Xuân Thành` sáp nhập vào `Xuân Lộc`).
- **Tập danh mục 15 Cụm thi công:** Import từ [tvt3_v2/src/config/sranTvt3Config.js](file:///Users/cang_it/Antigravity/TVT3/tvt3_v2/src/config/sranTvt3Config.js).

### 1.2. Luồng Xử Lý Dữ Liệu (Data Pipeline)
```
┌────────────────────────────────┐
│   Supabase: sran_5g_tracker    │ (1.127 trạm toàn tỉnh)
└───────────────┬────────────────┘
                │ Filter: district IN (TVT3_DISTRICTS)
                ▼
┌────────────────────────────────┐
│      TVT3 Clean Dataset        │ (384 trạm TVT3)
└───────┬──────────────┬─────────┘
        │              │
        ▼              ▼
┌──────────────┐ ┌──────────────┐
│  Swap 3G/4G  │ │ 5G Rollout   │
│  (384 trạm)  │ │ (151 trạm)   │
└───────┬──────┘ └──────┬───────┘
        │               │
        └───────┬───────┘
                ▼
┌───────────────────────────────────────────────┐
│     15 Clusters Progress Aggregator           │
│     (Day_02 ➔ Day_23 theo sranTvt3Config.js)   │
└───────────────────────────────────────────────┘
```

---

## 2. CẤU TRÚC COMPONENT FRONTEND (Modular Architecture)
Thay thế file đơn khối `Sran5gProject.jsx` cũ (~4.000 dòng) bằng mô hình phân rã module gọn gàng:

```
tvt3_v2/src/
├── config/
│   └── sranTvt3Config.js               # Cấu hình 15 Cụm, Huyện, Giai đoạn TVT3 (~160 dòng)
├── pages/
│   └── Sran5gProject.jsx               # Page Shell: Header KPI, Filter Bar, Tab Switcher (~280 dòng)
└── components/sran/
    ├── SranClusterBoard.jsx            # Tab 1: Lưới 15 Thẻ Cụm thi công (~260 dòng)
    ├── Sran5gRollout.jsx               # Tab 2: Theo dõi chiến dịch 5G & Trạm vướng (~280 dòng)
    ├── SranMasterTable.jsx             # Tab 3: Bảng tra cứu toàn diện & Xuất Excel (~320 dòng)
    ├── SranSiteModal.jsx               # Modal xem chi tiết từng trạm (~180 dòng)
    └── SranImportModal.jsx             # Modal Kéo thả & Cập nhật tiến độ từ Excel Daily Progress (~250 dòng)
```
> **Ưu điểm:** Tổng dung lượng code giảm từ ~3.975 dòng xuống ~1.400 dòng (giảm ~65%), chia nhỏ file giúp IDE load nhanh, dễ bảo trì, tích hợp trực tiếp công cụ cập nhật tiến độ hàng ngày.

---

## 3. DANH SÁCH MÀN HÌNH & GIAO DIỆN (Screens & Views)

### 3.1. Banner Điều Hành KPI (Executive Header)
- **Vị trí:** Luôn ghim ở đầu trang.
- **Các chỉ số KPI:**
  1. **Quy mô TVT3:** Tổng 384 trạm • 15 Cụm • 6 Địa bàn.
  2. **Tiến độ Swap 4G:** 265 / 384 trạm (**69.0%** On-air) • Lắp đặt: 336 trạm (87.5%).
  3. **Tiến độ 5G On-air:** 119 / 151 trạm (**78.8%** On-air).
  4. **Cảnh báo Vướng:** 2 trạm cần đổi (`DNDQ15`, `DNDQ33`).

### 3.2. Tab 1: 15 Cụm Thi Công (Cluster Board - Mặc định)
- Trình bày dạng Grid Card cho 15 Cụm TVT3 chia làm 3 đợt:
  - **Đợt 1 (Pilot):** Cụm 09, 10, 16 (Hoàn thành cơ bản).
  - **Đợt 2 (Tháng 9):** Cụm 15, 17, 18, 19, 13, 14, 12, 20 (Đang cuốn chiếu).
  - **Đợt 3 (Tháng 10):** Cụm 21, 22, 23, 24 (Đang giao hàng & lắp đặt).
- Mỗi thẻ gồm: Tên Cụm, Địa bàn, Ngày Swap Plan, Progress Bar Swap 4G & On-air 5G.
- Nhấp vào Cụm -> Mở modal danh sách các trạm con trong cụm.

### 3.3. Tab 2: Chiến Dịch 5G TVT3 (5G Rollout)
- Bảng danh sách 151 trạm 5G của TVT3.
- Bóc tách cấu hình: 5G Đơn lớp (2600 MHz) vs 5G Hai lớp (2600 + 3800 MHz).
- Thanh tiến trình 6 bước: `Khảo sát` ➔ `TSSR` ➔ `Giao hàng` ➔ `Lắp đặt` ➔ `Tích hợp` ➔ `Phát sóng 5G`.
- **Hộp điều hành trạm vướng (Bottleneck Resolver):**
  - Thẻ cảnh báo trạm `DNDQ15` -> Đề xuất đổi qua `DNDQ17` hoặc `DNDQ19`.
  - Thẻ cảnh báo trạm `DNDQ33` -> Đề xuất đổi qua `DNDQ11` hoặc `DNDQ02`.

### 3.4. Tab 3: Tra Cứu Toàn Diện & Xuất Báo Cáo (Master Table & Export)
- Bảng dữ liệu 384 trạm TVT3.
- Ô tìm kiếm tức thì theo mã trạm mới / mã trạm cũ.
- Lọc theo Huyện, Lọc theo Trạng thái (Đã On-air / Chưa On-air / Đang lắp đặt).
- Nút bấm xuất file Excel chuẩn báo cáo TVT3.

### 3.5. Modal Cập Nhật Tiến Độ Bằng Excel (SranImportModal)
- **Vị trí nút kích hoạt:** Nút `[ 📥 Cập Nhật Tiến Độ (Excel) ]` màu xanh lam nổi bật trên Header.
- **Khu vực kéo thả file (Dropzone):**
  - Kéo thả hoặc chọn file Excel dạng `MBF Dong Nai_S1S4_Daily_Progress_ YYYYMMDD.xlsx`.
- **Cơ chế phân tích & xem trước (Preview Diff):**
  - Tự động nhận diện sheet `Master_Tracker` (dòng 2 là header, dữ liệu từ dòng 3).
  - Trích xuất: Tổng trạm trong file (1.127 trạm) • Số trạm thuộc 6 huyện TVT3 (384 trạm).
  - Phân tích trạng thái: Số trạm On-air mới, số trạm đã lắp đặt, số trạm đã giao hàng.
  - Cho phép người dùng chọn:
    1. *Cập nhật 384 trạm TVT3 (Khuyên dùng - Nhanh, ~2 giây)*
    2. *Cập nhật toàn bộ 1.127 trạm toàn tỉnh*
- **Cơ chế ghi Supabase:**
  - Chạy hàm `upsert` theo từng lô 100 trạm với `onConflict: 'site_id'`.
  - Cập nhật kèm `raw_data` chứa các trường cụm, thứ tự, đối tác thi công.
- **Phản hồi người dùng:** Thanh tiến trình cập nhật trực quan, sau khi xong tự động cập nhật ngay trên giao diện mà không cần reload trang.

---

## 4. CHECKLIST NGHIỆM THU (Acceptance Criteria)

### 4.1. Độ Chính Xác Của Dữ Liệu
- [ ] Dữ liệu hiển thị đúng 384 trạm của TVT3 (không có trạm Biên Hòa, Long Thành, Nhơn Trạch, Trảng Bom, Vĩnh Cửu).
- [ ] Số liệu 15 Cụm khớp chính xác 100% với file `MBF Dong Nai_S1S4_Daily_Progress_ 20260929.xlsx`.
- [ ] Tổng số trạm 5G hiển thị đúng 151 trạm, trong đó 119 trạm đã On-air.

### 4.2. Hiệu Năng & Trải Nghiệm Người Dùng
- [ ] Thời gian tải trang ban đầu dưới 1.2 giây.
- [ ] Tìm kiếm mã trạm lọc mượt mà, không bị giật lag giao diện.
- [ ] Hoạt động hoàn hảo trên điện thoại di động (Responsive, không bị tràn ngang).
- [ ] Nút xuất Excel tạo file tải về ngay lập tức với đầy đủ cột thông tin của TVT3.
