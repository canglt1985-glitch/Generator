# 💡 BRIEF: Module Hợp Đồng Nhà Trạm (Station Contracts) & Firebase Migration

**Ngày tạo:** 07/05/2026
**Dự án:** TVT3 (Module Mới)

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- Hiện tại có quá nhiều tool/module chạy dồn trên 1 máy local (Flask monolith), dẫn đến quá tải và rủi ro nếu máy trục trặc (cúp điện, mất mạng).
- Cần một công cụ để quản lý danh sách hợp đồng thuê trạm, theo dõi ngày hết hạn, kỳ thanh toán.
- Cần tự động hóa việc tạo file Word hợp đồng từ các template có sẵn để tiết kiệm thời gian.

## 2. GIẢI PHÁP ĐỀ XUẤT
Phát triển **Module Hợp đồng nhà trạm** dưới dạng một Microservice độc lập và **đẩy lên Firebase**. Đây sẽ là bước đi tiên phong để tiến tới chuyển dịch dần các tính năng khác của hệ thống local lên mây.

## 3. ĐỐI TƯỢNG SỬ DỤNG
- **Primary:** Nhân viên vận hành (tra cứu hợp đồng, xuất file Word).
- **Secondary:** Admin/Tổ trưởng (quản lý ngày hết hạn, thanh toán, cấu hình template).

## 4. KIẾN TRÚC KỸ THUẬT (FIREBASE)
- **Frontend:** Firebase Hosting (Web App tốc độ cao, truy cập từ mọi nơi).
- **Backend (Python):** Firebase Cloud Functions thế hệ 2 (Xử lý trộn file Word, xuất báo cáo).
- **Database:** Firebase Firestore (lưu thông tin hợp đồng) hoặc kết nối về Supabase.
- **Storage:** Firebase Storage (lưu trữ file template `.docx` và file hợp đồng đã xuất).

## 5. TÍNH NĂNG CHÍNH

### 🚀 MVP (Bắt buộc phải có để chạy ngay):
- [ ] Màn hình danh sách Trạm và thông tin Hợp đồng (giá thuê, chu kỳ, chủ nhà, ngày bắt đầu/kết thúc).
- [ ] Quản lý Template Hợp đồng (Upload/Cập nhật file Word mẫu).
- [ ] **Core:** Nút bấm tự động sinh file Word hợp đồng (trộn data) và tải về.

### 🎁 Phase 2 (Làm sau khi MVP đã chạy tốt):
- [ ] Dashboard hiển thị các hợp đồng sắp hết hạn trong 30/60 ngày tới.
- [ ] Nhắc nhở tự động qua Telegram cho Admin.
- [ ] Quản lý lịch sử thanh toán tiền thuê.

### 🔄 Migration Backlog (Các module khác cân nhắc đưa lên Firebase):
- [ ] Đưa chức năng "Nhật ký công việc" (Daily Work) lên Firebase (vì ít phụ thuộc vào tool cào dữ liệu local).

## 6. ƯỚC TÍNH SƠ BỘ
- **Độ phức tạp:** Trung bình. (Khó nhất là khâu thiết lập Firebase Cloud Functions chạy thư viện Python xử lý Word).
- **Rủi ro:** Cần đảm bảo việc thiết lập Firebase đúng chuẩn để không phát sinh chi phí.

## 7. BƯỚC TIẾP THEO
→ Chạy `/plan` để lên thiết kế chi tiết (Database schema, chia việc, setup Firebase).
