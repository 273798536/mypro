from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models import AuditBatch, User
from ..schemas import FinancialSummary, ExportRequest
from ..permissions import get_current_user_with_permission, Permission
from ..financial_audit import get_financial_summary, export_batch_to_excel, explain_anomalies
from ..diff_tracker import get_freeze_status_comparison

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/batch/{batch_id}/financial-summary", response_model=FinancialSummary)
def get_financial(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.VIEW_BATCH))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    summary = get_financial_summary(db, batch_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not available")
    return summary


@router.get("/batch/{batch_id}/freeze-comparison")
def get_freeze_comparison(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.VIEW_BATCH))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    return get_freeze_status_comparison(db, batch_id)


@router.get("/batch/{batch_id}/anomalies")
def get_anomalies_explanation(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.VIEW_BATCH))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    return explain_anomalies(db, batch_id)


@router.post("/export")
def export_batches(
    export_request: ExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.EXPORT_DATA))
):
    excel_file = export_batch_to_excel(
        db,
        export_request.batch_ids,
        export_request.include_dirty_records,
        export_request.include_state_transitions
    )
    
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=audit_export_{'_'.join(map(str, export_request.batch_ids))}.xlsx"
        }
    )


@router.get("/batch/{batch_id}/export")
def export_single_batch(
    batch_id: int,
    include_dirty_records: bool = True,
    include_state_transitions: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.EXPORT_DATA))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    excel_file = export_batch_to_excel(
        db,
        [batch_id],
        include_dirty_records,
        include_state_transitions
    )
    
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=audit_batch_{batch.batch_no}.xlsx"
        }
    )
