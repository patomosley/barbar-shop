from flask import Blueprint, request, jsonify
from src.models.appointment import Appointment
from src.models.service import Service
from src.routes.auth import require_auth
from datetime import datetime, date
from sqlalchemy import func, extract

finance_bp = Blueprint('finance', __name__)

@finance_bp.route('/finance/daily', methods=['GET'])
@require_auth('admin')
def get_daily_finance():
    try:
        date_str = request.args.get('date', date.today().strftime('%Y-%m-%d'))
        
        # Buscar agendamentos completados na data
        appointments = Appointment.query.filter_by(
            date=date_str,
            status='completed'
        ).all()
        
        total_revenue = 0
        total_appointments = len(appointments)
        services_count = {}
        
        for appointment in appointments:
            if appointment.service:
                total_revenue += appointment.service.price
                service_name = appointment.service.name
                if service_name in services_count:
                    services_count[service_name] += 1
                else:
                    services_count[service_name] = 1
        
        return jsonify({
            'date': date_str,
            'total_revenue': total_revenue,
            'total_appointments': total_appointments,
            'services_count': services_count,
            'appointments': [appointment.to_dict() for appointment in appointments]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@finance_bp.route('/finance/monthly', methods=['GET'])
@require_auth('admin')
def get_monthly_finance():
    try:
        year = int(request.args.get('year', date.today().year))
        month = int(request.args.get('month', date.today().month))
        
        # Buscar agendamentos completados no mês
        appointments = Appointment.query.filter(
            extract('year', func.date(Appointment.date)) == year,
            extract('month', func.date(Appointment.date)) == month,
            Appointment.status == 'completed'
        ).all()
        
        total_revenue = 0
        total_appointments = len(appointments)
        services_count = {}
        daily_revenue = {}
        
        for appointment in appointments:
            if appointment.service:
                total_revenue += appointment.service.price
                service_name = appointment.service.name
                
                # Contagem por serviço
                if service_name in services_count:
                    services_count[service_name] += 1
                else:
                    services_count[service_name] = 1
                
                # Receita por dia
                if appointment.date in daily_revenue:
                    daily_revenue[appointment.date] += appointment.service.price
                else:
                    daily_revenue[appointment.date] = appointment.service.price
        
        return jsonify({
            'year': year,
            'month': month,
            'total_revenue': total_revenue,
            'total_appointments': total_appointments,
            'services_count': services_count,
            'daily_revenue': daily_revenue
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@finance_bp.route('/finance/annual', methods=['GET'])
@require_auth('admin')
def get_annual_finance():
    try:
        year = int(request.args.get('year', date.today().year))
        
        # Buscar agendamentos completados no ano
        appointments = Appointment.query.filter(
            extract('year', func.date(Appointment.date)) == year,
            Appointment.status == 'completed'
        ).all()
        
        total_revenue = 0
        total_appointments = len(appointments)
        services_count = {}
        monthly_revenue = {}
        
        for appointment in appointments:
            if appointment.service:
                total_revenue += appointment.service.price
                service_name = appointment.service.name
                
                # Contagem por serviço
                if service_name in services_count:
                    services_count[service_name] += 1
                else:
                    services_count[service_name] = 1
                
                # Receita por mês
                appointment_date = datetime.strptime(appointment.date, '%Y-%m-%d')
                month_key = f"{appointment_date.year}-{appointment_date.month:02d}"
                
                if month_key in monthly_revenue:
                    monthly_revenue[month_key] += appointment.service.price
                else:
                    monthly_revenue[month_key] = appointment.service.price
        
        return jsonify({
            'year': year,
            'total_revenue': total_revenue,
            'total_appointments': total_appointments,
            'services_count': services_count,
            'monthly_revenue': monthly_revenue
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@finance_bp.route('/finance/summary', methods=['GET'])
@require_auth('admin')
def get_finance_summary():
    try:
        today = date.today()
        
        # Receita de hoje
        today_appointments = Appointment.query.filter_by(
            date=today.strftime('%Y-%m-%d'),
            status='completed'
        ).all()
        today_revenue = sum(apt.service.price for apt in today_appointments if apt.service)
        
        # Receita do mês atual
        month_appointments = Appointment.query.filter(
            extract('year', func.date(Appointment.date)) == today.year,
            extract('month', func.date(Appointment.date)) == today.month,
            Appointment.status == 'completed'
        ).all()
        month_revenue = sum(apt.service.price for apt in month_appointments if apt.service)
        
        # Receita do ano atual
        year_appointments = Appointment.query.filter(
            extract('year', func.date(Appointment.date)) == today.year,
            Appointment.status == 'completed'
        ).all()
        year_revenue = sum(apt.service.price for apt in year_appointments if apt.service)
        
        # Agendamentos pendentes hoje
        pending_today = Appointment.query.filter_by(
            date=today.strftime('%Y-%m-%d'),
            status='pending'
        ).count()
        
        return jsonify({
            'today': {
                'revenue': today_revenue,
                'appointments': len(today_appointments),
                'pending': pending_today
            },
            'month': {
                'revenue': month_revenue,
                'appointments': len(month_appointments)
            },
            'year': {
                'revenue': year_revenue,
                'appointments': len(year_appointments)
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

