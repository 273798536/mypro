import os
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

from config import Config
from models import db, FuelRecord, Vehicle, Driver, Project, FuelType, Anomaly, Allocation
from data_importer import DataImporter
from anomaly_detector import AnomalyDetector, detect_and_save_anomalies
from allocator import ProjectAllocator
from driver_confirmation import DriverConfirmationService
from report_exporter import ReportExporter
from audit_logger import AuditLogger

app = Flask(__name__)
app.config.from_object(Config)

CORS(app, resources={r"/api/*": {"origins": "*", "supports_credentials": True}})
db.init_app(app)

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

importer = DataImporter()
allocator = ProjectAllocator()
confirmation_service = DriverConfirmationService()


@app.before_request
def create_tables():
    if not hasattr(app, 'tables_created'):
        with app.app_context():
            db.create_all()
            _init_reference_data()
        app.tables_created = True


def _init_reference_data():
    if FuelType.query.count() == 0:
        default_fuels = [
            FuelType(code='92#', name='92号汽油', standard_price=7.50, is_authorized=True),
            FuelType(code='95#', name='95号汽油', standard_price=8.00, is_authorized=True),
            FuelType(code='98#', name='98号汽油', standard_price=8.80, is_authorized=True),
            FuelType(code='0#', name='0号柴油', standard_price=7.20, is_authorized=True),
            FuelType(code='-10#', name='-10号柴油', standard_price=7.80, is_authorized=True),
        ]
        db.session.add_all(default_fuels)

    if Project.query.filter_by(project_code='DEFAULT').first() is None:
        default_project = Project(
            project_code='DEFAULT',
            project_name='待分摊项目',
            department='运营部',
            is_active=True
        )
        db.session.add(default_project)

    db.session.commit()


@app.route('/api/health')
def health_check():
    return jsonify({'status': 'ok', 'timestamp': datetime.utcnow().isoformat()})


@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': '未找到文件'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '未选择文件'}), 400

    if not DataImporter._allowed_file(file.filename):
        return jsonify({'error': '不支持的文件格式'}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    try:
        cleaned_records, stats = importer.import_file(filepath, filename)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    saved_ids = []
    for record in cleaned_records:
        if record['errors']:
            status = 'anomaly'
        elif record['warnings']:
            status = 'pending'
        else:
            status = 'pending'

        fuel_record = FuelRecord(
            batch_id=record['batch_id'],
            source_file=stats['source_file'],
            transaction_date=record.get('transaction_date'),
            card_number=record.get('card_number', ''),
            plate_number=record.get('plate_number', ''),
            driver_name=record.get('driver_name', ''),
            fuel_type=record.get('fuel_type', ''),
            quantity=record.get('quantity', 0),
            unit_price=record.get('unit_price', 0),
            total_amount=record.get('total_amount', 0),
            station_name=record.get('station_name', ''),
            remark=record.get('remark', ''),
            status=status
        )
        db.session.add(fuel_record)
        db.session.flush()
        saved_ids.append(fuel_record.id)

        AuditLogger.log_import(fuel_record.id, stats['source_file'])

    db.session.commit()

    for record_id in saved_ids:
        fuel_record = FuelRecord.query.get(record_id)
        anomalies = detect_and_save_anomalies(fuel_record)
        if anomalies:
            fuel_record.status = 'anomaly'
            db.session.commit()

    os.remove(filepath)

    return jsonify({
        'success': True,
        'stats': stats,
        'saved_ids': saved_ids,
        'message': f'成功导入 {len(saved_ids)} 条记录'
    })


@app.route('/api/fuel-records', methods=['GET'])
def get_fuel_records():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))
    status = request.args.get('status')
    has_anomaly = request.args.get('has_anomaly')
    period = request.args.get('period')
    search = request.args.get('search', '')

    query = FuelRecord.query

    if status:
        query = query.filter_by(status=status)

    if period:
        from sqlalchemy import func
        query = query.filter(func.strftime('%Y-%m', FuelRecord.transaction_date) == period)

    if search:
        search_pattern = f'%{search}%'
        query = query.filter(
            db.or_(
                FuelRecord.plate_number.like(search_pattern),
                FuelRecord.driver_name.like(search_pattern),
                FuelRecord.card_number.like(search_pattern)
            )
        )

    if has_anomaly == 'true':
        query = query.join(Anomaly).filter(Anomaly.is_resolved == False)

    total = query.count()
    records = query.order_by(FuelRecord.transaction_date.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    result = []
    for record in records:
        project = Project.query.get(record.project_id) if record.project_id else None
        anomalies = Anomaly.query.filter_by(fuel_record_id=record.id, is_resolved=False).all()
        anomaly_types = [a.anomaly_type for a in anomalies]

        result.append({
            'id': record.id,
            'batch_id': record.batch_id,
            'transaction_date': record.transaction_date.strftime('%Y-%m-%d %H:%M:%S') if record.transaction_date else '',
            'card_number': record.card_number,
            'plate_number': record.plate_number,
            'driver_name': record.driver_name,
            'fuel_type': record.fuel_type,
            'quantity': record.quantity,
            'unit_price': record.unit_price,
            'total_amount': record.total_amount,
            'station_name': record.station_name,
            'remark': record.remark,
            'status': record.status,
            'project_id': record.project_id,
            'project_code': project.project_code if project else '',
            'project_name': project.project_name if project else '',
            'has_anomaly': len(anomalies) > 0,
            'anomaly_count': len(anomalies),
            'anomaly_types': anomaly_types,
            'created_at': record.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })

    return jsonify({
        'total': total,
        'page': page,
        'per_page': per_page,
        'records': result
    })


@app.route('/api/fuel-records/<int:record_id>', methods=['GET'])
def get_fuel_record(record_id):
    record = FuelRecord.query.get_or_404(record_id)
    project = Project.query.get(record.project_id) if record.project_id else None
    anomalies = Anomaly.query.filter_by(fuel_record_id=record.id).all()
    audit_logs = AuditLogger.get_record_history(record_id)

    anomaly_list = []
    for a in anomalies:
        anomaly_list.append({
            'id': a.id,
            'type': a.anomaly_type,
            'severity': a.severity,
            'description': a.description,
            'suggestion': a.suggestion,
            'is_resolved': a.is_resolved,
            'resolved_by': a.resolved_by,
            'resolved_at': a.resolved_at.strftime('%Y-%m-%d %H:%M:%S') if a.resolved_at else None,
            'resolution_note': a.resolution_note
        })

    return jsonify({
        'id': record.id,
        'transaction_date': record.transaction_date.strftime('%Y-%m-%d %H:%M:%S') if record.transaction_date else '',
        'card_number': record.card_number,
        'plate_number': record.plate_number,
        'driver_name': record.driver_name,
        'fuel_type': record.fuel_type,
        'quantity': record.quantity,
        'unit_price': record.unit_price,
        'total_amount': record.total_amount,
        'station_name': record.station_name,
        'remark': record.remark,
        'status': record.status,
        'project_id': record.project_id,
        'project_code': project.project_code if project else '',
        'project_name': project.project_name if project else '',
        'anomalies': anomaly_list,
        'audit_logs': audit_logs
    })


@app.route('/api/fuel-records/<int:record_id>', methods=['PUT'])
def update_fuel_record(record_id):
    record = FuelRecord.query.get_or_404(record_id)
    data = request.json

    updateable_fields = ['plate_number', 'driver_name', 'fuel_type', 'quantity', 
                        'unit_price', 'total_amount', 'station_name', 'remark', 'project_id']

    for field in updateable_fields:
        if field in data:
            old_value = str(getattr(record, field)) if getattr(record, field) else None
            new_value = data[field]
            if str(new_value) != old_value:
                setattr(record, field, new_value)
                AuditLogger.log_edit(
                    fuel_record_id=record_id,
                    field_name=field,
                    old_value=old_value,
                    new_value=str(new_value),
                    operator=data.get('operator', 'admin')
                )

    Anomaly.query.filter_by(fuel_record_id=record_id, is_resolved=False).delete()
    detect_and_save_anomalies(record)

    record.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({'success': True, 'message': '记录已更新'})


@app.route('/api/anomalies/resolve/<int:anomaly_id>', methods=['POST'])
def resolve_anomaly(anomaly_id):
    anomaly = Anomaly.query.get_or_404(anomaly_id)
    data = request.json

    anomaly.is_resolved = True
    anomaly.resolved_by = data.get('operator', 'admin')
    anomaly.resolved_at = datetime.utcnow()
    anomaly.resolution_note = data.get('note', '')

    db.session.commit()

    AuditLogger.log_anomaly_resolved(
        fuel_record_id=anomaly.fuel_record_id,
        anomaly_type=anomaly.anomaly_type,
        operator=data.get('operator', 'admin')
    )

    return jsonify({'success': True, 'message': '异常已处理'})


@app.route('/api/projects', methods=['GET', 'POST'])
def manage_projects():
    if request.method == 'GET':
        projects = Project.query.filter_by(is_active=True).all()
        return jsonify([{
            'id': p.id,
            'project_code': p.project_code,
            'project_name': p.project_name,
            'department': p.department,
            'start_date': p.start_date.isoformat() if p.start_date else None,
            'end_date': p.end_date.isoformat() if p.end_date else None,
            'budget': p.budget
        } for p in projects])

    data = request.json
    project = Project(
        project_code=data['project_code'],
        project_name=data['project_name'],
        department=data.get('department', ''),
        start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else None,
        end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None,
        budget=data.get('budget')
    )
    db.session.add(project)
    db.session.commit()
    return jsonify({'success': True, 'id': project.id})


@app.route('/api/vehicles', methods=['GET', 'POST'])
def manage_vehicles():
    if request.method == 'GET':
        vehicles = Vehicle.query.filter_by(is_active=True).all()
        result = []
        for v in vehicles:
            driver = Driver.query.get(v.driver_id) if v.driver_id else None
            project = Project.query.get(v.default_project_id) if v.default_project_id else None
            result.append({
                'id': v.id,
                'plate_number': v.plate_number,
                'vehicle_type': v.vehicle_type,
                'driver_id': v.driver_id,
                'driver_name': driver.name if driver else '',
                'default_project_id': v.default_project_id,
                'default_project_name': project.project_name if project else '',
                'allowed_fuel_types': v.allowed_fuel_types
            })
        return jsonify(result)

    data = request.json
    vehicle = Vehicle(
        plate_number=data['plate_number'],
        vehicle_type=data.get('vehicle_type', ''),
        driver_id=data.get('driver_id'),
        default_project_id=data.get('default_project_id'),
        allowed_fuel_types=data.get('allowed_fuel_types')
    )
    db.session.add(vehicle)
    db.session.commit()
    detector.reload_reference_data()
    return jsonify({'success': True, 'id': vehicle.id})


@app.route('/api/drivers', methods=['GET', 'POST'])
def manage_drivers():
    if request.method == 'GET':
        drivers = Driver.query.filter_by(is_active=True).all()
        return jsonify([{
            'id': d.id,
            'name': d.name,
            'phone': d.phone,
            'employee_id': d.employee_id
        } for d in drivers])

    data = request.json
    driver = Driver(
        name=data['name'],
        phone=data.get('phone', ''),
        employee_id=data.get('employee_id', '')
    )
    db.session.add(driver)
    db.session.commit()
    return jsonify({'success': True, 'id': driver.id})


@app.route('/api/allocate/auto', methods=['POST'])
def auto_allocate():
    data = request.json
    record_ids = data.get('record_ids', [])
    operator = data.get('operator', 'admin')

    if not record_ids:
        unallocated = allocator.get_unallocated_records()
        record_ids = [r.id for r in unallocated]

    results = allocator.batch_allocate(record_ids, operator)
    return jsonify(results)


@app.route('/api/allocate/manual', methods=['POST'])
def manual_allocate():
    data = request.json
    allocation = allocator.manual_allocate(
        fuel_record_id=data['fuel_record_id'],
        project_id=data['project_id'],
        operator=data.get('operator', 'admin'),
        amount=data.get('amount')
    )
    return jsonify({'success': True, 'allocation_id': allocation.id})


@app.route('/api/allocation-summary', methods=['GET'])
def allocation_summary():
    period = request.args.get('period')
    summary = allocator.get_allocation_summary(period)
    return jsonify(summary)


@app.route('/api/driver-confirmations', methods=['GET'])
def get_driver_confirmations():
    driver_id = request.args.get('driver_id', type=int)
    confirmations = confirmation_service.get_pending_confirmations(driver_id)
    return jsonify(confirmations)


@app.route('/api/driver-confirmations/create', methods=['POST'])
def create_confirmations():
    data = request.json
    record_ids = data.get('record_ids', [])
    results = confirmation_service.batch_create_tasks(record_ids)
    return jsonify(results)


@app.route('/api/driver-confirmations/<int:confirmation_id>/confirm', methods=['POST'])
def confirm_record(confirmation_id):
    data = request.json
    confirmation = confirmation_service.confirm_record(
        confirmation_id=confirmation_id,
        driver_id=data['driver_id'],
        confirmed=data.get('confirmed', True),
        driver_remark=data.get('driver_remark'),
        corrected_plate=data.get('corrected_plate'),
        corrected_project_id=data.get('corrected_project_id')
    )
    return jsonify({'success': True, 'status': confirmation.status})


@app.route('/api/export/fuel-records', methods=['GET'])
def export_fuel_records():
    period = request.args.get('period')
    status = request.args.get('status')

    query = FuelRecord.query
    if period:
        from sqlalchemy import func
        query = query.filter(func.strftime('%Y-%m', FuelRecord.transaction_date) == period)
    if status:
        query = query.filter_by(status=status)

    records = query.all()
    output, filename = ReportExporter.export_fuel_records(records)
    return send_file(output, as_attachment=True, download_name=filename)


@app.route('/api/export/allocation-report', methods=['GET'])
def export_allocation_report():
    period = request.args.get('period')
    output, filename = ReportExporter.export_allocation_report(period)
    return send_file(output, as_attachment=True, download_name=filename)


@app.route('/api/export/anomaly-report', methods=['GET'])
def export_anomaly_report():
    period = request.args.get('period')
    output, filename = ReportExporter.export_anomaly_report(period)
    return send_file(output, as_attachment=True, download_name=filename)


@app.route('/api/export/project-summary', methods=['GET'])
def export_project_summary():
    period = request.args.get('period')
    output, filename = ReportExporter.export_project_summary(period)
    return send_file(output, as_attachment=True, download_name=filename)


@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    period = request.args.get('period')
    data = ReportExporter.get_dashboard_data(period)
    return jsonify(data)


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        _init_reference_data()
    app.run(debug=True, host='0.0.0.0', port=5001)
