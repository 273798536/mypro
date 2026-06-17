from __future__ import annotations

from typing import List, Dict, Optional
from collections import Counter

from .models import Finding, Severity, DistributionStat, CheckResult


def analyze_distribution(findings: List[Finding]) -> List[DistributionStat]:
    by_category: Dict[str, List[Finding]] = {}
    for f in findings:
        if f.category not in by_category:
            by_category[f.category] = []
        by_category[f.category].append(f)

    total = len(findings)
    stats = []

    for category, cat_findings in sorted(by_category.items(), key=lambda x: -len(x[1])):
        sev_breakdown = Counter(f.severity for f in cat_findings)
        stat = DistributionStat(
            category=category,
            count=len(cat_findings),
            percentage=round(len(cat_findings) / total * 100, 2) if total > 0 else 0.0,
            severity_breakdown=dict(sev_breakdown),
        )
        stats.append(stat)

    return stats


def severity_summary(findings: List[Finding]) -> Dict[Severity, int]:
    counter = Counter(f.severity for f in findings)
    return dict(counter)


def by_source_file(findings: List[Finding]) -> Dict[str, int]:
    counter = Counter(f.source_file for f in findings)
    return dict(counter.most_common())


def by_rule(findings: List[Finding]) -> Dict[str, int]:
    counter = Counter(f.rule_name for f in findings)
    return dict(counter.most_common())


def truncation_stats(findings: List[Finding]) -> Dict[str, int]:
    truncated = sum(1 for f in findings if f.truncated)
    not_truncated = len(findings) - truncated
    return {
        "total": len(findings),
        "truncated": truncated,
        "not_truncated": not_truncated,
        "truncation_rate": round(truncated / len(findings) * 100, 2) if findings else 0,
    }


def feedback_status_summary(findings: List[Finding]) -> Dict[str, int]:
    from .models import FeedbackStatus
    counter = Counter(f.feedback_status for f in findings)
    return {k.value: v for k, v in counter.items()}


def needs_review_findings(findings: List[Finding]) -> List[Finding]:
    from .models import FeedbackStatus
    return [f for f in findings if f.feedback_status == FeedbackStatus.NEEDS_REVIEW]


def ready_to_use_findings(findings: List[Finding]) -> List[Finding]:
    from .models import FeedbackStatus
    return [f for f in findings if f.feedback_status == FeedbackStatus.CONFIRMED]


def build_full_report(result: CheckResult) -> Dict[str, any]:
    findings = result.findings
    return {
        "result_id": result.result_id,
        "check_time": result.check_time,
        "prompt_version": result.prompt_version,
        "sample_batch": result.sample_batch,
        "review_round": result.review_round,
        "total_lines": result.total_lines,
        "total_findings": result.total_findings,
        "hit_rate": result.summary.get("hit_rate", 0),
        "severity_summary": severity_summary(findings),
        "category_distribution": [s.model_dump() for s in analyze_distribution(findings)],
        "by_source_file": by_source_file(findings),
        "by_rule": by_rule(findings),
        "truncation_stats": truncation_stats(findings),
        "feedback_status": feedback_status_summary(findings),
        "needs_review_count": len(needs_review_findings(findings)),
    }
