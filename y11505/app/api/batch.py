from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.core.constants import BatchStatus
from app.schemas import (
    BatchCreate,
    BatchUpdate,
    BatchResponse,
    BatchImportRequest,
    OperationResponse,
)
from app.schemas.common import (
    ReviewRequest,
    FreezeRequest,
    SettleRequest,
    ManualRepairRequest,
    AuditLogResponse,
    BatchStatusHistoryResponse,
)
from app.services import (
    BatchService,
    ImportService,
    AuditService,
    StateMachineService,
)
from app.models import StatusHistory

router = APIRouter(prefix="/batches", tags=["batches"])


@router.post("", response_model=OperationResponse)
def create_batch(batch_data: BatchCreate, db: Session = Depends(get_db)):
    batch_service = BatchService(db)
    
    existing = batch_service.get_batch_by_no(batch_data.batch_no)
    if existing:
        raise HTTPException(status_code=400, detail=f"批次号已存在: {batch_data.batch_no}")
    
    batch = batch_service.create_batch(batch_data)
    return OperationResponse(
        success=True,
        message="批次创建成功",
        data={"batch_id": batch.id, "batch_no": batch.batch_no},
    )


@router.get("", response_model=dict)
def list_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[BatchStatus] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
):
    batch_service = BatchService(db)
    batches, total = batch_service.list_batches(skip=skip, limit=limit, status=status, department=department)
    
    return {
        "total": total,
        "items": [BatchResponse.model_validate(b) for b in batches],
        "page": skip // limit + 1,
        "page_size": limit,
    }


@router.get("/{batch_id}", response_model=BatchResponse)
def get_batch(batch_id: str, db: Session = Depends(get_db)):
    batch_service = BatchService(db)
    batch = batch_service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return BatchResponse.model_validate(batch)


@router.put("/{batch_id}", response_model=OperationResponse)
def update_batch(
    batch_id: str,
    update_data: BatchUpdate,
    operator: str = Query(..., description="操作人"),
    db: Session = Depends(get_db),
):
    batch_service = BatchService(db)
    batch = batch_service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    updated = batch_service.update_batch(batch, update_data, operator)
    return OperationResponse(
        success=True,
        message="批次更新成功",
        data={"batch_id": updated.id},
    )


@router.post("/import", response_model=OperationResponse)
def import_batch_data(data: BatchImportRequest, db: Session = Depends(get_db)):
    batch_service = BatchService(db)
    import_service = ImportService(db)
    
    batch = batch_service.get_batch_by_no(data.batch_no)
    if not batch:
        from app.schemas import BatchCreate
        
        batch_create = BatchCreate(
            batch_no=data.batch_no,
            name=data.batch_name,
            description=data.description,
            department=data.department,
            operator=data.operator,
            duplicate_strategy=data.duplicate_strategy,
        )
        batch = batch_service.create_batch(batch_create)
    
    results = import_service.import_batch_data(
        batch=batch,
        inspection_records=data.inspection_records,
        calibration_certificates=data.calibration_certificates,
        repair_quotes=data.repair_quotes,
        price_adjustments=data.price_adjustments,
        operator=data.operator,
    )
    
    batch_service.update_batch_stats(batch)
    
    return OperationResponse(
        success=True,
        message="数据导入完成",
        data={
            "batch_id": batch.id,
            "batch_no": batch.batch_no,
            "results": results,
        },
    )


@router.post("/{batch_id}/submit", response_model=OperationResponse)
def submit_for_review(
    batch_id: str,
    operator: str = Query(..., description="操作人"),
    db: Session = Depends(get_db),
):
    batch_service = BatchService(db)
    batch = batch_service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    success, message = batch_service.submit_for_review(batch, operator)
    return OperationResponse(success=success, message=message)


@router.post("/{batch_id}/start-review", response_model=OperationResponse)
def start_review(
    batch_id: str,
    operator: str = Query(..., description="操作人"),
    db: Session = Depends(get_db),
):
    batch_service = BatchService(db)
    batch = batch_service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    success, message = batch_service.start_review(batch, operator)
    return OperationResponse(success=success, message=message)


@router.post("/{batch_id}/approve", response_model=OperationResponse)
def approve_batch(
    batch_id: str,
    request: ReviewRequest,
    db: Session = Depends(get_db),
):
    batch_service = BatchService(db)
    batch = batch_service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    success, message = batch_service.approve_batch(batch, request.operator, request.reason)
    return OperationResponse(success=success, message=message)


@router.post("/{batch_id}/reject", response_model=OperationResponse)
def reject_batch(
    batch_id: str,
    request: ReviewRequest,
    db: Session = Depends(get_db),
):
    batch_service = BatchService(db)
    batch = batch_service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    success, message = batch_service.reject_batch(batch, request.operator, request.reason or "审核驳回")
    return OperationResponse(success=success, message=message)


@router.post("/{batch_id}/freeze", response_model=OperationResponse)
def freeze_batch(
    batch_id: str,
    request: FreezeRequest,
    db: Session = Depends(get_db),
):
    batch_service = BatchService(db)
    batch = batch_service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    success, message = batch_service.freeze_batch(batch, request.operator, request.reason)
    return OperationResponse(success=success, message=message)


@router.post("/{batch_id}/unfreeze", response_model=OperationResponse)
def unfreeze_batch(
    batch_id: str,
    operator: str = Query(..., description="操作人"),
    reason: str = Query(..., description="解冻原因"),
    db: Session = Depends(get_db),
):
    batch_service = BatchService(db)
    batch = batch_service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    success, message = batch_service.unfreeze_batch(batch, operator, reason)
    return OperationResponse(success=success, message=message)


@router.post("/{batch_id}/settle", response_model=OperationResponse)
def settle_batch(
    batch_id: str,
    request: SettleRequest,
    db: Session = Depends(get_db),
):
    batch_service = BatchService(db)
    batch = batch_service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    success, message = batch_service.settle_batch(batch, request.operator, request.reason)
    return OperationResponse(success=success, message=message)


@router.post("/{batch_id}/archive", response_model=OperationResponse)
def archive_batch(
    batch_id: str,
    operator: str = Query(..., description="操作人"),
    db: Session = Depends(get_db),
):
    batch_service = BatchService(db)
    batch = batch_service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    success, message = batch_service.archive_batch(batch, operator)
    return OperationResponse(success=success, message=message)


@router.post("/{batch_id}/cancel", response_model=OperationResponse)
def cancel_batch(
    batch_id: str,
    operator: str = Query(..., description="操作人"),
    reason: str = Query(..., description="取消原因"),
    db: Session = Depends(get_db),
):
    batch_service = BatchService(db)
    batch = batch_service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    success, message = batch_service.cancel_batch(batch, operator, reason)
    return OperationResponse(success=success, message=message)


@router.get("/{batch_id}/status-history", response_model=List[BatchStatusHistoryResponse])
def get_status_history(
    batch_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db),
):
    histories = (
        db.query(StatusHistory)
        .filter(StatusHistory.batch_id == batch_id)
        .order_by(StatusHistory.change_time.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [BatchStatusHistoryResponse.model_validate(h) for h in histories]


@router.get("/{batch_id}/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    batch_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db),
):
    audit_service = AuditService(db)
    logs = audit_service.get_batch_audit_logs(batch_id, skip=skip, limit=limit)
    return [AuditLogResponse.model_validate(l) for l in logs]


@router.post("/records/{record_id}/manual-repair", response_model=OperationResponse)
def manual_repair_record(
    record_id: str,
    request: ManualRepairRequest,
    db: Session = Depends(get_db),
):
    from app.models import InspectionRecord
    
    record = db.query(InspectionRecord).filter(InspectionRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    
    state_machine = StateMachineService(db)
    
    if request.new_status:
        success, message = state_machine.transition_record(
            record=record,
            target_status=request.new_status,
            operator=request.operator,
            reason=request.reason,
        )
        if not success:
            return OperationResponse(success=False, message=message)
    
    return OperationResponse(
        success=True,
        message="人工修正成功",
        data={"record_id": record_id, "new_status": record.status},
    )
