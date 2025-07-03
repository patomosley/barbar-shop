from flask import Blueprint, request, jsonify
from src.models.service import Service
from src.models.user import db
from src.routes.auth import require_auth

service_bp = Blueprint('service', __name__)

@service_bp.route('/services', methods=['GET'])
def get_services():
    try:
        services = Service.query.all()
        return jsonify({'services': [service.to_dict() for service in services]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@service_bp.route('/services/<int:service_id>', methods=['GET'])
def get_service(service_id):
    try:
        service = Service.query.get(service_id)
        if not service:
            return jsonify({'error': 'Serviço não encontrado'}), 404
        return jsonify({'service': service.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@service_bp.route('/services', methods=['POST'])
@require_auth('admin')
def create_service():
    try:
        data = request.get_json()
        
        # Validações básicas
        required_fields = ['name', 'duration', 'price']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} é obrigatório'}), 400
        
        # Verificar se nome já existe
        if Service.query.filter_by(name=data['name']).first():
            return jsonify({'error': 'Serviço com este nome já existe'}), 400
        
        service = Service(
            name=data['name'],
            duration=int(data['duration']),
            price=float(data['price'])
        )
        
        db.session.add(service)
        db.session.commit()
        
        return jsonify({
            'message': 'Serviço criado com sucesso',
            'service': service.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@service_bp.route('/services/<int:service_id>', methods=['PUT'])
@require_auth('admin')
def update_service(service_id):
    try:
        service = Service.query.get(service_id)
        if not service:
            return jsonify({'error': 'Serviço não encontrado'}), 404
        
        data = request.get_json()
        
        # Atualizar campos se fornecidos
        if 'name' in data:
            # Verificar se novo nome já existe
            existing = Service.query.filter_by(name=data['name']).first()
            if existing and existing.id != service_id:
                return jsonify({'error': 'Serviço com este nome já existe'}), 400
            service.name = data['name']
        
        if 'duration' in data:
            service.duration = int(data['duration'])
        if 'price' in data:
            service.price = float(data['price'])
        
        db.session.commit()
        
        return jsonify({
            'message': 'Serviço atualizado com sucesso',
            'service': service.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@service_bp.route('/services/<int:service_id>', methods=['DELETE'])
@require_auth('admin')
def delete_service(service_id):
    try:
        service = Service.query.get(service_id)
        if not service:
            return jsonify({'error': 'Serviço não encontrado'}), 404
        
        db.session.delete(service)
        db.session.commit()
        
        return jsonify({'message': 'Serviço excluído com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

