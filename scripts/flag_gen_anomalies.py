"""
Script quét và gắn cờ các ca chạy máy phát điện bất thường cần phê duyệt.
Quy tắc:
1. Chạy qua đêm bắt đầu sau giờ hành chính (>= 17:00) -> Duyệt (approved).
2. Chạy qua đêm bắt đầu sớm trước giờ hành chính (< 17:00) -> Chờ duyệt (pending).
3. Chạy máy > 12h không bắt đầu trong khung giờ 5h-9h -> Chờ duyệt (pending).

Hỗ trợ:
- python scripts/flag_gen_anomalies.py --month 9 --year 2026 (Dry run)
- python scripts/flag_gen_anomalies.py --month 9 --year 2026 --apply (Cập nhật DB)
- python scripts/flag_gen_anomalies.py --fix-loai-may (Sửa 4 bản ghi loai_may trạm DNILNA01 và DNIPHO02)
"""

import os
import sys
import argparse
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

# Load environment
for env_path in ['tvt3_v2/.env', 'backend/.env']:
    if os.path.exists(env_path):
        load_dotenv(env_path)

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Lỗi: Không tìm thấy Supabase URL / KEY.")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def is_time_in_window(time_str: str, start_h: int, start_m: int, end_h: int, end_m: int) -> bool:
    try:
        parts = time_str.split(':')
        h = int(parts[0])
        m = int(parts[1]) if len(parts) > 1 else 0
        cur_min = h * 60 + m
        w_start = start_h * 60 + start_m
        w_end = end_h * 60 + end_m
        return w_start <= cur_min <= w_end
    except Exception:
        return False

def check_anomaly(log: dict) -> tuple[bool, str, str]:
    """
    Trả về: (needs_review, reason, new_status)
    """
    rd = log.get('run_details') or {}
    start_t = rd.get('gio_bat_dau') or ''
    end_t = rd.get('gio_ket_thuc') or ''
    runtime = float(rd.get('thoi_gian_hoat_dong') or rd.get('thoi_gian_chay') or 0)
    
    if not start_t or not end_t or ':' not in start_t or ':' not in end_t:
        return False, '', ''

    try:
        sh, sm = map(int, start_t.split(':')[:2])
        eh, em = map(int, end_t.split(':')[:2])
    except Exception:
        return False, '', ''

    start_min = sh * 60 + sm
    end_min = eh * 60 + em

    # 1. Phát hiện chạy qua đêm
    is_overnight = (end_min < start_min) or ('qua đêm' in (rd.get('ghi_chu') or '').lower())
    
    # 2. Bắt đầu sau giờ hành chính (>= 17:00)
    start_after_office = (sh >= 17)
    
    # 3. Bắt đầu trong khung giờ sáng 5h-9h
    start_in_morning_window = is_time_in_window(start_t, 5, 0, 9, 0)
    
    # 4. Thời lượng > 12h
    is_long_run = runtime > 12.0

    # Đánh giá quy tắc
    reasons = []

    # Quy tắc: Chạy >12h không bắt đầu trong khung 5h-9h -> Chờ duyệt
    if is_long_run and not start_in_morning_window:
        reasons.append(f"Chạy >12h ({runtime}h) không bắt đầu trong khung giờ 5h-9h (bắt đầu {start_t})")

    # Quy tắc: Chạy qua đêm
    if is_overnight:
        if not start_after_office:
            reasons.append(f"Chạy qua đêm nhưng bắt đầu sớm trước giờ HC (bắt đầu {start_t})")
        else:
            # Qua đêm bắt đầu sau giờ hành chính -> Hợp lệ (approved)
            pass

    if reasons:
        return True, " | ".join(reasons), 'pending'
    
    return False, '', 'approved'

def fix_loai_may_data(apply: bool):
    print("\n🔧 Kiểm tra và chuẩn hóa loai_may cho DNILNA01 và DNIPHO02...")
    
    # 1. Cập nhật datasites để sửa nhãn nhan_hieu cho MPD đã điều chuyển
    st_res = supabase.table('datasites').select('site_id, infrastructure_info').in_('site_id', ['DNILNA01', 'DNIPHO02']).execute()
    for st in st_res.data:
        site_id = st['site_id']
        infra = st.get('infrastructure_info') or {}
        mpds = infra.get('may_phat_dien', {}).get('mpd', [])
        changed = False
        for m in mpds:
            if m.get('nhan_hieu') == 'chuyển trạm DNDQ41':
                m['nhan_hieu'] = 'CAPO 12.5KVA (Đã chuyển DNDQ41)'
                changed = True
            elif m.get('nhan_hieu') == 'chuyển sang DNDQ25':
                m['nhan_hieu'] = 'LISTER PETTER 12.5KVA (Đã chuyển DNDQ25)'
                changed = True
        if changed:
            print(f"  📝 Datasites: Cập nhật cấu hình MPD cho trạm {site_id}")
            if apply:
                supabase.table('datasites').update({'infrastructure_info': infra}).eq('site_id', site_id).execute()

    # 2. Cập nhật các log trong generator_logs
    fixes = [
        ('30206f50-dbbe-4894-bcff-009e34a98647', 'DNILNA01', 'MLĐ KiBii', 'Xăng', 3.44),
        ('35995851-a7a3-4bbe-8192-7741713d62ab', 'DNIPHO02', 'MLĐ KYO POWER', 'Xăng', 3.15),
        ('008b028d-1426-44bd-be79-78dd7d5b3c13', 'DNIPHO02', 'MLĐ KYO POWER', 'Xăng', 3.15),
        ('27637a86-5d76-4381-a0ef-c9322241c939', 'DNIPHO02', 'MLĐ KYO POWER', 'Xăng', 3.15),
    ]

    for log_id, site, correct_model, fuel_type, quota in fixes:
        log_res = supabase.table('generator_logs').select('*').eq('gen_log_id', log_id).execute()
        if log_res.data:
            item = log_res.data[0]
            rd = item.get('run_details') or {}
            old_model = rd.get('loai_may')
            print(f"  🏷️ Log {site} ({item['date']}): '{old_model}' -> '{correct_model}' ({fuel_type}, đm {quota})")
            if apply:
                rd['loai_may'] = correct_model
                rd['nhien_lieu_loai'] = fuel_type
                rd['dinh_muc'] = quota
                rd['dinh_muc_quy_chuan'] = quota
                rd['dinh_muc_thuc_te'] = quota
                # Recalculate fuel & cost
                rt = float(rd.get('thoi_gian_hoat_dong') or 0)
                fuel_qty = round(rt * quota, 2)
                rd['nhien_lieu_tieu_hao'] = fuel_qty
                rd['nhien_lieu_tieu_hao_thuc_te'] = fuel_qty
                don_gia = float(rd.get('don_gia') or 0)
                if don_gia > 0:
                    rd['thanh_tien'] = round(fuel_qty * don_gia)
                supabase.table('generator_logs').update({'run_details': rd}).eq('gen_log_id', log_id).execute()

    print("  ✅ Chuẩn hóa loai_may hoàn tất.")

def main():
    parser = argparse.ArgumentParser(description="Quét & cập nhật trạng thái chờ duyệt cho log chạy máy bất thường.")
    parser.add_argument('--month', type=int, default=9, help="Tháng cần quét (1-12, mặc định 9)")
    parser.add_argument('--year', type=int, default=2026, help="Năm cần quét (mặc định 2026)")
    parser.add_argument('--apply', action='store_true', help="Áp dụng ghi đè trạng thái vào Supabase")
    parser.add_argument('--fix-loai-may', action='store_true', help="Sửa lỗi ghi chú điều chuyển nằm trong loai_may")
    args = parser.parse_args()

    if args.fix_loai_may:
        fix_loai_may_data(args.apply)
        if not args.apply:
            print("  ℹ️ Lưu ý: Đây là chế độ DRY-RUN. Thêm flag --apply để ghi vào Supabase.")
        return

    start_date = f"{args.year}-{args.month:02d}-01"
    last_day = 30 if args.month in [4, 6, 9, 11] else (29 if args.month == 2 else 31)
    end_date = f"{args.year}-{args.month:02d}-{last_day:02d}"

    print(f"🔍 Quét log chạy máy phát điện từ {start_date} đến {end_date}...")
    res = supabase.table('generator_logs')\
        .select('*')\
        .gte('date', start_date)\
        .lte('date', end_date)\
        .order('date', desc=False)\
        .execute()

    logs = res.data or []
    print(f"📊 Đã tải {len(logs)} bản ghi.")

    to_pending = []
    already_pending = []
    normal_approved = []

    for log in logs:
        needs_review, reason, status = check_anomaly(log)
        current_status = (log.get('run_details') or {}).get('status', 'approved')
        
        if needs_review:
            if current_status == 'pending':
                already_pending.append((log, reason))
            else:
                to_pending.append((log, reason))
        else:
            normal_approved.append(log)

    print(f"\n=======================================================")
    print(f"🎯 KẾT QUẢ PHÂN LOẠI:")
    print(f"  • Cần chuyển sang [Chờ duyệt] (pending): {len(to_pending)} bản ghi")
    print(f"  • Đã ở trạng thái [Chờ duyệt] sẵn:       {len(already_pending)} bản ghi")
    print(f"  • Đạt chuẩn [Đã duyệt] (approved):        {len(normal_approved)} bản ghi")
    print(f"=======================================================")

    if to_pending:
        print("\n📋 DANH SÁCH CÁC TRƯỜNG HỢP CẦN ĐƯA VÀO CHỜ DUYỆT:")
        for idx, (log, reason) in enumerate(to_pending, 1):
            rd = log.get('run_details') or {}
            rt = rd.get('thoi_gian_hoat_dong') or 0
            s_t = rd.get('gio_bat_dau')
            e_t = rd.get('gio_ket_thuc')
            print(f"  {idx}. [{log['site_id']}] Ngày: {log['date']} | {s_t} -> {e_t} ({rt}h)")
            print(f"     👉 Lý do: {reason}")
            print(f"     ID: {log['gen_log_id']}")

    if args.apply:
        print("\n🚀 Đang cập nhật trạng thái vào Supabase...")
        count = 0
        for log, reason in to_pending:
            rd = log.get('run_details') or {}
            rd['status'] = 'pending'
            rd['review_reason'] = reason
            rd['anomaly_flag'] = True
            
            res_up = supabase.table('generator_logs')\
                .update({'run_details': rd})\
                .eq('gen_log_id', log['gen_log_id'])\
                .execute()
            if res_up.data:
                count += 1
        print(f"✅ Đã cập nhật thành công {count} bản ghi sang trạng thái 'pending' (Chờ duyệt).")
    else:
        print("\nℹ️ [DRY RUN] Chưa có dữ liệu nào bị thay đổi. Chạy với cờ --apply để áp dụng vào Supabase.")

if __name__ == '__main__':
    main()
