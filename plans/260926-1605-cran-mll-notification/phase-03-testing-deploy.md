# Phase 03: Testing, Verification & Production Deployment
Status: ⬜ Pending
Dependencies: Phase 01, Phase 02

## Objective
Kiểm thử toàn diện luồng tin nhắn và giao diện Web, sau đó triển khai lên môi trường Production (Vercel + Daemon Worker).

## Requirements
- [ ] Chạy kiểm thử tự động format tin nhắn cho cả 4 kịch bản (Trạm Main, Trạm CRAN kèm đối tác, Trạm thường kèm đối tác, Trạm Local).
- [ ] Chạy build frontend `npm run build` đảm bảo không có lỗi lint/compile.
- [ ] Deploy frontend lên Vercel (`vercel --prod`).
- [ ] Restart worker nền (`run_workers.py`) để áp dụng format tin nhắn mới.
- [ ] Dùng `browser_subagent` chụp ảnh màn hình xác nhận giao diện Desktop và Mobile trên URL thật.
- [ ] Commit và push git repository.
