# CẨM NANG HƯỚNG DẪN: KHO ẢNH TRẠM TELEGRAM VAULT & QUẢN LÝ TỒN TẠI HIỆN TRƯỜNG

Hệ thống quản lý ảnh trạm 2 chiều đột phá của TVT3 kết hợp:
* **Telegram Cloud CDN (0 VNĐ):** Lưu trữ vĩnh viễn không giới hạn dung lượng, không lo bị Zalo tự động xóa sau 30 ngày.
* **Mô hình Dữ liệu 2 Chiều:**
  * **Chiều 1 (Đợt công tác):** Theo dòng thời gian sự kiện (Khảo sát hiện trạng, Nghiệm thu móng, Bảo dưỡng MPĐ...).
  * **Chiều 2 (Hạng mục trạm):** AI Vision tự động nhận diện và dán nhãn (`cot_anten`, `mpd`, `nguon_accu`, `mat_bang`, `cong_to_dien`, `bien_ban`...).
* **Theo dõi Tồn tại Hiện trường (Punch List):** Ghép đôi ảnh **Lúc phát hiện lỗi (Before)** và **Ảnh sau khắc phục (After)** phục vụ nghiệm thu.
* **AI OCR Tem Nhãn & Đối Soát Serial:** Đọc số serial trên tem máy phát điện, bình ắc quy; phát hiện sai lệch và hỗ trợ 1-chạm cập nhật hồ sơ DataSite.

---

## 📱 1. Hướng Dẫn Kỹ Thuật Viên Hiện Trường (Trên Telegram Bot)

### A. Gửi Ảnh Khảo Sát / Nghiệm Thu Hàng Loạt
Kỹ thuật viên có thể chọn gửi cùng lúc **20–40 bức ảnh** (album) từ điện thoại vào Bot Telegram TVT3.

* **Cú pháp Caption:** `[MÃ_TRẠM] [TÊN_ĐỢT_VIỆC]`
* **Ví dụ thực tế:**
  ```text
  DNTP31 khao sat toan tram
  ```
  ```text
  DNI012 nghiem thu bao tri may no
  ```
* **Bot tự động:**
  1. Forward/Lưu ảnh vào Private Vault Channel.
  2. Bù đắp toạ độ GPS từ database trạm (khắc phục việc ảnh Zalo bị mất EXIF GPS).
  3. Dán nhãn Hạng mục và phân loại Album trên Web TVT3.

---

### B. Báo Tồn Tại / Khiếm Khuyết Trạm (Tạo Phiếu Lỗi 🔴)
Khi phát hiện hư hỏng (máy lạnh báo lỗi, rỉ sét móng cột, accu phù, đứt dây tiếp địa...):

* **Cú pháp Caption:** `[MÃ_TRẠM] ton_tai [Mô tả hư hỏng]`
* **Ví dụ:**
  ```text
  DNTP31 ton_tai May lanh 2 bao loi E4 khong lanh
  ```
  ```text
  DLK001 ton_tai Ri set bu long chan mong cot anten
  ```
* **Kết quả:**
  * Bot tự động ghi nhận phiếu lỗi trạng thái 🔴 **Chưa xử lý** vào hệ thống.
  * Bức ảnh vừa gửi được ghim làm **Ảnh Trước (Before Photo)**.

---

### C. Báo Đã Khắc Phục / Hoàn Thành Nghiệm Thu (Đổi sang 🟢)
Sau khi đội bảo dưỡng, ứng cứu đã sửa chữa hoặc thay thế vật tư xong:

* **Cú pháp Caption:** `[MÃ_TRẠM] da_khac_phuc [Ghi chú xử lý]`
* **Ví dụ:**
  ```text
  DNTP31 da_khac_phuc Da thay the loc may lanh chay on dinh
  ```
* **Kết quả:**
  * Hệ thống tự động ghép ảnh mới gửi làm **Ảnh Sau (After Photo)**.
  * Tồn tại chuyển sang trạng thái 🟢 **Đã khắc phục**, lưu đầy đủ hồ sơ Trước / Sau phục vụ phúc tra, kiểm toán.

---

### D. Lệnh Tra Cứu Nhanh Trên Bot
* `/anh [MÃ_TRẠM]`: Xem danh sách ảnh chụp mới nhất kèm phân loại hạng mục.
  * *Ví dụ:* `/anh DNTP31`
* `/tontai [MÃ_TRẠM]`: Xem danh sách các lỗi khiếm khuyết đang còn tồn đọng chưa xử lý của trạm.
  * *Ví dụ:* `/tontai DNTP31`

---

## 💻 2. Hướng Dẫn Cán Bộ Quản Lý (Trên Giao Diện Web TVT3)

### A. Truy Cập Tab "📸 Thư Viện Ảnh"
1. Mở danh sách trạm DataSite trên Web TVT3 (`tvt3.vercel.app` hoặc máy nội bộ).
2. Bấm vào chi tiết một trạm bất kỳ (ví dụ: `DNTP31`).
3. Chọn Tab **📸 Thư viện ảnh** trên thanh điều hướng bên trái.

### B. Các Tính Năng Trên Web:
* **Bộ Lọc 2 Chiều:**
  * *Lọc Chiều 1:* Chọn xem theo từng đợt (Khảo sát hiện trạng, Bảo trì đợt 1, Sửa chữa...).
  * *Lọc Chiều 2:* Bấm vào các chip hạng mục: **Máy phát điện & ATS**, **Nguồn & Ắc quy**, **Cột anten**, **Mặt bằng**...
* **Xem Phóng To (Lightbox):**
  * Nhấp vào ảnh để phóng to toàn màn hình.
  * Xem thông tin AI phân tích: Nhận định AI, Nhãn chi tiết, Ngày chụp, Người gửi, Tọa độ GPS.
  * Bấm **Tải ảnh gốc** để lưu về máy tính với độ phân giải cao nhất.
* **Punch List Tồn Tại Hiện Trường:**
  * Bấm nút chuyển chế độ **🚨 Tồn tại hiện trường**.
  * Xem trực quan bảng đối chiếu 2 cột: **Ảnh lúc hỏng (Before)** 🆚 **Ảnh sau sửa (After)**.
  * Bấm nút **Nghiệm thu khắc phục** để xác nhận hoàn tất trực tiếp từ web.
* **Đối Soát & Sửa Nhanh Số Serial Thiết Bị:**
  * Tại tab **Hạ tầng phụ trợ**, cạnh mỗi máy phát điện sẽ có nút **[📷 Xem tem]**.
  * Nếu AI phát hiện tem mác thực tế chụp khác với số serial trong hồ sơ (ví dụ: hồ sơ ghi `VK-201880` nhưng ảnh chụp tem là `VK-201889`), bấm nút sẽ mở cửa sổ đối chiếu.
  * Bấm **1-Chạm Cập Nhật Serial** ➔ Database DataSite sẽ tự động cập nhật ngay số serial chính xác!

---

## 🛠️ 3. Công Cụ Đồng Bộ Kho Ảnh Cũ Có Sẵn (Bulk Migration)

Nếu đơn vị đã có sẵn một thư mục ảnh khảo sát tải về từ Zalo hoặc máy tính:
```bash
# 1. Quét thử nghiệm (dry-run) xem nhận diện trạm và hạng mục:
./scripts/migrate_existing_photos.py /path/to/thu_muc_anh --dry-run

# 2. Đồng bộ thật lên Telegram Vault CDN và nạp vào database:
./scripts/migrate_existing_photos.py /path/to/thu_muc_anh --event "Khảo sát hiện trạng 2026"
```

---

*Hệ thống được phát triển bởi Antigravity AI Pair Programming cho TVT3 MobiFone Đồng Nai.*
