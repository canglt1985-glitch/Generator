# BỘ QUY TẮC KIỂM SOÁT & CHUẨN HÓA DỮ LIỆU VẬN HÀNH MÁY PHÁT ĐIỆN (MPD RULES)

Bộ quy tắc này áp dụng cho các module Đồng bộ SmartW, Import Excel, và Validator Dữ liệu Vận hành MPD trên hệ thống TVT3.

---

## 1. Quy tắc Chuẩn hóa Mã Cảnh báo SmartW (Alarm Unique Key & Timezone Rule)
* **Mục tiêu:** Triệt tiêu 100% bản ghi trùng lặp do lệch định dạng ngày và múi giờ.
* **Nội dung:**
  1. **Canonical Alarm ID:** Trước khi chèn bản ghi vào DB, mọi chuỗi ngày trong `smartw_alarm_id` phải được chuẩn hóa về định dạng duy nhất:
     ```
     <SITE_ID>__YYYYMMDD_HHMMSS
     ```
     *(Ví dụ: `DNIBLC08__20260818_075613` thay vì chứa chuỗi `Aug 18, 2026 7:56:13 AM` hoặc `18/08/2026 07:56:13`).*
  2. **Strict GMT+7 Binding:** Mọi thao tác parse chuỗi thời gian phải gắn cố định múi giờ Việt Nam (`Asia/Ho_Chi_Minh` / `UTC+7`). Không dùng múi giờ mặc định của máy chủ.

---

## 2. Quy tắc Tính Thời lượng Ca chạy & Chống Tính lặp 24h (24-Hour Roll-Over Rule)
* **Mục tiêu:** Tránh lỗi cộng dư 24 giờ khi ca chạy vươn qua mốc nửa đêm.
* **Nội dung:**
  1. **Công thức tính giờ chuẩn:**
     ```python
     if end_minutes >= start_minutes:
         hours = (end_minutes - start_minutes) / 60.0
     else:
         hours = (1440 - start_minutes + end_minutes) / 60.0  # Ca chạy qua đêm
     ```
  2. **Max Bound Constraint:** Thời lượng `thoi_gian_hoat_dong` không được vượt quá 24.0 giờ cho 1 lượt chạy đơn lẻ. Nếu > 24h phải kích hoạt cờ cảnh báo rà soát thủ công.

---

## 3. Quy tắc Chống Chồng chéo Khung giờ (Overlapping Time Window Rule)
* **Mục tiêu:** Ngăn chặn các ca chạy bị ghi nhận gối khung giờ tại cùng 1 trạm.
* **Nội dung:**
  1. Đối với cùng 1 `site_id` và cùng ngày, hai ca chạy $A$ và $B$ không được phép có khoảng thời gian gối lên nhau:
     $$\max(\text{Start}_A, \text{Start}_B) < \min(\text{End}_A, \text{End}_B)$$
  2. Nếu phát hiện gối khung giờ, hệ thống sẽ thực hiện hợp nhất ca chạy (Merge Interval) hoặc giữ lại bản ghi có thời lượng bao phủ chính xác nhất.

---

## 4. Quy tắc Ràng buộc Rán trùng Toán học (Mathematical Integrity Rule)
* **Mục tiêu:** Đảm bảo tính nhất quán tuyệt đối giữa Thời gian ➔ Nhiên liệu ➔ Chi phí.
* **Nội dung:**
  1. `nhien_lieu_tieu_hao = round(thoi_gian_hoat_dong * dinh_muc, 2)`
  2. `thanh_tien = round(nhien_lieu_tieu_hao * don_gia, 0)`
  3. Mọi thao tác UPDATE/INSERT chỉnh sửa `thoi_gian_hoat_dong` đều phải tự động tính toán lại đồng bộ cả 2 trường `nhien_lieu_tieu_hao` và `thanh_tien`.

---

## 5. Quy tắc Cảnh báo Tự động Định kỳ (Auto Audit & Alert Thresholds)
* **Mục tiêu:** Phát hiện sớm các trạm có dấu hiệu bất thường trước khi chốt quyết toán.
* **Nội dung:**
  * **Ngưỡng 1 (Chạy dài):** Cảnh báo nếu ca chạy đơn $\ge 8.0$ giờ.
  * **Ngưỡng 2 (Tổng ngày):** Cảnh báo nếu tổng giờ chạy/ngày của 1 trạm $\ge 12.0$ giờ.
  * **Ngưỡng 3 (Tần suất):** Cảnh báo nếu 1 trạm chạy $\ge 4$ lần/ngày.
