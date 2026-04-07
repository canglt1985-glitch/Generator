from models import DataSiteAsset, DataSiteAnomaly, db
from collections import defaultdict
import logging

def run_anomaly_audit():
    """
    Quét qua toàn bộ dữ liệu DataSiteAsset và tìm lỗi.
    """
    logging.info("Starting Auto-Audit for Anomalies...")
    # Xoá các anomaly cũ chưa xử lý để scan lại, hoặc đánh dấu là resolved
    # For simplicity, we just delete all old anomalies and recreate
    try:
        DataSiteAnomaly.query.delete()
        db.session.commit()
    except Exception as e:
        logging.error(f"Error clearing anomalies: {e}")
        db.session.rollback()
        
    all_assets = DataSiteAsset.query.all()
    
    # Group by SITE_ID
    sites = defaultdict(dict)
    for a in all_assets:
        site_id = a.site_id.upper()
        typ = a.asset_type
        if typ not in sites[site_id]:
            sites[site_id][typ] = []
        sites[site_id][typ].append(a)
        
    anomalies = []
    
    for site_id, assets in sites.items():
        # Rule 1: Thiếu thành phần hạt nhân (Core items)
        # Bắt buộc phải có: COT_ANTEN, TU_NGUON, ACCU
        # (Nếu không phải trạm in-building, nhưng tạm bỏ qua check in-building)
        
        # Check Cột Anten
        if 'COT_ANTEN' not in assets:
            anomalies.append(DataSiteAnomaly(
                site_id=site_id,
                issue_type="MISSING_CORE",
                description="Trạm khai thiếu đối tượng CỘT ANTEN & CẦU CÁP"
            ))
            
        # Check Tủ Nguồn
        if 'TU_NGUON' not in assets:
            anomalies.append(DataSiteAnomaly(
                site_id=site_id,
                issue_type="MISSING_CORE",
                description="Trạm chưa khai báo TỦ NGUỒN (Rectifier)"
            ))
            
        # Check Accu
        if 'ACCU' not in assets:
            anomalies.append(DataSiteAnomaly(
                site_id=site_id,
                issue_type="MISSING_CORE",
                description="Trạm chưa khai báo TỔ ACCU"
            ))

        # Rule 2: Phát hiện trạng thái "HỎNG"
        # Bất kỳ tài sản nào trạng thái Hỏng cần đưa vào monitor
        for typ, items in assets.items():
            for item in items:
                if item.status and "hỏng" in item.status.lower():
                    anomalies.append(DataSiteAnomaly(
                        site_id=site_id,
                        issue_type="BROKEN_ASSET",
                        description=f"Thiết bị {item.asset_name} ({item.brand}) đang báo HỎNG."
                    ))
                    
        # Rule 3: Khai báo bất thường về Data (Dung lượng Accu quá bé)
        if 'ACCU' in assets:
            for item in assets['ACCU']:
                cap = str(item.capacity).lower()
                # Tách số ra khỏi chuỗi Ah
                import re
                nums = re.findall(r'\d+', cap)
                if nums:
                    val = int(nums[0])
                    if val < 50:
                        anomalies.append(DataSiteAnomaly(
                            site_id=site_id,
                            issue_type="DATA_WARNING",
                            description=f"Dung lượng Accu khai báo bất thường ({val} Ah). Cần kiểm tra lại."
                        ))

    # Insert into DB
    try:
        db.session.bulk_save_objects(anomalies)
        db.session.commit()
    except Exception as e:
        logging.error(f"Error saving anomalies: {e}")
        db.session.rollback()
        
    return len(anomalies)

if __name__ == '__main__':
    from app import app
    with app.app_context():
        count = run_anomaly_audit()
        print(f"Generated {count} anomalies.")
