from typing import List, Dict, Any, Optional
from datetime import datetime
from collections import defaultdict

from models import (
    ReportData, ComparisonItem, JudgmentStatus, ChangeType,
    ModelOutput, Sample, ThresholdConfig, ManualJudgment, Attachment,
    ThresholdDriftRecord, BadDataRecord
)


def apply_filters(items: List[ComparisonItem], filters: Dict[str, Any]) -> List[ComparisonItem]:
    filtered = items
    if "product_line" in filters and filters["product_line"]:
        filtered = [i for i in filtered if i.sample.product_line == filters["product_line"]]
    if "category" in filters and filters["category"]:
        filtered = [i for i in filtered if i.sample.category == filters["category"]]
    if "batch_number" in filters and filters["batch_number"]:
        filtered = [i for i in filtered if i.sample.batch_number == filters["batch_number"]]
    if "status" in filters and filters["status"]:
        target_status = filters["status"]
        filtered = [i for i in filtered if i.current_status == target_status]
    if "change_type" in filters and filters["change_type"]:
        target_change = filters["change_type"]
        filtered = [i for i in filtered if i.change_type == target_change]
    if "has_threshold_drift" in filters and filters["has_threshold_drift"] is not None:
        has_drift = filters["has_threshold_drift"]
        filtered = [i for i in filtered if (i.threshold_drift is not None) == has_drift]
    if "has_manual_judgment" in filters and filters["has_manual_judgment"] is not None:
        has_manual = filters["has_manual_judgment"]
        filtered = [i for i in filtered if (i.manual_judgment is not None) == has_manual]
    if "is_suspended" in filters and filters["is_suspended"] is not None:
        suspended = filters["is_suspended"]
        filtered = [i for i in filtered if i.is_suspended == suspended]
    if "date_from" in filters and filters["date_from"]:
        date_from = filters["date_from"]
        filtered = [i for i in filtered if i.sample.captured_at >= date_from]
    if "date_to" in filters and filters["date_to"]:
        date_to = filters["date_to"]
        filtered = [i for i in filtered if i.sample.captured_at <= date_to]
    return filtered


def calculate_statistics(items: List[ComparisonItem], all_items: List[ComparisonItem]) -> Dict[str, Any]:
    total = len(items)
    status_counts = defaultdict(int)
    change_type_counts = defaultdict(int)
    product_line_counts = defaultdict(int)
    category_counts = defaultdict(int)
    batch_counts = defaultdict(int)

    sample_changed = 0
    threshold_changed = 0
    manual_revised = 0
    late_attachment = 0
    suspended_count = 0
    threshold_drift_count = 0
    bad_data_count = 0

    avg_score = 0.0
    avg_confidence = 0.0

    for item in items:
        status_counts[item.current_status.value] += 1
        change_type_counts[item.change_type.value] += 1
        product_line_counts[item.sample.product_line] += 1
        category_counts[item.sample.category] += 1
        batch_counts[item.sample.batch_number] += 1

        if item.change_type == ChangeType.SAMPLE_CHANGED:
            sample_changed += 1
        if item.change_type == ChangeType.THRESHOLD_CHANGED:
            threshold_changed += 1
        if item.change_type == ChangeType.MANUAL_REVISED:
            manual_revised += 1
        if item.change_type == ChangeType.LATE_ATTACHMENT:
            late_attachment += 1
        if item.is_suspended:
            suspended_count += 1
        if item.threshold_drift:
            threshold_drift_count += 1
        if item.bad_data:
            bad_data_count += 1

        avg_score += item.model_output.model_score
        avg_confidence += item.model_output.confidence

    if total > 0:
        avg_score /= total
        avg_confidence /= total

    pass_rate = status_counts.get(JudgmentStatus.PASS.value, 0) / total if total > 0 else 0.0
    fail_rate = status_counts.get(JudgmentStatus.FAIL.value, 0) / total if total > 0 else 0.0

    baseline_pass = sum(1 for i in items if i.baseline_status == JudgmentStatus.PASS)
    current_pass = sum(1 for i in items if i.current_status == JudgmentStatus.PASS)
    pass_diff = current_pass - baseline_pass
    pass_rate_diff = (current_pass / total if total > 0 else 0.0) - (baseline_pass / total if total > 0 else 0.0)

    return {
        "total_count": total,
        "total_in_dataset": len(all_items),
        "filtered_count": total,
        "status_distribution": dict(status_counts),
        "change_type_distribution": dict(change_type_counts),
        "product_line_distribution": dict(product_line_counts),
        "category_distribution": dict(category_counts),
        "batch_distribution": dict(batch_counts),
        "pass_count": status_counts.get(JudgmentStatus.PASS.value, 0),
        "fail_count": status_counts.get(JudgmentStatus.FAIL.value, 0),
        "pending_count": status_counts.get(JudgmentStatus.PENDING.value, 0),
        "suspended_count": suspended_count,
        "pass_rate": round(pass_rate, 4),
        "fail_rate": round(fail_rate, 4),
        "sample_changed_count": sample_changed,
        "threshold_changed_count": threshold_changed,
        "manual_revised_count": manual_revised,
        "late_attachment_count": late_attachment,
        "threshold_drift_count": threshold_drift_count,
        "bad_data_count": bad_data_count,
        "average_model_score": round(avg_score, 4),
        "average_confidence": round(avg_confidence, 4),
        "baseline_pass_count": baseline_pass,
        "current_pass_count": current_pass,
        "pass_count_difference": pass_diff,
        "pass_rate_difference": round(pass_rate_diff, 4),
    }


def generate_detail_rows(items: List[ComparisonItem]) -> List[Dict[str, Any]]:
    rows = []
    for idx, item in enumerate(items):
        row = {
            "row_index": idx + 1,
            "sample_id": item.sample_id,
            "product_line": item.sample.product_line,
            "category": item.sample.category,
            "batch_number": item.sample.batch_number,
            "captured_at": item.sample.captured_at.strftime("%Y-%m-%d %H:%M:%S"),
            "model_score": item.model_output.model_score,
            "model_prediction": item.model_output.model_prediction,
            "confidence": item.model_output.confidence,
            "model_output_line": item.model_output.raw_line_number,
            "baseline_status": item.baseline_status.value,
            "current_status": item.current_status.value,
            "change_type": item.change_type.value,
            "is_suspended": item.is_suspended,
            "suspension_reason": item.suspension_reason,
            "has_threshold_drift": item.threshold_drift is not None,
            "drift_magnitude": item.threshold_drift.drift_magnitude if item.threshold_drift else None,
            "threshold_version": item.threshold_drift.current_threshold_version if item.threshold_drift else None,
            "has_manual_judgment": item.manual_judgment is not None,
            "manual_operator": item.manual_judgment.operator if item.manual_judgment else None,
            "manual_reason": item.manual_judgment.reason if item.manual_judgment else None,
            "has_late_attachment": item.late_attachment is not None,
            "late_attachment_path": item.late_attachment.file_path if item.late_attachment else None,
            "has_bad_data": item.bad_data is not None,
            "bad_data_issue": item.bad_data.description if item.bad_data else None,
            "bad_data_model_line": item.bad_data.model_output_line if item.bad_data else None,
            "image_path": item.sample.image_path,
        }
        rows.append(row)
    return rows


def build_report_data(
    samples: List[Sample],
    model_outputs: List[ModelOutput],
    threshold_configs: List[ThresholdConfig],
    manual_judgments: List[ManualJudgment],
    attachments: List[Attachment],
    baseline_judgments: Dict[str, JudgmentStatus],
    filter_conditions: Dict[str, Any],
    threshold_drifts: List[ThresholdDriftRecord] = None,
    bad_data_records: List[BadDataRecord] = None,
) -> ReportData:
    model_output_map = {mo.sample_id: mo for mo in model_outputs}
    manual_map = {mj.sample_id: mj for mj in manual_judgments}
    attachment_map = defaultdict(list)
    for att in attachments:
        attachment_map[att.sample_id].append(att)
    drift_map = {td.sample_id: td for td in (threshold_drifts or [])}
    bad_data_map = {bd.sample_id: bd for bd in (bad_data_records or [])}

    items: List[ComparisonItem] = []
    for sample in samples:
        mo = model_output_map.get(sample.sample_id)
        if not mo:
            continue

        active_threshold = None
        for tc in threshold_configs:
            if (tc.product_line == sample.product_line and
                    tc.category == sample.category and
                    tc.is_active):
                active_threshold = tc
                break

        baseline = baseline_judgments.get(sample.sample_id, JudgmentStatus.PENDING)

        current = JudgmentStatus.PENDING
        change_type = ChangeType.NO_CHANGE
        is_suspended = False
        suspension_reason = ""

        pass_threshold = active_threshold.pass_threshold if active_threshold else 0.8
        fail_threshold = active_threshold.fail_threshold if active_threshold else 0.3

        if mo.model_score >= pass_threshold:
            current = JudgmentStatus.PASS
        elif mo.model_score <= fail_threshold:
            current = JudgmentStatus.FAIL

        drift = drift_map.get(sample.sample_id)
        if drift and drift.needs_operation_confirm:
            is_suspended = True
            suspension_reason = f"阈值漂移需要运营主管确认，漂移幅度: {drift.drift_magnitude:.4f}"
            current = JudgmentStatus.SUSPENDED

        manual = manual_map.get(sample.sample_id)
        if manual:
            if manual.judgment != current:
                change_type = ChangeType.MANUAL_REVISED
                current = manual.judgment
                if is_suspended:
                    is_suspended = False
                    suspension_reason = ""
            elif manual.is_late:
                change_type = ChangeType.LATE_ATTACHMENT

        late_attachment = None
        for att in attachment_map.get(sample.sample_id, []):
            if att.is_late_arrival:
                late_attachment = att
                if change_type == ChangeType.NO_CHANGE:
                    change_type = ChangeType.LATE_ATTACHMENT
                break

        if change_type == ChangeType.NO_CHANGE:
            if drift:
                change_type = ChangeType.THRESHOLD_CHANGED
            elif baseline != current:
                change_type = ChangeType.SAMPLE_CHANGED

        bad_data = bad_data_map.get(sample.sample_id)

        item = ComparisonItem(
            sample_id=sample.sample_id,
            sample=sample,
            model_output=mo,
            baseline_status=baseline,
            current_status=current,
            change_type=change_type,
            threshold_drift=drift,
            manual_judgment=manual,
            late_attachment=late_attachment,
            bad_data=bad_data,
            is_suspended=is_suspended,
            suspension_reason=suspension_reason,
        )
        items.append(item)

    filtered_items = apply_filters(items, filter_conditions)
    stats = calculate_statistics(filtered_items, items)

    report_data = ReportData(
        generated_at=datetime.now(),
        filter_conditions=filter_conditions,
        items=filtered_items,
        statistics=stats,
        threshold_drifts=[drift_map[i.sample_id] for i in filtered_items if i.threshold_drift],
        bad_data_records=[bad_data_map[i.sample_id] for i in filtered_items if i.bad_data],
        late_attachments=[i.late_attachment for i in filtered_items if i.late_attachment],
    )

    return report_data
