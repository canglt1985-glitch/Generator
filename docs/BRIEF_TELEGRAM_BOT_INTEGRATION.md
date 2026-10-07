# 💡 BRIEF: Tối Ưu Hóa Bot Telegram TVT3 - Chuyên Biệt DataSite & Hợp Đồng

**Ngày cập nhật:** 07/10/2026  
**Chủ đề:** Tích hợp Bot Telegram tra cứu Database DataSite & Hợp đồng (DataSite & Contract Bot)  
**Tác giả:** Antigravity Team & Cang_IT  
**Trạng thái:** Brainstorm & Scope Refinement (Hoàn thiện theo chỉ đạo thực tế)  

---

## 1. NGUYÊN TẮC THIẾT KẾ: PHÂN ĐỊNH RÕ RÀNG GIỮA WEB VÀ BOT

> **"Những gì đã hiển thị tốt trên Web như Lịch cúp điện EVN, VHKT RAN thì KHÔNG CẦN BOT. Bot Telegram chỉ tập trung 100% vào tra cứu Database thông tin DataSite và Hợp đồng cho KTV tác nghiệp tại hiện trường."**

### 1.1. Phân định nhiệm vụ Web vs Bot

| Hạng mục | Web Dashboard (`tvt3_v2`) | Telegram Bot TVT3 (`@TVT3_Site_Bot`) |
|---|---|---|
| **Môi trường sử dụng** | Laptop / PC / Màn hình lớn tại văn phòng | Điện thoại di động (Smartphone) ngoài hiện trường |
| **Lịch cúp điện EVN** | ✅ Bảng biểu đầy đủ, lọc huyện/xã, lịch tuần/tháng | ❌ **KHÔNG LÀM** (Đã có Web trực quan) |
| **VHKT RAN & Đồ họa** | ✅ Biểu đồ lưu lượng, cảnh báo MLL đồ họa | ❌ **KHÔNG LÀM** (Đã có Bot ERA & Web) |
| **Báo cáo & Quyết toán** | ✅ Xuất Excel B4, 02A TTNB, hồ sơ tiền mặt 5tr | ❌ **KHÔNG LÀM** (Cần file phức tạp, thao tác trên PC) |
| **Tra cứu DataSite trạm** | ✅ Xem hồ sơ đầy đủ | ⚡ **TỐI ƯU SIÊU TỐC:** Gõ mã trạm ra thông số tức thì |
| **Tra cứu Hợp đồng thuê** | ✅ Quản lý danh sách HĐ, duyệt giá | ⚡ **TỐI ƯU HIỆN TRƯỜNG:** Số ĐT chủ nhà bấm gọi ngay, ngày hết hạn, tiền thuê, chìa khóa |

---

## 2. KIẾN TRÚC DỮ LIỆU: BẢNG `datasites` LÀ SINGLE SOURCE OF TRUTH

Trong hệ thống TVT3, toàn bộ dữ liệu Hợp đồng đã được gộp trực tiếp vào bảng **`datasites`** (cột `contract_number` và cột JSONB `contract_info`).
- **Ưu điểm vượt trội:** Bot chỉ cần query **duy nhất 1 bảng `datasites`** trên Supabase.
- **Tốc độ:** Cache toàn bộ 412 trạm vào bộ nhớ RAM cục bộ (In-Memory Snapshot ~3MB). Tốc độ phản hồi lệnh Telegram đạt **< 0.1 giây**, kể cả khi mạng 4G chập chờn.

---

## 3. CƠ CHẾ PHÂN CHIA TRƯỜNG (FIELD-SPECIFIC QUERY SYSTEM)

Để màn hình điện thoại KTV không bị ngợp chữ, hệ thống chia dữ liệu trạm thành **4 Trường Dữ Liệu Chuyên Biệt**:

```
                              ┌────────────────────────────────┐
                              │ KTV gõ: DNLK00 / Long Khanh /  │
                              │ Tên chủ đất / Gửi vị trí GPS   │
                              └───────────────┬────────────────┘
                                              │
                                              ▼
                             ┌─────────────────────────────────┐
                             │    1. THẺ NHẬN DIỆN & TÓM TẮT   │
                             │ Mã trạm | Địa chỉ | QLT phụ trách│
                             └────────────────┬────────────────┘
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
       ┌────────────────────────┐                          ┌────────────────────────┐
       │ 2. HẠ TẦNG & NGUỒN     │                          │ 3. HỢP ĐỒNG & CHỦ ĐẤT  │
       │    (`/csht` / `/tb`)   │                          │    (`/hd` / `/chu`)    │
       ├────────────────────────┤                          ├────────────────────────┤
       │• Mã PE điện lực EVN    │                          │• Chủ nhà & SĐT gọi ngay│
       │• MPD (kW, lít/h, tồn)  │                          │• Số HĐ & Ngày hết hạn  │
       │• Ắc quy (Ah, Lithium)  │                          │• Đã trả tiền đến ngày..│
       │• Cột (chiều cao, loại) │                          │• Tiền thuê, điện khoán │
       │• Hướng kết nối chính/phụ│                         │• Khóa số, chìa, STK NH │
       └────────────────────────┘                          └────────────────────────┘
```

### 3.1. Chi tiết 4 Trường tra cứu:

#### 🔹 Trường 1: Thẻ Nhận Diện Trạm (`FIELD_SITE_ID`)
- **Lệnh tắt:** `/tram [mã]` hoặc chỉ gõ tên trạm: `DNLK00`, `26DNa_LK00`, `LK00`
- **Nội dung:**
  - Mã mới & Mã cũ
  - Tên trạm, Loại trạm (Cột tự đứng / Dây bao / Ngụy trang, Chiều cao cột, Loại nhà trạm)
  - Địa chỉ hành chính (Xã/phường mới, Huyện, Tỉnh)
  - Tổ quản lý & Người QLT phụ trách (Kèm SĐT liên hệ)
  - Tọa độ GPS & Link Google Maps mở ứng dụng chỉ đường

#### 🔹 Trường 2: Hạ Tầng Kỹ Thuật & Nguồn Điện (`FIELD_INFRA`)
- **Lệnh tắt:** `/csht [mã]` hoặc `/tb [mã]` hoặc bấm nút `[⚡ Hạ tầng & Nguồn]`
- **Nội dung:**
  - **Mã khách hàng PE điện lực EVN** (để tra cứu thanh toán tiền điện)
  - **Máy phát điện:** Loại MPD (Cố định hay Lưu động), Công suất kVA, Định mức tiêu hao dầu (L/h), Nhãn hiệu, Mã TSCD
  - **Ắc quy:** Chủng loại (Lithium hay Axit chì), Số tổ bình, Dung lượng tổng (Ah), Thời gian xả ước tính
  - **Tủ nguồn DC & Máy lạnh phòng máy**
  - **Truyền dẫn:** Hướng kết nối trạm nguồn chính (`last_mile_primary`), hướng kết nối dự phòng (`last_mile_backup`)

#### 🔹 Trường 3: Hợp Đồng Thuê & Tài Chính (`FIELD_CONTRACT`)
- **Lệnh tắt:** `/hd [mã]` hoặc `/hopdong [mã]` hoặc bấm nút `[📜 Hợp đồng]`
- **Nội dung:**
  - **Số hợp đồng** (`contract_number`)
  - **Chủ thể hợp đồng** (Tên chủ nhà/đất)
  - **Thời hạn hợp đồng:** Ngày ký HĐ → Ngày kết thúc HĐ (Badge màu cảnh báo: 🟢 *Còn hạn*, 🟡 *Sắp hết hạn trong 30 ngày*, 🔴 *Đã hết hạn*)
  - **Chu kỳ thanh toán:** 3 tháng, 6 tháng, 1 năm
  - **Tình trạng thanh toán:** Đã thanh toán đến ngày nào (`ngay_thanh_toan_den`)
  - **Đơn giá thuê:** Giá thuê có VAT, Giá không VAT, Giá điện khoán hàng tháng
  - **Tài khoản ngân hàng:** Số tài khoản, Tên ngân hàng, Chủ tài khoản (chủ nhà hỏi tiền thuê là KTV đọc được ngay)

#### 🔹 Trường 4: Vào Trạm, Chìa Khóa & Hiện Trường (`FIELD_ACCESS`)
- **Lệnh tắt:** `/chu [mã]` hoặc `/khoa [mã]` hoặc bấm nút `[🔑 Vào trạm & Khóa]`
- **Nội dung:**
  - **Số điện thoại chủ nhà:** Hiển thị link gọi ngay (bấm vào là tự kích hoạt cuộc gọi thoại trên điện thoại)
  - **Chìa khóa & Ổ khóa:** Người giữ chìa khóa, Mật khẩu ổ khóa số cổng/phòng máy
  - **Chỉ dẫn thực địa:** Đường đi (hẻm nhỏ, dốc, đi bộ), cảnh báo chó dữ, liên hệ bảo vệ
  - **Tình trạng mặt bằng:** Bình thường, Tranh chấp, Đang thương thảo giảm giá thuê

---

## 4. GIAO DIỆN TƯƠNG TÁC (UX) HIỆN TRƯỜNG

### 4.1. Tra cứu đa năng (Smart Search)
KTV có thể gửi bất kỳ thông tin nào vào bot:
1. **Theo mã trạm:** `DNLK00`, `dnlk00`, `26dna_lk00`, `lk00`
2. **Theo tên trạm:** `Long Khánh`, `Bảo Vinh`, `Gia Ray`
3. **Theo tên chủ nhà:** `Nguyễn Văn A`
4. **Theo số hợp đồng:** `HĐ_1234`
5. **Gửi vị trí GPS (Live Location):** KTV đứng trước cổng trạm chỉ cần bấm "Chia sẻ vị trí" → Bot tự quét trạm gần nhất trong bán kính 200m!

### 4.2. Điều hướng 1-Chạm qua Inline Keyboard
Khi tìm thấy trạm, bot gửi tin nhắn dạng Thẻ Tóm Tắt kèm 3 nút bấm tương tác:

```
┌──────────────────────────────────────────────┐
│ 📍 TRẠM: 26DNa_LK00 (Mã cũ: DNLK00)          │
│ 🏢 Tên: Long Khánh 00                        │
│ 📌 Địa chỉ: P. Xuân An, TP. Long Khánh      │
│ 👤 QLT: Trần Văn B (0903.xxx.xxx)            │
│ ⏳ HĐ: Còn hạn đến 15/12/2027                │
├──────────────────────────────────────────────┤
│ [⚡ Hạ tầng & Nguồn]   [📜 Hợp đồng & Tiền]   │
│ [🔑 Vào trạm & Chủ đất][🗺️ Chỉ đường Maps]   │
└──────────────────────────────────────────────┘
```

* Khi bấm vào `[📜 Hợp đồng & Tiền]`: Tin nhắn tự động đổi nội dung sang chi tiết hợp đồng, không gửi thêm tin nhắn mới làm trôi màn hình.
* Có nút `[🔙 Quay lại]` để trở về Thẻ Tóm Tắt.

---

## 5. CẤU TRÚC MODULE BACKEND ĐỀ XUẤT

Xây dựng module gọn nhẹ, chuyên nghiệp tại **`backend/bots/`**:

```
backend/
├── bots/
│   ├── core/
│   │   ├── base_bot.py           # Telegram client wrapper
│   │   ├── auth.py               # Phân quyền danh bạ KTV/Admin
│   │   └── cache.py              # In-memory Snapshot 412 trạm từ Supabase
│   │
│   ├── resolvers/
│   │   └── site_contract_resolver.py # Query & Format 4 trường dữ liệu
│   │
│   ├── handlers/
│   │   ├── search_handlers.py    # Bắt mã trạm, tên trạm, chủ đất, GPS location
│   │   └── callback_handlers.py  # Xử lý nút bấm Inline Keyboard đổi trường
│   │
│   └── site_contract_bot.py      # Entry point khởi chạy bot (asyncio)
```

Tích hợp trực tiếp vào file quản lý tiến trình `backend/run_workers.py` để máy tự khởi động cùng hệ thống.

---

## 6. PHÂN ĐỊNH VỚI 2 BOT ERA VÀ METRO

Hệ sinh thái bot của KTV TVT3 sẽ rất rành mạch:
1. **Bot ERA (`@LKH_ERA_BOT`):** Chuyên sâu Vô tuyến RAN (Cell 3G/4G/5G, Moshell Ericsson).
2. **Bot METRO (`@Telebot_Metro`):** Chuyên sâu Truyền dẫn (Cisco CSG NCS540, Port, Suy hao Rx/Tx).
3. **Bot TVT3 (`@TVT3_Site_Bot`):** Chuyên sâu **DataSite Hạ tầng & Hợp đồng Chủ đất** (Supabase TVT3).

Không giẫm chân lên nhau, không trùng lặp với Web Dashboard!

---

## 7. NEXT STEPS
Chuyển sang bước **/plan** để lập kế hoạch chi tiết triển khai code cho module `backend/bots/site_contract_bot.py`.
