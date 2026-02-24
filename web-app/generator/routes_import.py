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
                if pd.isna(val) or val == '':
                    return ''
                if isinstance(val, time):
                    return val.strftime('%H:%M')
                if isinstance(val, datetime):
                    return val.strftime('%H:%M')
                s = str(val).strip()
                for fmt in ['%H:%M:%S', '%H:%M', '%I:%M %p', '%I:%M%p']:
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

            def parse_float(val):
                if pd.isna(val) or val == '':
                    return 0.0
                try:
                    s = str(val).strip()
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

            for index, row in df.iterrows():
                first_val = str(row.iloc[0]) if len(row) > 0 else ""
                if "HƯỚNG DẪN" in first_val:
                    continue
                if row.isnull().all():
                    continue
                try:
                    data = {}
                    for field in col_map.keys():
                        val = get_val(row, field)
                        if field in date_cols:
                            data[field] = parse_date_str(val)
                        elif field in datetime_cols:
                            data[field] = parse_dt_str(val)
                        elif field in float_cols:
                            f_val = parse_float(val)
                            if f_val == 0.0 and field in duration_cols and pd.notna(val) and val != '':
                                try:
                                    t_str = parse_time_str(val)
                                    if ':' in t_str:
                                        h, m = map(int, t_str.split(':'))
                                        f_val = h + m / 60.0
                                except Exception:
                                    pass
                            data[field] = f_val
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
                                continue

                    obj = model_class(**data)
                    db.session.add(obj)
                    count += 1
                except Exception as e:
                    errors.append(f"Dòng {index + 2}: {str(e)}")

            if count > 0:
                db.session.commit()
                flash(f'Import thành công {count} dòng!', 'success')
            if errors:
                flash(f'Có {len(errors)} dòng không lọc được hoặc lỗi: {errors[0]}', 'warning')
        except Exception as e:
            flash(f'Lỗi xử lý file: {str(e)}', 'danger')

    return redirect(url_for(redirect_route))
