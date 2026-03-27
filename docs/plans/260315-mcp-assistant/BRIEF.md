# 💡 BRIEF: VHKT Data Assistant (MCP)

**Ngày tạo:** 2026-03-15
**Brainstorm cùng:** User (VHKT Team)

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
Nhân viên kỹ thuật tại hiện trường hoặc quản lý cần tra cứu dữ liệu chéo phức tạp từ nhiều bảng (GeneralInfo, GeneratorLog, DataSiteAsset) nhưng không nhớ mã trạm hoặc không giỏi viết câu lệnh SQL. Lệnh `/tram ABC` hiện tại trên Telegram quá cứng nhắc.

## 2. GIẢI PHÁP ĐỀ XUẤT
Tích hợp một **AI Assistant** sử dụng giao thức **MCP (Model Context Protocol)** hoặc SQL Generator (NL2SQL).
- AI sẽ đọc cấu trúc Database.
- Chuyển câu hỏi tiếng Việt của User thành câu lệnh SQL `SELECT`.
- Trả về kết quả đã được format dễ hiểu.

## 3. ĐỐI TƯỢNG SỬ DỤNG
- **Primary:** Nhân viên vận hành kỹ thuật (tra cứu nhanh thông số thiết bị, lịch sử chạy máy qua Telegram).
- **Secondary:** Quản lý dự án (thống kê nhanh qua Web Dashboard).

## 4. TÍNH NĂNG

### 🚀 MVP (Bắt buộc có):
- [ ] Cung cấp Schema Context cho AI (Table definitions).
- [ ] Module SQL Generator (Sử dụng Gemini 1.5 Flash).
- [ ] Safety Guard: Chỉ cho phép lệnh `SELECT`.
- [ ] API Endpoint nhận câu hỏi và trả về dữ liệu JSON/Text.

### 🎁 Phase 2 (Làm sau):
- [ ] Tích hợp trực tiếp vào Telegram Bot hiện có.
- [ ] Chat UI trên Web Dashboard.
- [ ] Hỗ trợ các câu hỏi thống kê phức tạp (Biểu đồ).

## 5. ƯỚC TÍNH SƠ BỘ
- **Độ phức tạp:** Trung bình (cần cấu hình prompt tốt để tránh SQL injection và sai lệch dữ liệu).
- **Rủi ro:** AI có thể viết SQL sai nếu cấu trúc bảng quá phức tạp hoặc tên cột không rõ ràng.

## 6. BƯỚC TIẾP THEO
→ Chạy `/plan` để thiết kế chi tiết SQL Tooling và Prompting strategy.
