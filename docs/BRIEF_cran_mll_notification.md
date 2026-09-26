# 💡 BRIEF: Tích hợp Quan Hệ Trạm Main & Trạm CRAN Khi Báo Cáo MLL

**Ngày cập nhật:** 26/09/2026  
**Module:** VHKT-RAN & Bot Cảnh báo Vận hành (Viber / Telegram)  
**Trạng thái:** Brainstorming đã chốt toàn diện (Ready for /plan & /code)  

---

## 1. MỤC TIÊU & PHẠM VI ÁP DỤNG
Tích hợp thông tin quan hệ mạng C-RAN (Trạm Main - Trạm CRAN con) và **Đối tác vận hành cáp quang** (PITC, TPCOMS, VNPT, VTC, MBG...) khi phát hiện cảnh báo **Mất Liên Lạc (MLL)**:
- **Kênh áp dụng:**
  - ✅ **Bản tin MLL lẻ (Bot Viber / Telegram):** Bổ sung thông tin Trạm Main hoặc Trạm CRAN (kèm đối tác cáp). Đối với trạm thường có đối tác cáp ngoài (trừ Local) cũng hiển thị tên đối tác.
  - ✅ **Bản tin định kỳ 2H (Bot Viber / Telegram):** Áp dụng cùng format với mục MLL.
  - ✅ **Giao diện Web VHKT-RAN (Bản Desktop):** Hiển thị cột / badge Topology & Đối tác cáp trực quan.
  - ❌ **Giao diện Mobile (Web):** **KHÔNG hiển thị**, giữ nguyên định dạng danh sách tin nhắn tối giản hiện tại để tránh rối mắt trên điện thoại.
  - ❌ **Bản tin CLEARED (Khôi phục liên lạc):** **GIỮ NGUYÊN định dạng cũ** (không gắn tag Main/CRAN/Đối tác) để tin nhắn khôi phục ngắn gọn, sạch sẽ.

---

## 2. QUY CHUẨN ĐỊNH DẠNG TIN NHẮN (MESSAGE FORMAT)

### 2.1. Trường hợp trạm MLL là TRẠM CRAN 🔗
- **Cú pháp:** `  • {SITE} [{NET}] - {TIME}  - [{TRAM_MAIN} - {DOI_TAC_CAP}]`
  - Nếu có đối tác cáp ngoài: ` - [{TRAM_MAIN} - {DOI_TAC_CAP}]` (ví dụ: ` - [DNCM05 - PITC]`)
  - Nếu chưa có đối tác cáp: ` - [{TRAM_MAIN}]`
- **Ví dụ:**
  ```text
  • DNISRA02 (DNCM43) [4G] - 26/09 14:00  - [DNCM05 - PITC]
  • DNIXDI09 (DNXL72) [4G] - 26/09 13:45  - [DNXL48 - TPCOMS]
  ```

### 2.2. Trường hợp trạm thường (không phải CRAN) có đối tác cáp ngoài (Trừ Local)
- **Cú pháp:** `  • {SITE} [{NET}] - {TIME}  - [{DOI_TAC_CAP}]`
- Áp dụng khi đơn vị vận hành cáp là đối tác ngoài (`PITC`, `TPCOMS`, `VNPT`, `VTC`, `MBG`, `CADICOM`...):
- **Ví dụ:**
  ```text
  • DNIPLA00 (DNTP01) [4G] - 26/09 10:15  - [TPCOMS]
  • DNIXQU00 (DNCM09) [4G] - 26/09 11:30  - [VNPT]
  • DNIXQU02 (DNCM26) [4G] - 26/09 12:45  - [VTC]
  ```

### 2.3. Trường hợp trạm MLL là TRẠM MAIN 👑
- **Nếu trạm Main có từ 2 trạm CRAN trở lên:** Hiển thị số lượng và **toàn bộ danh sách trạm con đầy đủ**:
  `👑[{N} CRAN: {trạm 1}, {trạm 2}, ..., {trạm N}]`
  *Ví dụ:*
  ```text
  • DNITLA07 (DNTP37) [4G] - 26/09 14:00 👑[7 CRAN: DNTP47, DNTP02, DNTP48, DNTP51, DNTP42, DNTP03, DNTP39]
  ```
- **Nếu trạm Main chỉ có 1 trạm CRAN duy nhất:** Bỏ số 1 CRAN, ghi trực tiếp tên trạm con:
  `👑[CRAN: {tên trạm}]`
  *Ví dụ:*
  ```text
  • DNILKH02 (DNLK08) [4G] - 26/09 08:30 👑[CRAN: DNLK16]
  ```

### 2.4. Trường hợp trạm cáp Local (nội bộ, tự bảo dưỡng)
- Không gắn tag, giữ nguyên format gốc:
  ```text
  • DNIXLO16 (DNXL41) [4G] - 26/09 15:10
  ```

### 2.5. Bản tin CLEARED (Trạm khôi phục)
- Giữ nguyên format chuẩn không kèm tag Main/CRAN/Đối tác:
  ```text
  ✅ CLEARED:
    • DNISRA02 (DNCM43) [4G] - 15:30
    • DNIPLA00 (DNTP01) [4G] - 15:35
  ```

---

## 3. THIẾT KẾ GIAO DIỆN WEB (DESKTOP)
- **Vị trí:** Tab **Mất liên lạc (MLL)** trên màn hình Desktop (`hidden sm:block`).
- **Hiển thị:** Thêm cột **TOPOLOGY / ĐỐI TÁC CÁP**:
  - Trạm CRAN: `🔗 CRAN: Main {Tên trạm} - Cáp: {Đối tác}`
  - Trạm thường có đối tác: `Cáp: {Đối tác}`
  - Trạm Main: `👑 Main ({N} CRAN)` kèm tooltip hiển thị toàn bộ trạm con.
  - Trạm Local: `Local` hoặc `--`
- Trên Mobile (`block sm:hidden`): Giữ nguyên giao diện không đổi.

---

## 4. BƯỚC TIẾP THEO
→ Chuyển sang **/plan** để triển khai vào hệ thống.
