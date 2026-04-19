"""
DataSite Service — Optimized for Rollback Recovery (2026-04-08)
Using openpyxl for maximum compatibility as requested.
"""
import os
import pandas as pd
from datetime import datetime
from io import BytesIO
from extensions import db
from models import (
    DsStation, DsContract, DsInfrastructure, DsEquipment, DsTelecom, 
    DsTransmission, DsSiteRegistry, DsCellRegistry, StationIssue
)

def export_assets_to_excel(asset_type):
    """Xuất danh sách tài sản dùng openpyxl."""
    items = []
    asset_type = asset_type.upper()
    
    if asset_type == 'STATION':
        items = [i.to_dict() for i in DsStation.query.all()]
    elif asset_type == 'CONTRACT':
        items = [i.to_dict() for i in DsContract.query.all()]
    elif asset_type == 'TRUYEN_DAN':
        items = [i.to_dict() for i in DsTransmission.query.all()]
    elif asset_type == 'WIRELESS':
        items = [i.to_dict() for i in DsSiteRegistry.query.all()]
    elif asset_type == 'DATACELL':
        items = [i.to_dict() for i in DsCellRegistry.query.all()]
    else:
        # Generic lookup for Equipments/Infra
        for model in [DsInfrastructure, DsEquipment, DsTelecom]:
            found = model.query.filter_by(loai=asset_type).all()
            if found:
                items = [i.to_dict() for i in found]
                break
    
    if not items:
        return None, "Không có dữ liệu để xuất."

    df = pd.DataFrame(items)
    # Clean up system columns
    for col in ['id', 'extra_data', 'sync_date']:
        if col in df.columns: df.drop(columns=[col], inplace=True)

    output = BytesIO()
    try:
        # Use openpyxl as per rollback preference
        writer = pd.ExcelWriter(output, engine='openpyxl')
        df.to_excel(writer, index=False, sheet_name=asset_type[:30])
        
        # Auto-adjust column width
        worksheet = writer.sheets[asset_type[:30]]
        for idx, col in enumerate(df.columns, 1):
            column_len = max(df[col].astype(str).str.len().max(), len(str(col))) + 2
            worksheet.column_dimensions[worksheet.cell(row=1, column=idx).column_letter].width = min(column_len, 50)
            
        writer.close()
        output.seek(0)
        return output, f"DS_TaiSan_{asset_type}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    except Exception as e:
        return None, f"Lỗi nén file: {str(e)}"

def export_issues_to_excel(status_filter=None):
    """Xuất danh sách tồn tại kỹ thuật."""
    query = StationIssue.query
    if status_filter:
        query = query.filter(StationIssue.trang_thai == status_filter)
    
    issues = query.order_by(StationIssue.ngay_phat_hien.desc()).all()
    if not issues:
        return None, "Không có dữ liệu."

    data = []
    for i in issues:
        data.append({
            'ID trạm': i.id_tram,
            'Ngày phát hiện': i.ngay_phat_hien,
            'Hạng mục': i.hang_muc,
            'Mô tả': i.mo_ta,
            'Trạng thái': i.trang_thai
        })

    df = pd.DataFrame(data)
    output = BytesIO()
    try:
        writer = pd.ExcelWriter(output, engine='openpyxl')
        df.to_excel(writer, index=False, sheet_name='Issues')
        writer.close()
        output.seek(0)
        return output, f"BaoCao_TonTai_{datetime.now().strftime('%Y%m%d')}.xlsx"
    except Exception as e:
        return None, str(e)
