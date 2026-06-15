"""
Core routes — Auth, Admin, Dashboard, Audit, Reports, User Management
Extracted from app.py
"""
from flask import render_template, request, redirect, url_for, flash, send_file, session, abort, jsonify
from datetime import datetime
from io import BytesIO
import pandas as pd
import json, os
from werkzeug.security import generate_password_hash, check_password_hash

from extensions import db
from models import (
    GeneralInfo, PowerSchedule, GeneratorLog, FuelRefillLog,
    FuelPurchaseLog, FuelLedger, OtherExpense, User,
    DeletionRequest
)
from helpers import get_central_stock, get_dashboard_stats, detect_fuel_anomalies, get_upcoming_outages, get_audit_data, get_missing_logs_recommendations
from auth import login_required, admin_required, cost_access_required
from core import core_bp


# --- AUTH ROUTES ---

@core_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password_hash, password):
            session.permanent = True
            session['user_id'] = user.id
            session['username'] = user.username
            session['role'] = user.role
            session['full_name'] = user.full_name or user.username
            flash(f'Chào mừng trở lại, {username}!', 'success')
            return redirect(url_for('smartw.vhkt'))
        flash('Sai tài khoản hoặc mật khẩu!', 'danger')
    return render_template('login.html')


@core_bp.route('/logout', methods=['GET', 'POST'])
def logout():
    session.clear()
    flash('Đã đăng xuất!', 'info')
    return redirect(url_for('core.login'))


@core_bp.route('/change-password', methods=['POST'])
@login_required
def change_password():
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    old_pass = request.form.get('old_password')
    new_pass = request.form.get('new_password')
    
    if not check_password_hash(user.password_hash, old_pass):
        flash('Mật khẩu cũ không chính xác!', 'danger')
        return redirect(request.referrer or url_for('smartw.vhkt'))
        
    try:
        user.password_hash = generate_password_hash(new_pass)
        db.session.commit()
        flash('Đổi mật khẩu thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi: {str(e)}', 'danger')
        
    return redirect(request.referrer or url_for('smartw.vhkt'))


# --- DASHBOARD ---

@core_bp.route('/')
@login_required
def index():
    return redirect(url_for('smartw.vhkt'))


# --- User Management Routes (Admin Only) ---

@core_bp.route('/users')
@login_required
@admin_required
def list_users():
    return redirect(url_for('core.admin'))


@core_bp.route('/users/add', methods=['POST'])
@login_required
@admin_required
def add_user():
    username = request.form.get('username')
    password = request.form.get('password')
    role = request.form.get('role', 'nhanvien')
    full_name = request.form.get('full_name')
    phone_number = request.form.get('phone_number')
    
    if not username or not password:
        flash('Vui lòng nhập đầy đủ thông tin!', 'danger')
        return redirect(url_for('core.list_users'))
        
    if User.query.filter_by(username=username).first():
        flash('Tên đăng nhập đã tồn tại!', 'danger')
        return redirect(url_for('core.list_users'))
        
    try:
        new_user = User(
            username=username,
            password_hash=generate_password_hash(password),
            role=role,
            full_name=full_name,
            phone_number=phone_number
        )
        db.session.add(new_user)
        db.session.commit()
        flash(f'Đã tạo người dùng {username}!', 'success')
    except Exception as e:
        flash(f'Lỗi: {str(e)}', 'danger')
        
    return redirect(url_for('core.list_users'))


@core_bp.route('/users/edit/<int:user_id>', methods=['POST'])
@login_required
@admin_required
def edit_user(user_id):
    user = User.query.get_or_404(user_id)
    full_name = request.form.get('full_name', '').strip()
    phone_number = request.form.get('phone_number', '').strip()
    role = request.form.get('role', user.role)

    try:
        user.full_name = full_name
        user.phone_number = phone_number
        user.role = role
        db.session.commit()
        flash(f'Đã cập nhật thông tin {user.username}!', 'success')
    except Exception as e:
        flash(f'Lỗi: {str(e)}', 'danger')

    return redirect(url_for('core.list_users'))


@core_bp.route('/users/delete/<int:user_id>', methods=['POST'])
@login_required
@admin_required
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    
    if user.username == session.get('username'):
        flash('Bạn không thể tự xóa tài khoản của mình!', 'danger')
        return redirect(url_for('core.list_users'))
        
    try:
        db.session.delete(user)
        db.session.commit()
        flash(f'Đã xóa người dùng {user.username}!', 'success')
    except Exception as e:
        flash(f'Lỗi: {str(e)}', 'danger')
        
    return redirect(url_for('core.list_users'))


@core_bp.route('/users/reset-password/<int:user_id>', methods=['POST'])
@login_required
@admin_required
def reset_password(user_id):
    user = User.query.get_or_404(user_id)
    new_pass = request.form.get('new_password')
    
    if not new_pass:
        flash('Vui lòng nhập mật khẩu mới!', 'danger')
        return redirect(url_for('core.list_users'))
        
    try:
        user.password_hash = generate_password_hash(new_pass)
        db.session.commit()
        flash(f'Đã reset mật khẩu cho {user.username}!', 'success')
    except Exception as e:
        flash(f'Lỗi: {str(e)}', 'danger')
        
    return redirect(url_for('core.list_users'))


# --- Deletion Approval Routes ---

@core_bp.route('/request-delete/<string:table_name>/<int:record_id>', methods=['POST'])
@login_required
def request_delete(table_name, record_id):
    reason = request.form.get('reason', '')
    req = DeletionRequest(
        table_name=table_name,
        record_id=record_id,
        requested_by=session.get('username'),
        reason=reason
    )
    db.session.add(req)
    db.session.commit()
    flash('Yêu cầu xóa đã được gửi cho admin duyệt.', 'info')
    return redirect(request.referrer or url_for('smartw.vhkt'))


@core_bp.route('/admin')
@core_bp.route('/admin-panel')
@login_required
@admin_required
def admin():
    """Cấu Hình page — lightweight: users, requests, smartw only."""
    users = User.query.all()
    reqs = DeletionRequest.query.filter_by(status='Pending').order_by(DeletionRequest.timestamp.desc()).all()
    pending_req_count = DeletionRequest.query.filter_by(status='Pending').count()
    active_tab = request.args.get('tab', 'users')

    # SmartW config
    from smartw.config import load_smartw_config
    smartw_cfg = load_smartw_config()
    smartw_configured = smartw_cfg is not None
    smartw_username = smartw_cfg.get('username', '') if smartw_cfg else ''
    smartw_updated_at = smartw_cfg.get('updated_at', '') if smartw_cfg else ''

    # DataSite config
    from models import SystemConfig
    ds_user_conf = SystemConfig.query.filter_by(key='datasite_username').first()
    datasite_configured = ds_user_conf is not None and bool(ds_user_conf.value)
    datasite_username = ds_user_conf.value if ds_user_conf else ''

    return render_template('admin_panel.html', users=users, requests=reqs,
                           pending_req_count=pending_req_count,
                           active_tab=active_tab,
                           smartw_configured=smartw_configured, smartw_username=smartw_username,
                           smartw_updated_at=smartw_updated_at,
                           datasite_configured=datasite_configured, datasite_username=datasite_username)


@core_bp.route('/admin/mpd')
@login_required
@admin_required
def admin_mpd():
    """Quản lý MPĐ — reports, logs, infos with conditional loading."""
    now = datetime.now()
    active_tab = request.args.get('tab', 'reports')

    # Shared filter setup
    filter_month_raw = request.args.get('filter_month', str(now.month))
    filter_year_raw = request.args.get('filter_year', str(now.year))
    try:
        fy = int(filter_year_raw)
    except (ValueError, TypeError):
        fy = now.year
    if filter_month_raw and filter_month_raw.strip():
        try:
            fm = int(filter_month_raw)
        except (ValueError, TypeError):
            fm = now.month
    else:
        fm = now.month

    if fm:
        month_start = f"{fy}-{fm:02d}-01"
        month_end = f"{fy}-{fm+1:02d}-01" if fm < 12 else f"{fy+1}-01-01"
    else:
        month_start = f"{fy}-01-01"
        month_end = f"{fy+1}-01-01"

    available_years = list(range(2025, now.year + 1))

    # Safe defaults
    station_summary = []
    payment_data = {}
    huyen_list = []
    huyen_filter = None
    gen_logs = []
    infos = []
    invoices = []
    daily_totals = {}
    gmail_user = ""
    gmail_subject_filter = ""
    missing_logs_recommendations = []

    if active_tab == 'reports':
        huyen_filter = request.args.get('huyen')
        huyen_list = [h[0] for h in db.session.query(GeneralInfo.huyen).distinct().all() if h[0]]

        station_summary_all = get_audit_data(huyen_filter, month_start, month_end)
        station_summary = sorted(
            [s for s in station_summary_all if s.get('gen_count', 0) > 0 or s.get('total_refill', 0) > 0],
            key=lambda x: x.get('ton_real', 0), reverse=True
        )
        missing_logs_recommendations = get_missing_logs_recommendations(huyen_filter, month_start, month_end)

        # Payment aggregation
        from sqlalchemy import func as fn
        purchase_q = db.session.query(
            FuelLedger.nguoi_thuc_hien, FuelLedger.nha_cung_cap, fn.sum(FuelLedger.thanh_tien)
        ).filter(
            FuelLedger.ngay >= month_start, FuelLedger.ngay < month_end,
            FuelLedger.type.in_(['STOCK_IN', 'DIRECT_BUY'])
        ).group_by(FuelLedger.nguoi_thuc_hien, FuelLedger.nha_cung_cap).all()

        legacy_q = db.session.query(
            FuelPurchaseLog.nguoi_mua, FuelPurchaseLog.nha_cung_cap, fn.sum(FuelPurchaseLog.thanh_tien)
        ).filter(
            FuelPurchaseLog.ngay_mua >= month_start, FuelPurchaseLog.ngay_mua < month_end
        ).group_by(FuelPurchaseLog.nguoi_mua, FuelPurchaseLog.nha_cung_cap).all()

        expense_q = db.session.query(
            OtherExpense.nguoi_tam_ung, fn.sum(OtherExpense.so_tien)
        ).filter(
            OtherExpense.ngay_su_dung >= month_start, OtherExpense.ngay_su_dung < month_end
        ).group_by(OtherExpense.nguoi_tam_ung).all()

        def _add_purchase(name, source, amt):
            if name not in payment_data:
                payment_data[name] = {'mua_le': 0, 'cx222': 0, 'vnpt_vtl': 0, 'other_exp': 0, 'can_ck': 0}
            source_up = (source or '').strip().upper()
            if 'CX' in source_up or 'CÂY XĂNG' in source_up or 'CX222' in source_up:
                payment_data[name]['cx222'] += amt
            elif 'VNPT' in source_up or 'VTL' in source_up:
                payment_data[name]['vnpt_vtl'] += amt
                payment_data[name]['can_ck'] += amt
            else:
                payment_data[name]['mua_le'] += amt
                payment_data[name]['can_ck'] += amt

        for row in purchase_q:
            _add_purchase(row[0] or 'Không rõ', row[1], row[2] or 0)
        for row in legacy_q:
            _add_purchase(row[0] or 'Không rõ', row[1], row[2] or 0)
        for row in expense_q:
            name = row[0] or 'Không rõ'
            amt = row[1] or 0
            if name not in payment_data:
                payment_data[name] = {'mua_le': 0, 'cx222': 0, 'vnpt_vtl': 0, 'other_exp': 0, 'can_ck': 0}
            payment_data[name]['other_exp'] += amt
            payment_data[name]['can_ck'] += amt

    elif active_tab == 'logs':
        gen_logs = GeneratorLog.query.filter(
            GeneratorLog.ngay_van_hanh >= month_start,
            GeneratorLog.ngay_van_hanh < month_end
        ).order_by(GeneratorLog.ngay_van_hanh.desc()).all()

    elif active_tab == 'invoice':
        from models import ParsedInvoice, SystemConfig
        invoices = ParsedInvoice.query.filter(
            ParsedInvoice.ngay_lap >= month_start,
            ParsedInvoice.ngay_lap < month_end,
            ParsedInvoice.status != 'Discarded'
        ).order_by(ParsedInvoice.ngay_lap.asc(), ParsedInvoice.id.asc()).all()

        daily_totals = {}
        for inv in invoices:
            date_str = inv.ngay_lap
            daily_totals[date_str] = daily_totals.get(date_str, 0.0) + inv.tong_tien

        g_user = SystemConfig.query.filter_by(key='gmail_user').first()
        gmail_user = g_user.value if g_user else ""
        g_filter = SystemConfig.query.filter_by(key='gmail_subject_filter').first()
        gmail_subject_filter = g_filter.value if g_filter else "Hóa đơn;hoadon;invoice;hddt"

    elif active_tab == 'infos':
        infos = GeneralInfo.query.order_by(GeneralInfo.id_tram).all()

    # Variables needed by _modals_admin.html (included in template)
    stations = GeneralInfo.query.order_by(GeneralInfo.id_tram).all()
    from models import User
    users = User.query.all()

    return render_template('admin_mpd.html',
                           active_tab=active_tab,
                           station_summary=station_summary,
                           payment_data=payment_data,
                           huyen_list=huyen_list,
                           selected_huyen=huyen_filter,
                           filter_month=fm, filter_year=fy,
                           available_years=available_years,
                           logs=gen_logs,
                           infos=infos,
                           now_date=now.strftime('%Y-%m-%d'),
                           stations=stations,
                           users=users,
                           missing_logs_recommendations=missing_logs_recommendations,
                           invoices=invoices,
                           daily_totals=daily_totals,
                           gmail_user=gmail_user,
                           gmail_subject_filter=gmail_subject_filter)


@core_bp.route('/admin/requests/approve/<int:req_id>', methods=['POST'])
@login_required
@admin_required
def approve_deletion(req_id):
    req = DeletionRequest.query.get_or_404(req_id)
    model_map = {
        'GeneralInfo': GeneralInfo,
        'GeneratorLog': GeneratorLog,
        'PowerSchedule': PowerSchedule,
        'FuelRefillLog': FuelRefillLog,
        'FuelPurchaseLog': FuelPurchaseLog,
        'OtherExpense': OtherExpense
    }
    model = model_map.get(req.table_name)
    if model:
        record = model.query.get(req.record_id)
        if record:
            db.session.delete(record)
    
    req.status = 'Approved'
    db.session.commit()
    flash('Đã phê duyệt và xóa bản ghi!', 'success')
    return redirect(url_for('core.admin'))


@core_bp.route('/admin/requests/reject/<int:req_id>', methods=['POST'])
@login_required
@admin_required
def reject_deletion(req_id):
    req = DeletionRequest.query.get_or_404(req_id)
    req.status = 'Rejected'
    db.session.commit()
    flash('Đã từ chối yêu cầu xóa.', 'warning')
    return redirect(url_for('core.admin'))


# --- PAYMENT TRACKING HELPERS ---

PAYMENT_FILE = os.path.join(os.path.dirname(__file__), '..', 'payment_records.json')
PAYMENT_GROUPS_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'payment_groups.json')

def load_payment_records():
    """Load payment records from JSON file."""
    try:
        if os.path.exists(PAYMENT_FILE):
            with open(PAYMENT_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception:
        pass
    return {}

def save_payment_records(data):
    """Save payment records to JSON file."""
    with open(PAYMENT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def load_payment_groups():
    """Load payment group records (mua_ngoai, cx222) from OtherExpense table."""
    default = {
        'mua_ngoai': {'da_thanh_toan_den': '', 'so_tien_da_tt': 0, 'tong_tien_nhan': 0, 'ghi_chu': '', 'updated_at': '', 'updated_by': ''},
        'cx222':     {'da_thanh_toan_den': '', 'so_tien_da_tt': 0, 'tong_tien_nhan': 0, 'ghi_chu': '', 'updated_at': '', 'updated_by': ''}
    }
    try:
        rows = OtherExpense.query.filter(OtherExpense.noi_dung.like('SYSTEM_PAYMENT_GROUP_%')).all()
        for row in rows:
            group_name = row.noi_dung.replace('SYSTEM_PAYMENT_GROUP_', '')
            if group_name in default:
                try:
                    loaded = json.loads(row.ghi_chu)
                    default[group_name].update(loaded)
                except Exception:
                    pass
    except Exception:
        pass
    return default

def save_payment_groups(data):
    """Save payment group records to OtherExpense table."""
    for group_name, group_data in data.items():
        noi_dung = f"SYSTEM_PAYMENT_GROUP_{group_name}"
        row = OtherExpense.query.filter_by(noi_dung=noi_dung).first()
        if not row:
            row = OtherExpense(
                noi_dung=noi_dung,
                so_tien=0.0,
                du_an='SYSTEM',
                nguoi_tam_ung='SYSTEM',
                ngay_su_dung=group_data.get('da_thanh_toan_den', '') or datetime.now().strftime('%Y-%m-%d'),
                ghi_chu=json.dumps(group_data, ensure_ascii=False),
                ngay_cap_nhat=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            )
            db.session.add(row)
        else:
            row.ngay_su_dung = group_data.get('da_thanh_toan_den', '') or datetime.now().strftime('%Y-%m-%d')
            row.ghi_chu = json.dumps(group_data, ensure_ascii=False)
            row.ngay_cap_nhat = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    db.session.commit()


# --- REPORTS ROUTE ---

@core_bp.route('/admin/reports')
@login_required
@cost_access_required
def admin_reports():
    from sqlalchemy import func
    
    purchase_stats = db.session.query(
        FuelPurchaseLog.nguoi_mua, 
        func.sum(FuelPurchaseLog.so_luong), 
        func.sum(FuelPurchaseLog.thanh_tien)
    ).group_by(FuelPurchaseLog.nguoi_mua).all()
    
    expense_stats = db.session.query(
        OtherExpense.nguoi_tam_ung, 
        func.sum(OtherExpense.so_tien)
    ).group_by(OtherExpense.nguoi_tam_ung).all()
    
    employee_data = {}
    for p in purchase_stats:
        name = p[0] or 'Unknown'
        if name not in employee_data: employee_data[name] = {'fuel_amt': 0, 'other_amt': 0, 'total': 0, 'fuel_qty': 0}
        employee_data[name]['fuel_qty'] += (p[1] or 0)
        employee_data[name]['fuel_amt'] += (p[2] or 0)
        employee_data[name]['total'] += (p[2] or 0)
        
    for e in expense_stats:
        name = e[0] or 'Unknown'
        if name not in employee_data: employee_data[name] = {'fuel_amt': 0, 'other_amt': 0, 'total': 0, 'fuel_qty': 0}
        employee_data[name]['other_amt'] += (e[1] or 0)
        employee_data[name]['total'] += (e[1] or 0)

    source_stats = db.session.query(
        FuelPurchaseLog.nha_cung_cap,
        func.sum(FuelPurchaseLog.thanh_tien)
    ).group_by(FuelPurchaseLog.nha_cung_cap).all()

    current_year = datetime.now().year
    monthly_data = db.session.query(
        func.substr(FuelPurchaseLog.ngay_mua, 1, 7).label('month'),
        func.sum(FuelPurchaseLog.thanh_tien)
    ).filter(FuelPurchaseLog.ngay_mua.like(f'{current_year}%'))\
    .group_by('month').order_by('month').all()

    huyen_filter = request.args.get('huyen')
    huyen_list = [h[0] for h in db.session.query(GeneralInfo.huyen).distinct().all() if h[0]]
    
    import calendar
    now = datetime.now()
    filter_year = request.args.get('year', str(now.year))
    filter_month = request.args.get('month', '')
    
    try:
        fy = int(filter_year)
    except (ValueError, TypeError):
        fy = now.year
    
    if filter_month:
        try:
            fm = int(filter_month)
            start_date = f"{fy}-{fm:02d}-01"
            last_day = calendar.monthrange(fy, fm)[1]
            end_date = f"{fy}-{fm:02d}-{last_day}"
        except (ValueError, TypeError):
            fm = None
            start_date = f"{fy}-01-01"
            end_date = f"{fy}-12-31"
    else:
        fm = None
        start_date = f"{fy}-01-01"
        end_date = f"{fy}-12-31"
    
    available_years = list(range(2025, now.year + 1))
    station_summary = get_audit_data(huyen_filter, start_date, end_date)
    missing_logs_recommendations = get_missing_logs_recommendations(huyen_filter, start_date, end_date)

    # Load payment records (legacy)
    payment_records = load_payment_records()

    # Load payment groups (new: mua_ngoai + cx222)
    payment_groups = load_payment_groups()

    # Tính tổng phát sinh theo 2 nhóm trong kỳ lọc
    from sqlalchemy import func as _fn
    fuel_group_q = db.session.query(
        FuelLedger.nha_cung_cap,
        _fn.sum(FuelLedger.thanh_tien)
    ).filter(
        FuelLedger.ngay >= start_date,
        FuelLedger.ngay <= end_date,
        FuelLedger.type.in_(['STOCK_IN', 'DIRECT_BUY'])
    ).group_by(FuelLedger.nha_cung_cap).all()

    cx222_total = 0
    mua_ngoai_total = 0
    for ncc, amt in fuel_group_q:
        ncc_up = (ncc or '').strip().upper()
        if 'CX' in ncc_up or 'CÂY XĂNG' in ncc_up or 'CX222' in ncc_up:
            cx222_total += (amt or 0)
        else:
            mua_ngoai_total += (amt or 0)

    # Cộng thêm OtherExpense vào mua_ngoai
    oe_total = db.session.query(_fn.sum(OtherExpense.so_tien)).filter(
        OtherExpense.ngay_su_dung >= start_date,
        OtherExpense.ngay_su_dung <= end_date
    ).scalar() or 0
    mua_ngoai_total += oe_total

    # --- CALCULATE CUMULATIVE TOTALS (LŨY KẾ) FOR CARDS ---
    accum_start = "2026-02-16"
    calc_up_to = request.args.get('calc_up_to', '').strip()
    if not calc_up_to:
        calc_up_to = datetime.now().strftime('%Y-%m-%d')
    fuel_accum_q = db.session.query(
        FuelLedger.nha_cung_cap, _fn.sum(FuelLedger.thanh_tien)
    ).filter(
        FuelLedger.ngay >= accum_start,
        FuelLedger.ngay <= calc_up_to,
        FuelLedger.type.in_(['STOCK_IN', 'DIRECT_BUY', 'VEHICLE_FUEL'])
    ).group_by(FuelLedger.nha_cung_cap).all()
    
    mua_ngoai_accum = 0
    cx222_accum = 0
    for ncc_a, amt_a in fuel_accum_q:
        ncc_up_a = (ncc_a or '').strip().upper()
        if 'CX' in ncc_up_a or 'CÂY XĂNG' in ncc_up_a or 'CX222' in ncc_up_a:
            cx222_accum += (amt_a or 0)
        else:
            mua_ngoai_accum += (amt_a or 0)
    
    oe_accum = db.session.query(_fn.sum(OtherExpense.so_tien)).filter(
        OtherExpense.ngay_su_dung >= accum_start,
        OtherExpense.ngay_su_dung <= calc_up_to,
        ~OtherExpense.noi_dung.like('SYSTEM_PAYMENT_GROUP_%')
    ).scalar() or 0
    mua_ngoai_accum += oe_accum

    # Tính phát sinh MỚI sau ngày đã thanh toán
    def _calc_new_since(group_key, cutoff_date_str):
        """Tính phát sinh sau ngày cutoff đến hôm nay."""
        if not cutoff_date_str:
            return 0
        try:
            # cutoff phải là YYYY-MM-DD
            cutoff = cutoff_date_str
            today = calc_up_to
            if group_key == 'cx222':
                q = db.session.query(_fn.sum(FuelLedger.thanh_tien)).filter(
                    FuelLedger.ngay > cutoff,
                    FuelLedger.ngay <= today,
                    FuelLedger.type.in_(['STOCK_IN', 'DIRECT_BUY'])
                )
                result = 0
                for ncc, amt in db.session.query(FuelLedger.nha_cung_cap, _fn.sum(FuelLedger.thanh_tien)).filter(
                    FuelLedger.ngay > cutoff,
                    FuelLedger.ngay <= today,
                    FuelLedger.type.in_(['STOCK_IN', 'DIRECT_BUY'])
                ).group_by(FuelLedger.nha_cung_cap).all():
                    ncc_up = (ncc or '').strip().upper()
                    if 'CX' in ncc_up or 'CÂY XĂNG' in ncc_up or 'CX222' in ncc_up:
                        result += (amt or 0)
                return result
            else:  # mua_ngoai
                result = 0
                for ncc, amt in db.session.query(FuelLedger.nha_cung_cap, _fn.sum(FuelLedger.thanh_tien)).filter(
                    FuelLedger.ngay > cutoff,
                    FuelLedger.ngay <= today,
                    FuelLedger.type.in_(['STOCK_IN', 'DIRECT_BUY'])
                ).group_by(FuelLedger.nha_cung_cap).all():
                    ncc_up = (ncc or '').strip().upper()
                    if 'CX' not in ncc_up and 'CÂY XĂNG' not in ncc_up and 'CX222' not in ncc_up:
                        result += (amt or 0)
                # Cộng OtherExpense mới
                result += db.session.query(_fn.sum(OtherExpense.so_tien)).filter(
                    OtherExpense.ngay_su_dung > cutoff,
                    OtherExpense.ngay_su_dung <= today
                ).scalar() or 0
                return result
        except Exception:
            return 0

    mua_ngoai_new = _calc_new_since('mua_ngoai', payment_groups['mua_ngoai'].get('da_thanh_toan_den', ''))
    cx222_new = _calc_new_since('cx222', payment_groups['cx222'].get('da_thanh_toan_den', ''))

    return render_template('reports.html',
                           employee_data=employee_data,
                           source_stats=source_stats,
                           monthly_data=monthly_data,
                           year=current_year,
                           station_summary=station_summary,
                           huyen_list=huyen_list,
                           selected_huyen=huyen_filter,
                           filter_year=fy,
                           filter_month=fm,
                           available_years=available_years,
                           payment_records=payment_records,
                           payment_groups=payment_groups,
                           mua_ngoai_total=mua_ngoai_total,
                           cx222_total=cx222_total,
                           mua_ngoai_accum=mua_ngoai_accum,
                           cx222_accum=cx222_accum,
                           mua_ngoai_new=mua_ngoai_new,
                           cx222_new=cx222_new,
                           calc_up_to=calc_up_to,
                           missing_logs_recommendations=missing_logs_recommendations)


@core_bp.route('/admin/save-payment', methods=['POST'])
@login_required
@admin_required
def save_payment():
    """Save/update payment record for a payer (employee or supplier) [legacy]."""
    data = request.get_json()
    if not data:
        return jsonify({'ok': False, 'msg': 'No data'}), 400

    key = data.get('key', '').strip()      # e.g. "Tuấn" or "CX222"
    da_tt = data.get('da_tt', 0)
    ghi_chu = data.get('ghi_chu', '').strip()

    if not key:
        return jsonify({'ok': False, 'msg': 'Thiếu key'}), 400

    records = load_payment_records()
    records[key] = {
        'da_tt': float(da_tt),
        'ghi_chu': ghi_chu,
        'updated_at': datetime.now().strftime('%Y-%m-%d %H:%M')
    }
    save_payment_records(records)
    return jsonify({'ok': True})


@core_bp.route('/admin/save-payment-group', methods=['POST'])
@login_required
@admin_required
def save_payment_group():
    """Save/update payment group record (mua_ngoai or cx222)."""
    data = request.get_json()
    if not data:
        return jsonify({'ok': False, 'msg': 'No data'}), 400

    group = data.get('group', '').strip()   # 'mua_ngoai' or 'cx222'
    da_thanh_toan_den = data.get('da_thanh_toan_den', '').strip()  # YYYY-MM-DD
    so_tien_da_tt = data.get('so_tien_da_tt', 0)
    tong_tien_nhan = data.get('tong_tien_nhan')
    ghi_chu = data.get('ghi_chu', '').strip()

    if group not in ('mua_ngoai', 'cx222'):
        return jsonify({'ok': False, 'msg': 'Nhóm không hợp lệ'}), 400

    records = load_payment_groups()
    if tong_tien_nhan is not None:
        records[group]['tong_tien_nhan'] = float(tong_tien_nhan)
        
    records[group].update({
        'da_thanh_toan_den': da_thanh_toan_den,
        'so_tien_da_tt': float(so_tien_da_tt),
        'ghi_chu': ghi_chu,
        'updated_at': datetime.now().strftime('%Y-%m-%d %H:%M'),
        'updated_by': session.get('username', '')
    })
    try:
        save_payment_groups(records)
    except Exception as e:
        return jsonify({'ok': False, 'msg': str(e)}), 500
    return jsonify({'ok': True})


@core_bp.route('/export/station-summary')
@login_required
def export_station_summary():
    import calendar
    huyen_filter = request.args.get('huyen')
    now = datetime.now()
    filter_year = request.args.get('year', str(now.year))
    filter_month = request.args.get('month', '')
    
    try:
        fy = int(filter_year)
    except (ValueError, TypeError):
        fy = now.year
    
    if filter_month:
        try:
            fm = int(filter_month)
            start_date = f"{fy}-{fm:02d}-01"
            last_day = calendar.monthrange(fy, fm)[1]
            end_date = f"{fy}-{fm:02d}-{last_day}"
        except (ValueError, TypeError):
            start_date = f"{fy}-01-01"
            end_date = f"{fy}-12-31"
    else:
        start_date = f"{fy}-01-01"
        end_date = f"{fy}-12-31"
    
    data = get_audit_data(huyen_filter, start_date, end_date)
    if not data:
        flash('Không có dữ liệu để xuất.', 'error')
        return redirect(url_for('core.admin_reports'))
    df = pd.DataFrame(data)
    col_map = {
        'id_tram': 'ID Trạm', 'huyen': 'Huyện', 'may_phat': 'Máy phát',
        'dung_tich': 'Dung tích (L)', 'loai_may': 'Loại máy', 'loai_nl': 'Loại NL',
        'dm_thuc_te': 'ĐM Thực tế', 'dm_thanh_toan': 'ĐM Thanh toán',
        'gen_count': 'Số lần chạy', 'run_h': 'Tổng giờ (h)', 
        'gen_fuel': 'NL tiêu hao (L)', 'gen_cost': 'Thanh toán chạy máy',
        'direct_buy_qty': 'Mua trực tiếp (L)', 'station_out_qty': 'Xuất kho (L)',
        'total_refill': 'Tổng đổ (L)', 'fuel_cost': 'Chi phí mua NL',
        'actual_cons': 'Tiêu hao ĐM TT', 'max_cons': 'Tiêu hao ĐM TT',
        'ton_real': 'NL tồn (lũy kế)', 'ton_min': 'NL tồn min (lũy kế)',
        'outages_cnt': 'Số lần cúp điện', 'chenh_lech': 'Chênh lệch (TT - Mua)'
    }
    df = df.rename(columns=col_map)
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Station Summary')
    output.seek(0)
    return send_file(output, download_name=f"station_summary_{datetime.now().strftime('%Y%m%d')}.xlsx",
                     as_attachment=True, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')


# --- AUDIT ---

@core_bp.route('/audit')
@login_required
def audit():
    return redirect(url_for('core.admin'))


@core_bp.route('/audit/export')
@login_required
def export_audit():
    huyen_filter = request.args.get('huyen')
    data = get_audit_data(huyen_filter)
    df = pd.DataFrame(data)
    
    col_map = {
        'id_tram': 'Mã Trạm', 'huyen': 'Huyện', 'run_h': 'Tổng giờ chạy (h)', 
        'fuel_used': 'Tiêu hao thực (L)', 'refill': 'Tổng dầu đổ (L)', 
        'theo_max': 'Định mức tối đa (L)', 'ton': 'Dầu tồn uớc tính (L)',
        'outages': 'Số lần cúp điện (2026)', 'reasons': 'Ghi chú bất thường'
    }
    df = df.rename(columns=col_map)
    df = df[[v for v in col_map.values() if v in df.columns]]
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Audit KPI')
    output.seek(0)
    
    return send_file(output, as_attachment=True, download_name=f"bao_cao_audit_kpi_{datetime.now().strftime('%Y%m%d')}.xlsx")


@core_bp.route('/audit/reset-oil/<id_tram>')
@login_required
@admin_required
def reset_oil(id_tram):
    try:
        last_refill = FuelRefillLog.query.filter_by(id_tram=id_tram).order_by(FuelRefillLog.id.desc()).first()
        if last_refill:
            last_refill.nhien_lieu_ton_uoc_luong = 0
            db.session.commit()
            flash(f'Đã reset tồn dầu trạm {id_tram} về 0', 'success')
        else:
            flash(f'Không có dữ liệu châm dầu để reset cho trạm {id_tram}', 'warning')
    except Exception as e:
        flash(f'Lỗi: {e}', 'danger')
    return redirect(url_for('core.audit'))


# --- ADMIN RESET DB ---

@core_bp.route('/admin/reset-db', methods=['POST'])
@login_required
@admin_required
def reset_db_route():
    try:
        db.drop_all()
        db.create_all()
        flash('Database đã được reset thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi reset database: {e}', 'danger')
    return redirect(url_for('core.admin'))
