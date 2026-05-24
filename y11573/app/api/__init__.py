from flask import Flask, request, jsonify, g
from functools import wraps
import json
import os
from datetime import datetime

from app.models.log_models import OperationLog
from app.database import init_database
from app.services.task_service import TaskScheduler

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

VALID_API_KEYS = set(os.environ.get('API_KEYS', 'admin-key,operator-key,viewer-key').split(','))

task_scheduler = TaskScheduler()

def require_auth(required_roles=None):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            api_key = request.headers.get('X-API-Key') or request.args.get('api_key')
            
            if not api_key:
                OperationLog.log_operation(
                    operation_type='auth_failed',
                    operation_module='api',
                    ip_address=request.remote_addr,
                    request_path=request.path,
                    request_method=request.method,
                    response_status='unauthorized',
                    response_data={'error': 'Missing API key'}
                )
                return jsonify({'error': 'Missing API key'}), 401
            
            if api_key not in VALID_API_KEYS:
                OperationLog.log_operation(
                    operation_type='auth_failed',
                    operation_module='api',
                    ip_address=request.remote_addr,
                    request_path=request.path,
                    request_method=request.method,
                    response_status='forbidden',
                    response_data={'error': 'Invalid API key'}
                )
                return jsonify({'error': 'Invalid API key'}), 403
            
            role = 'admin' if api_key == 'admin-key' else 'operator' if api_key == 'operator-key' else 'viewer'
            
            if required_roles and role not in required_roles:
                OperationLog.log_operation(
                    operation_type='auth_permission_denied',
                    operation_module='api',
                    ip_address=request.remote_addr,
                    request_path=request.path,
                    request_method=request.method,
                    response_status='forbidden',
                    response_data={'error': 'Insufficient permissions'}
                )
                return jsonify({'error': 'Insufficient permissions'}), 403
            
            g.api_key = api_key
            g.user_role = role
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@app.before_request
def log_request_start():
    g.request_start_time = datetime.now()

@app.after_request
def log_request_end(response):
    if hasattr(g, 'api_key'):
        try:
            response_data = response.get_json() if response.is_json else {}
        except Exception:
            response_data = {}
        
        OperationLog.log_operation(
            operation_type='api_request',
            operation_module='api',
            operator=g.api_key[:8] if hasattr(g, 'api_key') else None,
            ip_address=request.remote_addr,
            request_path=request.path,
            request_method=request.method,
            request_params=dict(request.args) or dict(request.form) or None,
            response_status=str(response.status_code),
            response_data=response_data
        )
    return response

from app.api import ticket_routes
from app.api import import_routes
from app.api import playback_routes
from app.api import export_routes
from app.api import task_routes
from app.api import sla_routes

def create_app():
    init_database()
    task_scheduler.start()
    return app

def get_scheduler():
    return task_scheduler

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'service': 'cs-ticket-playback-system'
    })

@app.route('/api/v1/status', methods=['GET'])
@require_auth()
def system_status():
    from app.models import Ticket, AsyncTask, PlaybackException
    
    return jsonify({
        'status': 'running',
        'statistics': {
            'total_tickets': Ticket.count(),
            'pending_tasks': AsyncTask.count("task_status = 'pending'"),
            'running_tasks': AsyncTask.count("task_status = 'running'"),
            'waiting_retry': AsyncTask.count("task_status = 'waiting_retry'"),
            'waiting_manual': AsyncTask.count("task_status = 'waiting_manual'"),
            'open_exceptions': PlaybackException.count("resolution_status = 'open'"),
        }
    })
