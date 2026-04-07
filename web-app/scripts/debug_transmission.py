from app import app
from models import DsTransmission

with app.app_context():
    ids = ['DNCM00', 'DNISRA00']
    count = DsTransmission.query.filter(DsTransmission.site_id.in_(ids)).count()
    print(f"Transmission count for {ids}: {count}")
    if count > 0:
        t = DsTransmission.query.filter(DsTransmission.site_id.in_(ids)).first()
        print(f"Found: {t.site_id} - {t.loai_ket_noi}")
