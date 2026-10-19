# Plan: Engine đàm phán giá / chạy số cho Quản lý hợp đồng (hướng A – JS)

Created: 2026-10-19 17:15
Status: 🟢 Phase 01-04 xong (cần xác nhận key VHKT + thử trên dữ liệu thật)

## Dựa trên chỉ đạo của anh Cương
- Chỉ áp cho module **Quản lý hợp đồng hiện hữu** (`datasites`, 412 trạm): phụ lục giảm giá, gia hạn, thanh lý ký lại, đổi chủ thể.
- Dự án CSHT (`infrastructure_projects`) = **ký hợp đồng mới**, không dùng chữ "thanh lý ký lại".
- Hướng **A**: port logic từ repo `scratch/hop-dong-nha-tram-TVT3` sang JS trong `tvt3_v2`, không dựng FastAPI.
- Ngày lẻ tính theo **số ngày thực của tháng**.
- **Bỏ làm tròn 50k**; giá chốt là số chính xác.
- Chiều cao cột 42m/28m chỉ cho trạm trong danh sách; không gõ cứng vào Word, lấy từ dữ liệu trạm.
- Trình bày giảm trừ: **cách A** – giữ template hiện tại, cột "Giảm trừ dùng chung" riêng, không sửa template.

## Quy tắc chia giá chốt (đã chốt)
Khung = MB + PM + MFĐ + Cột + VHKT + Giảm trừ (mặc định −20% cột khung).
- **Vượt khung:** PM, MFĐ, VHKT, Cột(net) giữ đủ; **Mặt bằng = chốt − (PM+MFĐ+VHKT+Cột_net)**.
- **Dưới khung:** MB, PM, MFĐ, VHKT giữ đủ; giảm trừ giữ nguyên khung (vd −314.000); **Cột = chốt − (MB+PM+MFĐ+VHKT)**.
- Cột về 0 vẫn thiếu / không có Cột: Cột = 0, phần thiếu trừ tiếp vào MB + cảnh báo vàng.
- Trạm mặt bằng (`*_MAT_BANG`): MB = chốt − VHKT.
- Ví dụ test DNTP31: MB 2.400.000, PM 400.000, MFĐ 300.000, Cột 1.570.000, GT −314.000
  - chốt 4.350.000 → giá thuê Cột **1.250.000**, TL cột −0,48%, tổng −0,14%.
  - chốt 4.600.000 → MB **2.644.000**.

## Phases
| Phase | Nội dung | File |
|---|---|---|
| 01 | Bóc tách giá chốt (`priceBreakdown.js`) + test | [phase-01-price-breakdown.md](phase-01-price-breakdown.md) |
| 02 | Chu kỳ thanh toán + khấu trừ | [phase-02-cycles-deduction.md](phase-02-cycles-deduction.md) |
| 03 | Kịch bản xuất phụ lục → template | [phase-03-scenarios.md](phase-03-scenarios.md) |
| 04 | Nối UI + lưu `contract_info.negotiation` | [phase-04-ui-integration.md](phase-04-ui-integration.md) |
| 05 | Test tổng, lint/build, báo cáo chênh lệch | [phase-05-verify.md](phase-05-verify.md) |

## Quyết định đã chốt (19/10)
1. **Làm tròn từng kỳ:** tròn đến **đồng** (khớp Python/Word) ✅
2. **Chiều cao cột 42m/28m:** **không áp đặt**, tuỳ từng trạm (lấy từ dữ liệu trạm; không dùng `SITES_4_PACKAGES`) ✅
3. **Bỏ quy tắc cũ** của `generatePaymentSchedule` (cứng 6 tháng, tự +5 năm nếu hết hạn <01/07/2026). Engine mới chỉ **canh kỳ lệch ngày về cuối tháng** để các kỳ sau tròn tháng theo chu kỳ của trạm ✅
   - Các nơi đang gọi hàm cũ sẽ chuyển sang engine mới ở Phase 04.

## Rủi ro
- Không đổi hồ sơ đã ký; công thức mới chỉ áp cho lần xuất mới.
- Khấu trừ Python dùng /30, bản mới dùng ngày thực → chênh vài đồng, ghi rõ trong báo cáo.
- Mốc `01/10/2025` đang gõ cứng nhiều nơi → gom vào hằng số.

## Quick Commands
- `/code phase-01` – bắt đầu
- `/next` – gợi ý bước tiếp
- `/save-brain` – lưu kiến thức
