import os
import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import (
    ProcessBatch, QuestionItem, ParamRecord, ConflictRecord,
    ReviewRecord, ErrorAnalysis, ExportReport, ResultGrade, AnomalyCategory
)
from app.config import settings
import pandas as pd
from typing import Optional, List


def _ensure_export_dir():
    os.makedirs(settings.EXPORT_DIR, exist_ok=True)


def _write_df_to_file(df: pd.DataFrame, filename: str, fmt: str = "xlsx") -> str:
    _ensure_export_dir()
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe = f"{ts}_{filename}"
    path = os.path.join(settings.EXPORT_DIR, safe)
    if fmt == "csv":
        if not path.endswith(".csv"):
            path += ".csv"
        df.to_csv(path, index=False, encoding="utf-8-sig")
    else:
        if not path.endswith(".xlsx"):
            path += ".xlsx"
        df.to_excel(path, index=False)
    return path


def _register_report(db: Session, batch_id: int, name: str, report_type: str,
                     file_path: str, exported_by: Optional[str] = None) -> ExportReport:
    size = None
    try:
        size = os.path.getsize(file_path)
    except OSError:
        pass
    report = ExportReport(
        batch_id=batch_id,
        report_name=name,
        report_type=report_type,
        file_path=file_path,
        file_size=size,
        exported_by=exported_by
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def export_teacher_report(db: Session, batch_id: int, fmt: str = "xlsx",
                          exported_by: Optional[str] = None) -> ExportReport:
    batch = db.query(ProcessBatch).filter(ProcessBatch.id == batch_id).first()
    name_base = f"{batch.batch_name if batch else 'batch_' + str(batch_id)}_教师复核报告"

    questions = db.query(QuestionItem).filter(QuestionItem.batch_id == batch_id).order_by(
        QuestionItem.original_row_no
    ).all()

    review_map = {}
    for r in db.query(ReviewRecord).filter(ReviewRecord.batch_id == batch_id).all():
        review_map[r.question_id] = r

    error_map = {}
    for ea in db.query(ErrorAnalysis).filter(ErrorAnalysis.batch_id == batch_id).all():
        error_map[ea.question_id] = ea

    rows = []
    for q in questions:
        r = review_map.get(q.id)
        ea = error_map.get(q.id)
        anomaly_display = r.anomaly_category.value if r else "未复核"
        grade_display = r.result_grade.value if r else "未分级"
        next_step = r.next_step if r else ""
        review_note = r.review_note if r else ""
        err = ea.overall_error if ea else None
        excessive = "是" if (ea and ea.is_excessive) else "否"
        err_detail = ea.analysis_detail if ea else ""

        rows.append({
            "原始行号": q.original_row_no,
            "题目编号": q.question_code,
            "题目名称": q.question_title or "",
            "图片名": q.image_name or "",
            "知识点": q.knowledge_point or "",
            "难度": q.difficulty or "",
            "来源备注": q.source_remark or "",
            "异常分类": anomaly_display,
            "结果分级": grade_display,
            "下一步建议": next_step,
            "复核备注": review_note,
            "KKT整体误差": round(err, 6) if err is not None else "",
            "误差是否过大": excessive,
            "误差分析说明": err_detail
        })

    df = pd.DataFrame(rows)
    path = _write_df_to_file(df, name_base, fmt)
    return _register_report(db, batch_id, name_base, "teacher_report", path, exported_by)


def export_student_report(db: Session, batch_id: int, fmt: str = "xlsx",
                          exported_by: Optional[str] = None) -> ExportReport:
    batch = db.query(ProcessBatch).filter(ProcessBatch.id == batch_id).first()
    name_base = f"{batch.batch_name if batch else 'batch_' + str(batch_id)}_学生使用报告"

    reviews = db.query(ReviewRecord).filter(ReviewRecord.batch_id == batch_id).all()
    review_map = {r.question_id: r for r in reviews}

    err_map = {}
    for ea in db.query(ErrorAnalysis).filter(ErrorAnalysis.batch_id == batch_id).all():
        err_map[ea.question_id] = ea

    questions = db.query(QuestionItem).filter(QuestionItem.batch_id == batch_id).order_by(
        QuestionItem.original_row_no
    ).all()

    rows = []
    for q in questions:
        r = review_map.get(q.id)
        ea = err_map.get(q.id)
        grade = r.result_grade if r else ResultGrade.PENDING
        is_excessive = ea.is_excessive if ea else False

        if grade == ResultGrade.USABLE and not is_excessive:
            status_flag = "直接使用"
            tip = "可直接用于练习"
        elif grade == ResultGrade.PENDING:
            status_flag = "暂缓使用"
            tip = "请等待排课老师复核确认"
        else:
            status_flag = "需找老师复核"
            tip = "该题存在问题，请联系排课老师"

        rows.append({
            "题目编号": q.question_code,
            "题目名称": q.question_title or "",
            "知识点": q.knowledge_point or "",
            "难度": q.difficulty or "",
            "使用建议": status_flag,
            "说明": tip,
            "KKT近似误差": round(ea.overall_error, 6) if ea else ""
        })

    df = pd.DataFrame(rows)
    path = _write_df_to_file(df, name_base, fmt)
    return _register_report(db, batch_id, name_base, "student_report", path, exported_by)


def export_conflicts_report(db: Session, batch_id: int, fmt: str = "xlsx",
                            exported_by: Optional[str] = None) -> ExportReport:
    batch = db.query(ProcessBatch).filter(ProcessBatch.id == batch_id).first()
    name_base = f"{batch.batch_name if batch else 'batch_' + str(batch_id)}_冲突记录"

    conflicts = db.query(ConflictRecord).filter(ConflictRecord.batch_id == batch_id).order_by(
        ConflictRecord.created_at.desc()
    ).all()

    rows = []
    for c in conflicts:
        rows.append({
            "题目编号": c.question_code,
            "冲突类型": c.conflict_type,
            "冲突字段": c.conflict_field or "",
            "题目清单值": c.question_value or "",
            "参数表值": c.param_value or "",
            "描述": c.description,
            "解决建议": c.resolution_suggestion or "",
            "是否已解决": "是" if c.is_resolved else "否"
        })

    df = pd.DataFrame(rows)
    path = _write_df_to_file(df, name_base, fmt)
    return _register_report(db, batch_id, name_base, "conflicts", path, exported_by)


def export_json_snapshot(db: Session, batch_id: int, exported_by: Optional[str] = None) -> ExportReport:
    batch = db.query(ProcessBatch).filter(ProcessBatch.id == batch_id).first()
    name_base = f"{batch.batch_name if batch else 'batch_' + str(batch_id)}_完整快照"

    data = {
        "exported_at": datetime.utcnow().isoformat(),
        "batch": {
            "id": batch.id,
            "name": batch.batch_name,
            "status": batch.status.value if batch else "",
            "remark": batch.remark
        },
        "questions": [
            {
                "id": q.id,
                "original_row_no": q.original_row_no,
                "question_code": q.question_code,
                "question_title": q.question_title,
                "image_name": q.image_name,
                "source_remark": q.source_remark,
                "difficulty": q.difficulty,
                "knowledge_point": q.knowledge_point
            }
            for q in db.query(QuestionItem).filter(QuestionItem.batch_id == batch_id).all()
        ],
        "params": [
            {
                "id": p.id,
                "original_row_no": p.original_row_no,
                "question_code": p.question_code,
                "param_key": p.param_key,
                "param_value": p.param_value,
                "source_sheet": p.source_sheet,
                "source_remark": p.source_remark
            }
            for p in db.query(ParamRecord).filter(ParamRecord.batch_id == batch_id).all()
        ],
        "reviews": [
            {
                "id": r.id,
                "question_id": r.question_id,
                "anomaly_category": r.anomaly_category.value,
                "result_grade": r.result_grade.value,
                "review_note": r.review_note,
                "next_step": r.next_step,
                "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None
            }
            for r in db.query(ReviewRecord).filter(ReviewRecord.batch_id == batch_id).all()
        ],
        "error_analyses": [
            {
                "id": ea.id,
                "question_id": ea.question_id,
                "overall_error": ea.overall_error,
                "is_excessive": ea.is_excessive,
                "analysis_detail": ea.analysis_detail
            }
            for ea in db.query(ErrorAnalysis).filter(ErrorAnalysis.batch_id == batch_id).all()
        ]
    }

    _ensure_export_dir()
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    path = os.path.join(settings.EXPORT_DIR, f"{ts}_{name_base}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return _register_report(db, batch_id, name_base, "json_snapshot", path, exported_by)


def list_export_reports(db: Session, batch_id: Optional[int] = None,
                        skip: int = 0, limit: int = 100) -> List[ExportReport]:
    query = db.query(ExportReport)
    if batch_id:
        query = query.filter(ExportReport.batch_id == batch_id)
    return query.order_by(ExportReport.created_at.desc()).offset(skip).limit(limit).all()


def get_report_file_path(report_id: int, db: Session) -> Optional[str]:
    r = db.query(ExportReport).filter(ExportReport.id == report_id).first()
    if not r:
        return None
    if os.path.exists(r.file_path):
        return r.file_path
    return None
