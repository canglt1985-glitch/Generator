import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('tvt3_v2/.env')
supabase = create_client(os.getenv('VITE_SUPABASE_URL'), os.getenv('VITE_SUPABASE_ANON_KEY'))

# 1. Restore 3 Gia Kiem logs with corrected local Vietnam time (07:51-18:15)
gki_records = [
    {
        "gen_log_id": "700540e1-9aff-4085-8c10-23b969fa2b8b",
        "site_id": "DNIGKI02",
        "date": "2026-09-14",
        "run_details": {
            "source": "smartw",
            "status": "approved",
            "don_gia": 27540,
            "ghi_chu": "Sự cố lưới điện trung thế Gia Kiệm (07:52-18:15)",
            "dinh_muc": 3.29,
            "loai_may": "KIBII",
            "thanh_tien": 940491,
            "gio_bat_dau": "07:52",
            "gio_ket_thuc": "18:15",
            "cong_suat_may": "12",
            "nhien_lieu_loai": "Dầu",
            "smartw_alarm_id": "DNIGKI02__14/09/2026 07:52:43",
            "nhien_lieu_tieu_hao": 34.15,
            "thoi_gian_hoat_dong": 10.38
        }
    },
    {
        "gen_log_id": "ebcf924e-5c0f-4e9b-ad63-d3178a075ae2",
        "site_id": "DNIGKI03",
        "date": "2026-09-14",
        "run_details": {
            "source": "smartw",
            "status": "approved",
            "don_gia": 27540,
            "ghi_chu": "Sự cố lưới điện trung thế Gia Kiệm (07:53-18:15)",
            "dinh_muc": 3.56,
            "loai_may": "CAPO",
            "thanh_tien": 1016777,
            "gio_bat_dau": "07:53",
            "gio_ket_thuc": "18:15",
            "cong_suat_may": "12.5",
            "nhien_lieu_loai": "Dầu",
            "smartw_alarm_id": "DNIGKI03__14/09/2026 07:53:34",
            "nhien_lieu_tieu_hao": 36.92,
            "thoi_gian_hoat_dong": 10.37
        }
    },
    {
        "gen_log_id": "025fb029-060f-43af-bf74-f3040421a37d",
        "site_id": "DNIGKI04",
        "date": "2026-09-14",
        "run_details": {
            "source": "smartw",
            "status": "approved",
            "don_gia": 27540,
            "ghi_chu": "Sự cố lưới điện trung thế Gia Kiệm (07:51-18:15)",
            "dinh_muc": 2.15,
            "loai_may": "KIBII",
            "thanh_tien": 615794,
            "gio_bat_dau": "07:51",
            "gio_ket_thuc": "18:15",
            "cong_suat_may": "6",
            "nhien_lieu_loai": "Dầu",
            "smartw_alarm_id": "DNIGKI04__14/09/2026 07:51:43",
            "nhien_lieu_tieu_hao": 22.36,
            "thoi_gian_hoat_dong": 10.40
        }
    }
]

print("Bắt đầu khôi phục 3 ca Gia Kiệm vào generator_logs...")
for rec in gki_records:
    res = supabase.table('generator_logs').upsert(rec).execute()
    print(f"  ✅ Đã khôi phục {rec['site_id']} ({rec['run_details']['gio_bat_dau']} - {rec['run_details']['gio_ket_thuc']})")

# 2. Update DNITNH02 on 14/09 to correct local time (07:07 - 17:00)
tnh02_res = supabase.table('generator_logs').select('*').eq('site_id', 'DNITNH02').eq('date', '2026-09-14').execute()
if tnh02_res.data:
    tnh02_log = tnh02_res.data[0]
    rd = tnh02_log.get('run_details') or {}
    rd['gio_bat_dau'] = '07:07'
    rd['gio_ket_thuc'] = '17:00'
    rd['thoi_gian_hoat_dong'] = 9.88
    rd['nhien_lieu_tieu_hao'] = round(9.88 * float(rd.get('dinh_muc', 4.27)), 2)
    rd['thanh_tien'] = int(round(rd['nhien_lieu_tieu_hao'] * float(rd.get('don_gia', 27540))))
    rd['ghi_chu'] = 'Lịch EVN Thống Nhất 07:00-17:00'
    upd = supabase.table('generator_logs').update({'run_details': rd}).eq('gen_log_id', tnh02_log['gen_log_id']).execute()
    print("  ✅ Đã cập nhật DNITNH02 về giờ Việt Nam: 07:07 - 17:00 (khớp lịch EVN)")

# 3. Update backup file: remove GKI from deleted list
backup_path = 'scratch/backup_deleted_gen_logs_20260928.json'
with open(backup_path, 'r', encoding='utf-8') as f:
    deleted = json.load(f)

gki_ids = set(r['gen_log_id'] for r in gki_records)
remaining_deleted = [d for d in deleted if d['gen_log_id'] not in gki_ids]
with open(backup_path, 'w', encoding='utf-8') as f:
    json.dump(remaining_deleted, f, ensure_ascii=False, indent=2)

print(f"✅ Đã cập nhật backup_deleted_gen_logs: Còn lại {len(remaining_deleted)} ca đã xóa.")
