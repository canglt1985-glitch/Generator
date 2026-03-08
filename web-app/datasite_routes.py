"""
DataSite Routes v2 — API cho 5 Nhóm DataSite (Refactor 2026-03-06)
"""
from flask import Blueprint, jsonify, request, session, render_template, redirect, url_for
from datasite_utils import import_all_datasite_samples
from datasite_scraper import perform_datasite_sync_real
import threading
import logging
from datetime import datetime

datasite_bp = Blueprint('datasite', __name__)

# Global storage for sync logs (simple list for MVP)
datasite_sync_logs = []

def add_datasite_log(message):
    now = datetime.now().strftime("%H:%M:%S")
    log_entry = f"[{now}] {message}"
    datasite_sync_logs.append(log_entry)
    # Keep only last 50 logs
    if len(datasite_sync_logs) > 50:
        datasite_sync_logs.pop(0)

@datasite_bp.route('/api/datasite/sync_logs', methods=['GET'])
def get_sync_logs():
    return jsonify({"success": True, "logs": datasite_sync_logs})


# ============================================================================
# PAGE: Dashboard
# ============================================================================

@datasite_bp.route('/datasite', methods=['GET'])
def datasite_dashboard():
    if 'username' not in session:
        return redirect(url_for('core.login', next='/datasite'))
    return render_template('datasite/datasite_dashboard.html')


# ============================================================================
# API: Sync (Import Excel từ thư mục local hoặc Web)
# ============================================================================

@datasite_bp.route('/api/datasite/sync_mock', methods=['POST'])
def sync_mock():
    if session.get('role') != 'admin':
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    try:
        results = import_all_datasite_samples()
        total = sum(v for v in results.values() if isinstance(v, int) and v > 0)
        return jsonify({
            "success": True,
            "message": f"Import v2 done. {total} records.",
            "details": results
        })
    except Exception as e:
        logging.error(f"Sync mock error: {e}")
        return jsonify({"success": False, "message": str(e)})


@datasite_bp.route('/api/datasite/sync_real', methods=['POST'])
def sync_real():
    if session.get('role') != 'admin':
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    from datasite_scraper import perform_datasite_sync_real
    import asyncio
    from flask import current_app
    
    data = request.get_json() or {}
    targets = data.get('targets', [])

    # Clear previous logs and start new session
    global datasite_sync_logs
    datasite_sync_logs.clear()
    add_datasite_log(f"Bắt đầu đồng bộ cho: {', '.join(targets) if targets else 'tất cả'}")

    # Lấy app object hiện tại ra để truyền vào thread
    app = current_app._get_current_object()

    def background_sync(flask_app, sync_targets):
        with flask_app.app_context():
            asyncio.run(perform_datasite_sync_real(sync_targets))

    thread = threading.Thread(target=background_sync, args=(app, targets))
    thread.daemon = True
    thread.start()
    
    target_msg = ", ".join(targets) if targets else "tất cả"
    return jsonify({"success": True, "message": f"Đang tiến hành đồng bộ DataSite tự động cho hạng mục: {target_msg}."})


# ============================================================================
# API: Config (Lưu tài khoản DataSite)
# ============================================================================

@datasite_bp.route('/api/datasite/save_config', methods=['POST'])
def save_config():
    from flask import flash, redirect, url_for
    from models import SystemConfig
    from extensions import db

    if session.get('role') != 'admin':
        flash("Bạn không có quyền lưu cấu hình.", "danger")
        return redirect(url_for('core.admin', tab='datasite'))

    ds_user = request.form.get('datasite_username', '').strip()
    ds_pass = request.form.get('datasite_password', '')

    try:
        # Username
        conf_user = SystemConfig.query.filter_by(key='datasite_username').first()
        if not conf_user:
            conf_user = SystemConfig(key='datasite_username', description='Tài khoản đăng nhập DataSite')
            db.session.add(conf_user)
        conf_user.value = ds_user
        conf_user.updated_by = session.get('username')
        from datetime import datetime
        conf_user.updated_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # Password (only update if provided)
        if ds_pass:
            conf_pass = SystemConfig.query.filter_by(key='datasite_password').first()
            if not conf_pass:
                conf_pass = SystemConfig(key='datasite_password', description='Mật khẩu đăng nhập DataSite')
                db.session.add(conf_pass)
            
            # TODO: Consider encrypting the password in the database
            conf_pass.value = ds_pass
            conf_pass.updated_by = session.get('username')
            conf_pass.updated_at = conf_user.updated_at

        db.session.commit()
        flash("Lưu tài khoản DataSite thành công!", "success")
    except Exception as e:
        db.session.rollback()
        flash(f"Lỗi khi lưu cấu hình: {e}", "danger")

    return redirect(url_for('core.admin', tab='datasite'))


@datasite_bp.route('/api/datasite/sync_from_smartw', methods=['POST'])
def sync_from_smartw():
    from smartw.config import load_smartw_config
    from models import SystemConfig
    from extensions import db
    from datetime import datetime

    if session.get('role') != 'admin':
        return jsonify({"success": False, "error": "Bạn không có quyền."}), 403

    smartw_cfg = load_smartw_config()
    if not smartw_cfg:
        return jsonify({"success": False, "error": "Chưa có cấu hình SmartW để đồng bộ."})

    try:
        # Save Username
        conf_user = SystemConfig.query.filter_by(key='datasite_username').first()
        if not conf_user:
            conf_user = SystemConfig(key='datasite_username', description='Tài khoản đăng nhập DataSite')
            db.session.add(conf_user)
        conf_user.value = smartw_cfg['username']
        conf_user.updated_by = session.get('username')
        conf_user.updated_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # Save Password
        conf_pass = SystemConfig.query.filter_by(key='datasite_password').first()
        if not conf_pass:
            conf_pass = SystemConfig(key='datasite_password', description='Mật khẩu đăng nhập DataSite')
            db.session.add(conf_pass)
        conf_pass.value = smartw_cfg['password']
        conf_pass.updated_by = session.get('username')
        conf_pass.updated_at = conf_user.updated_at

        db.session.commit()
        return jsonify({"success": True, "message": "Đã đồng bộ từ SmartW!"})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)})

# ============================================================================
# API: Tra cứu theo Trạm (Search)
# ============================================================================

@datasite_bp.route('/api/datasite/search', methods=['GET'])
def ds_search():
    if 'username' not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    site_id = request.args.get('site_id', '').strip().upper()
    if not site_id:
        return jsonify({"success": False, "message": "Vui lòng nhập mã trạm."})

    from models import DsStation, DsContract, DsInfrastructure, DsEquipment, DsTelecom

    # Tìm trạm
    station = DsStation.query.filter(DsStation.site_id.ilike(f'%{site_id}%')).first()

    # Tìm hợp đồng
    contract = DsContract.query.filter(DsContract.site_id.ilike(f'%{site_id}%')).first()

    # Tìm hạ tầng
    infras = DsInfrastructure.query.filter(DsInfrastructure.site_id.ilike(f'%{site_id}%')).all()

    # Tìm phụ trợ
    equips = DsEquipment.query.filter(DsEquipment.site_id.ilike(f'%{site_id}%')).all()

    # Tìm kỹ thuật
    telecoms = DsTelecom.query.filter(DsTelecom.site_id.ilike(f'%{site_id}%')).all()

    if not station and not infras and not equips and not telecoms:
        # Fallback: tìm trong bảng Legacy
        from models import DataSiteAsset
        legacy = DataSiteAsset.query.filter(DataSiteAsset.site_id.ilike(f'%{site_id}%')).all()
        if legacy:
            grouped = {}
            for a in legacy:
                typ = a.asset_type
                if typ not in grouped:
                    grouped[typ] = []
                grouped[typ].append(a.to_dict())
            return jsonify({"success": True, "site_id": site_id, "data": grouped, "source": "legacy"})
        return jsonify({"success": False, "message": "Không tìm thấy dữ liệu cho trạm này."})

    # Group theo nhóm
    result = {}

    # Hạ tầng — group by loai
    for item in infras:
        key = item.loai
        if key not in result:
            result[key] = []
        d = item.to_dict()
        # Flatten extra_data vào dict chính
        if d.get('extra_data') and isinstance(d['extra_data'], dict):
            d.update(d.pop('extra_data'))
        else:
            d.pop('extra_data', None)
        result[key].append(d)

    # Phụ trợ — group by loai
    for item in equips:
        key = item.loai
        if key not in result:
            result[key] = []
        d = item.to_dict()
        if d.get('extra_data') and isinstance(d['extra_data'], dict):
            d.update(d.pop('extra_data'))
        else:
            d.pop('extra_data', None)
        result[key].append(d)

    # Kỹ thuật — group by loai
    for item in telecoms:
        key = item.loai
        if key not in result:
            result[key] = []
        d = item.to_dict()
        if d.get('extra_data') and isinstance(d['extra_data'], dict):
            d.update(d.pop('extra_data'))
        else:
            d.pop('extra_data', None)
        result[key].append(d)

    station_dict = None
    if station:
        station_dict = station.to_dict()
        if station_dict.get('extra_data') and isinstance(station_dict['extra_data'], dict):
            station_dict.update(station_dict.pop('extra_data'))
        else:
            station_dict.pop('extra_data', None)

    return jsonify({
        "success": True,
        "site_id": site_id,
        "station": station_dict,
        "contract": contract.to_dict() if contract else None,
        "data": result,
        "source": "v2"
    })


# ============================================================================
# API: Tra cứu theo Loại Hạng Mục (by_type) — Toàn mạng
# ============================================================================

@datasite_bp.route('/api/datasite/assets/by_type', methods=['GET'])
def get_assets_by_type():
    if 'username' not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    asset_type = request.args.get('type', '').strip().upper()
    if not asset_type:
        return jsonify({"success": False, "message": "Vui lòng truyền type."})

    from models import DsInfrastructure, DsEquipment, DsTelecom, DsStation, DsContract

    items = []

    if asset_type == 'STATION':
        stations = DsStation.query.order_by(DsStation.site_id).all()
        for item in stations:
            d = item.to_dict()
            if d.get('extra_data') and isinstance(d['extra_data'], dict):
                d.update(d.pop('extra_data'))
            else:
                d.pop('extra_data', None)
            items.append(d)

    elif asset_type == 'CONTRACT':
        contracts = DsContract.query.order_by(DsContract.site_id).all()
        for item in contracts:
            d = item.to_dict()
            if d.get('extra_data') and isinstance(d['extra_data'], dict):
                d.update(d.pop('extra_data'))
            else:
                d.pop('extra_data', None)
            items.append(d)

    else:
        # Hạ tầng
        infras = DsInfrastructure.query.filter_by(loai=asset_type).order_by(DsInfrastructure.site_id).all()
        for item in infras:
            d = item.to_dict()
            if d.get('extra_data') and isinstance(d['extra_data'], dict):
                d.update(d.pop('extra_data'))
            else:
                d.pop('extra_data', None)
            items.append(d)

        # Phụ trợ
        equips = DsEquipment.query.filter_by(loai=asset_type).order_by(DsEquipment.site_id).all()
        for item in equips:
            d = item.to_dict()
            if d.get('extra_data') and isinstance(d['extra_data'], dict):
                d.update(d.pop('extra_data'))
            else:
                d.pop('extra_data', None)
            items.append(d)

        # Kỹ thuật
        telecoms = DsTelecom.query.filter_by(loai=asset_type).order_by(DsTelecom.site_id).all()
        for item in telecoms:
            d = item.to_dict()
            if d.get('extra_data') and isinstance(d['extra_data'], dict):
                d.update(d.pop('extra_data'))
            else:
                d.pop('extra_data', None)
            items.append(d)

        # Fallback Legacy nếu bảng mới chưa có data (chỉ áp dụng cho các type ko phải station/contract)
        if not items:
            from models import DataSiteAsset
            legacy = DataSiteAsset.query.filter_by(asset_type=asset_type).order_by(DataSiteAsset.site_id).all()
            items = [a.to_dict() for a in legacy]

    return jsonify({
        "success": True,
        "asset_type": asset_type,
        "total": len(items),
        "data": items
    })


# ============================================================================
# API: Anomalies (Cross-check)
# ============================================================================

@datasite_bp.route('/api/datasite/anomalies', methods=['GET'])
def get_anomalies():
    if session.get('role') != 'admin':
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    from models import DataSiteAnomaly
    anoms = DataSiteAnomaly.query.filter_by(is_resolved=False).order_by(
        DataSiteAnomaly.detected_at.desc()
    ).limit(200).all()
    return jsonify({
        "success": True,
        "data": [a.to_dict() for a in anoms]
    })


@datasite_bp.route('/api/datasite/run_crosscheck', methods=['POST'])
def run_crosscheck():
    """Chạy Cross-check dữ liệu DataSite. Admin only."""
    if session.get('role') != 'admin':
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    from models import (DsStation, DsInfrastructure, DsEquipment, DsTelecom,
                        DataSiteAnomaly, DsContract, db)
    from datetime import datetime

    # Clear cũ (chỉ giữ resolved)
    DataSiteAnomaly.query.filter_by(is_resolved=False).delete()

    anomalies_found = 0
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # --- CHECK 1: Trạm có thiết bị nhưng thiếu Hạ tầng ---
    equip_sites = set(e.site_id for e in DsEquipment.query.with_entities(DsEquipment.site_id).distinct())
    infra_sites = set(i.site_id for i in DsInfrastructure.query.with_entities(DsInfrastructure.site_id).distinct())

    for site in equip_sites - infra_sites:
        db.session.add(DataSiteAnomaly(
            site_id=site, issue_type='MISSING',
            description=f'Trạm {site} có thiết bị Phụ trợ nhưng chưa có thông tin Hạ tầng (Cột/Phòng Máy).',
            severity='warning', detected_at=now
        ))
        anomalies_found += 1

    # --- CHECK 2: Thiết bị thiếu Serial ---
    for eq in DsEquipment.query.filter(
        (DsEquipment.serial == '') | (DsEquipment.serial.is_(None))
    ).all():
        db.session.add(DataSiteAnomaly(
            site_id=eq.site_id, issue_type='MISSING',
            description=f'Thiết bị {eq.loai} tại {eq.site_id} thiếu Serial.',
            severity='info', detected_at=now
        ))
        anomalies_found += 1

    # --- CHECK 3: Hợp đồng hết hạn ---
    for c in DsContract.query.all():
        if c.tinh_trang_hd and 'hết' in c.tinh_trang_hd.lower():
            db.session.add(DataSiteAnomaly(
                site_id=c.site_id, issue_type='EXPIRED',
                description=f'Hợp đồng trạm {c.site_id} đã hết hạn. Tình trạng: {c.tinh_trang_hd}.',
                severity='critical', detected_at=now
            ))
            anomalies_found += 1

    db.session.commit()
    return jsonify({
        "success": True,
        "message": f"Cross-check hoàn tất. Phát hiện {anomalies_found} vấn đề.",
        "count": anomalies_found
    })
