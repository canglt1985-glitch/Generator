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
            print("📡 SmartW Scheduler: Alarm poll 15p + VHKT 5:00 AM")

        scheduler.start()
        print("🕒 Scheduler đã kích hoạt: Quét lịch tự động lúc 05:00 AM hàng ngày.")

    app.run(debug=True, port=5005)
