import sys
import os
sys.path.append(os.getcwd())
from app import app
from models import DsTelecom, DsCellRegistry

with app.app_context():
    print("--- TELECOM COUNTS ---")
    vals = DsTelecom.query.with_entities(DsTelecom.loai).distinct().all()
    print("LOAI in DsTelecom:", [v[0] for v in vals])
    
    print("\n--- CELL REGISTRY COUNT ---")
    c_count = DsCellRegistry.query.count()
    print("TOTAL CELLS:", c_count)
    if c_count > 0:
        print("SAMPLE CELL:", DsCellRegistry.query.first().to_dict())
