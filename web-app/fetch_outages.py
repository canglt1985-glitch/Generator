import requests
import re
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
import html
import sqlalchemy
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
sys.stdout.reconfigure(encoding="utf-8")

# 1. Cấu hình Môi trường & Database
load_dotenv()

# Sử dụng chung cấu hình với app.py
db_url = os.getenv('DATABASE_URL', 'sqlite:///instance/generator_manager.db')
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# SQLite path adjustment for script running in web-app
if 'sqlite' in db_url and not os.path.exists(db_url.replace('sqlite:///', '')):
    # Try dynamic path
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, 'instance', 'generator_manager.db')
    if os.path.exists(db_path):
        db_url = f'sqlite:///{db_path}'

print(f"Đang kết nối tới Database: {db_url.split('@')[-1] if '@' in db_url else db_url}")
engine = create_engine(db_url)
Session = sessionmaker(bind=engine)
session = Session()

# 2. Helpers
def decode_html(text):
    return html.unescape(text).strip()

def parse_date(dmy):
    try:
        return datetime.strptime(dmy, "%d/%m/%Y").strftime("%Y-%m-%d")
    except:
        return None

# 3. Crawler Logic
def fetch_for_customer(ma_khach_hang):
    today = datetime.now()
    today_str = today.strftime("%d/%m/%Y")
    den_ngay = (today + timedelta(days=10)).strftime("%d/%m/%Y")
    
    url = "https://www.cskh.evnspc.vn/TraCuu/GetThongTinLichNgungGiamCungCapDien"
    params = {
        "tuNgay": today_str,
        "denNgay": den_ngay,
        "maKH": ma_khach_hang,
        "ChucNang": "MaKhachHang"
    }
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.cskh.evnspc.vn/TraCuu/LichNgungGiamCungCapDien"
    }
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=15)
        if response.status_code != 200:
            print(f"⚠️ [Error {response.status_code}] {ma_khach_hang}")
            return []
        
        content = decode_html(response.text)
        
        # Regex tìm các khối entry
        entry_blocks = re.findall(r'<div class="entry">([\s\S]*?)</div>', content)
        results = []
        
        # Tìm địa chỉ (thường nằm chung trong nội dung phản hồi)
        khu_vuc_match = re.search(r'Địa chỉ:</b>\s*([^<]+)', content, re.I)
        khu_vuc_global = khu_vuc_match.group(1).strip() if khu_vuc_match else ""

        for block in entry_blocks:
            block = decode_html(block)
            
            # Regex thời gian
            tg_match = re.search(r'từ\s+(\d{2}:\d{2})(?::\d{2})?\s+ngày\s+(\d{2}/\d{2}/\d{4})\s+đến\s+(\d{2}:\d{2})(?::\d{2})?\s+ngày\s+(\d{2}/\d{2}/\d{4})', block, re.I)
            
            if tg_match:
                start_time = tg_match.group(1)
                start_date = tg_match.group(2)
                end_time = tg_match.group(3)
                
                # Check ly do
                ly_do_match = re.search(r'LÝ DO NGỪNG CUNG CẤP ĐIỆN:</b>\s*<span>(.*?)</span>', block, re.I)
                ly_do = ly_do_match.group(1).strip() if ly_do_match else ""
                
                results.append({
                    "ngay_mat_dien": parse_date(start_date),
                    "thoi_gian_cup_dien": start_time,
                    "thoi_gian_co_dien": end_time,
                    "ly_do": ly_do,
                    "khu_vuc": khu_vuc_global
                })
                
        return results
    except Exception as e:
        print(f"❌ Exception for {ma_khach_hang}: {e}")
        return []

# 4. Main Process
def main():
    print("🚀 Bắt đầu quét lịch cúp điện...")
    
    # 1. Lấy danh sách mã khách hàng từ GeneralInfo (loại bỏ 'khoán điện')
    try:
        # Lọc bỏ các trạm là "Khoán điện" hoặc không có mã KH
        query = "SELECT id_tram, ma_khach_hang, huyen, quan_ly_tram FROM general_info WHERE ma_khach_hang IS NOT NULL AND ma_khach_hang != '' AND ma_khach_hang NOT ILIKE '%khoán điện%'"
        customers = session.execute(sqlalchemy.text(query)).fetchall()
    except Exception as e:
        print(f"❌ Không thể đọc bảng general_info: {e}")
        return

    total_customers = len(customers)
    print(f"📋 Tìm thấy {total_customers} mã khách hàng hợp lệ (đã lọc khoán điện).")

    new_records_count = 0
    total_detected = 0
    
    # Sửa lỗi Sequence ID cho Postgres (Supabase)
    if "postgresql" in db_url:
        try:
            session.execute(sqlalchemy.text("SELECT setval(pg_get_serial_sequence('power_schedule', 'id'), (SELECT MAX(id) FROM power_schedule))"))
            session.commit()
        except Exception as e:
            print(f"⚠️ Không thể reset sequence: {e}")

    # 2. Xử lý theo BATCH (30 mã mỗi lần như GAS)
    batch_size = 30
    for i in range(0, total_customers, batch_size):
        batch = customers[i:i + batch_size]
        print(f"� Đang xử lý Batch {i//batch_size + 1}/{(total_customers-1)//batch_size + 1} ({len(batch)} mã)...")
        
        for station in batch:
            id_tram, ma_kh, huyen, quan_ly = station
            outages = fetch_for_customer(ma_kh)
            
            total_detected += len(outages)
            
            for ot in outages:
                # Use INSERT ON CONFLICT to skip duplicates at DB level
                # Requires UNIQUE index on (id_tram, ngay_mat_dien, thoi_gian_cup_dien)
                result = session.execute(sqlalchemy.text(
                    "INSERT INTO power_schedule (ma_khach_hang, id_tram, khu_vuc, ngay_mat_dien, thoi_gian_cup_dien, thoi_gian_co_dien, ly_do, doi_quan_ly_dien, quan_ly_tram) "
                    "VALUES (:ma_kh, :id_tram, :khu_vuc, :ngay, :start, :end, :ly_do, :doi_ql, :ql_tram) "
                    "ON CONFLICT (id_tram, ngay_mat_dien, thoi_gian_cup_dien) DO NOTHING"
                ), {
                    "ma_kh": ma_kh,
                    "id_tram": id_tram,
                    "khu_vuc": ot['khu_vuc'],
                    "ngay": ot['ngay_mat_dien'],
                    "start": ot['thoi_gian_cup_dien'],
                    "end": ot['thoi_gian_co_dien'],
                    "ly_do": ot['ly_do'],
                    "doi_ql": huyen,
                    "ql_tram": quan_ly
                })
                if result.rowcount > 0:
                    new_records_count += 1
                    
        session.commit()
        print(f"✅ Đã xong Batch. Lũy kế mới: {new_records_count}")

    summary = f"Tổng cộng: Phát hiện {total_detected} lịch, import mới thành công {new_records_count} dòng."
    print(f"\n🎉 HOÀN THÀNH! {summary}")
    return summary

if __name__ == "__main__":
    main()
