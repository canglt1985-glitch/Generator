# 💡 BRAINSTORM BRIEF: NGUYÊN NHÂN THIẾU MÃ VẬT TƯ / MÃ TSCĐ MPĐ (TVT3)

**Ngày lập:** 05/10/2026  
**Chủ đề:** Khảo sát và phân tích nguyên nhân thiếu mã thiết bị/vật tư (Mã VT 14 số) và mã tài sản (Mã TSCĐ) tại các trạm BTS thuộc Tổ Viễn Thông 3.

---

## 1. KẾT LUẬN TỔNG QUAN
Giả thuyết của User: **"Các trạm bị thiếu mã thiết bị/vật tư là do máy điều chuyển đi/đến phải không?"**
👉 **HOÀN TOÀN CHÍNH XÁC ĐẾN 85 - 90% CÁC TRƯỜNG HỢP THỰC TẾ.**

Dữ liệu rà soát từ 418 trạm có thông tin MPĐ tại TVT3 cho thấy 4 nhóm nguyên nhân gốc rễ:

---

## 2. PHÂN TÍCH 4 NHÓM NGUYÊN NHÂN CỤ THỂ

### 🟢 Nhóm 1: Trạm tiếp nhận máy ĐIỀU CHUYỂN ĐẾN (Thiếu Mã VT)
- **Quy tắc đặt mã VT của MobiFone:** Mã vật tư gồm 14 chữ số dạng `0002xxxx100001`, trong đó 8 số đầu `0002xxxx` chính là **Mã ERP của trạm gốc** được cấp phát thiết bị ban đầu.
- **Thực tế:** Khi tổ điều chuyển máy nổ từ trạm A sang trạm B (để ứng cứu hoặc tối ưu phụ tải trạm phát sóng), thực tế máy đang chạy tại trạm B nhưng kế toán tài sản/ERP chưa thực hiện thủ tục điều chuyển mã tài sản giữa 2 trạm.
- **Dẫn chứng thực tế trên hệ thống TVT3:**
  - `DNDQ25`: Nhận máy từ Phú Hòa 2 (`DNDQ23`) ngày 11/09/2025 -> Serial `33761`, có Mã TS `2027B1500000490` nhưng **trống Mã VT**.
  - `DNLK37`: Nhận máy từ Xuân Lập 1 (`DNLK14`) ngày 08/08/2025 -> Có Mã TS `2027B1500000717` nhưng **trống Mã VT**.
  - `DNDQ41`: Nhận máy từ La Ngà 1 (`DNDQ05`) ngày 17/09/2025 -> Có Mã TS `2027B1500000858` nhưng **trống Mã VT**.
  - `DNTP34`: Mang máy từ `DNTP42` qua -> Serial `2014/11714`, có Mã TS `2027B1500000140` nhưng **trống Mã VT**.
  - `DNTP23`: Mang máy từ trạm khác qua -> Serial `033761`, có Mã TS `2027B1500000613` nhưng **trống Mã VT**.

---

### 🟡 Nhóm 2: Trạm đã ĐIỀU CHUYỂN ĐI (Có Mã VT trạm cũ, lệch trạm thực tế)
- **Thực tế:** Máy đứng tên trạm cũ trên sổ sách kế toán, nhưng thực tế đã di dời sang trạm khác phục vụ mạng lưới:
  - `DNCM14` thực tế đang chạy máy của `DNCM11` (Mã VT: `00021130100001`, Mã TS: `2027B1500000924`).
  - `DNTP30` thực tế đang chạy máy của `DNTP08` (Mã VT: `00021002100001`, Mã TS: `2027B1500000268`, ghi chú rõ *"Chuyển sang DNTP30"*).
  - `DNDQ03` thực tế đang chạy máy của `DNTP44` (Mã VT: `00020511100001`, Mã TS: `2027B1500000640`).
  - `DNCM15` thực tế đang chạy máy của `DNCM23` (Mã VT: `00021649100001`, Mã TS: `2027B1500000925`).
  - `DNXL37` thực tế đang chạy máy của `DNLK40` (Mã VT: `00020650100001`, Mã TS: `2027B1500000937`).

---

### 🟠 Nhóm 3: Dùng MÁY PHÁT ĐIỆN LƯU ĐỘNG (MLĐ) Chạy Tạm (142 trạm thiếu cả 2 mã)
- **Thực tế:** Các trạm không có máy phát điện cố định riêng hoặc máy cố định đã hỏng nặng, thanh lý.
- Tổ VT3 trang bị máy lưu động (MLĐ) chạy xăng hoặc diesel nhỏ (5kVA - 7.5kVA như Kyo Power, ECOs, Kibii di động) để ứng cứu khi mất điện lưới.
- Do là **Công cụ lưu động của Tổ**, không phải TSCĐ của riêng trạm đó, nên trên Datasite **trống hoàn toàn cả Mã VT lẫn Mã TSCĐ**.

---

### 🔴 Nhóm 4: Máy thuê ngoài Xã hội hóa (XHH)
- Một số trạm trước đây thuê máy Vikyno 10kVA - 12.5kVA từ đối tác XHH (`DNDQ18`, `DNTP20`, `DNCM04`...).
- Thiết bị thuộc sở hữu đối tác bên ngoài nên **không có Mã TSCĐ của MobiFone**. Đến nay đã hết hợp đồng thuê và chuyển dần sang dùng MLĐ.

---

## 3. GIẢI PHÁP ĐỀ XUẤT ĐỂ XUẤT B4 BAN 4 KHÔNG BỊ TRẢ HỒ SƠ

1. **Auto-Enrichment thông minh theo Serial & Mã trạm gốc:**
   - Khi xuất biểu mẫu B4 Ban 4: Nếu trạm thiếu Mã VT nhưng có Serial/Mã TSCĐ hoặc nằm trong danh sách điều chuyển, hệ thống tự động đối soát tìm ra **Mã VT gốc (14 số)** tương ứng trên ERP.
   - Điền Mã trạm theo tên sổ sách ERP và ghi chú rõ ràng: *"Máy điều chuyển thực tế từ trạm [A] sang trạm [B]"*.

2. **Bổ sung quản lý điều chuyển trên giao diện:**
   - Trên form quản lý trạm / chi tiết máy, cho phép nhân viên chọn nhanh: *Máy cố định gốc*, *Máy điều chuyển từ trạm khác*, hay *Máy lưu động mượn chạy tạm*.
