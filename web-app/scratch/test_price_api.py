import sys
import os
from datetime import datetime

# Add the project root to sys.path
sys.path.append(os.getcwd())

# Mock environment for Flask
os.environ['DATABASE_URL'] = 'sqlite:///generator_manager.db'

from app import app
from fuel_price import get_fuel_price_for_date

def test_price_lookup(date_str, fuel_type='Dầu'):
    print(f"Testing {fuel_type} for date {date_str}...")
    price = get_fuel_price_for_date(date_str, fuel_type)
    print(f"Result: {price}")
    return price

if __name__ == "__main__":
    with app.app_context():
        test_price_lookup('2026-04-29', 'Dầu')
        test_price_lookup('2026-04-01', 'Dầu')
        test_price_lookup('2026-04-29', 'Xăng')
