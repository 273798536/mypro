from flask import request, jsonify, g, send_from_directory
import os
from app.api import app, require_auth
from app.services.export_service import ExportService
from app.services.reconciliation_service import ReconciliationService


@app.route('/api/v1/exports', methods=['POST'])
@require_auth(['admin', 'operator'])
def export_data():
    data = request.get_json()
    export_type = data.get('type', 'tickets')
    filters = data.get('filters', {})
    
    service = ExportService()
    
    try:
        result = service.export_data(export_type, filters)
        return jsonify(result)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/exports/<int:ticket_id>/evidence', methods=['POST'])
@require_auth(['admin', 'operator'])
def export_evidence(ticket_id):
    service = ExportService()
    
    try:
        result = service.export_data('full_evidence', {'ticket_id': ticket_id})
        return jsonify(result)
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/exports/history', methods=['GET'])
@require_auth()
def get_export_history():
    service = ExportService()
    history = service.get_export_history()
    return jsonify(history)

@app.route('/api/v1/exports/download/<filename>', methods=['GET'])
@require_auth(['admin', 'operator'])
def download_export(filename):
    export_dir = os.path.abspath('data/exports')
    
    try:
        return send_from_directory(export_dir, filename, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@app.route('/api/v1/exports/verify', methods=['POST'])
@require_auth()
def verify_export():
    data = request.get_json()
    file_path = data.get('file_path')
    expected_checksum = data.get('checksum')
    
    if not file_path or not expected_checksum:
        return jsonify({'error': 'file_path and checksum are required'}), 400
    
    service = ExportService()
    result = service.verify_export_consistency(file_path, expected_checksum)
    
    return jsonify(result)

@app.route('/api/v1/reconciliation', methods=['POST'])
@require_auth(['admin', 'operator'])
def run_reconciliation():
    data = request.get_json()
    date = data.get('date')
    
    service = ReconciliationService()
    
    try:
        result = service.run_reconciliation(date, operator=g.api_key[:8])
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/reconciliation/async', methods=['POST'])
@require_auth(['admin', 'operator'])
def trigger_reconciliation():
    data = request.get_json()
    date = data.get('date')
    
    service = ReconciliationService()
    result = service.trigger_reconciliation_task(date, operator=g.api_key[:8])
    
    return jsonify(result)

@app.route('/api/v1/reconciliation/history', methods=['GET'])
@require_auth()
def get_reconciliation_history():
    service = ReconciliationService()
    history = service.get_reconciliation_history()
    return jsonify(history)

@app.route('/api/v1/reconciliation/<date>', methods=['GET'])
@require_auth()
def get_reconciliation_by_date(date):
    service = ReconciliationService()
    record = service.get_reconciliation_by_date(date)
    
    if not record:
        return jsonify({'error': 'Reconciliation record not found'}), 404
    
    return jsonify(record)
