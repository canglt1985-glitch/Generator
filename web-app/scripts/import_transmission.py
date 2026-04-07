import pandas as pd
import sys
import os
from datetime import datetime

# Add current dir to path for imports
sys.path.append(os.getcwd())

from app import app
from extensions import db
from models import DsTransmission

EXCEL_PATH = r"D:\Chuyen doi so\datasite\truyen dan.xlsx"

def clean_val(val):
    if pd.isna(val) or str(val).strip().lower() == 'nan':
        return None
    return str(val).strip()

def import_transmission():
    print(f"🚀 Bắt đầu import truyền dẫn từ: {EXCEL_PATH}")
    
    if not os.path.exists(EXCEL_PATH):
        print("❌ Không tìm thấy file Excel!")
        return

    try:
        # Read Excel
        df = pd.read_excel(EXCEL_PATH)
        
        # Mapping columns (based on previous analysis)
        # Columns in Excel: 'Trạm', ' Loại trạm', 'Loại  kết nối 3G/4G\n(FO/MW/LL)', ' Thiết bị TD 3G/4G/FO', 
        # 'Hướng(Viba/FO/LL/SW/IDU share)', 'Node 3G/4G', 'Chủ đầu tư cáp', 'Chủng loại CSG', 
        # 'ĐƠN VỊ VHKT TD 3G/4G', 'Chủng loại CWDM', ' hãng SX CWDM'
        
        with app.app_context():
            # Xóa dữ liệu cũ để tránh trùng lặp hoặc rác
            num_deleted = DsTransmission.query.delete()
            print(f"🗑️ Đã xóa {num_deleted} bản ghi cũ.")
            
            count = 0
            for _, row in df.iterrows():
                site_id = clean_val(row.get('Trạm'))
                if not site_id:
                    continue
                
                # Create record
                trans = DsTransmission(
                    site_id=site_id,
                    loai_ket_noi=clean_val(row.get('Loại  kết nối 3G/4G\n(FO/MW/LL)')),
                    thiet_bi_td=clean_val(row.get(' Thiết bị TD 3G/4G/FO')),
                    huong_ket_noi=clean_val(row.get('Hướng(Viba/FO/LL/SW/IDU share)')),
                    node_csg=clean_val(row.get('Node CSG')),
                    chung_loai_csg=clean_val(row.get('Chủng loại CSG')),
                    chu_dau_tu_cap=clean_val(row.get('Chủ đầu tư cáp')),
                    don_vi_van_hanh_cap=clean_val(row.get('đơn vị vận hành cáp')),
                    chung_loai_cwdm=clean_val(row.get('Chủng loại CWDM')),
                    hang_sx_cwdm=clean_val(row.get('hãng SX CWDM')),
                    sync_date=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                )
                db.session.add(trans)
                count += 1
                
                if count % 50 == 0:
                    print(f"  Processed {count} stations...")
            
            db.session.commit()
            print(f"✅ HOÀN TẤT: Đã import {count} trạm vào hệ thống.")

    except Exception as e:
        print(f"❌ Lỗi khi import: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import_transmission()
