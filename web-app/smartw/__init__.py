"""
SmartW Integration Module
Scrape MĐ, MPĐ, MLL, VHKT data from SmartW and display on /vhkt page.
"""
from flask import Blueprint

smartw_bp = Blueprint('smartw', __name__, template_folder='../templates')

# Import routes to register them with the blueprint
from . import routes  # noqa: F401, E402
