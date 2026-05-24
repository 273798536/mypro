from typing import List, Optional
from urllib.parse import quote
from fastapi import FastAPI, Depends, HTTPException, Header, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime


def encode_filename(filename: str) -> str:
    encoded = quote(filename, encoding="utf-8")
    return f"attachment; filename*=UTF-8''{encoded}"

from app.database import engine, get_db, Base
from app import models, schemas
from app.services import (
    SampleLabelService, TemperatureRecordService, StoreComplaintService,
    ScanRecordService, StatusMachine, StatusTransitionError,
    DataValidationError, RecordNotFoundError, DataConsistencyService,
    ReportService, RoleBasedViewService, FailedRecordManager
)
from app.export_service import ExportService

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="中央厨房留样权限追责台账 API",
    description="留样标签、温度记录、门店投诉、扫码明细的完整台账管理系统",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "message": "中央厨房留样权限追责台账服务",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.post("/sample-labels/", response_model=schemas.SampleLabel, tags=["留样标签"])
def create_sample_label(
    sample_label: schemas.SampleLabelCreate,
    x_user_id: str = Header(..., alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    service = SampleLabelService(db)
    try:
        return service.create_sample_label(sample_label, operator=x_user_id)
    except DataValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/sample-labels/", response_model=List[dict], tags=["留样标签"])
def get_sample_labels(
    x_user_role: str = Header("viewer", alias="X-User-Role"),
    db: Session = Depends(get_db)
):
    service = SampleLabelService(db)
    records = service.get_all_sample_labels()
    role_service = RoleBasedViewService(x_user_role)
    return role_service.filter_by_role(records)


@app.get("/sample-labels/{label_id}", response_model=dict, tags=["留样标签"])
def get_sample_label(
    label_id: int,
    x_user_role: str = Header("viewer", alias="X-User-Role"),
    db: Session = Depends(get_db)
):
    service = SampleLabelService(db)
    record = service.get_sample_label(label_id)
    if not record:
        raise HTTPException(status_code=404, detail="留样标签不存在")
    role_service = RoleBasedViewService(x_user_role)
    record_dict = {c.name: getattr(record, c.name) for c in record.__table__.columns}
    return role_service.mask_sensitive_fields(record_dict)


@app.put("/sample-labels/{label_id}", response_model=schemas.SampleLabel, tags=["留样标签"])
def update_sample_label(
    label_id: int,
    sample_label: schemas.SampleLabelUpdate,
    x_user_id: str = Header(..., alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    service = SampleLabelService(db)
    try:
        return service.update_sample_label(label_id, sample_label, operator=x_user_id)
    except RecordNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except StatusTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/sample-labels/{label_id}/status", tags=["留样标签"])
def change_sample_label_status(
    label_id: int,
    request: schemas.StatusChangeRequest,
    db: Session = Depends(get_db)
):
    status_machine = StatusMachine(db)
    try:
        record, audit_log = status_machine.change_status(
            record_type="sample_label",
            record_id=label_id,
            new_status=request.new_status,
            change_reason=request.change_reason,
            operator=request.operator,
            operator_role=request.operator_role,
            ip_address=request.ip_address
        )
        return {
            "success": True,
            "record_id": record.id,
            "old_status": audit_log.old_status,
            "new_status": audit_log.new_status,
            "audit_log_id": audit_log.id
        }
    except RecordNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except StatusTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/temperature-records/", response_model=schemas.TemperatureRecord, tags=["温度记录"])
def create_temperature_record(
    temp_record: schemas.TemperatureRecordCreate,
    x_user_id: str = Header(..., alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    service = TemperatureRecordService(db)
    failed_manager = FailedRecordManager(db)
    try:
        return service.create_temperature_record(temp_record, operator=x_user_id)
    except DataValidationError as e:
        failed_manager.save_failed_record(
            source_type="temperature",
            source_data=temp_record.model_dump(),
            error_message=str(e)
        )
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/temperature-records/", response_model=List[schemas.TemperatureRecord], tags=["温度记录"])
def get_temperature_records(
    sample_label_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    service = TemperatureRecordService(db)
    return service.get_temperature_records(sample_label_id)


@app.post("/temperature-records/{record_id}/status", tags=["温度记录"])
def change_temperature_status(
    record_id: int,
    request: schemas.StatusChangeRequest,
    db: Session = Depends(get_db)
):
    status_machine = StatusMachine(db)
    try:
        record, audit_log = status_machine.change_status(
            record_type="temperature",
            record_id=record_id,
            new_status=request.new_status,
            change_reason=request.change_reason,
            operator=request.operator,
            operator_role=request.operator_role,
            ip_address=request.ip_address
        )
        return {
            "success": True,
            "record_id": record.id,
            "old_status": audit_log.old_status,
            "new_status": audit_log.new_status,
            "audit_log_id": audit_log.id
        }
    except RecordNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except StatusTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/complaints/", response_model=schemas.StoreComplaint, tags=["门店投诉"])
def create_complaint(
    complaint: schemas.StoreComplaintCreate,
    x_user_id: str = Header(..., alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    service = StoreComplaintService(db)
    failed_manager = FailedRecordManager(db)
    try:
        return service.create_complaint(complaint, operator=x_user_id)
    except DataValidationError as e:
        failed_manager.save_failed_record(
            source_type="complaint",
            source_data=complaint.model_dump(),
            error_message=str(e)
        )
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/complaints/", response_model=List[schemas.StoreComplaint], tags=["门店投诉"])
def get_complaints(
    sample_label_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    service = StoreComplaintService(db)
    return service.get_complaints(sample_label_id)


@app.post("/complaints/{complaint_id}/status", tags=["门店投诉"])
def change_complaint_status(
    complaint_id: int,
    request: schemas.StatusChangeRequest,
    db: Session = Depends(get_db)
):
    status_machine = StatusMachine(db)
    try:
        record, audit_log = status_machine.change_status(
            record_type="complaint",
            record_id=complaint_id,
            new_status=request.new_status,
            change_reason=request.change_reason,
            operator=request.operator,
            operator_role=request.operator_role,
            ip_address=request.ip_address
        )
        return {
            "success": True,
            "record_id": record.id,
            "old_status": audit_log.old_status,
            "new_status": audit_log.new_status,
            "audit_log_id": audit_log.id
        }
    except RecordNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except StatusTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/scan-records/", response_model=schemas.ScanRecord, tags=["扫码明细"])
def create_scan_record(
    scan_record: schemas.ScanRecordCreate,
    x_user_id: str = Header(..., alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    service = ScanRecordService(db)
    failed_manager = FailedRecordManager(db)
    try:
        return service.create_scan_record(scan_record, operator=x_user_id)
    except DataValidationError as e:
        failed_manager.save_failed_record(
            source_type="scan",
            source_data=scan_record.model_dump(),
            error_message=str(e)
        )
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/scan-records/", response_model=List[schemas.ScanRecord], tags=["扫码明细"])
def get_scan_records(
    sample_label_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    service = ScanRecordService(db)
    return service.get_scan_records(sample_label_id)


@app.post("/scan-records/{record_id}/status", tags=["扫码明细"])
def change_scan_status(
    record_id: int,
    request: schemas.StatusChangeRequest,
    db: Session = Depends(get_db)
):
    status_machine = StatusMachine(db)
    try:
        record, audit_log = status_machine.change_status(
            record_type="scan",
            record_id=record_id,
            new_status=request.new_status,
            change_reason=request.change_reason,
            operator=request.operator,
            operator_role=request.operator_role,
            ip_address=request.ip_address
        )
        return {
            "success": True,
            "record_id": record.id,
            "old_status": audit_log.old_status,
            "new_status": audit_log.new_status,
            "audit_log_id": audit_log.id
        }
    except RecordNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except StatusTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/audit-logs/", response_model=List[schemas.AuditLog], tags=["审计日志"])
def get_audit_logs(
    sample_label_id: Optional[int] = None,
    action_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.AuditLog)
    if sample_label_id:
        query = query.filter(models.AuditLog.sample_label_id == sample_label_id)
    if action_type:
        query = query.filter(models.AuditLog.action_type == action_type)
    return query.order_by(models.AuditLog.created_at.desc()).all()


@app.get("/trace/batch/{batch_no}", response_model=schemas.BatchTraceResult, tags=["数据追溯"])
def trace_batch(
    batch_no: str,
    db: Session = Depends(get_db)
):
    consistency_service = DataConsistencyService(db)
    try:
        return consistency_service.trace_report_to_source(batch_no)
    except RecordNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/reports/summary", response_model=schemas.ReportSummary, tags=["报表"])
def get_summary_report(db: Session = Depends(get_db)):
    service = ReportService(db)
    summary = service.get_summary_report()
    
    for field in ["draft_count", "submitted_count", "confirmed_count", "rejected_count"]:
        count = getattr(summary, field)
        if count > 0:
            status = field.replace("_count", "")
            records = db.query(models.SampleLabel).filter(
                models.SampleLabel.status == status,
                models.SampleLabel.is_active == True
            ).all()
            assert len(records) == count, f"报表数据不一致: {field}"
    
    return summary


@app.get("/failed-records/", response_model=List[schemas.FailedRecord], tags=["失败记录"])
def get_failed_records(
    source_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    manager = FailedRecordManager(db)
    return manager.get_failed_records(source_type)


@app.get("/export/sample-labels", tags=["导出"])
def export_sample_labels(
    status: Optional[str] = Query(None, description="状态过滤: draft/submitted/rejected/confirmed"),
    x_user_role: str = Header("viewer", alias="X-User-Role"),
    db: Session = Depends(get_db)
):
    export_service = ExportService(db, user_role=x_user_role)
    output = export_service.export_sample_labels_to_excel(status_filter=status)
    
    filename = f"留样标签台账_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": encode_filename(filename)}
    )


@app.get("/export/temperature-records", tags=["导出"])
def export_temperature_records(
    sample_label_id: Optional[int] = None,
    x_user_role: str = Header("viewer", alias="X-User-Role"),
    db: Session = Depends(get_db)
):
    export_service = ExportService(db, user_role=x_user_role)
    output = export_service.export_temperature_records_to_excel(sample_label_id=sample_label_id)
    
    filename = f"温度记录_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": encode_filename(filename)}
    )


@app.get("/export/batch/{batch_no}", tags=["导出"])
def export_batch_trace(
    batch_no: str,
    x_user_role: str = Header("viewer", alias="X-User-Role"),
    db: Session = Depends(get_db)
):
    export_service = ExportService(db, user_role=x_user_role)
    try:
        output = export_service.export_batch_trace_to_excel(batch_no)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
    filename = f"批次追溯_{batch_no}_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": encode_filename(filename)}
    )
