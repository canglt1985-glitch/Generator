import os
import json
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

# 1. Khởi tạo kết nối Supabase
load_dotenv('tvt3_v2/.env')
url = os.getenv('VITE_SUPABASE_URL')
key = os.getenv('VITE_SUPABASE_ANON_KEY')

if not url or not key:
    raise ValueError("Thiếu biến môi trường Supabase trong tvt3_v2/.env")

supabase = create_client(url, key)
print("🚀 Bắt đầu cập nhật điều chuyển máy phát điện & gán máy xăng lưu động...")

# 2. Tải toàn bộ datasites và Sao lưu (Backup) an toàn
res = supabase.table('datasites').select('*').execute()
all_datasites = res.data or []
backup_file = f"/Users/cang_it/Antigravity/TVT3/scratch/backup_datasites_before_transfer_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
os.makedirs(os.path.dirname(backup_file), exist_ok=True)
with open(backup_file, 'w', encoding='utf-8') as f:
    json.dump(all_datasites, f, ensure_ascii=False, indent=2, default=str)
print(f"💾 Đã sao lưu an toàn {len(all_datasites)} trạm tại: {backup_file}")

site_map = {s['site_id']: s for s in all_datasites if s.get('site_id')}

# 3. Cấu hình 8 trạm điều chuyển máy đi -> Gán máy xăng lưu động
# Quy tắc gán theo yêu cầu: Cấu hình nặng 3G/4G/5G dùng máy lớn 6.0 - 7.0 KVA, cấu hình thường dùng 5.5 KVA
source_transfers = [
    {
        'site_id': 'DNIPHO05', # DNTP08 (Phú Hòa 5)
        'transfer_date': '2025-09-25',
        'dest_site_id': 'DNITPU12',
        'dest_name': 'Tân Phú 12 (DNTP30)',
        'tech_desc': '3G/4G/5G (AIR2600 32T32R)',
        'mobile_generator': {
            'ten': 'MÁY NỔ XĂNG LƯU ĐỘNG',
            'nhan_hieu': 'MLĐ KYO POWER',
            'cong_suat': '7',
            'dinh_muc': 4.02,
            'dinh_muc_thuc_te': 4.02,
            'dinh_muc_quy_chuan': 4.02,
            'nhien_lieu': 'Xăng',
            'loai_lap_dat': 'Lưu động',
            'tinh_trang': 'Hoạt động',
            'ngay_bat_dau': '2025-09-25',
            'ghi_chu': 'Máy nổ xăng lưu động 7KVA thay thế máy dầu chuyển đi (Trạm 3G/4G/5G)'
        }
    },
    {
        'site_id': 'DNIBVI04', # DNLK27 (Bảo Vinh 4)
        'transfer_date': '2025-08-08',
        'dest_site_id': 'DNIXHO13',
        'dest_name': 'Xuân Hòa 13 (DNXL49)',
        'tech_desc': '3G/4G/5G (AIR2600 32T32R)',
        'mobile_generator': {
            'ten': 'MÁY NỔ XĂNG LƯU ĐỘNG',
            'nhan_hieu': 'MLĐ KiBii',
            'cong_suat': '6',
            'dinh_muc': 3.44,
            'dinh_muc_thuc_te': 3.44,
            'dinh_muc_quy_chuan': 3.44,
            'nhien_lieu': 'Xăng',
            'loai_lap_dat': 'Lưu động',
            'tinh_trang': 'Hoạt động',
            'ngay_bat_dau': '2025-08-08',
            'ghi_chu': 'Máy nổ xăng lưu động 6KVA thay thế máy dầu chuyển đi (Trạm 3G/4G/5G)'
        }
    },
    {
        'site_id': 'DNILNA01', # DNDQ05 (La Ngà 1)
        'transfer_date': '2025-09-17',
        'dest_site_id': 'DNITNS02',
        'dest_name': 'Thanh Sơn 2 (DNDQ41)',
        'tech_desc': '3G/4G (4 Sectors tải nặng)',
        'mobile_generator': {
            'ten': 'MÁY NỔ XĂNG LƯU ĐỘNG',
            'nhan_hieu': 'MLĐ KiBii',
            'cong_suat': '6',
            'dinh_muc': 3.44,
            'dinh_muc_thuc_te': 3.44,
            'dinh_muc_quy_chuan': 3.44,
            'nhien_lieu': 'Xăng',
            'loai_lap_dat': 'Lưu động',
            'tinh_trang': 'Hoạt động',
            'ngay_bat_dau': '2025-09-17',
            'ghi_chu': 'Máy nổ xăng lưu động 6KVA thay thế máy dầu chuyển đi (Trạm 4 Sector)'
        }
    },
    {
        'site_id': 'DNIBVI14', # DNLK42 (Bảo Vinh 14)
        'transfer_date': '2025-06-05',
        'dest_site_id': 'DNIXLO27',
        'dest_name': 'Xuân Lộc 27 (DNXL77)',
        'tech_desc': '3G/4G Tiêu chuẩn',
        'mobile_generator': {
            'ten': 'MÁY NỔ XĂNG LƯU ĐỘNG',
            'nhan_hieu': 'MLĐ KYO POWER',
            'cong_suat': '5.5',
            'dinh_muc': 3.15,
            'dinh_muc_thuc_te': 3.15,
            'dinh_muc_quy_chuan': 3.15,
            'nhien_lieu': 'Xăng',
            'loai_lap_dat': 'Lưu động',
            'tinh_trang': 'Hoạt động',
            'ngay_bat_dau': '2025-06-05',
            'ghi_chu': 'Máy nổ xăng lưu động 5.5KVA thay thế máy dầu chuyển đi'
        }
    },
    {
        'site_id': 'DNILNA07', # DNDQ51 (La Ngà 7)
        'transfer_date': '2025-09-18',
        'dest_site_id': 'DNILNA05',
        'dest_name': 'La Ngà 5 (DNDQ31)',
        'tech_desc': '3G/4G Tiêu chuẩn',
        'mobile_generator': {
            'ten': 'MÁY NỔ XĂNG LƯU ĐỘNG',
            'nhan_hieu': 'MLĐ ECOs',
            'cong_suat': '5.5',
            'dinh_muc': 3.15,
            'dinh_muc_thuc_te': 3.15,
            'dinh_muc_quy_chuan': 3.15,
            'nhien_lieu': 'Xăng',
            'loai_lap_dat': 'Lưu động',
            'tinh_trang': 'Hoạt động',
            'ngay_bat_dau': '2025-09-18',
            'ghi_chu': 'Máy nổ xăng lưu động 5.5KVA thay thế máy dầu chuyển đi'
        }
    },
    {
        'site_id': 'DNIPHO02', # DNDQ23 (Phú Hòa 2)
        'transfer_date': '2025-09-11',
        'dest_site_id': 'DNIPVI03',
        'dest_name': 'Phú Vinh 3 (DNDQ25)',
        'tech_desc': '3G/4G Tiêu chuẩn',
        'mobile_generator': {
            'ten': 'MÁY NỔ XĂNG LƯU ĐỘNG',
            'nhan_hieu': 'MLĐ KYO POWER',
            'cong_suat': '5.5',
            'dinh_muc': 3.15,
            'dinh_muc_thuc_te': 3.15,
            'dinh_muc_quy_chuan': 3.15,
            'nhien_lieu': 'Xăng',
            'loai_lap_dat': 'Lưu động',
            'tinh_trang': 'Hoạt động',
            'ngay_bat_dau': '2025-09-11',
            'ghi_chu': 'Máy nổ xăng lưu động 5.5KVA thay thế máy dầu chuyển đi'
        }
    },
    {
        'site_id': 'DNISRA02', # DNCM23 (Sông Ray 2)
        'transfer_date': '2025-08-14',
        'dest_site_id': 'DNIXQU01',
        'dest_name': 'Xuân Quế 1 (DNCM15)',
        'tech_desc': '3G/4G Tiêu chuẩn',
        'mobile_generator': {
            'ten': 'MÁY NỔ XĂNG LƯU ĐỘNG',
            'nhan_hieu': 'MLĐ KYO POWER',
            'cong_suat': '5.5',
            'dinh_muc': 3.15,
            'dinh_muc_thuc_te': 3.15,
            'dinh_muc_quy_chuan': 3.15,
            'nhien_lieu': 'Xăng',
            'loai_lap_dat': 'Lưu động',
            'tinh_trang': 'Hoạt động',
            'ngay_bat_dau': '2025-08-14',
            'ghi_chu': 'Máy nổ xăng lưu động 5.5KVA thay thế máy dầu chuyển đi'
        }
    },
    {
        'site_id': 'DNIXLA01', # DNLK14 (Xuân Lập 1)
        'transfer_date': '2025-08-08',
        'dest_site_id': 'DNIBLC07',
        'dest_name': 'Bình Lộc 7 (DNLK37)',
        'tech_desc': '3G/4G Tiêu chuẩn',
        'mobile_generator': {
            'ten': 'MÁY NỔ XĂNG LƯU ĐỘNG',
            'nhan_hieu': 'MLĐ KYO POWER',
            'cong_suat': '5.5',
            'dinh_muc': 3.15,
            'dinh_muc_thuc_te': 3.15,
            'dinh_muc_quy_chuan': 3.15,
            'nhien_lieu': 'Xăng',
            'loai_lap_dat': 'Lưu động',
            'tinh_trang': 'Hoạt động',
            'ngay_bat_dau': '2025-08-08',
            'ghi_chu': 'Máy nổ xăng lưu động 5.5KVA thay thế máy dầu chuyển đi'
        }
    }
]

print("\n--- 1. CẬP NHẬT 8 TRẠM CHUYỂN MÁY ĐI (GÁN MÁY XĂNG LƯU ĐỘNG) ---")
for t in source_transfers:
    sid = t['site_id']
    st = site_map.get(sid)
    if not st:
        print(f"❌ Không tìm thấy trạm {sid}")
        continue
    
    infra = dict(st.get('infrastructure_info') or {})
    mpd_obj = dict(infra.get('may_phat_dien') or {})
    current_mpds = list(mpd_obj.get('mpd') or [])
    
    # 1. Đóng ngày kết thúc máy cũ
    for m in current_mpds:
        if m.get('loai_lap_dat') != 'Lưu động' and m.get('nhien_lieu') != 'Xăng':
            m['tinh_trang'] = 'ĐÃ ĐIỀU CHUYỂN'
            m['ngay_ket_thuc'] = t['transfer_date']
            m['ghi_chu'] = f"Đã điều chuyển sang trạm {t['dest_name']} ngày {t['transfer_date']}"
    
    # 2. Bổ sung hoặc cập nhật máy xăng lưu động
    # Kiểm tra xem đã có máy lưu động chưa
    has_mobile = False
    for idx, m in enumerate(current_mpds):
        if m.get('loai_lap_dat') == 'Lưu động' or m.get('nhien_lieu') == 'Xăng':
            current_mpds[idx] = t['mobile_generator']
            has_mobile = True
            break
    if not has_mobile:
        current_mpds.append(t['mobile_generator'])
    
    mpd_obj['mpd'] = current_mpds
    infra['may_phat_dien'] = mpd_obj
    
    # Cập nhật Supabase
    up_res = supabase.table('datasites').update({'infrastructure_info': infra}).eq('site_id', sid).execute()
    gen = t['mobile_generator']
    print(f"✅ {sid} ({st.get('name')}): Gán {gen['nhan_hieu']} ({gen['cong_suat']} KVA, Định mức {gen['dinh_muc']} L/h Xăng) - Cấu hình: {t['tech_desc']}")

# 4. Cập nhật các trạm nhận máy cố định
destination_updates = [
    {
        'site_id': 'DNITPU12', # DNTP30
        'date': '2025-09-25',
        'source_site': 'Phú Hòa 5 (DNTP08)',
        'dinh_muc': 3.56,
        'dinh_muc_thuc_te': 2.7,
        'cong_suat': '12.5',
        'nhan_hieu': 'VIETGEN',
        'nhien_lieu': 'Dầu'
    },
    {
        'site_id': 'DNIDQU21', # DNDQ58
        'date': '2025-09-18',
        'source_site': 'La Ngà 5 (DNDQ31)',
        'dinh_muc': 3.05,
        'dinh_muc_thuc_te': 1.93,
        'cong_suat': '8.5',
        'nhan_hieu': 'SBM',
        'nhien_lieu': 'Dầu'
    },
    {
        'site_id': 'DNITNS02', # DNDQ41
        'date': '2025-09-17',
        'source_site': 'La Ngà 1 (DNDQ05)',
        'dinh_muc': 3.56,
        'dinh_muc_thuc_te': 2.7,
        'cong_suat': '12.5',
        'nhan_hieu': 'CAPO',
        'nhien_lieu': 'Dầu'
    },
    {
        'site_id': 'DNIPVI03', # DNDQ25
        'date': '2025-09-11',
        'source_site': 'Phú Hòa 2 (DNDQ23)',
        'dinh_muc': 2.75,
        'dinh_muc_thuc_te': 2.7,
        'cong_suat': '12.5',
        'nhan_hieu': 'LISTER PETTER',
        'nhien_lieu': 'Dầu'
    },
    {
        'site_id': 'DNIXQU01', # DNCM15
        'date': '2025-08-14',
        'source_site': 'Sông Ray 2 (DNCM23)',
        'dinh_muc': 3.56,
        'dinh_muc_thuc_te': 2.7,
        'cong_suat': '12.5',
        'nhan_hieu': 'VIETGEN',
        'nhien_lieu': 'Dầu'
    },
    {
        'site_id': 'DNIXHO13', # DNXL49
        'date': '2025-08-08',
        'source_site': 'Bảo Vinh 4 (DNLK27)',
        'dinh_muc': 2.55,
        'dinh_muc_thuc_te': 1.93,
        'cong_suat': '8.5',
        'nhan_hieu': 'VIETGEN',
        'nhien_lieu': 'Dầu'
    },
    {
        'site_id': 'DNIBLC07', # DNLK37
        'date': '2025-08-08',
        'source_site': 'Xuân Lập 1 (DNLK14)',
        'dinh_muc': 2.51,
        'dinh_muc_thuc_te': 1.93,
        'cong_suat': '8.5',
        'nhan_hieu': 'KIBII',
        'nhien_lieu': 'Dầu'
    }
]

print("\n--- 2. CẬP NHẬT 7 TRẠM ĐÍCH (TIẾP NHẬN MÁY DẦU CỐ ĐỊNH) ---")
for d in destination_updates:
    sid = d['site_id']
    st = site_map.get(sid)
    if not st:
        print(f"❌ Không tìm thấy trạm {sid}")
        continue
    
    infra = dict(st.get('infrastructure_info') or {})
    mpd_obj = dict(infra.get('may_phat_dien') or {})
    current_mpds = list(mpd_obj.get('mpd') or [])
    
    if current_mpds:
        m = current_mpds[0]
        m['ngay_bat_dau'] = d['date']
        m['tinh_trang'] = 'Hoạt động'
        m['loai_lap_dat'] = 'Cố định'
        m['dinh_muc'] = d['dinh_muc']
        m['dinh_muc_thuc_te'] = d['dinh_muc_thuc_te']
        m['dinh_muc_quy_chuan'] = d['dinh_muc']
        m['nhan_hieu'] = d['nhan_hieu']
        m['cong_suat'] = d['cong_suat']
        m['nhien_lieu'] = d['nhien_lieu']
        m['ghi_chu'] = f"Tiếp nhận máy từ {d['source_site']} ngày {d['date']}"
    else:
        current_mpds.append({
            'ten': f"MÁY PHÁT ĐIỆN {d['nhan_hieu']} {d['cong_suat']}KVA",
            'nhan_hieu': d['nhan_hieu'],
            'cong_suat': d['cong_suat'],
            'dinh_muc': d['dinh_muc'],
            'dinh_muc_thuc_te': d['dinh_muc_thuc_te'],
            'dinh_muc_quy_chuan': d['dinh_muc'],
            'nhien_lieu': d['nhien_lieu'],
            'loai_lap_dat': 'Cố định',
            'tinh_trang': 'Hoạt động',
            'ngay_bat_dau': d['date'],
            'ghi_chu': f"Tiếp nhận máy từ {d['source_site']} ngày {d['date']}"
        })
    
    mpd_obj['mpd'] = current_mpds
    infra['may_phat_dien'] = mpd_obj
    supabase.table('datasites').update({'infrastructure_info': infra}).eq('site_id', sid).execute()
    print(f"✅ {sid} ({st.get('name')}): Tiếp nhận {d['nhan_hieu']} ({d['cong_suat']}KVA, ĐM {d['dinh_muc']}L/h Dầu) từ {d['source_site']}")

# 5. Cập nhật 2 trạm hoán đổi
print("\n--- 3. CẬP NHẬT 2 TRẠM HOÁN ĐỔI / THAY THẾ ---")
# 5.1. DNDQ31 (DNILNA05 - La Ngà 5)
st_lna5 = site_map.get('DNILNA05')
if st_lna5:
    infra = dict(st_lna5.get('infrastructure_info') or {})
    mpd_obj = dict(infra.get('may_phat_dien') or {})
    mpd_obj['mpd'] = [
        {
            'ten': 'MÁY PHÁT ĐIỆN SBM 8.5KVA',
            'nhan_hieu': 'SBM',
            'cong_suat': '8.5',
            'dinh_muc': 3.05,
            'dinh_muc_thuc_te': 1.93,
            'nhien_lieu': 'Dầu',
            'loai_lap_dat': 'Cố định',
            'tinh_trang': 'ĐÃ ĐIỀU CHUYỂN',
            'ngay_ket_thuc': '2025-09-18',
            'ghi_chu': 'Đã điều chuyển sang trạm Định Quán 21 (DNDQ58) ngày 18/09/2025'
        },
        {
            'ten': 'MÁY PHÁT ĐIỆN KIBII 12KVA',
            'nhan_hieu': 'KIBII',
            'cong_suat': '12',
            'dinh_muc': 3.29,
            'dinh_muc_thuc_te': 2.59,
            'dinh_muc_quy_chuan': 3.29,
            'serial': 'E1512304149',
            'nhien_lieu': 'Dầu',
            'loai_lap_dat': 'Cố định',
            'tinh_trang': 'Hoạt động',
            'ngay_bat_dau': '2025-09-18',
            'ghi_chu': 'Tiếp nhận máy từ La Ngà 7 (DNDQ51) ngày 18/09/2025'
        }
    ]
    infra['may_phat_dien'] = mpd_obj
    supabase.table('datasites').update({'infrastructure_info': infra}).eq('site_id', 'DNILNA05').execute()
    print("✅ DNILNA05 (La Ngà 5): Hoán đổi SBM 8.5KVA -> Nhận KIBII 12KVA (ĐM 3.29 L/h)")

# 5.2. DNXL77 (DNIXLO27 - Xuân Lộc 27)
st_xlo27 = site_map.get('DNIXLO27')
if st_xlo27:
    infra = dict(st_xlo27.get('infrastructure_info') or {})
    mpd_obj = dict(infra.get('may_phat_dien') or {})
    mpd_obj['mpd'] = [
        {
            'ten': 'MÁY PHÁT ĐIỆN CŨ',
            'nhan_hieu': 'SBM',
            'cong_suat': '8.5',
            'dinh_muc': 2.55,
            'nhien_lieu': 'Dầu',
            'loai_lap_dat': 'Cố định',
            'tinh_trang': 'ĐÃ ĐIỀU CHUYỂN',
            'ngay_ket_thuc': '2025-05-12',
            'ghi_chu': 'Chuyển về Kho LONG_KHANH ngày 12/05/2025'
        },
        {
            'ten': 'MÁY PHÁT ĐIỆN SBM 8.5KVA',
            'nhan_hieu': 'SBM',
            'cong_suat': '8.5',
            'dinh_muc': 2.55,
            'dinh_muc_thuc_te': 1.93,
            'dinh_muc_quy_chuan': 2.55,
            'serial': '09412',
            'nhien_lieu': 'Dầu',
            'loai_lap_dat': 'Cố định',
            'tinh_trang': 'Hoạt động',
            'ngay_bat_dau': '2025-06-05',
            'ghi_chu': 'Tiếp nhận máy từ Bảo Vinh 14 (DNLK42) ngày 05/06/2025'
        }
    ]
    infra['may_phat_dien'] = mpd_obj
    supabase.table('datasites').update({'infrastructure_info': infra}).eq('site_id', 'DNIXLO27').execute()
    print("✅ DNIXLO27 (Xuân Lộc 27): Trả máy kho (12/05/2025) -> Nhận SBM 8.5KVA từ DNLK42 (05/06/2025)")

print("\n🎉 HOÀN TẤT CẬP NHẬT DỮ LIỆU ĐIỀU CHUYỂN VÀ GÁN MÁY XĂNG LƯU ĐỘNG THÀNH CÔNG!")
