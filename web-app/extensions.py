"""
Shared Flask extensions — avoids circular imports.
Both app.py and models.py import db from here.
"""
from flask_sqlalchemy import SQLAlchemy

from flask_wtf.csrf import CSRFProtect

db = SQLAlchemy()
csrf = CSRFProtect()
