"""
One-time migration script: Add 'subcategory' column to DataSite tables.
Run with: python migrate_subcategory.py
"""
import os
import sys
sys.stdout.reconfigure(encoding='utf-8')

from dotenv import load_dotenv
load_dotenv()

from flask import Flask
from extensions import db
from sqlalchemy import text

app = Flask(__name__)
db_url = os.getenv('DATABASE_URL', 'sqlite:///generator_manager.db')
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'migration-temp-key'
db.init_app(app)

TABLES = [
    'ds_infrastructure',
    'ds_equipments',
    'ds_telecom',
]

IS_POSTGRES = 'postgresql' in db_url or 'postgres' in db_url

def column_exists_sql(table):
    if IS_POSTGRES:
        return text(
            f"SELECT COUNT(*) FROM information_schema.columns "
            f"WHERE table_name='{table}' AND column_name='subcategory'"
        )
    else:
        return text(f"SELECT COUNT(*) FROM pragma_table_info('{table}') WHERE name='subcategory'")

def add_subcategory_column():
    with app.app_context():
        for table in TABLES:
            with db.engine.connect() as conn:
                try:
                    result = conn.execute(column_exists_sql(table))
                    exists = result.scalar()
                    if exists:
                        print(f"  Skip [{table}] 'subcategory' da ton tai.")
                    else:
                        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN subcategory VARCHAR(100)"))
                        conn.commit()
                        print(f"  OK   [{table}] Da them cot 'subcategory'.")
                except Exception as e:
                    print(f"  ERR  [{table}] Loi: {e}")

if __name__ == '__main__':
    print(f"Migration ({'PostgreSQL' if IS_POSTGRES else 'SQLite'}): Adding subcategory column...")
    add_subcategory_column()
    print("Done!")
