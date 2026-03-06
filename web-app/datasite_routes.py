"""
DataSite Routes v2 — API cho 5 Nhóm DataSite (Refactor 2026-03-06)
"""
from flask import Blueprint, jsonify, request, session, render_template, redirect, url_for
from datasite_utils import import_all_datasite_samples
from datasite_scraper import perform_datasite_sync
import threading
import logging

datasite_bp = Blueprint('datasite', __name__)


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

    def background_sync():
        perform_datasite_sync()

    thread = threading.Thread(target=background_sync)
    thread.daemon = True
    thread.start()
    return jsonify({"success": True, "message": "DataSite Real Auto-Sync started in background."})


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
