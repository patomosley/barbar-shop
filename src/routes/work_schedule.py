from flask import Blueprint, request, jsonify
from src.models.work_schedule import WorkSchedule
from src.models.user import db
from src.routes.auth import require_auth

work_schedule_bp = Blueprint('work_schedule', __name__)

@work_schedule_bp.route('/work_schedule', methods=['GET'])
def get_work_schedule():
    try:
        schedules = WorkSchedule.query.order_by(WorkSchedule.day_of_week).all()
        return jsonify({'work_schedule': [schedule.to_dict() for schedule in schedules]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@work_schedule_bp.route('/work_schedule', methods=['POST'])
@require_auth('admin')
def create_or_update_work_schedule():
    try:
        data = request.get_json()
        
        if not isinstance(data, list):
            return jsonify({'error': 'Dados devem ser uma lista de horários'}), 400
        
        # Limpar horários existentes
        WorkSchedule.query.delete()
        
        # Criar novos horários
        for schedule_data in data:
            required_fields = ['day_of_week', 'start_time', 'end_time']
            for field in required_fields:
                if field not in schedule_data:
                    return jsonify({'error': f'{field} é obrigatório'}), 400
            
            schedule = WorkSchedule(
                day_of_week=schedule_data['day_of_week'],
                start_time=schedule_data['start_time'],
                end_time=schedule_data['end_time'],
                is_extended=schedule_data.get('is_extended', False)
            )
            db.session.add(schedule)
        
        db.session.commit()
        
        schedules = WorkSchedule.query.order_by(WorkSchedule.day_of_week).all()
        return jsonify({
            'message': 'Horários de trabalho atualizados com sucesso',
            'work_schedule': [schedule.to_dict() for schedule in schedules]
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@work_schedule_bp.route('/work_schedule/<int:day_of_week>', methods=['PUT'])
@require_auth('admin')
def update_day_schedule(day_of_week):
    try:
        if day_of_week < 0 or day_of_week > 6:
            return jsonify({'error': 'Dia da semana inválido (0-6)'}), 400
        
        data = request.get_json()
        
        schedule = WorkSchedule.query.filter_by(day_of_week=day_of_week).first()
        
        if not schedule:
            # Criar novo horário
            schedule = WorkSchedule(day_of_week=day_of_week)
            db.session.add(schedule)
        
        # Atualizar campos se fornecidos
        if 'start_time' in data:
            schedule.start_time = data['start_time']
        if 'end_time' in data:
            schedule.end_time = data['end_time']
        if 'is_extended' in data:
            schedule.is_extended = data['is_extended']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Horário atualizado com sucesso',
            'schedule': schedule.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@work_schedule_bp.route('/work_schedule/<int:day_of_week>', methods=['DELETE'])
@require_auth('admin')
def delete_day_schedule(day_of_week):
    try:
        if day_of_week < 0 or day_of_week > 6:
            return jsonify({'error': 'Dia da semana inválido (0-6)'}), 400
        
        schedule = WorkSchedule.query.filter_by(day_of_week=day_of_week).first()
        if not schedule:
            return jsonify({'error': 'Horário não encontrado'}), 404
        
        db.session.delete(schedule)
        db.session.commit()
        
        return jsonify({'message': 'Horário excluído com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

