from src.models.user import db
from datetime import datetime

class Appointment(db.Model):
    __tablename__ = 'appointments'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), nullable=False)
    date = db.Column(db.String(10), nullable=False)  # YYYY-MM-DD
    time = db.Column(db.String(5), nullable=False)   # HH:MM
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending, confirmed, cancelled, completed
    created_at = db.Column(db.String(19), nullable=False, default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    def __repr__(self):
        return f'<Appointment {self.id} - {self.date} {self.time}>'

    def to_dict(self):
        return {
            'id': self.id,
            'client_id': self.client_id,
            'client_name': self.client.name if self.client else None,
            'client_phone': self.client.phone if self.client else None,
            'service_id': self.service_id,
            'service_name': self.service.name if self.service else None,
            'service_price': self.service.price if self.service else None,
            'service_duration': self.service.duration if self.service else None,
            'date': self.date,
            'time': self.time,
            'status': self.status,
            'created_at': self.created_at
        }

