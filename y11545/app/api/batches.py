from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import BatchStatus, IdempotentAction, MaterialStatus
from app.schemas import (
    BatchCreate, BatchUpdate, BatchResponse,
    BatchDataImportRequest, IdempotentCheckResponse,
    FreezeRequest, UnfreezeRequest, ReviewRequest,
    StateRecordResponse, AuditLogResponse, AsyncTaskResponse,
    BatchReportResponse, DeviceTrackingCreate, DeviceTrackingResponse,
    DeviceTrackingUpdate
)
from app.services.batch_service import BatchService
from app.services.state_machine import MaterialStateMachine, DeviceTrackingService
from app.services.report_service import ReportService
from app.services.task_service import TaskService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/batches", tags=["批次管理"])


@router.get("/", response_model=List[BatchResponse])
def list_batches(
    skip: int = 0,
    limit: int = 100,
    status: Optional[BatchStatus] = None,
    db: Session = Depends(get_db)
):
    return BatchService.list_batches(db, skip, limit, status)


@router.get("/{batch_id}", response_model=BatchResponse)
def get_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = BatchService.get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return batch


@router.get("/no/{batch_no}", response_model=BatchResponse)
def get_batch_by_no(batch_no: str, db: Session = Depends(get_db)):
    batch = BatchService.get_batch_by_no(db, batch_no)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return batch


@router.get("/check/{batch_no}", response_model=IdempotentCheckResponse)
def check_idempotent(batch_no: str, db: Session = Depends(get_db)):
    exists, batch, message = BatchService.check_idempotent(db, batch_no)
    return IdempotentCheckResponse(
        batch_no=batch_no,
        exists=exists,
        idempotent_action=batch.idempotent_action if batch else IdempotentAction.IGNORE,
        message=message
    )


@router.post("/", response_model=BatchResponse)
def create_batch(batch_data: BatchCreate, db: Session = Depends(get_db)):
    return BatchService.create_batch(db, batch_data)


@router.put("/{batch_id}", response_model=BatchResponse)
def update_batch(
    batch_id: int,
    update_data: BatchUpdate,
    db: Session = Depends(get_db)
):
    batch = BatchService.get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return BatchService.update_batch(db, batch, update_data)


@router.post("/{batch_id}/import", response_model=dict)
def import_batch_data(
    batch_id: int,
    import_data: BatchDataImportRequest,
    db: Session = Depends(get_db)
):
    batch = BatchService.get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    try:
        results = BatchService.import_batch_data(db, batch, import_data)
        return {"success": True, **results}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{batch_id}/freeze", response_model=BatchResponse)
def freeze_batch(
    batch_id: int,
    freeze_data: FreezeRequest,
    db: Session = Depends(get_db)
):
    batch = BatchService.get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return BatchService.freeze_batch(db, batch, freeze_data.reason, freeze_data.operated_by)


@router.post("/{batch_id}/unfreeze", response_model=BatchResponse)
def unfreeze_batch(
    batch_id: int,
    unfreeze_data: UnfreezeRequest,
    db: Session = Depends(get_db)
):
    batch = BatchService.get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return BatchService.unfreeze_batch(db, batch, unfreeze_data.reason, unfreeze_data.operated_by)


@router.post("/{batch_id}/archive", response_model=BatchResponse)
def archive_batch(
    batch_id: int,
    operated_by: str,
    db: Session = Depends(get_db)
):
    batch = BatchService.get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return BatchService.archive_batch(db, batch, operated_by)


@router.post("/{batch_id}/review")
def review_material(
    batch_id: int,
    review_data: ReviewRequest,
    db: Session = Depends(get_db)
):
    batch = BatchService.get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    from app.models import MaterialItem
    material = db.query(MaterialItem).filter(
        MaterialItem.batch_id == batch_id,
        MaterialItem.id == review_data.material_id
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="物料不存在")
    
    success, message = MaterialStateMachine.transition(
        db=db,
        material=material,
        to_status=review_data.new_status,
        changed_by=review_data.reviewed_by,
        reason=review_data.reason,
        change_source="review",
        is_overrule=review_data.is_overrule
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"success": True, "message": message}


@router.get("/{batch_id}/state-history", response_model=List[StateRecordResponse])
def get_batch_state_history(
    batch_id: int,
    db: Session = Depends(get_db)
):
    from app.models import StateRecord
    return db.query(StateRecord).filter(
        StateRecord.batch_id == batch_id
    ).order_by(StateRecord.changed_at.desc()).all()


@router.get("/{batch_id}/audit-logs", response_model=List[AuditLogResponse])
def get_batch_audit_logs(
    batch_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return AuditService.get_batch_audit_logs(db, batch_id, skip, limit)


@router.get("/{batch_id}/report", response_model=BatchReportResponse)
def get_batch_report(batch_id: int, db: Session = Depends(get_db)):
    batch = BatchService.get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return ReportService.get_batch_report(db, batch)


@router.get("/{batch_id}/export-report")
def export_batch_report(batch_id: int, db: Session = Depends(get_db)):
    from fastapi.responses import StreamingResponse
    
    batch = BatchService.get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    excel_data = ReportService.export_report_to_excel(db, batch)
    
    return StreamingResponse(
        excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=batch_{batch.batch_no}_report.xlsx"}
    )


@router.get("/{batch_id}/export-audit")
def export_audit_log(batch_id: int, db: Session = Depends(get_db)):
    from fastapi.responses import StreamingResponse
    
    batch = BatchService.get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    excel_data = ReportService.get_audit_log_excel(db, batch_id)
    
    return StreamingResponse(
        excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=batch_{batch.batch_no}_audit.xlsx"}
    )


@router.post("/{batch_id}/device-tracking", response_model=DeviceTrackingResponse)
def create_device_tracking(
    batch_id: int,
    data: DeviceTrackingCreate,
    db: Session = Depends(get_db)
):
    return DeviceTrackingService.create_tracking(
        db=db,
        borrow_record_id=data.borrow_record_id,
        device_code=data.device_code,
        device_name=data.device_name,
        last_known_location=data.last_known_location,
        last_seen_by=data.last_seen_by,
        responsible_person=data.responsible_person,
        remark=data.remark
    )


@router.put("/device-tracking/{tracking_id}", response_model=DeviceTrackingResponse)
def update_device_tracking(
    tracking_id: int,
    data: DeviceTrackingUpdate,
    db: Session = Depends(get_db)
):
    from app.models import DeviceTracking
    tracking = db.query(DeviceTracking).filter(DeviceTracking.id == tracking_id).first()
    if not tracking:
        raise HTTPException(status_code=404, detail="追踪记录不存在")
    
    return DeviceTrackingService.update_tracking(
        db=db,
        tracking=tracking,
        last_known_location=data.last_known_location,
        last_seen_by=data.last_seen_by,
        current_status=data.current_status,
        responsible_person=data.responsible_person,
        final_disposition=data.final_disposition,
        disposition_by=data.disposition_by,
        remark=data.remark
    )


@router.get("/{batch_id}/tasks", response_model=List[AsyncTaskResponse])
def get_batch_tasks(
    batch_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    from app.models import AsyncTask
    query = db.query(AsyncTask).filter(AsyncTask.batch_id == batch_id)
    if status:
        query = query.filter(AsyncTask.status == status)
    return query.order_by(AsyncTask.created_at.desc()).all()


@router.get("/tasks/manual", response_model=List[AsyncTaskResponse])
def get_manual_tasks(
    batch_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    return TaskService.get_waiting_manual_tasks(db, batch_id)


@router.post("/tasks/{task_id}/retry")
def retry_task(
    task_id: str,
    operated_by: str,
    db: Session = Depends(get_db)
):
    task = TaskService.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    try:
        TaskService.retry_manual_task(db, task, operated_by)
        return {"success": True, "message": "任务已重新加入队列"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
