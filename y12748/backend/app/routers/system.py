from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from ..database import get_db
from .. import crud

router = APIRouter(prefix="/api/system", tags=["系统管理"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    return crud.get_system_stats(db)


@router.post("/init-sample-data")
def initialize_sample_data(db: Session = Depends(get_db)):
    result = crud.initialize_sample_data(db)
    return result


@router.get("/first-run-check")
def check_first_run(db: Session = Depends(get_db)):
    stats = crud.get_system_stats(db)
    is_first_run = stats["total_batches"] == 0
    return {
        "is_first_run": is_first_run,
        "stats": stats
    }


@router.get("/traces")
def get_process_traces(db: Session = Depends(get_db),
                       batch_id: int = None,
                       limit: int = 50):
    batches = crud.list_import_batches(db, limit=limit if not batch_id else 1)
    if batch_id:
        batches = [b for b in batches if b.id == batch_id]

    traces = []
    for batch in batches:
        sessions = crud.list_review_sessions(db, batch_id=batch.id)
        reports = crud.list_reports(db, batch_id=batch.id)
        records = crud.list_question_records(db, batch_id=batch.id)
        corrections = crud.get_correction_history(db, limit=200)
        batch_corrections = [c for c in corrections if c.record_id in [r.id for r in records]]

        traces.append({
            "batch": {
                "id": batch.id,
                "name": batch.batch_name,
                "imported_at": batch.imported_at.isoformat() if batch.imported_at else None,
                "status": batch.status,
                "total_records": batch.total_records
            },
            "review_sessions": [
                {
                    "id": s.id,
                    "name": s.session_name,
                    "type": s.session_type,
                    "status": s.status,
                    "created_at": s.created_at.isoformat() if s.created_at else None,
                    "reviewed_items": s.reviewed_items,
                    "total_items": s.total_items
                }
                for s in sessions
            ],
            "reports": [
                {
                    "id": r.id,
                    "type": r.report_type,
                    "generated_at": r.generated_at.isoformat() if r.generated_at else None,
                    "status": r.status
                }
                for r in reports
            ],
            "records_summary": {
                "total": len(records),
                "pending": len([r for r in records if r.status == "pending"]),
                "reviewing": len([r for r in records if r.status == "reviewing"]),
                "passed": len([r for r in records if r.status == "passed"]),
                "rejected": len([r for r in records if r.status == "rejected"]),
                "with_issues": len([r for r in records if r.has_unit_issue or r.has_empty_value
                                    or r.has_mixed_remark or r.has_conflict or r.is_duplicate])
            },
            "corrections_count": len(batch_corrections)
        })

    return {"traces": traces}
