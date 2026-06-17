from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud import crud
from app.schemas import schemas

router = APIRouter(prefix="/api/batches", tags=["评测批次"])


@router.post("", response_model=schemas.EvaluationBatch, summary="导入评测题库批次")
def create_batch(batch_in: schemas.EvaluationBatchCreate, db: Session = Depends(get_db)):
    return crud.create_batch(db, batch_in)


@router.get("", response_model=List[schemas.BatchListItem], summary="查询所有评测批次")
def list_batches(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.list_batches(db, skip=skip, limit=limit)


@router.get("/{batch_id}", response_model=schemas.EvaluationBatch, summary="查询批次详情")
def get_batch(batch_id: int, db: Session = Depends(get_db)):
    db_batch = crud.get_batch(db, batch_id)
    if not db_batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return db_batch


@router.get("/{batch_id}/review-summary", response_model=schemas.BatchReviewIssueSummary, summary="查询复核异常汇总")
def get_review_summary(batch_id: int, db: Session = Depends(get_db)):
    db_batch = crud.get_batch(db, batch_id)
    if not db_batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return crud.get_review_summary(db, batch_id)


@router.post("/{batch_id}/review", response_model=schemas.EvaluationBatch, summary="提交复核结果")
def submit_review(batch_id: int, review_submit: schemas.BatchReviewSubmit, db: Session = Depends(get_db)):
    db_batch = crud.get_batch(db, batch_id)
    if not db_batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    result = crud.submit_batch_review(db, batch_id, review_submit)
    if not result:
        raise HTTPException(status_code=400, detail="复核提交失败")
    return result


@router.post("/{batch_id}/status", response_model=schemas.EvaluationBatch, summary="推进批次状态")
def transition_status(batch_id: int, req: schemas.StatusTransitionRequest, db: Session = Depends(get_db)):
    db_batch = crud.get_batch(db, batch_id)
    if not db_batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    result = crud.transition_batch_status(db, batch_id, req)
    if not result:
        raise HTTPException(status_code=400, detail="状态推进失败")
    return result


@router.get("/{batch_id}/issue-breakdown", response_model=List[schemas.IssueBreakdown], summary="查询异常分类明细")
def get_issue_breakdown(batch_id: int, db: Session = Depends(get_db)):
    db_batch = crud.get_batch(db, batch_id)
    if not db_batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return crud.get_batch_issue_breakdown(db, batch_id)


@router.post("/{batch_id}/prompt-version", response_model=List[schemas.PromptVersionTrack], summary="绑定提示词版本")
def bind_prompt_version(batch_id: int, req: schemas.PromptVersionBindRequest, db: Session = Depends(get_db)):
    db_batch = crud.get_batch(db, batch_id)
    if not db_batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    db_pv = crud.get_prompt_version(db, req.prompt_version_id)
    if not db_pv:
        raise HTTPException(status_code=404, detail="提示词版本不存在")
    return crud.bind_prompt_version(db, batch_id, req)


@router.get("/{batch_id}/prompt-versions", response_model=List[schemas.PromptVersionTrack], summary="查询提示词版本追踪记录")
def get_prompt_tracks(batch_id: int, db: Session = Depends(get_db)):
    db_batch = crud.get_batch(db, batch_id)
    if not db_batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return crud.get_batch_prompt_tracks(db, batch_id)


@router.get("/{batch_id}/bias-analysis", summary="评测集偏科分析")
def analyze_bias(batch_id: int, db: Session = Depends(get_db)):
    db_batch = crud.get_batch(db, batch_id)
    if not db_batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return crud.analyze_bias(db, batch_id)


@router.get("/{batch_id}/export-report", response_model=schemas.ExportReportResponse, summary="导出版权账本报告")
def export_report(batch_id: int, db: Session = Depends(get_db)):
    db_batch = crud.get_batch(db, batch_id)
    if not db_batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    summary = crud.get_review_summary(db, batch_id)
    issue_breakdown = crud.get_batch_issue_breakdown(db, batch_id)
    bias = crud.analyze_bias(db, batch_id)
    plain_explanation = crud.generate_plain_explanation(db, batch_id)
    rejection_explanation = crud.get_rejection_explanation(db, batch_id)
    prompt_tracks = crud.get_batch_prompt_tracks(db, batch_id)

    questions_data = []
    for q in db_batch.questions:
        questions_data.append({
            "id": q.id,
            "question_id_external": q.question_id_external,
            "question_content": q.question_content,
            "standard_answer": q.standard_answer,
            "difficulty": q.difficulty,
            "knowledge_point": q.knowledge_point,
            "human_note": q.human_note,
            "current_status": q.current_status.value,
            "copyright_sources": [
                {
                    "copyright_type": cs.copyright_type.value,
                    "source_title": cs.source_title,
                    "source_author": cs.source_author,
                    "source_publisher": cs.source_publisher,
                    "source_url": cs.source_url,
                    "publication_date": cs.publication_date,
                    "authorization_number": cs.authorization_number,
                    "authorization_expiry": cs.authorization_expiry,
                    "fair_use_justification": cs.fair_use_justification,
                    "remark": cs.remark,
                }
                for cs in q.copyright_sources
            ],
            "review_records": [
                {
                    "reviewer": r.reviewer,
                    "review_time": r.review_time.isoformat(),
                    "issue_type": r.issue_type.value if r.issue_type else None,
                    "issue_detail": r.issue_detail,
                    "next_action": r.next_action,
                    "passed": r.passed,
                    "human_note_preserved": r.human_note_preserved,
                }
                for r in q.review_records
            ],
            "status_history": [
                {
                    "from_status": s.from_status.value if s.from_status else None,
                    "to_status": s.to_status.value,
                    "operator": s.operator,
                    "operate_time": s.operate_time.isoformat(),
                    "reason": s.reason,
                }
                for s in q.status_history
            ],
        })

    status_summary = {
        "batch_status": db_batch.current_status.value,
        "total_questions": db_batch.total_questions,
        "review_passed": summary.total_passed,
        "review_blocked": summary.total_blocked,
        "material_missing": summary.material_missing_count,
        "calibration_wrong": summary.calibration_wrong_count,
        "pending": summary.total_pending,
    }

    full_data = {
        "batch_info": {
            "id": db_batch.id,
            "batch_name": db_batch.batch_name,
            "import_time": db_batch.import_time.isoformat(),
            "importer": db_batch.importer,
            "description": db_batch.description,
            "subject_category": db_batch.subject_category,
            "rejection_reason": db_batch.rejection_reason,
        },
        "questions": questions_data,
        "status_history": [
            {
                "from_status": s.from_status.value if s.from_status else None,
                "to_status": s.to_status.value,
                "operator": s.operator,
                "operate_time": s.operate_time.isoformat(),
                "reason": s.reason,
            }
            for s in db_batch.status_history
        ],
        "prompt_version_tracks": [
            {
                "version_code": t.prompt_version.version_code if t.prompt_version else None,
                "version_name": t.prompt_version.version_name if t.prompt_version else None,
                "bind_time": t.bind_time.isoformat(),
                "operator": t.operator,
                "question_id": t.question_id,
                "remark": t.remark,
            }
            for t in prompt_tracks
        ],
    }

    return schemas.ExportReportResponse(
        batch_id=db_batch.id,
        batch_name=db_batch.batch_name,
        export_time=datetime.utcnow(),
        plain_explanation=plain_explanation,
        status_summary=status_summary,
        issue_breakdown=issue_breakdown,
        bias_check_result=bias,
        rejection_explanation=rejection_explanation,
        full_data=full_data,
    )
