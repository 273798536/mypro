from datetime import datetime
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud import crud
from app.schemas import schemas
from app.services.export_service import generate_export_files, STATUS_LABEL, ISSUE_TYPE_LABEL

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


def _build_export_report(batch_id: int, db: Session):
    json_path, excel_path, err = generate_export_files(db, batch_id)
    if err:
        raise HTTPException(status_code=404, detail=err)

    with open(json_path, "r", encoding="utf-8") as f:
        import json as _json
        full = _json.load(f)

    ss = full["status_summary"]
    issue_breakdown = []
    for ib in full["issue_breakdown"]:
        issue_breakdown.append(schemas.IssueBreakdown(
            issue_type=ib["issue_type"],
            issue_type_label=ib["issue_type_label"],
            count=ib["count"],
            question_ids=ib["question_ids"],
            details=ib["details"],
        ))

    return schemas.ExportReportResponse(
        batch_id=full["batch_info"]["id"],
        batch_name=full["batch_info"]["batch_name"],
        export_time=datetime.utcnow(),
        plain_explanation=full["plain_explanation"],
        status_summary=ss,
        issue_breakdown=issue_breakdown,
        bias_check_result=full["bias_check_result"],
        rejection_explanation=full.get("rejection_explanation"),
        full_data=full,
    ), json_path, excel_path


@router.get("/{batch_id}/export-report", response_model=schemas.ExportReportResponse, summary="导出版权账本报告（JSON 格式，用于页面展示）")
def export_report(batch_id: int, db: Session = Depends(get_db)):
    report, _, _ = _build_export_report(batch_id, db)
    return report


@router.get("/{batch_id}/download/json", summary="下载版权账本报告（JSON 文件）")
def download_report_json(batch_id: int, db: Session = Depends(get_db)):
    _, json_path, _ = _build_export_report(batch_id, db)
    if not json_path or not Path(json_path).exists():
        raise HTTPException(status_code=500, detail="报告文件生成失败，请重试")
    return FileResponse(
        path=str(json_path),
        media_type="application/json",
        filename=Path(json_path).name,
    )


@router.get("/{batch_id}/download/excel", summary="下载版权账本报告（Excel 文件）")
def download_report_excel(batch_id: int, db: Session = Depends(get_db)):
    _, _, excel_path = _build_export_report(batch_id, db)
    if not excel_path or not Path(excel_path).exists():
        raise HTTPException(status_code=500, detail="报告文件生成失败，请重试")
    return FileResponse(
        path=str(excel_path),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=Path(excel_path).name,
    )
