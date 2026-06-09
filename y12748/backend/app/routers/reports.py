from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import json

from ..database import get_db
from .. import schemas, crud
from ..utils import ReliabilityCalculator

router = APIRouter(prefix="/api/reports", tags=["报告导出"])


@router.post("", response_model=schemas.Report)
def generate_report(report_data: schemas.ReportCreate, db: Session = Depends(get_db)):
    batch = crud.get_import_batch(db, report_data.batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    session = None
    if report_data.session_id:
        session = crud.get_review_session(db, report_data.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="复核会话不存在")

    records = crud.list_question_records(db, batch_id=report_data.batch_id)

    summary = {
        "batch_id": batch.id,
        "batch_name": batch.batch_name,
        "generated_at": datetime.utcnow().isoformat(),
        "total_records": len(records),
        "by_status": {
            "pending": len([r for r in records if r.status == "pending"]),
            "reviewing": len([r for r in records if r.status == "reviewing"]),
            "passed": len([r for r in records if r.status == "passed"]),
            "rejected": len([r for r in records if r.status == "rejected"])
        },
        "data_quality": {
            "unit_issues": len([r for r in records if r.has_unit_issue]),
            "empty_values": len([r for r in records if r.has_empty_value]),
            "mixed_remarks": len([r for r in records if r.has_mixed_remark]),
            "conflicts": len([r for r in records if r.has_conflict]),
            "duplicates": len([r for r in records if r.is_duplicate])
        },
        "materials_count": len(set([r.material_name for r in records if r.material_name]))
    }

    if session:
        summary["session"] = {
            "id": session.id,
            "name": session.session_name,
            "type": session.session_type,
            "total_items": session.total_items,
            "reviewed_items": session.reviewed_items,
            "passed_items": session.passed_items,
            "pending_items": session.pending_items
        }

    curve_data = None
    valid_lifetimes = [float(r.lifetime_hours) for r in records if r.lifetime_hours and r.lifetime_hours > 0]
    if len(valid_lifetimes) >= 2:
        result = ReliabilityCalculator.calculate_reliability(valid_lifetimes)
        if result:
            curve_data = {
                "weibull_shape": result.weibull_shape,
                "weibull_scale": result.weibull_scale,
                "mean_lifetime": result.mean_lifetime,
                "median_lifetime": result.median_lifetime,
                "b10_lifetime": result.b10_lifetime,
                "r_squared": result.r_squared,
                "curve_points": result.curve_points,
                "sample_count": len(valid_lifetimes)
            }

    return crud.create_report(db, report_data, summary=summary, curve_data=curve_data)


@router.get("", response_model=List[schemas.Report])
def list_reports(session_id: Optional[int] = None,
                 batch_id: Optional[int] = None,
                 report_type: Optional[str] = None,
                 skip: int = 0, limit: int = 100,
                 db: Session = Depends(get_db)):
    return crud.list_reports(db, session_id=session_id, batch_id=batch_id,
                             report_type=report_type, skip=skip, limit=limit)


@router.get("/{report_id}", response_model=schemas.Report)
def get_report(report_id: int, db: Session = Depends(get_db)):
    report = crud.get_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    return report


@router.get("/{report_id}/download")
def download_report(report_id: int, db: Session = Depends(get_db)):
    report = crud.get_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")

    records = crud.list_question_records(db, batch_id=report.batch_id)

    export_data = {
        "report_info": {
            "id": report.id,
            "type": report.report_type,
            "generated_at": report.generated_at.isoformat() if report.generated_at else None,
            "generated_by": report.generated_by
        },
        "summary": report.summary,
        "reliability_curve": report.curve_data,
        "records": []
    }

    for r in records:
        corrections = crud.get_correction_history(db, record_id=r.id, limit=10)
        review_results = crud.list_review_results(db, record_id=r.id, limit=10)
        export_data["records"].append({
            "id": r.id,
            "question_id": r.question_id,
            "question_content": r.question_content,
            "material_name": r.material_name,
            "material_type": r.material_type,
            "stress_level": r.stress_level,
            "temperature": r.temperature,
            "lifetime_hours": r.lifetime_hours,
            "unit": r.unit,
            "student_answer": r.student_answer,
            "correct_answer": r.correct_answer,
            "constraint_condition": r.constraint_condition,
            "remark": r.remark,
            "status": r.status,
            "data_issues": {
                "has_unit_issue": r.has_unit_issue,
                "has_empty_value": r.has_empty_value,
                "has_mixed_remark": r.has_mixed_remark,
                "has_conflict": r.has_conflict,
                "is_duplicate": r.is_duplicate,
                "conflict_detail": r.conflict_detail
            },
            "correction_history": [
                {"field": c.field_name, "old": c.old_value, "new": c.new_value,
                 "by": c.corrected_by, "at": c.corrected_at.isoformat(), "comment": c.comment}
                for c in corrections
            ],
            "review_results": [
                {"session_id": rv.session_id, "before": rv.before_status, "after": rv.after_status,
                 "by": rv.reviewer, "at": rv.reviewed_at.isoformat(), "comment": rv.review_comment}
                for rv in review_results
            ]
        })

    response = JSONResponse(content=export_data)
    response.headers["Content-Disposition"] = f"attachment; filename=reliability_report_{report_id}.json"
    return response


@router.get("/{report_id}/student-view")
def get_student_report_view(report_id: int, db: Session = Depends(get_db)):
    report = crud.get_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")

    batch = crud.get_import_batch(db, report.batch_id)
    records = crud.list_question_records(db, batch_id=report.batch_id)

    passed_records = [r for r in records if r.status == "passed"]
    wrong_records = [r for r in records if r.status != "passed" and r.status != "pending"]
    conflict_records = [r for r in records if r.has_conflict]

    return {
        "report_id": report.id,
        "batch_name": batch.batch_name if batch else None,
        "generated_at": report.generated_at.isoformat() if report.generated_at else None,
        "total_questions": len(records),
        "passed_count": len(passed_records),
        "pending_count": len([r for r in records if r.status == "pending"]),
        "reliability_curve": report.curve_data,
        "summary_statistics": report.summary.get("data_quality", {}) if report.summary else {},
        "wrong_answers": [
            {
                "question_id": r.question_id,
                "question_content": r.question_content,
                "student_answer": r.student_answer,
                "correct_answer": r.correct_answer,
                "lifetime_hours": r.lifetime_hours,
                "unit": r.unit,
                "material_name": r.material_name
            }
            for r in wrong_records[:20]
        ],
        "conflicts": [
            {
                "question_id": r.question_id,
                "question_content": r.question_content,
                "conflict_detail": r.conflict_detail,
                "student_answer": r.student_answer,
                "correct_answer": r.correct_answer
            }
            for r in conflict_records[:10]
        ],
        "passed_examples": [
            {
                "question_id": r.question_id,
                "material_name": r.material_name,
                "lifetime_hours": r.lifetime_hours,
                "stress_level": r.stress_level,
                "temperature": r.temperature,
                "correct_answer": r.correct_answer
            }
            for r in passed_records[:10]
        ]
    }
