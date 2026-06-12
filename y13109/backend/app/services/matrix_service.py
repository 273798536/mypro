import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from copy import deepcopy

from app.models.matrix import (
    MatrixRecord, MatrixStatus, StatusChange, ChangeSource,
    BatchJob, BatchSummary, JumpAnalysis, JumpReason, MatrixData
)
from app.core.condition_number import compute_condition_number, check_out_of_bound


def generate_id() -> str:
    return str(uuid.uuid4())[:8]


def create_status_change(
    from_status: MatrixStatus,
    to_status: MatrixStatus,
    source: ChangeSource,
    operator: Optional[str] = None,
    reason: Optional[str] = None,
    detail: Optional[Dict[str, Any]] = None
) -> StatusChange:
    return StatusChange(
        id=generate_id(),
        from_status=from_status,
        to_status=to_status,
        source=source,
        operator=operator,
        reason=reason,
        detail=detail
    )


def update_record_status(
    record: MatrixRecord,
    new_status: MatrixStatus,
    source: ChangeSource,
    operator: Optional[str] = None,
    reason: Optional[str] = None,
    detail: Optional[Dict[str, Any]] = None
) -> MatrixRecord:
    if record.status == new_status:
        return record

    change = create_status_change(
        from_status=record.status,
        to_status=new_status,
        source=source,
        operator=operator,
        reason=reason,
        detail=detail
    )

    record.status_history.append(change)
    record.status = new_status
    record.updated_at = datetime.now()

    return record


def process_matrix_record(
    record: MatrixRecord,
    threshold: Optional[float] = None,
    source: ChangeSource = ChangeSource.AUTO_CALC
) -> MatrixRecord:
    values = record.matrix.values

    cond, is_empty, has_error = compute_condition_number(values)

    record.condition_number = cond

    if is_empty:
        update_record_status(
            record, MatrixStatus.EMPTY, source,
            reason="空集合输入，矩阵数据为空"
        )
    elif has_error:
        update_record_status(
            record, MatrixStatus.SINGULAR, source,
            reason="矩阵奇异或不可逆"
        )
    else:
        if threshold is not None:
            out_of_bound, ratio = check_out_of_bound(cond, threshold)
            record.is_out_of_bound = out_of_bound
            record.bound_exceeded = ratio if out_of_bound else None
            if out_of_bound:
                update_record_status(
                    record, MatrixStatus.OUT_OF_BOUND, source,
                    reason=f"条件数 {cond:.2f} 超过阈值 {threshold}",
                    detail={"threshold": threshold, "ratio": ratio}
                )
            else:
                update_record_status(
                    record, MatrixStatus.NORMAL, source
                )
        else:
            update_record_status(
                record, MatrixStatus.NORMAL, source
            )

    return record


def analyze_jump(
    current_record: MatrixRecord,
    previous_record: Optional[MatrixRecord] = None,
    threshold_changed: bool = False,
    unit_changed: bool = False,
    has_late_attachment: bool = False
) -> JumpAnalysis:
    if previous_record is None or previous_record.condition_number is None:
        return JumpAnalysis(
            has_jump=False,
            reason=JumpReason.UNKNOWN,
            description="无历史数据，无法对比跳变",
            current_condition=current_record.condition_number or 0.0
        )

    prev_cond = previous_record.condition_number
    curr_cond = current_record.condition_number

    if curr_cond is None or prev_cond == 0:
        return JumpAnalysis(
            has_jump=False,
            reason=JumpReason.UNKNOWN,
            description="历史或当前条件数无效",
            previous_condition=prev_cond,
            current_condition=curr_cond or 0.0
        )

    change_ratio = abs(curr_cond - prev_cond) / prev_cond
    has_jump = change_ratio > 0.5

    reason = JumpReason.UNKNOWN
    description = ""

    if has_jump:
        if has_late_attachment:
            reason = JumpReason.LATE_ATTACHMENT
            description = "晚到附件导致结果跳变"
        elif threshold_changed:
            reason = JumpReason.THRESHOLD
            description = "阈值调整导致结果分类跳变"
        elif unit_changed:
            reason = JumpReason.UNIT
            description = "单位变更导致条件数数值跳变"
        else:
            reason = JumpReason.UNKNOWN
            description = f"条件数变化 {change_ratio*100:.1f}%，原因待查"

    return JumpAnalysis(
        has_jump=has_jump,
        reason=reason,
        description=description,
        previous_condition=prev_cond,
        current_condition=curr_cond,
        change_ratio=change_ratio
    )


def calculate_batch_summary(records: List[MatrixRecord]) -> BatchSummary:
    summary = BatchSummary()
    summary.total = len(records)

    for r in records:
        if r.status == MatrixStatus.NORMAL:
            summary.normal += 1
        elif r.status == MatrixStatus.EMPTY:
            summary.empty += 1
        elif r.status == MatrixStatus.SINGULAR:
            summary.singular += 1
        elif r.status == MatrixStatus.OUT_OF_BOUND:
            summary.out_of_bound += 1
        elif r.status == MatrixStatus.OVERRIDDEN:
            summary.overridden += 1
        elif r.status == MatrixStatus.ERROR:
            summary.error += 1

    return summary


def create_batch_job(name: str, threshold: Optional[float] = None) -> BatchJob:
    return BatchJob(
        id=generate_id(),
        name=name,
        threshold=threshold,
        records=[],
        summary=BatchSummary()
    )


def add_record_to_batch(batch: BatchJob, record: MatrixRecord) -> BatchJob:
    batch.records.append(record)
    batch.summary = calculate_batch_summary(batch.records)
    batch.updated_at = datetime.now()
    return batch


def reprocess_batch(
    batch: BatchJob,
    threshold: Optional[float] = None,
    source: ChangeSource = ChangeSource.AUTO_CALC,
    previous_batch: Optional[BatchJob] = None,
    threshold_changed: bool = False,
    unit_changed: bool = False,
    has_late_attachment: bool = False
) -> BatchJob:
    prev_map = {}
    if previous_batch:
        for r in previous_batch.records:
            prev_map[r.id] = r

    for record in batch.records:
        prev_record = prev_map.get(record.id)
        process_matrix_record(record, threshold=threshold, source=source)

        if prev_record:
            jump = analyze_jump(
                record, prev_record,
                threshold_changed=threshold_changed,
                unit_changed=unit_changed,
                has_late_attachment=has_late_attachment
            )
            record.jump_analysis = jump

    batch.summary = calculate_batch_summary(batch.records)
    batch.updated_at = datetime.now()

    if threshold is not None:
        batch.threshold = threshold

    return batch


def manual_override_record(
    record: MatrixRecord,
    new_status: MatrixStatus,
    operator: str,
    reason: str
) -> MatrixRecord:
    update_record_status(
        record, new_status,
        source=ChangeSource.MANUAL_OVERRIDE,
        operator=operator,
        reason=reason
    )
    return record


def get_out_of_bound_records(batch: BatchJob) -> List[MatrixRecord]:
    return [r for r in batch.records if r.is_out_of_bound or r.status == MatrixStatus.OUT_OF_BOUND]


def get_empty_records(batch: BatchJob) -> List[MatrixRecord]:
    return [r for r in batch.records if r.status == MatrixStatus.EMPTY]
