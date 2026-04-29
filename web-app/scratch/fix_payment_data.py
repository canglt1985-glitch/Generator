
import sys
import os
import json
from datetime import datetime

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from app import app, db
from models import FuelLedger, OtherExpense
from sqlalchemy import func

def fix_payment_groups():
    with app.app_context():
        history_file = 'data/payment_groups.json'
        if not os.path.exists(history_file):
            print("File not found.")
            return
            
        with open(history_file, 'r', encoding='utf-8') as f:
            pg = json.load(f)
            
        # Group: mua_ngoai
        den_ngay = pg['mua_ngoai']['da_thanh_toan_den']
        if den_ngay:
            year = den_ngay[:4]
            p_start = f"{year}-01-01"
            
            # Fuel (All except CX)
            all_fuel = FuelLedger.query.filter(
                FuelLedger.ngay >= p_start,
                FuelLedger.ngay <= den_ngay,
                FuelLedger.type.in_(['STOCK_IN', 'DIRECT_BUY'])
            ).all()
            
            mua_ngoai_fuel = 0
            for f in all_fuel:
                ncc_up = (f.nha_cung_cap or '').strip().upper()
                is_cx = 'CX' in ncc_up or 'CÂY XĂNG' in ncc_up or 'CX222' in ncc_up
                if not is_cx:
                    mua_ngoai_fuel += (f.thanh_tien or 0)
            
            # Other Expenses
            oe_total = db.session.query(func.sum(OtherExpense.so_tien)).filter(
                OtherExpense.ngay_su_dung >= p_start,
                OtherExpense.ngay_su_dung <= den_ngay
            ).scalar() or 0
            
            pg['mua_ngoai']['so_tien_da_tt'] = float(mua_ngoai_fuel + oe_total)
            print(f"Updated mua_ngoai to {pg['mua_ngoai']['so_tien_da_tt']} up to {den_ngay}")

        # Group: cx222
        den_ngay_cx = pg['cx222']['da_thanh_toan_den']
        if den_ngay_cx:
            year = den_ngay_cx[:4]
            p_start = f"{year}-01-01"
            
            all_fuel = FuelLedger.query.filter(
                FuelLedger.ngay >= p_start,
                FuelLedger.ngay <= den_ngay_cx,
                FuelLedger.type.in_(['STOCK_IN', 'DIRECT_BUY'])
            ).all()
            
            cx_fuel = 0
            for f in all_fuel:
                ncc_up = (f.nha_cung_cap or '').strip().upper()
                is_cx = 'CX' in ncc_up or 'CÂY XĂNG' in ncc_up or 'CX222' in ncc_up
                if is_cx:
                    cx_fuel += (f.thanh_tien or 0)
            
            pg['cx222']['so_tien_da_tt'] = float(cx_fuel)
            print(f"Updated cx222 to {pg['cx222']['so_tien_da_tt']} up to {den_ngay_cx}")

        with open(history_file, 'w', encoding='utf-8') as f:
            json.dump(pg, f, ensure_ascii=False, indent=2)
        print("Payment groups data fixed.")

if __name__ == "__main__":
    fix_payment_groups()
