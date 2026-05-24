from typing import Optional, Type, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app import models


class IdempotencyService:
    @staticmethod
    def check_and_get_record(
        db: Session,
        idempotency_key: str,
        request_type: str
    ) -> Optional[models.IdempotencyRecord]:
        return db.query(models.IdempotencyRecord).filter(
            models.IdempotencyRecord.idempotency_key == idempotency_key,
            models.IdempotencyRecord.request_type == request_type
        ).first()

    @staticmethod
    def create_record(
        db: Session,
        idempotency_key: str,
        request_type: str,
        record_id: int,
        record_type: str
    ) -> models.IdempotencyRecord:
        record = models.IdempotencyRecord(
            idempotency_key=idempotency_key,
            request_type=request_type,
            record_id=record_id,
            record_type=record_type
        )
        try:
            db.add(record)
            db.flush()
            return record
        except IntegrityError:
            db.rollback()
            return IdempotencyService.check_and_get_record(db, idempotency_key, request_type)

    @staticmethod
    def process_with_idempotency(
        db: Session,
        idempotency_key: Optional[str],
        request_type: str,
        model_class: Type,
        create_func,
        update_func=None
    ) -> Any:
        if not idempotency_key:
            return create_func()

        existing = IdempotencyService.check_and_get_record(db, idempotency_key, request_type)
        if existing:
            record = db.query(model_class).filter(model_class.id == existing.record_id).first()
            if record and update_func:
                record = update_func(record)
                db.add(record)
                db.flush()
            return record

        new_record = create_func()
        db.flush()

        IdempotencyService.create_record(
            db,
            idempotency_key,
            request_type,
            new_record.id,
            model_class.__name__
        )

        return new_record


def generate_idempotency_key(*args) -> str:
    return "_".join(str(arg) for arg in args if arg is not None)
