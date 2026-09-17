# 💡 BRIEF: Nhận Diện Log Chạy Máy Phát Điện Thiết Bị Ericsson ERA Trên SmartW

**Ngày tạo:** 17/09/2026  
**Brainstorm cùng:** Tổ Trưởng / Kỹ sư VHKT TVT3  
**Trạng thái:** DRAFT (Brainstorm Complete)

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
1. **Bỏ sót cảnh báo máy nổ trên thiết bị Ericsson ERA:**
   - Trên dòng trạm mới swap ERA (Ericsson Radio System), SmartW ghi nhận cột **Cảnh báo (Alarm Name)** là `External Alarm`, nhưng trong cột **Alarm Info** lại ghi rất chi tiết:
     - `Generator running` (Máy phát điện đang chạy)
     - `AC Failure` (Mất AC điện lưới)
     - `Main Failure` (Mất nguồn điện chính)
   - Hiện tại bộ cào (`scraper.py`) chỉ kiểm tra `r.get('alarmName')` xem có chứa `"generat"` không, nên đã **loại bỏ 100% cảnh báo máy nổ của thiết bị ERA**.
2. **CSDL thiếu cột lưu trữ chi tiết:**
   - Bảng `smartw_alarms` trên Supabase chỉ lưu `alarm_name`, chưa có cột `alarm_info`, dẫn đến việc mất thông tin quý giá khi đồng bộ.
3. **Chưa có cơ chế đối soát thông minh theo Danh sách chạy máy:**
   - Khi có lịch cúp điện lưới, các trạm thuộc danh sách có máy phát điện (cố định hoặc điều chuyển lưu động) nếu phát sinh cảnh báo ngoài (`External Alarm`) thì **vẫn phải tính là chạy máy phát điện** để tránh báo thiếu log sai lệch.
4. **Lệch hậu tố công nghệ (Suffix Mismatch):**
   - Tên trạm ERA trên SmartW có gắn hậu tố `L` (4G), `UL` (SRAN), `N` (5G) (ví dụ: `DNIXLO01L`, `DNIXLO10L`), backend so khớp chuỗi trực tiếp bị trượt và không lấy được định mức máy nổ.

---

## 2. GIẢI PHÁP ĐỀ XUẤT

```
SmartW API (alarmLog-new & alarm/site/data)
   │
   ├── 1. Lọc MPĐ Mở Rộng:
   │      - 'generat' in alarmName OR 'generat' in alarmInfo
   │      - HOẶC (alarmName == 'External Alarm' AND Site in DanhSachMayPhat AND trong_khung_cup_dien)
   │
   ├── 2. Chuẩn Hóa Site ID:
   │      - DNIXLO01L -> DNIXLO01 (Mã cũ: DNXL02)
   │      - Lấy đúng định mức máy phát điện từ datasites
   │
   ├── 3. Lưu CSDL Supabase:
   │      - Bổ sung cột alarm_info vào smartw_alarms
   │      - Tự động tạo bản ghi vào generator_logs
   │
   └── 4. Báo Cáo Viber / Telegram:
          - Loại bỏ trạm khỏi "Danh sách thiếu log"
          - Báo đúng mục *GEN:* trên nhóm TVT3-Giám sát Ran
```

---

## 3. NGUYÊN TẮC NHẬN DIỆN CHI TIẾT (DECISION MATRIX)

### 3.1. Nhận diện Máy Phát Điện (GEN / MPĐ):
Một cảnh báo được xác định là **Máy phát điện chạy** nếu thỏa mãn **MỘT TRONG CÁC ĐIỀU KIỆN SAU**:
1. **Điều kiện rõ ràng qua text:**
   - `alarmName` chứa từ khóa `"generat"` (áp dụng cho Nokia: `7404`, `7407`, `7409`, `7410 Generator Running`).
   - **HOẶC** `alarmInfo` chứa từ khóa `"generat"` (áp dụng cho Ericsson ERA: `Generator running`).
2. **Điều kiện theo danh sách chạy máy & cúp điện lưới:**
   - Cảnh báo là `External Alarm` hoặc `AlmDevice_ExternalAlarm`.
   - Trạm thuộc danh sách có máy phát điện (trạm có MPĐ cố định hoặc trạm có cấu hình điều động MPĐ lưu động trong `datasites`).
   - Thời điểm phát sinh cảnh báo nằm trong khung giờ cúp điện lưới (`power_schedule`) hoặc kéo dài $\ge 15$ phút.

### 3.2. Nhận diện Mất Điện Lưới (MAC):
1. `alarmName` chứa `"AC Failure"`, `"Main Failure"`, `"BTS MAIN FAILURE"` (Nokia).
2. `alarmInfo` chứa `"AC Failure"` hoặc `"Main Failure"` (Ericsson ERA).
3. `alarmName` là `External Alarm` nhưng `alarmInfo` không chứa `"generat"` và trạm không nổ máy.

### 3.3. Nhận diện Mất Liên Lạc (MLL):
1. Trạm ERA: `Service Unavailable`, `Heartbeat Failure`, `PLMN Service Unavailable`.
2. Trạm Nokia: `7786|WCDMA BASE STATION OUT OF USE`, `7653|CELL FAULTY`.

---

## 4. TÍNH NĂNG & PHÂN KỲ TRIỂN KHAI

### 🚀 MVP (Triển khai ngay):
- [ ] **Mở rộng bộ lọc Scraper (`backend/smartw/scraper.py`):**
  - Sửa `scrape_mpd()` và `scrape_mfd_reports()` để kiểm tra cả `r.get('alarmName')` và `r.get('alarmInfo')`.
- [ ] **Cập nhật hàm Sync Fallback (`backend/smartw_worker.py`):**
  - Chuẩn hóa tên trạm bằng `_resolve_base_site_and_tech()`.
  - Quét thêm các cảnh báo ERA có `alarmInfo` chứa `"generat"` hoặc các trạm trong danh sách chạy máy có `External Alarm`.
- [ ] **Bổ sung cột `alarm_info` vào CSDL `smartw_alarms`:**
  - Lưu trữ đầy đủ trường `alarm_info` phục vụ hiển thị và truy vết.
- [ ] **Bổ sung 3 log chạy máy ngày 16/09/2026** (`DNIXLO01`, `DNIXLO10`, `DNIXLO16`) vào `generator_logs` trên Supabase để làm sạch danh sách thiếu log.

### 🎁 Phase 2 (Hoàn thiện & Tối ưu):
- [ ] Tích hợp logic nhận diện trạm điều chuyển máy nổ xăng lưu động vào worker đồng bộ.
- [ ] Hiển thị chi tiết `alarm_info` trên Dashboard Web App (trang Giám sát RAN và trang Nhật ký máy nổ).
- [ ] Cập nhật format bot Viber `TVT3-Giám sát Ran` để hiển thị đúng `*GEN:*` cho trạm ERA khi máy nổ.

---

## 5. ƯỚC TÍNH & RỦI RO KỸ THUẬT
- **Độ phức tạp:** Thấp - Trung bình (chủ yếu tinh chỉnh logic filter và mapping chuỗi, đã có sẵn hàm helper `_resolve_base_site_and_tech`).
- **Rủi ro:** Cần đảm bảo việc nhận diện `External Alarm` không bị nhầm lẫn giữa mất AC và máy nổ bằng cách ưu tiên kiểm tra `alarmInfo` trước, sau đó mới dùng điều kiện cúp điện fallback.

---

## 6. BƯỚC TIẾP THEO
→ Chuyển sang bước **/plan** để lập kế hoạch chi tiết code và migration CSDL.
