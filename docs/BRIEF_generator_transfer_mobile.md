# 💡 BRIEF: Chuẩn Hóa Điều Chuyển Máy Phát Điện & Áp Dụng Chế Độ Máy Xăng Lưu Động

**Ngày lập:** 16/09/2026  
**Quy trình:** `/brainstorm`  
**Dự án:** Quản lý Vận hành Trạm & Máy Phát Điện - Tổ Viễn Thông 3 (TVT3)

---

## 1. BỐI CẢNH & VẤN ĐỀ CẦN GIẢI QUYẾT

* **Thực trạng:**  
  Theo dõi lịch sử bàn giao tài sản, có một số trạm BTS đã hoàn tất lệnh **Điều chuyển máy phát điện** đi trạm khác hoặc chuyển về kho sửa chữa.
* **Vấn đề tồn đọng:**  
  Dữ liệu cấu hình hạ tầng trạm (`datasites.infrastructure_info`) tại một số trạm nguồn vẫn đang ghi nhận máy phát điện cố định (dầu diesel, định mức từ 2.51 – 3.56 L/h).  
  Khi xảy ra mất điện, nhân viên kỹ thuật phải điều động **Máy Xăng Lưu Động** (5 KVA, định mức 2.0 L/h, xăng) đến ứng cứu. Tuy nhiên, hệ thống lại tự động áp định mức máy dầu cũ, gây sai lệch:
  1. **Sai loại nhiên liệu:** Ghi nhận tiêu thụ Dầu thay vì Xăng.
  2. **Sai định mức thanh toán:** Định mức dầu cũ (2.5 – 3.5 L/h) cao hơn định mức máy xăng chuẩn (2.0 L/h), dẫn đến sai lệch quyết toán tài chính.
  3. **Không phản ánh đúng thực tế quản lý tài sản trạm.**

---

## 2. MỤC TIÊU & GIẢI PHÁP ĐỀ XUẤT

* **Nguyên tắc cốt lõi:**  
  Trạm nào đã hoàn tất chuyển máy phát điện cố định đi (và không có máy khác điều chuyển đến bù) thì **tự động chuyển sang cơ chế "Trạm không có MPĐ cố định" $\rightarrow$ áp dụng "MÁY XĂNG LƯU ĐỘNG"** khi cúp điện/nhập log.
* **Cơ chế kỹ thuật trong App TVT3:**
  * Cập nhật `datasites.infrastructure_info.may_phat_dien.mpd`:
    * Đặt `tinh_trang = "ĐÃ ĐIỀU CHUYỂN"`.
    * Bổ sung `ngay_ket_thuc = "[Ngày lệnh điều chuyển hoàn thành]"`.
    * Ghi chú trạm nhận đích.
  * Nhờ đó, hàm `getStationSpecs(siteId, date)` sẽ tự động fallback về:
    * **Nhãn hiệu:** `MÁY XĂNG LƯU ĐỘNG`
    * **Công suất:** `5 KVA`
    * **Nhiên liệu:** `XĂNG`
    * **Định mức:** `2.0 L/h`
    * **Serial:** `LƯU ĐỘNG`

---

## 3. DANH SÁCH PHÂN LOẠI CHI TIẾT TỪ HÌNH ẢNH ERP ĐIỀU CHUYỂN

### 🔴 NHÓM 1: 8 TRẠM CHUYỂN MÁY ĐI $\rightarrow$ PHÂN BỔ MÁY XĂNG LƯU ĐỘNG THEO CẤU HÌNH

#### Danh mục các chủng loại Máy nổ xăng lưu động (Theo định mức quy định):
* **Máy lớn (7.0 KVA) – Định mức 4.02 L/h:** `MLĐ KYO POWER` (Ưu tiên trạm cấu hình nặng 3G/4G/5G, AIR2600 32T32R)
* **Máy lớn (6.0 KVA) – Định mức 3.44 L/h:** `MLĐ KiBii` (Ưu tiên trạm 3G/4G/5G hoặc 3G/4G nhiều sector)
* **Máy chuẩn (5.5 KVA) – Định mức 3.15 L/h:** `MLĐ KYO POWER` & `MLĐ ECOs` (Trạm remote 3G/4G thông thường)

#### Bảng đề xuất gán máy phát điện lưu động cho 8 trạm:

| STT | Mã cũ | Mã TVT3 | Tên trạm | Cấu hình trạm & 5G | Loại máy xăng lưu động gán | Công suất | Định mức xăng (L/h) | Lý do bố trí |
|:---:|:---:|:---:|:---|:---|:---|:---:|:---:|:---|
| **1** | **DNTP08** | `DNIPHO05` | Phú Hòa 5 | **3G/4G/5G** (AIR2600 32T32R) | **MLĐ KYO POWER** | **7.0 KVA** | **4.02** | Cấu hình 3G/4G/5G tải cao, trạm trọng điểm |
| **2** | **DNLK27** | `DNIBVI04` | Bảo Vinh 4 | **3G/4G/5G** (AIR2600 32T32R) | **MLĐ KiBii** | **6.0 KVA** | **3.44** | Cấu hình 3G/4G/5G nâng cấp SRAN |
| **3** | **DNDQ05** | `DNILNA01` | La Ngà 1 | **3G/4G (4 Sectors tải nặng)** | **MLĐ KiBii** | **6.0 KVA** | **3.44** | Trạm 4 Sector tải thiết bị lớn |
| **4** | **DNLK42** | `DNIBVI14` | Bảo Vinh 14 | 3G/4G Tiêu chuẩn | **MLĐ KYO POWER** | **5.5 KVA** | **3.15** | Trạm remote 3G/4G chuẩn |
| **5** | **DNDQ51** | `DNILNA07` | La Ngà 7 | 3G/4G Tiêu chuẩn | **MLĐ ECOs** | **5.5 KVA** | **3.15** | Trạm remote 3G/4G chuẩn |
| **6** | **DNDQ23** | `DNIPHO02` | Phú Hòa 2 | 3G/4G Tiêu chuẩn | **MLĐ KYO POWER** | **5.5 KVA** | **3.15** | Trạm remote 3G/4G chuẩn |
| **7** | **DNCM23** | `DNISRA02` | Sông Ray 2 | 3G/4G Tiêu chuẩn | **MLĐ KYO POWER** | **5.5 KVA** | **3.15** | Trạm remote 3G/4G chuẩn |
| **8** | **DNLK14** | `DNIXLA01` | Xuân Lập 1 | 3G/4G Tiêu chuẩn | **MLĐ KYO POWER** | **5.5 KVA** | **3.15** | Trạm remote 3G/4G chuẩn |

---

### 🟡 NHÓM 2: CÁC TRẠM HOÁN ĐỔI / THAY THẾ (VẪN CÒN MÁY PHÁT ĐIỆN)

* **DNDQ31 (`DNILNA05` - La Ngà 5):**
  * Ngày 18/09/2025: Chuyển máy cũ (SBM 8.5KVA, serial 09312) sang DNDQ58.
  * Cùng ngày 18/09/2025: Nhận máy mới (KIBII 12KVA, serial E1512304149) từ DNDQ51 chuyển sang.
  * $\rightarrow$ **Kết luận:** Trạm vẫn duy trì MPĐ cố định (cập nhật thông số máy mới KIBII 12KVA).
* **DNXL77 (`DNIXLO27` - Xuân Lộc 27):**
  * Ngày 12/05/2025: Trả máy cũ về Kho Long Khánh.
  * Ngày 05/06/2025: Nhận máy 09412 từ DNLK42 sang thay thế.
  * $\rightarrow$ **Kết luận:** Từ 05/06/2025 trở đi vẫn có máy phát điện cố định.
* **DNIDQN1 (AGG Định Quán):**
  * Ngày 25/09/2025: Chuyển máy cũ đi sửa chữa tập trung, đồng thời nhận máy từ DNLTB8 về thay thế.
  * $\rightarrow$ **Kết luận:** Vẫn có máy phát điện cố định.

---

### 🟢 NHÓM 3: CÁC TRẠM ĐÍCH NHẬN BỔ SUNG MÁY PHÁT ĐIỆN CỐ ĐỊNH

Các trạm này được cấp thêm máy phát điện cố định từ trạm nguồn:
1. **DNTP30** (`DNITPU12` - Tân Phú 12): Nhận VIETGEN 12.5KVA từ DNTP08.
2. **DNDQ58** (`DNIDQU21` - Định Quán 21): Nhận SBM 8.5KVA từ DNDQ31.
3. **DNDQ41** (`DNITNS02` - Thanh Sơn 2): Nhận CAPO 12.5KVA từ DNDQ05.
4. **DNDQ25** (`DNIPVI03` - Phú Vinh 3): Nhận LISTER PETTER 12.5KVA từ DNDQ23.
5. **DNCM15** (`DNIXQU01` - Xuân Quế 1): Nhận VIETGEN 12.5KVA từ DNCM23.
6. **DNXL49** (`DNIXHO13` - Xuân Hòa 13): Nhận VIETGEN 8.5KVA từ DNLK27.
7. **DNLK37** (`DNIBLC07` - Bình Lộc 7): Nhận KIBII 8.5KVA từ DNLK14.

---

### ⚪ NHÓM 4: LỆNH KHÔNG THỰC HIỆN / TỪ CHỐI
* `05/06/2025`: **DNLK42 $\rightarrow$ DNXL70**: Trạng thái "Không được duyệt (1/2)". Giao dịch này không có hiệu lực (sau đó DNLK42 đã chuyển thành công cho DNXL77).

---

## 4. CẤU TRÚC LƯU TRỮ TRONG CƠ SỞ DỮ LIỆU (`datasites.infrastructure_info`)

Nhằm bảo toàn lịch sử trước ngày điều chuyển đồng thời áp dụng chính xác máy xăng lưu động từ sau ngày điều chuyển, cấu trúc `infrastructure_info.may_phat_dien.mpd` cho mỗi trạm sẽ được cấu hình gồm 2 bản ghi:

```json
{
  "mpd": [
    {
      "ten": "MÁY PHÁT ĐIỆN DẦU (CŨ)",
      "nhan_hieu": "VIETGEN / KIBII / ...",
      "cong_suat": "12.5",
      "dinh_muc": 3.56,
      "nhien_lieu": "Dầu",
      "tinh_trang": "ĐÃ ĐIỀU CHUYỂN",
      "ngay_ket_thuc": "2025-09-25",
      "ghi_chu": "Đã điều chuyển sang trạm đích theo lệnh ERP"
    },
    {
      "ten": "MÁY NỔ XĂNG LƯU ĐỘNG",
      "nhan_hieu": "MLĐ KYO POWER / MLĐ KiBii / MLĐ ECOs",
      "cong_suat": "5.5 / 6 / 7",
      "dinh_muc": 3.15,
      "dinh_muc_thuc_te": 3.15,
      "nhien_lieu": "Xăng",
      "loai_lap_dat": "Lưu động",
      "tinh_trang": "Hoạt động",
      "ngay_bat_dau": "2025-09-25",
      "ghi_chu": "Bố trí máy lưu động xăng thay thế máy cố định điều chuyển"
    }
  ]
}
```

---

## 5. TÁC ĐỘNG SAU KHI ÁP DỤNG THẬT

1. **Trên màn hình Chạy máy & Nhập log:**
   * Chọn ngày trước khi điều chuyển $\rightarrow$ Hệ thống áp đúng máy dầu cũ (bảo toàn hồ sơ quyết toán lịch sử).
   * Chọn ngày sau khi điều chuyển (hoặc hiện tại) $\rightarrow$ Hệ thống tự động gán đúng tên máy xăng lưu động, công suất (5.5KVA / 6KVA / 7KVA) và định mức xăng tương ứng (3.15 L/h, 3.44 L/h hoặc 4.02 L/h).
2. **Quyết toán nhiên liệu:**
   * Tự động xuất phiếu xăng, không bị nhầm sang dầu.
   * Định mức chuẩn xác theo bảng định mức mới của tổ.


---

## 5. BƯỚC TIẾP THEO
* Chuyển sang `/plan` để lập kế hoạch cập nhật bảng `datasites` và kiểm thử tự động giao diện.
