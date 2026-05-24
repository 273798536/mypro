import hashlib
import json
from models.database import get_session
from models.tables import IdempotencyKey

def generate_idempotency_key(data_type: str, data: dict) -> str:
    data_str = json.dumps(data, sort_keys=True, ensure_ascii=False)
    raw_key = f"{data_type}:{data_str}"
    return hashlib.md5(raw_key.encode('utf-8')).hexdigest()

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
