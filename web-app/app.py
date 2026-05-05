from flask import Flask, request, jsonify, session, render_template, redirect, url_for, flash, abort
from datetime import datetime, timedelta
import os
import sys
from dotenv import load_dotenv
from flask_apscheduler import APScheduler
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import generate_password_hash
from flask_migrate import Migrate

load_dotenv()

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
sys.stdout.reconfigure(encoding='utf-8')
scheduler = APScheduler()

# Database config
db_url = os.getenv('DATABASE_URL')
if not db_url:
    # Use SQLite as fallback for dev only
    db_url = 'sqlite:///generator_manager.db'
    print("⚠️ WARNING: DATABASE_URL not found in ENV. Using SQLite fallback.")

if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Security: Ensure SECRET_KEY is set in ENV
sk = os.getenv('SECRET_KEY')
if not sk:
    if app.debug:
        sk = 'dev_secret_key_fixed'
        print("⚠️ DEBUG MODE: Using dummy SECRET_KEY.")
    else:
        # Generate random key for safety if absolutely missing in production
        import secrets
        sk = secrets.token_hex(32)
        print("🔴 CRITICAL: SECRET_KEY not set in .env! Generated a random transient key for safety.")

app.config['SECRET_KEY'] = sk
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)
app.config['TEMPLATES_AUTO_RELOAD'] = True

# Initialize extensions
from extensions import db, csrf
db.init_app(app)
csrf.init_app(app)
migrate = Migrate(app, db)

# --- Register Blueprints ---
from smartw import smartw_bp
from core import core_bp
from generator import generator_bp
from daily_work import daily_work_bp
from datasite_routes import datasite_bp

app.register_blueprint(smartw_bp)
app.register_blueprint(core_bp)
app.register_blueprint(generator_bp)
app.register_blueprint(daily_work_bp)
app.register_blueprint(datasite_bp)

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

    # Build site ID mapping: {id_cũ → id_mới} và ngược lại
    site_map = {}
    site_map_reverse = {}
    try:
        from models import DsSiteRegistry
        rows = DsSiteRegistry.query.with_entities(
            DsSiteRegistry.site_id_old, DsSiteRegistry.site_id_new
        ).filter(DsSiteRegistry.site_id_old.isnot(None)).all()
        for r in rows:
            if r.site_id_old and r.site_id_new:
                site_map[r.site_id_old] = r.site_id_new          # cũ → mới
                site_map_reverse[r.site_id_new] = r.site_id_old  # mới → cũ
    except Exception:
        pass  # Fallback: site_map rỗng, template hiển thị bình thường

    return dict(
        pending_req_count=pending_count,
        now_date=now.strftime('%Y-%m-%d'),
        now_dt=now.strftime('%Y-%m-%dT%H:%M'),
        site_map=site_map,
        site_map_reverse=site_map_reverse
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


ROLE_LABELS = {'admin': 'Quản trị', 'nhanvien': 'Nhân viên', 'chuyenvien': 'Chuyên viên', 'user': 'Nhân viên'}


@app.template_filter('role_label')
def role_label_filter(value):
    return ROLE_LABELS.get(value, value)


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





# --- API: MFD Import (manual trigger) ---
@app.route('/api/smartw/report/periodic', methods=['POST'])
def api_smartw_periodic_report():
    """Manually trigger the 2-hour periodic summary report. Admin only."""
    from flask import session
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    from smartw.worker import send_periodic_full_report
    try:
        send_periodic_full_report()
        return jsonify({'status': 'success', 'message': 'Periodic report sent to Viber'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/mfd-import', methods=['POST'])
def api_mfd_import():
    """Manually trigger MFĐ import for a specific date. Admin only."""
    from flask import session
    if 'user_id' not in session or session.get('role') != 'admin':
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
    from flask import session
    if 'user_id' not in session:
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
    date_str = request.args.get('date', '').strip()
    don_gia = get_pretax_price(loai_nl, date_str if date_str else None)

    return jsonify({
        'id_tram': info.id_tram,
        'site': info.id_tram,
        'loai_may': info.loai_may or '',
        'may_phat_dien': info.may_phat_dien or '',
        'cong_suat_may': str(info.cong_suat) if info.cong_suat else '',
        'dinh_muc': info.dinh_muc or 0,
        'nhien_lieu': info.loai_nhien_lieu or 'Dầu',
        'don_gia': don_gia
    })


@app.route('/api/fuel-price')
def api_fuel_price():
    """Get historical fuel price by type and date.
    Query: ?type=Dầu&date=2026-03-26
    """
    from flask import session
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 403

    fuel_type = request.args.get('type', 'Dầu').strip()
    date_str = request.args.get('date', '').strip()

    from fuel_price import get_fuel_price_for_date
    # Get full retail price (sau thuế) for Fuel Ledger
    price = get_fuel_price_for_date(date_str if date_str else datetime.now().strftime('%Y-%m-%d'), fuel_type)

    return jsonify({
        'fuel_type': fuel_type,
        'date': date_str,
        'price': price
    })


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        if User.query.count() == 0:
            initial_password = os.getenv('ADMIN_PASSWORD', 'admin123')
            admin_user = User(
                username='admin',
                password_hash=generate_password_hash(initial_password),
                role='admin'
            )
            db.session.add(admin_user)
            db.session.commit()
            print(f"Default admin user created: admin / {initial_password}")
            if initial_password == 'admin123':
                print("🔴 CRITICAL: Using default password 'admin123'. Change it in .env immediately!")

    # Scheduler config
    app.config['SCHEDULER_API_ENABLED'] = True
    scheduler.init_app(app)

    if not app.debug or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        scheduler.add_job(id='fetch_outages_task', func=scheduled_outage_fetch, trigger='cron', hour=5, minute=0)

        # Fuel price: 2x/day (4PM after PVOil updates, and 0AM as fallback)
        scheduler.add_job(id='fuel_price_daily_16h', func=scheduled_fuel_price_fetch, trigger='cron', hour=16, minute=0)
        scheduler.add_job(id='fuel_price_daily_0h', func=scheduled_fuel_price_fetch, trigger='cron', hour=0, minute=0)

        from smartw.config import is_smartw_configured
        
        # Helper to properly manage app context for scheduler jobs
        def run_with_context(func, *args, **kwargs):
            with app.app_context():
                return func(*args, **kwargs)

        if is_smartw_configured():
            from smartw.worker import run_alarm_poll, run_vhkt_poll, send_periodic_full_report, run_mfd_import_poll
            scheduler.add_job(
                id='smartw_alarm_poll',
                func=lambda: run_with_context(run_alarm_poll),
                trigger='interval', seconds=900,
                max_instances=1
            )
            scheduler.add_job(
                id='smartw_alarm_periodic_review',
                func=lambda: run_with_context(send_periodic_full_report),
                trigger='cron', hour='*/2', minute=0,
                max_instances=1
            )
            scheduler.add_job(
                id='smartw_vhkt_poll',
                func=lambda: run_with_context(run_vhkt_poll),
                trigger='cron', hour=5, minute=0,
                max_instances=1
            )
            # MFD daily import: 6 AM (scrape yesterday's generator runtime)
            scheduler.add_job(
                id='mfd_import_daily',
                func=lambda: run_with_context(run_mfd_import_poll),
                trigger='cron', hour=6, minute=0,
                max_instances=1
            )
            print("SmartW Scheduler: Alarm poll 15p + VHKT 5AM + MFD import 6AM")

        # DataSite Auto-Sync: Weekly on Sunday at 2 AM
        from datasite_scraper import perform_datasite_sync_real
        scheduler.add_job(
            id='datasite_sync_weekly',
            func=lambda: run_with_context(perform_datasite_sync_real),
            trigger='cron', day_of_week='sun', hour=2, minute=0,
            max_instances=1
        )

        scheduler.start()
        print("Scheduler: Lich cup 5AM + Gia NL 4PM + MFD 6AM + DataSite Sun 2AM")

        # Initial fuel price fetch on startup
        scheduled_fuel_price_fetch()
        
        # Start Telegram Bot Polling (if Token is provided)
        from bot_telegram import start_bot_thread
        start_bot_thread()

    app.run(host='0.0.0.0', port=5005, debug=False)
