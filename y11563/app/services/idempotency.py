import hashlib
import json
from datetime import datetime
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.idempotency import IdempotencyRecord


class IdempotencyService:
    def __init__(self, db: Session):
        self.db = db

    def generate_key(self, record_type: str, record_id: str, custom_key: Optional[str] = None) -> str:
        if custom_key:
            return custom_key
        key_string = f"{record_type}:{record_id}"
        return hashlib.md5(key_string.encode()).hexdigest()

    def generate_request_hash(self, data: Dict[str, Any]) -> str:
        sorted_data = json.dumps(data, sort_keys=True)
        return hashlib.sha256(sorted_data.encode()).hexdigest()

    def check_and_record(
        self,
        idempotency_key: str,
        request_type: str,
        record_type: str,
        record_id: str,
        request_data: Dict[str, Any],
    ) -> Tuple[bool, Optional[IdempotencyRecord]]:
        existing = self.db.query(IdempotencyRecord).filter(
            IdempotencyRecord.idempotency_key == idempotency_key
        ).first()

        if existing:
            existing.last_request_time = datetime.utcnow()
            existing.request_count += 1
            self.db.commit()
            return True, existing

        request_hash = self.generate_request_hash(request_data)
        new_record = IdempotencyRecord(
            idempotency_key=idempotency_key,
            request_type=request_type,
            record_type=record_type,
            record_id=record_id,
            request_hash=request_hash,
            first_request_time=datetime.utcnow(),
            last_request_time=datetime.utcnow(),
            process_status="processing",
        )
        self.db.add(new_record)
        self.db.commit()
        self.db.refresh(new_record)
        return False, new_record

    def update_status(
        self,
        idempotency_key: str,
        status: str,
        response_data: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> Optional[IdempotencyRecord]:
        record = self.db.query(IdempotencyRecord).filter(
            IdempotencyRecord.idempotency_key == idempotency_key
        ).first()
        if record:
            record.process_status = status
            record.response_data = response_data
            record.error_message = error_message
            self.db.commit()
            self.db.refresh(record)
        return record

    def get_record(self, idempotency_key: str) -> Optional[IdempotencyRecord]:
        return self.db.query(IdempotencyRecord).filter(
            IdempotencyRecord.idempotency_key == idempotency_key
        ).first()
