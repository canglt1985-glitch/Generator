# 💡 BRIEF: ĐỒNG BỘ 28 MÁY PHÁT ĐIỆN LƯU ĐỘNG VÀO HỆ THỐNG QUẢN LÝ THIẾT BỊ LƯU ĐỘNG TVT3

**Ngày tạo:** 29/09/2026  
**Người thực hiện:** Antigravity AI Pair Programmer & Lê Tân Cảng (Tổ trưởng TVT3)  
**Trạng thái:** Brainstorm hoàn tất ➔ Sẵn sàng chuyển sang `/plan` / `/code`

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- File danh mục tài sản EAM chuẩn hóa của TVT3 có **28 máy phát điện lưu động** (vừa lập theo mẫu import VT4-5).
- Bảng cơ sở dữ liệu `mobile_equipment` (Supabase V2) và giao diện Web TVT3 hiện chỉ có **25 máy** (`MPD-01` ➔ `MPD-25`), trong đó:
  - Có 2 máy rác/ảo (`MPD-17`, `MPD-18` ghi "Không tồn tại").
  - Còn thiếu 3 máy chưa được đưa vào hệ thống.
  - Thông số kỹ thuật ghi sơ sài, thiếu số Serial và mã tài sản EAM OID.
  - Máy STT 20 (`KYO POWER THG 11000S`) mới bị hỏng nhưng hệ thống chưa ghi nhận.
- Các máy `MPD-04`, `MPD-06`, `MPD-07` đang ghi vị trí `KHO` nhưng ghi chú lại ở các trạm `DNXL86`, `DNXL54`, `DNXL83`.
- Bảng quản lý thiết bị lưu động trên Web chưa có tính năng **sửa trực tiếp vị trí trạm** khi anh em điều chuyển thực tế.

---

## 2. NGUYÊN TẮC ĐÃ THỐNG NHẤT (THE DECISIONS)

| Yếu tố | Quyết định thống nhất | Diễn giải chi tiết |
|:---|:---|:---|
| **Mã thiết bị (`equipment_code`)** | **`MPD-01` đến `MPD-28`** | - Giữ nguyên mã quen thuộc cho anh em vận hành.<br>- Thay thế 2 máy ảo `MPD-17`, `MPD-18` bằng 2 máy thực tế.<br>- Thêm mới `MPD-26`, `MPD-27`, `MPD-28`. |
| **Vị trí hiện tại (`current_location`)** | **Hiển thị Site ID CŨ & Cập nhật trạm thực tế** | - **Cập nhật ngay 3 trạm:** `MPD-04` ➔ `DNXL86`, `MPD-06` ➔ `DNXL54`, `MPD-07` ➔ `DNXL83`.<br>- **Hiển thị ngắn gọn bằng Site ID CŨ** (VD: `DNLK28`, `DNXL54`, `DNDQ49`, `DNTP19`... hoặc `KHO`).<br>- Không dùng mã trạm mới dài dòng (`DNIDQU22`, `DNITPU07`...). |
| **Tính năng sửa vị trí trên Web** | **Bổ sung nút Sửa vị trí nhanh** | - Thêm nút `✏️ Sửa vị trí` trực tiếp trên từng dòng thiết bị lưu động.<br>- Bấm vào mở Modal tìm kiếm trạm theo Site ID cũ / Kho để cập nhật tức thì.<br>- Tự động ghi nhận 1 log vào `equipment_transfers` lưu vết lần chuyển gần nhất. |
| **Thông số hiển thị (`specifications`)** | **Ngắn gọn, dễ đọc** | Hiển thị dạng: `KIBII 5.5kVA (Xăng)`, `HUYNDAI 7kVA (Xăng)`, `VIETGEN 5.5kVA (Dầu)`, `ECO 5.5kVA (Xăng)`... |
| **Dữ liệu đầy đủ (Chi tiết)** | **Lưu trong trường `notes` / metadata** | Đầy đủ thông tin: Model chuẩn (`ECO (EC9900LE)...`), Serial xuất xưởng sạch, OID EAM (7 số), Dung tích bình dầu (25L/30L/35L), Ngày sử dụng chuẩn VT4-5. |
| **Lịch sử điều chuyển** | **Chỉ cần nhớ lần gần nhất** | Giữ lại bản ghi điều chuyển mới nhất cho mỗi máy để theo dõi trạm nguồn ➔ trạm đích, dọn dẹp các log thừa. |
| **Trạng thái máy hỏng** | **3 máy Hư/Hỏng** | Cập nhật `status = 'Hư'`: <br>1. `MPD-11` (STT 20 - KYO POWER 7kVA)<br>2. `MPD-25` (STT 26 - Vietgen 5.5kVA serial 1241414006575)<br>3. `MPD-26` (STT 27 - Vietgen 5.5kVA) |

---

## 3. DANH SÁCH ÁNH XẠ CHI TIẾT (MAPPING TABLE: 28 MÁY)

| Mã Web | Hãng & Model chuẩn | CS & Nhiên liệu | Hiển thị trên Web (`specifications`) | Serial chuẩn | Mã EAM (OID) | Dung tích | Trạng thái | Vị trí hiện tại (Site ID cũ) |
|:---:|:---|:---:|:---|:---:|:---:|:---:|:---:|:---|
| **MPD-01** | KYO POWER THG 8800 KXS | 5.5kVA Xăng | KYO POWER 5.5kVA (Xăng) | 2210500259 | 4715040 | 25L | Tốt | `DNCM08` |
| **MPD-02** | KYO POWER THG 8800 KXS | 5.5kVA Xăng | KYO POWER 5.5kVA (Xăng) | *(Trống)* | 4715042 | 25L | Tốt | `DNDQ49` |
| **MPD-03** | KIBII(EKB7500LRE-K) | 5.5kVA Xăng | KIBII 5.5kVA (Xăng) | *(Trống)* | 4715038 | 25L | Tốt | `DNTP19` |
| **MPD-04** | KYO POWER THG 11000S | 7.0kVA Xăng | KYO POWER 7kVA (Xăng) | 20002112 | 4715030 | 35L | Tốt | 📍 **`DNXL86`** *(Cập nhật từ KHO)* |
| **MPD-05** | KIBII(EKB7500LRE-K) | 6.0kVA Xăng | KIBII 6kVA (Xăng) | E7512208804 | 4715023 | 25L | Tốt | `DNLK71` |
| **MPD-06** | KIBII(EKB7500LRE-K) | 5.5kVA Xăng | KIBII 5.5kVA (Xăng) | *(Trống)* | 4715039 | 25L | Tốt | 📍 **`DNXL54`** *(Cập nhật từ KHO)* |
| **MPD-07** | ECO (EC9900LE) | 5.5kVA Xăng | ECO 5.5kVA (Xăng) | 20220808266 | 4715037 | 25L | Tốt | 📍 **`DNXL83`** *(Cập nhật từ KHO)* |
| **MPD-08** | KYO POWER THG 11000S | 7.0kVA Xăng | KYO POWER 7kVA (Xăng) | 20002407 | 4715028 | 35L | Tốt | `DNXL68` |
| **MPD-09** | KIBII(EKB7500LRE-K) | 5.5kVA Xăng | KIBII 5.5kVA (Xăng) | *(Trống)* | 4715019 | 25L | Tốt | `DNXL45` |
| **MPD-10** | ECO (EC9900LE) | 5.5kVA Xăng | ECO 5.5kVA (Xăng) | 2022080295 | 4715018 | 25L | Tốt | `DNLK28` |
| **MPD-11** | KYO POWER THG 11000S | 7.0kVA Xăng | KYO POWER 7kVA (Xăng) | *(Trống)* | 4715029 | 35L | ⚠️ **Hư** | `KHO` |
| **MPD-12** | KYO POWER THG 11000S | 7.0kVA Xăng | KYO POWER 7kVA (Xăng) | 20002271 | 4715031 | 35L | Tốt | `DNXL55` |
| **MPD-13** | KYO POWER THG 8800 KXS | 5.5kVA Xăng | KYO POWER 5.5kVA (Xăng) | *(Trống)* | 4715041 | 25L | Tốt | `DNDQ45` |
| **MPD-14** | HUYNDAI (HY10500LE) | 7.0kVA Xăng | HUYNDAI 7kVA (Xăng) | 2024030045 | 4715026 | 30L | Tốt | `KHO` |
| **MPD-15** | KYO POWER THG 11000S | 7.0kVA Xăng | KYO POWER 7kVA (Xăng) | 20002270 | 4715033 | 35L | Tốt | `DNDQ15` |
| **MPD-16** | KIBII(EKB7500LRE-K) | 5.5kVA Xăng | KIBII 5.5kVA (Xăng) | *(Trống)* | 4715038 | 25L | Tốt | `DNXL55` *(Cập nhật từ KHO)* |
| **MPD-17** | HUYNDAI (HY10500LE) | 5.5kVA Xăng | HUYNDAI 5.5kVA (Xăng) | 2022080266 | 4600186 | 25L | Tốt | `KHO` |
| **MPD-18** | KIBII(EKB7500LRE-K) | 5.5kVA Xăng | KIBII 5.5kVA (Xăng) | E7512208807 | 4715017 | 25L | Tốt | `KHO` |
| **MPD-19** | KYO POWER THG 8800 KXS | 5.5kVA Xăng | KYO POWER 5.5kVA (Xăng) | *(Trống)* | 4715036 | 25L | Tốt | `KHO` |
| **MPD-20** | HUYNDAI (HY10500LE) | 7.0kVA Xăng | HUYNDAI 7kVA (Xăng) | 2024030015 | 4715025 | 30L | Tốt | `DNTN33` *(Cập nhật từ KHO)* |
| **MPD-21** | KYO POWER THG 11000S | 7.0kVA Xăng | KYO POWER 7kVA (Xăng) | 20002253 | 4715034 | 35L | Tốt | `DNTP09` |
| **MPD-22** | KIBII(EKB7500LRE-K) | 6.0kVA Xăng | KIBII 6kVA (Xăng) | E7512208755 | 4715024 | 25L | Tốt | `DNTP44` |
| **MPD-23** | Vietgen vàng | 5.5kVA Dầu | VIETGEN 5.5kVA (Dầu) | 1241414006588 | 4715044 | 35L | Tốt | `DNTP45` |
| **MPD-24** | Vietgen vàng | 5.5kVA Dầu | VIETGEN 5.5kVA (Dầu) | 1241414006478 | 4715020 | 35L | Tốt | `DNTP48` |
| **MPD-25** | Vietgen vàng | 5.5kVA Dầu | VIETGEN 5.5kVA (Dầu) | 1241414006575 | 4715045 | 35L | ⚠️ **Hư** | `KHO` |
| **MPD-26** | Vietgen vàng | 5.5kVA Dầu | VIETGEN 5.5kVA (Dầu) | *(Trống)* | 4715046 | 35L | ⚠️ **Hư** | `KHO` |
| **MPD-27** | HUYNDAI (HY10500LE) | 7.0kVA Xăng | HUYNDAI 7kVA (Xăng) | 2024030061 | 4715032 | 30L | Tốt | `DNTP32` |
| **MPD-28** | KYO POWER THG 11000S | 7.0kVA Xăng | KYO POWER 7kVA (Xăng) | 20002225 | 4715027 | 35L | Tốt | `DNLK12` |

---

## 4. TÍNH NĂNG MỚI TRÊN WEB (UI/UX FEATURE)
### Modal "Sửa nhanh vị trí thiết bị lưu động" (Quick Location Edit Modal)
- Nút bấm `✏️ Sửa vị trí` ngay cạnh nhãn vị trí của từng dòng thiết bị.
- Cho phép:
  1. Chọn vị trí nhanh: `Kho TVT3` hoặc Chọn trạm BTS theo Site ID cũ (có ô gõ lọc tự động).
  2. Cập nhật ghi chú.
  3. Bấm **"Lưu thay đổi"**:
     - Cập nhật trực tiếp `current_location` trên Supabase `mobile_equipment`.
     - Tự động ghi lại 1 log điều chuyển vào `equipment_transfers` (từ trạm cũ sang trạm mới) để lưu vết lần gần nhất.
     - Cập nhật giao diện tức thì.
