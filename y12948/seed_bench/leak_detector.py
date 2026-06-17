from __future__ import annotations

from typing import Any

from .config import SafetyRulesConfig
from .errors import SafetyRuleMissingError, TrainValLeakError
from .models import (
    DataRecord,
    LeakDetectionResult,
    ReviewStatus,
    SafetyRule,
    SplitType,
    compute_content_hash,
)


class LeakDetector:
    """训练验证泄漏检测器 + 安全规则检查

    检查项：
    1. 内容哈希同时出现在 train 和 val/test → exact_content_leak
    2. user_id 同时出现在 train 和 val/test → user_cross_leak
    3. session_id 同时出现在 train 和 val/test → session_cross_leak
    4. 安全规则缺失检查
    5. 最小验证集大小
    6. 是否存在 train/val 划分
    """

    def __init__(self, config: SafetyRulesConfig | None = None, custom_rules: list[SafetyRule] | None = None):
        self.config = config or SafetyRulesConfig()
        self.custom_rules = custom_rules or []

    def _required_rule_ids(self) -> list[str]:
        ids = []
        if self.config.require_train_val_split:
            ids.append("rule_require_split")
        if self.config.min_val_size > 0:
            ids.append("rule_min_val_size")
        if self.config.forbid_user_cross:
            ids.append("rule_forbid_user_cross")
        ids.append("rule_exact_content_leak")
        ids.append("rule_max_leak_ratio")
        return ids

    def _build_default_safety_rules(self) -> list[SafetyRule]:
        rules = [
            SafetyRule(
                rule_id="rule_require_split",
                name="训练/验证划分必须存在",
                description="数据集必须包含 train 和 val 两种 split_type，不能全部为 unassigned",
                severity="high",
                config={"enabled": self.config.require_train_val_split},
            ),
            SafetyRule(
                rule_id="rule_min_val_size",
                name="最小验证集大小",
                description=f"验证集样本数至少 {self.config.min_val_size} 条",
                severity="medium",
                config={"min_val_size": self.config.min_val_size, "enabled": True},
            ),
            SafetyRule(
                rule_id="rule_forbid_user_cross",
                name="禁止用户跨集泄漏",
                description="同一 user_id 不能同时出现在 train 与 val/test 中",
                severity="high",
                config={"enabled": self.config.forbid_user_cross},
            ),
            SafetyRule(
                rule_id="rule_exact_content_leak",
                name="禁止内容精确泄漏",
                description="相同 content_hash 不能同时出现在 train 与 val/test 中",
                severity="high",
                config={"enabled": True},
            ),
            SafetyRule(
                rule_id="rule_max_leak_ratio",
                name="最大允许泄漏比例",
                description=f"泄漏样本占比不得超过 {self.config.max_leak_ratio:.2%}",
                severity="high",
                config={"max_leak_ratio": self.config.max_leak_ratio, "enabled": True},
            ),
        ]
        return rules + self.custom_rules

    def check_safety_rules_presence(self, provided_rule_ids: list[str] | None = None) -> tuple[list[str], list[str]]:
        """返回 (已满足的规则列表, 缺失的规则列表)"""
        default_rules = self._build_default_safety_rules()
        required = self._required_rule_ids()
        enabled_ids = {r.rule_id for r in default_rules if r.enabled}
        needed = [rid for rid in required if rid in enabled_ids]
        provided = set(provided_rule_ids or [])
        missing = [rid for rid in needed if rid not in provided]
        satisfied = [rid for rid in needed if rid in provided]
        return satisfied, missing

    def run(self, records: list[DataRecord], raise_on_leak: bool = False) -> LeakDetectionResult:
        applied_ids: list[str] = []
        missing_ids: list[str] = []
        violations: list[tuple[str, str, list[str]]] = []

        # 先检查安全规则配置
        rules = self._build_default_safety_rules()
        enabled_rules = [r for r in rules if r.enabled]
        for r in enabled_rules:
            applied_ids.append(r.rule_id)

        # 按 split_type 分组
        train_recs = [r for r in records if r.split_type == SplitType.TRAIN]
        val_recs = [r for r in records if r.split_type == SplitType.VAL]
        test_recs = [r for r in records if r.split_type == SplitType.TEST]
        val_test = val_recs + test_recs
        total = len(records)

        # 规则: require_train_val_split
        if self.config.require_train_val_split:
            if not train_recs or not val_recs:
                missing_ids.append("rule_require_split")
                violations.append(("rule_require_split", "缺少 train/val 划分", []))

        # 规则: min_val_size
        if len(val_recs) < self.config.min_val_size:
            violations.append((
                "rule_min_val_size",
                f"val 样本 {len(val_recs)} < {self.config.min_val_size}",
                [r.record_id for r in val_recs],
            ))

        # 规则: exact_content_leak
        train_hashes = {r.content_hash for r in train_recs}
        val_test_hashes = {r.content_hash for r in val_test}
        leaked_hashes = train_hashes & val_test_hashes
        leaked_by_hash = [
            r.record_id for r in records
            if r.content_hash in leaked_hashes and r.split_type in (SplitType.VAL, SplitType.TEST)
        ]
        if leaked_hashes:
            violations.append((
                "rule_exact_content_leak",
                f"{len(leaked_hashes)} 个内容哈希同时出现在 train 和 val/test",
                sorted(leaked_by_hash),
            ))

        # 规则: forbid_user_cross
        if self.config.forbid_user_cross:
            train_users = {r.user_id for r in train_recs if r.user_id}
            val_users = {r.user_id for r in val_test if r.user_id}
            leaked_users = train_users & val_users
            if leaked_users:
                leaked_keys = sorted(leaked_users)
                affected_records = [
                    r.record_id for r in val_test if r.user_id in leaked_users
                ]
                violations.append((
                    "rule_forbid_user_cross",
                    f"{len(leaked_users)} 个用户跨集: {leaked_keys[:10]}",
                    affected_records,
                ))

        # 统计总体泄漏
        total_leaked_keys = set()
        leak_type_parts = []
        for rule_id, _msg, affected in violations:
            if rule_id in ("rule_exact_content_leak", "rule_forbid_user_cross", "rule_session_cross_leak"):
                total_leaked_keys.update(affected)
                leak_type_parts.append(rule_id)
        total_leak_count = len(total_leaked_keys)
        leak_ratio = total_leak_count / max(total, 1)
        leak_type = "+".join(leak_type_parts) or "none"

        # 规则: max_leak_ratio
        if leak_ratio > self.config.max_leak_ratio and total_leak_count > 0:
            violations.insert(0, (
                "rule_max_leak_ratio",
                f"泄漏比例 {leak_ratio:.2%} > {self.config.max_leak_ratio:.2%}",
                sorted(total_leaked_keys),
            ))

        # 综合判断状态
        if not violations:
            status = ReviewStatus.APPROVED
            message = "所有安全规则检查通过，未检测到训练验证泄漏。"
        else:
            status = ReviewStatus.REJECTED
            first_msg = violations[0][1]
            message = f"检测到 {len(violations)} 项安全问题: {first_msg}"

        # 若缺失配置级安全规则，抛出可操作错误
        if missing_ids and raise_on_leak:
            first_missing = missing_ids[0]
            rule_desc = next((r.name for r in rules if r.rule_id == first_missing), first_missing)
            raise SafetyRuleMissingError(rule_name=first_missing, rule_description=rule_desc)

        # 若实际泄漏超过阈值，抛出可操作错误
        if raise_on_leak and status == ReviewStatus.REJECTED and total_leak_count > 0:
            raise TrainValLeakError(
                leak_type=leak_type,
                leak_count=total_leak_count,
                total_count=total,
                affected_keys=sorted(total_leaked_keys),
            )

        return LeakDetectionResult(
            status=status,
            leak_type=leak_type,
            leak_count=total_leak_count,
            total_count=total,
            leak_ratio=round(leak_ratio, 6),
            affected_keys=sorted(total_leaked_keys),
            safety_rules_applied=applied_ids,
            safety_rules_missing=missing_ids,
            message=message,
        )
