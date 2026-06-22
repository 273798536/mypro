import os
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from schemas import (
    ImportRecordResponse, ImportSummary, QuestionResponse,
    ReviewEntryResponse, ChangeLogResponse, ParameterVersionResponse,
    QuestionUpdate, ParameterVersionUpdate
)
from services.import_service import import_file
from services.review_service import (
    get_question_review, list_all_questions, list_change_logs,
    list_parameter_versions
)
from services.report_service import generate_import_report, list_import_records
from config import UPLOAD_DIR
from utils import allowed_file, generate_batch_no
from models import Question, ParameterVersion

router = APIRouter(prefix="/api", tags=["API"])


@router.post("/import", response_model=ImportSummary)
async def api_import_file(
    file: UploadFile = File(...),
    import_type: str = Form("question"),
    operator: str = Form("teacher"),
    db: Session = Depends(get_db),
):
    if not allowed_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail="不支持的文件格式。请使用 CSV、Excel、JSON 或 TXT 文件。",
        )

    safe_name = os.path.basename(file.filename)
    save_path = os.path.join(UPLOAD_DIR, f"{generate_batch_no()}_{safe_name}")

    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    try:
        record, summary = import_file(db, save_path, safe_name, import_type, operator)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"导入过程中出现问题：{str(e)}。请检查文件格式与内容是否正确。",
        )

    return summary


@router.get("/questions", response_model=List[QuestionResponse])
def api_list_questions(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    keyword: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return list_all_questions(db, skip, limit, category, keyword)


@router.get("/questions/{question_id}", response_model=ReviewEntryResponse)
def api_get_question_review(
    question_id: int,
    db: Session = Depends(get_db),
):
    result = get_question_review(db, question_id=question_id)
    if not result:
        raise HTTPException(status_code=404, detail="未找到该题目。请核对题目ID是否正确。")
    return result


@router.get("/questions/by_no/{question_no}", response_model=ReviewEntryResponse)
def api_get_question_review_by_no(
    question_no: str,
    db: Session = Depends(get_db),
):
    result = get_question_review(db, question_no=question_no)
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"未找到题目编号为 {question_no} 的记录。请核对题目编号或先导入该题目。",
        )
    return result


@router.put("/questions/{question_id}", response_model=QuestionResponse)
def api_update_question(
    question_id: int,
    data: QuestionUpdate,
    operator: str = Query("teacher"),
    db: Session = Depends(get_db),
):
    from services.import_service import _log_change

    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在。")

    for field, value in data.model_dump(exclude_unset=True).items():
        old_val = getattr(question, field)
        if old_val != value:
            _log_change(
                db, "question", question.id, "update",
                field_name=field, old_value=str(old_val),
                new_value=str(value), changed_by=operator,
                remark=f"手动更新题目字段[{field}]"
            )
            setattr(question, field, value)

    db.commit()
    db.refresh(question)
    return question


@router.get("/parameters/{question_id}", response_model=List[ParameterVersionResponse])
def api_list_parameters(
    question_id: int,
    db: Session = Depends(get_db),
):
    return list_parameter_versions(db, question_id)


@router.put("/parameters/{param_id}", response_model=ParameterVersionResponse)
def api_update_parameter(
    param_id: int,
    data: ParameterVersionUpdate,
    operator: str = Query("teacher"),
    db: Session = Depends(get_db),
):
    from services.import_service import _log_change

    param = db.query(ParameterVersion).filter(ParameterVersion.id == param_id).first()
    if not param:
        raise HTTPException(status_code=404, detail="参数记录不存在。")

    for field, value in data.model_dump(exclude_unset=True).items():
        old_val = getattr(param, field)
        if old_val != value:
            _log_change(
                db, "parameter", param.id, "update",
                field_name=field, old_value=str(old_val),
                new_value=str(value), changed_by=operator,
                parameter_id=param.id,
                remark=f"手动更新参数字段[{field}]"
            )
            setattr(param, field, value)

    db.commit()
    db.refresh(param)
    return param


@router.get("/change-logs", response_model=List[ChangeLogResponse])
def api_list_change_logs(
    skip: int = 0,
    limit: int = 200,
    target_type: Optional[str] = None,
    batch_no: Optional[str] = None,
    changed_by: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return list_change_logs(db, skip, limit, target_type, batch_no, changed_by)


@router.get("/import-records", response_model=List[ImportRecordResponse])
def api_list_import_records(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    batch_no: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return list_import_records(db, skip, limit, status, batch_no)


@router.get("/import-records/{record_id}", response_model=ImportRecordResponse)
def api_get_import_record(
    record_id: int,
    db: Session = Depends(get_db),
):
    record = db.query(ImportRecord).filter(ImportRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="导入记录不存在。")
    return record


@router.get("/reports/{record_id}")
def api_generate_report(
    record_id: int,
    format: str = "json",
    db: Session = Depends(get_db),
):
    report = generate_import_report(db, record_id, format)
    if "error" in report:
        raise HTTPException(status_code=404, detail=report["error"])
    return report
