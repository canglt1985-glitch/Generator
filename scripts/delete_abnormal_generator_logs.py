import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('tvt3_v2/.env')
supabase = create_client(os.getenv('VITE_SUPABASE_URL'), os.getenv('VITE_SUPABASE_ANON_KEY'))

target_ids = [
    # Nhóm 1 (>10h không EVN, except DNIXHO03)
    'e588c242-9cfa-426c-bbf9-f011efeb6cc2', # DNIXBA09 17.57h
    '0d4731b0-7342-4297-bdaa-5db760e64f3a', # DNIXTC06 14.57h
    '810e30ea-a6dd-46e1-af2f-8b47d72a8039', # DNIXDU03 12.80h (Nhóm 1 & 4)
    '0c5cde54-3aa3-487c-b3a9-1ffdab3eb528', # DNIXHO02 12.25h
    '9379b912-e5e3-4a79-87e5-2df459a7284d', # DNIXDI03 11.23h
    '620dedcd-f402-4c77-b0d9-bad7d180b81d', # DNITNH04 10.95h
    'b1e17c79-a32f-4e08-aaee-e5828186181a', # DNIDQU02 10.45h
    '025fb029-060f-43af-bf74-f3040421a37d', # DNIGKI04 10.38h
    '700540e1-9aff-4085-8c10-23b969fa2b8b', # DNIGKI02 10.37h
    'ebcf924e-5c0f-4e9b-ad63-d3178a075ae2', # DNIGKI03 10.35h
    'b8498812-2d09-4209-9d04-377fa0cd75df', # DNITNH01 10.35h
    
    # Nhóm 3 (< 15 mins)
    '2482e4a3-dc0a-497c-9fc3-0755ed3e91d7', # DNIXHO01 0.17h
    'd4164a81-17c4-405d-80f2-8a59066bc3d0', # DNIGKI07 0.17h
    '6e6b356d-7cd4-4121-b650-2cb919774667', # DNITNS01 0.18h
    'faa70376-dbcb-4339-8b1d-d7a21e98ccc9', # DNIXDI03 0.20h
    '10d6e2e0-3882-4cb1-ba80-f9116fe8f9f8', # DNIXTC03 0.20h
    'ac865ada-1961-4aa9-be27-0f820854456a', # DNIXDI04 0.23h
]

print(f"Bắt đầu sao lưu và xóa {len(target_ids)} ca bất thường...")

# 1. Fetch & Backup
backup_records = []
for tid in target_ids:
    res = supabase.table('generator_logs').select('*').eq('gen_log_id', tid).execute()
    if res.data:
        backup_records.append(res.data[0])

backup_path = 'scratch/backup_deleted_gen_logs_20260928.json'
with open(backup_path, 'w', encoding='utf-8') as f:
    json.dump(backup_records, f, ensure_ascii=False, indent=2)

print(f"✅ Đã sao lưu an toàn {len(backup_records)} bản ghi vào: {backup_path}")

# 2. Delete
deleted_count = 0
for tid in target_ids:
    del_res = supabase.table('generator_logs').delete().eq('gen_log_id', tid).execute()
    deleted_count += 1
    print(f"  - Đã xóa gen_log_id: {tid}")

print(f"✅ Đã xóa thành công {deleted_count} ca bất thường khỏi generator_logs!")
