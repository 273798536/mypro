from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.common import (
    ReconciliationRequest,
    ReconciliationResponse,
    ManualAdjustRequest,
)
from app.services.reconciliation import ReconciliationService
from app.api.deps import require_permission, acquire_lock

router = APIRouter()


@router.post("/run")
def run_reconciliation(
    request: ReconciliationRequest,
    db: Session = Depends(get_db),
):
    service = ReconciliationService(db)

    if request.batch_no:
        result = service.reconcile_batch(
            batch_no=request.batch_no,
            operator=request.operator,
        )
    elif request.checkin_nos:
        result = service.reconcile_batch(
            checkin_nos=request.checkin_nos,
            operator=request.operator,
        )
    elif request.checkin_no:
        from app.models.checkin import CheckinRecord
        checkin = db.query(CheckinRecord).filter(
            CheckinRecord.checkin_no == request.checkin_no
        ).first()
        if not checkin:
            raise HTTPException(status_code=404, detail="入住单不存在")
        record = service.reconcile_checkin(
            checkin=checkin,
            operator=request.operator,
        )
        return {
            "total": 1,
            "matched": 1 if record.is_matched else 0,
            "unmatched": 0 if record.is_matched else 1,
            "results": [record],
        }
    else:
        result = service.reconcile_batch(operator=request.operator)

    return result


@router.get("/unmatched")
def get_unmatched(
    batch_no: Optional[str] = None,
    include_manual: bool = False,
    db: Session = Depends(get_db),
):
    service = ReconciliationService(db)
    records = service.get_unmatched_records(
        batch_no=batch_no,
        include_manual=include_manual,
    )
    return {
        "count": len(records),
        "records": records,
    }


@router.post("/manual-adjust")
def manual_adjust(
    request: ManualAdjustRequest,
    db: Session = Depends(get_db),
    lock_ctx: dict = acquire_lock("reconciliation"),
    current_user: dict = require_permission("reconciliation:adjust", "对账人工改判"),
):
    service = ReconciliationService(db)
    lock_service = lock_ctx["lock_service"]
    user_id = lock_ctx["user_id"]

    if not lock_service.acquire_lock("reconciliation", request.reconciliation_no, user_id):
        holder = lock_service.is_locked("reconciliation", request.reconciliation_no)
        raise HTTPException(status_code=409, detail=f"对账记录 {request.reconciliation_no} 正在被 {holder} 处理，请稍后重试")

    try:
        result = service.manual_adjust(
            reconciliation_no=request.reconciliation_no,
            is_matched=request.is_matched,
            adjust_reason=request.adjust_reason,
            adjusted_by=request.adjusted_by,
            remarks=request.remarks,
        )
        if not result:
            raise HTTPException(status_code=404, detail="对账记录不存在")
        return {"status": "success", "result": result, "authorized_by": current_user, "locked_by": user_id}
    finally:
        lock_service.release_lock("reconciliation", request.reconciliation_no)


@router.get("/{reconciliation_no}")
def get_reconciliation(reconciliation_no: str, db: Session = Depends(get_db)):
    from app.models.reconciliation import ReconciliationResult
    record = db.query(ReconciliationResult).filter(
        ReconciliationResult.reconciliation_no == reconciliation_no
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="对账记录不存在")
    return record
