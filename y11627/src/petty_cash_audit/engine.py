from __future__ import annotations

from .models import AuditResult
from .rules import AuditContext, DEFAULT_RULES, Rule
from .scorer import RiskScorer


class AuditEngine:
    """整合规则引擎与风险打分的主审计流程。"""

    def __init__(
        self,
        rules: list[Rule] | None = None,
        scorer: RiskScorer | None = None,
    ):
        self.rules = rules or DEFAULT_RULES
        self.scorer = scorer or RiskScorer()

    def run(self, data: AuditResult) -> AuditResult:
        ctx = AuditContext(
            reimbursements=data.reimbursements,
            invoices=data.invoices,
            loans=data.loans,
            projects=data.projects,
            approvers=data.approvers,
        )

        all_findings = []
        for rule in self.rules:
            all_findings.extend(rule.check(ctx))

        data.findings = all_findings
        data.risk_score = self.scorer.score(all_findings)
        return data
