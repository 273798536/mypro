from typing import List, Dict, Tuple
from data.models import (
    TrainingRecord, SafetyRule, RetryDecision,
    RecordStatus, FailureCategory
)
from data.sample_data import build_safety_rules, build_question_bank_mapping


class SafetyRuleEngine:
    def __init__(self):
        self.rules: List[SafetyRule] = build_safety_rules()
        self.bank_mapping: Dict[str, List[str]] = build_question_bank_mapping()
        self._rule_index: Dict[str, SafetyRule] = {r.rule_id: r for r in self.rules}

    def get_rule(self, rule_id: str):
        return self._rule_index.get(rule_id)

    def get_rules_for_question_type(self, question_type: str) -> List[SafetyRule]:
        rule_ids = self.bank_mapping.get(question_type, [])
        return [self._rule_index[rid] for rid in rule_ids if rid in self._rule_index]

    def check_coverage(self, record: TrainingRecord) -> Tuple[bool, List[str]]:
        expected_rules = self.get_rules_for_question_type(record.question_type)
        expected_ids = {r.rule_id for r in expected_rules}
        actual_ids = set(record.safety_rule_ids)
        missing = expected_ids - actual_ids
        coverage_ok = len(missing) == 0
        details = []
        if missing:
            for rid in missing:
                rule = self.get_rule(rid)
                if rule:
                    details.append(
                        f"安全规则 [{rule.rule_id} {rule.rule_name}] 漏配："
                        f"该规则要求覆盖题型「{record.question_type}」，"
                        f"但当前记录未触发此规则"
                    )
        else:
            for rid in actual_ids:
                rule = self.get_rule(rid)
                if rule and rule.rule_id in expected_ids:
                    details.append(
                        f"安全规则 [{rule.rule_id} {rule.rule_name}] 已匹配，"
                        f"要求覆盖度 {rule.required_coverage * 100:.0f}%"
                    )
        return coverage_ok, details

    def check_bank_match(self, record: TrainingRecord) -> Tuple[bool, List[str]]:
        details = []
        if record.matched_question_bank:
            details.append(
                f"题型「{record.question_type}」与评测题库匹配一致"
            )
            return True, details
        expected_rules = self.get_rules_for_question_type(record.question_type)
        if expected_rules:
            for rule in expected_rules:
                details.append(
                    f"安全规则 [{rule.rule_id} {rule.rule_name}] 与评测题库不匹配："
                    f"规则版本要求的题型与当前评测题库中「{record.question_type}」"
                    f"的分类标签不一致，导致规则匹配失效"
                )
        else:
            details.append(
                f"题型「{record.question_type}」在评测题库映射中未找到对应安全规则配置"
            )
        return False, details

    def analyze_safety_issues(self, record: TrainingRecord) -> List[str]:
        issues = []
        if record.failure_category in (
            FailureCategory.SAFETY_RULE_MISSING,
            FailureCategory.SAFETY_RULE_MISMATCH,
        ):
            _, cov_details = self.check_coverage(record)
            issues.extend(cov_details)
            _, bank_details = self.check_bank_match(record)
            issues.extend(bank_details)
        return issues


class RetryEngine:
    def __init__(self, safety_engine: SafetyRuleEngine):
        self.safety = safety_engine

    def decide(self, record: TrainingRecord) -> RetryDecision:
        required_fixes = []
        safety_details = []
        can_retry = True
        reason_parts = []

        safety_issues = self.safety.analyze_safety_issues(record)
        safety_details.extend(safety_issues)

        if record.failure_category == FailureCategory.SAFETY_RULE_MISSING:
            can_retry = False
            reason_parts.append("安全规则漏配，不可直接重试")
            if safety_issues:
                required_fixes.append("补齐缺失的安全规则配置")
                required_fixes.append("确认题型与安全规则的映射关系")
            else:
                required_fixes.append("排查安全规则匹配逻辑")

        elif record.failure_category == FailureCategory.SAFETY_RULE_MISMATCH:
            if record.matched_question_bank:
                can_retry = True
                reason_parts.append("安全规则与题库已对齐，可重试")
            else:
                can_retry = False
                reason_parts.append("安全规则与评测题库不匹配，不可直接重试")
                required_fixes.append("同步安全规则版本与评测题库版本")
                required_fixes.append("重新校验题型分类标签")

        elif record.failure_category == FailureCategory.DATA_QUALITY:
            can_retry = False
            reason_parts.append("数据质量问题，需人工核查数据")
            required_fixes.append("检查训练数据格式与标注质量")

        elif record.failure_category == FailureCategory.RESOURCE_TIMEOUT:
            can_retry = True
            reason_parts.append("资源超时，可再次尝试")
            required_fixes.append("选择资源充足时段重试")

        else:
            can_retry = record.retry_count < 2
            if can_retry:
                reason_parts.append("未知原因，在重试次数内可尝试")
            else:
                reason_parts.append("未知原因且超过重试次数，需人工排查")
                required_fixes.append("人工查看训练日志定位根因")

        if record.retry_count >= 3:
            can_retry = False
            reason_parts.append("已达最大重试次数(3次)")

        if record.current_status == RecordStatus.BLOCKED and not safety_issues:
            pass
        elif record.current_status == RecordStatus.BLOCKED and record.retry_count >= 2:
            can_retry = False
            reason_parts.append("多次重试仍被拦截，判定为不可用")

        reason = "；".join(reason_parts) if reason_parts else "判定完成"
        return RetryDecision(
            record_id=record.record_id,
            can_retry=can_retry,
            reason=reason,
            required_fixes=required_fixes,
            safety_violation_details=safety_details,
        )

    def batch_decide(self, records: List[TrainingRecord]) -> Dict[str, RetryDecision]:
        return {r.record_id: self.decide(r) for r in records}
