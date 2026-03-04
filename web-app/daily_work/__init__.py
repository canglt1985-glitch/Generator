from flask import Blueprint

daily_work_bp = Blueprint('daily_work', __name__)

from daily_work import routes  # noqa: E402,F401
from daily_work import routes_equipment  # noqa: E402,F401
from daily_work import routes_schedule  # noqa: E402,F401
from daily_work import routes_issues  # noqa: E402,F401
