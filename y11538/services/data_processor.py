from datetime import datetime
from models.database import get_session
from models.tables import DirtyRecord

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

def detect_name_change(employee_id: str, current_name: str, 
                       existing_names: list) -> bool:
    if not existing_names:
        return False
    return current_name not in existing_names and len(existing_names) > 0

def detect_cross_date(sign_time: datetime, training_date: str) -> bool:
    if not training_date:
        return False
    try:
        train_date = parse_datetime(training_date).date()
        return sign_time.date() != train_date
    except:
        return False
