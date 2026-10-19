# BRIEF: HỒ SƠ ĐỜI TRẠM 360° & DÒNG THỜI GIAN VẬN HÀNH (SITE LIFETIME TIMELINE)

- **Ngày ghi nhận:** 19/10/2026
- **Tác giả ý tưởng:** anh Cảng (Tổ Kỹ thuật TVT3 - MobiFone Đồng Nai)
- **Mục tiêu:** Xây dựng một trục dòng thời gian hợp nhất (360° Site Timeline) cho từng trạm phát sóng, giúp kỹ thuật viên và lãnh đạo mở trạm ra là thấy trọn vẹn toàn bộ lịch sử từ ngày phát sóng đến nay.

---

## 🎯 1. NỖI ĐAU THỰC TẾ TRONG QUẢN LÝ TRẠM
1. **Dữ liệu nằm phân mảnh nhiều nơi:**
   - Hợp đồng & phụ lục giảm giá nằm ở file Excel hoặc tab Hợp đồng.
   - Các ca chạy máy phát điện nằm ở bảng nhật ký nạp dầu `generator_logs`.
   - Lịch sử thay thế máy lạnh, nâng cấp ắc quy, sửa chữa B4 nằm ở tab Hạ tầng.
   - Ảnh hiện trường và sự cố Before/After nằm ở Thư viện ảnh.
2. **Khó bàn giao & tra cứu khi có sự cố:**
   - Kỹ thuật viên mới tiếp quản trạm không biết trạm này từng bị những lỗi gì, máy móc sửa lần cuối khi nào, chủ nhà có hay gây khó dễ không.
   - Khi kiểm toán hoặc lãnh đạo hỏi: *"Máy lạnh này lắp từ bao giờ?", "Năm nay trạm mất điện bao nhiêu lần?"* ➔ Phải mất nhiều giờ lục tìm đối chiếu.

---

## 💡 2. KIẾN TRÚC "DÒNG THỜI GIAN 360°" (TIMELINE)
Khi mở chi tiết trạm, bổ sung tab **`📜 Lịch Sử Đời Trạm (Timeline)`**.
Dữ liệu được tự động kéo từ các bảng Supabase (`datasites`, `generator_logs`, `site_photos`, `site_defects`) và sắp xếp theo trục thời gian giảm dần (mới nhất lên đầu):

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      DÒNG THỜI GIAN ĐỜI TRẠM                           │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
  [19/10/2026] ❄️ BỔ SUNG MÁY LẠNH 3
  ├── Người thực hiện: Anh Cảng (Kỹ thuật TVT3)
  ├── Mã CCDC: 00020527111003 | Nhãn hiệu: Daikin 12.000 BTU
  └── 📸 Đính kèm ảnh tem tài sản mới chụp (150KB WebP)
                                   │
  [10/10/2026] ⚡ CHẠY MÁY PHÁT ĐIỆN DO MẤT ĐIỆN LƯỚI
  ├── Thời gian chạy: 08:30 - 12:45 (4.25 giờ) | Tiêu thụ: 13.8 Lít dầu DO
  └── Người vận hành: KTV TVT3 (Lưu lượng log SmartW mfd_import)
                                   │
  [25/09/2026] 🚨 XỬ LÝ SỰ CỐ / TỒN TẠI MÁY LẠNH 2
  ├── Hiện trạng lỗi: Báo lỗi E4, hết ga
  ├── Khắc phục: Nạp ga R410A, vệ sinh dàn nóng
  └── 📸 Minh chứng: Ảnh Trước (Before) ➔ Ảnh Sau (After)
                                   │
  [15/06/2025] 📝 KÝ PHỤ LỤC GIẢM GIÁ THEO VB1245
  ├── Số phụ lục: PL02-26DNa... | Giảm giá từ: 7.5 tr ➔ 6.2 tr/tháng
  └── Tiết kiệm cho MobiFone: 15.6 triệu/năm
                                   │
  [20/03/2023] 🔋 NÂNG CẤP TỔ ẮC QUY DC
  └── Thay thế tổ ắc quy cũ bằng Tổ Vision 150Ah (Mã TS: AQ-2023-019)
                                   │
  [12/08/2018] 🚀 PHÁT SÓNG TRẠM & KÝ HỢP ĐỒNG GỐC
  └── Mã trạm: DNIBLC00 (Mã cũ: DNI012) | Loại trạm: 3G/4G
```

---

## 📊 3. BIỂU ĐỒ & BÁO CÁO TỰ ĐỘNG KÈM THEO
1. **Biểu đồ biến động chi phí thuê trạm:**
   - Trực quan hóa đường xu hướng giá thuê giảm dần sau các đợt đàm phán VB1245.
2. **Biểu đồ tần suất mất điện & tiêu thụ nhiên liệu:**
   - Thống kê tháng nào trạm chạy máy phát nhiều nhất, cảnh báo trạm có chất lượng điện lưới kém để ưu tiên nâng cấp tổ ắc quy lưu điện lâu hơn.
3. **Biểu đồ vòng đời thiết bị (Device Health Radar):**
   - Đếm số năm sử dụng của Máy phát điện, Máy lạnh 1, Máy lạnh 2, Tủ nguồn để chủ động đề xuất duyệt danh mục sửa chữa B4 trước mùa nắng nóng.

---

## 🚀 4. KẾ HOẠCH TRIỂN KHAI (ROADMAP)
- [ ] **Giai đoạn 1:** Viết hàm gom dữ liệu (Aggregator Function) truy vấn đồng thời `datasites`, `generator_logs`, `site_photos`, `site_defects` theo `site_id`.
- [ ] **Giai đoạn 2:** Dựng component giao diện `SiteTimelineView.jsx` với thiết kế dạng dòng kẻ Timeline hiện đại, icon phân loại màu sắc rõ ràng.
- [ ] **Giai đoạn 3:** Thêm nút xuất báo cáo tổng quan lịch sử trạm ra file PDF/Word phục vụ bàn giao hoặc thanh tra tài sản.
