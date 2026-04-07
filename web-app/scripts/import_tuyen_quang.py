
import os
import pandas as pd
from sqlalchemy import text
from dotenv import load_dotenv
from extensions import db
from models import DsTelecom
from app import app

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

def import_tuyen_quang(file_path):
    print(f"🚀 Bắt đầu import Tuyến Quang từ: {file_path}")
    
    try:
        # 1. Đọc file Excel
        df = pd.read_excel(file_path, dtype=str)
        df = df.where(pd.notnull(df), None)
        
        # 2. Chuẩn bị mapping cột
        # Các cột cần lấy: SITE_ID, Tên đối tượng, Tên tuyến, Loại cáp quang, Mục đích tuyến quang, Chủ đầu tư cáp, Đơn vị vận hành cáp
        
        count_added = 0
        total_rows = len(df)
        
        with app.app_context():
            # Xóa dữ liệu cũ để tránh trùng lặp (Optional, tùy chiến lược sync)
            # Ở đây em sẽ xóa theo SITE_ID có trong file để cập nhật mới nhất
            unique_sites = df['SITE_ID'].dropna().unique()
            print(f"🧹 Đang dọn dẹp dữ liệu cũ cho {len(unique_sites)} trạm...")
            
            # Thực hiện qua từng dòng để dễ kiểm soát lỗi
            for index, row in df.iterrows():
                site_id = str(row.get('SITE_ID', '')).strip().upper()
                if not site_id or site_id == 'NONE':
                    continue
                
                ten_doi_tuong = str(row.get('Tên đối tượng', 'TUYẾN QUANG')).strip()
                ten_tuyen = str(row.get('Tên tuyến', '')).strip()
                
                # Tạo bản ghi mới
                new_item = DsTelecom(
                    site_id=site_id,
                    loai='TUYEN_QUANG',
                    subcategory=ten_doi_tuong, # Dùng Tên đối tượng làm Title như anh yêu cầu
                    extra_data={
                        'Tên tuyến': ten_tuyen,
                        'Loại cáp quang': row.get('Loại cáp quang'),
                        'Mục đích': row.get('Mục đích tuyến quang'),
                        'Chủ đầu tư': row.get('Chủ đầu tư cáp'),
                        'Đơn vị vận hành': row.get('Đơn vị vận hành cáp'),
                        'Trạng thái': row.get('Trạng thái')
                    }
                )
                
                db.session.add(new_item)
                count_added += 1
                
                if count_added % 100 == 0:
                    print(f"⏳ Đã xử lý {count_added}/{total_rows} dòng...")
            
            db.session.commit()
            print(f"✅ HOÀN TẤT: Đã import {count_added} tuyến quang vào hệ thống.")
            return count_added

    except Exception as e:
        print(f"❌ LỖI trong quá trình import: {e}")
        return 0

if __name__ == "__main__":
    EXCEL_PATH = r'D:\Chuyen doi so\datasite\tuyen quang.xlsx'
    if os.path.exists(EXCEL_PATH):
        # Xóa toàn bộ loại TUYEN_QUANG cũ trước khi import mới (vì đây là lần đầu)
        with app.app_context():
            db.session.execute(text("DELETE FROM ds_telecom WHERE loai = 'TUYEN_QUANG'"))
            db.session.commit()
            
        import_tuyen_quang(EXCEL_PATH)
    else:
        print(f"⚠️ Không tìm thấy file tại: {EXCEL_PATH}")
