from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
import io

from ..database import get_db
from .. import schemas, crud
from ..utils import DataQualityChecker

router = APIRouter(prefix="/api/batches", tags=["导入批次"])


@router.post("", response_model=schemas.ImportBatch)
def create_batch(batch_data: schemas.ImportBatchCreate, db: Session = Depends(get_db)):
    return crud.create_import_batch(db, batch_data)


@router.get("", response_model=List[schemas.ImportBatch])
def list_batches(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.list_import_batches(db, skip=skip, limit=limit)


@router.get("/{batch_id}", response_model=schemas.ImportBatch)
def get_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = crud.get_import_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return batch


@router.post("/{batch_id}/import", response_model=schemas.ImportResult)
async def import_records_from_file(batch_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    batch = crud.get_import_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    contents = await file.read()
    file_ext = file.filename.split(".")[-1].lower() if file.filename else "xlsx"

    try:
        if file_ext in ["xlsx", "xls"]:
            df = pd.read_excel(io.BytesIO(contents))
        elif file_ext == "csv":
            df = pd.read_csv(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="不支持的文件格式，请上传xlsx或csv")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件解析失败: {str(e)}")

    quality_report = DataQualityChecker.analyze(df)

    existing_qids = {}
    valid_count = 0

    for idx, row in df.iterrows():
        row_idx = int(idx)
        flags = DataQualityChecker.get_record_flags(quality_report.issues, row_idx)
        record_dict = row.where(pd.notnull(row), None).to_dict()

        qid = str(record_dict.get("question_id", "")).strip()
        if qid and qid in existing_qids:
            flags["is_duplicate"] = True
            flags["duplicate_of_id"] = existing_qids[qid]
        elif qid:
            existing = crud.find_existing_question(db, qid, batch_id)
            if existing:
                flags["is_duplicate"] = True
                flags["duplicate_of_id"] = existing.id
            else:
                existing_qids[qid] = None

        record = crud.create_question_record(db, record_dict, batch_id=batch_id, flags=flags)
        if qid and existing_qids.get(qid) is None:
            existing_qids[qid] = record.id

        if not any([flags.get(k, False) for k in ['has_unit_issue', 'has_empty_value', 'has_mixed_remark', 'has_conflict', 'is_duplicate']]):
            valid_count += 1

    batch.file_name = file.filename
    batch.total_records = quality_report.total_records
    batch.valid_records = valid_count
    batch.invalid_records = quality_report.total_records - valid_count
    batch.status = "imported"
    db.commit()
    db.refresh(batch)

    issue_list = []
    for issue in quality_report.issues:
        issue_list.append({
            "row_index": issue.row_index,
            "question_id": issue.question_id,
            "issue_type": issue.issue_type,
            "field_name": issue.field_name,
            "description": issue.description,
            "old_value": issue.old_value,
            "suggestion": issue.suggestion
        })

    return schemas.ImportResult(
        batch_id=batch_id,
        total=quality_report.total_records,
        valid=valid_count,
        invalid=quality_report.total_records - valid_count,
        issues=issue_list
    )


@router.get("/{batch_id}/records", response_model=List[schemas.QuestionRecord])
def get_batch_records(batch_id: int, status: Optional[str] = None,
                      has_issues: Optional[bool] = None,
                      skip: int = 0, limit: int = 500,
                      db: Session = Depends(get_db)):
    batch = crud.get_import_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return crud.list_question_records(db, batch_id=batch_id, status=status,
                                      has_issues=has_issues, skip=skip, limit=limit)


@router.get("/{batch_id}/quality-issues")
def get_batch_quality_issues(batch_id: int, db: Session = Depends(get_db)):
    batch = crud.get_import_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    records = crud.list_question_records(db, batch_id=batch_id)
    issues = []
    for r in records:
        record_issues = []
        if r.has_unit_issue:
            record_issues.append({"type": "unit_missing", "field": "unit", "description": "单位缺失"})
        if r.has_empty_value:
            record_issues.append({"type": "empty_value", "description": "存在空值字段"})
        if r.has_mixed_remark:
            record_issues.append({"type": "mixed_remark", "description": "数值与备注混写"})
        if r.has_conflict:
            record_issues.append({"type": "conflict", "description": r.conflict_detail or "数据冲突"})
        if r.is_duplicate:
            record_issues.append({"type": "duplicate", "description": f"与记录#{r.duplicate_of_id}重复"})
        if record_issues:
            issues.append({
                "record_id": r.id,
                "question_id": r.question_id,
                "issues": record_issues
            })

    return {
        "batch_id": batch_id,
        "records_with_issues": len(issues),
        "total_records": len(records),
        "issues_detail": issues
    }
