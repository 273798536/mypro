from __future__ import annotations

from datetime import date
from typing import Optional

from franchise_deposit.models import (
    AdFundDeduction,
    AdDeductionStatus,
    BreachPenalty,
    ClearanceConclusion,
    ClearanceResult,
    DepositLedger,
    EvidenceLink,
    FranchiseContract,
    StoreChangeApplication,
    StoreChangeStatus,
)


class ClearanceEngine:
    def __init__(
        self,
        contracts: list[FranchiseContract],
        ledgers: list[DepositLedger],
        store_changes: list[StoreChangeApplication],
        breach_penalties: list[BreachPenalty],
        ad_deductions: list[AdFundDeduction],
        reference_date: Optional[date] = None,
    ):
        self.contracts = contracts
        self.ledgers = ledgers
        self.store_changes = store_changes
        self.breach_penalties = breach_penalties
        self.ad_deductions = ad_deductions
        self.reference_date = reference_date or date.today()

        self._contracts_by_franchisee: dict[str, list[FranchiseContract]] = {}
        for c in self.contracts:
            self._contracts_by_franchisee.setdefault(c.franchisee_id, []).append(c)
        for fid in self._contracts_by_franchisee:
            self._contracts_by_franchisee[fid].sort(key=lambda c: c.effective_date)

        self._ledgers_by_franchisee: dict[str, DepositLedger] = {
            l.franchisee_id: l for l in self.ledgers
        }
        self._store_changes_by_franchisee: dict[str, list[StoreChangeApplication]] = {}
        for sc in self.store_changes:
            self._store_changes_by_franchisee.setdefault(sc.franchisee_id, []).append(sc)
        self._breach_by_franchisee: dict[str, list[BreachPenalty]] = {}
        for bp in self.breach_penalties:
            self._breach_by_franchisee.setdefault(bp.franchisee_id, []).append(bp)
        self._ad_by_franchisee: dict[str, list[AdFundDeduction]] = {}
        for ad in self.ad_deductions:
            self._ad_by_franchisee.setdefault(ad.franchisee_id, []).append(ad)

    def get_all_franchisee_ids(self) -> list[str]:
        ids: set[str] = set()
        ids.update(c.franchisee_id for c in self.contracts)
        ids.update(l.franchisee_id for l in self.ledgers)
        return sorted(ids)

    def run(self) -> list[ClearanceResult]:
        results: list[ClearanceResult] = []
        for fid in self.get_all_franchisee_ids():
            result = self._clear_franchisee(fid)
            results.append(result)
        return results

    def _find_applicable_contract(self, franchisee_id: str) -> Optional[FranchiseContract]:
        contracts = self._contracts_by_franchisee.get(franchisee_id, [])
        applicable = [c for c in contracts if c.effective_date <= self.reference_date]
        if not applicable:
            return contracts[0] if contracts else None
        return applicable[-1]

    def _find_all_contracts(self, franchisee_id: str) -> list[FranchiseContract]:
        return self._contracts_by_franchisee.get(franchisee_id, [])

    def _clear_franchisee(self, franchisee_id: str) -> ClearanceResult:
        applied_contract = self._find_applicable_contract(franchisee_id)
        all_contracts = self._find_all_contracts(franchisee_id)
        ledger = self._ledgers_by_franchisee.get(franchisee_id)
        store_changes = self._store_changes_by_franchisee.get(franchisee_id, [])
        breaches = self._breach_by_franchisee.get(franchisee_id, [])
        ad_deductions = self._ad_by_franchisee.get(franchisee_id, [])

        evidence_chain: list[EvidenceLink] = []
        detail_notes: list[str] = []

        contract_deposit_standard = applied_contract.deposit_standard if applied_contract else 0.0
        ledger_balance = ledger.closing_balance if ledger else 0.0

        if applied_contract:
            evidence_chain.append(
                EvidenceLink(
                    source_type="contract",
                    source_id=applied_contract.contract_id,
                    description=f"适用合同 {applied_contract.contract_id}，版本 {applied_contract.version}，保证金标准 {applied_contract.deposit_standard}",
                    contract_version=applied_contract.version,
                    raw_data={"deposit_standard": applied_contract.deposit_standard, "version": applied_contract.version},
                )
            )

        if ledger:
            evidence_chain.append(
                EvidenceLink(
                    source_type="ledger",
                    source_id=franchisee_id,
                    description=f"保证金账本期初余额 {ledger.opening_balance}，期末余额 {ledger.closing_balance}，共 {len(ledger.entries)} 笔流水",
                    contract_version="",
                    raw_data={"opening_balance": ledger.opening_balance, "closing_balance": ledger.closing_balance, "entry_count": len(ledger.entries)},
                )
            )

        total_breach_deduction = 0.0
        for bp in breaches:
            total_breach_deduction += bp.penalty_amount
            evidence_chain.append(
                EvidenceLink(
                    source_type="breach_penalty",
                    source_id=bp.penalty_id,
                    description=f"违约扣款 {bp.penalty_amount}（{bp.breach_type.value}），按合同版本 {bp.contract_version}，{'有争议' if bp.disputed else '无争议'}",
                    contract_version=bp.contract_version,
                    raw_data={"amount": bp.penalty_amount, "breach_type": bp.breach_type.value, "disputed": bp.disputed},
                )
            )
            if bp.disputed:
                detail_notes.append(
                    f"违约扣款 {bp.penalty_id} 存在争议（{bp.breach_type.value}，金额 {bp.penalty_amount}），按合同版本 {bp.contract_version} 计算，需人工核实"
                )

        total_ad_deduction = 0.0
        superseded_ids: set[str] = set()
        for ad in ad_deductions:
            if ad.superseded_by:
                superseded_ids.add(ad.deduction_id)
        for ad in ad_deductions:
            if ad.status == AdDeductionStatus.SUPERSEDED or ad.deduction_id in superseded_ids:
                evidence_chain.append(
                    EvidenceLink(
                        source_type="ad_deduction_superseded",
                        source_id=ad.deduction_id,
                        description=f"广告基金抵扣 {ad.deduction_id} 已被 {ad.superseded_by} 替代（原金额 {ad.deduction_amount}，版本 {ad.contract_version}），保留为历史证据",
                        contract_version=ad.contract_version,
                        raw_data={"amount": ad.deduction_amount, "superseded_by": ad.superseded_by, "version": ad.contract_version},
                    )
                )
                detail_notes.append(
                    f"广告基金抵扣 {ad.deduction_id}（金额 {ad.deduction_amount}，合同版本 {ad.contract_version}）已被新版本替代，原记录保留为证据"
                )
                continue
            if ad.status == AdDeductionStatus.APPLIED:
                total_ad_deduction += ad.deduction_amount
                evidence_chain.append(
                    EvidenceLink(
                        source_type="ad_deduction",
                        source_id=ad.deduction_id,
                        description=f"广告基金抵扣 {ad.deduction_amount}（版本 {ad.contract_version}）",
                        contract_version=ad.contract_version,
                        raw_data={"amount": ad.deduction_amount, "version": ad.contract_version},
                    )
                )
            elif ad.status == AdDeductionStatus.REVERSED:
                evidence_chain.append(
                    EvidenceLink(
                        source_type="ad_deduction_reversed",
                        source_id=ad.deduction_id,
                        description=f"广告基金抵扣 {ad.deduction_id} 已冲回（原金额 {ad.deduction_amount}，版本 {ad.contract_version}）",
                        contract_version=ad.contract_version,
                        raw_data={"amount": ad.deduction_amount, "version": ad.contract_version},
                    )
                )

        total_store_change_transfer = 0.0
        for sc in store_changes:
            evidence_chain.append(
                EvidenceLink(
                    source_type="store_change",
                    source_id=sc.application_id,
                    description=f"换店申请 {sc.application_id}：{sc.original_store} → {sc.new_store}，转存金额 {sc.transfer_amount}，状态 {sc.status.value}，申请时合同版本 {sc.contract_version_at_application}",
                    contract_version=sc.contract_version_at_application,
                    raw_data={"transfer_amount": sc.transfer_amount, "status": sc.status.value, "version": sc.contract_version_at_application},
                )
            )
            if sc.status == StoreChangeStatus.APPROVED:
                total_store_change_transfer += sc.transfer_amount
            elif sc.status == StoreChangeStatus.REJECTED:
                detail_notes.append(
                    f"换店申请 {sc.application_id}（{sc.original_store} → {sc.new_store}）已被驳回，转存金额 {sc.transfer_amount} 未计入，原因：{sc.reason or '未注明'}"
                )
            elif sc.status == StoreChangeStatus.PENDING:
                detail_notes.append(
                    f"换店申请 {sc.application_id}（{sc.original_store} → {sc.new_store}）仍在审批中，转存金额 {sc.transfer_amount} 暂未计入"
                )

        expected_balance = contract_deposit_standard
        actual_balance = ledger_balance

        expected_after_deductions = contract_deposit_standard - total_breach_deduction - total_ad_deduction + total_store_change_transfer
        discrepancy = actual_balance - expected_after_deductions

        contract_conclusion = ClearanceConclusion.MATCH
        if not applied_contract or not ledger:
            contract_conclusion = ClearanceConclusion.INSUFFICIENT_DATA
        elif abs(discrepancy) > 0.01:
            contract_conclusion = ClearanceConclusion.MISMATCH
        else:
            contract_conclusion = ClearanceConclusion.MATCH

        for c in all_contracts:
            if c.version != (applied_contract.version if applied_contract else ""):
                evidence_chain.append(
                    EvidenceLink(
                        source_type="contract_history",
                        source_id=c.contract_id,
                        description=f"历史合同版本 {c.version}（{c.effective_date} 至 {c.expiry_date}），保证金标准 {c.deposit_standard}，违约扣款率 {c.breach_penalty_rate}，广告基金率 {c.ad_fund_rate}",
                        contract_version=c.version,
                        raw_data={"deposit_standard": c.deposit_standard, "breach_penalty_rate": c.breach_penalty_rate, "ad_fund_rate": c.ad_fund_rate},
                    )
                )

        if contract_conclusion == ClearanceConclusion.MISMATCH and store_changes:
            for sc in store_changes:
                if sc.status in (StoreChangeStatus.REJECTED, StoreChangeStatus.PENDING):
                    evidence_chain.append(
                        EvidenceLink(
                            source_type="supplementary_evidence",
                            source_id=sc.application_id,
                            description=f"合同与流水结论不一致，换店申请 {sc.application_id} 作为补充证据保留（状态：{sc.status.value}，转存金额 {sc.transfer_amount}）",
                            contract_version=sc.contract_version_at_application,
                            raw_data={"status": sc.status.value, "transfer_amount": sc.transfer_amount},
                        )
                    )

        if ledger and applied_contract:
            deduction_order = self._build_deduction_order(breaches, ad_deductions, store_changes, applied_contract)
            for i, step in enumerate(deduction_order, 1):
                evidence_chain.append(
                    EvidenceLink(
                        source_type="deduction_order",
                        source_id=f"step_{i}",
                        description=f"扣款顺序第 {i} 步：{step}",
                        contract_version=applied_contract.version,
                    )
                )

        plain_summary = self._build_plain_summary(
            franchisee_id=franchisee_id,
            applied_contract=applied_contract,
            ledger=ledger,
            contract_conclusion=contract_conclusion,
            discrepancy=discrepancy,
            total_breach_deduction=total_breach_deduction,
            total_ad_deduction=total_ad_deduction,
            total_store_change_transfer=total_store_change_transfer,
            store_changes=store_changes,
            breaches=breaches,
        )

        return ClearanceResult(
            franchisee_id=franchisee_id,
            conclusion=contract_conclusion,
            contract_deposit_standard=contract_deposit_standard,
            ledger_closing_balance=ledger_balance,
            discrepancy_amount=discrepancy,
            evidence_chain=evidence_chain,
            breach_penalties=breaches,
            ad_deductions=ad_deductions,
            store_changes=store_changes,
            applied_contract=applied_contract,
            plain_language_summary=plain_summary,
            detail_notes=detail_notes,
        )

    def _build_deduction_order(
        self,
        breaches: list[BreachPenalty],
        ad_deductions: list[AdFundDeduction],
        store_changes: list[StoreChangeApplication],
        contract: FranchiseContract,
    ) -> list[str]:
        steps: list[str] = []
        steps.append(f"保证金标准 {contract.deposit_standard}（合同版本 {contract.version}）")
        for bp in sorted(breaches, key=lambda b: b.penalty_date):
            steps.append(f"违约扣款 -{bp.penalty_amount}（{bp.breach_type.value}，{bp.penalty_date}）")
        for ad in sorted(ad_deductions, key=lambda a: a.deduction_date):
            if ad.status == AdDeductionStatus.APPLIED:
                steps.append(f"广告基金抵扣 -{ad.deduction_amount}（{ad.deduction_date}，版本 {ad.contract_version}）")
        for sc in sorted(store_changes, key=lambda s: s.application_date):
            if sc.status == StoreChangeStatus.APPROVED:
                steps.append(f"换店转存 +{sc.transfer_amount}（{sc.original_store} → {sc.new_store}，{sc.application_date}）")
        return steps

    def _build_plain_summary(
        self,
        franchisee_id: str,
        applied_contract: Optional[FranchiseContract],
        ledger: Optional[DepositLedger],
        contract_conclusion: ClearanceConclusion,
        discrepancy: float,
        total_breach_deduction: float,
        total_ad_deduction: float,
        total_store_change_transfer: float,
        store_changes: list[StoreChangeApplication],
        breaches: list[BreachPenalty],
    ) -> str:
        lines: list[str] = []
        lines.append(f"加盟商 {franchisee_id} 保证金清算结果：")

        if contract_conclusion == ClearanceConclusion.INSUFFICIENT_DATA:
            if not applied_contract:
                lines.append("  ⚠ 未找到适用合同，无法完成清算。")
            if not ledger:
                lines.append("  ⚠ 未找到保证金流水记录，无法完成清算。")
            return "\n".join(lines)

        ver = applied_contract.version
        lines.append(f"  适用合同版本：{ver}")
        lines.append(f"  合同保证金标准：{applied_contract.deposit_standard}")
        if total_breach_deduction > 0:
            lines.append(f"  违约扣款合计：-{total_breach_deduction}")
        if total_ad_deduction > 0:
            lines.append(f"  广告基金抵扣合计：-{total_ad_deduction}")
        if total_store_change_transfer > 0:
            lines.append(f"  换店转存合计：+{total_store_change_transfer}")

        expected = applied_contract.deposit_standard - total_breach_deduction - total_ad_deduction + total_store_change_transfer
        lines.append(f"  计算应收余额：{expected}")
        lines.append(f"  账本实际余额：{ledger.closing_balance}")

        if contract_conclusion == ClearanceConclusion.MATCH:
            lines.append("  ✅ 清算一致，合同与流水吻合。")
        else:
            lines.append(f"  ❌ 清算不一致，差额 {discrepancy:+.2f}，需人工核实。")

        for sc in store_changes:
            if sc.status == StoreChangeStatus.REJECTED:
                lines.append(f"  💡 换店转存未通过：申请 {sc.application_id}（{sc.original_store} → {sc.new_store}）被驳回，转存金额 {sc.transfer_amount} 未计入保证金。驳回原因：{sc.reason or '未注明'}。这意味着该加盟商的保证金中没有包含这次换店的转存款，如果对驳回有疑问，请核实当时的审批记录。")
            elif sc.status == StoreChangeStatus.PENDING:
                lines.append(f"  💡 换店转存待审批：申请 {sc.application_id}（{sc.original_store} → {sc.new_store}）仍在审批中，金额 {sc.transfer_amount} 暂未计入，审批结果可能影响最终余额。")

        for bp in breaches:
            if bp.disputed:
                lines.append(f"  ⚠ 违约扣款争议：{bp.breach_type.value}，金额 {bp.penalty_amount}，按合同版本 {bp.contract_version} 计算，存在争议需核实。")

        return "\n".join(lines)
