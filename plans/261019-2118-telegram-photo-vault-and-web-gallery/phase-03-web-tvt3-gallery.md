# Phase 03: Web TVT3 Gallery, Quản Lý Tồn Tại & Đối Soát Serial

Status: ⏳ Planned  
Target Files: 
- `tvt3_v2/src/components/datasites/SitePhotoGallery.jsx`
- `tvt3_v2/src/components/datasites/SiteDefectsManager.jsx`
- `tvt3_v2/src/components/datasites/DatasiteDetailFullscreen.jsx`
- `tvt3_v2/src/components/datasites/SerialMismatchModal.jsx`

---

## 🎯 Mục Tiêu
1. Xây dựng giao diện Thư viện ảnh theo **Dòng thời gian các Đợt khảo sát (Timeline Albums)**.
2. Tích hợp bảng theo dõi **Tồn Tại Hiện Trường (`SiteDefectsManager.jsx`)** hiển thị thẻ so sánh ảnh Trước / Sau (Before - After).
3. Thêm icon máy ảnh nhỏ 📷 cạnh số serial thiết bị trong tab Hạ tầng; click vào là mở ngay ảnh chụp tem máy nổ/bình ắc quy đó.
4. Xây dựng Modal 1-chạm sửa số serial trong database khi AI phát hiện ảnh thực tế lệch so với hồ sơ.

---

## 📋 Chi Tiết Giao Diện & Tương Tác (UI/UX)

### 1. Bảng Theo Dõi "Tồn Tại Hiện Trường" (Punch List)
* Thẻ tồn tại trực quan:
  ```
  ┌───────────────────────────────────────────────────────────────┐
  │ 🔴 MÁY LẠNH 2 BÁO LỖI E4                       [Đang xử lý]  │
  │ Phát hiện: 19/10/2026 bởi Lê Trần Vĩnh                        │
  │ ┌───────────────────────────┐ ┌───────────────────────────┐   │
  │ │ [Ảnh lúc hỏng - Before]   │ │ [Ảnh sau khi sửa - After] │   │
  │ │ Đèn đỏ nhấp nháy E4       │ │ Đã thay lốc, chạy mát     │   │
  │ └───────────────────────────┘ └───────────────────────────┘   │
  │ [Nút: Đánh dấu Đã Khắc Phục (Tải ảnh nghiệm thu)]            │
  └───────────────────────────────────────────────────────────────┘
  ```

### 2. Icon 📷 Cạnh Số Serial ở Tab Hạ Tầng & Modal Cập Nhật
* Tại tab Hạ tầng trạm `DNTP31`:
  * `Máy phát điện: Vikyno 10kVA - Serial: VK-201880 [📷 Xem tem]`
  * Nếu AI phát hiện serial thực tế là `VK-201889`:
    * Hiển thị biểu tượng cảnh báo vàng ⚠️: *"Ảnh thực tế: VK-201889"*.
    * Bấm vào mở `SerialMismatchModal.jsx`: So sánh ảnh chụp tem nhãn phóng to và giá trị cũ.
    * Bấm nút **[Cập nhật số Serial mới]** ➡️ Database `datasites` tự động cập nhật ngay lập tức!

---

## ✅ Tiêu Chí Hoàn Thành (DoD)
- [ ] Giao diện Timeline Album cuộn mượt mà.
- [ ] Danh sách tồn tại hiển thị rõ ràng ảnh Trước/Sau.
- [ ] Click icon 📷 cạnh serial máy nổ mở đúng ảnh tem nhãn.
- [ ] Bấm xác nhận sửa serial cập nhật thành công vào Supabase `datasites`.
- [ ] Lint 0 lỗi, build Vite pass.
