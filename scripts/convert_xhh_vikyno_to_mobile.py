#!/usr/bin/env python3
"""
Script chuẩn hóa chuyển đổi máy phát điện VIKYNO XHH không còn thuê sang máy lưu động.
- Ngoại trừ 11 trạm Seath Group vẫn giữ máy phát điện cố định.
- Trạm có 5G -> gán MLĐ 7KVA (MLĐ KYO POWER, 7.0kVA, ĐM 4.02 L/h, Xăng)
- Trạm Macro -> gán MLĐ 6KVA (MLĐ KiBii, 6.0kVA, ĐM 3.44 L/h, Xăng)
- Trạm CRAN Outdoor -> gán MLĐ 5.5KVA (MLĐ KYO POWER, 5.5kVA, ĐM 3.15 L/h, Xăng)
- Cập nhật datasites và rà soát chuẩn hóa hồ sơ generator_logs Tháng 8 & Tháng 9.
"""

import os
import json
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('tvt3_v2/.env')
url = os.getenv('VITE_SUPABASE_URL')
key = os.getenv('VITE_SUPABASE_ANON_KEY')

if not url or not key:
    raise ValueError("Thiếu cấu hình Supabase URL / KEY")

supabase = create_client(url, key)

# 11 trạm Seath Group giữ nguyên máy cố định
SEATH_GROUP_SITES = {
    'DNCM05': 'DNIXDO02', 'DNDQ09': 'DNIPHO01', 'DNDQ12': 'DNILNA02',
    'DNDQ13': 'DNILNA03', 'DNDQ14': 'DNILNA04', 'DNTN07': 'DNIDGI05',
    'DNTP11': 'DNITPU03', 'DNTP12': 'DNITLA03', 'DNTP13': 'DNITPU04',
    'DNXL28': 'DNIXHO08', 'DNXL31': 'DNIXBA07'
}
SEATH_ALL_CODES = set(SEATH_GROUP_SITES.keys()) | set(SEATH_GROUP_SITES.values())

# Cấu hình phân loại 17 trạm Non-Seath VIKYNO
# Rule:
# 1. Có 5G -> 7.0 kVA, 4.02 L/h, MLĐ KYO POWER
# 2. Macro -> 6.0 kVA, 3.44 L/h, MLĐ KiBii
# 3. CRAN Outdoor -> 5.5 kVA, 3.15 L/h, MLĐ KYO POWER
STATION_CONVERSIONS = {
    # 5G
    'DNIXLO05': {'type': '5G', 'kva': '7', 'brand': 'MLĐ KYO POWER', 'quota': 4.02, 'name': 'Xuân Lộc 5 (DNXL13)'},
    'DNIDGI04': {'type': '5G', 'kva': '7', 'brand': 'MLĐ KYO POWER', 'quota': 4.02, 'name': 'Dầu Giây 4 (DNTN04)'},

    # CRAN Outdoor
    'DNIDQU06': {'type': 'CRAN Outdoor', 'kva': '5.5', 'brand': 'MLĐ KYO POWER', 'quota': 3.15, 'name': 'Định Quán 6 (DNDQ18)'},
    'DNIDQU07': {'type': 'CRAN Outdoor', 'kva': '5.5', 'brand': 'MLĐ KYO POWER', 'quota': 3.15, 'name': 'Định Quán 7 (DNDQ19)'},
    'DNICMY01': {'type': 'CRAN Outdoor', 'kva': '5.5', 'brand': 'MLĐ KYO POWER', 'quota': 3.15, 'name': 'Cẩm Mỹ 1 (DNCM04)'},
    'DNITLA04': {'type': 'CRAN Outdoor', 'kva': '5.5', 'brand': 'MLĐ KYO POWER', 'quota': 3.15, 'name': 'Tà Lài 4 (DNTP15)'},
    'DNITPU05': {'type': 'CRAN Outdoor', 'kva': '5.5', 'brand': 'MLĐ KYO POWER', 'quota': 3.15, 'name': 'Tân Phú 5 (DNTP16)'},
    'DNIBLC14': {'type': 'CRAN Outdoor', 'kva': '5.5', 'brand': 'MLĐ KYO POWER', 'quota': 3.15, 'name': 'Bình Lộc 14 (DNLKI0)'},

    # Macro
    'DNINCT01': {'type': 'Macro', 'kva': '6', 'brand': 'MLĐ KiBii', 'quota': 3.44, 'name': 'Nam Cát Tiên 1 (DNTP22)'},
    'DNITPU07': {'type': 'Macro', 'kva': '6', 'brand': 'MLĐ KiBii', 'quota': 3.44, 'name': 'Tân Phú 7 (DNTP19)'},
    'DNITPU06': {'type': 'Macro', 'kva': '6', 'brand': 'MLĐ KiBii', 'quota': 3.44, 'name': 'Tân Phú 6 (DNTP17)'},
    'DNIPLA04': {'type': 'Macro', 'kva': '6', 'brand': 'MLĐ KiBii', 'quota': 3.44, 'name': 'Phú Lâm 4 (DNTP18)'},
    'DNIXLO07': {'type': 'Macro', 'kva': '6', 'brand': 'MLĐ KiBii', 'quota': 3.44, 'name': 'Xuân Lộc 7 (DNXL15)'},
    'DNIPLA05': {'type': 'Macro', 'kva': '6', 'brand': 'MLĐ KiBii', 'quota': 3.44, 'name': 'Phú Lâm 5 (DNTP20)'},
    'DNIXHO05': {'type': 'Macro', 'kva': '6', 'brand': 'MLĐ KiBii', 'quota': 3.44, 'name': 'Xuân Hòa 5 (DNXL22)'},
    'DNILKH01': {'type': 'Macro', 'kva': '6', 'brand': 'MLĐ KiBii', 'quota': 3.44, 'name': 'Long Khánh 1 (DNLK07)'},
    'DNILKH02': {'type': 'Macro', 'kva': '6', 'brand': 'MLĐ KiBii', 'quota': 3.44, 'name': 'Long Khánh 2 (DNLK08)'},
}

def update_datasites():
    print("\n--- 1. CẬP NHẬT DATASITES CHO 17 TRẠM NON-SEATH ---")
    res = supabase.table('datasites').select('*').in_('site_id', list(STATION_CONVERSIONS.keys())).execute()
    sites = res.data or []

    for s in sites:
        sid = s['site_id']
        conf = STATION_CONVERSIONS[sid]
        infra = dict(s.get('infrastructure_info') or {})
        mpd_obj = dict(infra.get('may_phat_dien') or {})
        mpds = list(mpd_obj.get('mpd') or [])

        # 1. Đóng ngày kết thúc máy VIKYNO cũ
        for m in mpds:
            brand = (m.get('nhan_hieu') or '') + ' ' + (m.get('ten') or '')
            if 'VIKYNO' in brand.upper() or m.get('nhien_lieu') != 'Xăng':
                m['tinh_trang'] = 'HẾT THUÊ XHH'
                m['ngay_ket_thuc'] = '2026-07-31'
                m['ghi_chu'] = 'Hết thuê máy VIKYNO của XHH từ 01/08/2026, chuyển sang dùng Máy Lưu Động'

        # 2. Thêm hoặc cập nhật máy lưu động
        mobile_gen = {
            'ten': 'MÁY NỔ XĂNG LƯU ĐỘNG',
            'nhan_hieu': conf['brand'],
            'cong_suat': conf['kva'],
            'dinh_muc': conf['quota'],
            'dinh_muc_thuc_te': conf['quota'],
            'dinh_muc_quy_chuan': conf['quota'],
            'nhien_lieu': 'Xăng',
            'loai_lap_dat': 'Lưu động',
            'tinh_trang': 'Hoạt động',
            'ngay_bat_dau': '2026-08-01',
            'ghi_chu': f"Máy nổ xăng lưu động {conf['kva']}KVA thay thế máy VIKYNO hết thuê ({conf['type']})"
        }

        has_mobile = False
        for idx, m in enumerate(mpds):
            if m.get('loai_lap_dat') == 'Lưu động' or m.get('nhien_lieu') == 'Xăng':
                mpds[idx] = mobile_gen
                has_mobile = True
                break
        if not has_mobile:
            mpds.append(mobile_gen)

        mpd_obj['mpd'] = mpds
        infra['may_phat_dien'] = mpd_obj

        supabase.table('datasites').update({'infrastructure_info': infra}).eq('site_id', sid).execute()
        print(f"✅ {sid} ({conf['name']}): Đã chuyển sang {conf['brand']} {conf['kva']}kVA (ĐM {conf['quota']} L/h Xăng) - Phân loại: {conf['type']}")

def update_generator_logs():
    print("\n--- 2. RÀ SOÁT VÀ CẬP NHẬT GENERATOR_LOGS THÁNG 8 & THÁNG 9 ---")
    # Lấy các log trong T8 và T9 của 17 trạm này
    res = supabase.table('generator_logs').select('*').in_('site_id', list(STATION_CONVERSIONS.keys())).gte('date', '2026-08-01').lte('date', '2026-09-30').order('date').execute()
    logs = res.data or []

    print(f"Tìm thấy {len(logs)} ca chạy máy của các trạm mục tiêu trong T8 & T9:")

    for l in logs:
        lid = l['gen_log_id']
        sid = l['site_id']
        date = l['date']
        rd = dict(l.get('run_details') or {})
        old_lm = rd.get('loai_may')
        old_cs = rd.get('cong_suat_may')
        old_dm = rd.get('dinh_muc')
        old_lit = rd.get('nhien_lieu_tieu_hao')
        old_tien = rd.get('thanh_tien')
        old_nl = rd.get('nhien_lieu_loai')
        hours = float(rd.get('thoi_gian_hoat_dong') or 0)
        don_gia = float(rd.get('don_gia') or 0)

        # Kiểm tra xem có phải máy VIKYNO hoặc cần chuyển đổi không
        conf = STATION_CONVERSIONS.get(sid)
        if not conf:
            continue

        # Chỉ chuyển đổi các ca chạy máy VIKYNO của XHH
        if 'VIKYNO' in str(old_lm).upper():
            new_dm = conf['quota']
            new_lit = round(hours * new_dm, 2)
            new_tien = round(new_lit * don_gia) if don_gia > 0 else old_tien

            rd['loai_may'] = conf['brand']
            rd['cong_suat_may'] = conf['kva']
            rd['dinh_muc'] = new_dm
            rd['dinh_muc_thuc_te'] = new_dm
            rd['dinh_muc_quy_chuan'] = new_dm
            rd['nhien_lieu_loai'] = 'XĂNG'
            rd['nhien_lieu_tieu_hao'] = new_lit
            rd['nhien_lieu_tieu_hao_thuc_te'] = new_lit
            rd['thanh_tien'] = new_tien
            rd['ghi_chu'] = f"Chuyển đổi sang máy xăng lưu động {conf['kva']}KVA ({conf['type']})"

            # Update supabase
            supabase.table('generator_logs').update({'run_details': rd}).eq('gen_log_id', lid).execute()
            print(f"  🔄 [{date}] Trạm {sid} ({conf['name']}):")
            print(f"     Trước: {old_lm} | {old_cs}kVA | ĐM {old_dm} | {old_lit}L Dầu | {old_tien:,.0f} đ")
            print(f"     Sau:   {conf['brand']} | {conf['kva']}kVA | ĐM {new_dm} | {new_lit}L Xăng | {new_tien:,.0f} đ")
        else:
            print(f"  ℹ️ [{date}] Trạm {sid}: Đã là máy xăng ({old_lm}) - Bỏ qua.")

if __name__ == '__main__':
    update_datasites()
    update_generator_logs()
    print("\n🎉 HOÀN TẤT CHUẨN HÓA MÁY LƯU ĐỘNG CHO CÁC TRẠM VIKYNO XHH!")
