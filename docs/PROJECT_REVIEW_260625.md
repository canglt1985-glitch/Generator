# 🏥 ĐÁNH GIÁ SỨC KHỎE CODE & KẾ HOẠCH NÂNG CẤP: TVT3 V2
*(Báo cáo lập ngày: 25/06/2026)*

Hệ thống đã hoàn tất di trú dữ liệu cấu hình từ V1 sang V2. Dưới đây là đánh giá chi tiết về hiện trạng mã nguồn và các bước nâng cấp tiếp theo để tối ưu hóa hiệu năng và chất lượng vận hành.

---

## 1. 🏥 Đánh giá sức khỏe dự án (Code Health Audit)

### 📊 Tổng quan kiểm tra
| Thành phần | Chỉ số kiểm tra | Kết quả | Đánh giá |
|:---|:---|:---|:---|
| **Backend (Python)** | Chạy thử nghiệm các module & Biên dịch | ✅ 100% Thành công | **Tốt**. Toàn bộ worker và script chạy thử đều không có lỗi cú pháp hoặc runtime. |
| **Frontend (React)** | Build bundle tĩnh cho production (`npm run build`) | ✅ 100% Thành công (958ms) | **Tốt**. Vite 8 và React 19 tối ưu tốt, tạo ra bundle tĩnh siêu nhanh. |
| **Frontend Linter** | Phân tích cảnh báo linter (`npm run lint`) | ❌ 128 lỗi, 5 cảnh báo | **Cần cải thiện**. Hầu hết là lỗi biến khai báo không sử dụng (`no-unused-vars`). |
| **Database (Supabase V2)** | Kết nối & RLS (Row-Level Security) | ✅ Hoạt động ổn định | **Tốt**. RLS trên bảng cấu hình chặn truy cập anonymous thành công; backend giao tiếp qua RPC bảo mật tốt. |

---

### ✅ Điểm tốt (Strengths)
1. **Kiến trúc phân rã (Decoupled Architecture)**: Frontend React (chạy trên Vercel) tách rời hoàn toàn với các Background Workers chạy bằng Python (chạy dưới Local daemon). Giao tiếp gián tiếp qua DB Supabase V2 rất mượt mà.
2. **Tự động hóa bóc tách hóa đơn**: Bộ parser PDF (`pypdf`) bóc tách hóa đơn MISA meInvoice hoạt động chính xác và tự động hóa lưu trữ không cần gửi tin nhắn rác lẻ lên Telegram.
3. **Cơ chế đồng bộ cấu hình thông minh**: Hàm `sync_configs` sử dụng RPC bảo mật của V2 giúp daemon đồng bộ tức thì các thay đổi từ giao diện Cài đặt (Settings UI) mà không sợ lộ key ra ngoài.

---

### ⚠️ Các vấn đề cần cải thiện (Technical Debt)
| Vấn đề | Mức độ ưu tiên | Chi tiết & Gợi ý xử lý |
|:---|:---|:---|
| **Lỗi Cascading Renders trong `Settings.jsx`** | 🔴 Cao | Gọi hàm cập nhật state (`fetchUsers`, `fetchConfig`) đồng bộ trực tiếp trong `useEffect` khi đổi tab. Cần sửa thành gọi phi đồng bộ hoặc tối ưu hóa dependency array để tránh render lặp. |
| **Nhiều biến và import không sử dụng** | 🟡 Trung bình | Các trang `Settings.jsx`, `VhktRan.jsx`, `Privacy.jsx` có nhiều thư viện và biến khai báo nhưng không dùng đến. Cần dọn dẹp để code gọn gàng, giảm kích thước bundle. |
| **Dung lượng file bundle JS lớn (> 1.5MB)** | 🟢 Thấp | File `index.js` sau khi build nặng 1.5MB. Cần áp dụng Dynamic Import (Lazy Loading) cho các Page của React Router để chia nhỏ chunk. |

---

## 2. 🚀 Kế hoạch nâng cấp tính năng (Future Roadmap)

### 2.1. Cải tiến ngắn hạn (1 - 2 tuần)
* **Dọn dẹp mã nguồn Frontend**: 
  * Fix triệt để 133 lỗi linting bằng cách xóa các import thừa (`MessageSquare`, `UserCheck`, `React` khi không cần, v.v.).
  * Tách biệt logic gọi API ra ngoài hook hoặc event handlers thay vì lạm dụng `useEffect` trong `Settings.jsx`.
* **Quản lý chạy ngầm ổn định**:
  * Tạo script quản lý daemon `run_workers.py` bằng `systemd` (Linux) hoặc `NSSM` (Windows Service) để đảm bảo tự khởi động lại khi server gặp sự cố.

### 2.2. Nâng cấp tính năng trung hạn (1 - 2 tháng)
* **Bóc tách đa nhà cung cấp (Multi-vendor PDF Invoice Parser)**:
  * Mở rộng hàm `parse_invoice_from_pdf` trong `invoice_worker.py` để hỗ trợ thêm các layout hóa đơn phổ biến khác như: VNPT, Viettel, EasyInvoice, BKAV... thông qua nhận diện chuỗi ký tự đặc trưng của nhà cung cấp.
* **Giao diện quản lý hóa đơn (Invoice Management Dashboard)**:
  * Xây dựng màn hình danh sách hóa đơn chi tiết trên React V2 cho phép lọc theo ngày, theo nhà cung cấp, duyệt hàng loạt (Bulk Approve) hoặc gắn thẻ (Tag) chi phí nhanh chóng.
* **Biểu đồ đối chiếu Xăng Dầu**:
  * Thêm biểu đồ cột so sánh trực quan giữa: **Lượng tiêu hao máy phát** vs **Lượng mua thực tế trên Ledger** vs **Tổng lượng xuất hóa đơn** theo từng tháng để phát hiện ngay chênh lệch (mất mát, thiếu hóa đơn).

---

## 3. ⚠️ Rủi ro khi nâng cấp
* **Lỗi RLS trên các bảng dữ liệu mới**: Khi tạo các bảng mới (như bảng lưu hóa đơn hay bảng log), cần kiểm tra kỹ chính sách RLS trên Supabase để đảm bảo user thông thường không ghi đè dữ liệu của admin.
* **Định dạng PDF thay đổi**: Các đơn vị xuất hóa đơn thỉnh thoảng sẽ đổi mẫu hiển thị PDF khiến regex bóc tách bị sai lệch. Cần có cơ chế cảnh báo (Alert) qua Telegram khi quét thất bại hoặc thiếu trường bắt buộc để admin kiểm tra thủ công.
