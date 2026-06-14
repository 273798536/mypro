from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from collections import Counter

from .config import (
    DirectionSign,
    ProcessStatus,
    ThresholdConfig,
    DEFAULT_THRESHOLD,
    FAILURE_REASONS,
)
from .loader import StandardRecord, LoadResult


@dataclass
class DirectionIssue:
    issue_type: str
    severity: str
    description: str
    evidence: Dict
    affected_indices: List[int] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "issue_type": self.issue_type,
            "severity": self.severity,
            "description": self.description,
            "evidence": self.evidence,
            "affected_indices_count": len(self.affected_indices),
            "affected_indices_sample": self.affected_indices[:10],
        }


@dataclass
class DirectionCheckResult:
    is_consistent: bool
    is_suspended: bool
    status: ProcessStatus
    inferred_direction: Optional[DirectionSign]
    declared_direction: Optional[DirectionSign]
    direction_from_field: Optional[str]
    needs_human_review: bool
    issues: List[DirectionIssue] = field(default_factory=list)
    evidence_summary: Dict = field(default_factory=dict)
    records: List[StandardRecord] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "is_consistent": self.is_consistent,
            "is_suspended": self.is_suspended,
            "status": self.status.value,
            "inferred_direction": self.inferred_direction.value if self.inferred_direction else None,
            "declared_direction": self.declared_direction.value if self.declared_direction else None,
            "direction_from_field": self.direction_from_field,
            "needs_human_review": self.needs_human_review,
            "issues": [i.to_dict() for i in self.issues],
            "evidence_summary": self.evidence_summary,
        }


POSITIVE_TOKENS = {"+", "正", "上", "up", "上行", "提升", "起", "收", "in", "1", "forward"}
NEGATIVE_TOKENS = {"-", "负", "下", "down", "下行", "下降", "落", "放", "out", "-1", "backward"}


def _parse_direction_token(raw: Optional[str]) -> Optional[DirectionSign]:
    if raw is None or raw == "":
        return None
    s = str(raw).strip().lower()
    if s in POSITIVE_TOKENS or s in {t.lower() for t in POSITIVE_TOKENS}:
        return DirectionSign.POSITIVE
    if s in NEGATIVE_TOKENS or s in {t.lower() for t in NEGATIVE_TOKENS}:
        return DirectionSign.NEGATIVE
    try:
        v = float(s)
        if v > 0:
            return DirectionSign.POSITIVE
        if v < 0:
            return DirectionSign.NEGATIVE
    except (ValueError, TypeError):
        pass
    return DirectionSign.UNKNOWN


def _infer_direction_from_trend(records: List[StandardRecord]) -> Tuple[Optional[DirectionSign], Dict]:
    valid = [r for r in records if r.tension is not None and r.tension_valid and not r.is_gap]
    if len(valid) < 4:
        return None, {"reason": "有效点不足4个，无法推断趋势"}

    first_half = valid[: len(valid) // 2]
    second_half = valid[len(valid) // 2 :]
    mean_first = sum(r.tension for r in first_half) / len(first_half) if first_half else 0
    mean_second = sum(r.tension for r in second_half) / len(second_half) if second_half else 0

    diff = mean_second - mean_first
    total_mean = (mean_first + mean_second) / 2 if (mean_first + mean_second) > 0 else 1.0
    rel_change = diff / abs(total_mean) if total_mean != 0 else 0.0

    evidence = {
        "first_half_mean": round(mean_first, 4),
        "second_half_mean": round(mean_second, 4),
        "absolute_change": round(diff, 4),
        "relative_change": round(rel_change, 4),
        "valid_points": len(valid),
    }

    rising_count = 0
    falling_count = 0
    for i in range(1, len(valid)):
        delta = valid[i].tension - valid[i - 1].tension
        if delta > 0.5:
            rising_count += 1
        elif delta < -0.5:
            falling_count += 1
    evidence["rising_steps"] = rising_count
    evidence["falling_steps"] = falling_count

    total_steps = max(1, rising_count + falling_count)
    evidence["rising_ratio"] = round(rising_count / total_steps, 4)
    evidence["falling_ratio"] = round(falling_count / total_steps, 4)

    strong_monotonic = (
        (rising_count >= falling_count * 2.0 and rising_count / total_steps >= 0.6)
        or (falling_count >= rising_count * 2.0 and falling_count / total_steps >= 0.6)
    )
    evidence["strong_monotonic"] = strong_monotonic

    if rel_change > 0.15 and rising_count >= falling_count * 2.0 and strong_monotonic:
        return DirectionSign.POSITIVE, evidence
    if rel_change < -0.15 and falling_count >= rising_count * 2.0 and strong_monotonic:
        return DirectionSign.NEGATIVE, evidence

    evidence["note"] = "张力走势不是压倒性单边（如典型抛物线训练过程），不做方向推断"
    return None, evidence


class DirectionChecker:
    def __init__(self, config: Optional[ThresholdConfig] = None):
        self.config = config or DEFAULT_THRESHOLD

    def check(self, load_result: LoadResult) -> DirectionCheckResult:
        records = load_result.records
        result = DirectionCheckResult(
            is_consistent=True,
            is_suspended=False,
            status=ProcessStatus.DIRECTION_CHECKED,
            inferred_direction=None,
            declared_direction=None,
            direction_from_field=None,
            needs_human_review=False,
            records=records,
        )

        if not records:
            result.is_consistent = False
            return result

        direction_field_present = False
        for r in records:
            if r.direction_raw is not None and r.direction_raw != "":
                direction_field_present = True
                result.direction_from_field = r.source_fields.get("direction")
                break

        declared_counter = Counter()
        for r in records:
            d = _parse_direction_token(r.direction_raw)
            if d and d != DirectionSign.UNKNOWN:
                declared_counter[d] += 1

        if declared_counter:
            result.declared_direction = declared_counter.most_common(1)[0][0]
            result.evidence_summary["declared_distribution"] = {
                k.value: v for k, v in declared_counter.items()
            }

        inferred, infer_evidence = _infer_direction_from_trend(records)
        result.inferred_direction = inferred
        result.evidence_summary["trend_inference"] = infer_evidence

        if result.declared_direction and result.inferred_direction:
            if result.declared_direction != result.inferred_direction:
                result.is_consistent = False
                mismatched_idx = []
                for i, r in enumerate(records):
                    decl = _parse_direction_token(r.direction_raw)
                    if decl == result.declared_direction and decl != result.inferred_direction:
                        mismatched_idx.append(r.seq)
                issue = DirectionIssue(
                    issue_type="DIRECTION_SIGN_CONFLICT",
                    severity="high",
                    description=(
                        f"铭牌标注方向({result.declared_direction.value})与张力变化趋势推断方向"
                        f"({result.inferred_direction.value})不一致，疑似方向符号写反"
                    ),
                    evidence={
                        "declared_direction": result.declared_direction.value,
                        "inferred_direction": result.inferred_direction.value,
                        "trend_evidence": infer_evidence,
                    },
                    affected_indices=mismatched_idx,
                )
                result.issues.append(issue)

        if direction_field_present and not declared_counter and not inferred:
            issue = DirectionIssue(
                issue_type="DIRECTION_UNPARSEABLE",
                severity="medium",
                description="方向字段存在但无法解析为有效方向，且张力趋势无明显走向",
                evidence={
                    "sample_raw_values": list(
                        {r.direction_raw for r in records[:20] if r.direction_raw}
                    )[:10],
                },
            )
            result.issues.append(issue)
            result.is_consistent = False

        if not direction_field_present:
            result.evidence_summary["note"] = "原始数据未包含方向字段，跳过方向一致性校验"
            result.is_consistent = True
            return result

        has_high_issue = any(i.severity == "high" for i in result.issues)

        if has_high_issue and self.config.require_direction_human_review:
            result.is_suspended = True
            result.needs_human_review = True
            result.status = ProcessStatus.DIRECTION_SUSPENDED
            suspend_issue = DirectionIssue(
                issue_type="SUSPENDED_FOR_HUMAN_REVIEW",
                severity="critical",
                description="方向符号疑似写反，按策略挂起待算法值班人确认，不输出假稳定结论",
                evidence={
                    "policy": "require_direction_human_review=True",
                    "auto_flip_allowed": self.config.allow_direction_auto_flip,
                    "action_taken": "挂起待确认，未进行自动修正",
                },
            )
            result.issues.insert(0, suspend_issue)

        if not result.is_suspended and self.config.allow_direction_auto_flip and result.issues:
            flip_idx = []
            for r in records:
                decl = _parse_direction_token(r.direction_raw)
                if decl and decl != result.inferred_direction and result.inferred_direction:
                    flip_idx.append(r.seq)
            result.evidence_summary["auto_flip"] = {
                "flipped_count": len(flip_idx),
                "from": result.declared_direction.value if result.declared_direction else None,
                "to": result.inferred_direction.value if result.inferred_direction else None,
            }
            result.is_consistent = True
            result.status = ProcessStatus.DIRECTION_CHECKED

        return result
