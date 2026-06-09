from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from typing import List, Optional, Dict, Any
import uuid
import json

from . import models, schemas


BATCH_STATUS_FLOW = ["imported", "reviewing", "reviewed", "reported", "archived"]
RECORD_STATUS_FLOW = ["pending", "reviewing", "fixed", "confirmed", "rejected"]


def _generate_batch_no() -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    suffix = uuid.uuid4().hex[:6].upper()
    return f"DS-{timestamp}-{suffix}"


def _detect_sign(value: Optional[float]) -> Optional[str]:
    if value is None:
        return None
    if value > 0:
        return "+"
    elif value < 0:
        return "-"
    else:
        return "0"


def _detect_sign_change(
    prev_first_sign: Optional[str],
    curr_first_sign: Optional[str],
    prev_second_sign: Optional[str],
    curr_second_sign: Optional[str],
) -> Optional[str]:
    changes = []
    if prev_first_sign and curr_first_sign and prev_first_sign != curr_first_sign:
        changes.append(f"一阶导{prev_first_sign}→{curr_first_sign}")
    if prev_second_sign and curr_second_sign and prev_second_sign != curr_second_sign:
        changes.append(f"二阶导{prev_second_sign}→{curr_second_sign}")
    return "；".join(changes) if changes else None


def _detect_anomalies(record_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    anomalies = []
    if not record_data.get("unit") or str(record_data.get("unit", "")).strip() == "":
        anomalies.append({
            "type": "unit_missing",
            "detail": f"指标「{record_data.get('indicator_name', '未知')}」缺少计量单位",
            "severity": "high"
        })
    if record_data.get("value") is None:
        anomalies.append({
            "type": "value_missing",
            "detail": f"指标「{record_data.get('indicator_name', '未知')}」缺少数值",
            "severity": "medium"
        })
    if record_data.get("first_derivative") is not None:
        first_sign = _detect_sign(record_data.get("first_derivative"))
        if first_sign == "0" and record_data.get("second_derivative") is None:
            anomalies.append({
                "type": "derivative_incomplete",
                "detail": f"指标「{record_data.get('indicator_name', '未知')}」一阶导为0但缺少二阶导数据",
                "severity": "low"
            })
    return anomalies


def create_batch(db: Session, batch_in: schemas.BatchCreate) -> models.Batch:
    batch_no = _generate_batch_no()
    db_batch = models.Batch(
        batch_no=batch_no,
        source_file=batch_in.source_file,
        imported_by=batch_in.imported_by,
        remark=batch_in.remark,
        status="imported"
    )
    db.add(db_batch)
    db.flush()
    db_transition = models.StatusTransition(
        batch_id=db_batch.id,
        from_status=None,
        to_status="imported",
        operator=batch_in.imported_by,
        comment="批次创建，数据已导入"
    )
    db.add(db_transition)
    db.commit()
    db.refresh(db_batch)
    return db_batch


def import_records(
    db: Session,
    batch_id: int,
    records_data: List[Dict[str, Any]]
) -> schemas.ImportResult:
    db_batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not db_batch:
        raise ValueError(f"批次 {batch_id} 不存在")

    created_records = []
    all_anomalies = []

    for idx, row_data in enumerate(records_data):
        row_no = row_data.get("row_no", idx + 1)
        indicator_name = str(row_data.get("indicator_name", "")).strip()
        if not indicator_name:
            continue

        first_deriv = row_data.get("first_derivative")
        second_deriv = row_data.get("second_derivative")
        first_sign = _detect_sign(first_deriv) if first_deriv is not None else row_data.get("first_derivative_sign")
        second_sign = _detect_sign(second_deriv) if second_deriv is not None else row_data.get("second_derivative_sign")

        prev_first = row_data.get("prev_first_derivative_sign")
        prev_second = row_data.get("prev_second_derivative_sign")
        sign_change = _detect_sign_change(prev_first, first_sign, prev_second, second_sign)

        record_dict = {
            "indicator_name": indicator_name,
            "indicator_code": row_data.get("indicator_code"),
            "period": row_data.get("period"),
            "value": row_data.get("value"),
            "unit": row_data.get("unit"),
            "first_derivative": first_deriv,
            "first_derivative_sign": first_sign,
            "second_derivative": second_deriv,
            "second_derivative_sign": second_sign,
            "sign_change_type": sign_change or row_data.get("sign_change_type"),
        }

        anomalies = _detect_anomalies(record_dict)
        is_anomaly = len(anomalies) > 0
        anomaly_type = anomalies[0]["type"] if anomalies else None
        anomaly_detail = "；".join([a["detail"] for a in anomalies]) if anomalies else None

        db_record = models.DerivativeRecord(
            batch_id=batch_id,
            row_no=row_no,
            **record_dict,
            is_anomaly=is_anomaly,
            anomaly_type=anomaly_type,
            anomaly_detail=anomaly_detail,
            status="pending",
            raw_data=row_data
        )
        db.add(db_record)
        db.flush()
        created_records.append(db_record)

        if is_anomaly:
            for a in anomalies:
                all_anomalies.append({
                    "record_id": db_record.id,
                    "row_no": row_no,
                    "indicator_name": indicator_name,
                    **a
                })

    db_batch.total_records = len(created_records)
    db_batch.anomaly_count = len([r for r in created_records if r.is_anomaly])
    db.commit()
    db.refresh(db_batch)

    return schemas.ImportResult(
        batch_no=db_batch.batch_no,
        batch_id=db_batch.id,
        total_records=db_batch.total_records,
        anomaly_count=db_batch.anomaly_count,
        anomalies=all_anomalies
    )


def get_batch(db: Session, batch_id: int) -> Optional[models.Batch]:
    return db.query(models.Batch).filter(models.Batch.id == batch_id).first()


def get_batch_by_no(db: Session, batch_no: str) -> Optional[models.Batch]:
    return db.query(models.Batch).filter(models.Batch.batch_no == batch_no).first()


def list_batches(db: Session, skip: int = 0, limit: int = 100) -> List[models.Batch]:
    return db.query(models.Batch).order_by(desc(models.Batch.imported_at)).offset(skip).limit(limit).all()


def list_records(
    db: Session,
    batch_id: Optional[int] = None,
    only_anomaly: bool = False,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[models.DerivativeRecord]:
    query = db.query(models.DerivativeRecord)
    if batch_id:
        query = query.filter(models.DerivativeRecord.batch_id == batch_id)
    if only_anomaly:
        query = query.filter(models.DerivativeRecord.is_anomaly == True)
    if status:
        query = query.filter(models.DerivativeRecord.status == status)
    return query.order_by(models.DerivativeRecord.row_no).offset(skip).limit(limit).all()


def get_record(db: Session, record_id: int) -> Optional[models.DerivativeRecord]:
    return db.query(models.DerivativeRecord).filter(models.DerivativeRecord.id == record_id).first()


def update_batch_status(
    db: Session,
    batch_id: int,
    status_update: schemas.BatchStatusUpdate
) -> Optional[models.Batch]:
    db_batch = get_batch(db, batch_id)
    if not db_batch:
        return None

    old_status = db_batch.status
    db_batch.status = status_update.new_status

    db_transition = models.StatusTransition(
        batch_id=batch_id,
        from_status=old_status,
        to_status=status_update.new_status,
        operator=status_update.operator,
        comment=status_update.comment
    )
    db.add(db_transition)
    db.commit()
    db.refresh(db_batch)
    return db_batch


def review_record(
    db: Session,
    record_id: int,
    review: schemas.RecordReview
) -> Optional[models.DerivativeRecord]:
    db_record = get_record(db, record_id)
    if not db_record:
        return None

    before_status = db_record.status
    field_changes = {}

    if review.unit is not None:
        old_unit = db_record.unit
        db_record.unit = review.unit
        field_changes["unit"] = {"before": old_unit, "after": review.unit}

    if review.value is not None:
        old_value = db_record.value
        db_record.value = review.value
        field_changes["value"] = {"before": old_value, "after": review.value}

    action = review.action
    if action == "confirm":
        db_record.status = "confirmed"
    elif action == "reject":
        db_record.status = "rejected"
    elif action == "review":
        db_record.status = "reviewing"
    elif action == "fix":
        db_record.status = "fixed"
        if db_record.is_anomaly and field_changes:
            remaining_anomalies = _detect_anomalies({
                "indicator_name": db_record.indicator_name,
                "unit": db_record.unit,
                "value": db_record.value,
                "first_derivative": db_record.first_derivative,
                "second_derivative": db_record.second_derivative,
            })
            if not remaining_anomalies:
                db_record.is_anomaly = False
                db_record.anomaly_type = None
                db_record.anomaly_detail = None
            else:
                db_record.anomaly_detail = "；".join([a["detail"] for a in remaining_anomalies])

    after_status = db_record.status

    db_log = models.ReviewLog(
        record_id=record_id,
        reviewer=review.reviewer,
        action=action,
        comment=review.comment,
        before_status=before_status,
        after_status=after_status,
        field_changes=field_changes if field_changes else None
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_record)
    return db_record


def fix_record(
    db: Session,
    record_id: int,
    fix: schemas.RecordFix
) -> Optional[models.DerivativeRecord]:
    db_record = get_record(db, record_id)
    if not db_record:
        return None

    before_status = db_record.status
    field_changes = {}

    if fix.unit is not None and fix.unit != db_record.unit:
        field_changes["unit"] = {"before": db_record.unit, "after": fix.unit}
        db_record.unit = fix.unit

    if fix.value is not None and fix.value != db_record.value:
        field_changes["value"] = {"before": db_record.value, "after": fix.value}
        db_record.value = fix.value

    if fix.indicator_code is not None and fix.indicator_code != db_record.indicator_code:
        field_changes["indicator_code"] = {"before": db_record.indicator_code, "after": fix.indicator_code}
        db_record.indicator_code = fix.indicator_code

    if field_changes:
        remaining_anomalies = _detect_anomalies({
            "indicator_name": db_record.indicator_name,
            "unit": db_record.unit,
            "value": db_record.value,
            "first_derivative": db_record.first_derivative,
            "second_derivative": db_record.second_derivative,
        })
        if not remaining_anomalies:
            db_record.is_anomaly = False
            db_record.anomaly_type = None
            db_record.anomaly_detail = None
        else:
            db_record.anomaly_detail = "；".join([a["detail"] for a in remaining_anomalies])

        db_record.status = "fixed"

        db_log = models.ReviewLog(
            record_id=record_id,
            reviewer=fix.reviewer,
            action="fix",
            comment=fix.comment,
            before_status=before_status,
            after_status=db_record.status,
            field_changes=field_changes
        )
        db.add(db_log)
        db.commit()
        db.refresh(db_record)

    return db_record


def trace_record(db: Session, record_id: int) -> Optional[schemas.TraceResult]:
    db_record = get_record(db, record_id)
    if not db_record:
        return None

    db_batch = get_batch(db, db_record.batch_id)
    if not db_batch:
        return None

    status_transitions = db.query(models.StatusTransition)\
        .filter(models.StatusTransition.batch_id == db_batch.id)\
        .order_by(models.StatusTransition.transitioned_at)\
        .all()

    question_list = []
    if db_record.is_anomaly:
        if db_record.anomaly_type == "unit_missing":
            question_list.append({
                "id": f"Q-{record_id}-1",
                "question": f"指标「{db_record.indicator_name}」缺失单位，原始来源是哪个口径？",
                "source": "异常自动识别",
                "related_field": "unit"
            })
        if db_record.anomaly_type == "value_missing":
            question_list.append({
                "id": f"Q-{record_id}-2",
                "question": f"指标「{db_record.indicator_name}」缺失数值，请核对原始数据源",
                "source": "异常自动识别",
                "related_field": "value"
            })
        if db_record.sign_change_type:
            question_list.append({
                "id": f"Q-{record_id}-3",
                "question": f"指标「{db_record.indicator_name}」出现导数符号变化({db_record.sign_change_type})，请说明业务原因",
                "source": "导数符号变化检测",
                "related_field": "sign_change_type"
            })

    handling_opinions = []
    for log in db_record.review_logs:
        opinion_text = log.comment or ""
        if log.action == "fix":
            if log.field_changes:
                changes = []
                for field, change in log.field_changes.items():
                    changes.append(f"{field}: {change.get('before')} → {change.get('after')}")
                opinion_text = f"修正了 {', '.join(changes)}。{opinion_text}".strip()
        elif log.action == "confirm":
            opinion_text = f"确认无误。{opinion_text}".strip()
        elif log.action == "reject":
            opinion_text = f"驳回。{opinion_text}".strip()

        handling_opinions.append({
            "id": log.id,
            "reviewer": log.reviewer,
            "action": log.action,
            "opinion": opinion_text,
            "time": log.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })

    return schemas.TraceResult(
        record=schemas.DerivativeRecordDetail.model_validate(db_record),
        batch=schemas.BatchOut.model_validate(db_batch),
        status_transitions=[schemas.StatusTransitionOut.model_validate(t) for t in status_transitions],
        question_list=question_list,
        handling_opinions=handling_opinions
    )


def compare_history(db: Session, batch_ids: Optional[List[int]] = None, limit: int = 5) -> schemas.HistoryCompareResult:
    if batch_ids:
        batches = db.query(models.Batch).filter(models.Batch.id.in_(batch_ids)).all()
    else:
        batches = db.query(models.Batch).order_by(desc(models.Batch.imported_at)).limit(limit).all()

    batch_items = []
    all_indicator_names = set()
    batch_indicators = {}

    for batch in batches:
        records = db.query(models.DerivativeRecord).filter(models.DerivativeRecord.batch_id == batch.id).all()
        sign_change_summary = {}
        indicators_in_batch = {}

        for r in records:
            all_indicator_names.add(r.indicator_name)
            indicators_in_batch[r.indicator_name] = r
            if r.sign_change_type:
                sign_change_summary[r.sign_change_type] = sign_change_summary.get(r.sign_change_type, 0) + 1

        batch_indicators[batch.id] = indicators_in_batch
        batch_items.append(schemas.HistoryCompareItem(
            batch_no=batch.batch_no,
            imported_at=batch.imported_at,
            total_records=batch.total_records,
            anomaly_count=batch.anomaly_count,
            status=batch.status,
            sign_change_summary=sign_change_summary
        ))

    common_indicators = sorted(all_indicator_names)

    comparison_table = []
    for indicator in common_indicators:
        row = {"indicator_name": indicator}
        for batch in batches:
            r = batch_indicators.get(batch.id, {}).get(indicator)
            if r:
                row[f"{batch.batch_no}_value"] = r.value
                row[f"{batch.batch_no}_unit"] = r.unit
                row[f"{batch.batch_no}_sign"] = r.first_derivative_sign
                row[f"{batch.batch_no}_change"] = r.sign_change_type
                row[f"{batch.batch_no}_anomaly"] = r.is_anomaly
            else:
                row[f"{batch.batch_no}_value"] = None
                row[f"{batch.batch_no}_unit"] = None
                row[f"{batch.batch_no}_sign"] = None
                row[f"{batch.batch_no}_change"] = None
                row[f"{batch.batch_no}_anomaly"] = None
        comparison_table.append(row)

    return schemas.HistoryCompareResult(
        batches=batch_items,
        common_indicators=common_indicators,
        comparison_table=comparison_table
    )


def get_status_transitions(db: Session, batch_id: int) -> List[models.StatusTransition]:
    return db.query(models.StatusTransition)\
        .filter(models.StatusTransition.batch_id == batch_id)\
        .order_by(models.StatusTransition.transitioned_at)\
        .all()


def get_review_logs(db: Session, record_id: int) -> List[models.ReviewLog]:
    return db.query(models.ReviewLog)\
        .filter(models.ReviewLog.record_id == record_id)\
        .order_by(models.ReviewLog.created_at)\
        .all()
