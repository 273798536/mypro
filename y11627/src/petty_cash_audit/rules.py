from __future__ import annotations

from collections import Counter

from .models import (
    Approver,
    AuditFinding,
    FindingSeverity,
    Invoice,
    Loan,
    Project,
    Reimbursement,
    Source,
)


class Rule:
    rule_id: str = ""
    rule_name: str = ""

    def check(self, context: AuditContext) -> list[AuditFinding]:
        raise NotImplementedError


class AuditContext:
    def __init__(
        self,
        reimbursements: list[Reimbursement],
        invoices: list[Invoice],
        loans: list[Loan],
        projects: list[Project],
        approvers: list[Approver],
    ):
        self.reimbursements = reimbursements
        self.invoices = invoices
        self.loans = loans
        self.projects = projects
        self.approvers = approvers
        self._reimburse_map = {r.reimburse_id: r for r in reimbursements}
        self._approver_map = {a.name: a for a in approvers}
        self._project_map = {p.code: p for p in projects}

    def get_reimbursement(self, rid: str) -> Reimbursement | None:
        return self._reimburse_map.get(rid)

    def get_approver(self, name: str) -> Approver | None:
        return self._approver_map.get(name)

    def get_project(self, code: str) -> Project | None:
        return self._project_map.get(code)


# ------------------------------------------------------------------
# Rule 1: 同票据重复
# ------------------------------------------------------------------

class DuplicateInvoiceRule(Rule):
    rule_id = "R001"
    rule_name = "同票据重复"

    def check(self, ctx: AuditContext) -> list[AuditFinding]:
        findings: list[AuditFinding] = []
        inv_counter: Counter[str] = Counter()
        inv_sources: dict[str, list[Source]] = {}
        inv_reimburse: dict[str, list[str]] = {}

        for inv in ctx.invoices:
            key = inv.invoice_no
            inv_counter[key] += 1
            inv_sources.setdefault(key, []).append(inv.source)
            inv_reimburse.setdefault(key, []).append(inv.reimburse_id)

        for key, count in inv_counter.items():
            if count > 1:
                affected = list(set(inv_reimburse[key]))
                desc = (
                    f"票据号 {key} 在 {count} 张报销单中重复出现，"
                    f"涉及报销单: {', '.join(affected)}"
                )
                findings.append(
                    AuditFinding(
                        rule_id=self.rule_id,
                        rule_name=self.rule_name,
                        severity=FindingSeverity.HIGH,
                        description=desc,
                        sources=inv_sources[key],
                        data_refs={
                            "invoice_no": key,
                            "duplicate_count": count,
                            "reimburse_ids": affected,
                        },
                    )
                )
        return findings


# ------------------------------------------------------------------
# Rule 2: 借款未核销
# ------------------------------------------------------------------

class UnsettledLoanRule(Rule):
    rule_id = "R002"
    rule_name = "借款未核销"

    def check(self, ctx: AuditContext) -> list[AuditFinding]:
        findings: list[AuditFinding] = []
        for loan in ctx.loans:
            if loan.is_settled:
                continue

            reimburse = ctx.get_reimbursement(loan.reimburse_id)
            linked = (
                f"对应报销单 {loan.reimburse_id}"
                if reimburse
                else f"对应报销单 {loan.reimburse_id}（报销单未找到）"
            )
            desc = (
                f"借款人 {loan.borrower} 的借款 {loan.loan_id} "
                f"(金额 ¥{loan.amount:,.2f}) 至今未核销，{linked}"
            )
            findings.append(
                AuditFinding(
                    rule_id=self.rule_id,
                    rule_name=self.rule_name,
                    severity=FindingSeverity.HIGH,
                    description=desc,
                    sources=[loan.source],
                    data_refs={
                        "loan_id": loan.loan_id,
                        "borrower": loan.borrower,
                        "amount": loan.amount,
                        "reimburse_id": loan.reimburse_id,
                    },
                )
            )
        return findings


# ------------------------------------------------------------------
# Rule 3: 审批人越权
# ------------------------------------------------------------------

class ApproverAuthorizationRule(Rule):
    rule_id = "R003"
    rule_name = "审批人越权"

    def check(self, ctx: AuditContext) -> list[AuditFinding]:
        findings: list[AuditFinding] = []
        for r in ctx.reimbursements:
            approver = ctx.get_approver(r.approver)
            if approver is None:
                desc = (
                    f"报销单 {r.reimburse_id} 的审批人 {r.approver} "
                    f"未在审批人清单中登记"
                )
                findings.append(
                    AuditFinding(
                        rule_id=self.rule_id,
                        rule_name=self.rule_name,
                        severity=FindingSeverity.MEDIUM,
                        description=desc,
                        sources=[r.source],
                        data_refs={
                            "reimburse_id": r.reimburse_id,
                            "approver": r.approver,
                            "amount": r.amount,
                        },
                    )
                )
                continue

            if r.amount > approver.max_amount:
                desc = (
                    f"报销单 {r.reimburse_id} 金额 ¥{r.amount:,.2f} "
                    f"超出审批人 {approver.name} (级别 {approver.level}) "
                    f"的审批权限 ¥{approver.max_amount:,.2f}"
                )
                findings.append(
                    AuditFinding(
                        rule_id=self.rule_id,
                        rule_name=self.rule_name,
                        severity=FindingSeverity.CRITICAL,
                        description=desc,
                        sources=[r.source, approver.source],
                        data_refs={
                            "reimburse_id": r.reimburse_id,
                            "approver": approver.name,
                            "approver_level": approver.level,
                            "amount": r.amount,
                            "max_amount": approver.max_amount,
                            "overage": r.amount - approver.max_amount,
                        },
                    )
                )
        return findings


# ------------------------------------------------------------------
# Rule 4: 票据金额与报销单金额不一致
# ------------------------------------------------------------------

class InvoiceAmountMismatchRule(Rule):
    rule_id = "R004"
    rule_name = "票据金额与报销单金额不一致"

    def check(self, ctx: AuditContext) -> list[AuditFinding]:
        findings: list[AuditFinding] = []
        reimburse_invoices: dict[str, list[Invoice]] = {}
        for inv in ctx.invoices:
            reimburse_invoices.setdefault(inv.reimburse_id, []).append(inv)

        for rid, invs in reimburse_invoices.items():
            total = sum(i.amount for i in invs)
            reimburse = ctx.get_reimbursement(rid)
            if reimburse and abs(total - reimburse.amount) > 0.01:
                desc = (
                    f"报销单 {rid} 票据合计 ¥{total:,.2f} "
                    f"与报销金额 ¥{reimburse.amount:,.2f} 不一致"
                )
                findings.append(
                    AuditFinding(
                        rule_id=self.rule_id,
                        rule_name=self.rule_name,
                        severity=FindingSeverity.MEDIUM,
                        description=desc,
                        sources=[reimburse.source] + [i.source for i in invs],
                        data_refs={
                            "reimburse_id": rid,
                            "invoice_total": total,
                            "reimburse_amount": reimburse.amount,
                            "diff": round(total - reimburse.amount, 2),
                        },
                    )
                )
        return findings


# ------------------------------------------------------------------
# Rule 5: 报销单无对应票据
# ------------------------------------------------------------------

class MissingInvoiceRule(Rule):
    rule_id = "R005"
    rule_name = "报销单无对应票据"

    def check(self, ctx: AuditContext) -> list[AuditFinding]:
        findings: list[AuditFinding] = []
        reimburse_invoice_ids: set[str] = {inv.reimburse_id for inv in ctx.invoices}
        for r in ctx.reimbursements:
            if r.reimburse_id not in reimburse_invoice_ids:
                desc = f"报销单 {r.reimburse_id} 未找到对应票据"
                findings.append(
                    AuditFinding(
                        rule_id=self.rule_id,
                        rule_name=self.rule_name,
                        severity=FindingSeverity.MEDIUM,
                        description=desc,
                        sources=[r.source],
                        data_refs={
                            "reimburse_id": r.reimburse_id,
                            "amount": r.amount,
                        },
                    )
                )
        return findings


# ------------------------------------------------------------------
# Rule 6: 项目编码不存在
# ------------------------------------------------------------------

class ProjectCodeRule(Rule):
    rule_id = "R006"
    rule_name = "项目编码不存在"

    def check(self, ctx: AuditContext) -> list[AuditFinding]:
        findings: list[AuditFinding] = []
        for r in ctx.reimbursements:
            project = ctx.get_project(r.project_code)
            if project is None:
                desc = (
                    f"报销单 {r.reimburse_id} 引用的项目编码 "
                    f"{r.project_code} 未在项目清单中登记"
                )
                findings.append(
                    AuditFinding(
                        rule_id=self.rule_id,
                        rule_name=self.rule_name,
                        severity=FindingSeverity.MEDIUM,
                        description=desc,
                        sources=[r.source],
                        data_refs={
                            "reimburse_id": r.reimburse_id,
                            "project_code": r.project_code,
                        },
                    )
                )
        return findings


DEFAULT_RULES: list[Rule] = [
    DuplicateInvoiceRule(),
    UnsettledLoanRule(),
    ApproverAuthorizationRule(),
    InvoiceAmountMismatchRule(),
    MissingInvoiceRule(),
    ProjectCodeRule(),
]
