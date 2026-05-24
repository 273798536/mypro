import json
import uuid
from datetime import datetime
from typing import Optional, Any
from sqlalchemy.orm import Session

from app.models import StatusLog
from app.database import get_db

ENTITY_TYPE_MAP = {
    "schedule": "teller_schedules",
    "leave": "leave_requests",
    "forecast": "business_forecasts",
    "adjustment": "price_adjustments",
    "record": "shift_records",
    "task": "async_tasks",
    "replay": "replay_chains",
}

class StatusService:
    @staticmethod
    def log_status_change(
        db: Session,
        entity_type: str,
        entity_id: str,
        old_status: str,
        new_status: str,
        change_reason: str,
        operator: str,
        operator_role: str = "operator",
        extra_info: Optional[dict] = None,
    ) -> StatusLog:
        log = StatusLog(
            log_id=f"LOG_{uuid.uuid4().hex[:16]}",
            entity_type=entity_type,
            entity_id=entity_id,
            old_status=old_status,
            new_status=new_status,
            change_reason=change_reason,
            operator=operator,
            operator_role=operator_role,
            change_time=datetime.now(),
            extra_info=json.dumps(extra_info) if extra_info else None,
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    @staticmethod
    def get_entity_status_history(
        db: Session,
        entity_type: str,
        entity_id: str,
        limit: int = 100,
    ) -> list:
        logs = (
            db.query(StatusLog)
            .filter(StatusLog.entity_type == entity_type)
            .filter(StatusLog.entity_id == entity_id)
            .order_by(StatusLog.change_time.desc())
            .limit(limit)
            .all()
        )
        return logs

    @staticmethod
    def update_entity_status(
        db: Session,
        entity: Any,
        new_status: str,
        reason: str,
        operator: str,
        operator_role: str = "operator",
    ) -> Any:
        old_status = getattr(entity, "status", None)
        
        if old_status == new_status:
            return entity
        
        setattr(entity, "status", new_status)
        setattr(entity, "status_updated_at", datetime.now())
        setattr(entity, "status_updated_by", operator)
        setattr(entity, "status_reason", reason)
        
        db.commit()
        db.refresh(entity)
        
        StatusService.log_status_change(
            db=db,
            entity_type=entity.__tablename__,
            entity_id=str(getattr(entity, "id", "")),
            old_status=old_status,
            new_status=new_status,
            change_reason=reason,
            operator=operator,
            operator_role=operator_role,
        )
        
        return entity
