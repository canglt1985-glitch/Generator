from app import app
from models import DsStation, DsInfrastructure, DsEquipment, DsSiteRegistry, DsCellRegistry

with app.app_context():
    ids = ['DNCM00', 'DNISRA00']
    print(f"Checking IDs: {ids}")
    print(f"Station: {DsStation.query.filter(DsStation.site_id.in_(ids)).count()}")
    print(f"Infra: {DsInfrastructure.query.filter(DsInfrastructure.site_id.in_(ids)).count()}")
    print(f"Equip: {DsEquipment.query.filter(DsEquipment.site_id.in_(ids)).count()}")
    
    registry = DsSiteRegistry.query.filter((DsSiteRegistry.site_id_new=='DNISRA00') | (DsSiteRegistry.site_id_old=='DNCM00')).first()
    if registry:
        print(f"Registry: {registry.site_id_new} / {registry.site_id_old}")
    else:
        print("Registry: NOT FOUND")
