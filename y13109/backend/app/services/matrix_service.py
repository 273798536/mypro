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
    if record.status == new_status and source != ChangeSource.MANUAL_OVERRIDE:
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


def is_manually_overridden(record: MatrixRecord) -> bool:
    return any(
        ch.source == ChangeSource.MANUAL_OVERRIDE
        for ch in record.status_history
    )


def get_last_manual_override(record: MatrixRecord) -> Optional[StatusChange]:
    for ch in reversed(record.status_history):
        if ch.source == ChangeSource.MANUAL_OVERRIDE:
            return ch
    return None


def process_matrix_record(
    record: MatrixRecord,
    threshold: Optional[float] = None,
    source: ChangeSource = ChangeSource.AUTO_CALC
) -> MatrixRecord:
    values = record.matrix.values

    cond, is_empty, has_error = compute_condition_number(values)

    if record.condition_number is not None:
        record.previous_condition_number = record.condition_number
    record.previous_status = record.status

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
    prev_cond = None
    prev_status = None

    if previous_record is not None:
        prev_cond = previous_record.condition_number
        prev_status = previous_record.status
    elif current_record.previous_condition_number is not None:
        prev_cond = current_record.previous_condition_number
        prev_status = current_record.previous_status

    curr_cond = current_record.condition_number
    curr_status = current_record.status

    if prev_cond is None and prev_status is None:
        return JumpAnalysis(
            has_jump=False,
            reason=JumpReason.UNKNOWN,
            description="无历史数据，首次计算无法对比跳变",
            current_condition=curr_cond or 0.0
        )

    has_numeric_jump = False
    change_ratio = None
    if prev_cond is not None and curr_cond is not None and prev_cond != 0:
        change_ratio = abs(curr_cond - prev_cond) / prev_cond
        has_numeric_jump = change_ratio > 0.5

    has_status_jump = False
    if prev_status is not None and prev_status != curr_status:
        stable_statuses = {MatrixStatus.NORMAL, MatrixStatus.OUT_OF_BOUND}
        if prev_status in stable_statuses and curr_status in stable_statuses:
            has_status_jump = True
        elif prev_status == MatrixStatus.PENDING and curr_status in stable_statuses:
            has_status_jump = False
        else:
            has_status_jump = prev_status != curr_status

    has_explicit_reason = threshold_changed or unit_changed or has_late_attachment
    has_jump = (has_numeric_jump or has_status_jump) and has_explicit_reason

    if not has_jump and has_explicit_reason and (prev_cond is not None or prev_status is not None):
        if has_status_jump:
            has_jump = True
        elif has_numeric_jump:
            has_jump = True

    reason = JumpReason.UNKNOWN
    description = ""

    if has_jump:
        if has_late_attachment:
            reason = JumpReason.LATE_ATTACHMENT
            if has_status_jump and has_numeric_jump:
                description = f"晚到附件导致状态从{_status_text(prev_status)}变为{_status_text(curr_status)}，且数值变化{change_ratio*100:.1f}%"
            elif has_status_jump:
                description = f"晚到附件导致状态从{_status_text(prev_status)}变为{_status_text(curr_status)}"
            else:
                description = f"晚到附件导致数值跳变{change_ratio*100:.1f}%"
        elif threshold_changed:
            reason = JumpReason.THRESHOLD
            if has_status_jump and has_numeric_jump:
                description = f"阈值调整导致状态从{_status_text(prev_status)}变为{_status_text(curr_status)}，且数值变化{change_ratio*100:.1f}%"
            elif has_status_jump:
                description = f"阈值调整导致分类跳变：从{_status_text(prev_status)}变为{_status_text(curr_status)}"
            else:
                description = f"阈值调整，数值变化{change_ratio*100:.1f}%"
        elif unit_changed:
            reason = JumpReason.UNIT
            if has_numeric_jump:
                description = f"单位变更导致数值跳变{change_ratio*100:.1f}%"
            else:
                description = "单位变更，数值无显著变化"
        else:
            reason = JumpReason.UNKNOWN
            description = f"条件数变化{change_ratio*100:.1f}%，原因待查"
    else:
        if not has_explicit_reason:
            description = "未勾选跳变原因（阈值/单位/晚到附件），不进行跳变分析"
        elif prev_cond is None and prev_status is not None:
            description = f"状态从{_status_text(prev_status)}变为{_status_text(curr_status)}，但无历史条件数，无法进行数值对比"
        else:
            description = "数值和分类均无显著跳变"

    return JumpAnalysis(
        has_jump=has_jump,
        reason=reason,
        description=description,
        previous_condition=prev_cond,
        current_condition=curr_cond or 0.0,
        change_ratio=change_ratio
    )


def _status_text(status: Optional[MatrixStatus]) -> str:
    if status is None:
        return "未知"
    mapping = {
        MatrixStatus.PENDING: "待计算",
        MatrixStatus.NORMAL: "正常",
        MatrixStatus.EMPTY: "空集合",
        MatrixStatus.SINGULAR: "奇异矩阵",
        MatrixStatus.OUT_OF_BOUND: "越界",
        MatrixStatus.OVERRIDDEN: "人工改判",
        MatrixStatus.ERROR: "错误",
    }
    return mapping.get(status, str(status))


def calculate_batch_summary(records: List[MatrixRecord]) -> BatchSummary:
    summary = BatchSummary()
    summary.total = len(records)

    for r in records:
        if is_manually_overridden(r):
            summary.overridden += 1
        elif r.status == MatrixStatus.NORMAL:
            summary.normal += 1
        elif r.status == MatrixStatus.EMPTY:
            summary.empty += 1
        elif r.status == MatrixStatus.SINGULAR:
            summary.singular += 1
        elif r.status == MatrixStatus.OUT_OF_BOUND:
            summary.out_of_bound += 1
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
