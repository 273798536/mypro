from datetime import datetime
from sqlalchemy import DateTime, Float, Boolean, Integer, String
from models.database import get_session
from models.tables import DirtyRecord, Registration, SignRecord, Refund

DIRTY_TYPES = {
    'MISSING_FIELD': '缺字段',
    'CROSS_DATE': '跨日',
    'NAME_CHANGE': '改名',
    'AMOUNT_CONFLICT': '金额冲突',
    'COUNT_CONFLICT': '数量冲突',
    'INVALID_FORMAT': '格式错误'
}

def validate_data(data_type: str, data: dict) -> tuple:
    errors = []
    
    if data_type == 'registration':
        required = ['batch_id', 'employee_id', 'employee_name', 'training_course']
        for field in required:
            if field not in data or not data[field]:
                errors.append(f"缺少必填字段: {field}")
    
    elif data_type == 'sign':
        required = ['batch_id', 'sign_id', 'sign_time']
        for field in required:
            if field not in data or not data[field]:
                errors.append(f"缺少必填字段: {field}")
    
    elif data_type == 'homework':
        required = ['batch_id', 'homework_id']
        for field in required:
            if field not in data or not data[field]:
                errors.append(f"缺少必填字段: {field}")
    
    elif data_type == 'refund':
        required = ['batch_id', 'refund_id', 'refund_amount']
        for field in required:
            if field not in data or not data[field]:
                errors.append(f"缺少必填字段: {field}")
    
    return (len(errors) == 0, errors)

def save_dirty_record(batch_id: str, data_type: str, dirty_type: str, 
                      raw_data: dict, error_message: str = None, 
                      suggestion: str = None):
    session = get_session()
    try:
        existing = session.query(DirtyRecord).filter_by(
            batch_id=batch_id,
            data_type=data_type,
            dirty_type=dirty_type,
            is_fixed=False
        ).first()
        
        raw_str = str(sorted(raw_data.items()))
        
        if existing:
            existing_raw = str(sorted(existing.raw_data.items()))
            if existing_raw == raw_str:
                return existing.id
        
        dirty = DirtyRecord(
            batch_id=batch_id,
            data_type=data_type,
            dirty_type=dirty_type,
            error_message=error_message,
            raw_data=raw_data,
            suggestion=suggestion or get_suggestion(dirty_type, raw_data)
        )
        session.add(dirty)
        session.commit()
        return dirty.id
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()

def get_suggestion(dirty_type: str, data: dict) -> str:
    suggestions = {
        'MISSING_FIELD': '请补充缺失的必填字段后重新提交',
        'CROSS_DATE': '签到时间跨日，请确认实际签到日期或标记为补签',
        'NAME_CHANGE': '员工姓名与报名表不一致，请核实员工ID是否正确或更新姓名',
        'AMOUNT_CONFLICT': '退款金额与报名金额不一致，请核实金额或备注原因',
        'COUNT_CONFLICT': '签到次数异常，请核实或标记为代签到',
        'INVALID_FORMAT': '数据格式错误，请检查日期、数字等字段格式'
    }
    return suggestions.get(dirty_type, '请检查数据完整性')

def parse_datetime(date_str: str) -> datetime:
    formats = [
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%d %H:%M',
        '%Y/%m/%d %H:%M:%S',
        '%Y/%m/%d %H:%M',
        '%Y-%m-%d',
        '%Y/%m/%d'
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"无法解析日期格式: {date_str}")

def detect_cross_date(session, sign_data: dict) -> bool:
    sign_time = sign_data.get('sign_time')
    if not sign_time:
        return False
    
    employee_id = sign_data.get('employee_id')
    batch_id = sign_data.get('batch_id')
    
    try:
        sign_dt = parse_datetime(sign_time)
    except ValueError:
        return False
    
    if employee_id and batch_id:
        reg = session.query(Registration).filter_by(
            batch_id=batch_id,
            employee_id=employee_id
        ).first()
        
        if reg and reg.training_date:
            try:
                train_dt = parse_datetime(reg.training_date)
                return sign_dt.date() != train_dt.date()
            except ValueError:
                pass
    
    return False

def detect_name_change(session, sign_data: dict) -> tuple:
    employee_id = sign_data.get('employee_id')
    sign_name = sign_data.get('employee_name')
    batch_id = sign_data.get('batch_id')
    
    if not employee_id or not sign_name or not batch_id:
        return (False, None, None)
    
    reg = session.query(Registration).filter_by(
        batch_id=batch_id,
        employee_id=employee_id
    ).first()
    
    if reg and reg.employee_name != sign_name:
        return (True, reg.employee_name, sign_name)
    
    return (False, None, None)

def detect_amount_conflict(session, refund_data: dict) -> tuple:
    employee_id = refund_data.get('employee_id')
    refund_amount = refund_data.get('refund_amount')
    batch_id = refund_data.get('batch_id')
    
    if not employee_id or not refund_amount or not batch_id:
        return (False, None, None)
    
    reg = session.query(Registration).filter_by(
        batch_id=batch_id,
        employee_id=employee_id
    ).first()
    
    if reg and reg.amount and float(reg.amount) != float(refund_amount):
        return (True, reg.amount, refund_amount)
    
    return (False, None, None)

def detect_count_conflict(session, sign_data: dict) -> tuple:
    employee_id = sign_data.get('employee_id')
    batch_id = sign_data.get('batch_id')
    sign_id = sign_data.get('sign_id')
    
    if not employee_id or not batch_id:
        return (False, 0, 0)
    
    existing_count = session.query(SignRecord).filter_by(
        batch_id=batch_id,
        employee_id=employee_id
    ).count()
    
    if existing_count > 0:
        return (True, existing_count, existing_count + 1)
    
    return (False, 0, 1)

def check_and_detect_anomalies(session, data_type: str, data: dict) -> list:
    anomalies = []
    
    if data_type == 'sign':
        if detect_cross_date(session, data):
            anomalies.append({
                'dirty_type': 'CROSS_DATE',
                'error_message': f"签到时间 {data.get('sign_time')} 与培训日期不一致"
            })
        
        has_name_change, reg_name, sign_name = detect_name_change(session, data)
        if has_name_change:
            anomalies.append({
                'dirty_type': 'NAME_CHANGE',
                'error_message': f"姓名不一致: 报名姓名={reg_name}, 签到姓名={sign_name}"
            })
        
        has_conflict, existing_count, new_count = detect_count_conflict(session, data)
        if has_conflict:
            anomalies.append({
                'dirty_type': 'COUNT_CONFLICT',
                'error_message': f"该员工已有 {existing_count} 条签到记录，本次为第 {new_count} 条"
            })
    
    elif data_type == 'refund':
        has_amount_conflict, reg_amount, refund_amount = detect_amount_conflict(session, data)
        if has_amount_conflict:
            anomalies.append({
                'dirty_type': 'AMOUNT_CONFLICT',
                'error_message': f"退款金额 {refund_amount} 与报名金额 {reg_amount} 不一致"
            })
    
    return anomalies

def convert_field_value(model, field_name: str, value):
    if value is None:
        return None
    
    try:
        column = getattr(model.__class__, field_name)
        column_type = column.property.columns[0].type
        
        if isinstance(column_type, DateTime):
            if isinstance(value, datetime):
                return value
            return parse_datetime(value)
        
        elif isinstance(column_type, Float):
            return float(value)
        
        elif isinstance(column_type, Integer):
            return int(value)
        
        elif isinstance(column_type, Boolean):
            if isinstance(value, bool):
                return value
            return str(value).lower() in ('true', '1', 'yes', 'y')
        
        elif isinstance(column_type, String):
            return str(value)
        
        return value
    
    except Exception as e:
        raise ValueError(f"字段 {field_name} 转换失败: {str(e)}")

def safe_update_fact_record(model_instance, fixed_data: dict):
    updated_fields = {}
    errors = []
    
    for key, value in fixed_data.items():
        if hasattr(model_instance, key) and value is not None:
            try:
                converted_value = convert_field_value(model_instance, key, value)
                setattr(model_instance, key, converted_value)
                updated_fields[key] = converted_value
            except Exception as e:
                errors.append(f"{key}: {str(e)}")
    
    if errors:
        raise ValueError("字段转换错误: " + "; ".join(errors))
    
    return updated_fields
