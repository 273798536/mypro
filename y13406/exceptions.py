from typing import List, Dict, Any, Optional
from collections import Counter, defaultdict

from models import (
    ErrorQuestionSample,
    SampleStatus,
    CleanseResult,
    SamplingResult,
)


def build_exception_dashboard(
    cleanse_result: CleanseResult,
    sampling_result: Optional[SamplingResult] = None,
) -> Dict[str, Any]:
    samples = cleanse_result.samples
    status_counter: Counter = Counter(s.status for s in samples)

    by_issue_type: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for s in samples:
        for issue in s.issues:
            by_issue_type[issue["issue_type"]].append({
                "sample_id": s.sample_id,
                "raw_row_no": s.raw_row_no,
                "field": issue.get("field"),
                "detail": issue.get("detail"),
                "detected_at": issue.get("detected_at"),
            })

    unit_missing_detail = []
    for s in samples:
        if s.status == SampleStatus.UNIT_MISSING:
            unit_missing_detail.append({
                "sample_id": s.sample_id,
                "raw_row_no": s.raw_row_no,
                "student_id": s.student_id,
                "student_name": s.student_name,
                "error_question_count": s.error_question_count,
                "error_question_count_unit": s.error_question_count_unit,
                "error_score": s.error_score,
                "error_score_unit": s.error_score_unit,
                "issues": s.issues,
            })

    boundary_detail = []
    for s in samples:
        if s.status == SampleStatus.BOUNDARY_OUTLIER:
            boundary_detail.append({
                "sample_id": s.sample_id,
                "raw_row_no": s.raw_row_no,
                "student_id": s.student_id,
                "error_question_count": s.error_question_count,
                "error_score": s.error_score,
                "issues": s.issues,
            })

    supplement_detail = []
    for s in samples:
        if s.remark_supplement:
            supplement_detail.append({
                "sample_id": s.sample_id,
                "original_remark": s.original_fields.get("备注") or s.original_fields.get("remark"),
                "supplement": s.remark_supplement,
                "merged_remark": s.remark,
            })

    old_term_detail = cleanse_result.old_term_renamed

    dashboard = {
        "status_distribution": dict(status_counter),
        "by_issue_type": {k: v for k, v in by_issue_type.items()},
        "unit_missing_count": cleanse_result.unit_missing_count,
        "unit_missing_excluded_ids": cleanse_result.excluded_unit_missing_ids,
        "unit_missing_detail": unit_missing_detail,
        "boundary_outlier_count": cleanse_result.boundary_outlier_count,
        "boundary_outlier_detail": boundary_detail,
        "supplement_merged_count": cleanse_result.supplement_merged,
        "supplement_detail": supplement_detail,
        "old_term_renamed": old_term_detail,
        "missing_value_count": cleanse_result.missing_value_count,
    }

    if sampling_result is not None:
        dashboard["sampling_excluded"] = sampling_result.excluded_from_sampling
        dashboard["selected_ids"] = sampling_result.selected_ids
        dashboard["sampling_summary"] = sampling_result.summary
        dashboard["sampling_intermediate_steps"] = [
            step.model_dump() for step in sampling_result.intermediate_steps
        ]

    return dashboard


def export_cleanse_log_lines(cleanse_result: CleanseResult) -> List[str]:
    lines = []
    lines.append(f"[导入总数] {cleanse_result.total_input}")
    lines.append(f"[有效样本] {cleanse_result.valid_count}")
    lines.append(f"[排除总数] {cleanse_result.excluded_count}")
    lines.append(f"[缺值] {cleanse_result.missing_value_count}")
    lines.append(f"[单位缺失] {cleanse_result.unit_missing_count}")
    lines.append(f"[边界异常] {cleanse_result.boundary_outlier_count}")
    lines.append(f"[后补说明合并] {cleanse_result.supplement_merged}")
    for s in cleanse_result.samples:
        lines.append(
            f" - {s.sample_id} 行{s.raw_row_no} 状态={s.status.value} "
            f"问题数={len(s.issues)}"
        )
    return lines
