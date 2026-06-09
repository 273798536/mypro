from __future__ import annotations

import io
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional

import pandas as pd
from sqlalchemy.orm import Session

from . import models, schemas
from .quality_check import (
    compute_content_hash,
    detect_empty_values,
    detect_remark_mixed,
    classify_error_level,
    compute_error,
    find_duplicate,
    create_audit_log,
)


def _normalize_row(raw: Dict[str, Any]) -> Dict[str, Any]:
    mapping = {
        "题目编号": "question_id",
        "题号": "question_no",
        "题目": "question_title",
        "题目名称": "question_title",
        "矩阵": "matrix_data",
        "矩阵数据": "matrix_data",
        "精确特征值": "eigenvalue_exact",
        "理论特征值": "eigenvalue_exact",
        "近似特征值": "eigenvalue_approx",
        "计算特征值": "eigenvalue_approx",
        "误差": "error_value",
        "误差值": "error_value",
        "备注": "remark",
        "说明": "remark",
        "状态": "status",
    }
    result: Dict[str, Any] = {}
    for k, v in raw.items():
        key = mapping.get(str(k).strip(), str(k).strip())
        if v is None:
            result[key] = ""
        else:
            result[key] = str(v).strip()
    return result


def import_records_from_file(db: Session, file_content: bytes, filename: str,
                              source: str = "error_analysis",
                              operator: str = "排课老师") -> schemas.ImportResult:
    batch_no = f"BATCH-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"

    batch = models.ImportBatch(
        batch_no=batch_no,
        filename=filename,
        source=source,
        imported_by=operator,
    )
    db.add(batch)
    db.flush()

    try:
        if filename.lower().endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(file_content))
        else:
            df = pd.read_csv(io.BytesIO(file_content), encoding="utf-8-sig", na_filter=False)
    except Exception:
        try:
            df = pd.read_csv(io.BytesIO(file_content), encoding="gbk", na_filter=False)
        except Exception:
            df = pd.DataFrame()

    if df.empty:
        batch.total_count = 0
        db.commit()
        db.refresh(batch)
        return schemas.ImportResult(
            batch_no=batch_no,
            total_count=0,
            duplicate_count=0,
            new_count=0,
            updated_count=0,
            quality_issues=[],
            warnings=["文件为空或格式无法识别"],
        )

    rows: List[Dict[str, Any]] = [_normalize_row(r) for r in df.to_dict(orient="records")]
    total = len(rows)

    seen_hashes: Dict[str, models.QuestionRecord] = {}
    new_count = 0
    updated_count = 0
    duplicate_count = 0
    quality_issues_out: List[schemas.QualityIssueOut] = []

    for idx, row in enumerate(rows):
        content_hash = compute_content_hash(row)
        empty_fields = detect_empty_values(row)
        remark_mixed = detect_remark_mixed(row.get("remark", ""))

        try:
            err_val = float(row.get("error_value") or 0)
        except (ValueError, TypeError):
            err_val = compute_error(
                row.get("eigenvalue_exact", ""),
                row.get("eigenvalue_approx", ""),
            )

        error_level = classify_error_level(err_val)
        status = row.get("status", "pending") or "pending"

        primary, existing_others = find_duplicate(db, content_hash)
        is_duplicate_in_batch = content_hash in seen_hashes

        if primary:
            duplicate_count += 1
            existing = primary
            updates: Dict[str, Any] = {}
            if row.get("question_title") and not existing.question_title:
                updates["question_title"] = row["question_title"]
            if row.get("eigenvalue_exact") and not existing.eigenvalue_exact:
                updates["eigenvalue_exact"] = row["eigenvalue_exact"]
            if row.get("eigenvalue_approx"):
                updates["eigenvalue_approx"] = row["eigenvalue_approx"]
            if err_val and (not existing.error_value or abs(err_val) > abs(existing.error_value)):
                updates["error_value"] = err_val
                updates["error_level"] = error_level
            if row.get("remark") and row["remark"] != existing.remark:
                updates["remark"] = row["remark"]
                updates["remark_mixed"] = remark_mixed
            if empty_fields:
                updates["has_empty"] = True
            if error_level in ("warning", "critical") and not existing.error_level == "critical":
                updates["error_level"] = error_level

            if updates:
                for field, new_val in updates.items():
                    old_val = str(getattr(existing, field, ""))
                    if str(new_val) != old_val:
                        create_audit_log(
                            db, existing.id, field, old_val, str(new_val),
                            operator=operator, operation="update_on_import",
                            comment=f"批次{batch_no}第{idx + 1}行导入自动更新",
                        )
                        setattr(existing, field, new_val)
                updated_count += 1
            else:
                existing.has_duplicate = True

            issue_desc = f"与已有记录#{existing.id}重复，题目编号{row.get('question_id', row.get('question_no', ''))}"
            issue = models.QualityIssue(
                batch_id=batch.id,
                record_id=existing.id,
                issue_type="duplicate",
                description=issue_desc,
                field_name="content_hash",
                severity="warning",
                resolved=False,
            )
            db.add(issue)
            db.flush()
            quality_issues_out.append(schemas.QualityIssueOut.model_validate(issue))

            link = models.RecordLink(
                record_id=existing.id,
                linked_record_id=existing.id,
                link_type="reimport",
            )
            db.add(link)

        elif is_duplicate_in_batch:
            duplicate_count += 1
            orig = seen_hashes[content_hash]
            orig.has_duplicate = True
            issue = models.QualityIssue(
                batch_id=batch.id,
                record_id=orig.id,
                issue_type="duplicate",
                description=f"本批次内重复，第{idx + 1}行与已有行重复",
                field_name="content_hash",
                severity="warning",
                resolved=False,
            )
            db.add(issue)
            db.flush()
            quality_issues_out.append(schemas.QualityIssueOut.model_validate(issue))
        else:
            record = models.QuestionRecord(
                batch_id=batch.id,
                content_hash=content_hash,
                question_id=row.get("question_id", ""),
                question_no=row.get("question_no", ""),
                question_title=row.get("question_title", ""),
                matrix_data=row.get("matrix_data", ""),
                eigenvalue_exact=row.get("eigenvalue_exact", ""),
                eigenvalue_approx=row.get("eigenvalue_approx", ""),
                error_value=err_val,
                error_level=error_level,
                remark=row.get("remark", ""),
                status=status,
                constraint_pass=False,
                has_empty=bool(empty_fields),
                has_duplicate=False,
                remark_mixed=remark_mixed,
                raw_data=json.dumps(row, ensure_ascii=False),
            )
            db.add(record)
            db.flush()
            seen_hashes[content_hash] = record
            new_count += 1

            for field in empty_fields:
                issue = models.QualityIssue(
                    batch_id=batch.id,
                    record_id=record.id,
                    issue_type="empty_value",
                    description=f"字段 {field} 为空",
                    field_name=field,
                    severity="warning",
                    resolved=False,
                )
                db.add(issue)
                db.flush()
                quality_issues_out.append(schemas.QualityIssueOut.model_validate(issue))

            if remark_mixed:
                issue = models.QualityIssue(
                    batch_id=batch.id,
                    record_id=record.id,
                    issue_type="remark_mixed",
                    description="备注字段混写了状态、数字或标记，需人工确认",
                    field_name="remark",
                    severity="warning",
                    resolved=False,
                )
                db.add(issue)
                db.flush()
                quality_issues_out.append(schemas.QualityIssueOut.model_validate(issue))

            if error_level == "critical":
                issue = models.QualityIssue(
                    batch_id=batch.id,
                    record_id=record.id,
                    issue_type="large_error",
                    description=f"近似误差过大：{err_val}，超过阈值0.1，需重点复核",
                    field_name="error_value",
                    severity="critical",
                    resolved=False,
                )
                db.add(issue)
                db.flush()
                quality_issues_out.append(schemas.QualityIssueOut.model_validate(issue))
            elif error_level == "warning":
                issue = models.QualityIssue(
                    batch_id=batch.id,
                    record_id=record.id,
                    issue_type="large_error",
                    description=f"近似误差较大：{err_val}，超过阈值0.01",
                    field_name="error_value",
                    severity="warning",
                    resolved=False,
                )
                db.add(issue)
                db.flush()
                quality_issues_out.append(schemas.QualityIssueOut.model_validate(issue))

    batch.total_count = total
    batch.duplicate_count = duplicate_count
    batch.new_count = new_count
    batch.updated_count = updated_count
    batch.quality_issues = len(quality_issues_out)
    db.commit()

    return schemas.ImportResult(
        batch_no=batch_no,
        total_count=total,
        duplicate_count=duplicate_count,
        new_count=new_count,
        updated_count=updated_count,
        quality_issues=quality_issues_out,
        warnings=[],
    )


def update_record(db: Session, record_id: int, data: schemas.QuestionRecordUpdate,
                   operator: str = "排课老师") -> Optional[models.QuestionRecord]:
    record = db.query(models.QuestionRecord).filter(models.QuestionRecord.id == record_id).first()
    if not record:
        return None

    update_fields = data.model_dump(exclude_unset=True)
    update_fields.pop("operator", None)
    comment = update_fields.pop("comment", "")

    for field, new_val in update_fields.items():
        old_val = str(getattr(record, field, ""))
        if str(new_val) != old_val:
            create_audit_log(
                db, record.id, field, old_val, str(new_val),
                operator=data.operator or operator,
                operation="manual_update",
                comment=comment or f"人工修改字段 {field}",
            )
            setattr(record, field, new_val)

    if "status" in update_fields and update_fields["status"] == "passed":
        record.reviewed_by = data.operator or operator
        record.reviewed_at = datetime.now()
        record.constraint_pass = True

    record.updated_at = datetime.now()
    db.commit()
    db.refresh(record)
    return record


def get_record_audit_logs(db: Session, record_id: int) -> List[models.AuditLog]:
    return (db.query(models.AuditLog)
            .filter(models.AuditLog.record_id == record_id)
            .order_by(models.AuditLog.created_at.desc())
            .all())


def get_batch_chart_data(db: Session, batch_id: int) -> Optional[schemas.ChartDataResponse]:
    batch = db.query(models.ImportBatch).filter(models.ImportBatch.id == batch_id).first()
    if not batch:
        return None

    records = db.query(models.QuestionRecord).filter(
        (models.QuestionRecord.batch_id == batch_id) |
        (models.QuestionRecord.id.in_(
            db.query(models.RecordLink.linked_record_id).filter(
                models.RecordLink.record_id.in_(
                    db.query(models.QuestionRecord.id).filter(models.QuestionRecord.batch_id == batch_id)
                )
            )
        ))
    ).all()

    if not records:
        records = db.query(models.QuestionRecord).filter(
            models.QuestionRecord.batch_id == batch_id
        ).all()

    scatter_points = []
    for r in records:
        scatter_points.append(schemas.ChartDataPoint(
            label=r.question_no or r.question_id or f"#{r.id}",
            value=r.error_value or 0.0,
            error=r.error_value or 0.0,
            exact=r.eigenvalue_exact or "",
        ))

    error_dist = {"normal": 0, "warning": 0, "critical": 0}
    status_dist = {"pending": 0, "passed": 0, "rejected": 0, "need_review": 0}
    quality_summary = {
        "empty_value": 0,
        "duplicate": 0,
        "remark_mixed": 0,
        "large_error": 0,
    }

    for r in records:
        lvl = r.error_level or "normal"
        if lvl in error_dist:
            error_dist[lvl] += 1
        st = r.status or "pending"
        if st in status_dist:
            status_dist[st] += 1
        if r.has_empty:
            quality_summary["empty_value"] += 1
        if r.has_duplicate:
            quality_summary["duplicate"] += 1
        if r.remark_mixed:
            quality_summary["remark_mixed"] += 1
        if r.error_level in ("warning", "critical"):
            quality_summary["large_error"] += 1

    return schemas.ChartDataResponse(
        batch_no=batch.batch_no,
        scatter_points=scatter_points,
        error_distribution=error_dist,
        status_distribution=status_dist,
        quality_summary=quality_summary,
    )


def export_batch_data(db: Session, batch_id: int) -> bytes:
    records = db.query(models.QuestionRecord).filter(
        models.QuestionRecord.batch_id == batch_id
    ).all()

    batch = db.query(models.ImportBatch).filter(models.ImportBatch.id == batch_id).first()
    batch_no = batch.batch_no if batch else "unknown"

    rows = []
    for r in records:
        rows.append({
            "记录ID": r.id,
            "批次号": batch_no,
            "题目编号": r.question_id,
            "题号": r.question_no,
            "题目标题": r.question_title,
            "矩阵数据": r.matrix_data,
            "精确特征值": r.eigenvalue_exact,
            "近似特征值": r.eigenvalue_approx,
            "误差值": r.error_value,
            "误差级别": r.error_level,
            "状态": r.status,
            "约束通过": "是" if r.constraint_pass else "否",
            "含空值": "是" if r.has_empty else "否",
            "存在重复": "是" if r.has_duplicate else "否",
            "备注混写": "是" if r.remark_mixed else "否",
            "复核人": r.reviewed_by,
            "复核时间": r.reviewed_at.strftime("%Y-%m-%d %H:%M:%S") if r.reviewed_at else "",
            "备注": r.remark,
            "创建时间": r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        })

    df = pd.DataFrame(rows)
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="特征值记录")
        issues = db.query(models.QualityIssue).filter(models.QualityIssue.batch_id == batch_id).all()
        issue_rows = [{
            "记录ID": i.record_id or "",
            "问题类型": i.issue_type,
            "问题字段": i.field_name,
            "问题描述": i.description,
            "严重级别": i.severity,
            "是否已解决": "是" if i.resolved else "否",
            "发现时间": i.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        } for i in issues]
        if issue_rows:
            pd.DataFrame(issue_rows).to_excel(writer, index=False, sheet_name="质量问题")

        audit_all = []
        for r in records:
            logs = get_record_audit_logs(db, r.id)
            for log in logs:
                audit_all.append({
                    "记录ID": r.id,
                    "操作字段": log.field_name,
                    "原值": log.old_value,
                    "新值": log.new_value,
                    "操作人": log.operator,
                    "操作类型": log.operation,
                    "操作时间": log.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "说明": log.comment,
                })
        if audit_all:
            pd.DataFrame(audit_all).to_excel(writer, index=False, sheet_name="审计日志")
    return buf.getvalue()
