from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.models.database import get_db
from app.models.pydantic_schemas import (
    ExportRequest,
    ExportResponse,
    ReconciliationRequest,
    ReconciliationResult,
    AuditLogQuery,
)
from app.models.schemas import AuditLog as AuditLogModel
from app.utils.export_service import ExportService, ReconciliationService
from app.utils.audit import AuditLogger

router = APIRouter(prefix="/api/v1", tags=["export_audit"])


@router.post("/export", response_model=ExportResponse)
async def create_export(
    data: ExportRequest,
    db: Session = Depends(get_db),
):
    audit_logger = AuditLogger(db)
    export_service = ExportService(db, audit_logger)

    try:
        result = export_service.create_export_task(
            task_type=data.task_type,
            operator=data.operator,
            filters=data.filters,
            freeze_before_export=data.freeze_before_export,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reconcile", response_model=ReconciliationResult)
async def reconcile(
    data: ReconciliationRequest,
    db: Session = Depends(get_db),
):
    reconciliation_service = ReconciliationService(db)

    try:
        result = reconciliation_service.reconcile(
            start_time=data.start_time,
            end_time=data.end_time,
            operator=data.operator,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit-logs")
async def get_audit_logs(
    entity_type: str = None,
    entity_id: str = None,
    operator: str = None,
    operation_type: str = None,
    start_time: datetime = None,
    end_time: datetime = None,
    db: Session = Depends(get_db),
):
    query = db.query(AuditLogModel).order_by(AuditLogModel.operation_time.desc())

    if entity_type:
        query = query.filter(AuditLogModel.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditLogModel.entity_id == entity_id)
    if operator:
        query = query.filter(AuditLogModel.operator == operator)
    if operation_type:
        query = query.filter(AuditLogModel.operation_type == operation_type)
    if start_time:
        query = query.filter(AuditLogModel.operation_time >= start_time)
    if end_time:
        query = query.filter(AuditLogModel.operation_time <= end_time)

    logs = query.all()

    return {
        "total": len(logs),
        "logs": [
            {
                "id": log.id,
                "operation_type": log.operation_type,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "operator": log.operator,
                "operation_time": log.operation_time,
                "old_value": log.old_value,
                "new_value": log.new_value,
                "change_reason": log.change_reason,
                "ip_address": log.ip_address,
            }
            for log in logs
        ],
    }
