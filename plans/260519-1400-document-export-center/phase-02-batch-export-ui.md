# Phase 02: Batch Export UI & Logic
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Tạo trang/tab chuyên biệt để In ấn hàng loạt (Nhập/Chọn nhiều trạm và tải về các file hợp đồng riêng lẻ).

## Requirements
### Functional
- [ ] Xây dựng 1 Tab/Trang mới: "Xuất Văn Bản / In Ấn".
- [ ] Component cho phép nhập danh sách `site_id` (input tag hoặc textarea). Hoặc checkbox trong danh sách trạm.
- [ ] Chọn Loại Văn Bản cần xuất (Tờ trình, Hợp đồng, Chuyển chủ thể...).
- [ ] Vòng lặp lấy data từ DB cho toàn bộ danh sách trạm đã chọn.
- [ ] Vòng lặp `generateWordDocument` để xuất file: Trả về từng file `.docx` riêng biệt (trình duyệt sẽ hỏi tải nhiều file).
- [ ] (Nâng cao) Có thể dùng thư viện `jszip` để nén tất cả các file Word vào 1 file `.zip` để tải về chỉ với 1 lượt click (nếu 10 file tải cùng lúc dễ bị trình duyệt chặn popup).

## Implementation Steps
1. [ ] Tạo file UI Component `DocumentExportCenter.jsx`.
2. [ ] Viết hàm `fetchBatchData(siteIds)` kéo thông tin từ Supabase.
3. [ ] Viết vòng lặp `for...of` gọi hàm tạo Word.
4. [ ] Xử lý ZIP file (nếu cần thiết để tránh lỗi Download multiple files).

---
End of Plan.
