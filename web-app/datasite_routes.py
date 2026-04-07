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

    query_id = request.args.get('q', request.args.get('site_id', '')).strip().upper()
    print(f"🕵️ SEARCH QUERY: '{query_id}'")
    if not query_id:
        return jsonify({"success": False, "message": "Vui lòng nhập mã trạm hoặc tên trạm."})

    from models import DsStation, DsContract, DsInfrastructure, DsEquipment, DsTelecom, DsTransmission, DsSiteRegistry, DsCellRegistry
    
    # 🕵️ Bước 1: Kiểm tra mapping ID Mới/Cũ trong Wireless Registry trước
    registry_match = DsSiteRegistry.query.filter(
        (DsSiteRegistry.site_id_new.ilike(f'%{query_id}%')) |
        (DsSiteRegistry.site_id_old.ilike(f'%{query_id}%'))
    ).first()

    # Nếu không thấy site, thử tìm qua cell
    if not registry_match:
        cell_match = DsCellRegistry.query.filter(
            (DsCellRegistry.cell_id_new.ilike(f'%{query_id}%')) |
            (DsCellRegistry.cell_id_old.ilike(f'%{query_id}%'))
        ).first()
        if cell_match:
            registry_match = DsSiteRegistry.query.filter_by(site_id_new=cell_match.site_id_new).first()

    # Tập hợp các Site ID liên quan để truy vấn các bảng khác (Tránh việc chỉ tìm theo 1 ID bị lệch)
    ids_to_query = [query_id]
    if registry_match:
        if registry_match.site_id_new: ids_to_query.append(registry_match.site_id_new)
        if registry_match.site_id_old: ids_to_query.append(registry_match.site_id_old)
    
    # Loại bỏ trùng lặp và rỗng
    ids_to_query = list(set(filter(None, ids_to_query)))
    print(f"   🔍 Querying for IDs: {ids_to_query}")

    # 🕵️ Bước 1.5: Thử tìm theo Tên Trạm nếu không thấy theo Mã Trạm
    station = DsStation.query.filter(
        (DsStation.site_id.in_(ids_to_query)) | 
        (DsStation.ten_tram.ilike(f'%{query_id}%'))
    ).first()
    
    if station:
        print(f"   Matches Station: {station.site_id} - {station.ten_tram}")
        if station.site_id not in ids_to_query:
            ids_to_query.append(station.site_id)
    
    # 🔍 Bước 2: Tìm dữ liệu con (Optimized: Get all assets in fewer hits)
    # Gom các bảng Telecom, Equipment, Infra để xử lý tập trung
    telecoms = DsTelecom.query.filter(DsTelecom.site_id.in_(ids_to_query)).all()
    equips = DsEquipment.query.filter(DsEquipment.site_id.in_(ids_to_query)).all()
    infras = DsInfrastructure.query.filter(DsInfrastructure.site_id.in_(ids_to_query)).all()
    
    # Lấy thông tin đơn lẻ
    transmission = DsTransmission.query.filter(DsTransmission.site_id.in_(ids_to_query)).first()
    contract = DsContract.query.filter(DsContract.site_id.in_(ids_to_query)).first()

    if not station and not infras and not equips and not telecoms and not transmission and not registry_match:
        # Fallback: tìm trong bảng Legacy
        from models import DataSiteAsset
        legacy = DataSiteAsset.query.filter(DataSiteAsset.site_id.in_(ids_to_query)).all()
        if legacy:
            grouped = {}
            for a in legacy:
                typ = a.asset_type
                if typ not in grouped:
                    grouped[typ] = []
                grouped[typ].append(a.to_dict())
            return jsonify({"success": True, "site_id": query_id, "data": grouped, "source": "legacy"})
        return jsonify({"success": False, "message": f"Không tìm thấy dữ liệu cho trạm: {query_id}"})

    # Group theo nhóm
    result = {}

    for item in infras:
        key = item.loai
        if key not in result: result[key] = []
        d = item.to_dict()
        if d.get('extra_data') and isinstance(d['extra_data'], dict):
            d.update(d.pop('extra_data'))
        else: d.pop('extra_data', None)
        result[key].append(d)

    for item in equips:
        key = item.loai
        if key not in result: result[key] = []
        d = item.to_dict()
        if d.get('extra_data') and isinstance(d['extra_data'], dict):
            d.update(d.pop('extra_data'))
        else: d.pop('extra_data', None)
        result[key].append(d)

    for item in telecoms:
        key = item.loai
        if key not in result: result[key] = []
        d = item.to_dict()
        if d.get('extra_data') and isinstance(d['extra_data'], dict):
            d.update(d.pop('extra_data'))
        else: d.pop('extra_data', None)
        result[key].append(d)

    station_dict = None
    if station:
        station_dict = station.to_dict()
        if station_dict.get('extra_data') and isinstance(station_dict['extra_data'], dict):
            station_dict.update(station_dict.pop('extra_data'))
        else: station_dict.pop('extra_data', None)

    # Tích hợp Wireless Registry vào data kết quả
    if registry_match:
        from models import DsCellRegistry
        cells = DsCellRegistry.query.filter_by(site_id_new=registry_match.site_id_new).all()
        heights_by_ran = {}
        for c in cells:
            if c.antenna_height is not None:
                h_str = str(c.antenna_height).strip()
                if h_str and h_str != 'None':
                    if c.ran_type not in heights_by_ran:
                        heights_by_ran[c.ran_type] = set()
                    heights_by_ran[c.ran_type].add(h_str)

        height_display_parts = []
        for ran in sorted(heights_by_ran.keys()):
            h_vals = sorted(list(heights_by_ran[ran]))
            if h_vals:
                height_display_parts.append(f"{ran}: {'/'.join(h_vals)}m")
        
        antenna_height_display = " - ".join(height_display_parts) if height_display_parts else (registry_match.antenna_height or '--')

        if 'WIRELESS' not in result: result['WIRELESS'] = []
        result['WIRELESS'].append({
            'site_id_new': registry_match.site_id_new,
            'site_id_old': registry_match.site_id_old,
            'antenna_height': registry_match.antenna_height,
            'antenna_height_display': antenna_height_display,
            'team': registry_match.team,
            'zone': registry_match.zone,
            'huyen': registry_match.huyen,
            'xa': registry_match.xa,
            'lat': registry_match.lat,
            'long': registry_match.long
        })

    # Tích hợp Truyền dẫn vào data kết quả để frontend render được tab TRUYEN_DAN
    if transmission:
        if 'TRUYEN_DAN' not in result: result['TRUYEN_DAN'] = []
        result['TRUYEN_DAN'].append(transmission.to_dict())

    return jsonify({
        "success": True,
        "site_id": station.site_id if station else (registry_match.site_id_new if registry_match else query_id),
        "station": station_dict,
        "contract": contract.to_dict() if contract else None,
        "transmission": transmission.to_dict() if transmission else None,
        "wireless": registry_match.to_dict() if registry_match else None,
        "data": result,
        "source": "v2"
    })

@datasite_bp.route('/api/wireless/cells', methods=['GET'])
def wireless_get_cells():
    """Lấy danh sách cells thuộc 1 site."""
    if 'username' not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    
    sid = request.args.get('site_id', '').strip().upper()
    if not sid:
        return jsonify({"success": False, "message": "Missing site_id"})
        
    from models import DsCellRegistry
    # Có thể site_id truyền vào là cũ hoặc mới, ta tìm cả hai
    cells = DsCellRegistry.query.filter(
        (DsCellRegistry.site_id_new == sid) | (DsCellRegistry.cell_id_new.ilike(f'{sid}%'))
    ).order_by(DsCellRegistry.cell_id_new).all()
    
    return jsonify({
        "success": True,
        "cells": [c.to_dict() for c in cells]
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

    from models import DsInfrastructure, DsEquipment, DsTelecom, DsStation, DsContract, DsTransmission, DsSiteRegistry, DsCellRegistry

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

    elif asset_type == 'TRUYEN_DAN':
        trans = DsTransmission.query.order_by(DsTransmission.site_id).all()
        items = [t.to_dict() for t in trans]

    elif asset_type == 'WIRELESS':
        sites = DsSiteRegistry.query.order_by(DsSiteRegistry.site_id_new).all()
        items = [s.to_dict() for s in sites]

    elif asset_type == 'DATACELL':
        cells = DsCellRegistry.query.order_by(DsCellRegistry.cell_id_new).all()
        items = [c.to_dict() for c in cells]

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


# ============================================================================
# API: Deep Sync — Phase 03 Export-based Sync
# ============================================================================

@datasite_bp.route('/api/datasite/sync/start', methods=['POST'])
def ds_deep_sync_start():
    """
    [Phase 03] Khởi động Deep Sync theo danh sách Đối tượng.

    Body JSON:
        {
            "objects": ["PHÒNG MÁY", "MÁY PHÁT ĐIỆN", ...],
            "area": "Long Khánh"  (optional)
        }

    - Validate objects dựa trên EXPORT_OBJECT_MAP
    - Chạy background thread
    - Broadcast tiến độ qua SSE: ds_sync_start, ds_sync_progress, ds_sync_object_done, ds_sync_done
    """
    if session.get('role') != 'admin':
        return jsonify({"success": False, "error": "Chỉ admin mới được thực hiện."}), 403

    data = request.get_json(silent=True) or {}
    objects = data.get('objects', [])
    area = data.get('area', None)

    if not objects or not isinstance(objects, list):
        return jsonify({"success": False, "error": "Vui lòng cung cấp danh sách 'objects'."}), 400

    # Validate: chỉ chấp nhận các object có trong EXPORT_OBJECT_MAP
    from datasite_sync_config import ALL_EXPORT_OBJECTS
    invalid = [o for o in objects if o not in ALL_EXPORT_OBJECTS]
    if invalid:
        return jsonify({
            "success": False,
            "error": f"Đối tượng không hợp lệ: {invalid}",
            "valid_objects": ALL_EXPORT_OBJECTS
        }), 400

    # Kiểm tra xem sync có đang chạy không
    from smartw.worker import _datasite_sync_running
    if _datasite_sync_running:
        return jsonify({
            "success": False,
            "error": "Đang có tiến trình đồng bộ đang chạy. Vui lòng đợi hoàn tất."
        }), 409

    # Lấy app context để truyền vào thread
    from flask import current_app
    app = current_app._get_current_object()

    def _background(flask_app, obj_list, area_name):
        with flask_app.app_context():
            from smartw.worker import run_datasite_export_sync
            run_datasite_export_sync(obj_list, area=area_name)

    t = threading.Thread(target=_background, args=(app, objects, area), daemon=True)
    t.start()

    add_datasite_log(f"[Deep Sync] Đã khởi động: {len(objects)} đối tượng — {', '.join(objects[:3])}{'...' if len(objects) > 3 else ''}")

    return jsonify({
        "success": True,
        "message": f"Đã bắt đầu đồng bộ {len(objects)} đối tượng. Theo dõi tiến độ qua SSE.",
        "objects": objects,
        "total": len(objects)
    })


@datasite_bp.route('/api/datasite/sync/status', methods=['GET'])
def ds_deep_sync_status():
    """[Phase 03] Trả về trạng thái hiện tại của Deep Sync job."""
    if 'username' not in session:
        return jsonify({"success": False, "error": "Unauthorized"}), 403

    from smartw.worker import get_datasite_sync_status
    status = get_datasite_sync_status()
    return jsonify({"success": True, "status": status})


@datasite_bp.route('/api/datasite/objects_map', methods=['GET'])
def ds_objects_map():
    """
    [Phase 03] Trả về toàn bộ EXPORT_OBJECT_MAP để frontend
    dùng hiển thị UI chọn đối tượng khi sync.
    """
    if 'username' not in session:
        return jsonify({"success": False, "error": "Unauthorized"}), 403

    from datasite_sync_config import EXPORT_OBJECT_MAP, UI_GROUPS

    # Group objects by ui_group for easy frontend rendering
    grouped = {}
    for obj_name, cfg in EXPORT_OBJECT_MAP.items():
        grp = cfg.get('ui_group', 'OTHER')
        if grp not in grouped:
            group_info = UI_GROUPS.get(grp, {'label': grp, 'icon': 'bi-box', 'color': 'secondary'})
            grouped[grp] = {
                'label': group_info['label'],
                'icon': group_info['icon'],
                'color': group_info['color'],
                'objects': []
            }
        grouped[grp]['objects'].append({
            'name': obj_name,
            'label': cfg.get('ui_label', obj_name),
            'db_table': cfg.get('db_table'),
            'loai': cfg.get('loai'),
        })

    return jsonify({
        "success": True,
        "groups": grouped,
        "total_objects": len(EXPORT_OBJECT_MAP)
    })


# ============================================================================
# API: Vô Tuyến — Site/Cell Registry (Bổ sung 2026-04-06)
# ============================================================================

@datasite_bp.route('/api/wireless/search', methods=['GET'])
def wireless_search():
    """Tìm kiếm SiteRegistry theo site_id (mới hoặc cũ) hoặc cell_id."""
    if 'username' not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    q = request.args.get('q', '').strip().upper()
    if not q:
        return jsonify({"success": False, "message": "Vui lòng nhập mã trạm hoặc cell."}), 400

    from models import DsSiteRegistry, DsCellRegistry

    # Tìm theo site_id_new hoặc site_id_old
    site = DsSiteRegistry.query.filter(
        (DsSiteRegistry.site_id_new.ilike(f'%{q}%')) |
        (DsSiteRegistry.site_id_old.ilike(f'%{q}%'))
    ).first()

    # Nếu không tìm thấy theo site, thử tìm theo cell_id
    if not site:
        cell = DsCellRegistry.query.filter(
            (DsCellRegistry.cell_id_new.ilike(f'%{q}%')) |
            (DsCellRegistry.cell_id_old.ilike(f'%{q}%'))
        ).first()
        if cell:
            site = DsSiteRegistry.query.filter_by(site_id_new=cell.site_id_new).first()

    if not site:
        return jsonify({"success": False, "message": f"Không tìm thấy Site/Cell nào với từ khoá: {q}"}), 404

    cells = DsCellRegistry.query.filter_by(site_id_new=site.site_id_new).order_by(DsCellRegistry.cell_id_new).all()

    return jsonify({
        "success": True,
        "site": site.to_dict(),
        "cells": [c.to_dict() for c in cells],
        "total_cells": len(cells)
    })


@datasite_bp.route('/api/wireless/cell/<string:cell_id>/update', methods=['POST'])
def wireless_update_cell(cell_id):
    """Cập nhật thông số Vô tuyến (Tilt/Azimuth/PCI) — ghi Audit Log."""
    if 'username' not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    from models import DsCellRegistry, DsWirelessHistory
    from extensions import db

    cell = DsCellRegistry.query.filter_by(cell_id_new=cell_id).first()
    if not cell:
        return jsonify({"success": False, "message": f"Không tìm thấy Cell: {cell_id}"}), 404

    data = request.get_json(silent=True) or {}
    allowed_fields = ['tilt', 'azimuth', 'pci_psc', 'antenna_height']
    changed_by = session.get('username', 'unknown')
    note = data.get('note', '')

    changes_made = []
    try:
        for field in allowed_fields:
            if field in data:
                old_val = getattr(cell, field)
                new_val = data[field]
                if str(old_val) != str(new_val):
                    # Ghi audit log (Enterprise)
                    history = DsWirelessHistory(
                        cell_id_new=cell_id,
                        parameter=field.upper(),
                        old_value=str(old_val) if old_val is not None else '',
                        new_value=str(new_val),
                        change_type='MANUAL',
                        changed_by=changed_by,
                        note=note
                    )
                    db.session.add(history)
                    setattr(cell, field, new_val)
                    changes_made.append(f"{field.upper()}: {old_val} → {new_val}")

        cell.sync_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Đồng bộ độ cao Anten cho các cell cùng công nghệ RAN (3G/4G/5G)
        if 'antenna_height' in data:
            new_height = data['antenna_height']
            other_cells = DsCellRegistry.query.filter(
                DsCellRegistry.site_id_new == cell.site_id_new,
                DsCellRegistry.ran_type == cell.ran_type,
                DsCellRegistry.cell_id_new != cell_id
            ).all()
            
            for oc in other_cells:
                old_h = oc.antenna_height
                if str(old_h) != str(new_height):
                    oc.antenna_height = new_height
                    oc.sync_date = cell.sync_date
                    db.session.add(DsWirelessHistory(
                        cell_id_new=oc.cell_id_new,
                        parameter='ANTENNA_HEIGHT',
                        old_value=str(old_h) if old_h is not None else '',
                        new_value=str(new_height),
                        change_type='AUTO_SYNC_RAN',
                        changed_by=changed_by,
                        note=f"Đồng bộ tự động theo cell {cell_id}"
                    ))
        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Đã cập nhật {len(changes_made)} thông số.",
            "changes": changes_made
        })
    except Exception as e:
        db.session.rollback()
        logging.error(f"Wireless update error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


@datasite_bp.route('/api/wireless/cell/<string:cell_id>/history', methods=['GET'])
def wireless_cell_history(cell_id):
    """Lấy lịch sử thay đổi thông số vô tuyến của một Cell."""
    if 'username' not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    from models import DsWirelessHistory
    logs = DsWirelessHistory.query.filter_by(cell_id_new=cell_id)\
        .order_by(DsWirelessHistory.changed_at.desc()).limit(50).all()

    return jsonify({
        "success": True,
        "cell_id": cell_id,
        "history": [h.to_dict() for h in logs]
    })
