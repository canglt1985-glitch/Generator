# QUY TẮC NGHIỆP VỤ XỬ LÝ HỒ SƠ THANH TOÁN NHIÊN LIỆU MÁY PHÁT ĐIỆN (TVT3)

> **Mục tiêu:** Tự động hóa chuẩn hóa dữ liệu hồ sơ thanh toán nội bộ (TTNB), phân bổ hóa đơn cho trạm chạy máy (Waterfall), kiểm soát hạn mức thanh toán và quản lý minh bạch kho bảo lưu giá vốn.

---

## 1. Nguyên Tắc Sắp Xếp Dữ Liệu (Sorting Rules)
- **Bảng kê 02A TTNB:** Sắp xếp 2 cấp tuần tự:
  1. Cấp 1: `Ngày vận hành` (ASC - từ ngày 01 đến 30).
  2. Cấp 2: `ID Trạm` (ASC - từ A đến Z).
- **Bảng Map hóa đơn theo trạm (`Map_HD_Theo_Tram`):**
  - Sắp xếp trạm theo `ID Trạm` (A $\rightarrow$ Z).
  - Phân tách rõ ràng 2 phân đoạn: `I. Dầu DO` và `II. Xăng RON 95`.
- **Bảng kê hóa đơn (`HD`):**
  - Sắp xếp theo `Ngày lập HĐ` (ASC) $\rightarrow$ `Số hóa đơn` (ASC).

---

## 2. Nguyên Tắc Giảm Giá Vốn Khớp Bảng Kê (Cost Basis Truncation & Waterfall)
- **Khớp tuyệt đối 100%:** Số tiền gán từ hóa đơn (Cột D) **bắt buộc phải bằng đúng 100%** số tiền chạy máy theo bảng kê 02A (Cột B), không được lệch dù chỉ 1 đồng.
- **Giảm giá vốn ở hóa đơn cuối cùng:**
  - Hóa đơn cuối cùng của phân đoạn khi phân bổ cho trạm cuối cùng nếu có giá trị gốc lớn hơn nhu cầu còn lại: **Chỉ trích đúng số tiền cần thiết để vừa đủ 100% số tiền bảng kê**.
  - Phần giá trị còn lại của hóa đơn được coi là **"Giảm giá vốn đợt này / Bảo lưu kho chuyển kỳ sau"**.
- **Minh bạch thông tin tại Cột Ghi Chú:**
  - Tại bảng kê hóa đơn (`HD_DongNai_67Tram`, `HD_ToanCau`), bổ sung **Cột P (Ghi chú sử dụng / Bảo lưu giá vốn)**:
    * Các HĐ sử dụng 100%: Ghi `Sử dụng 100% giá vốn`.
    * Các HĐ trích 1 phần: Ghi rõ: `Trích sử dụng X đ để khớp 100% bảng kê 02A | Giảm giá vốn (bảo lưu kỳ sau): Y đ`.
  - Tại bảng Map: Ghi chú ở dòng trạm gán cuối cùng và dòng Ghi chú bảo lưu ở cuối mỗi phân đoạn.

---

## 3. Nguyên Tắc Kiểm Soát Hạn Mức Thanh Toán Tiền Mặt (< 5 Triệu / Ngày)
- **Đối với hồ sơ thanh toán tiền mặt (MobiFone Đồng Nai - 67 Trạm Đặc Thù):**
  - **Quy tắc trần ngày:** Tổng giá trị các hóa đơn sử dụng trong 01 ngày **bắt buộc $\le$ 5,000,000 đ** (tránh vướng mắc quy chế chi tiêu nội bộ/chuyển khoản).
  - **Xử lý khi thiếu hóa đơn rải rác dẫn đến dồn ngày cuối tháng:**
    * Nếu ngày cuối tháng (30/09) bị dồn hóa đơn vượt 5 triệu do thiếu hóa đơn: **Chọn cắt giảm 01 trường hợp (lượt) chạy máy tối thiểu** có chi phí $\ge$ mức thiếu hụt nhỏ nhất.
    * Ưu tiên chọn:
      1. Trạm có nhiều ca chạy máy trong tháng (để trạm vẫn còn ca khác thanh toán).
      2. Ca nối tiếp trong ngày (thuận tiện giải trình).
      3. Ca có số tiền sát nhất với mức thiếu hụt (giảm thiểu tối đa hao hụt quyền lợi).
- **Đối với hồ sơ thanh toán chuyển khoản (MobiFone Toàn Cầu):**
  - Cho phép hóa đơn đơn lẻ $> 5,000,000$ đ (như HĐ 8.98 tr) và tổng ngày $> 5$ triệu bình thường vì thanh toán qua ủy nhiệm chi ngân hàng.

---

## 4. Nguyên Tắc Quản Lý Kho Hóa Đơn Dư Thừa (`HD_Du_Thua_Khong_Su_Dung`)
- **Đối tượng đưa vào kho dư thừa:**
  1. Hóa đơn gối đầu tháng trước (ví dụ hóa đơn tháng 8).
  2. Hóa đơn các ngày không sử dụng hoặc dư thừa sau khi đã map đủ 100% số tiền trạm.
  3. Hóa đơn bị loại ra để khống chế trần 5 triệu/ngày.
- **Yêu cầu bảng tính:**
  - Lưu giữ đầy đủ 100% dữ liệu gốc: Mã số thuế, Mẫu số, Ký hiệu, Số HĐ, Tiền chưa thuế, VAT, Tổng thanh toán, Link tra cứu và Fkey tra cứu.
  - Phân loại rõ ràng lý do dư thừa / bảo lưu ở cột Ghi chú để theo dõi tồn kho lũy kế sang kỳ thanh toán sau.

---

## 5. Nguyên Tắc Phân Loại Hình Thức Thanh Toán (Tiền Mặt vs Chuyển Khoản Cây Xăng)
- **Mục đích:** Giúp nhân viên thanh toán và kế toán nhận biết tức thì các hóa đơn cần làm lệnh chuyển khoản cho cây xăng vs hóa đơn thanh toán tiền mặt.
- **Điều kiện cốt lõi (Single-Seller Rule):**
  * **Chỉ xét ngưỡng > 5,000,000 đ khi CÙNG 1 ĐƠN VỊ XUẤT (CÂY XĂNG / MST BÁN) VÀ 1 ĐƠN VỊ NHẬN TRONG CÙNG 1 NGÀY**.
  * Nếu trong cùng một ngày có 2 hay nhiều cây xăng khác nhau xuất hóa đơn, mà **từng cây xăng đều $\le$ 5 triệu đồng** (dù tổng cả ngày cộng dồn các cây xăng có $> 5$ triệu) thì **KHÔNG CẦN CHUYỂN KHOẢN** (vẫn thanh toán tiền mặt bình thường).
- **Quy tắc phân loại trên bảng kê hóa đơn (`HD`) - Cột P:**
  * **Hóa đơn thuộc (Ngày, Cây xăng) có tổng sử dụng $> 5,000,000$ đ:**
    * Nội dung ghi chú: `💳 CHUYỂN KHOẢN CÂY XĂNG (Ngày DD/MM cây xăng X đ > 5tr) — Sử dụng 100% giá vốn` (hoặc kèm chi tiết trích giảm giá vốn nếu là HĐ cuối).
    * Định dạng trực quan: Chữ đậm màu đỏ (`#C00000`), nền màu cam nhạt (`#FCE4D6`) nổi bật.
  * **Hóa đơn thuộc (Ngày, Cây xăng) có tổng sử dụng $\le 5,000,000$ đ:**
    * Nội dung ghi chú: `💵 Tiền mặt (Cây xăng <= 5tr/ngày) — Sử dụng 100% giá vốn thanh toán`.
    * Định dạng: Chữ nghiêng thông thường.
- **Đồng bộ trên bảng Map trạm (`Map_HD_Theo_Tram`) - Cột L:**
  * Ghi rõ `💳 HĐ > 5tr cùng cây xăng (Chuyển khoản cây xăng)` hoặc `💵 Gán 100% chi phí trạm (Tiền mặt)`.

