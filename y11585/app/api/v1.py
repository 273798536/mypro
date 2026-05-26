import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.base import Batch, Contract, BatchStatus, DuplicateStrategy, TaskStatus
from app.schemas.contract import (
    BatchCreate, BatchUpdate, Batch as BatchSchema,
    ContractCreate, ContractUpdate, Contract as ContractSchema,
    FreezeRequest, UnfreezeRequest, ReviewRequest, ArchiveRequest,
    SupplementRequest, ExportRequest, TaskRetryRequest,
    SummaryResponse, AuditLog as AuditLogSchema, AsyncTask as AsyncTaskSchema
)
from app.services.state_machine import ContractStateMachine
from app.services.file_service import FileService
from app.services.task_service import TaskService
from app.services.report_service import ReportService

router = APIRouter()


def get_current_user(x_user_name: str = Header("system")):
    return x_user_name


@router.post("/batches", response_model=BatchSchema)
def create_batch(
    batch_data: BatchCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    batch = Batch(
        batch_no=f"BATCH_{datetime.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:8]}",
        name=batch_data.name,
        description=batch_data.description,
        source_type=batch_data.source_type,
        created_by=current_user,
        status=BatchStatus.CREATED,
        metadata_=batch_data.metadata_
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@router.get("/batches", response_model=List[BatchSchema])
def list_batches(
    status: Optional[BatchStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Batch)
    if status:
        query = query.filter(Batch.status == status)
    return query.offset(skip).limit(limit).all()


@router.get("/batches/{batch_id}", response_model=BatchSchema)
def get_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


@router.put("/batches/{batch_id}", response_model=BatchSchema)
def update_batch(
    batch_id: int,
    batch_data: BatchUpdate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch_data.name:
        batch.name = batch_data.name
    if batch_data.description:
        batch.description = batch_data.description
    if batch_data.status:
        batch.status = batch_data.status
    if batch_data.metadata_:
        batch.metadata_ = batch_data.metadata_
    
    db.commit()
    db.refresh(batch)
    return batch


@router.post("/batches/{batch_id}/contracts", response_model=ContractSchema)
def create_contract(
    batch_id: int,
    contract_data: ContractCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    state_machine = ContractStateMachine(db)
    contract = state_machine.create_contract(batch_id, contract_data, current_user)
    db.commit()
    db.refresh(contract)
    return contract


@router.get("/batches/{batch_id}/contracts", response_model=List[ContractSchema])
def list_contracts(
    batch_id: int,
    is_frozen: Optional[bool] = None,
    is_archived: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Contract).filter(Contract.batch_id == batch_id)
    if is_frozen is not None:
        query = query.filter(Contract.is_frozen == is_frozen)
    if is_archived is not None:
        query = query.filter(Contract.is_archived == is_archived)
    return query.all()


@router.get("/contracts/{contract_id}", response_model=ContractSchema)
def get_contract(contract_id: int, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract


@router.put("/contracts/{contract_id}", response_model=ContractSchema)
def update_contract(
    contract_id: int,
    contract_data: ContractUpdate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if contract_data.contract_name:
        contract.contract_name = contract_data.contract_name
    if contract_data.party_a:
        contract.party_a = contract_data.party_a
    if contract_data.party_b:
        contract.party_b = contract_data.party_b
    if contract_data.total_amount is not None:
        contract.total_amount = contract_data.total_amount
    if contract_data.metadata_:
        contract.metadata_ = contract_data.metadata_
    
    contract.version += 1
    db.commit()
    db.refresh(contract)
    return contract


@router.post("/batches/{batch_id}/freeze")
def freeze_contracts(
    batch_id: int,
    request: FreezeRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    state_machine = ContractStateMachine(db)
    try:
        contracts = state_machine.freeze_contracts(batch_id, request, current_user)
        return {"frozen_count": len(contracts), "contract_ids": [c.id for c in contracts]}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/batches/{batch_id}/unfreeze")
def unfreeze_contracts(
    batch_id: int,
    request: UnfreezeRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    state_machine = ContractStateMachine(db)
    contracts = state_machine.unfreeze_contracts(batch_id, request, current_user)
    return {"unfrozen_count": len(contracts), "contract_ids": [c.id for c in contracts]}


@router.post("/batches/{batch_id}/review")
def review_contracts(
    batch_id: int,
    request: ReviewRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    state_machine = ContractStateMachine(db)
    try:
        contracts = state_machine.review_contracts(batch_id, request, current_user)
        return {"reviewed_count": len(contracts), "approved": request.approved}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/batches/{batch_id}/archive")
def archive_contracts(
    batch_id: int,
    request: ArchiveRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    state_machine = ContractStateMachine(db)
    try:
        contracts = state_machine.archive_contracts(batch_id, request, current_user)
        return {"archived_count": len(contracts), "contract_ids": [c.id for c in contracts]}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/batches/{batch_id}/supplement")
def add_supplement(
    batch_id: int,
    request: SupplementRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    state_machine = ContractStateMachine(db)
    try:
        contract = state_machine.add_supplement_contract(batch_id, request, current_user)
        return {"contract_id": contract.id, "new_version": contract.version}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/batches/{batch_id}/upload/contract-pdf")
def upload_contract_pdf(
    batch_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    file_service = FileService(db)
    content = file.file.read()
    result = file_service.process_contract_pdf(batch_id, content, file.filename, current_user)
    return result


@router.post("/batches/{batch_id}/contracts/{contract_id}/upload/payment-excel")
def upload_payment_excel(
    batch_id: int,
    contract_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    file_service = FileService(db)
    content = file.file.read()
    result = file_service.process_payment_excel(batch_id, contract_id, content, file.filename, current_user)
    return result


@router.post("/batches/{batch_id}/contracts/{contract_id}/upload/acceptance-email")
def upload_acceptance_email(
    batch_id: int,
    contract_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    file_service = FileService(db)
    content = file.file.read()
    result = file_service.process_acceptance_email(batch_id, contract_id, content, file.filename, current_user)
    return result


@router.post("/batches/{batch_id}/contracts/{contract_id}/upload/price-change")
def upload_price_change(
    batch_id: int,
    contract_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    file_service = FileService(db)
    content = file.file.read()
    result = file_service.process_price_change_excel(batch_id, contract_id, content, file.filename, current_user)
    return result


@router.post("/batches/{batch_id}/upload/archive")
def upload_archive(
    batch_id: int,
    file: UploadFile = File(...),
    duplicate_strategy: DuplicateStrategy = Form(DuplicateStrategy.APPEND),
    async_mode: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    file_service = FileService(db)
    content = file.file.read()
    
    if async_mode:
        task_id = file_service.async_import_archive(
            batch_id, content, file.filename, current_user, duplicate_strategy
        )
        return {"task_id": task_id, "mode": "async", "message": "Import task started"}
    else:
        result = file_service.process_zip_archive(
            batch_id, content, file.filename, current_user, duplicate_strategy
        )
        return result


@router.get("/contracts/{contract_id}/versions")
def get_contract_versions(contract_id: int, db: Session = Depends(get_db)):
    state_machine = ContractStateMachine(db)
    versions = state_machine.get_contract_versions(contract_id)
    return [
        {
            "version": v.version,
            "snapshot": v.snapshot,
            "changed_by": v.changed_by,
            "change_reason": v.change_reason,
            "created_at": v.created_at
        }
        for v in versions
    ]


@router.get("/contracts/{contract_id}/diff")
def get_contract_diff(contract_id: int, db: Session = Depends(get_db)):
    report_service = ReportService(db)
    try:
        return report_service.get_freeze_diff_report(contract_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/batches/{batch_id}/audit-logs", response_model=List[AuditLogSchema])
def get_batch_audit_logs(batch_id: int, db: Session = Depends(get_db)):
    state_machine = ContractStateMachine(db)
    return state_machine.get_audit_logs(batch_id=batch_id)


@router.get("/contracts/{contract_id}/audit-logs", response_model=List[AuditLogSchema])
def get_contract_audit_logs(contract_id: int, db: Session = Depends(get_db)):
    state_machine = ContractStateMachine(db)
    return state_machine.get_audit_logs(contract_id=contract_id)


@router.get("/batches/{batch_id}/summary", response_model=SummaryResponse)
def get_batch_summary(batch_id: int, db: Session = Depends(get_db)):
    report_service = ReportService(db)
    try:
        return report_service.get_batch_summary(batch_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/export")
def export_report(
    request: ExportRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    report_service = ReportService(db)
    result = report_service.export_to_excel(request, current_user)
    return result


@router.get("/tasks/{task_id}", response_model=AsyncTaskSchema)
def get_task(task_id: str, db: Session = Depends(get_db)):
    task_service = TaskService(db)
    task = task_service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/tasks/{task_id}/retry", response_model=AsyncTaskSchema)
def retry_task(
    task_id: str,
    request: TaskRetryRequest,
    db: Session = Depends(get_db)
):
    task_service = TaskService(db)
    task = task_service.retry_task(task_id, force=request.force)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/tasks/resume-stalled")
def resume_stalled_tasks(db: Session = Depends(get_db)):
    task_service = TaskService(db)
    count = task_service.resume_stalled_tasks()
    return {"resumed_count": count}
