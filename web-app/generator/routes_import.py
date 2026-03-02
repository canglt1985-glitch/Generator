"""
Generic import helper for Excel file imports.
Used across multiple generator sub-routes.
"""
from flask import request, redirect, url_for, flash
from datetime import datetime, time
import pandas as pd

from extensions import db


def generic_import(model_class, col_map, redirect_route, date_cols=[], float_cols=[], datetime_cols=[], duration_cols=[], dup_cols=[], required_cols=[]):
    if 'file' not in request.files:
        flash('Chưa chọn file!', 'danger')
        return redirect(url_for(redirect_route))

    file = request.files['file']
    if file.filename == '':
        flash('Chưa chọn file!', 'danger')
        return redirect(url_for(redirect_route))

    if file:
        try:
            df = pd.read_excel(file)
            df_cols_norm = {str(c).strip().lower(): c for c in df.columns}
            missing = []

            def check_col_exists(field):
                candidates = col_map.get(field, [])
                for cand in candidates:
                    cand_clean = str(cand).strip().lower()
                    if cand_clean in df_cols_norm:
                        return True
                    for col_norm in df_cols_norm:
                        if cand_clean in col_norm:
                            return True
                return False

            for field in required_cols:
                if not check_col_exists(field):
                    missing.append(field)

            if missing:
                missing_info = [f"{field} (Ví dụ: {', '.join(col_map.get(field, [])[:2])})" for field in missing]
                flash(f'Lỗi file Excel: Không tìm thấy cột dữ liệu cho: {"; ".join(missing_info)}.', 'danger')
                return redirect(url_for(redirect_route))

            def find_col(df, candidates):
                df_cols_norm = {str(c).strip().lower(): c for c in df.columns}
                for cand in candidates:
                    cand_clean = str(cand).strip().lower()
                    if cand_clean in df_cols_norm:
                        return df_cols_norm[cand_clean]
                    for col_norm, original_col in df_cols_norm.items():
                        if cand_clean in col_norm:
                            return original_col
                return None

            def get_val(row, field, default=None):
                col = find_col(df, col_map.get(field, []))
                return row.get(col) if col else default

            count = 0
            updated = 0
            errors = []

            def parse_date_str(val):
                if pd.isna(val) or val == '':
                    return ''
                if isinstance(val, datetime):
                    return val.strftime('%Y-%m-%d')
                s = str(val).strip()
                for fmt in ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y', '%Y/%m/%d']:
                    try:
                        return datetime.strptime(s, fmt).strftime('%Y-%m-%d')
                    except Exception:
                        pass
                return s

            def parse_time_str(val):
                if val is None or (isinstance(val, float) and pd.isna(val)):
                    return ''
                if pd.isna(val):
                    return ''
                if isinstance(val, time):
                    return val.strftime('%H:%M')
                if isinstance(val, datetime):
                    return val.strftime('%H:%M')
                # Handle pandas Timedelta (Excel stores time as timedelta)
                if isinstance(val, pd.Timedelta):
                    total_sec = int(val.total_seconds())
                    h = total_sec // 3600
                    m = (total_sec % 3600) // 60
                    return f'{h:02d}:{m:02d}'
                # Handle python timedelta
                import datetime as dt_mod
                if isinstance(val, dt_mod.timedelta):
                    total_sec = int(val.total_seconds())
                    h = total_sec // 3600
                    m = (total_sec % 3600) // 60
                    return f'{h:02d}:{m:02d}'
                s = str(val).strip()
                if not s or s.lower() in ('nan', 'none', 'nat'):
                    return ''
                # Handle "0 days 08:30:00" format from pandas Timedelta str
                if 'days' in s.lower():
                    try:
                        td = pd.Timedelta(s)
                        total_sec = int(td.total_seconds())
                        h = total_sec // 3600
                        m = (total_sec % 3600) // 60
                        return f'{h:02d}:{m:02d}'
                    except Exception:
                        pass
                for fmt in ['%H:%M:%S', '%H:%M', '%I:%M %p', '%I:%M%p', '%H:%M:%S.%f']:
                    try:
                        return datetime.strptime(s, fmt).strftime('%H:%M')
                    except Exception:
                        pass
                return s

            def parse_dt_str(val):
                if pd.isna(val) or val == '':
                    return ''
                if isinstance(val, datetime):
                    return val.strftime('%Y-%m-%d %H:%M:%S')
                s = str(val).strip()
                for fmt in [
                    '%d/%m/%Y %H:%M:%S', '%Y-%m-%d %H:%M:%S', '%d/%m/%y %H:%M:%S',
                    '%d/%m/%Y %H:%M', '%Y-%m-%d %H:%M', '%d/%m/%y %H:%M',
                    '%d/%m/%Y', '%Y-%m-%d', '%d/%m/%y'
                ]:
                    try:
                        return datetime.strptime(s, fmt).strftime('%Y-%m-%d %H:%M:%S')
                    except Exception:
                        pass
                return s

            def parse_duration(val):
                """Parse thời gian chạy máy → số giờ (float).
                Nhận: 5.5  /  "5.5"  /  "5:30"  /  "05:30:00"  /  5  /  None
                Trả về: float số giờ, hoặc 0.0 nếu không hợp lệ.
                """
                if val is None or (isinstance(val, float) and pd.isna(val)):
                    return 0.0
                if isinstance(val, (int, float)):
                    return float(val)
                s = str(val).strip()
                if not s or s.lower() in ('nan', 'none', ''):
                    return 0.0
                # Dạng HH:MM:SS hoặc HH:MM
                if ':' in s:
                    parts = s.split(':')
                    try:
                        h = int(parts[0])
                        m = int(parts[1]) if len(parts) > 1 else 0
                        return h + m / 60.0
                    except Exception:
                        pass
                # Dạng số thập phân hoặc nguyên
                try:
                    cleaned = s.replace(',', '.').strip()
                    return float(cleaned)
                except Exception:
                    return 0.0

            def parse_float(val):
                if val is None or (isinstance(val, float) and pd.isna(val)):
                    return 0.0
                try:
                    s = str(val).strip()
                    if not s or s.lower() in ('nan', 'none', ''):
                        return 0.0
                    if ',' in s and '.' not in s:
                        s = s.replace(',', '.')
                    elif '.' in s and ',' in s:
                        if s.find('.') < s.find(','):
                            s = s.replace('.', '').replace(',', '.')
                        else:
                            s = s.replace(',', '')
                    return float(s)
                except Exception:
                    return 0.0


            skipped_guide = 0
            skipped_empty = 0
            for index, row in df.iterrows():
                first_val = str(row.iloc[0]) if len(row) > 0 else ""
                if "HƯỚNG DẪN" in first_val:
                    skipped_guide += 1
                    continue
                if row.isnull().all():
                    skipped_empty += 1
                    continue
                try:
                    data = {}
                    for field in col_map.keys():
                        val = get_val(row, field)
                        if field in date_cols:
                            data[field] = parse_date_str(val)
                        elif field in datetime_cols:
                            data[field] = parse_dt_str(val)
                        elif field in duration_cols:
                            # duration_cols: luôn dùng parse_duration chuyên dụng
                            data[field] = parse_duration(val)
                        elif field in float_cols:
                            data[field] = parse_float(val)
                        else:
                            if 'gio' in field or 'time' in field.lower() or 'cup' in field or 'co' in field:
                                data[field] = parse_time_str(val)
                            else:
                                data[field] = str(val) if pd.notna(val) else ''

                    if 'ngay_cap_nhat' in [c.name for c in model_class.__table__.columns]:
                        data['ngay_cap_nhat'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

                    if dup_cols:
                        filter_args = {c: data[c] for c in dup_cols if c in data}
                        if filter_args:
                            exists = model_class.query.filter_by(**filter_args).first()
                            if exists:
                                # UPDATE existing record with new data
                                for key, val in data.items():
                                    if key not in dup_cols and val not in (None, '', '0', 0, 0.0, 'nan', 'None'):
                                        setattr(exists, key, val)
                                updated += 1
                                continue

                    obj = model_class(**data)
                    db.session.add(obj)
                    count += 1
                except Exception as e:
                    errors.append(f"Dòng {index + 2}: {str(e)}")

            if count > 0 or updated > 0:
                db.session.commit()
                parts = []
                if count > 0:
                    parts.append(f'thêm mới {count}')
                if updated > 0:
                    parts.append(f'cập nhật {updated}')
                flash(f'Import thành công: {", ".join(parts)} dòng!', 'success')
            # Report skipped rows
            skip_parts = []
            if skipped_guide > 0:
                skip_parts.append(f'{skipped_guide} dòng hướng dẫn')
            if skipped_empty > 0:
                skip_parts.append(f'{skipped_empty} dòng trống')
            if skip_parts:
                flash(f'Bỏ qua: {", ".join(skip_parts)}', 'info')
            if errors:
                import logging as _log
                for e in errors:
                    _log.warning(f'[IMPORT ERROR] {e}')
                flash(f'Có {len(errors)} dòng lỗi: {errors[0]}', 'warning')
        except Exception as e:
            flash(f'Lỗi xử lý file: {str(e)}', 'danger')

    return redirect(url_for(redirect_route))
