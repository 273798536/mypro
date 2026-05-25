from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.common import ExportRequest, FreezeRequest
from app.services.export import ExportService
from app.api.deps import require_permission

router = APIRouter()


@router.post("/excel")
def export_excel(
    request: ExportRequest,
    db: Session = Depends(get_db),
    current_user: dict = require_permission("export:create", "数据导出"),
):
    service = ExportService(db)
    snapshot = service.export_to_excel(
        export_type=request.export_type,
        batch_no=request.batch_no,
        exported_by=request.exported_by,
        freeze_after=request.freeze_after_export,
        filters=request.filters,
    )
    return {
        "status": "success",
        "snapshot_no": snapshot.snapshot_no,
        "file_path": snapshot.file_path,
        "file_name": snapshot.file_name,
        "record_count": snapshot.record_count,
        "is_frozen": snapshot.is_frozen,
        "authorized_by": current_user,
    }


@router.post("/freeze")
def freeze_snapshot(
    request: FreezeRequest,
    db: Session = Depends(get_db),
    current_user: dict = require_permission("export:freeze", "冻结导出快照"),
):
    service = ExportService(db)
    snapshot = service.freeze_snapshot(
        snapshot_no=request.snapshot_no,
        frozen_by=request.frozen_by,
        remarks=request.remarks,
    )
    if not snapshot:
        raise HTTPException(status_code=404, detail="快照不存在")
    return {
        "status": "success",
        "snapshot_no": snapshot.snapshot_no,
        "is_frozen": snapshot.is_frozen,
        "frozen_at": snapshot.frozen_at,
        "frozen_by": snapshot.frozen_by,
        "authorized_by": current_user,
    }


@router.get("/snapshot/{snapshot_no}")
def get_snapshot(snapshot_no: str, db: Session = Depends(get_db)):
    service = ExportService(db)
    snapshot = service.get_snapshot(snapshot_no)
    if not snapshot:
        raise HTTPException(status_code=404, detail="快照不存在")
    return snapshot


@router.get("/snapshots")
def list_snapshots(
    batch_no: Optional[str] = None,
    frozen_only: bool = False,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    service = ExportService(db)
    snapshots = service.list_snapshots(
        batch_no=batch_no,
        frozen_only=frozen_only,
        limit=limit,
    )
    return {
        "count": len(snapshots),
        "snapshots": snapshots,
    }


@router.get("/verify/{snapshot_no}")
def verify_snapshot(snapshot_no: str, db: Session = Depends(get_db)):
    service = ExportService(db)
    result = service.verify_snapshot(snapshot_no)
    return result
