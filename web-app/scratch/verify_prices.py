
import sys
import os
import json
from datetime import datetime

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from app import app, db
from models import GeneratorLog, FuelLedger

def check_prices():
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

        def get_expected_price(fuel_type, date_str, is_fuel_ledger=False):
            # Find the price effective on or before date_str
            for entry in history:
                if entry['effective_date'] <= date_str:
                    raw_price = entry['xang_ron95'] if 'xăng' in fuel_type.lower() else entry['dau_do']
                    
                    if is_fuel_ledger:
                        # Fuel Ledger uses Gross Price (after tax)
                        return float(raw_price)
                    else:
                        # Generator Log uses Pre-tax Price (bóc thuế 8% trước 26/03)
                        if date_str >= '2026-03-26':
                            return float(raw_price)
                        else:
                            return round(raw_price / 1.08)
            return None

        print("--- CHECKING GENERATOR LOGS (MARCH & APRIL) ---")
        gen_logs = GeneratorLog.query.filter(GeneratorLog.ngay_van_hanh >= '2026-03-01').all()
        mismatches_gen = 0
        for log in gen_logs:
            expected = get_expected_price(log.nhien_lieu or 'Dầu', log.ngay_van_hanh, is_fuel_ledger=False)
            if expected and abs(log.don_gia - expected) > 1:
                print(f"Mismatch GenLog ID {log.id} | Date: {log.ngay_van_hanh} | Fuel: {log.nhien_lieu} | Actual: {log.don_gia} | Expected: {expected}")
                mismatches_gen += 1
        
        if mismatches_gen == 0:
            print("✅ All Generator Logs in March/April match historical prices (Pre-tax)!")
        else:
            print(f"❌ Found {mismatches_gen} mismatches in Generator Logs.")

        print("\n--- CHECKING FUEL LEDGER (MARCH & APRIL) ---")
        fuel_logs = FuelLedger.query.filter(FuelLedger.ngay >= '2026-03-01').all()
        mismatches_fuel = 0
        for log in fuel_logs:
            if log.type in ['DIRECT_BUY', 'STOCK_IN']:
                date_str = log.ngay.split(' ')[0]
                expected = get_expected_price(log.loai_nhien_lieu or 'Dầu', date_str, is_fuel_ledger=True)
                if expected and abs(log.don_gia - expected) > 1:
                    print(f"Mismatch FuelLedger ID {log.id} | Date: {date_str} | Fuel: {log.loai_nhien_lieu} | Actual: {log.don_gia} | Expected: {expected}")
                    mismatches_fuel += 1
        
        if mismatches_fuel == 0:
            print("✅ All Fuel Ledger entries in March/April match historical prices!")
        else:
            print(f"❌ Found {mismatches_fuel} mismatches in Fuel Ledger.")

if __name__ == "__main__":
    check_prices()
