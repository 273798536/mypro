from flask import Blueprint, request, jsonify, send_from_directory
import os
from config import EXPORT_DIR
from services.idempotency import check_idempotency, save_idempotency_key
from services.data_processor import (
    validate_data, save_dirty_record, parse_datetime, check_and_detect_anomalies,
    safe_update_fact_record
)
from services.reconciliation import run_reconciliation, get_reconciliation_result, analyze_anomalies
from services.exporter import export_to_excel
from models.database import get_session
from models.tables import Registration, SignRecord, Homework, Refund, DirtyRecord

api_bp = Blueprint('api', __name__)

@api_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': '企业培训签到验收回放链路服务运行正常'})

@api_bp.route('/registration', methods=['POST'])
def add_registration():
    data = request.get_json()
    batch_id = data.get('batch_id', 'default')
    
    is_valid, errors = validate_data('registration', data)
    if not is_valid:
        save_dirty_record(batch_id, 'registration', 'MISSING_FIELD', data, '; '.join(errors))
        return jsonify({'error': '数据验证失败', 'errors': errors}), 400
    
    existing_id = check_idempotency('registration', data)
    session = get_session()
    
    try:
        if existing_id:
            reg = session.query(Registration).filter_by(id=existing_id).first()
            if reg:
                reg.employee_name = data.get('employee_name', reg.employee_name)
                reg.department = data.get('department', reg.department)
                reg.training_course = data.get('training_course', reg.training_course)
                reg.training_date = data.get('training_date', reg.training_date)
                reg.amount = data.get('amount', reg.amount)
                reg.status = data.get('status', reg.status)
                reg.raw_data = data
                session.commit()
                return jsonify({
                    'message': '报名信息已更新（幂等处理）',
                    'id': reg.id,
                    'updated': True
                })
        
        existing_reg = session.query(Registration).filter_by(
            batch_id=batch_id,
            employee_id=data['employee_id'],
            training_course=data['training_course']
        ).first()
        
        if existing_reg:
            existing_reg.employee_name = data.get('employee_name', existing_reg.employee_name)
            existing_reg.department = data.get('department', existing_reg.department)
            existing_reg.training_date = data.get('training_date', existing_reg.training_date)
            existing_reg.amount = data.get('amount', existing_reg.amount)
            existing_reg.status = data.get('status', existing_reg.status)
            existing_reg.raw_data = data
            session.commit()
            save_idempotency_key('registration', data, existing_reg.id)
            return jsonify({
                'message': '报名信息已更新（幂等处理）',
                'id': existing_reg.id,
                'updated': True
            })
        
        reg = Registration(
            batch_id=batch_id,
            employee_id=data['employee_id'],
            employee_name=data['employee_name'],
            department=data.get('department'),
            training_course=data['training_course'],
            training_date=data.get('training_date'),
            registration_time=parse_datetime(data['registration_time']) if data.get('registration_time') else None,
            amount=data.get('amount', 0),
            status=data.get('status', 'registered'),
            raw_data=data
        )
        session.add(reg)
        session.flush()
        save_idempotency_key('registration', data, reg.id)
        session.commit()
        
        return jsonify({'message': '报名信息已录入', 'id': reg.id}), 201
    except Exception as e:
        session.rollback()
        save_dirty_record(batch_id, 'registration', 'INVALID_FORMAT', data, str(e))
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@api_bp.route('/sign', methods=['POST'])
def add_sign():
    data = request.get_json()
    batch_id = data.get('batch_id', 'default')
    
    is_valid, errors = validate_data('sign', data)
    if not is_valid:
        save_dirty_record(batch_id, 'sign', 'MISSING_FIELD', data, '; '.join(errors))
        return jsonify({'error': '数据验证失败', 'errors': errors}), 400
    
    existing_id = check_idempotency('sign', data)
    session = get_session()
    anomalies = []
    
    try:
        anomalies = check_and_detect_anomalies(session, 'sign', data)
        
        if existing_id:
            sign = session.query(SignRecord).filter_by(id=existing_id).first()
            if sign:
                sign.employee_id = data.get('employee_id', sign.employee_id)
                sign.employee_name = data.get('employee_name', sign.employee_name)
                sign.training_course = data.get('training_course', sign.training_course)
                sign.sign_time = parse_datetime(data['sign_time']) if data.get('sign_time') else sign.sign_time
                sign.sign_type = data.get('sign_type', sign.sign_type)
                sign.qr_code = data.get('qr_code', sign.qr_code)
                sign.location = data.get('location', sign.location)
                sign.device_info = data.get('device_info', sign.device_info)
                sign.is_proxy = data.get('is_proxy', sign.is_proxy)
                sign.is_makeup = data.get('is_makeup', sign.is_makeup)
                sign.raw_data = data
                session.commit()
                
                for anomaly in anomalies:
                    save_dirty_record(batch_id, 'sign', anomaly['dirty_type'], data, anomaly['error_message'])
                
                return jsonify({
                    'message': '签到记录已更新（幂等处理）',
                    'id': sign.id,
                    'updated': True,
                    'anomalies': anomalies
                })
        
        existing_sign = session.query(SignRecord).filter_by(
            batch_id=batch_id,
            sign_id=data['sign_id']
        ).first()
        
        if existing_sign:
            existing_sign.employee_id = data.get('employee_id', existing_sign.employee_id)
            existing_sign.employee_name = data.get('employee_name', existing_sign.employee_name)
            existing_sign.training_course = data.get('training_course', existing_sign.training_course)
            existing_sign.sign_time = parse_datetime(data['sign_time']) if data.get('sign_time') else existing_sign.sign_time
            existing_sign.sign_type = data.get('sign_type', existing_sign.sign_type)
            existing_sign.qr_code = data.get('qr_code', existing_sign.qr_code)
            existing_sign.location = data.get('location', existing_sign.location)
            existing_sign.device_info = data.get('device_info', existing_sign.device_info)
            existing_sign.is_proxy = data.get('is_proxy', existing_sign.is_proxy)
            existing_sign.is_makeup = data.get('is_makeup', existing_sign.is_makeup)
            existing_sign.raw_data = data
            session.commit()
            save_idempotency_key('sign', data, existing_sign.id)
            
            for anomaly in anomalies:
                save_dirty_record(batch_id, 'sign', anomaly['dirty_type'], data, anomaly['error_message'])
            
            return jsonify({
                'message': '签到记录已更新（幂等处理）',
                'id': existing_sign.id,
                'updated': True,
                'anomalies': anomalies
            })
        
        sign = SignRecord(
            batch_id=batch_id,
            sign_id=data['sign_id'],
            employee_id=data.get('employee_id'),
            employee_name=data.get('employee_name'),
            training_course=data.get('training_course'),
            sign_time=parse_datetime(data['sign_time']),
            sign_type=data.get('sign_type', 'normal'),
            qr_code=data.get('qr_code'),
            location=data.get('location'),
            device_info=data.get('device_info'),
            is_proxy=data.get('is_proxy', False),
            is_makeup=data.get('is_makeup', False),
            raw_data=data
        )
        session.add(sign)
        session.flush()
        save_idempotency_key('sign', data, sign.id)
        session.commit()
        
        for anomaly in anomalies:
            save_dirty_record(batch_id, 'sign', anomaly['dirty_type'], data, anomaly['error_message'])
        
        return jsonify({
            'message': '签到记录已录入',
            'id': sign.id,
            'anomalies': anomalies
        }), 201
    except Exception as e:
        session.rollback()
        save_dirty_record(batch_id, 'sign', 'INVALID_FORMAT', data, str(e))
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@api_bp.route('/homework', methods=['POST'])
def add_homework():
    data = request.get_json()
    batch_id = data.get('batch_id', 'default')
    
    is_valid, errors = validate_data('homework', data)
    if not is_valid:
        save_dirty_record(batch_id, 'homework', 'MISSING_FIELD', data, '; '.join(errors))
        return jsonify({'error': '数据验证失败', 'errors': errors}), 400
    
    existing_id = check_idempotency('homework', data)
    session = get_session()
    
    try:
        if existing_id:
            hw = session.query(Homework).filter_by(id=existing_id).first()
            if hw:
                hw.employee_id = data.get('employee_id', hw.employee_id)
                hw.employee_name = data.get('employee_name', hw.employee_name)
                hw.training_course = data.get('training_course', hw.training_course)
                hw.submit_time = parse_datetime(data['submit_time']) if data.get('submit_time') else hw.submit_time
                hw.score = data.get('score', hw.score)
                hw.status = data.get('status', hw.status)
                hw.raw_data = data
                session.commit()
                return jsonify({
                    'message': '作业记录已更新（幂等处理）',
                    'id': hw.id,
                    'updated': True
                })
        
        existing_hw = session.query(Homework).filter_by(
            batch_id=batch_id,
            homework_id=data['homework_id']
        ).first()
        
        if existing_hw:
            existing_hw.employee_id = data.get('employee_id', existing_hw.employee_id)
            existing_hw.employee_name = data.get('employee_name', existing_hw.employee_name)
            existing_hw.training_course = data.get('training_course', existing_hw.training_course)
            existing_hw.submit_time = parse_datetime(data['submit_time']) if data.get('submit_time') else existing_hw.submit_time
            existing_hw.score = data.get('score', existing_hw.score)
            existing_hw.status = data.get('status', existing_hw.status)
            existing_hw.raw_data = data
            session.commit()
            save_idempotency_key('homework', data, existing_hw.id)
            return jsonify({
                'message': '作业记录已更新（幂等处理）',
                'id': existing_hw.id,
                'updated': True
            })
        
        hw = Homework(
            batch_id=batch_id,
            homework_id=data['homework_id'],
            employee_id=data.get('employee_id'),
            employee_name=data.get('employee_name'),
            training_course=data.get('training_course'),
            submit_time=parse_datetime(data['submit_time']) if data.get('submit_time') else None,
            score=data.get('score'),
            status=data.get('status', 'submitted'),
            raw_data=data
        )
        session.add(hw)
        session.flush()
        save_idempotency_key('homework', data, hw.id)
        session.commit()
        
        return jsonify({'message': '作业记录已录入', 'id': hw.id}), 201
    except Exception as e:
        session.rollback()
        save_dirty_record(batch_id, 'homework', 'INVALID_FORMAT', data, str(e))
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@api_bp.route('/refund', methods=['POST'])
def add_refund():
    data = request.get_json()
    batch_id = data.get('batch_id', 'default')
    
    is_valid, errors = validate_data('refund', data)
    if not is_valid:
        save_dirty_record(batch_id, 'refund', 'MISSING_FIELD', data, '; '.join(errors))
        return jsonify({'error': '数据验证失败', 'errors': errors}), 400
    
    existing_id = check_idempotency('refund', data)
    session = get_session()
    anomalies = []
    
    try:
        anomalies = check_and_detect_anomalies(session, 'refund', data)
        
        if existing_id:
            refund = session.query(Refund).filter_by(id=existing_id).first()
            if refund:
                refund.employee_id = data.get('employee_id', refund.employee_id)
                refund.employee_name = data.get('employee_name', refund.employee_name)
                refund.training_course = data.get('training_course', refund.training_course)
                refund.refund_amount = data.get('refund_amount', refund.refund_amount)
                refund.refund_time = parse_datetime(data['refund_time']) if data.get('refund_time') else refund.refund_time
                refund.refund_reason = data.get('refund_reason', refund.refund_reason)
                refund.raw_data = data
                session.commit()
                
                for anomaly in anomalies:
                    save_dirty_record(batch_id, 'refund', anomaly['dirty_type'], data, anomaly['error_message'])
                
                return jsonify({
                    'message': '退款记录已更新（幂等处理）',
                    'id': refund.id,
                    'updated': True,
                    'anomalies': anomalies
                })
        
        existing_refund = session.query(Refund).filter_by(
            batch_id=batch_id,
            refund_id=data['refund_id']
        ).first()
        
        if existing_refund:
            existing_refund.employee_id = data.get('employee_id', existing_refund.employee_id)
            existing_refund.employee_name = data.get('employee_name', existing_refund.employee_name)
            existing_refund.training_course = data.get('training_course', existing_refund.training_course)
            existing_refund.refund_amount = data.get('refund_amount', existing_refund.refund_amount)
            existing_refund.refund_time = parse_datetime(data['refund_time']) if data.get('refund_time') else existing_refund.refund_time
            existing_refund.refund_reason = data.get('refund_reason', existing_refund.refund_reason)
            existing_refund.raw_data = data
            session.commit()
            save_idempotency_key('refund', data, existing_refund.id)
            
            for anomaly in anomalies:
                save_dirty_record(batch_id, 'refund', anomaly['dirty_type'], data, anomaly['error_message'])
            
            return jsonify({
                'message': '退款记录已更新（幂等处理）',
                'id': existing_refund.id,
                'updated': True,
                'anomalies': anomalies
            })
        
        refund = Refund(
            batch_id=batch_id,
            refund_id=data['refund_id'],
            employee_id=data.get('employee_id'),
            employee_name=data.get('employee_name'),
            training_course=data.get('training_course'),
            refund_amount=data['refund_amount'],
            refund_time=parse_datetime(data['refund_time']) if data.get('refund_time') else None,
            refund_reason=data.get('refund_reason'),
            raw_data=data
        )
        session.add(refund)
        session.flush()
        save_idempotency_key('refund', data, refund.id)
        session.commit()
        
        for anomaly in anomalies:
            save_dirty_record(batch_id, 'refund', anomaly['dirty_type'], data, anomaly['error_message'])
        
        return jsonify({
            'message': '退款记录已录入',
            'id': refund.id,
            'anomalies': anomalies
        }), 201
    except Exception as e:
        session.rollback()
        save_dirty_record(batch_id, 'refund', 'INVALID_FORMAT', data, str(e))
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@api_bp.route('/reconcile/<batch_id>', methods=['POST'])
def reconcile(batch_id):
    try:
        result = run_reconciliation(batch_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/reconcile/<batch_id>', methods=['GET'])
def get_reconcile(batch_id):
    result = get_reconciliation_result(batch_id)
    if not result:
        return jsonify({'error': '未找到对账结果，请先执行对账'}), 404
    return jsonify(result)

@api_bp.route('/anomalies/<batch_id>', methods=['GET'])
def get_anomalies(batch_id):
    try:
        result = analyze_anomalies(batch_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/export/<batch_id>', methods=['GET'])
def export(batch_id):
    try:
        filename = export_to_excel(batch_id)
        return jsonify({
            'message': '导出成功',
            'filename': filename,
            'download_url': f'/api/download/{filename}'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/download/<filename>', methods=['GET'])
def download(filename):
    return send_from_directory(EXPORT_DIR, filename, as_attachment=True)

@api_bp.route('/dirty/<batch_id>', methods=['GET'])
def get_dirty_records(batch_id):
    session = get_session()
    try:
        dirty = session.query(DirtyRecord).filter_by(batch_id=batch_id).all()
        result = [{
            'id': d.id,
            'data_type': d.data_type,
            'dirty_type': d.dirty_type,
            'error_message': d.error_message,
            'raw_data': d.raw_data,
            'suggestion': d.suggestion,
            'is_fixed': d.is_fixed,
            'fixed_by': d.fixed_by,
            'fixed_data': d.fixed_data,
            'created_at': d.created_at.isoformat()
        } for d in dirty]
        return jsonify({'count': len(result), 'records': result})
    finally:
        session.close()

@api_bp.route('/dirty/<dirty_id>/fix', methods=['POST'])
def fix_dirty_record(dirty_id):
    data = request.get_json()
    session = get_session()
    
    try:
        dirty = session.query(DirtyRecord).filter_by(id=dirty_id).first()
        if not dirty:
            return jsonify({'error': '脏记录不存在'}), 404
        
        fixed_data = data.get('fixed_data', {})
        updated_fields = {}
        fact_record = None
        
        if fixed_data and dirty.data_type:
            batch_id = dirty.batch_id
            
            if dirty.data_type == 'registration':
                fact_record = session.query(Registration).filter_by(
                    batch_id=batch_id,
                    employee_id=dirty.raw_data.get('employee_id')
                ).first()
            
            elif dirty.data_type == 'sign':
                fact_record = session.query(SignRecord).filter_by(
                    batch_id=batch_id,
                    sign_id=dirty.raw_data.get('sign_id')
                ).first()
            
            elif dirty.data_type == 'homework':
                fact_record = session.query(Homework).filter_by(
                    batch_id=batch_id,
                    homework_id=dirty.raw_data.get('homework_id')
                ).first()
            
            elif dirty.data_type == 'refund':
                fact_record = session.query(Refund).filter_by(
                    batch_id=batch_id,
                    refund_id=dirty.raw_data.get('refund_id')
                ).first()
            
            if fact_record:
                updated_fields = safe_update_fact_record(fact_record, fixed_data)
                fact_record.raw_data = {**dirty.raw_data, **fixed_data}
        
        dirty.is_fixed = True
        dirty.fixed_by = data.get('fixed_by', 'system')
        dirty.fixed_data = fixed_data
        
        session.commit()
        
        result = {
            'message': '脏记录已修复，事实数据已更新',
            'fixed_data_applied': bool(fixed_data),
            'updated_fields': list(updated_fields.keys()) if updated_fields else [],
            'fact_record_updated': fact_record is not None
        }
        
        if fact_record:
            if isinstance(fact_record, Registration):
                result['fact_record'] = {
                    'employee_id': fact_record.employee_id,
                    'employee_name': fact_record.employee_name,
                    'training_date': fact_record.training_date,
                    'amount': fact_record.amount
                }
            elif isinstance(fact_record, SignRecord):
                result['fact_record'] = {
                    'sign_id': fact_record.sign_id,
                    'employee_id': fact_record.employee_id,
                    'employee_name': fact_record.employee_name,
                    'sign_time': fact_record.sign_time.isoformat() if fact_record.sign_time else None,
                    'location': fact_record.location,
                    'is_proxy': fact_record.is_proxy,
                    'is_makeup': fact_record.is_makeup
                }
            elif isinstance(fact_record, Homework):
                result['fact_record'] = {
                    'homework_id': fact_record.homework_id,
                    'employee_id': fact_record.employee_id,
                    'score': fact_record.score,
                    'status': fact_record.status
                }
            elif isinstance(fact_record, Refund):
                result['fact_record'] = {
                    'refund_id': fact_record.refund_id,
                    'employee_id': fact_record.employee_id,
                    'refund_amount': fact_record.refund_amount,
                    'refund_time': fact_record.refund_time.isoformat() if fact_record.refund_time else None
                }
        
        return jsonify(result)
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@api_bp.route('/history', methods=['GET'])
def get_history():
    session = get_session()
    try:
        from models.tables import ReconciliationResult
        results = session.query(ReconciliationResult).order_by(
            ReconciliationResult.created_at.desc()
        ).all()
        
        history = [{
            'batch_id': r.batch_id,
            'total_registrations': r.total_registrations,
            'signed_count': r.signed_count,
            'unsigned_count': r.unsigned_count,
            'dirty_count': r.dirty_count,
            'unfixed_dirty_count': r.unfixed_dirty_count,
            'report_generated_at': r.report_generated_at.isoformat() if r.report_generated_at else None
        } for r in results]
        
        return jsonify({'count': len(history), 'history': history})
    finally:
        session.close()
