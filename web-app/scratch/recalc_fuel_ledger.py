
import sys
import os
import json
from datetime import datetime

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from app import app, db
from models import FuelLedger

def recalculate_fuel_ledger():
    with app.app_context():
        # Load historical prices
        history_file = 'data/fuel_prices_history.json'
        if not os.path.exists(history_file):
            print("History file not found.")
            return
        
        with open(history_file, 'r', encoding='utf-8') as f:
            history = json.load(f)
        
        # Sort history by date descending
        history.sort(key=lambda x: x['effective_date'], reverse=True)

        def get_gross_price(fuel_type, date_str):
            for entry in history:
                if entry['effective_date'] <= date_str:
                    return float(entry['xang_ron95'] if 'xăng' in fuel_type.lower() else entry['dau_do'])
            return None

        print("Recalculating Fuel Ledger prices (Gross Price)...")
        logs = FuelLedger.query.filter(FuelLedger.ngay >= '2026-02-01').all()
        print(f"Found {len(logs)} logs since Feb 1, 2026.")
        
        updated_count = 0
        for log in logs:
            if log.type in ['DIRECT_BUY', 'STOCK_IN']:
                date_str = log.ngay.split(' ')[0]
                new_price = get_gross_price(log.loai_nhien_lieu or 'Dầu', date_str)
                
                if new_price and abs(log.don_gia - new_price) > 1:
                    log.don_gia = new_price
                    log.thanh_tien = round((log.so_luong or 0) * new_price)
                    updated_count += 1
        
        db.session.commit()
        print(f"Updated {updated_count} fuel records successfully.")

if __name__ == "__main__":
    recalculate_fuel_ledger()
