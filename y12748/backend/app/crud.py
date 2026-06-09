from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional, Dict, Any
from datetime import datetime
import pandas as pd
from . import models, schemas
from .utils import DataQualityChecker, SampleDataGenerator


def create_import_batch(db: Session, batch_data: schemas.ImportBatchCreate) -> models.ImportBatch:
    db_batch = models.ImportBatch(**batch_data.model_dump())
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)
    return db_batch


def get_import_batch(db: Session, batch_id: int) -> Optional[models.ImportBatch]:
    return db.query(models.ImportBatch).filter(models.ImportBatch.id == batch_id).first()


def list_import_batches(db: Session, skip: int = 0, limit: int = 100) -> List[models.ImportBatch]:
    return db.query(models.ImportBatch).order_by(models.ImportBatch.imported_at.desc()).offset(skip).limit(limit).all()


def update_batch_status(db: Session, batch_id: int, status: str) -> Optional[models.ImportBatch]:
    batch = get_import_batch(db, batch_id)
    if batch:
        batch.status = status
        db.commit()
        db.refresh(batch)
    return batch


def create_question_record(db: Session, record_data: Dict[str, Any], batch_id: Optional[int] = None,
                           flags: Optional[Dict[str, Any]] = None) -> models.QuestionRecord:
    data = record_data.copy()
    if batch_id:
        data["batch_id"] = batch_id
    if flags:
        data.update(flags)
    if "status" not in data:
        data["status"] = "pending"
    db_record = models.QuestionRecord(**data)
    db.add(db_record)
    db.flush()
    return db_record


def get_question_record(db: Session, record_id: int) -> Optional[models.QuestionRecord]:
    return db.query(models.QuestionRecord).filter(models.QuestionRecord.id == record_id).first()


def list_question_records(db: Session, batch_id: Optional[int] = None,
                          status: Optional[str] = None,
                          has_issues: Optional[bool] = None,
                          skip: int = 0, limit: int = 500) -> List[models.QuestionRecord]:
    query = db.query(models.QuestionRecord)
    if batch_id:
        query = query.filter(models.QuestionRecord.batch_id == batch_id)
    if status:
        query = query.filter(models.QuestionRecord.status == status)
    if has_issues is True:
        query = query.filter(or_(
            models.QuestionRecord.has_unit_issue == True,
            models.QuestionRecord.has_empty_value == True,
            models.QuestionRecord.has_mixed_remark == True,
            models.QuestionRecord.has_conflict == True,
            models.QuestionRecord.is_duplicate == True
        ))
    elif has_issues is False:
        query = query.filter(and_(
            models.QuestionRecord.has_unit_issue == False,
            models.QuestionRecord.has_empty_value == False,
            models.QuestionRecord.has_mixed_remark == False,
            models.QuestionRecord.has_conflict == False,
            models.QuestionRecord.is_duplicate == False
        ))
    return query.order_by(models.QuestionRecord.id).offset(skip).limit(limit).all()


def update_question_record_field(db: Session, record_id: int, field_name: str,
                                 new_value: Any, comment: Optional[str] = None,
                                 corrected_by: str = "投研助理") -> Optional[models.QuestionRecord]:
    record = get_question_record(db, record_id)
    if not record:
        return None

    old_value = getattr(record, field_name, None)
    if old_value == new_value:
        return record

    correction = models.CorrectionHistory(
        record_id=record_id,
        field_name=field_name,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        corrected_by=corrected_by,
        comment=comment
    )
    db.add(correction)

    setattr(record, field_name, new_value)
    record.updated_at = datetime.utcnow()

    if field_name == 'unit' and new_value:
        record.has_unit_issue = False
    if field_name in ['stress_level', 'temperature', 'lifetime_hours', 'question_id', 'material_name'] and new_value:
        record.has_empty_value = False

    db.commit()
    db.refresh(record)
    return record


def get_correction_history(db: Session, record_id: Optional[int] = None,
                           skip: int = 0, limit: int = 200) -> List[models.CorrectionHistory]:
    query = db.query(models.CorrectionHistory)
    if record_id:
        query = query.filter(models.CorrectionHistory.record_id == record_id)
    return query.order_by(models.CorrectionHistory.corrected_at.desc()).offset(skip).limit(limit).all()


def create_review_session(db: Session, session_data: schemas.ReviewSessionCreate) -> models.ReviewSession:
    data = session_data.model_dump()
    batch_id = data.get("batch_id")

    if batch_id:
        records = list_question_records(db, batch_id=batch_id)
        data["total_items"] = len(records)
        data["pending_items"] = len([r for r in records if r.status == "pending"])

    db_session = models.ReviewSession(**data)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


def get_review_session(db: Session, session_id: int) -> Optional[models.ReviewSession]:
    return db.query(models.ReviewSession).filter(models.ReviewSession.id == session_id).first()


def list_review_sessions(db: Session, batch_id: Optional[int] = None,
                         skip: int = 0, limit: int = 100) -> List[models.ReviewSession]:
    query = db.query(models.ReviewSession)
    if batch_id:
        query = query.filter(models.ReviewSession.batch_id == batch_id)
    return query.order_by(models.ReviewSession.created_at.desc()).offset(skip).limit(limit).all()


def start_review_session(db: Session, session_id: int) -> Optional[models.ReviewSession]:
    session = get_review_session(db, session_id)
    if session and session.status == "pending":
        session.status = "in_progress"
        session.started_at = datetime.utcnow()
        db.commit()
        db.refresh(session)
    return session


def complete_review_session(db: Session, session_id: int) -> Optional[models.ReviewSession]:
    session = get_review_session(db, session_id)
    if session:
        session.status = "completed"
        session.completed_at = datetime.utcnow()
        db.commit()
        db.refresh(session)
    return session


def get_review_items(db: Session, session_id: int) -> List[models.QuestionRecord]:
    session = get_review_session(db, session_id)
    if not session:
        return []

    batch_id = session.batch_id
    query = db.query(models.QuestionRecord).filter(models.QuestionRecord.batch_id == batch_id)

    conditions = []
    if session.include_wrong_answers:
        conditions.append(models.QuestionRecord.student_answer != models.QuestionRecord.correct_answer)
    if session.include_conflicts:
        conditions.append(models.QuestionRecord.has_conflict == True)
        conditions.append(models.QuestionRecord.has_unit_issue == True)
        conditions.append(models.QuestionRecord.has_empty_value == True)
        conditions.append(models.QuestionRecord.has_mixed_remark == True)
        conditions.append(models.QuestionRecord.is_duplicate == True)

    if conditions:
        query = query.filter(or_(*conditions))

    return query.all()


def create_review_result(db: Session, result_data: schemas.ReviewResultCreate) -> models.ReviewResult:
    data = result_data.model_dump()
    db_result = models.ReviewResult(**data)
    db.add(db_result)

    record = get_question_record(db, data["record_id"])
    if record:
        record.status = data["after_status"]
        record.updated_at = datetime.utcnow()

    session = get_review_session(db, data["session_id"])
    if session:
        session.reviewed_items += 1
        if data["after_status"] == "passed":
            session.passed_items += 1
        if data["after_status"] == "pending":
            session.pending_items += 1

    db.commit()
    db.refresh(db_result)
    return db_result


def list_review_results(db: Session, session_id: Optional[int] = None,
                        record_id: Optional[int] = None,
                        skip: int = 0, limit: int = 500) -> List[models.ReviewResult]:
    query = db.query(models.ReviewResult)
    if session_id:
        query = query.filter(models.ReviewResult.session_id == session_id)
    if record_id:
        query = query.filter(models.ReviewResult.record_id == record_id)
    return query.order_by(models.ReviewResult.reviewed_at.desc()).offset(skip).limit(limit).all()


def create_report(db: Session, report_data: schemas.ReportCreate,
                  summary: Optional[Dict[str, Any]] = None,
                  curve_data: Optional[Dict[str, Any]] = None) -> models.Report:
    data = report_data.model_dump()
    if summary:
        data["summary"] = summary
    if curve_data:
        data["curve_data"] = curve_data
    db_report = models.Report(**data)
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report


def get_report(db: Session, report_id: int) -> Optional[models.Report]:
    return db.query(models.Report).filter(models.Report.id == report_id).first()


def list_reports(db: Session, session_id: Optional[int] = None,
                 batch_id: Optional[int] = None,
                 report_type: Optional[str] = None,
                 skip: int = 0, limit: int = 100) -> List[models.Report]:
    query = db.query(models.Report)
    if session_id:
        query = query.filter(models.Report.session_id == session_id)
    if batch_id:
        query = query.filter(models.Report.batch_id == batch_id)
    if report_type:
        query = query.filter(models.Report.report_type == report_type)
    return query.order_by(models.Report.generated_at.desc()).offset(skip).limit(limit).all()


def create_reliability_curve(db: Session, curve_data: Dict[str, Any]) -> models.ReliabilityCurve:
    db_curve = models.ReliabilityCurve(**curve_data)
    db.add(db_curve)
    db.commit()
    db.refresh(db_curve)
    return db_curve


def list_reliability_curves(db: Session, batch_id: Optional[int] = None,
                            session_id: Optional[int] = None,
                            skip: int = 0, limit: int = 100) -> List[models.ReliabilityCurve]:
    query = db.query(models.ReliabilityCurve)
    if batch_id:
        query = query.filter(models.ReliabilityCurve.batch_id == batch_id)
    if session_id:
        query = query.filter(models.ReliabilityCurve.session_id == session_id)
    return query.order_by(models.ReliabilityCurve.calculated_at.desc()).offset(skip).limit(limit).all()


def find_existing_question(db: Session, question_id: str, batch_id: Optional[int] = None) -> Optional[models.QuestionRecord]:
    query = db.query(models.QuestionRecord).filter(models.QuestionRecord.question_id == question_id)
    if batch_id:
        query = query.filter(models.QuestionRecord.batch_id == batch_id)
    return query.first()


def initialize_sample_data(db: Session) -> Dict[str, Any]:
    existing_batches = list_import_batches(db, limit=1)
    if existing_batches:
        return {"initialized": False, "message": "已有数据，跳过示例初始化"}

    batch_info = SampleDataGenerator.generate_sample_batch()
    batch_schema = schemas.ImportBatchCreate(**batch_info)
    batch = create_import_batch(db, batch_schema)

    records = SampleDataGenerator.generate_question_records()
    df = SampleDataGenerator.records_to_dataframe(records)
    quality_report = DataQualityChecker.analyze(df)

    valid_count = 0
    for idx, row in df.iterrows():
        flags = DataQualityChecker.get_record_flags(quality_report.issues, int(idx))
        record_dict = row.where(pd.notnull(row), None).to_dict()
        create_question_record(db, record_dict, batch_id=batch.id, flags=flags)
        if not any(flags.values()):
            valid_count += 1

    batch.total_records = len(df)
    batch.valid_records = valid_count
    batch.invalid_records = len(df) - valid_count
    batch.status = "imported"
    db.commit()
    db.refresh(batch)

    session_info = SampleDataGenerator.generate_sample_review_session(batch.id)
    session_schema = schemas.ReviewSessionCreate(**session_info)
    session = create_review_session(db, session_schema)

    return {
        "initialized": True,
        "batch_id": batch.id,
        "session_id": session.id,
        "records_count": len(records),
        "issues_count": len(quality_report.issues)
    }


def get_system_stats(db: Session) -> Dict[str, Any]:
    total_batches = db.query(models.ImportBatch).count()
    total_records = db.query(models.QuestionRecord).count()
    total_sessions = db.query(models.ReviewSession).count()
    total_reports = db.query(models.Report).count()

    pending_records = db.query(models.QuestionRecord).filter(models.QuestionRecord.status == "pending").count()
    passed_records = db.query(models.QuestionRecord).filter(models.QuestionRecord.status == "passed").count()
    records_with_issues = db.query(models.QuestionRecord).filter(or_(
        models.QuestionRecord.has_unit_issue == True,
        models.QuestionRecord.has_empty_value == True,
        models.QuestionRecord.has_mixed_remark == True,
        models.QuestionRecord.has_conflict == True,
        models.QuestionRecord.is_duplicate == True
    )).count()

    return {
        "total_batches": total_batches,
        "total_records": total_records,
        "total_sessions": total_sessions,
        "total_reports": total_reports,
        "pending_records": pending_records,
        "passed_records": passed_records,
        "records_with_issues": records_with_issues
    }
