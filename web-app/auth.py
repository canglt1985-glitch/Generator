"""
Shared authentication decorators.
Used by all blueprints.

Roles:
  - admin: Full access (all pages + admin panel)
  - nhanvien: Can view/input Chi Phí, no admin panel
  - chuyenvien: NO access to Chi Phí pages, no admin panel
"""
from functools import wraps
from flask import session, redirect, url_for, flash, abort


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Vui lòng đăng nhập!', 'warning')
            return redirect(url_for('core.login'))
        return f(*args, **kwargs)
    return decorated_function


def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get('role') != 'admin':
            abort(403)
        return f(*args, **kwargs)
    return decorated_function


def cost_access_required(f):
    """Allow admin + nhanvien, block chuyenvien."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        role = session.get('role', '')
        if role == 'chuyenvien':
            flash('Bạn không có quyền truy cập trang này.', 'warning')
            return redirect(url_for('smartw.vhkt'))
        return f(*args, **kwargs)
    return decorated_function
