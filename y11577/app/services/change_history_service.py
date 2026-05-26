from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import date, datetime

from app.models.business import ChangeHistory
from app.models.auth import User


class ChangeHistoryService:
    @staticmethod
    def _serialize_value(value: Any) -> Any:
        if isinstance(value, Decimal):
            return float(value)
        elif isinstance(value, date):
            return value.isoformat()
        elif isinstance(value, datetime):
            return value.isoformat()
        elif hasattr(value, '__dict__'):
            return str(value)
        return value

    @staticmethod
    def record_changes(
        db: Session,
        business_type: str,
        business_id: int,
        old_obj: Any,
        new_data: Dict[str, Any],
        operator: User,
        change_reason: Optional[str] = None
    ) -> List[ChangeHistory]:
        changes = []
        
        for field, new_value in new_data.items():
            if isinstance(old_obj, dict):
                if field not in old_obj:
                    continue
                old_value = old_obj[field]
            else:
                if not hasattr(old_obj, field):
                    continue
                old_value = getattr(old_obj, field)
            
            old_ser = ChangeHistoryService._serialize_value(old_value)
            new_ser = ChangeHistoryService._serialize_value(new_value)
            
            if old_ser == new_ser:
                continue
            
            change = ChangeHistory(
                business_type=business_type,
                business_id=business_id,
                field_name=field,
                old_value=old_ser,
                new_value=new_ser,
                change_reason=change_reason,
                operator_id=operator.id,
                operator_name=operator.full_name or operator.username
            )
            db.add(change)
            changes.append(change)
        
        return changes

    @staticmethod
    def get_changes(
        db: Session,
        business_type: str,
        business_id: int
    ) -> List[ChangeHistory]:
        return db.query(ChangeHistory).filter(
            ChangeHistory.business_type == business_type,
            ChangeHistory.business_id == business_id
        ).order_by(ChangeHistory.created_at).all()
