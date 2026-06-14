from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Dict, Optional, Any
import csv
import io
import json
import re

from . import models, schemas
from .services import record_change
from .path_algorithm import (
    convert_unit,
    check_bounds,
    get_deviation_note,
    build_graph,
    find_shortest_path,
    detect_outlier_edges,
    REASONABLE_BOUNDS
)


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


_UNIT_KEYWORD_MAP = [
    ("kilometer", ["km", "千米", "公里"]),
    ("meter", ["m", "米"]),
    ("centimeter", ["cm", "厘米"]),
    ("millimeter", ["mm", "毫米"]),
    ("mile", ["mile", "英里"]),
    ("foot", ["foot", "feet", "ft", "英尺"]),
    ("minute_walk", ["分钟", "min", "walk", "步行"]),
]


def _parse_unit_from_text(text: str, default_unit: Optional[str] = None) -> Optional[str]:
    t = text.lower()
    for unit, keys in _UNIT_KEYWORD_MAP:
        for k in keys:
            if k in t or k in text:
                return unit
    return default_unit


def _parse_edge_overrides(content: str) -> List[Dict[str, Any]]:
    overrides = []
    pat_arrow = re.compile(
        r"(?P<src>[A-Za-z0-9_\u4e00-\u9fff]+)\s*(?:->|→|→|到|至|~|—|-{1,2})\s*"
        r"(?P<dst>[A-Za-z0-9_\u4e00-\u9fff]+)"
        r"[^\d\-]*?"
        r"(?P<val>\d+(?:\.\d+)?)"
    )
    for m in pat_arrow.finditer(content):
        src = m.group("src").strip()
        dst = m.group("dst").strip()
        try:
            val = float(m.group("val"))
        except ValueError:
            continue
        after = content[m.end():m.end() + 40]
        before = content[max(0, m.start() - 20):m.start()]
        unit = _parse_unit_from_text(before + after) or _parse_unit_from_text(m.group(0))
        overrides.append({
            "source": src,
            "target": dst,
            "weight": val,
            "unit": unit or "meter",
            "matched_text": m.group(0)
        })
    return overrides


def apply_student_note(db: Session, request: schemas.NoteApplyRequest, applied_by: str) -> Dict[str, Any]:
    note = db.query(models.StudentNote).filter(models.StudentNote.id == request.note_id).first()
    if not note:
        raise ValueError(f"Note {request.note_id} not found")

    batch_id = note.batch_id
    batch = db.query(models.VerificationBatch).filter(models.VerificationBatch.id == batch_id).first()

    target_record_ids = request.target_record_ids
    records_q = db.query(models.PathRecord).filter(models.PathRecord.batch_id == batch_id)
    if target_record_ids:
        records_q = records_q.filter(models.PathRecord.id.in_(target_record_ids))
    records = records_q.all()

    note_content_lower = note.content.lower()
    edge_overrides = _parse_edge_overrides(note.content)
    graph_rebuilt = False
    new_graph = None
    new_graph_info = None
    recalc_trigger_parts = []

    if edge_overrides:
        nodes = list({
            nid
            for r in records
            for nid in (r.source_node, r.target_node)
        })
        if batch and hasattr(batch, "graph_snapshot") and batch.graph_snapshot:
            try:
                snap = json.loads(batch.graph_snapshot) if isinstance(batch.graph_snapshot, str) else batch.graph_snapshot
            except Exception:
                snap = None
        else:
            snap = None

        if snap and "edges" in snap:
            existing_edges = list(snap["edges"])
            existing_nodes = list(snap.get("nodes") or [{"id": n} for n in nodes])
        else:
            existing_edges = []
            existing_nodes = [{"id": n} for n in nodes]

        override_map = {}
        for ov in edge_overrides:
            key = (ov["source"], ov["target"])
            override_map[key] = {
                "weight": ov["weight"],
                "unit": ov["unit"],
                "attributes": {"note_override": True, "note_code": note.note_code}
            }
            recalc_trigger_parts.append(
                f"边 {ov['source']}->{ov['target']} 修正为 {ov['weight']} {ov['unit']}（备注匹配: {ov['matched_text']}）"
            )

        merged_edges = []
        seen = set()
        for e in existing_edges:
            key = (e.get("source"), e.get("target"))
            if key in override_map:
                merged_edges.append({
                    "source": e.get("source"),
                    "target": e.get("target"),
                    **override_map[key]
                })
                seen.add(key)
            else:
                merged_edges.append(dict(e))
        for key, val in override_map.items():
            if key not in seen:
                merged_edges.append({
                    "source": key[0],
                    "target": key[1],
                    **val
                })

        try:
            target_unit = "meter"
            new_graph, new_graph_info = build_graph(existing_nodes, merged_edges, target_unit)
            graph_rebuilt = True
        except Exception as e:
            recalc_trigger_parts.append(f"重建图失败: {e}")

    impacts = []

    for record in records:
        judgment_before = record.current_judgment
        distance_before = record.current_distance
        path_before = list(record.current_path or [])
        unit_before = record.current_unit
        distance_before_meter = None
        if distance_before is not None:
            try:
                distance_before_meter, _, _ = convert_unit(distance_before, unit_before or "meter", "meter")
            except ValueError:
                distance_before_meter = None

        new_judgment = judgment_before
        impact_detail_parts = list(recalc_trigger_parts)
        path_changed = False
        distance_changed = False
        unit_changed = False

        if graph_rebuilt and new_graph is not None:
            try:
                pr = find_shortest_path(new_graph, record.source_node, record.target_node)
                new_path = pr.get("path")
                new_distance_m = pr.get("distance")
                new_judgment_calc = judgment_before
                if not pr.get("found"):
                    new_judgment_calc = "no_path"
                elif new_distance_m is not None:
                    _in_b, _ = check_bounds(new_distance_m, "meter")
                    new_judgment_calc = "out_of_bounds" if not _in_b else "verified"

                if new_path != path_before:
                    path_changed = True
                    record.current_path = new_path
                    impact_detail_parts.append(
                        f"路径变更: {'->'.join(path_before or [])} -> {'->'.join(new_path or [])}"
                    )

                dist_diff = (
                    abs((new_distance_m or 0) - (distance_before_meter or 0)) > 1e-9
                    if new_distance_m is not None or distance_before_meter is not None
                    else False
                )
                if dist_diff or new_judgment_calc != judgment_before:
                    distance_changed = True
                    record.original_distance = record.original_distance if record.original_distance else distance_before
                    try:
                        display_dist, display_factor, display_formula = convert_unit(
                            new_distance_m, "meter", unit_before or "meter"
                        )
                    except ValueError:
                        display_dist = new_distance_m
                        display_formula = None
                    record.current_distance = display_dist
                    record.original_judgment = record.original_judgment or judgment_before
                    new_judgment = new_judgment_calc

                    try:
                        _ib, _bd = check_bounds(display_dist, unit_before or "meter")
                    except ValueError:
                        _ib, _bd = (True, None)
                    record.is_out_of_bounds = not _ib
                    record.bounds_detail = _bd

                    if new_judgment_calc == "no_path" and not record.is_out_of_bounds:
                        pass

                    impact_detail_parts.append(
                        f"距离重算（统一到米）: {distance_before_meter}m -> {new_distance_m}m；"
                        f"显示距离: {distance_before}{unit_before} -> {display_dist}{unit_before}"
                        + (f"；换算: {display_formula}" if display_formula else "")
                    )
                    if new_judgment_calc != judgment_before:
                        impact_detail_parts.append(
                            f"判定由 {judgment_before} 改为 {new_judgment_calc}（重算后依据）"
                        )
            except Exception as e:
                impact_detail_parts.append(f"该记录重算路径失败: {e}")

        if not graph_rebuilt:
            forced_unit = None
            if "unit" in note_content_lower or "单位" in note.content:
                forced_unit = _parse_unit_from_text(note.content, default_unit=None)

            if forced_unit and forced_unit != (unit_before or "meter") and distance_before_meter is not None:
                try:
                    new_distance, factor, formula = convert_unit(
                        distance_before_meter, "meter", forced_unit
                    )
                    dev_note = get_deviation_note(
                        distance_before_meter, "meter", new_distance, forced_unit
                    )

                    record.current_distance = new_distance
                    record.current_unit = forced_unit
                    record.unit_conversion_note = (
                        f"由备注[{note.note_code}]触发: {formula}"
                        + (f" | {dev_note}" if dev_note else "")
                    )

                    in_bounds, bn = check_bounds(new_distance, forced_unit)
                    record.is_out_of_bounds = not in_bounds
                    record.bounds_detail = bn

                    impact_detail_parts.append(
                        f"单位换算: {unit_before or 'meter'} -> {forced_unit}，"
                        f"距离 {distance_before} -> {new_distance}，公式: {formula}"
                    )
                    if dev_note:
                        impact_detail_parts.append(f"单位换算偏差提示: {dev_note}")
                    if not in_bounds:
                        new_judgment = "out_of_bounds"
                        impact_detail_parts.append("越界: 判定更新为 out_of_bounds")
                    unit_changed = True
                    distance_changed = True
                except ValueError as e:
                    impact_detail_parts.append(f"单位换算失败: {e}")

        has_error_keyword = (
            "错误" in note.content
            or "错" in note_content_lower
            or "error" in note_content_lower
        )
        if has_error_keyword and not graph_rebuilt:
            if judgment_before == "verified":
                new_judgment = "revised_pending"
                record.evidence_status = "required"
                record.evidence_missing_items = [
                    "学生错题修正说明",
                    "正确路径计算依据",
                    "单位换算复核记录"
                ]
                impact_detail_parts.append("判定由 verified 改为 revised_pending，需补充证据")
            elif judgment_before == "pending":
                new_judgment = "flagged_by_note"
                impact_detail_parts.append("标记为需关注（学生错题备注）")

        has_correct_keyword = (
            "修正" in note.content or "correct" in note_content_lower
        )
        if has_correct_keyword and not graph_rebuilt:
            if judgment_before in ("revised_pending", "out_of_bounds", "flagged_by_note"):
                if graph_rebuilt:
                    pass
                else:
                    new_judgment = "corrected_by_note"
                    impact_detail_parts.append("判定标记为 corrected_by_note")

        distance_after = record.current_distance
        unit_after = record.current_unit
        judgment_after = new_judgment
        path_after = record.current_path

        any_change = (
            judgment_before != judgment_after
            or abs((distance_before or 0) - (distance_after or 0)) > 1e-9
            or (unit_before != unit_after)
            or path_changed
        )

        if any_change:
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

            field_list = []
            if judgment_before != judgment_after:
                field_list.append("current_judgment")
            if abs((distance_before or 0) - (distance_after or 0)) > 1e-9:
                field_list.append("current_distance")
            if unit_before != unit_after:
                field_list.append("current_unit")
            if path_changed:
                field_list.append("current_path")
            fields_changed = ",".join(field_list) or "current_judgment"

            record_change(
                db=db,
                batch_id=batch_id,
                record_id=record.id,
                change_type="note_impact",
                field_changed=fields_changed,
                old_value=judgment_before,
                new_value=judgment_after,
                old_judgment=judgment_before,
                new_judgment=judgment_after,
                source_type="student_note",
                source_id=str(note.id),
                source_detail=(
                    f"备注内容: {note.content}"
                    f"{' | 重建图: ' + '; '.join(recalc_trigger_parts) if recalc_trigger_parts else ''}"
                ),
                changed_by=applied_by,
                reason=f"应用学生错题备注 [{note.note_code}] 影响",
                current_status_after="revised_by_note"
            )

    note.is_applied = True
    note.applied_at = datetime.utcnow()
    if recalc_trigger_parts:
        note.apply_summary = "; ".join(recalc_trigger_parts)
    else:
        note.apply_summary = f"基于关键词对 {len(records)} 条记录执行标注处理"

    db.commit()
    db.refresh(note)

    return {
        "note": note,
        "graph_rebuilt": graph_rebuilt,
        "edge_overrides": edge_overrides,
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


def get_record_changes_for_csv(db: Session, record_id: int) -> List[models.ChangeHistory]:
    return (
        db.query(models.ChangeHistory)
        .filter(models.ChangeHistory.record_id == record_id)
        .order_by(models.ChangeHistory.changed_at.desc())
        .all()
    )


def export_batch_csv(db: Session, batch_id: int) -> bytes:
    batch = db.query(models.VerificationBatch).filter(models.VerificationBatch.id == batch_id).first()
    if not batch:
        raise ValueError(f"Batch {batch_id} not found")

    records = db.query(models.PathRecord).filter(models.PathRecord.batch_id == batch_id).order_by(
        models.PathRecord.record_code.asc()
    ).all()

    batch_oob_edges = (
        db.query(models.ExtrapolationWarning)
        .filter(models.ExtrapolationWarning.batch_id == batch_id)
        .filter(models.ExtrapolationWarning.record_id.is_(None))
        .all()
    )
    batch_edge_warn_summary = "; ".join(
        f"[{w.warning_type}] {w.warning_detail} (raw={w.raw_value})"
        for w in batch_oob_edges
    )

    output = io.StringIO()
    writer = csv.writer(output, delimiter=",", quoting=csv.QUOTE_ALL, lineterminator="\r\n")

    writer.writerow([
        "批次编号", "批次名称", "批次边级越界警告",
        "记录编号", "起点", "终点", "当前路径(节点序列)",
        "原始距离", "原始单位", "原始判定",
        "当前距离", "当前单位", "当前判定",
        "是否越界", "越界说明",
        "单位换算说明",
        "处理状态", "证据状态", "缺失证据项",
        "最近变更来源", "最近变更操作人", "最近变更原因", "最近变更时间",
        "变更次数",
        "关联备注编码", "备注影响明细",
        "创建时间", "更新时间"
    ])

    for record in records:
        changes = get_record_changes_for_csv(db, record.id)
        last_change = changes[0] if changes else None
        change_count = len(changes)

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
                impact_details.append(
                    f"[判定 {imp.judgment_before}->{imp.judgment_after}]"
                    f"[距离 {imp.distance_before}->{imp.distance_after}]"
                    f"[路径变更 {'是' if imp.path_changed else '否'}] "
                    + imp.impact_detail
                )

        path_str = "->".join(record.current_path) if record.current_path else (
            "->".join(record.original_path) if record.original_path else ""
        )

        def _fmt_dt(d):
            if not d:
                return ""
            try:
                return d.strftime("%Y-%m-%d %H:%M:%S")
            except Exception:
                return str(d)

        writer.writerow([
            batch.id,
            batch.batch_name,
            batch_edge_warn_summary,
            record.record_code,
            record.source_node,
            record.target_node,
            path_str,
            record.original_distance,
            record.original_unit or "",
            record.original_judgment or "",
            record.current_distance,
            record.current_unit or "",
            record.current_judgment or "",
            "是" if record.is_out_of_bounds else "否",
            record.bounds_detail or "",
            record.unit_conversion_note or "",
            record.processing_status or "",
            record.evidence_status or "",
            "; ".join(record.evidence_missing_items) if record.evidence_missing_items else "",
            last_change.source_type if last_change else "",
            last_change.changed_by if last_change else "",
            last_change.reason if last_change else "",
            _fmt_dt(last_change.changed_at) if last_change else "",
            change_count,
            "; ".join(note_codes),
            " || ".join(impact_details),
            _fmt_dt(record.created_at),
            _fmt_dt(record.updated_at),
        ])

    csv_str = output.getvalue()
    csv_bytes = csv_str.encode("utf-8")
    bom = b"\xef\xbb\xbf"
    return bom + csv_bytes
