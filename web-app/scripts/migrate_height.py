import sys
import os
sys.path.append(os.getcwd())
from app import app
from extensions import db
from sqlalchemy import text

with app.app_context():
    try:
        db.session.execute(text('ALTER TABLE ds_cell_registry ADD COLUMN antenna_height FLOAT'))
        db.session.commit()
        print("Column added successfully.")
    except Exception as e:
        db.session.rollback()
        print(f"Error or column already exists: {e}")
