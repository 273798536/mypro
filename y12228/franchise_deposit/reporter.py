from __future__ import annotations

import json
from dataclasses import asdict
from datetime import date, datetime
from pathlib import Path
from typing import Any

from franchise_deposit.models import (
    AdFundDeduction,
    BreachPenalty,
    ClearanceConclusion,
    ClearanceResult,
    EvidenceLink,
    FranchiseContract,
    StoreChangeApplication,
)


class Reporter:
    def __init__(self, results: list[ClearanceResult], output_dir: Path):
        self.results = results
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def print_terminal_summary(self) -> None:
        total = len(self.results)
        match_count = sum(1 for r in self.results if r.conclusion == ClearanceConclusion.MATCH)
        mismatch_count = sum(1 for r in self.results if r.conclusion == ClearanceConclusion.MISMATCH)
        insufficient_count = sum(1 for r in self.results if r.conclusion == ClearanceConclusion.INSUFFICIENT_DATA)

        print("=" * 64)
        print("  连锁加盟保证金清算 · 终端摘要")
        print("=" * 64)
        print(f"  清算日期：{date.today().isoformat()}")
        print(f"  加盟商总数：{total}")
        print(f"  ✅ 一致：{match_count}")
        print(f"  ❌ 不一致：{mismatch_count}")
        print(f"  ⚠  数据不足：{insufficient_count}")
        print("-" * 64)

        for r in self.results:
            status_icon = {
                ClearanceConclusion.MATCH: "✅",
                ClearanceConclusion.MISMATCH: "❌",
                ClearanceConclusion.INSUFFICIENT_DATA: "⚠",
            }.get(r.conclusion, "?")
            ver = r.applied_contract.version if r.applied_contract else "无"
            print(f"  {status_icon} 加盟商 {r.franchisee_id} ｜ 合同版本 {ver} ｜ 保证金标准 {r.contract_deposit_standard} ｜ 账本余额 {r.ledger_closing_balance} ｜ 差额 {r.discrepancy_amount:+.2f}")

            if r.breach_penalties:
                for bp in r.breach_penalties:
                    dispute_flag = "（有争议）" if bp.disputed else ""
                    print(f"     - 违约扣款：{bp.breach_type.value} {bp.penalty_amount}{dispute_flag}")

            if r.ad_deductions:
                for ad in r.ad_deductions:
                    superseded_flag = "（已被替代）" if ad.status.value == "superseded" else ""
                    print(f"     - 广告抵扣：{ad.deduction_amount} 版本 {ad.contract_version}{superseded_flag}")

            if r.store_changes:
                for sc in r.store_changes:
                    print(f"     - 换店申请：{sc.original_store} → {sc.new_store}，转存 {sc.transfer_amount}，状态 {sc.status.value}")

        print("=" * 64)

    def write_detail_report(self) -> Path:
        report_path = self.output_dir / "clearance_detail_report.json"
        report_data = {
            "report_title": "连锁加盟保证金清算详细报告",
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "total_franchisees": len(self.results),
                "match_count": sum(1 for r in self.results if r.conclusion == ClearanceConclusion.MATCH),
                "mismatch_count": sum(1 for r in self.results if r.conclusion == ClearanceConclusion.MISMATCH),
                "insufficient_data_count": sum(1 for r in self.results if r.conclusion == ClearanceConclusion.INSUFFICIENT_DATA),
            },
            "results": [self._serialize_result(r) for r in self.results],
        }
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)
        return report_path

    def write_plain_report(self) -> Path:
        report_path = self.output_dir / "clearance_plain_report.txt"
        with open(report_path, "w", encoding="utf-8") as f:
            f.write("连锁加盟保证金清算报告（人话版）\n")
            f.write(f"生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
            f.write("=" * 60 + "\n\n")

            for r in self.results:
                f.write(f"【加盟商 {r.franchisee_id}】\n")
                f.write(r.plain_language_summary)
                f.write("\n\n")

                if r.evidence_chain:
                    f.write("  证据链（可追溯）：\n")
                    for ev in r.evidence_chain:
                        f.write(f"    · [{ev.source_type}] {ev.description}\n")
                    f.write("\n")

                if r.detail_notes:
                    f.write("  需关注事项：\n")
                    for note in r.detail_notes:
                        f.write(f"    · {note}\n")
                    f.write("\n")

                f.write("-" * 60 + "\n\n")

            f.write("报告结束\n")
        return report_path

    def write_evidence_trail(self) -> Path:
        report_path = self.output_dir / "evidence_trail.json"
        trail_data = []
        for r in self.results:
            trail_data.append({
                "franchisee_id": r.franchisee_id,
                "conclusion": r.conclusion.value,
                "evidence_chain": [
                    {
                        "source_type": ev.source_type,
                        "source_id": ev.source_id,
                        "description": ev.description,
                        "contract_version": ev.contract_version,
                        "raw_data": ev.raw_data,
                    }
                    for ev in r.evidence_chain
                ],
                "deduction_order_trace": [
                    {
                        "step": i + 1,
                        "description": ev.description,
                    }
                    for i, ev in enumerate(r.evidence_chain)
                    if ev.source_type == "deduction_order"
                ],
                "contract_version_trace": [
                    {
                        "version": ev.contract_version,
                        "description": ev.description,
                    }
                    for ev in r.evidence_chain
                    if ev.source_type in ("contract", "contract_history")
                ],
            })
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(trail_data, f, ensure_ascii=False, indent=2)
        return report_path

    def _serialize_result(self, r: ClearanceResult) -> dict[str, Any]:
        return {
            "franchisee_id": r.franchisee_id,
            "conclusion": r.conclusion.value,
            "contract_deposit_standard": r.contract_deposit_standard,
            "ledger_closing_balance": r.ledger_closing_balance,
            "discrepancy_amount": r.discrepancy_amount,
            "applied_contract": self._serialize_contract(r.applied_contract) if r.applied_contract else None,
            "breach_penalties": [self._serialize_breach(bp) for bp in r.breach_penalties],
            "ad_deductions": [self._serialize_ad(ad) for ad in r.ad_deductions],
            "store_changes": [self._serialize_store_change(sc) for sc in r.store_changes],
            "evidence_chain": [
                {
                    "source_type": ev.source_type,
                    "source_id": ev.source_id,
                    "description": ev.description,
                    "contract_version": ev.contract_version,
                    "raw_data": ev.raw_data,
                }
                for ev in r.evidence_chain
            ],
            "plain_language_summary": r.plain_language_summary,
            "detail_notes": r.detail_notes,
        }

    def _serialize_contract(self, c: FranchiseContract) -> dict[str, Any]:
        return {
            "contract_id": c.contract_id,
            "version": c.version,
            "deposit_standard": c.deposit_standard,
            "effective_date": c.effective_date.isoformat(),
            "expiry_date": c.expiry_date.isoformat(),
            "breach_penalty_rate": c.breach_penalty_rate,
            "ad_fund_rate": c.ad_fund_rate,
            "allows_store_change": c.allows_store_change,
            "store_change_fee": c.store_change_fee,
        }

    def _serialize_breach(self, bp: BreachPenalty) -> dict[str, Any]:
        return {
            "penalty_id": bp.penalty_id,
            "breach_type": bp.breach_type.value,
            "penalty_date": bp.penalty_date.isoformat(),
            "penalty_amount": bp.penalty_amount,
            "contract_version": bp.contract_version,
            "disputed": bp.disputed,
            "description": bp.description,
        }

    def _serialize_ad(self, ad: AdFundDeduction) -> dict[str, Any]:
        return {
            "deduction_id": ad.deduction_id,
            "deduction_date": ad.deduction_date.isoformat(),
            "deduction_amount": ad.deduction_amount,
            "contract_version": ad.contract_version,
            "status": ad.status.value,
            "superseded_by": ad.superseded_by,
            "description": ad.description,
        }

    def _serialize_store_change(self, sc: StoreChangeApplication) -> dict[str, Any]:
        return {
            "application_id": sc.application_id,
            "original_store": sc.original_store,
            "new_store": sc.new_store,
            "application_date": sc.application_date.isoformat(),
            "approval_date": sc.approval_date.isoformat() if sc.approval_date else None,
            "status": sc.status.value,
            "transfer_amount": sc.transfer_amount,
            "contract_version_at_application": sc.contract_version_at_application,
            "reason": sc.reason,
        }
