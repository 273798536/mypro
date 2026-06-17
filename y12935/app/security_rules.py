from __future__ import annotations

from typing import Dict, List

from .models import (
    EvalQuestion,
    QuestionCategory,
    SecurityRule,
    SecurityRuleCheck,
    SecurityRuleStatus,
)


DEFAULT_SECURITY_RULES: List[SecurityRule] = [
    SecurityRule(
        id="sec-rule-001",
        name="敏感词过滤校验",
        description="安全敏感类题目必须经过敏感词过滤",
        applies_to_categories=[QuestionCategory.SECURITY_SENSITIVE],
        configured=True,
        threshold=0.8,
    ),
    SecurityRule(
        id="sec-rule-002",
        name="医疗建议免责",
        description="医疗类题目输出必须附带免责声明",
        applies_to_categories=[QuestionCategory.MEDICAL],
        configured=True,
        threshold=0.9,
    ),
    SecurityRule(
        id="sec-rule-003",
        name="金融风险提示",
        description="金融类题目必须提示投资风险",
        applies_to_categories=[QuestionCategory.FINANCIAL],
        configured=False,
        threshold=0.85,
    ),
    SecurityRule(
        id="sec-rule-004",
        name="法律合规审查",
        description="法律类题目必须经过合规审查",
        applies_to_categories=[QuestionCategory.LEGAL],
        configured=True,
        threshold=0.9,
    ),
]


def build_rule_index(rules: List[SecurityRule]) -> Dict[str, SecurityRule]:
    return {r.id: r for r in rules}


def check_security_rules(
    question: EvalQuestion,
    rules: List[SecurityRule] = DEFAULT_SECURITY_RULES,
) -> List[SecurityRuleCheck]:
    checks: List[SecurityRuleCheck] = []
    rule_index = build_rule_index(rules)

    applicable_rules = [r for r in rules if question.category in r.applies_to_categories]

    if question.security_rule_id:
        explicit_rule = rule_index.get(question.security_rule_id)
        if explicit_rule is None:
            checks.append(
                SecurityRuleCheck(
                    rule_id=question.security_rule_id,
                    rule_name="未命名规则",
                    status=SecurityRuleStatus.MISSING,
                    message=f"题目指定规则 {question.security_rule_id} 在规则库中不存在，已造成漏配",
                )
            )
        else:
            if not explicit_rule.configured:
                checks.append(
                    SecurityRuleCheck(
                        rule_id=explicit_rule.id,
                        rule_name=explicit_rule.name,
                        status=SecurityRuleStatus.MISCONFIGURED,
                        message=f"规则 '{explicit_rule.name}' 已关闭/未配置阈值，但该类别题目仍依赖此规则进行审核，属于漏配",
                    )
                )
            else:
                checks.append(
                    SecurityRuleCheck(
                        rule_id=explicit_rule.id,
                        rule_name=explicit_rule.name,
                        status=SecurityRuleStatus.CONFIGURED,
                        message=f"规则 '{explicit_rule.name}' 已正确配置 (阈值={explicit_rule.threshold})",
                    )
                )

    for rule in applicable_rules:
        if question.security_rule_id and rule.id == question.security_rule_id:
            continue
        if not rule.configured:
            checks.append(
                SecurityRuleCheck(
                    rule_id=rule.id,
                    rule_name=rule.name,
                    status=SecurityRuleStatus.MISCONFIGURED,
                    message=f"题目属于 '{question.category.value}' 类别，但适用规则 '{rule.name}' 未配置/已关闭，存在漏配风险",
                )
            )
        else:
            checks.append(
                SecurityRuleCheck(
                    rule_id=rule.id,
                    rule_name=rule.name,
                    status=SecurityRuleStatus.CONFIGURED,
                    message=f"适用规则 '{rule.name}' 已正确配置",
                )
            )

    if question.category in {
        QuestionCategory.SECURITY_SENSITIVE,
        QuestionCategory.MEDICAL,
        QuestionCategory.FINANCIAL,
        QuestionCategory.LEGAL,
    } and not applicable_rules:
        checks.append(
            SecurityRuleCheck(
                rule_id=f"missing-category-rule-{question.category.value}",
                rule_name=f"{question.category.value} 类别规则缺失",
                status=SecurityRuleStatus.MISSING,
                message=f"题目属于 '{question.category.value}' 类别，但规则库中没有任何适用的安全规则，属于严重漏配",
            )
        )

    return checks


def has_rule_misconfig(checks: List[SecurityRuleCheck]) -> bool:
    return any(
        c.status in {SecurityRuleStatus.MISCONFIGURED, SecurityRuleStatus.MISSING}
        for c in checks
    )
