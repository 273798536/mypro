from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Dict, Any
from collections import Counter

from .models import (
    CheckResult,
    Finding,
    FeedbackStatus,
    Severity,
)


def update_finding_feedback(
    finding: Finding,
    status: FeedbackStatus,
    comment: Optional[str] = None,
    reviewer: Optional[str] = None,
) -> Finding:
    finding.feedback_status = status
    finding.feedback_comment = comment
    finding.reviewed_by = reviewer
    finding.reviewed_at = datetime.now()
    return finding


def batch_update_feedback(
    result: CheckResult,
    finding_ids: List[str],
    status: FeedbackStatus,
    comment: Optional[str] = None,
    reviewer: Optional[str] = None,
) -> CheckResult:
    id_set = set(finding_ids)
    for finding in result.findings:
        if finding.finding_id in id_set:
            update_finding_feedback(finding, status, comment, reviewer)

    _recalculate_result_summary(result)
    return result


def confirm_all_high_severity(
    result: CheckResult,
    reviewer: Optional[str] = None,
) -> CheckResult:
    for finding in result.findings:
        if finding.severity == Severity.HIGH and not finding.truncated:
            update_finding_feedback(
                finding, FeedbackStatus.CONFIRMED, "高危问题自动确认", reviewer
            )
    _recalculate_result_summary(result)
    return result


def mark_truncated_for_review(
    result: CheckResult,
    reviewer: Optional[str] = None,
) -> CheckResult:
    for finding in result.findings:
        if finding.truncated:
            update_finding_feedback(
                finding,
                FeedbackStatus.NEEDS_REVIEW,
                "长文本截断，需人工复核完整内容",
                reviewer,
            )
    _recalculate_result_summary(result)
    return result


def _recalculate_result_summary(result: CheckResult) -> None:
    from .distribution import feedback_status_summary

    status_summary = feedback_status_summary(result.findings)
    if "summary" not in result.__dict__ or not isinstance(result.summary, dict):
        result.summary = {}
    result.summary["by_status"] = status_summary

    needs_review = status_summary.get("needs_review", 0)
    result.summary["needs_review_count"] = needs_review


def get_findings_by_status(
    result: CheckResult,
    status: FeedbackStatus,
) -> List[Finding]:
    return [f for f in result.findings if f.feedback_status == status]


def get_ready_for_training(
    result: CheckResult,
) -> List[Finding]:
    return [
        f
        for f in result.findings
        if f.feedback_status == FeedbackStatus.CONFIRMED
    ]


def get_needs_mlops_review(
    result: CheckResult,
) -> List[Finding]:
    return [
        f
        for f in result.findings
        if f.feedback_status == FeedbackStatus.NEEDS_REVIEW
        or f.feedback_status == FeedbackStatus.PENDING
    ]


def categorize_for_training(
    result: CheckResult,
) -> Dict[str, List[Finding]]:
    categories = {
        "ready_to_use": [],
        "needs_review": [],
        "pending": [],
        "rejected": [],
    }
    for f in result.findings:
        if f.feedback_status == FeedbackStatus.CONFIRMED:
            categories["ready_to_use"].append(f)
        elif f.feedback_status == FeedbackStatus.NEEDS_REVIEW:
            categories["needs_review"].append(f)
        elif f.feedback_status == FeedbackStatus.PENDING:
            categories["pending"].append(f)
        elif f.feedback_status == FeedbackStatus.REJECTED:
            categories["rejected"].append(f)
    return categories


def build_review_round_summary(
    result: CheckResult,
) -> Dict[str, Any]:
    cats = categorize_for_training(result)
    return {
        "result_id": result.result_id,
        "prompt_version": result.prompt_version,
        "sample_batch": result.sample_batch,
        "rollback_from": result.rollback_from,
        "review_round": result.review_round,
        "check_time": result.check_time,
        "total_findings": len(result.findings),
        "ready_to_use_count": len(cats["ready_to_use"]),
        "needs_review_count": len(cats["needs_review"]),
        "pending_count": len(cats["pending"]),
        "rejected_count": len(cats["rejected"]),
        "source_files": result.source_files,
    }


def merge_feedback_from_result(
    target_result: CheckResult,
    source_result: CheckResult,
) -> CheckResult:
    source_map = {}
    for f in source_result.findings:
        key = (f.rule_id, f.matched_text, f.line_number, f.source_file)
        source_map[key] = f

    for f in target_result.findings:
        key = (f.rule_id, f.matched_text, f.line_number, f.source_file)
        if key in source_map:
            source_f = source_map[key]
            f.feedback_status = source_f.feedback_status
            f.feedback_comment = source_f.feedback_comment
            f.reviewed_by = source_f.reviewed_by
            f.reviewed_at = source_f.reviewed_at

    _recalculate_result_summary(target_result)
    return target_result
