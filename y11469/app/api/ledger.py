from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.enums import DataSourceType
from app.core.exceptions import (
    LedgerException, InvalidStatusTransition, RecordFrozen,
    DuplicateSubmission, OriginalEvidenceProtected, PartialImportFailure
)
from app.schemas.ledger import (
    LedgerRecord, LedgerRecordCreate, LedgerRecordUpdate,
    StatusTransitionRequest, FreezeRequest, ManualAdjustRequest,
    ImportResultResponse, ProcessingChainResponse,
    DuplicateCheckRequest, DuplicateCheckResponse,
    RoleViewRequest, ExportRequest
)
from app.services.ledger_service import LedgerService
from app.services.import_service import ImportService
from app.services.chain_service import ChainService
from app.services.view_service import ViewService

router = APIRouter(prefix="/api/ledger", tags=["ledger"])


@router.post("/records", response_model=LedgerRecord)
def create_record(
    data: LedgerRecordCreate,
    creator: str = Query(..., description="创建人"),
    db: Session = Depends(get_db)
):
    try:
        service = LedgerService(db)
        return service.create_ledger_record(data.model_dump(), creator)
    except LedgerException as e:
        raise HTTPException(status_code=400, detail=e.message)


@router.get("/records/{record_id}", response_model=LedgerRecord)
def get_record(record_id: int, db: Session = Depends(get_db)):
    service = LedgerService(db)
    record = service.get_record(record_id)
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    return record


@router.post("/records/{record_id}/transition")
def transition_status(
    record_id: int,
    request: StatusTransitionRequest,
    db: Session = Depends(get_db)
):
    try:
        service = LedgerService(db)
        return service.transition_status(
            record_id,
            request.target_status,
            request.transition_reason,
            request.operator,
            request.operator_role,
            request.extra_info
        )
    except InvalidStatusTransition as e:
        raise HTTPException(status_code=400, detail=e.message)
    except RecordFrozen as e:
        raise HTTPException(status_code=403, detail=e.message)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/records/{record_id}/submit")
def submit_record(
    record_id: int,
    operator: str,
    operator_role: str,
    reason: str = "提交审核",
    db: Session = Depends(get_db)
):
    try:
        service = LedgerService(db)
        return service.submit(record_id, operator, operator_role, reason)
    except LedgerException as e:
        raise HTTPException(status_code=400, detail=e.message)


@router.post("/records/{record_id}/reject")
def reject_record(
    record_id: int,
    operator: str,
    operator_role: str,
    reason: str,
    db: Session = Depends(get_db)
):
    try:
        service = LedgerService(db)
        return service.reject(record_id, operator, operator_role, reason)
    except LedgerException as e:
        raise HTTPException(status_code=400, detail=e.message)


@router.post("/records/{record_id}/second-confirm")
def second_confirm_record(
    record_id: int,
    operator: str,
    operator_role: str,
    reason: str = "二次确认通过",
    db: Session = Depends(get_db)
):
    try:
        service = LedgerService(db)
        return service.second_confirm(record_id, operator, operator_role, reason)
    except LedgerException as e:
        raise HTTPException(status_code=400, detail=e.message)


@router.post("/records/{record_id}/withdraw")
def withdraw_record(
    record_id: int,
    operator: str,
    operator_role: str,
    reason: str = "撤回修改",
    db: Session = Depends(get_db)
):
    try:
        service = LedgerService(db)
        return service.withdraw(record_id, operator, operator_role, reason)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except LedgerException as e:
        raise HTTPException(status_code=400, detail=e.message)


@router.post("/records/{record_id}/freeze")
def freeze_record(
    record_id: int,
    request: FreezeRequest,
    db: Session = Depends(get_db)
):
    try:
        service = LedgerService(db)
        return service.freeze_record(
            record_id,
            request.freeze_reason,
            request.operator,
            request.operator_role
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/records/{record_id}/unfreeze")
def unfreeze_record(
    record_id: int,
    operator: str,
    operator_role: str,
    db: Session = Depends(get_db)
):
    try:
        service = LedgerService(db)
        return service.unfreeze_record(record_id, operator, operator_role)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/records/{record_id}/manual-adjust")
def manual_adjust_record(
    record_id: int,
    request: ManualAdjustRequest,
    db: Session = Depends(get_db)
):
    try:
        service = LedgerService(db)
        return service.manual_adjust(
            record_id,
            request.adjust_reason,
            request.operator,
            request.operator_role,
            request.updates
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except OriginalEvidenceProtected as e:
        raise HTTPException(status_code=403, detail=e.message)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/import/{source_type}", response_model=ImportResultResponse)
def batch_import(
    source_type: str,
    source_file: str,
    records: List[dict],
    imported_by: str,
    db: Session = Depends(get_db)
):
    try:
        service = ImportService(db)
        batch = service.batch_import(source_type, source_file, records, imported_by)
        return ImportResultResponse(
            batch_id=batch.batch_id,
            total_count=batch.total_count,
            success_count=batch.success_count,
            failed_count=batch.failed_count,
            import_result=batch.import_result,
            error_details=batch.error_details
        )
    except PartialImportFailure as e:
        raise HTTPException(
            status_code=206,
            detail={
                "message": e.message,
                "success_count": e.success_count,
                "failed_count": e.failed_count
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/import/evidence/{source_type}/{record_id}")
def get_original_evidence(
    source_type: str,
    record_id: int,
    db: Session = Depends(get_db)
):
    try:
        service = ImportService(db)
        return service.get_original_evidence(source_type, record_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/check-duplicate", response_model=DuplicateCheckResponse)
def check_duplicate(
    request: DuplicateCheckRequest,
    db: Session = Depends(get_db)
):
    ledger_service = LedgerService(db)
    import_service = ImportService(db)

    is_duplicate = False
    existing_records = []
    suggestion = "可以提交"

    if ledger_service.check_duplicate_submission(request.style_code, request.version or 1):
        is_duplicate = True
        records = ledger_service.get_records_by_style(request.style_code)
        existing_records = [
            {"record_no": r.record_no, "version": r.version, "status": r.status}
            for r in records
        ]
        suggestion = f"款号 {request.style_code} 版本 {request.version or 1} 已存在提交记录"
    elif request.source_type and request.source_identifier:
        if import_service.check_duplicate(
            request.source_type,
            "identifier",
            request.source_identifier
        ):
            is_duplicate = True
            suggestion = "该数据源标识已存在"

    return DuplicateCheckResponse(
        is_duplicate=is_duplicate,
        existing_records=existing_records,
        suggestion=suggestion
    )


@router.post("/chains/{style_code}", response_model=ProcessingChainResponse)
def build_processing_chain(style_code: str, db: Session = Depends(get_db)):
    try:
        service = ChainService(db)
        chain = service.build_processing_chain(style_code)
        return chain
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/chains/{style_code}", response_model=ProcessingChainResponse)
def get_processing_chain(style_code: str, db: Session = Depends(get_db)):
    service = ChainService(db)
    chain = service.get_chain(style_code)
    if not chain:
        raise HTTPException(status_code=404, detail="处理链不存在")
    return chain


@router.get("/chains")
def list_processing_chains(
    has_issues_only: bool = False,
    db: Session = Depends(get_db)
):
    service = ChainService(db)
    return service.get_all_chains(has_issues_only)


@router.get("/chains/{style_code}/timeline")
def get_chain_timeline(style_code: str, db: Session = Depends(get_db)):
    service = ChainService(db)
    return service.get_chain_timeline(style_code)


@router.post("/chains/{chain_id}/review")
def review_chain(
    chain_id: int,
    reviewer: str,
    reviewer_role: str,
    remarks: Optional[str] = None,
    db: Session = Depends(get_db)
):
    try:
        service = ChainService(db)
        return service.review_chain(chain_id, reviewer, reviewer_role, remarks)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/views/role/{role}")
def get_role_view(
    role: str,
    style_code: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    service = ViewService(db)
    return service.get_role_view(role, style_code, status, page, page_size)


@router.get("/views/dashboard/brand-planner")
def get_brand_planner_dashboard(db: Session = Depends(get_db)):
    service = ViewService(db)
    return service.get_brand_planner_dashboard()


@router.get("/records/{record_id}/audit-trail")
def get_audit_trail(record_id: int, db: Session = Depends(get_db)):
    service = ViewService(db)
    return service.get_change_audit_trail(record_id)


@router.post("/export")
def export_records(request: ExportRequest, db: Session = Depends(get_db)):
    service = ViewService(db)
    data = service.export_records(
        request.record_ids,
        request.mask_sensitive,
        request.operator_role
    )

    ledger_service = LedgerService(db)
    for record_id in request.record_ids:
        try:
            ledger_service.mark_exported(
                record_id,
                request.operator,
                request.operator_role
            )
        except Exception:
            pass

    return {
        "format": request.export_format,
        "mask_sensitive": request.mask_sensitive,
        "count": len(data),
        "data": data
    }
