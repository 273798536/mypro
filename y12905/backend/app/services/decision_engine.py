from typing import List, Tuple, Optional
from ..models import FinalDecision


SCORE_THRESHOLD = 4.0
SCORE_FLUCTUATION_THRESHOLD = 1.0


def extract_rule_ids(safety_snapshot: dict) -> set:
    if not safety_snapshot or "rules" not in safety_snapshot:
        return set()
    return {r["id"] for r in safety_snapshot["rules"]}


def rules_are_consistent(snapshot_a: dict, snapshot_b: dict) -> bool:
    return extract_rule_ids(snapshot_a) == extract_rule_ids(snapshot_b)


def detect_added_rules(old_snapshot: dict, new_snapshot: dict) -> List[str]:
    old = extract_rule_ids(old_snapshot)
    new = extract_rule_ids(new_snapshot)
    return sorted(new - old)


def compute_decision(
    original_score: float,
    revised_score: float,
    has_safety_violations: bool,
    affects_safety_rules: bool = False,
    affected_rule_ids: Optional[List[str]] = None,
    version_rule_ids: Optional[set] = None,
) -> Tuple[FinalDecision, str]:
    affected_rule_ids = affected_rule_ids or []
    version_rule_ids = version_rule_ids or set()

    uncovered_rules = [r for r in affected_rule_ids if r not in version_rule_ids]

    if affects_safety_rules and len(uncovered_rules) > 0:
        return (
            FinalDecision.RERUN,
            f"反馈涉及当前版本快照未覆盖的安全规则 {', '.join(uncovered_rules)}，"
            f"需补充规则后重新评测验证覆盖度",
        )

    if revised_score >= SCORE_THRESHOLD and not has_safety_violations and not affects_safety_rules:
        return (
            FinalDecision.APPROVED,
            f"修订评分 {revised_score} ≥ {SCORE_THRESHOLD} 且无安全违规、不影响规则，可直接使用",
        )

    reason_parts = []
    if abs(revised_score - original_score) > SCORE_FLUCTUATION_THRESHOLD:
        reason_parts.append(
            f"评分波动 {round(abs(revised_score - original_score), 2)} 分超过阈值 {SCORE_FLUCTUATION_THRESHOLD}"
        )
    if affects_safety_rules:
        reason_parts.append("人工反馈标记为影响安全规则，需 MLOps 同步复核")
    if has_safety_violations:
        reason_parts.append("存在未解决的安全违规")
    if revised_score < SCORE_THRESHOLD:
        reason_parts.append(f"修订评分 {revised_score} < 阈值 {SCORE_THRESHOLD}")
    if not reason_parts:
        reason_parts.append("默认状态，待 MLOps 工程师确认")
    return FinalDecision.REVIEW_REQUIRED, "；".join(reason_parts)
