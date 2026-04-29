from app import app
from models import db, GeneratorLog
from generator.mfd_import import get_pretax_price

with app.app_context():
    print("Recalculating fuel prices (batched)...")
    logs = GeneratorLog.query.filter(GeneratorLog.ngay_van_hanh >= '2026-02-01').all()
    print(f"Found {len(logs)} logs since Feb 1, 2026.")
    
    count = 0
    for log in logs:
        fuel_type = log.nhien_lieu or 'Dầu'
        new_price = get_pretax_price(fuel_type, log.ngay_van_hanh)
        if log.don_gia != new_price:
            log.don_gia = new_price
            
            # Recalculate thanh_tien
            nl = log.nhien_lieu_tieu_hao or 0
            if nl > 0 and new_price > 0:
                log.thanh_tien = round(nl * new_price)
                
            count += 1
            
        if count % 100 == 0:
            db.session.commit()
            
    db.session.commit()
    print(f"Updated {count} logs successfully.")
