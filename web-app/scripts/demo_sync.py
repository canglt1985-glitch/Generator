"""Demo: Deep Sync PHÒNG MÁY from DataSite"""
import logging
logging.basicConfig(level=logging.INFO)

from app import app as flask_app

with flask_app.app_context():
    from smartw.worker import run_datasite_export_sync
    print("🚀 Starting Deep Sync for: PHÒNG MÁY")
    print("=" * 50)
    run_datasite_export_sync(["PHÒNG MÁY"])
    print("\n✅ Done!")
