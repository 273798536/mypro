from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Dict, Optional, Any

from . import models, schemas
from .path_algorithm import (
    build_graph, find_shortest_path, convert_unit,
    check_bounds, get_deviation_note, detect_outlier_edges, parse_numeric_value
)


def record_change(
    db: Session,
    batch_id: Optional[int],
    record_id: Optional[int],
    change_type: str,
    field_changed: Optional[str],
    old_value: Optional[str],
    new_value: Optional[str],
    old_judgment: Optional[str],
    new_judgment: Optional[str],
    source_type: str,
    source_id: Optional[str],
    source_detail: Optional[str],
    changed_by: str,
    reason: Optional[str],
    current_status_after: Optional[str] = None
) -> models.ChangeHistory:
    change = models.ChangeHistory(
        batch_id=batch_id,
        record_id=record_id,
        change_type=change_type,
        field_changed=field_changed,
        old_value=old_value,
        new_value=new_value,
        old_judgment=old_judgment,
        new_judgment=new_judgment,
        source_type=source_type,
        source_id=source_id,
        source_detail=source_detail,
        changed_by=changed_by,
        reason=reason,
        current_status_after=current_status_after or new_judgment
    )
    db.add(change)
    db.flush()
    return change


def get_record_changes(db: Session, record_id: int) -> List[models.ChangeHistory]:
    return (
        db.query(models.ChangeHistory)
        .filter(models.ChangeHistory.record_id == record_id)
        .order_by(models.ChangeHistory.changed_at.desc())
        .all()
    )


def get_batch_changes(db: Session, batch_id: int) -> List[models.ChangeHistory]:
    return (
        db.query(models.ChangeHistory)
        .filter(models.ChangeHistory.batch_id == batch_id)
        .order_by(models.ChangeHistory.changed_at.desc())
        .all()
    )


def create_batch_with_records(
    db: Session,
    request: schemas.BatchCreateRequest
) -> Dict[str, Any]:
    batch = models.VerificationBatch(
        batch_name=request.batch_name,
        created_by=request.created_by,
        description=request.description,
        status="processing"
    )
    db.add(batch)
    db.flush()

    target_unit = "meter"
    nodes_data = [{"id": n.id, "name": n.name} for n in request.nodes]
    edges_data = [
        {
            "source": e.source,
            "target": e.target,
            "weight": e.weight,
            "unit": e.unit,
            "attributes": e.attributes
        }
        for e in request.edges
    ]

    outlier_warnings = detect_outlier_edges(edges_data)

    G, graph_info = build_graph(nodes_data, edges_data, target_unit)

    created_records = []
    unit_conversion_logs = []
    warnings = []

    for idx, query in enumerate(request.queries):
        record_code = f"BATCH{batch.id}-REC{idx + 1:04d}"
        pref_unit = query.preferred_unit or "meter"

        path_result = find_shortest_path(G, query.source, query.target)

        original_distance = path_result.get("distance")
        original_judgment = "pending"

        if not path_result["found"]:
            original_judgment = "no_path"
        elif original_distance is not None:
            in_bounds, bounds_note = check_bounds(original_distance, target_unit)
            if not in_bounds:
                original_judgment = "out_of_bounds"
            else:
                original_judgment = "verified"

        current_distance = original_distance
        current_unit = pref_unit
        unit_conv_note = None
        if original_distance is not None and pref_unit != target_unit:
            try:
                current_distance, factor, formula = convert_unit(
                    original_distance, target_unit, pref_unit
                )
                dev_note = get_deviation_note(
                    original_distance, target_unit, current_distance, pref_unit
                )
                unit_conv_note = f"换算公式: {formula}"
                if dev_note:
                    unit_conv_note += f" | {dev_note}"

                unit_conv_log = models.UnitConversion(
                    record_id=0,
                    from_unit=target_unit,
                    to_unit=pref_unit,
                    from_value=original_distance,
                    to_value=current_distance,
                    conversion_factor=factor,
                    deviation=abs(
                        convert_unit(current_distance, pref_unit, target_unit)[0]
                        - original_distance
                    ) if original_distance else None,
                    deviation_note=dev_note,
                    formula_used=formula
                )
                unit_conversion_logs.append(unit_conv_log)
            except ValueError as e:
                current_distance = original_distance
                current_unit = target_unit
                unit_conv_note = f"单位换算失败: {str(e)}"

        is_oob = False
        bounds_detail = None
        if current_distance is not None:
            in_bounds, bn = check_bounds(current_distance, current_unit)
            is_oob = not in_bounds
            bounds_detail = bn

        record = models.PathRecord(
            batch_id=batch.id,
            record_code=record_code,
            source_node=query.source,
            target_node=query.target,
            original_distance=original_distance or 0.0,
            original_unit=target_unit,
            original_path=path_result.get("path"),
            original_judgment=original_judgment,
            current_distance=current_distance,
            current_unit=current_unit,
            current_path=path_result.get("path"),
            current_judgment=original_judgment,
            is_out_of_bounds=is_oob,
            bounds_detail=bounds_detail,
            unit_conversion_note=unit_conv_note,
            processing_status="processed" if path_result["found"] else "error",
            evidence_status="not_required"
        )
        db.add(record)
        db.flush()

        for uc_log in unit_conversion_logs:
            if uc_log.record_id == 0:
                uc_log.record_id = record.id
            db.add(uc_log)
        unit_conversion_logs = []

        for pd in path_result.get("path_units_detail", []):
            if pd.get("original_unit") and pd.get("original_unit") != target_unit:
                uc = models.UnitConversion(
                    record_id=record.id,
                    from_unit=pd.get("original_unit", target_unit),
                    to_unit=target_unit,
                    from_value=pd.get("original_weight") or 0,
                    to_value=pd["weight"],
                    conversion_factor=pd.get("conversion_factor") or 1.0,
                    deviation_note=pd.get("deviation_note"),
                    formula_used=pd.get("conversion_formula")
                )
                db.add(uc)

        if is_oob:
            ew = models.ExtrapolationWarning(
                record_id=record.id,
                warning_type="distance_out_of_bounds",
                warning_detail=bounds_detail or "距离值超出合理范围",
                affected_field="current_distance",
                raw_value=str(current_distance),
                boundary_min=None,
                boundary_max=None,
                is_handled=False
            )
            db.add(ew)
            warnings.append(ew)

        if not path_result["found"]:
            ew = models.ExtrapolationWarning(
                record_id=record.id,
                warning_type="no_path_found",
                warning_detail=path_result.get("error", "未找到路径"),
                affected_field="path",
                raw_value=None
            )
            db.add(ew)
            warnings.append(ew)

        created_records.append(record)

    for ow in outlier_warnings:
        ew = models.ExtrapolationWarning(
            record_id=None,
            warning_type=ow["warning_type"],
            warning_detail=ow["warning"],
            affected_field="edge_weight",
            raw_value=str(ow.get("weight"))
        )
        db.add(ew)

    if original_judgment and original_judgment != "pending":
        record_change(
            db=db,
            batch_id=batch.id,
            record_id=created_records[-1].id if created_records else None,
            change_type="initial_verification",
            field_changed="current_judgment",
            old_value="pending",
            new_value=original_judgment,
            old_judgment="pending",
            new_judgment=original_judgment,
            source_type="algorithm",
            source_id="dijkstra_verify",
            source_detail="批量验算初始判定",
            changed_by=request.created_by,
            reason="初始路径验算结果"
        )

    batch.status = "completed"
    db.commit()
    db.refresh(batch)

    all_unit_conversions = []
    for r in created_records:
        db.refresh(r)
        for c in r.unit_conversions:
            all_unit_conversions.append({
                "from_unit": c.from_unit,
                "to_unit": c.to_unit,
                "from_value": c.from_value,
                "to_value": c.to_value,
                "formula": c.formula_used,
                "deviation_note": c.deviation_note
            })

    return {
        "batch": batch,
        "records": created_records,
        "warnings": warnings,
        "unit_conversions": all_unit_conversions
    }


def update_judgment(
    db: Session,
    request: schemas.ChangeJudgmentRequest
) -> models.PathRecord:
    record = db.query(models.PathRecord).filter(models.PathRecord.id == request.record_id).first()
    if not record:
        raise ValueError(f"Record {request.record_id} not found")

    old_judgment = record.current_judgment
    old_status = record.processing_status

    record.current_judgment = request.new_judgment
    record.processing_status = "revised"

    record_change(
        db=db,
        batch_id=record.batch_id,
        record_id=record.id,
        change_type="judgment_update",
        field_changed="current_judgment",
        old_value=old_judgment,
        new_value=request.new_judgment,
        old_judgment=old_judgment,
        new_judgment=request.new_judgment,
        source_type=request.source_type,
        source_id=None,
        source_detail=None,
        changed_by=request.changed_by,
        reason=request.reason,
        current_status_after="revised"
    )

    db.commit()
    db.refresh(record)
    return record


def get_batch_status(db: Session, batch_id: int) -> Dict[str, Any]:
    batch = db.query(models.VerificationBatch).filter(models.VerificationBatch.id == batch_id).first()
    if not batch:
        raise ValueError(f"Batch {batch_id} not found")

    records = db.query(models.PathRecord).filter(models.PathRecord.batch_id == batch_id).all()

    total = len(records)
    processed = sum(1 for r in records if r.processing_status in ("processed", "revised"))
    pending = sum(1 for r in records if r.processing_status in ("pending", "error"))
    need_evidence = sum(1 for r in records if r.evidence_status in ("required", "partial"))
    evidence_complete = sum(1 for r in records if r.evidence_status == "complete")
    oob_count = sum(1 for r in records if r.is_out_of_bounds)
    note_count = len(batch.notes)
    change_count = len(batch.change_histories)

    return {
        "batch_id": batch.id,
        "batch_name": batch.batch_name,
        "total_records": total,
        "processed_count": processed,
        "pending_count": pending,
        "need_evidence_count": need_evidence,
        "evidence_complete_count": evidence_complete,
        "out_of_bounds_count": oob_count,
        "note_count": note_count,
        "change_count": change_count
    }
