from typing import List, Tuple, Optional
from .. import models
from ..models import FinalDecision


SCORE_THRESHOLD = 4.0
SCORE_FLUCTUATION_THRESHOLD = 1.0
PROMPT_DIFF_CHAR_THRESHOLD = 100


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
    safety_rules_diff: bool,
    prompt_diff_chars: int = 0,
    affects_safety_rules: bool = False,
    newly_added_rules: Optional[List[str]] = None,
) -> Tuple[FinalDecision, str]:
    newly_added_rules = newly_added_rules or []

    if prompt_diff_chars > PROMPT_DIFF_CHAR_THRESHOLD or len(newly_added_rules) > 0:
        reason_parts = []
        if prompt_diff_chars > PROMPT_DIFF_CHAR_THRESHOLD:
            reason_parts.append(f"提示词本体变更 {prompt_diff_chars} 字符超过阈值 {PROMPT_DIFF_CHAR_THRESHOLD}")
        if newly_added_rules:
            reason_parts.append(f"新增安全规则 {', '.join(newly_added_rules)}，需重新评测验证")
        return FinalDecision.RERUN, "；".join(reason_parts)

    if abs(revised_score - original_score) > SCORE_FLUCTUATION_THRESHOLD or safety_rules_diff or affects_safety_rules:
        reason_parts = []
        if abs(revised_score - original_score) > SCORE_FLUCTUATION_THRESHOLD:
            reason_parts.append(
                f"评分波动 {round(abs(revised_score - original_score), 2)} 分超过阈值 {SCORE_FLUCTUATION_THRESHOLD}"
            )
        if safety_rules_diff:
            reason_parts.append("关联的安全规则版本发生变更")
        if affects_safety_rules:
            reason_parts.append("人工反馈标记为影响安全规则")
        return FinalDecision.REVIEW_REQUIRED, "；".join(reason_parts)

    if revised_score >= SCORE_THRESHOLD and not has_safety_violations:
        return FinalDecision.APPROVED, f"修订评分 {revised_score} ≥ {SCORE_THRESHOLD} 且无安全违规，可直接使用"

    if has_safety_violations:
        return FinalDecision.REVIEW_REQUIRED, "存在未解决的安全违规，需 MLOps 复核"

    if revised_score < SCORE_THRESHOLD:
        return FinalDecision.REVIEW_REQUIRED, f"修订评分 {revised_score} < 阈值 {SCORE_THRESHOLD}，需复核"

    return FinalDecision.REVIEW_REQUIRED, "默认状态，待 MLOps 工程师确认"
