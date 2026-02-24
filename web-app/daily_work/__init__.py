from flask import Blueprint

daily_work_bp = Blueprint('daily_work', __name__)

from daily_work import routes  # noqa: E402,F401
