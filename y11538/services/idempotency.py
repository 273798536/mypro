import hashlib
from models.database import get_session
from models.tables import IdempotencyKey

def get_business_key(data_type: str, data: dict) -> str:
    key_fields = {
        'registration': ['batch_id', 'employee_id', 'training_course'],
        'sign': ['batch_id', 'sign_id'],
        'homework': ['batch_id', 'homework_id'],
        'refund': ['batch_id', 'refund_id']
    }
    
    fields = key_fields.get(data_type, [])
    key_parts = [data_type]
    for field in fields:
        value = data.get(field, '')
        key_parts.append(str(value))
    
    return ':'.join(key_parts)

def generate_idempotency_key(data_type: str, data: dict) -> str:
    business_key = get_business_key(data_type, data)
    return hashlib.md5(business_key.encode('utf-8')).hexdigest()

def check_idempotency(data_type: str, data: dict):
    session = get_session()
    try:
        key = generate_idempotency_key(data_type, data)
        existing = session.query(IdempotencyKey).filter_by(
            idempotency_key=key,
            data_type=data_type
        ).first()
        return existing.record_id if existing else None
    finally:
        session.close()

def save_idempotency_key(data_type: str, data: dict, record_id: int):
    session = get_session()
    try:
        key = generate_idempotency_key(data_type, data)
        idempotent = IdempotencyKey(
            idempotency_key=key,
            data_type=data_type,
            record_id=record_id
        )
        session.add(idempotent)
        session.commit()
        return key
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()
