# 🚀 KẾ HOẠCH DỰ ÁN: VHKT ENTERPRISE (VEE)

**Ngày soạn:** 2026-04-20
**Tác giả:** Antigravity Brainstorm Partner

---

## 1. TẦM NHÌN (VISION)
Xây dựng một hệ thống Quản lý Vận hành Kỹ thuật (VHKT) chuẩn hóa, có khả năng tùy biến cao (Customizable) cho nhiều Tổ Viễn Thông khác nhau. Hệ thống sẽ là một "Digital Twin" chính xác của trạm BTS, từ cấp độ hạ tầng điện đến chi tiết từng lõi cáp quang.

## 2. QUY HOẠCH DỮ LIỆU (DATABASE STRATEGY)
*   **Master Site Registry:** Hợp nhất mọi ID trạm (Cũ/Mới) vào một bảng gốc duy nhất.
*   **Hierarchical Assets:** Quản lý theo mô hình cây:
    *   *Điện:* Tủ nguồn > Danh sách CB > Thiết bị tiêu thụ.
    *   *Quang:* Tuyến cáp > Ống lỏng > Core sợi quang (Trạng thái sử dụng).
*   **JSON Meta-data:** Sử dụng cột JSON để lưu các thông số kỹ thuật biến đổi của thiết bị (BTU, Ampe, Port status...) mà không làm phình Schema.

## 3. TÍCH HỢP HỆ THỐNG (INTEGRATION)
*   **SmartW-First:** Chuyển từ cơ chế cào dữ liệu (Scraper) sang dùng API/SSE của SmartW để lấy dữ liệu real-time chính xác.
*   **Plugin Architecture:** Tách biệt phần "Nhân" (Core logic) và phần "Vỏ" (Scraper, Telegram Bot, API vùng) để dễ dàng triển khai cho các đơn vị khác.

## 4. GIAO DIỆN & TRẢI NGHIỆM (UI/UX)
*   **Performance First:** Sử dụng Lazy loading (tải dữ liệu khi cần) cho các tab chi tiết (CB, Core quang).
*   **Contextual UI:** Hiển thị các thông tin liên quan cùng nhau thông qua Modal hoặc Offcanvas để người dùng không phải chuyển trang nhiều.

## 5. TRỢ LÝ AI (MCP TOOLING)
*   Triển khai MCP Server cung cấp các Tools:
    *   `get_site_info`: Tra cứu nhanh mọi thông số trạm.
    *   `check_fiber_core`: Báo cáo các core quang còn trống/bận.
    *   `get_power_map`: Xem sơ đồ điện và CB trạm.

---

## 📅 LỘ TRÌNH DỰ KIẾN (ROADMAP)
1.  **Giai đoạn 1:** Khởi tạo dự án mới chuẩn hóa (`/init`).
2.  **Giai đoạn 2:** Thiết kế chi tiết Schema Tuyến quang & CB Điện (`/plan`).
3.  **Giai đoạn 3:** Xây dựng Core Framework và Migration dữ liệu cũ.
4.  **Giai đoạn 4:** Triển khai MCP Assistant.

---
*Lưu ý: Tài liệu này được tạo ra sau buổi Brainstorm ngày 20/04/2026.*
