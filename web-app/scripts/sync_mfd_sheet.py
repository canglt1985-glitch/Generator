import os
import sys
import logging
import pandas as pd
import ssl
from datetime import datetime

# Bypass SSL certificate verification for macOS
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

# Set up default local DB if not defined in environment
if 'DATABASE_URL' not in os.environ:
    os.environ['DATABASE_URL'] = f"sqlite:///{os.path.abspath(os.path.join(os.path.dirname(__file__), '../instance/generator_manager.db'))}"

# Set up paths so we can import from parent directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app
from models import DsEquipment, db
from datasite_utils import is_valid_site, g

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1SXop6_O9c0Kmi741bE1zLXgM4mXNNYJL/export?format=csv&gid=62463418"

def sync_mfd_from_sheet():
    logger.info("Starting sync of Máy Phát Điện from Google Sheet...")
    
    try:
        # 1. Fetch the CSV from Google Sheet
        logger.info(f"Fetching sheet CSV from: {SHEET_CSV_URL}")
        df_raw = pd.read_csv(SHEET_CSV_URL, header=None)
        logger.info(f"Successfully fetched raw sheet. Found {len(df_raw)} rows.")
        
        # Find correct header row containing 'SITE_ID'
        header_idx = -1
        for idx, row in df_raw.head(10).iterrows():
            for val in row.values:
                if pd.notna(val) and str(val).strip().upper() == 'SITE_ID':
                    header_idx = idx
                    break
            if header_idx != -1:
                break
                
        if header_idx == -1:
            logger.error("Could not find row containing 'SITE_ID' header!")
            return False
            
        logger.info(f"Found 'SITE_ID' header at row index {header_idx}")
        
        # Re-read or parse dataframe with the correct header
        columns = [str(c).strip() for c in df_raw.iloc[header_idx]]
        df = df_raw.iloc[header_idx + 1:].copy()
        df.columns = columns
        
        # Filter out rows where SITE_ID is empty or helper text
        valid_rows = df[df['SITE_ID'].notna()]
        valid_rows = valid_rows[valid_rows['SITE_ID'].astype(str).str.strip().str.len() > 2]
        
        # Skip the instruction row (usually Row index 0 in the sheet containing instructions)
        instruction_filtered = []
        for idx, row in valid_rows.iterrows():
            first_val = str(row.iloc[0]) if len(row) > 0 else ""
            if "Không thay đổi" in first_val or "HƯỚNG DẪN" in first_val or "Không được sửa" in first_val:
                continue
            instruction_filtered.append(row)
            
        logger.info(f"Found {len(instruction_filtered)} potential data rows after filtering instructions.")
        
        # 2. Run inside application context
        with app.app_context():
            # Delete existing máy phát điện records
            logger.info("Clearing old DsEquipment where loai='MAY_PHAT'...")
            DsEquipment.query.filter_by(loai='MAY_PHAT').delete()
            
            count = 0
            skipped_site = 0
            
            for row in instruction_filtered:
                site_id = g(row, ['SITE_ID'])
                if not site_id:
                    continue
                    
                site_id = site_id.strip().upper()
                if not is_valid_site(site_id):
                    skipped_site += 1
                    continue
                    
                obj = DsEquipment(
                    site_id=site_id,
                    loai='MAY_PHAT',
                    nhan_hieu=g(row, ['Nhãn hiệu Máy phát điện']),
                    serial=g(row, ['Serial máy phát điện']),
                    trang_thai=g(row, ['Trạng thái']),
                    han_bao_hanh=g(row, ['Thời hạn bảo hành']),
                    han_bao_duong=g(row, ['Thời hạn bảo dưỡng']),
                    ngay_su_dung=g(row, ['Ngày đưa vào sử dụng tại trạm']),
                    extra_data={
                        'cong_suat': g(row, ['Công suất Máy phát điện']),
                        'phase': g(row, ['Phase']),
                        'nhien_lieu': g(row, ['Nhiên liệu']),
                        'ats': g(row, ['ATS']),
                        'ten_mpd': g(row, ['Tên Máy phát điện']),
                        'product_code': g(row, ['Product_code máy phát điện']),
                        'dv_chu_quan': g(row, ['Đơn vị chủ quản Máy phát điện']),
                        'don_vi_tinh': g(row, ['Đơn vị tính']),
                        'don_gia': g(row, ['Đơn giá']),
                        'ghi_chu': g(row, ['Ghi chú']),
                        'vi_tri_tai_san': g(row, ['Vị trí tài sản']),
                        'ngay_sd_hop_dong': g(row, ['Ngày đưa vào sử dụng (theo hợp đồng trang bị)']),
                        'dai_vt': g(row, ['Đài VT']),
                    }
                )
                db.session.add(obj)
                count += 1
                
            db.session.commit()
            logger.info(f"✅ Sync completed: Imported {count} Máy Phát Điện records successfully. Skipped {skipped_site} records (not in Tổ VT3/Long Khánh).")
            return True
            
    except Exception as e:
        logger.error(f"❌ Failed to sync: {e}", exc_info=True)
        return False

if __name__ == "__main__":
    sync_mfd_from_sheet()
