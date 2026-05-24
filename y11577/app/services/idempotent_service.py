import hashlib
import json
from typing import Any, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.business import (
    OutsourceDelivery,
    RepairRecord,
    DeductionDetail,
    ShiftRecord,
    TemporarySupplement,
    FailedRecord
)


class IdempotentService:
    @staticmethod
    def generate_idempotent_key(business_type: str, **kwargs) -> str:
        key_components = {
            "business_type": business_type,
            **kwargs
        }
        key_string = json.dumps(key_components, sort_keys=True, ensure_ascii=False)
        return hashlib.md5(key_string.encode('utf-8')).hexdigest()

    @staticmethod
    def generate_delivery_key(supplier_code: str, delivery_no: str, delivery_date: str) -> str:
        return f"DELIVERY_{supplier_code}_{delivery_no}_{delivery_date}"

    @staticmethod
    def generate_repair_key(delivery_id: int, batch_no: str) -> str:
        return f"REPAIR_{delivery_id}_{batch_no}"

    @staticmethod
    def generate_deduction_key(delivery_id: int, deduction_type: str) -> str:
        return f"DEDUCTION_{delivery_id}_{deduction_type}"

    @staticmethod
    def generate_shift_key(shift_date: str, shift_type: str, team_code: str) -> str:
        return f"SHIFT_{shift_date}_{shift_type}_{team_code}"

    @staticmethod
    def generate_supplement_key(supplement_type: str, supplement_date: str, related_order_no: str) -> str:
        return f"SUPPLEMENT_{supplement_type}_{supplement_date}_{related_order_no}"

    @staticmethod
    def find_existing_record(db: Session, model_class, idempotent_key: str) -> Optional[Any]:
        return db.query(model_class).filter(model_class.idempotent_key == idempotent_key).first()

    @staticmethod
    def upsert_with_idempotency(
        db: Session,
        model_class,
        idempotent_key: str,
        data: Dict[str, Any],
        user_id: Optional[int] = None
    ) -> Tuple[Any, bool]:
        existing = IdempotentService.find_existing_record(db, model_class, idempotent_key)
        
        if existing:
            for key, value in data.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            if user_id:
                existing.updated_by = user_id
            db.commit()
            db.refresh(existing)
            return existing, False
        
        try:
            data["idempotent_key"] = idempotent_key
            if user_id:
                data["created_by"] = user_id
                data["updated_by"] = user_id
            
            instance = model_class(**data)
            db.add(instance)
            db.commit()
            db.refresh(instance)
            return instance, True
        except IntegrityError:
            db.rollback()
            existing = IdempotentService.find_existing_record(db, model_class, idempotent_key)
            if existing:
                for key, value in data.items():
                    if hasattr(existing, key):
                        setattr(existing, key, value)
                if user_id:
                    existing.updated_by = user_id
                db.commit()
                db.refresh(existing)
                return existing, False
            raise

    @staticmethod
    def save_failed_record(
        db: Session,
        business_type: str,
        idempotent_key: str,
        raw_data: Dict[str, Any],
        error_type: str,
        error_message: str,
        error_detail: Optional[Dict] = None
    ) -> FailedRecord:
        failed = FailedRecord(
            business_type=business_type,
            idempotent_key=idempotent_key,
            raw_data=raw_data,
            error_type=error_type,
            error_message=error_message,
            error_detail=error_detail
        )
        db.add(failed)
        db.commit()
        db.refresh(failed)
        return failed

    @staticmethod
    def resolve_failed_record(
        db: Session,
        failed_id: int,
        user_id: int,
        resolution_note: str
    ) -> Optional[FailedRecord]:
        failed = db.query(FailedRecord).filter(FailedRecord.id == failed_id).first()
        if failed:
            from datetime import datetime
            failed.is_resolved = "Y"
            failed.resolved_at = datetime.utcnow()
            failed.resolved_by = user_id
            failed.resolution_note = resolution_note
            db.commit()
            db.refresh(failed)
        return failed
