from src.models.user import db

class WorkSchedule(db.Model):
    __tablename__ = 'work_schedule'
    
    id = db.Column(db.Integer, primary_key=True)
    day_of_week = db.Column(db.Integer, nullable=False)  # 0=Segunda, 6=Domingo
    start_time = db.Column(db.String(5), nullable=False)  # HH:MM
    end_time = db.Column(db.String(5), nullable=False)    # HH:MM
    is_extended = db.Column(db.Boolean, nullable=False, default=False)

    def __repr__(self):
        days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
        return f'<WorkSchedule {days[self.day_of_week]} {self.start_time}-{self.end_time}>'

    def to_dict(self):
        days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
        return {
            'id': self.id,
            'day_of_week': self.day_of_week,
            'day_name': days[self.day_of_week],
            'start_time': self.start_time,
            'end_time': self.end_time,
            'is_extended': self.is_extended
        }

