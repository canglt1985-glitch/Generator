# 💡 BRIEF: Tích hợp Hợp Đồng Nhà Trạm vào TVT3_V2

**Ngày tạo:** 14/05/2026
**Dự án:** TVT3_V2 (React + Vite + Supabase)

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- Dự án "Hợp đồng nhà trạm" hiện tại (dùng Python + Streamlit/React riêng lẻ) chạy độc lập, dữ liệu quản lý qua file Excel cục bộ, khó đồng bộ và rủi ro mất dữ liệu.
- Cần đưa toàn bộ tính năng này vào hệ sinh thái chung **TVT3_V2** (đã có sẵn React + Supabase) để quản lý tập trung trên một giao diện (1 Table).

## 2. GIẢI PHÁP ĐỀ XUẤT
Tạo một module (Page + Data Table) "Hợp đồng nhà trạm" ngay bên trong app `TVT3_V2`.
- **Database:** Chuyển đổi dữ liệu từ file Excel (datahopdong.xlsx) lên 1 table trên **Supabase** (ví dụ: `bts_contracts`).
- **Frontend:** Code 1 trang quản lý trên `TVT3_V2` dùng React & Tailwind, cho phép hiển thị danh sách, tìm kiếm, và nút "Sinh Hợp Đồng".
- **Backend (Word Generation):** Đây là phần quan trọng nhất, có 2 phương án:
  - *Option A (Khuyên dùng cho V2):* Dùng thư viện `docxtemplater` của JavaScript để **trộn file Word ngay trên trình duyệt (Frontend)**. Như vậy app hoàn toàn Serverless, không cần thuê server chạy Python.
  - *Option B:* Chạy ngầm 1 API Python (như hiện tại) trên 1 server nhỏ (Render/VPS), React gọi API này để lấy file.

## 3. TÍNH NĂNG CHÍNH (MVP)

### 🚀 Giai đoạn 1 (Core):
- [ ] Import dữ liệu file Excel mới nhất vào Supabase.
- [ ] Màn hình Quản lý: Hiển thị table danh sách trạm (Lấy từ Supabase).
- [ ] Chức năng Sinh file Word: Bấm nút trên web -> tự động thay tag (bao gồm cả các loại Thanh lý, Ký mới) -> Tải `.docx` về máy.

### 🎁 Giai đoạn 2 (Tính năng mở rộng):
- [ ] Form thêm/sửa/xóa thông tin hợp đồng ngay trên Web (không cần mở Excel).
- [ ] Cảnh báo hợp đồng sắp hết hạn.

## 4. ƯỚC TÍNH SƠ BỘ & RỦI RO
- **Độ phức tạp:** Khá. Cần thiết kế lại database schema trên Supabase sao cho tối ưu và thử nghiệm thư viện trộn file Word bằng JavaScript (`docxtemplater`) để đảm bảo chất lượng file giống hệt Python `python-docx`.
- **Rủi ro:** Một số logic tính toán giá trị làm tròn (50k) phức tạp có thể cần code lại cẩn thận trên JS.

## 5. BƯỚC TIẾP THEO
→ Chạy `/plan` để lên thiết kế chi tiết.
