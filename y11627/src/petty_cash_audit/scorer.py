from __future__ import annotations

from .models import AuditFinding, FindingSeverity, FindingStatus


SEVERITY_WEIGHTS = {
    FindingSeverity.LOW: 1,
    FindingSeverity.MEDIUM: 3,
    FindingSeverity.HIGH: 5,
    FindingSeverity.CRITICAL: 8,
}


class RiskScorer:
    """根据审计发现计算综合风险分数。

    分数 = Σ(严重程度权重) × (1 - 已修正比例)
    范围: 0 ~ 100
    """

    def __init__(self, max_score: float = 100.0):
        self.max_score = max_score

    def score(self, findings: list[AuditFinding]) -> float:
        if not findings:
            return 0.0

        total_weight = sum(SEVERITY_WEIGHTS.get(f.severity, 1) for f in findings)
        corrected_weight = sum(
            SEVERITY_WEIGHTS.get(f.severity, 1)
            for f in findings
            if f.status == FindingStatus.CORRECTED
        )
        effective_weight = total_weight - corrected_weight
        normalized = (effective_weight / max(total_weight, 1)) * self.max_score
        return round(normalized, 1)

    def break_down(
        self, findings: list[AuditFinding]
    ) -> dict[str, dict[str, float]]:
        result: dict[str, dict[str, float]] = {}
        for f in findings:
            key = f.rule_id
            if key not in result:
                result[key] = {
                    "count": 0,
                    "weight": 0,
                    "unhandled": 0,
                    "corrected": 0,
                    "manual_review": 0,
                }
            result[key]["count"] += 1
            w = SEVERITY_WEIGHTS.get(f.severity, 1)
            result[key]["weight"] += w
            if f.status == FindingStatus.UNHANDLED:
                result[key]["unhandled"] += 1
            elif f.status == FindingStatus.CORRECTED:
                result[key]["corrected"] += 1
            elif f.status == FindingStatus.MANUAL_REVIEW:
                result[key]["manual_review"] += 1
        return result
