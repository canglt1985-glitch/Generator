from app import app
from extensions import db
from models import User
from werkzeug.security import generate_password_hash

with app.app_context():
    u = User.query.filter_by(username='admin').first()
    if u:
        u.password_hash = generate_password_hash('admin123')
        db.session.commit()
        print("Admin password reset to 'admin123'")
