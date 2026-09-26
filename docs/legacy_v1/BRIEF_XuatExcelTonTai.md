# 💡 BRIEF: Xuất Excel Báo Cáo Tồn Tại

**Ngày tạo:** 19/05/2026

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- Hiện tại danh sách các sự cố/hư hỏng (Tồn tại) đang hiển thị trên web, nhưng người dùng (nhân viên/quản lý) cần một file cứng báo cáo để làm đề xuất sửa chữa, đệ trình lãnh đạo phê duyệt.
- Việc copy thủ công từ web ra file Excel rất mất thời gian.

## 2. GIẢI PHÁP ĐỀ XUẤT
- Thêm một nút **"Xuất Excel"** trực tiếp trên trang quản lý Tồn Tại.
- Tự động lấy danh sách các sự cố đang hiển thị để xuất thành file Excel chuẩn xác định vị trí chi tiết.

## 3. CẤU TRÚC FILE EXCEL ĐẦU RA
Dựa theo mẫu anh cung cấp, file Excel sẽ bao gồm các cột sau:
1. **STT**
2. **Tên trạm**
3. **Lat** (Vĩ độ - lấy từ thông tin Database của trạm)
4. **Long** (Kinh độ - lấy từ thông tin Database của trạm)
5. **Địa chỉ** (Lấy từ bảng thông tin trạm)
6. **Đánh giá tình trạng hư hỏng** (Chính là cột "Mô tả" trên web)

## 4. TÍNH NĂNG (MVP)
- [ ] Lấy dữ liệu Tồn tại (những mục đang hiển thị/chưa xử lý).
- [ ] Truy vấn chéo (JOIN) sang bảng thông tin Trạm để lấy được Lat, Long, Địa chỉ tương ứng với mã trạm.
- [ ] Ghi dữ liệu ra định dạng `.xlsx` (hoặc `.xls`).
- [ ] Thêm nút "Xuất Excel" trên giao diện (ví dụ cạnh ô tìm kiếm).
- [ ] API xử lý việc tạo và tải file cho trình duyệt.

## 5. ƯỚC TÍNH SƠ BỘ
- **Độ phức tạp:** Đơn giản.
- **Rủi ro/Lưu ý:** Một số mã trạm có thể chưa có sẵn thông tin Lat, Long, Địa chỉ trong DB. Sẽ cần xử lý gọn (để trống) để file không bị lỗi.

## 6. BƯỚC TIẾP THEO
→ Chuyển sang `/plan` để lên thiết kế kỹ thuật.
