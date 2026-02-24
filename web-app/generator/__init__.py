from flask import Blueprint

generator_bp = Blueprint('generator', __name__)

from generator import routes  # noqa: E402,F401
from generator import routes_fuel  # noqa: E402,F401
from generator import routes_info  # noqa: E402,F401
