# 🖥️ Hướng dẫn cấu hình tự khởi động (Startup) trên Windows

Tài liệu này hướng dẫn cách thiết lập để backend daemon (`run_workers.py`) tự động khởi chạy cùng Windows mỗi khi máy chủ/máy tính khởi động lại.

---

## 📋 Yêu cầu chuẩn bị trên Windows
1. Đảm bảo đã cài đặt **Python 3.10+** và đã thêm vào biến môi trường (PATH).
2. Đã thiết lập virtual environment (`.venv`) và cài đặt đủ thư viện:
   ```cmd
   python -m venv .venv
   .venv\Scripts\pip install -r backend\requirements.txt
   ```
3. Đã cài đặt trình duyệt của Playwright trong môi trường Windows:
   ```cmd
   .venv\Scripts\playwright install
   ```

---

## 🚀 Cách 1: Sử dụng thư mục Startup (Đơn giản nhất)
*Phù hợp cho máy cá nhân hoặc máy chủ luôn tự động đăng nhập (Auto-login).*

1. Nhấn tổ hợp phím `Windows + R` để mở hộp thoại Run.
2. Gõ `shell:startup` và nhấn **Enter**. Thư mục **Startup** của người dùng sẽ hiện ra.
3. Kéo thả chuột phải vào file [run_workers.bat](file:///Users/cang_it/Antigravity/TVT3/run_workers.bat) ở thư mục dự án và chọn **Create shortcuts here** (Tạo lối tắt ở đây).
4. **Kết quả:** Mỗi khi Windows khởi động và người dùng đăng nhập vào màn hình desktop, file `.bat` sẽ tự động chạy và giữ cho daemon hoạt động.

---

## ⚙️ Cách 2: Sử dụng Task Scheduler (Khuyên dùng cho Server)
*Chạy ngay khi khởi động hệ thống, không cần người dùng đăng nhập vào màn hình.*

1. Mở menu Start, tìm và mở **Task Scheduler**.
2. Tại menu bên phải, chọn **Create Basic Task...** (Tạo tác vụ cơ bản).
3. Đặt tên tác vụ: `TVT3 Background Workers` và nhấn **Next**.
4. **Trigger (Trình kích hoạt):** Chọn **When the computer starts** (Khi máy tính khởi động) hoặc **At log on** (Khi đăng nhập) -> Nhấn **Next**.
5. **Action (Hành động):** Chọn **Start a program** (Khởi chạy chương trình) -> Nhấn **Next**.
6. **Start a Program:**
   * **Program/script:** Nhấn *Browse...* và chọn đường dẫn đến file `run_workers.bat` ở thư mục dự án.
   * **Start in (optional):** Điền đường dẫn thư mục dự án của bạn (Ví dụ: `C:\TVT3` hoặc `D:\Projects\TVT3`) để đảm bảo các file log và dữ liệu sinh ra đúng vị trí.
7. Nhấn **Next** -> Nhấn **Finish**.
8. **Cấu hình bổ sung (Quan trọng):**
   * Click đúp vào tác vụ vừa tạo trong danh sách để mở cửa sổ thuộc tính (Properties).
   * Tại tab **General**, chọn **Run whether user is logged on or not** (Chạy bất kể người dùng có đăng nhập hay không) để chạy ẩn hoàn toàn.
   * Tích chọn **Run with highest privileges** (Chạy với quyền cao nhất).

---

## 🛠️ Cách 3: Sử dụng NSSM (Đăng ký thành Windows Service - Chuyên nghiệp)
*Chạy ẩn hoàn toàn dưới nền dưới dạng Windows Service, tự động restart khi lỗi.*

1. Tải về công cụ **NSSM (Non-Sucking Service Manager)** từ trang chủ [nssm.cc](https://nssm.cc/).
2. Giải nén và mở Command Prompt (CMD) với quyền Admin tại thư mục nssm (Ví dụ bản `win64`).
3. Chạy lệnh cài đặt service:
   ```cmd
   nssm install TVT3Daemon
   ```
4. Cửa sổ giao diện NSSM hiện ra, cấu hình như sau:
   * **Path:** Chọn file python trong venv (Ví dụ: `C:\TVT3\.venv\Scripts\python.exe`).
   * **Startup directory:** Chọn thư mục dự án (Ví dụ: `C:\TVT3`).
   * **Arguments:** Điền: `backend\run_workers.py`
5. Nhấn **Install service**.
6. Để khởi chạy service, nhập lệnh:
   ```cmd
   nssm start TVT3Daemon
   ```
   Hoặc mở công cụ `Services.msc` của Windows, tìm service `TVT3Daemon` và chọn **Start** (thiết lập Startup type thành **Automatic**).
