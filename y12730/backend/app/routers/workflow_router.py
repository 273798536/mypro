from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.services.conflict_service import (
    detect_conflicts, list_conflicts, resolve_conflict
)
from app.services.review_service import (
    create_or_update_review, update_review, list_reviews,
    get_review_summary, auto_initialize_reviews, mark_batch_completed
)
from app.services.analysis_service import (
    run_error_analysis, list_error_analyses, get_error_distribution,
    generate_counter_examples, list_counter_examples
)
from app.services.export_service import (
    export_teacher_report, export_student_report, export_conflicts_report,
    export_json_snapshot, list_export_reports, get_report_file_path
)
from app.schemas import (
    ConflictRecord, ConflictResolve, ReviewRecordCreate, ReviewRecordUpdate,
    ReviewRecord, ReviewSummaryResponse, ErrorAnalysis, CounterExample,
    ExportReport
)
from app.models import ResultGrade, AnomalyCategory
from fastapi.responses import FileResponse
import os

router = APIRouter(prefix="/api", tags=["复核、分析、导出"])


@router.post("/batches/{batch_id}/conflicts/detect")
def do_detect_conflicts(batch_id: int, db: Session = Depends(get_db)):
    conflicts, stats = detect_conflicts(db, batch_id)
    return {
        "conflicts_count": len(conflicts),
        "stats": stats
    }


@router.get("/batches/{batch_id}/conflicts", response_model=List[ConflictRecord])
def get_conflicts(
    batch_id: int, only_unresolved: bool = False,
    skip: int = 0, limit: int = 200, db: Session = Depends(get_db)
):
    return list_conflicts(db, batch_id, only_unresolved=only_unresolved, skip=skip, limit=limit)


@router.patch("/conflicts/{conflict_id}", response_model=ConflictRecord)
def do_resolve_conflict(
    conflict_id: int, body: ConflictResolve, db: Session = Depends(get_db)
):
    c = resolve_conflict(db, conflict_id, body.is_resolved, body.resolution_suggestion)
    if not c:
        raise HTTPException(status_code=404, detail="冲突记录不存在")
    return c


@router.post("/batches/{batch_id}/reviews/init")
def do_init_reviews(batch_id: int, db: Session = Depends(get_db)):
    n = auto_initialize_reviews(db, batch_id)
    return {"initialized": n}


@router.post("/reviews", response_model=ReviewRecord)
def do_create_or_update_review(review_in: ReviewRecordCreate, db: Session = Depends(get_db)):
    return create_or_update_review(db, review_in)


@router.patch("/reviews/{review_id}", response_model=ReviewRecord)
def do_update_review(
    review_id: int, body: ReviewRecordUpdate, db: Session = Depends(get_db)
):
    r = update_review(db, review_id, body)
    if not r:
        raise HTTPException(status_code=404, detail="复核记录不存在")
    return r


@router.get("/batches/{batch_id}/reviews", response_model=List[ReviewRecord])
def get_reviews(
    batch_id: int,
    result_grade: Optional[ResultGrade] = None,
    anomaly_category: Optional[AnomalyCategory] = None,
    skip: int = 0, limit: int = 200, db: Session = Depends(get_db)
):
    return list_reviews(db, batch_id, result_grade=result_grade,
                        anomaly_category=anomaly_category, skip=skip, limit=limit)


@router.get("/batches/{batch_id}/reviews/summary", response_model=ReviewSummaryResponse)
def get_batch_review_summary(batch_id: int, db: Session = Depends(get_db)):
    s = get_review_summary(db, batch_id)
    return ReviewSummaryResponse(**s)


@router.post("/batches/{batch_id}/complete")
def do_complete_batch(batch_id: int, db: Session = Depends(get_db)):
    mark_batch_completed(db, batch_id)
    return {"success": True}


@router.post("/batches/{batch_id}/error-analysis/run")
def do_run_error_analysis(batch_id: int, db: Session = Depends(get_db)):
    results = run_error_analysis(db, batch_id)
    return {"analyzed": len(results)}


@router.get("/batches/{batch_id}/error-analysis", response_model=List[ErrorAnalysis])
def get_error_analyses(
    batch_id: int, only_excessive: bool = False,
    skip: int = 0, limit: int = 200, db: Session = Depends(get_db)
):
    return list_error_analyses(db, batch_id, only_excessive=only_excessive, skip=skip, limit=limit)


@router.get("/batches/{batch_id}/error-analysis/distribution")
def get_error_dist(batch_id: int, db: Session = Depends(get_db)):
    return get_error_distribution(db, batch_id)


@router.post("/questions/{question_id}/counter-examples/generate")
def do_generate_counter_examples(question_id: int, db: Session = Depends(get_db)):
    examples = generate_counter_examples(db, question_id)
    return {"generated": len(examples)}


@router.get("/questions/{question_id}/counter-examples", response_model=List[CounterExample])
def get_counter_examples(question_id: int, db: Session = Depends(get_db)):
    return list_counter_examples(db, question_id)


@router.post("/batches/{batch_id}/exports/teacher")
def do_export_teacher(
    batch_id: int, fmt: str = "xlsx", exported_by: str = "",
    db: Session = Depends(get_db)
):
    report = export_teacher_report(db, batch_id, fmt=fmt, exported_by=exported_by or None)
    return report


@router.post("/batches/{batch_id}/exports/student")
def do_export_student(
    batch_id: int, fmt: str = "xlsx", exported_by: str = "",
    db: Session = Depends(get_db)
):
    report = export_student_report(db, batch_id, fmt=fmt, exported_by=exported_by or None)
    return report


@router.post("/batches/{batch_id}/exports/conflicts")
def do_export_conflicts(
    batch_id: int, fmt: str = "xlsx", exported_by: str = "",
    db: Session = Depends(get_db)
):
    report = export_conflicts_report(db, batch_id, fmt=fmt, exported_by=exported_by or None)
    return report


@router.post("/batches/{batch_id}/exports/json")
def do_export_json(
    batch_id: int, exported_by: str = "",
    db: Session = Depends(get_db)
):
    report = export_json_snapshot(db, batch_id, exported_by=exported_by or None)
    return report


@router.get("/batches/{batch_id}/exports", response_model=List[ExportReport])
def get_exports(
    batch_id: int, skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db)
):
    return list_export_reports(db, batch_id, skip=skip, limit=limit)


@router.get("/exports/all", response_model=List[ExportReport])
def get_all_exports(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return list_export_reports(db, None, skip=skip, limit=limit)


@router.get("/exports/{report_id}/download")
def download_report(report_id: int, db: Session = Depends(get_db)):
    path = get_report_file_path(report_id, db)
    if not path:
        raise HTTPException(status_code=404, detail="报告不存在或文件已丢失")
    filename = os.path.basename(path)
    return FileResponse(path, filename=filename)
