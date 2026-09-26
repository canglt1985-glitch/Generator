# Feature Specification: Tích hợp Quan hệ Trạm Main, Trạm CRAN & Đối tác Cáp khi MLL Lẻ

**Mã tài liệu:** SPEC-260926-01  
**Ngày cập nhật:** 26/09/2026 16:07  
**Dự án:** VHKT-RAN (Tổ Viễn Thông 3 - MobiFone Đồng Nai)  
**Trạng thái:** Approved / Ready for Implementation  

---

## 1. Executive Summary
Tính năng giúp trực ca ĐHTT và KTV nhanh chóng xác định bản chất sự cố khi trạm Mất Liên Lạc (MLL) trong các **bản tin báo cáo lẻ**:
- **Trạm CRAN:** Hiển thị tên trạm Main và đối tác bảo dưỡng cáp (PITC, TPCOMS, VNPT, VTC, MBG...).
- **Trạm thường (thuê cáp ngoài):** Hiển thị tên đối tác cáp ngoài.
- **Trạm cáp Local (nội bộ):** Không gắn tag để tin nhắn sạch sẽ.
- **Trạm Main:** Cảnh báo nguy cơ sập cả chùm trạm CRAN con, liệt kê đầy đủ danh sách trạm con.
- **Phạm vi hiển thị:**
  - ✅ **Bản tin MLL lẻ (Bot Viber / Telegram):** Áp dụng định dạng mới khi có sự cố phát sinh.
  - ✅ **Bảng Web Desktop:** Thêm cột Topology / Đối tác cáp để tiện tra cứu.
  - ❌ **Bản tin Summary định kỳ 2H:** **GIỮ NGUYÊN NHƯ CŨ.**
  - ❌ **Bản tin CLEARED (Khôi phục):** **GIỮ NGUYÊN NHƯ CŨ.**
  - ❌ **Giao diện Web Mobile:** **GIỮ NGUYÊN NHƯ CŨ.**

---

## 2. Quy chuẩn Định dạng Tin nhắn Bot (Báo Cáo MLL Lẻ)

```text
📵 MLL:
  • DNISRA02 (DNCM43) [4G] - 26/09 14:00  - [DNCM05 - PITC]
  • DNIXDI09 (DNXL72) [4G] - 26/09 13:45  - [DNXL48 - TPCOMS]
  • DNIPLA00 (DNTP01) [4G] - 26/09 10:15  - [TPCOMS]
  • DNIXQU00 (DNCM09) [4G] - 26/09 11:30  - [VNPT]
  • DNITLA07 (DNTP37) [4G] - 26/09 14:00 👑[7 CRAN: DNTP47, DNTP02, DNTP48, DNTP51, DNTP42, DNTP03, DNTP39]
  • DNILKH02 (DNLK08) [4G] - 26/09 08:30 👑[CRAN: DNLK16]
  • DNIXLO16 (DNXL41) [4G] - 26/09 15:10
```
*(Bản tin Summary 2H và bản tin Clear vẫn giữ nguyên format tối giản trước giờ).*
