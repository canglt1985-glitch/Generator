# 💡 BRIEF: TVT3 V2 (Phiên bản nâng cấp toàn diện)

**Ngày tạo:** 2026-05-14
**Tổ chức:** Tổ Viễn Thông 3

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- Cơ sở dữ liệu và mã nguồn ở bản cũ có phần phân mảnh, rườm rà.
- Cần "đập đi xây lại" bằng công nghệ mới để ứng dụng chạy mượt mà, dễ bảo trì, dễ mở rộng sau này.

## 2. GIẢI PHÁP ĐỀ XUẤT (CHIẾN LƯỢC CHUYỂN ĐỔI)
- **Kiến trúc chuyển giao dần (Strangler Fig Pattern):** Đặt thư mục `tvt3_v2` ngay trong dự án cũ. Hệ thống cũ vẫn hoạt động, ta sẽ rà soát và chuyển giao dần từng module sang V2 (làm cuốn chiếu) để đảm bảo an toàn và không gián đoạn công việc.
- Xây dựng lại Frontend hoàn toàn mới bằng **React 19 + Vite + TailwindCSS 4**.
- Chuyển đổi (Migrate) và tinh gọn Database cũ sang cấu trúc mới trên **Supabase** (sử dụng JSONB để gom nhóm dữ liệu một cách thông minh).
- Đưa tất cả các nghiệp vụ của Tổ về chung một hệ thống duy nhất.

## 3. ĐỐI TƯỢNG SỬ DỤNG
- **Primary:** Toàn bộ anh em cán bộ, nhân viên trong **Tổ Viễn Thông 3**.

## 4. TÍNH NĂNG (MVP - Các chức năng cốt lõi)

### 📦 Hệ thống & Dữ liệu:
- [ ] Đồng bộ và làm sạch dữ liệu từ V1 sang V2 (đã có script `migrate_v1_to_v2.py`).
- [ ] Tối ưu hóa Database Schema (tinh gọn các cột).

### 📱 Tính năng nghiệp vụ cần giữ lại:
- [ ] **Daily Work:** Quản lý công việc hàng ngày của anh em trong tổ.
- [ ] **Lịch cúp điện:** Theo dõi thông tin và cảnh báo cúp điện.
- [ ] **Nhật ký chạy máy:** Theo dõi thời gian chạy máy phát điện tại trạm.
- [ ] **Quản lý chi phí:** Theo dõi vật tư, xăng dầu đổ máy và các chi phí vận hành khác.
- [ ] **Quản lý Hợp đồng nhà trạm** (Tính năng đang được tích hợp thêm).

## 5. ĐÁNH GIÁ SƠ BỘ
- **Độ phức tạp:** Trung bình (UI/UX sẽ tốn chút thời gian để code mới, nhưng luồng nghiệp vụ thì anh đã nắm quá rõ).
- **Rủi ro kỹ thuật cần lưu ý:** Cẩn thận trong quá trình chạy script đồng bộ dữ liệu để đảm bảo không bị thiếu sót hay sai lệch format data cũ.

## 6. BƯỚC TIẾP THEO
→ Chạy lệnh `/plan` để đi sâu vào thiết kế chi tiết (Database Schema mới, Flow các màn hình).
