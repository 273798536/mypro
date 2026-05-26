from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.schemas import CorrectionLogOut
from app.services.report_service import get_enterprise_history

router = APIRouter()


@router.get("/enterprise/{enterprise_id}")
def get_history(enterprise_id: int, db: Session = Depends(get_db)):
    result = get_enterprise_history(db, enterprise_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/enterprise/{enterprise_id}/corrections", response_model=list)
def get_corrections(enterprise_id: int, skip: int = 0, limit: int = 50,
                    db: Session = Depends(get_db)):
    from app.models.models import CorrectionLog
    logs = (
        db.query(CorrectionLog)
        .filter(CorrectionLog.enterprise_id == enterprise_id)
        .order_by(CorrectionLog.created_at.desc())
        .offset(skip).limit(limit).all()
    )
    return [
        {
            "id": log.id,
            "target_table": log.target_table,
            "target_id": log.target_id,
            "field_name": log.field_name,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "reason": log.reason,
            "operator": log.operator,
            "created_at": str(log.created_at),
        }
        for log in logs
    ]