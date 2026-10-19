# Hệ Thống Quản Lý Kho Ảnh Trạm TVT3: 2 Chiều, AI Đối Soát Serial & Quản Lý Tồn Tại Hiện Trường

- **Mã kế hoạch:** `261019-2118-telegram-photo-vault-and-web-gallery`
- **Trạng thái:** 📋 Sẵn sàng thực thi (Ready to Code)
- **Tác giả ý tưởng:** anh Cương (TVT3)

---

## 📌 1. Bối Cảnh & Đột Phá Kiến Trúc

### Vấn đề thực tế:
1. **Thất lạc ảnh & Hết hạn Zalo:** Hàng vạn bức ảnh khảo sát, lắp đặt, nghiệm thu, kiểm tra trạm... nằm rải rác trên hàng chục nhóm Zalo/Viber; sau 1–2 tháng Zalo xóa ảnh, tìm lại rất mất thời gian.
2. **Khảo sát toàn trạm (30–50 tấm):** Kỹ thuật viên không thể ngồi bấm chọn nhãn cho từng tấm ảnh.
3. **Quản lý "Tồn tại / Khiếm khuyết":** Rỉ sét, máy lạnh hỏng, ắc quy phồng, đứt dây tiếp địa... ghi biên bản giấy hoặc chat Zalo rồi trôi mất, không theo dõi được việc đã khắc phục chưa.
4. **Sai lệch & Thiếu số Serial thiết bị:** Database `datasites` có nhiều máy phát điện, bình ắc quy bị thiếu serial hoặc gõ nhầm số, chưa có cơ chế đối soát với thực tế.

### 4 Trụ Cột Đột Phá:
1. **Lưu trữ Vô hạn (0 đ):** Dùng Telegram Private Channel (`@tvt3_media_vault`) làm CDN lưu trữ vĩnh viễn, không lo đầy dung lượng, không bao giờ bị xóa.
2. **Mô hình Dữ liệu 2 Chiều + AI Tự Động:**
   * **Chiều 1 (Đợt việc / Sự kiện):** Kỹ thuật viên chỉ định nhanh bằng 1 chữ (vd: `DNTP31 khao sat`).
   * **Chiều 2 (Hạng mục thiết bị):** AI Vision tự động "nhìn ảnh và dán nhãn" ngầm (`cot_anten`, `mpd`, `nguon_accu`, `mat_bang`, `cong_to_dien`...).
3. **Theo dõi "Tồn tại trạm" kèm Ảnh Trước / Sau (Before - After):**
   * Đánh dấu lỗi hỏng 🔴 **Chưa xử lý** kèm ảnh chụp. Khi khắc phục xong chụp ảnh gửi lại ➡️ Đổi sang 🟢 **Đã khắc phục**, hiển thị 2 ảnh cạnh nhau làm chứng cứ nghiệm thu.
4. **AI OCR Đọc Tem Nhãn & Tự Động Chuẩn Hóa Serial:**
   * AI tự đọc số serial trên tem máy nổ, bình ắc quy, máy lạnh ➡️ Đối soát với hồ sơ tài sản trên `datasites`.
   * Tự điền nếu thiếu, hiện cảnh báo kèm nút 1-chạm sửa database nếu hồ sơ ghi sai!
5. **Kiến trúc Tách Rời (Không làm nặng/rối Datasite):**
   * Dữ liệu ảnh nằm ở bảng riêng `site_photos`.
   * Trong màn hình chi tiết trạm chỉ thêm 1 Tab riêng `[📸 Thư viện ảnh]` + Icon máy ảnh nhỏ 📷 cạnh số serial thiết bị trong tab Hạ tầng.

---

## 🗓️ Lộ Trình 5 Giai Đoạn Triển Khai (Phases)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  PHASE 01   │ ──► │  PHASE 02   │ ──► │  PHASE 03   │ ──► │  PHASE 04   │ ──► │  PHASE 05   │
│ DB Schema & │     │ Bot Thu Gom │     │ Web Gallery │     │ Tool Đồng Bộ│     │ Kiểm Thử &  │
│ Proxy Caching│     │ AI Vision   │     │ Tồn Tại +   │     │ Ảnh Cũ Zalo │     │ Cẩm Nang HD │
│             │     │ Serial OCR  │     │ Serial Audit│     │ + AI Batch  │     │ 1 Trang     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

| Phase | Tên Giai Đoạn | Nội Dung Trọng Tâm |
| :---: | :--- | :--- |
| **01** | **Database Schema & Image Proxy** | • Bảng `site_photos` (2 chiều + AI metadata + GPS) & `site_defects` (theo dõi tồn tại).<br>• Proxy serverless giấu kín Bot Token, Caching 1 năm trên trình duyệt. |
| **02** | **Bot Thu Gom, AI Vision & Serial OCR** | • Nhận chùm 20-40 ảnh, forward Vault Channel, tự map GPS trạm.<br>• Worker AI Vision gán nhãn Chiều 2 + đọc OCR serial máy nổ/ắc quy/công tơ.<br>• Xử lý cú pháp `ton_tai` và `da_khac_phuc`. |
| **03** | **Web TVT3 Gallery, Tồn Tại & Đối Soát Serial** | • Tab "📸 Thư viện ảnh" Timeline Album.<br>• Bảng theo dõi "Tồn tại trạm" so sánh ảnh Trước/Sau.<br>• Icon 📷 cạnh serial thiết bị ở tab Hạ tầng + Modal 1-chạm sửa serial sai. |
| **04** | **Tool Quét & Đồng Bộ Kho Ảnh Cũ** | • Script Python quét toàn bộ thư mục ảnh Zalo/máy tính có sẵn.<br>• Upload Telegram CDN, cho AI phân loại hàng loạt và chuẩn hóa số serial vào Supabase. |
| **05** | **Kiểm Thử E2E & Cẩm Nang Sử Dụng** | • Test toàn diện luồng: gửi ảnh -> AI dán nhãn & đọc serial -> hiển thị Web.<br>• Cẩm nang hướng dẫn bỏ túi 1 trang cho đội hiện trường và cán bộ quản lý. |

---

## 🔒 Nguyên Tắc Kỹ Thuật
1. **Zero-Friction Hiện Trường:** Kỹ thuật viên không cần chọn nhãn thủ công cho từng ảnh; chỉ cần gửi chùm ảnh kèm mã trạm hoặc vị trí.
2. **Không Đè Dữ Liệu Nguy Hiểm:** Việc sửa số serial trên `datasites` luôn có gợi ý xác nhận hoặc audit log, không tự động ghi đè mù quáng.
3. **Chi Phí 0 Đồng:** Telegram CDN không giới hạn dung lượng; Supabase lưu metadata text; AI Vision chạy linh hoạt (Gemini Flash giá rẻ hoặc model offline trên máy Mac).
