from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from io import BytesIO

from ..database import get_db
from ..models import (
    RecordStatus, RecordType, Role, ActionType, ChangeReason
)
from ..services import (
    RecordService, ImportService, AuditService, ExportService,
    StateTransitionError, RecordFrozenError
)
from .schemas import (
    RecordCreateRequest, RecordUpdateRequest, RecordActionRequest,
    RecordResponse, AuditLogResponse, VersionDiffResponse,
    ImportResponse, ErrorResponse
)

router = APIRouter(prefix="/api/v1", tags=["ledger"])


@router.post("/records", response_model=RecordResponse)
def create_record(
    request: RecordCreateRequest,
    db: Session = Depends(get_db),
):
    service = RecordService(db)
    try:
        record = service.create_record(
            record_type=request.record_type,
            tracking_no=request.tracking_no,
            created_by=request.created_by,
            created_by_role=request.created_by_role,
            package_no=request.package_no,
            customs_no=request.customs_no,
            declaration_no=request.declaration_no,
            hs_code=request.hs_code,
            goods_description=request.goods_description,
            quantity=request.quantity,
            unit=request.unit,
            declared_value=request.declared_value,
            currency=request.currency,
            weight=request.weight,
            origin_country=request.origin_country,
            destination_country=request.destination_country,
            tax_amount=request.tax_amount,
            duty_amount=request.duty_amount,
            vat_amount=request.vat_amount,
            is_exception=request.is_exception,
            exception_note=request.exception_note,
            exception_owner=request.exception_owner,
            notice_no=request.notice_no,
            original_tax=request.original_tax,
            supplementary_tax=request.supplementary_tax,
            late_fee=request.late_fee,
            total_tax=request.total_tax,
            payer=request.payer,
            node_type=request.node_type,
            node_location=request.node_location,
            operator=request.operator,
            node_note=request.node_note,
        )
        return record
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/records", response_model=List[RecordResponse])
def list_records(
    status: Optional[RecordStatus] = None,
    record_type: Optional[RecordType] = None,
    tracking_no: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    service = RecordService(db)
    return service.list_records(
        status=status,
        record_type=record_type,
        tracking_no=tracking_no,
        skip=skip,
        limit=limit,
    )


@router.get("/records/{record_id}", response_model=RecordResponse)
def get_record(
    record_id: int,
    db: Session = Depends(get_db),
):
    service = RecordService(db)
    record = service.get_record(record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@router.patch("/records/{record_id}", response_model=RecordResponse)
def update_record(
    record_id: int,
    request: RecordUpdateRequest,
    db: Session = Depends(get_db),
):
    service = RecordService(db)
    try:
        record = service.update_record(
            record_id=record_id,
            updated_by=request.updated_by,
            updated_by_role=request.updated_by_role,
            change_reason=request.change_reason,
            change_reason_note=request.change_reason_note,
            tracking_no=request.tracking_no,
            package_no=request.package_no,
            customs_no=request.customs_no,
            hs_code=request.hs_code,
            goods_description=request.goods_description,
            quantity=request.quantity,
            declared_value=request.declared_value,
            tax_amount=request.tax_amount,
            duty_amount=request.duty_amount,
            vat_amount=request.vat_amount,
            is_exception=request.is_exception,
            exception_note=request.exception_note,
            exception_owner=request.exception_owner,
        )
        return record
    except (StateTransitionError, RecordFrozenError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/records/{record_id}/submit", response_model=RecordResponse)
def submit_record(
    record_id: int,
    request: RecordActionRequest,
    db: Session = Depends(get_db),
):
    service = RecordService(db)
    try:
        return service.submit_record(
            record_id=record_id,
            submitted_by=request.action_by,
            submitted_by_role=request.action_by_role,
            note=request.note,
        )
    except (StateTransitionError, RecordFrozenError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/records/{record_id}/reject", response_model=RecordResponse)
def reject_record(
    record_id: int,
    request: RecordActionRequest,
    db: Session = Depends(get_db),
):
    service = RecordService(db)
    try:
        return service.reject_record(
            record_id=record_id,
            rejected_by=request.action_by,
            rejected_by_role=request.action_by_role,
            rejection_reason=request.note or "Rejected",
        )
    except (StateTransitionError, RecordFrozenError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/records/{record_id}/confirm", response_model=RecordResponse)
def confirm_record(
    record_id: int,
    request: RecordActionRequest,
    db: Session = Depends(get_db),
):
    service = RecordService(db)
    try:
        return service.confirm_record(
            record_id=record_id,
            confirmed_by=request.action_by,
            confirmed_by_role=request.action_by_role,
            note=request.note,
        )
    except (StateTransitionError, RecordFrozenError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/records/{record_id}/recall", response_model=RecordResponse)
def recall_record(
    record_id: int,
    request: RecordActionRequest,
    db: Session = Depends(get_db),
):
    service = RecordService(db)
    try:
        return service.recall_record(
            record_id=record_id,
            recalled_by=request.action_by,
            recalled_by_role=request.action_by_role,
            reason=request.note or "Recalled",
        )
    except (StateTransitionError, RecordFrozenError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/records/{record_id}/freeze", response_model=RecordResponse)
def freeze_record(
    record_id: int,
    request: RecordActionRequest,
    db: Session = Depends(get_db),
):
    service = RecordService(db)
    try:
        return service.freeze_record(
            record_id=record_id,
            frozen_by=request.action_by,
            frozen_by_role=request.action_by_role,
            reason=request.note or "Frozen for export",
        )
    except (StateTransitionError, RecordFrozenError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/records/{record_id}/unfreeze", response_model=RecordResponse)
def unfreeze_record(
    record_id: int,
    request: RecordActionRequest,
    db: Session = Depends(get_db),
):
    service = RecordService(db)
    try:
        return service.unfreeze_record(
            record_id=record_id,
            unfrozen_by=request.action_by,
            unfrozen_by_role=request.action_by_role,
            reason=request.note or "Unfrozen",
        )
    except (StateTransitionError, RecordFrozenError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/records/{record_id}/history")
def get_record_history(
    record_id: int,
    desensitize: bool = Query(False),
    db: Session = Depends(get_db),
):
    service = AuditService(db)
    try:
        history = service.get_record_history(record_id, desensitize=desensitize)
        return [h.to_dict(desensitize) for h in history]
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/records/{record_id}/compare")
def compare_versions(
    record_id: int,
    version1: int,
    version2: int,
    desensitize: bool = Query(False),
    db: Session = Depends(get_db),
):
    service = AuditService(db)
    try:
        return service.compare_versions(record_id, version1, version2, desensitize=desensitize)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/records/{record_id}/change-reasons")
def get_change_reasons(
    record_id: int,
    db: Session = Depends(get_db),
):
    service = AuditService(db)
    return service.get_change_reason_summary(record_id)


@router.get("/audit/logs")
def get_audit_logs(
    action_by: Optional[str] = None,
    action_type: Optional[ActionType] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    service = AuditService(db)
    return service.get_audit_trail(
        action_by=action_by,
        action_type=action_type,
        skip=skip,
        limit=limit,
    )


@router.get("/export/excel")
def export_excel(
    status: Optional[RecordStatus] = None,
    record_type: Optional[RecordType] = None,
    include_history: bool = Query(False),
    desensitize: bool = Query(False),
    role: Optional[Role] = None,
    db: Session = Depends(get_db),
):
    service = ExportService(db)
    try:
        excel_data, count = service.export_to_excel(
            status=status,
            record_type=record_type,
            include_history=include_history,
            desensitize=desensitize,
            role=role,
        )

        if count == 0:
            raise HTTPException(status_code=404, detail="No records to export")

        return StreamingResponse(
            BytesIO(excel_data),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=ledger_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/json")
def export_json(
    status: Optional[RecordStatus] = None,
    record_type: Optional[RecordType] = None,
    tracking_no: Optional[str] = None,
    include_history: bool = Query(False),
    desensitize: bool = Query(False),
    role: Optional[Role] = None,
    db: Session = Depends(get_db),
):
    service = ExportService(db)
    return service.export_records(
        status=status,
        record_type=record_type,
        tracking_no=tracking_no,
        include_history=include_history,
        desensitize=desensitize,
        role=role,
    )


@router.get("/reports/exceptions")
def get_exception_report(
    desensitize: bool = Query(False),
    role: Optional[Role] = None,
    db: Session = Depends(get_db),
):
    service = ExportService(db)
    return service.generate_exception_report(desensitize=desensitize, role=role)


@router.get("/reports/dashboard")
def get_manager_dashboard(
    db: Session = Depends(get_db),
):
    service = ExportService(db)
    return service.generate_manager_dashboard()


from datetime import datetime
from fastapi import UploadFile, File


@router.post("/import")
async def import_file(
    file: UploadFile = File(...),
    record_type: RecordType = RecordType.DECLARATION,
    imported_by: str = "system",
    imported_by_role: Role = Role.DATA_ENTRY,
    sheet_name: Optional[str] = None,
    db: Session = Depends(get_db),
):
    service = ImportService(db)
    try:
        content = await file.read()

        file_hash = service._calculate_file_hash(content)
        existing = service.check_duplicate_import(file_hash)
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"File already imported: {existing.filename} at {existing.created_at}"
            )

        import_source, result = service.import_from_file(
            filename=file.filename or "unknown",
            file_content=content,
            record_type=record_type,
            imported_by=imported_by,
            imported_by_role=imported_by_role,
            sheet_name=sheet_name,
        )

        return {
            "import_source_id": import_source.id,
            "filename": import_source.filename,
            "total_rows": import_source.total_rows,
            "success_count": result.success_count,
            "failed_count": result.failed_count,
            "errors": result.errors,
            "created_record_nos": result.to_dict()["created_record_nos"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/import/{source_id}")
def get_import_status(
    source_id: int,
    db: Session = Depends(get_db),
):
    service = ImportService(db)
    source = service.get_import_source(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Import source not found")

    records = service.get_records_by_source(source_id)

    return {
        "id": source.id,
        "filename": source.filename,
        "uploaded_by": source.uploaded_by,
        "created_at": source.created_at,
        "total_rows": source.total_rows,
        "success_rows": source.success_rows,
        "failed_rows": source.failed_rows,
        "record_count": len(records),
        "records": [{"id": r.id, "record_no": r.record_no, "row_number": r.import_row_number} for r in records],
    }
