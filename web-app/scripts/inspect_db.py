import sys
import os
sys.path.append(os.getcwd())
from app import app
from models import DsTransmission, DsTelecom, DsSiteRegistry

with app.app_context():
    print("--- TRANSMISSION ---")
    t = DsTransmission.query.first()
    if t: print(t.to_dict())
    
    print("\n--- DATA_CELL ---")
    tele = DsTelecom.query.filter_by(loai='DATA_CELL').first()
    if tele: print(tele.to_dict())
    
    print("\n--- SITE REGISTRY ---")
    site = DsSiteRegistry.query.first()
    if site: print(site.to_dict())
