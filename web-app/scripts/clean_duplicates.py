import sys
import os
import logging
from datetime import datetime, timedelta

# Add web-app to path
web_app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(web_app_dir)

from app import app
from models import GeneratorLog
from extensions import db
from generator.mfd_import import resolve_overlapping_logs

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def clean_all_2026():
    with app.app_context():
        logger.info("--- Cleaning up duplicate and overlapping GeneratorLog entries for 2026 ---")
        
        # We can use the existing resolve_overlapping_logs functionality
        # by passing it a simulated raw_data list containing the months we want to check.
        # The function extracts unique dates from the raw_data.
        
        # Let's collect all dates in 2026 that have logs
        logs = GeneratorLog.query.filter(GeneratorLog.ngay_van_hanh.like('2026-%')).all()
        unique_dates = sorted(list(set(l.ngay_van_hanh for l in logs)))
        
        logger.info(f"Found {len(unique_dates)} dates with logs in 2026.")
        
        # Prepare mock raw_data for resolve_overlapping_logs
        # (It only needs 'sdate' to identify the affected dates)
        mock_raw_data = []
        for d_str in unique_dates:
            # d_str is YYYY-MM-DD, convert to SmartW format: 'Feb 28, 2026 12:00:00 AM'
            try:
                dt = datetime.strptime(d_str, '%Y-%m-%d')
                smartw_date = dt.strftime('%b %d, %Y %I:%M:%S %p')
                mock_raw_data.append({'sdate': smartw_date})
            except ValueError:
                continue
        
        if not mock_raw_data:
            logger.info("No dates to process.")
            return

        # Run the resolution logic
        deleted_count = resolve_overlapping_logs(mock_raw_data)
        
        logger.info(f"Cleanup complete. Deleted {deleted_count} overlapping/duplicate records.")

if __name__ == "__main__":
    clean_all_2026()
