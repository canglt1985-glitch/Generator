"""
Shared Flask extensions — avoids circular imports.
Both app.py and models.py import db from here.
"""
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
