# Phase 04: Bulk Migration & Import Script for Existing Photos

Status: ⏳ Planned  
Target File: `scripts/migrate_existing_photos.py`

---

## 🎯 Mục Tiêu
1. Xây dựng công cụ Python quét hàng ngàn ảnh cũ từ các thư mục khảo sát, audit, Zalo lưu trữ sẵn có trên máy tính của anh.
2. Tự động nhận diện Mã trạm từ tên thư mục (ví dụ: `~/Desktop/KhaoSat/DNTP31/...`).
3. Đọc ngày chụp từ EXIF metadata của ảnh (nếu có); nếu mất ngày thì dùng ngày chỉnh sửa file hoặc ngày đợt khảo sát.
4. Tự động gán toạ độ của trạm từ database `datasites` nếu ảnh không còn GPS.
5. Upload tuần tự lên Telegram Vault Channel, gọi module AI Vision gán nhãn hàng loạt và lưu chỉ mục Supabase.

---

## 📋 Chi Tiết Triển Khai
* **Khả năng Resume (Chạy tiếp khi gián đoạn):**
  * Lưu trạng thái vào file `migration_progress.json`.
  * Nếu mất điện hoặc ngắt script, khi chạy lại script tự bỏ qua các ảnh đã upload, không bao giờ upload trùng.
* **Tối ưu Băng thông & Tốc độ:**
  * Tự động resize ảnh về chuẩn Full HD (max 1920px) và nén WebP trước khi gửi (giảm 80% thời gian tải lên).
  * Giữ nhịp độ gọi API Telegram 0.5s/ảnh để không bị khóa Rate Limit.
* **Xử lý theo đợt (Batch AI Tagging):**
  * Gom theo từng trạm (ví dụ: gom 30 ảnh của `DNTP31` gửi vào 1 lượt phân tích của AI Vision) để tối ưu thời gian và chi phí.

---

## ✅ Tiêu Chí Hoàn Thành (DoD)
- [ ] Chạy thử nghiệm thành công trên 1 thư mục trạm thực tế (khoảng 20–30 ảnh).
- [ ] Ảnh cũ xuất hiện đầy đủ trong Album đợt khảo sát trên Web `tvt3.vercel.app`.
