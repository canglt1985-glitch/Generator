# 📊 BÁO CÁO REVIEW TOÀN DIỆN MODULE SMARTW & PHƯƠNG ÁN SCALE CHO TỔ ĐÀ LẠT

> **Người thực hiện:** Antigravity Project Analyst  
> **Dự án gốc:** TVT3 (MobiFone Đồng Nai)  
> **Dự án mới:** SmartW Đà Lạt (Tổ Viễn thông Đà Lạt - MobiFone Lâm Đồng)  
> **Ngày lập:** 13/10/2026  

---

## 🎯 1. TỔNG QUAN TÍNH NĂNG SMARTW HIỆN TẠI (TVT3)

Module **SmartW** trong hệ thống TVT3 là một hệ thống tự động hóa vận hành toàn diện (Operations Automation System) được xây dựng trên nền tảng **Python + Playwright Headless + Asyncio Event Loop**, đảm nhiệm 5 nhóm nhiệm vụ trọng yếu:

```
                      ┌──────────────────────────────────────┐
                      │    SmartW Portal (mobifone.vn)       │
                      └──────────────────┬───────────────────┘
                                         │ Playwright SSO Auth
                                         ▼
                      ┌──────────────────────────────────────┐
                      │      SmartW Engine & Workers         │
                      │ (Alarms, MPĐ, PAKH, VHKT, Reports)   │
                      └───────┬──────────────┬───────────────┘
                              │              │
         ┌────────────────────┴───┐      ┌───┴────────────────────┐
         │ State Machine (FSM)    │      │ Cache & Resolvers      │
         │ • Debounce (Anti-spam) │      │ • Site Cell Counts     │
         │ • Active / Cleared     │      │ • Topology & Partners  │
         │ • Flapping (Chập chờn) │      │ • Candidate Sites      │
         └────────────┬───────────┘      └───┬────────────────────┘
                      │                      │
                      ▼                      ▼
         ┌────────────────────────────────────────────────────────┐
         │              Alerts & Notifications                    │
         │   • Telegram Bot Alerts      • Viber Group Reports     │
         │   • Định dạng chuẩn: {Site} [{Net}][{Sec}] ({x}/{y})   │
         │   • Nhận diện tuyến cáp CSG & đối tác (Viettel/Vina)   │
         └────────────────────────────────────────────────────────┘
```

### 1.1. Các tính năng cốt lõi đang vận hành:
1. **Giám sát & Báo động MLL thời gian thực (`smartw_worker.py --job alarm`):**
   - Tần suất quét: 1 - 2 phút/lần.
   - Bắt trọn 2 luồng: **MLL Trạm (DownSite = Y)** và **MLL Cell lẻ (DownSite = N)**.
   - Thăng hạng thông minh: Khi số cell rớt $x \ge y$ (tổng cell của trạm), tự động thăng hạng từ MLL Cell lẻ lên MLL Trạm.
   - Định dạng tin nhắn chuẩn nghiệp vụ: `• {Site_Old} [{Net}][{Sector}] ({x}/{y}) - {Time}` kèm tag `[3G4G]` cho trạm SRAN.
   - Nhận diện tuyến truyền dẫn: Hiển thị trực tiếp trạm CSG và đối tác cáp (Viettel, Vina, Mobi) bypass qua thẻ LSW, kèm bộ đếm số lần rớt trong ngày `(lần thứ X trong ngày)`.
2. **Bộ lọc chống nhiễu cảnh báo (Alarm FSM & Anti-Flapping):**
   - Loại bỏ triệt để hiện tượng tin nhắn "ping-pong" (vừa báo Active xong vài giây sau báo Cleared).
   - Bộ đếm chập chờn (Flapping): Gom các cảnh báo rớt/phục hồi liên tục trong ngày, cảnh báo mức độ bất thường mà không gây spam group chat.
3. **Giám sát Mất điện (MĐ) & Máy phát điện (MPĐ) (`--job mfd`):**
   - Cào tự động trạng thái mất điện lưới AC Fail và thời gian chạy máy phát điện.
   - Tự động đối soát và phát hiện bất thường lịch sử chạy máy.
4. **Giám sát & Cảnh báo Phản ánh khách hàng (`--job pakh` & `--job pakh_delta`):**
   - Quét phiếu PAKH mới phát sinh hoặc có cập nhật tiến độ xử lý.
   - Bắn tin nhắc nhở tức thời cho Quản lý trạm (QLT) phụ trách địa bàn.
5. **Kiểm tra 3 cấp nguyên nhân MLL (`--job mll_cause`):**
   - Quét các sự cố MLL đã kết thúc nhưng chưa cập nhật đủ 3 cấp nguyên nhân trên SmartW.
   - Gửi danh sách nhắc nhở về nhóm giám sát để đảm bảo KPI chất lượng mạng.
6. **Báo cáo định kỳ tự động (`--job report`, `--job mll_report`, `--job pakh_summary`):**
   - Tổng kết MLL, MPĐ, PAKH vào các khung giờ cố định (07h00, 11h30, 16h30).

---

## 🔍 2. ĐÁNH GIÁ SỨC KHỎE CODE HIỆN TẠI

| Tiêu chí | Đánh giá | Chi tiết |
|:---|:---:|:---|
| **Độ ổn định (Reliability)** | 🟢 **Xuất sắc** | Chạy bền bỉ với Watchdog `run_workers.py`, tự phục hồi khi mạng gián đoạn, có file lock chống chạy đè. |
| **Bảo mật (Security)** | 🟢 **Tốt** | Mật khẩu SmartW mã hóa Fernet đối xứng (`config.json`), Token bot Telegram/Viber cấu hình ẩn. |
| **Độ chính xác dữ liệu** | 🟢 **Cao** | Đã hoàn thiện bộ giải mã đa ứng viên (`_resolve_site_cell_count`), giải quyết triệt để tỷ lệ rớt `(x/y)`. |
| **Tính độc lập (Decoupling)** | 🟡 **Cần tách** | Một số thông số còn gán cứng trực tiếp trong code: Tên tỉnh (`Tỉnh Đồng Nai`), Tên tổ (`TVT Đồng Nai 3`), Tên nhóm (`PVT Đồng Nai`), Tên Trung tâm (`MobiFone Đồng Nai`). |

---

## 🚀 3. KẾ HOẠCH SCALE CHO TỔ ĐÀ LẠT (LÂM ĐỒNG)

Để chuyển giao và triển khai mượt mà cho **Tổ Viễn thông Đà Lạt**, hệ thống cần được **module hóa và cấu hình hóa 100% qua file `.env`**:

### 3.1. Các thông số cần điều chỉnh cho Đà Lạt:
```ini
# SmartW Region & Team Scope (Đà Lạt - Lâm Đồng)
SMARTW_PROVINCE="Tỉnh Lâm Đồng"
SMARTW_TRUNG_TAM="MobiFone Lâm Đồng"
SMARTW_GROUP="PVT Lâm Đồng"
SMARTW_TEAM="TVT Đà Lạt"          # Hoặc tên chính xác trên portal SmartW
SMARTW_REGION="MN"

# Kênh cảnh báo riêng của Tổ Đà Lạt
TELEGRAM_BOT_TOKEN="<token_bot_da_lat>"
TELEGRAM_CHAT_ID="<id_nhom_telegram_da_lat>"
VIBER_BOT_TOKEN="<token_viber_da_lat>"
VIBER_GROUP_ID="<id_nhom_viber_da_lat>"
```

### 3.2. Cấu trúc dữ liệu danh bạ trạm Đà Lạt:
- File `data/sites_dalat.json`: Danh mục trạm của Tổ Đà Lạt (mã trạm mới, mã cũ, tên trạm, quản lý trạm, loại trạm Macro/CRAN).
- File `data/site_cell_count.json`: Bảng tra cứu tổng số cell 2G/3G/4G/5G của từng trạm Đà Lạt để tính tỷ lệ `(x/y)`.

---

## 📁 4. CẤU TRÚC THƯ MỤC DỰ ÁN MỚI: `SmartW_DaLat`

Dự án mới được tạo độc lập tại `/Users/cang_it/Antigravity/SmartW_DaLat` với cấu trúc tinh gọn, dễ bàn giao:

```
SmartW_DaLat/
├── .env.example             # File mẫu cấu hình biến môi trường
├── README.md                # Tài liệu hướng dẫn cài đặt và vận hành từ A-Z
├── requirements.txt         # Thư viện Python cần thiết (playwright, httpx, cryptography...)
├── run_workers.py           # Daemon runner & Process Watchdog tự phục hồi
├── smartw_worker.py         # Entrypoint thực thi các tác vụ định kỳ
├── smartw/                  # Bộ lõi SmartW đã được tham số hóa 100%
│   ├── __init__.py
│   ├── config.py            # Quản lý mã hóa Fernet & load biến môi trường linh hoạt
│   ├── scraper.py           # Scraper Playwright động theo tham số cấu hình
│   ├── alarm_fsm.py         # Bộ máy trạng thái FSM (Debounce, Anti-Flapping)
│   ├── site_resolver.py     # Bộ phân giải mã trạm & topology trạm Đà Lạt
│   └── mfd_import.py        # Module xử lý dữ liệu máy phát điện
├── data/                    # Thư mục dữ liệu & cache nội bộ
│   ├── sites_dalat.json     # Danh bạ trạm Tổ Đà Lạt
│   ├── site_cell_count.json # Bảng số lượng cell phục vụ hiển thị (x/y)
│   └── smartw/              # Thư mục lưu snapshot cào từ SmartW
├── logs/                    # Thư mục lưu nhật ký vận hành có xoay vòng log
└── scripts/
    └── test_smartw_connection.py # Script kiểm thử đăng nhập và kiểm tra dữ liệu
```

---

## ⚠️ NEXT STEPS:
1. Hoàn tất tạo thư mục và copy source code đã chuẩn hóa vào `SmartW_DaLat/`.
2. Hướng dẫn anh em Tổ Đà Lạt điền thông tin tài khoản SmartW và Token nhóm chat.
3. Chạy thử nghiệm script kiểm tra kết nối để xác nhận tên Tổ chính xác trên hệ thống SmartW.
