from flask import Flask
from datetime import datetime
import os
import sys
from dotenv import load_dotenv
from flask_apscheduler import APScheduler
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import generate_password_hash

load_dotenv()

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
sys.stdout.reconfigure(encoding='utf-8')
scheduler = APScheduler()

# Database config
db_url = os.getenv('DATABASE_URL', 'sqlite:///generator_manager.db')
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your_secret_key_here')

# Initialize extensions
from extensions import db
db.init_app(app)

# --- Register Blueprints ---
from smartw import smartw_bp
from core import core_bp
from generator import generator_bp
from daily_work import daily_work_bp

app.register_blueprint(smartw_bp)
app.register_blueprint(core_bp)
app.register_blueprint(generator_bp)
app.register_blueprint(daily_work_bp)

# Import models for context processor
from models import DeletionRequest, User

# --- GLOBAL CONTEXT PROCESSOR & TEMPLATE FILTER ---

@app.context_processor
def inject_global_vars():
    now = datetime.now()
    pending_count = 0
    from flask import session
    if 'role' in session and session['role'] == 'admin':
        pending_count = DeletionRequest.query.filter_by(status='Pending').count()
    return dict(
        pending_req_count=pending_count,
        now_date=now.strftime('%Y-%m-%d'),
        now_dt=now.strftime('%Y-%m-%dT%H:%M')
    )


@app.template_filter('format_date')
def format_date_filter(value):
    if not value:
        return ''
    try:
        s = str(value)
        dstr = s.split(' ')[0]
        if '-' in dstr:
            parts = dstr.split('-')
            if len(parts) == 3:
                if len(parts[0]) == 4:
                    return f"{parts[2]}/{parts[1]}/{parts[0]}"
                else:
                    return f"{parts[0]}/{parts[1]}/{parts[2]}"
        return dstr
    except Exception:
        return value


# --- BACKGROUND SCHEDULER ---

def scheduled_outage_fetch():
    print(f"⏰ [Scheduler] Bắt đầu quét lịch cúp điện tự động: {datetime.now()}")
    from fetch_outages import main as fetch_main
    try:
        summary = fetch_main()
        print(f"✅ [Scheduler] Hoàn tất: {summary}")
    except Exception as e:
        print(f"❌ [Scheduler] Lỗi: {e}")


def scheduled_fuel_price_fetch():
    from fuel_price import fetch_and_save
    try:
        fetch_and_save()
    except Exception as e:
        print(f"❌ [Scheduler] Lỗi scrape giá NL: {e}")


# --- API: Fuel Price ---
from flask import jsonify, request

@app.route('/api/fuel-price')
def api_fuel_price():
    from fuel_price import get_fuel_prices
    return jsonify(get_fuel_prices())


# --- API: MFD Import (manual trigger) ---
@app.route('/api/mfd-import', methods=['POST'])
def api_mfd_import():
    """Manually trigger MFĐ import for a specific date. Admin only."""
    from flask_login import current_user
    if not current_user.is_authenticated or current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json(silent=True) or {}
    target_date = data.get('date')  # DD/MM/YYYY or None (yesterday)

    from smartw.worker import run_mfd_import_poll
    result = run_mfd_import_poll(target_date)
    return jsonify(result or {'error': 'No result'})


# --- API: Station Info (for manual generator log form) ---
@app.route('/api/station-info')
def api_station_info():
    """Get station details for generator log auto-fill.
    Query: ?id=DNTN28
    Returns: loai_may, dinh_muc, nhien_lieu, don_gia (PVOil trước VAT)
    """
    from flask_login import current_user
    if not current_user.is_authenticated:
        return jsonify({'error': 'Unauthorized'}), 403

    id_tram = request.args.get('id', '').strip()
    if not id_tram:
        return jsonify({'error': 'Missing id parameter'}), 400

    from models import GeneralInfo
    info = GeneralInfo.query.filter_by(id_tram=id_tram).first()
    if not info:
        return jsonify({'error': f'Station {id_tram} not found'}), 404

    # Get PVOil price before VAT
    from generator.mfd_import import get_pretax_price
    loai_nl = info.loai_nhien_lieu or 'Dầu'
    don_gia = get_pretax_price(loai_nl)

    return jsonify({
        'id_tram': info.id_tram,
        'site': info.id_tram,
        'loai_may': info.loai_may or '',
        'may_phat_dien': info.may_phat_dien or '',
        'cong_suat_may': str(info.cong_suat) if info.cong_suat else '',
        'dinh_muc': info.dinh_muc or 0,
        'nhien_lieu': loai_nl,
        'don_gia': don_gia,
    })


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        if User.query.count() == 0:
            admin_user = User(
                username='admin',
                password_hash=generate_password_hash('admin123'),
                role='admin'
            )
            db.session.add(admin_user)
            db.session.commit()
            print("Default admin user created: admin / admin123")

    # Scheduler config
    app.config['SCHEDULER_API_ENABLED'] = True
    scheduler.init_app(app)

    if not app.debug or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        scheduler.add_job(id='fetch_outages_task', func=scheduled_outage_fetch, trigger='cron', hour=5, minute=0)

        # Fuel price: 7AM (for morning ops) + 4PM (catch new prices effective 3PM)
        scheduler.add_job(id='fuel_price_morning', func=scheduled_fuel_price_fetch, trigger='cron', hour=7, minute=0)
        scheduler.add_job(id='fuel_price_afternoon', func=scheduled_fuel_price_fetch, trigger='cron', hour=16, minute=0)

        from smartw.config import is_smartw_configured
        if is_smartw_configured():
            from smartw.worker import run_alarm_poll, run_vhkt_poll
            scheduler.add_job(
                id='smartw_alarm_poll',
                func=lambda: app.app_context().push() or run_alarm_poll(),
                trigger='interval', seconds=900,
                max_instances=1
            )
            scheduler.add_job(
                id='smartw_vhkt_poll',
                func=lambda: app.app_context().push() or run_vhkt_poll(),
                trigger='cron', hour=5, minute=0,
                max_instances=1
            )
            # MFD daily import: 6 AM (scrape yesterday's generator runtime)
            from smartw.worker import run_mfd_import_poll
            scheduler.add_job(
                id='mfd_import_daily',
                func=lambda: app.app_context().push() or run_mfd_import_poll(),
                trigger='cron', hour=6, minute=0,
                max_instances=1
            )
            print("📡 SmartW Scheduler: Alarm poll 15p + VHKT 5AM + MFD import 6AM")

        scheduler.start()
        print("🕒 Scheduler đã kích hoạt: Lịch cúp 5AM + Giá NL 7AM/4PM + MFD 6AM")

        # Initial fuel price fetch on startup
        scheduled_fuel_price_fetch()

    app.run(debug=True, port=5005)
