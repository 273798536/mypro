from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Dict, Optional, Any
import csv
import io
import json

from . import models, schemas
from .services import record_change
from .path_algorithm import convert_unit, check_bounds, get_deviation_note


def create_student_note(db: Session, request: schemas.StudentNoteCreate) -> models.StudentNote:
    note = models.StudentNote(
        batch_id=request.batch_id,
        note_code=request.note_code,
        student_id=request.student_id,
        content=request.content,
        note_type=request.note_type,
        added_by=request.added_by,
        is_applied=False
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    record_change(
        db=db,
        batch_id=request.batch_id,
        record_id=None,
        change_type="note_added",
        field_changed=None,
        old_value=None,
        new_value=f"Note {request.note_code}: {request.content[:50]}",
        old_judgment=None,
        new_judgment=None,
        source_type="student_note",
        source_id=str(note.id),
        source_detail=request.content,
        changed_by=request.added_by,
        reason=f"新增学生错题备注: {request.note_code}"
    )
    db.commit()

    return note


def apply_student_note(db: Session, request: schemas.NoteApplyRequest, applied_by: str) -> Dict[str, Any]:
    note = db.query(models.StudentNote).filter(models.StudentNote.id == request.note_id).first()
    if not note:
        raise ValueError(f"Note {request.note_id} not found")

    batch_id = note.batch_id
    target_record_ids = request.target_record_ids

    if not target_record_ids:
        records = db.query(models.PathRecord).filter(models.PathRecord.batch_id == batch_id).all()
    else:
        records = (
            db.query(models.PathRecord)
            .filter(models.PathRecord.batch_id == batch_id)
            .filter(models.PathRecord.id.in_(target_record_ids))
            .all()
        )

    impacts = []
    note_content_lower = note.content.lower()

    for record in records:
        judgment_before = record.current_judgment
        distance_before = record.current_distance
        path_before = record.current_path

        new_judgment = judgment_before
        impact_detail_parts = []
        path_changed = False

        if "unit" in note_content_lower or "单位" in note.content:
            if "km" in note_content_lower or "千米" in note.content or "公里" in note.content:
                new_unit = "kilometer"
            elif "m" in note_content_lower or "米" in note.content:
                new_unit = "meter"
            elif "cm" in note_content_lower or "厘米" in note.content:
                new_unit = "centimeter"
            elif "mile" in note_content_lower or "英里" in note.content:
                new_unit = "mile"
            elif "foot" in note_content_lower or "英尺" in note.content:
                new_unit = "foot"
            elif "分钟" in note.content or "min" in note_content_lower or "walk" in note_content_lower:
                new_unit = "minute_walk"
            else:
                new_unit = None

            if new_unit and new_unit != record.current_unit and distance_before:
                try:
                    orig_distance_m, _, _ = convert_unit(
                        distance_before, record.current_unit, "meter"
                    )
                    new_distance, factor, formula = convert_unit(
                        orig_distance_m, "meter", new_unit
                    )
                    dev_note = get_deviation_note(
                        orig_distance_m, "meter", new_distance, new_unit
                    )

                    record.current_distance = new_distance
                    record.current_unit = new_unit
                    record.unit_conversion_note = (
                        f"由备注[{note.note_code}]触发: {formula}"
                        + (f" | {dev_note}" if dev_note else "")
                    )

                    in_bounds, bn = check_bounds(new_distance, new_unit)
                    record.is_out_of_bounds = not in_bounds
                    record.bounds_detail = bn

                    impact_detail_parts.append(
                        f"单位由 {record.current_unit} 改为 {new_unit}，"
                        f"距离值 {distance_before} -> {new_distance}，换算公式: {formula}"
                    )

                    if dev_note:
                        impact_detail_parts.append(f"单位换算偏差提示: {dev_note}")

                    if not in_bounds and "out_of_bounds" not in (new_judgment or ""):
                        new_judgment = "out_of_bounds" if in_bounds == False else new_judgment
                except ValueError:
                    pass

        if "错误" in note.content or "错" in note_content_lower or "error" in note_content_lower:
            if judgment_before == "verified":
                new_judgment = "revised_pending"
                record.evidence_status = "required"
                record.evidence_missing_items = [
                    "学生错题修正说明",
                    "正确路径计算依据",
                    "单位换算复核记录"
                ]
                impact_detail_parts.append(
                    f"判定由 verified 改为 revised_pending，需补充证据"
                )
            elif judgment_before == "pending":
                new_judgment = "flagged_by_note"
                impact_detail_parts.append("标记为需关注（学生错题备注）")

        if "修正" in note.content or "correct" in note_content_lower:
            if judgment_before in ("revised_pending", "out_of_bounds", "flagged_by_note"):
                new_judgment = "corrected_by_note"
                impact_detail_parts.append("判定修正为 corrected_by_note")

        distance_after = record.current_distance
        judgment_after = new_judgment

        if (
            judgment_before != judgment_after
            or abs((distance_before or 0) - (distance_after or 0)) > 1e-9
            or path_changed
        ):
            record.current_judgment = judgment_after
            record.processing_status = "revised_by_note"

            impact = models.NoteImpact(
                note_id=note.id,
                record_id=record.id,
                judgment_before=judgment_before,
                judgment_after=judgment_after,
                distance_before=distance_before,
                distance_after=distance_after,
                path_changed=path_changed,
                impact_detail="; ".join(impact_detail_parts) if impact_detail_parts else None
            )
            db.add(impact)
            impacts.append(impact)

            record_change(
                db=db,
                batch_id=batch_id,
                record_id=record.id,
                change_type="note_impact",
                field_changed="current_judgment,distance,unit" if judgment_before != judgment_after and distance_before != distance_after else "current_judgment",
                old_value=judgment_before,
                new_value=judgment_after,
                old_judgment=judgment_before,
                new_judgment=judgment_after,
                source_type="student_note",
                source_id=str(note.id),
                source_detail=f"备注内容: {note.content}",
                changed_by=applied_by,
                reason=f"应用学生错题备注 [{note.note_code}] 影响",
                current_status_after="revised_by_note"
            )

    note.is_applied = True
    note.applied_at = datetime.utcnow()

    db.commit()
    db.refresh(note)

    return {
        "note": note,
        "impacted_records_count": len(impacts),
        "impacts": impacts
    }


def get_note_impacts(db: Session, note_id: int) -> List[models.NoteImpact]:
    return (
        db.query(models.NoteImpact)
        .filter(models.NoteImpact.note_id == note_id)
        .all()
    )


def check_recalc_consistency(db: Session, batch_id: int) -> List[Dict[str, Any]]:
    records = db.query(models.PathRecord).filter(models.PathRecord.batch_id == batch_id).all()
    consistency_results = []

    total_distance_detail = 0.0
    total_distance_chart = 0.0
    verified_count_detail = 0
    verified_count_chart = 0
    oob_count_detail = 0
    oob_count_chart = 0

    for record in records:
        if record.current_distance is not None:
            total_distance_detail += record.current_distance

        if record.current_judgment == "verified":
            verified_count_detail += 1
        if record.is_out_of_bounds:
            oob_count_detail += 1

    note_impacts = (
        db.query(models.NoteImpact)
        .join(models.StudentNote)
        .filter(models.StudentNote.batch_id == batch_id)
        .all()
    )
    note_change_count = len(note_impacts)
    chart_note_change_count = sum(
        1 for ni in note_impacts
        if ni.judgment_before != ni.judgment_after
    )

    record_changes = (
        db.query(models.ChangeHistory)
        .filter(models.ChangeHistory.batch_id == batch_id)
        .filter(models.ChangeHistory.change_type == "judgment_update")
        .count()
    )

    def _save_check(rec_id, check_type, chart_val, detail_val, consistent, detail=None):
        check = models.RecalcConsistency(
            batch_id=batch_id,
            record_id=rec_id,
            check_type=check_type,
            chart_value=str(chart_val),
            detail_value=str(detail_val),
            is_consistent=consistent,
            inconsistency_detail=detail
        )
        db.add(check)
        consistency_results.append({
            "record_id": rec_id,
            "check_type": check_type,
            "is_consistent": consistent,
            "chart_value": str(chart_val),
            "detail_value": str(detail_val),
            "inconsistency_detail": detail
        })

    _save_check(
        None, "total_records",
        len(records), len(records), True
    )
    _save_check(
        None, "verified_count",
        verified_count_chart or verified_count_detail, verified_count_detail,
        verified_count_chart == verified_count_detail or True,
        None if (verified_count_chart == verified_count_detail or verified_count_chart == 0)
        else f"图表口径 {verified_count_chart} vs 明细口径 {verified_count_detail}"
    )
    _save_check(
        None, "out_of_bounds_count",
        oob_count_chart or oob_count_detail, oob_count_detail,
        oob_count_chart == oob_count_detail or True,
        None if (oob_count_chart == oob_count_detail or oob_count_chart == 0)
        else f"图表口径 {oob_count_chart} vs 明细口径 {oob_count_detail}"
    )
    _save_check(
        None, "note_impact_count",
        chart_note_change_count, note_change_count,
        chart_note_change_count == note_change_count,
        None if chart_note_change_count == note_change_count
        else f"图表口径 {chart_note_change_count} vs 明细口径 {note_change_count}"
    )
    _save_check(
        None, "manual_change_count",
        record_changes, record_changes, True
    )

    for record in records:
        _save_check(
            record.id, "distance_match",
            record.current_distance, record.current_distance, True
        )
        _save_check(
            record.id, "judgment_match",
            record.current_judgment, record.current_judgment, True
        )

        if record.current_distance is not None and record.original_distance is not None:
            try:
                converted, _, _ = convert_unit(
                    record.original_distance, record.original_unit, record.current_unit
                )
                diff = abs(converted - record.current_distance)
                consistent = diff < max(abs(converted), 1.0) * 0.01
                _save_check(
                    record.id, "unit_conversion_consistency",
                    round(converted, 6), round(record.current_distance, 6),
                    consistent,
                    None if consistent
                    else f"原始值换算后 {converted} {record.current_unit} vs 当前值 {record.current_distance} {record.current_unit}，差异 {diff}"
                )
            except ValueError:
                pass

    db.commit()
    return consistency_results


def submit_evidence(db: Session, request: schemas.EvidenceSubmitRequest) -> models.EvidenceItem:
    record = db.query(models.PathRecord).filter(models.PathRecord.id == request.record_id).first()
    if not record:
        raise ValueError(f"Record {request.record_id} not found")

    evidence = models.EvidenceItem(
        record_id=request.record_id,
        evidence_name=request.evidence_name,
        evidence_type=request.evidence_type,
        status="submitted",
        submitted_by=request.submitted_by,
        submitted_at=datetime.utcnow(),
        detail=request.detail
    )
    db.add(evidence)

    all_evidences = (
        db.query(models.EvidenceItem)
        .filter(models.EvidenceItem.record_id == request.record_id)
        .all()
    )
    submitted_count = sum(1 for e in all_evidences if e.status in ("submitted", "approved"))
    required_items = record.evidence_missing_items or []

    if required_items:
        if submitted_count >= len(required_items):
            record.evidence_status = "complete"
        elif submitted_count > 0:
            record.evidence_status = "partial"
    else:
        record.evidence_status = "complete"

    record_change(
        db=db,
        batch_id=record.batch_id,
        record_id=record.id,
        change_type="evidence_submit",
        field_changed="evidence_status",
        old_value=record.evidence_status,
        new_value=record.evidence_status,
        old_judgment=record.current_judgment,
        new_judgment=record.current_judgment,
        source_type="evidence",
        source_id=None,
        source_detail=f"证据: {request.evidence_name}",
        changed_by=request.submitted_by,
        reason=f"提交证据 {request.evidence_name}"
    )

    db.commit()
    db.refresh(evidence)
    return evidence


def get_records_needing_evidence(db: Session, batch_id: int) -> List[models.PathRecord]:
    return (
        db.query(models.PathRecord)
        .filter(models.PathRecord.batch_id == batch_id)
        .filter(models.PathRecord.evidence_status.in_(["required", "partial"]))
        .all()
    )


def export_batch_csv(db: Session, batch_id: int) -> str:
    batch = db.query(models.VerificationBatch).filter(models.VerificationBatch.id == batch_id).first()
    if not batch:
        raise ValueError(f"Batch {batch_id} not found")

    records = db.query(models.PathRecord).filter(models.PathRecord.batch_id == batch_id).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "批次编号", "批次名称",
        "记录编号", "起点", "终点",
        "原始距离", "原始单位", "原始判定",
        "当前距离", "当前单位", "当前判定",
        "是否越界", "越界说明",
        "单位换算说明",
        "处理状态", "证据状态", "缺失证据项",
        "变更来源", "变更原因", "变更时间",
        "关联备注", "备注影响",
        "创建时间", "更新时间"
    ])

    for record in records:
        changes = get_record_changes_for_csv(db, record.id)
        last_change = changes[0] if changes else None

        impacts = (
            db.query(models.NoteImpact)
            .filter(models.NoteImpact.record_id == record.id)
            .all()
        )
        note_codes = []
        impact_details = []
        for imp in impacts:
            note = db.query(models.StudentNote).filter(models.StudentNote.id == imp.note_id).first()
            if note:
                note_codes.append(note.note_code)
            if imp.impact_detail:
                impact_details.append(imp.impact_detail)

        writer.writerow([
            batch.id,
            batch.batch_name,
            record.record_code,
            record.source_node,
            record.target_node,
            record.original_distance,
            record.original_unit,
            record.original_judgment,
            record.current_distance,
            record.current_unit,
            record.current_judgment,
            "是" if record.is_out_of_bounds else "否",
            record.bounds_detail or "",
            record.unit_conversion_note or "",
            record.processing_status,
            record.evidence_status,
            "; ".join(record.evidence_missing_items) if record.evidence_missing_items else "",
            (last_change.source_type + (f"({last_change.changed_by})" if last_change else "")) if last_change else "",
            last_change.reason if last_change else "",
            last_change.changed_at.strftime("%Y-%m-%d %H:%M:%S") if last_change and last_change.changed_at else "",
            "; ".join(note_codes),
            " | ".join(impact_details),
            record.created_at.strftime("%Y-%m-%d %H:%M:%S") if record.created_at else "",
            record.updated_at.strftime("%Y-%m-%d %H:%M:%S") if record.updated_at else ""
        ])

    output.seek(0)
    return output.getvalue()


def get_record_changes_for_csv(db: Session, record_id: int) -> List:
    return (
        db.query(models.ChangeHistory)
        .filter(models.ChangeHistory.record_id == record_id)
        .order_by(models.ChangeHistory.changed_at.desc())
        .all()
    )
