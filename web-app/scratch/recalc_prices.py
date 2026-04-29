from app import app
from models import db, GeneratorLog
from generator.mfd_import import get_pretax_price
from generator.routes_info import _auto_fill_generator_logs

with app.app_context():
    print("Recalculating fuel prices for all logs...")
    # Force auto fill logs by clearing don_gia for ALL logs so it recalculates
    logs = GeneratorLog.query.all()
    for log in logs:
        # We temporarily set don_gia to 0 to force recalculation
        log.don_gia = 0
    db.session.commit()
    
    # Now call the actual auto_fill to calculate them correctly
    _auto_fill_generator_logs()
    print("Recalculation complete.")
