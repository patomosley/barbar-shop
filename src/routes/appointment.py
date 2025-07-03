from flask import Blueprint, request, jsonify, session
from src.models.appointment import Appointment
from src.models.user import User, db
from src.models.service import Service
from src.routes.auth import require_auth
from datetime import datetime, date

appointment_bp = Blueprint('appointment', __name__)

@appointment_bp.route('/appointments', methods=['GET'])
@require_auth('admin')
def get_appointments():
    try:
        appointments = Appointment.query.all()
        return jsonify({'appointments': [appointment.to_dict() for appointment in appointments]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@appointment_bp.route('/appointments/today', methods=['GET'])
@require_auth('admin')
def get_today_appointments():
    try:
        today = date.today().strftime('%Y-%m-%d')
        appointments = Appointment.query.filter_by(date=today).order_by(Appointment.time).all()
        return jsonify({'appointments': [appointment.to_dict() for appointment in appointments]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@appointment_bp.route('/appointments/client/<int:client_id>', methods=['GET'])
def get_client_appointments(client_id):
    try:
        user_id = session.get('user_id')
        user_role = session.get('user_role')
        
        # Verificar se é admin ou o próprio cliente
        if user_role != 'admin' and user_id != client_id:
            return jsonify({'error': 'Permissão insuficiente'}), 403
        
        appointments = Appointment.query.filter_by(client_id=client_id).order_by(Appointment.date.desc(), Appointment.time.desc()).all()
        return jsonify({'appointments': [appointment.to_dict() for appointment in appointments]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@appointment_bp.route('/appointments/<int:appointment_id>', methods=['GET'])
def get_appointment(appointment_id):
    try:
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({'error': 'Agendamento não encontrado'}), 404
        
        user_id = session.get('user_id')
        user_role = session.get('user_role')
        
        # Verificar se é admin ou o próprio cliente
        if user_role != 'admin' and user_id != appointment.client_id:
            return jsonify({'error': 'Permissão insuficiente'}), 403
        
        return jsonify({'appointment': appointment.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@appointment_bp.route('/appointments', methods=['POST'])
def create_appointment():
    try:
        data = request.get_json()
        
        # Validações básicas
        required_fields = ['client_name', 'client_phone', 'service_id', 'date', 'time']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} é obrigatório'}), 400
        
        # Verificar se o serviço existe
        service = Service.query.get(data['service_id'])
        if not service:
            return jsonify({'error': 'Serviço não encontrado'}), 404
        
        # Criar ou encontrar cliente
        client = None
        if data.get('client_email'):
            client = User.query.filter_by(email=data['client_email']).first()
        
        if not client:
            # Verificar se já existe cliente com mesmo telefone
            client = User.query.filter_by(phone=data['client_phone']).first()
        
        if not client:
            # Criar novo cliente
            username = data['client_phone']  # Usar telefone como username
            counter = 1
            while User.query.filter_by(username=username).first():
                username = f"{data['client_phone']}_{counter}"
                counter += 1
            
            client = User(
                username=username,
                role='client',
                name=data['client_name'],
                phone=data['client_phone'],
                email=data.get('client_email')
            )
            client.set_password('123456')  # Senha padrão
            db.session.add(client)
            db.session.flush()  # Para obter o ID
        
        # Verificar se já existe agendamento no mesmo horário
        existing = Appointment.query.filter_by(
            date=data['date'],
            time=data['time']
        ).first()
        
        if existing:
            return jsonify({'error': 'Já existe um agendamento neste horário'}), 400
        
        appointment = Appointment(
            client_id=client.id,
            service_id=data['service_id'],
            date=data['date'],
            time=data['time'],
            status='pending'
        )
        
        db.session.add(appointment)
        db.session.commit()
        
        return jsonify({
            'message': 'Agendamento criado com sucesso',
            'appointment': appointment.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@appointment_bp.route('/appointments/<int:appointment_id>/status', methods=['PUT'])
@require_auth('admin')
def update_appointment_status(appointment_id):
    try:
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({'error': 'Agendamento não encontrado'}), 404
        
        data = request.get_json()
        status = data.get('status')
        
        if status not in ['pending', 'confirmed', 'cancelled', 'completed']:
            return jsonify({'error': 'Status inválido'}), 400
        
        appointment.status = status
        db.session.commit()
        
        return jsonify({
            'message': 'Status atualizado com sucesso',
            'appointment': appointment.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@appointment_bp.route('/appointments/<int:appointment_id>', methods=['PUT'])
@require_auth('admin')
def update_appointment(appointment_id):
    try:
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({'error': 'Agendamento não encontrado'}), 404
        
        data = request.get_json()
        
        # Atualizar campos se fornecidos
        if 'service_id' in data:
            service = Service.query.get(data['service_id'])
            if not service:
                return jsonify({'error': 'Serviço não encontrado'}), 404
            appointment.service_id = data['service_id']
        
        if 'date' in data:
            appointment.date = data['date']
        if 'time' in data:
            appointment.time = data['time']
        if 'status' in data:
            if data['status'] not in ['pending', 'confirmed', 'cancelled', 'completed']:
                return jsonify({'error': 'Status inválido'}), 400
            appointment.status = data['status']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Agendamento atualizado com sucesso',
            'appointment': appointment.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@appointment_bp.route('/appointments/<int:appointment_id>', methods=['DELETE'])
@require_auth('admin')
def delete_appointment(appointment_id):
    try:
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({'error': 'Agendamento não encontrado'}), 404
        
        db.session.delete(appointment)
        db.session.commit()
        
        return jsonify({'message': 'Agendamento excluído com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@appointment_bp.route('/appointments/available-times', methods=['GET'])
def get_available_times():
    try:
        date_str = request.args.get('date')
        service_id = request.args.get('service_id')
        
        if not date_str or not service_id:
            return jsonify({'error': 'Data e serviço são obrigatórios'}), 400
        
        service = Service.query.get(service_id)
        if not service:
            return jsonify({'error': 'Serviço não encontrado'}), 404
        
        # Buscar agendamentos existentes na data
        existing_appointments = Appointment.query.filter_by(date=date_str).all()
        occupied_times = [apt.time for apt in existing_appointments]
        
        # Gerar horários disponíveis (exemplo: 8h às 18h, de 30 em 30 min)
        available_times = []
        start_hour = 8
        end_hour = 18
        
        for hour in range(start_hour, end_hour):
            for minute in [0, 30]:
                time_str = f"{hour:02d}:{minute:02d}"
                if time_str not in occupied_times:
                    available_times.append(time_str)
        
        return jsonify({'available_times': available_times}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

