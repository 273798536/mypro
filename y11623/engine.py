"""P2P历史兑付清算 - 核心处理引擎"""

from typing import Dict, List, Tuple
from datetime import datetime

from models import (
    Dataset, Investor, Contract, Voucher, Repayment, Dispute, AuditEntry,
    VoucherStatus, RepaymentStatus, RepaymentType, DisputeType, DisputeStatus,
)


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


class LiquidationEngine:
    """清算处理引擎"""

    def __init__(self, dataset: Dataset):
        self.ds = dataset

    def run_all(self) -> Dict[str, int]:
        """运行全部检测，返回各类争议计数"""
        results = {}
        results["identity_merge"] = self.detect_identity_merge()
        results["voucher_duplicate"] = self.detect_voucher_duplicates()
        results["interest_mismatch"] = self.detect_interest_mismatch()
        results["amount_mismatch"] = self.detect_amount_mismatch()
        results["missing_voucher"] = self.detect_missing_voucher()
        return results

    # ── 1. 身份归并 ──────────────────────────────────────
    def detect_identity_merge(self) -> int:
        """检测投资人更名/重复建档"""
        count = 0
        id_map: Dict[str, List[Investor]] = {}
        for inv in self.ds.investors.values():
            if inv.id_card:
                id_map.setdefault(inv.id_card, []).append(inv)

        for id_card, group in id_map.items():
            if len(group) > 1:
                names = [i.name for i in group]
                primary = group[0]
                for inv in group[1:]:
                    inv.merged_into = primary.investor_id
                    did = self.ds.next_dispute_id()
                    dispute = Dispute(
                        dispute_id=did,
                        related_entity_id=inv.investor_id,
                        related_entity_type="investor",
                        dispute_type=DisputeType.NAME_CHANGE,
                        description=f"投资人[{inv.name}](ID={inv.investor_id})与[{primary.name}](ID={primary.investor_id})身份证号一致({id_card})，疑似同一人更名",
                        evidence=[f"身份证号: {id_card}", f"涉及姓名: {', '.join(names)}"],
                        status=DisputeStatus.OPEN,
                        created_at=now_iso(),
                        resolution_notes=f"建议将{inv.name}归并到{primary.name}({primary.investor_id})"
                    )
                    self.ds.add_dispute(dispute)
                    self.ds.add_audit(AuditEntry(
                        timestamp=now_iso(),
                        entity_type="investor",
                        entity_id=inv.investor_id,
                        field="merged_into",
                        old_value="null",
                        new_value=primary.investor_id,
                        operator="system",
                        reason="身份证号匹配，检测到身份重复"
                    ))
                    count += 1
        return count

    # ── 2. 凭证去重 ──────────────────────────────────────
    def detect_voucher_duplicates(self) -> int:
        """检测重复凭证（按内容hash去重）"""
        count = 0
        hash_map: Dict[str, List[Voucher]] = {}
        for v in self.ds.vouchers.values():
            hash_map.setdefault(v.content_hash, []).append(v)

        for h, group in hash_map.items():
            if len(group) > 1:
                primary = group[0]
                for dup in group[1:]:
                    dup.status = VoucherStatus.DUPLICATE
                    dup.duplicate_of = primary.voucher_id
                    did = self.ds.next_dispute_id()
                    dispute = Dispute(
                        dispute_id=did,
                        related_entity_id=dup.voucher_id,
                        related_entity_type="voucher",
                        dispute_type=DisputeType.DUPLICATE_VOUCHER,
                        description=f"凭证[{dup.voucher_id}]与[{primary.voucher_id}]内容hash一致({h})，疑似重复扫描/重复录入",
                        evidence=[
                            f"重复凭证: {dup.voucher_id} ({dup.file_ref})",
                            f"原始凭证: {primary.voucher_id} ({primary.file_ref})",
                            f"内容hash: {h}"
                        ],
                        status=DisputeStatus.OPEN,
                        created_at=now_iso(),
                        resolution_notes=f"建议标记{dup.voucher_id}为重复，保留{primary.voucher_id}作为有效凭证"
                    )
                    self.ds.add_dispute(dispute)
                    self.ds.add_audit(AuditEntry(
                        timestamp=now_iso(),
                        entity_type="voucher",
                        entity_id=dup.voucher_id,
                        field="status",
                        old_value="valid",
                        new_value="duplicate",
                        operator="system",
                        reason=f"内容hash与{primary.voucher_id}一致，检测到重复凭证"
                    ))
                    count += 1

                    # 标记使用重复凭证的兑付记录为争议
                    for rep in self.ds.repayments.values():
                        if rep.voucher_id == dup.voucher_id:
                            old_status = rep.status.value
                            rep.status = RepaymentStatus.DISPUTED
                            self.ds.add_audit(AuditEntry(
                                timestamp=now_iso(),
                                entity_type="repayment",
                                entity_id=rep.repayment_id,
                                field="status",
                                old_value=old_status,
                                new_value="disputed",
                                operator="system",
                                reason=f"关联凭证{dup.voucher_id}被标记为重复"
                            ))
        return count

    # ── 3. 利息口径变化检测 ──────────────────────────────
    def detect_interest_mismatch(self) -> int:
        """检测实际兑付利息与合同利率是否一致"""
        count = 0
        for contract in self.ds.contracts.values():
            expected_interest = contract.principal_amount * contract.interest_rate
            actual_interest = 0.0
            for rep in self.ds.repayments.values():
                if (rep.contract_id == contract.contract_id
                        and rep.repayment_type == RepaymentType.INTEREST
                        and rep.status != RepaymentStatus.DISPUTED):
                    actual_interest += rep.amount

            if actual_interest > 0 and abs(expected_interest - actual_interest) > 0.01:
                did = self.ds.next_dispute_id()
                diff = actual_interest - expected_interest
                effective_rate = actual_interest / contract.principal_amount if contract.principal_amount else 0
                dispute = Dispute(
                    dispute_id=did,
                    related_entity_id=contract.contract_id,
                    related_entity_type="contract",
                    dispute_type=DisputeType.INTEREST_CHANGE,
                    description=f"合同[{contract.contract_id}]载明利率{contract.interest_rate*100:.2f}%，应兑付利息{expected_interest:.2f}元，实际兑付{actual_interest:.2f}元，差额{diff:+.2f}元，实际利率{effective_rate*100:.2f}%",
                    evidence=[
                        f"合同利率: {contract.interest_rate*100:.2f}%",
                        f"应兑付利息: {expected_interest:.2f}",
                        f"实际兑付利息: {actual_interest:.2f}",
                        f"差额: {diff:+.2f}",
                        f"实际利率: {effective_rate*100:.2f}%"
                    ],
                    status=DisputeStatus.OPEN,
                    created_at=now_iso(),
                    resolution_notes="需确认是否存在利率调整协议或口头约定"
                )
                self.ds.add_dispute(dispute)
                count += 1
        return count

    # ── 4. 金额不符检测 ──────────────────────────────────
    def detect_amount_mismatch(self) -> int:
        """检测兑付本金与合同本金不一致"""
        count = 0
        for contract in self.ds.contracts.values():
            actual_principal = 0.0
            for rep in self.ds.repayments.values():
                if (rep.contract_id == contract.contract_id
                        and rep.repayment_type == RepaymentType.PRINCIPAL
                        and rep.status != RepaymentStatus.DISPUTED):
                    actual_principal += rep.amount

            if actual_principal > 0 and abs(actual_principal - contract.principal_amount) > 0.01:
                did = self.ds.next_dispute_id()
                diff = actual_principal - contract.principal_amount
                dispute = Dispute(
                    dispute_id=did,
                    related_entity_id=contract.contract_id,
                    related_entity_type="contract",
                    dispute_type=DisputeType.AMOUNT_MISMATCH,
                    description=f"合同[{contract.contract_id}]本金{contract.principal_amount:.2f}元，实际兑付{actual_principal:.2f}元，差额{diff:+.2f}元",
                    evidence=[
                        f"合同本金: {contract.principal_amount:.2f}",
                        f"实际兑付本金: {actual_principal:.2f}",
                        f"差额: {diff:+.2f}"
                    ],
                    status=DisputeStatus.OPEN,
                    created_at=now_iso(),
                    resolution_notes="需确认是否部分兑付或合同金额有误"
                )
                self.ds.add_dispute(dispute)
                count += 1
        return count

    # ── 5. 凭证缺失检测 ──────────────────────────────────
    def detect_missing_voucher(self) -> int:
        """检测凭证引用丢失或状态异常"""
        count = 0
        for rep in self.ds.repayments.values():
            if rep.voucher_id:
                v = self.ds.vouchers.get(rep.voucher_id)
                if not v:
                    did = self.ds.next_dispute_id()
                    dispute = Dispute(
                        dispute_id=did,
                        related_entity_id=rep.repayment_id,
                        related_entity_type="repayment",
                        dispute_type=DisputeType.MISSING_VOUCHER,
                        description=f"兑付记录[{rep.repayment_id}]关联的凭证[{rep.voucher_id}]不存在于凭证库",
                        evidence=[f"兑付ID: {rep.repayment_id}", f"缺失凭证ID: {rep.voucher_id}"],
                        status=DisputeStatus.OPEN,
                        created_at=now_iso(),
                        resolution_notes="需补录凭证或确认兑付记录"
                    )
                    self.ds.add_dispute(dispute)
                    rep.status = RepaymentStatus.DISPUTED
                    count += 1
                elif v.status == VoucherStatus.INVALID:
                    did = self.ds.next_dispute_id()
                    dispute = Dispute(
                        dispute_id=did,
                        related_entity_id=rep.repayment_id,
                        related_entity_type="repayment",
                        dispute_type=DisputeType.MISSING_VOUCHER,
                        description=f"兑付记录[{rep.repayment_id}]关联的凭证[{rep.voucher_id}]状态为无效（文件丢失/引用异常）",
                        evidence=[
                            f"兑付ID: {rep.repayment_id}",
                            f"凭证ID: {rep.voucher_id}",
                            f"凭证文件引用: {v.file_ref}",
                            f"凭证备注: {v.notes}"
                        ],
                        status=DisputeStatus.OPEN,
                        created_at=now_iso(),
                        resolution_notes="需补充有效凭证文件或重新上传"
                    )
                    self.ds.add_dispute(dispute)
                    rep.status = RepaymentStatus.DISPUTED
                    count += 1
        return count

    # ── 6. 本息重算 ──────────────────────────────────────
    def recalculate(self) -> List[dict]:
        """按合同重算本息，返回核对结果"""
        results = []
        for contract in self.ds.contracts.values():
            investor = self.ds.investors.get(contract.investor_id)
            inv_name = investor.name if investor else "未知"

            actual_principal = 0.0
            actual_interest = 0.0
            for rep in self.ds.repayments.values():
                if rep.contract_id == contract.contract_id and rep.status != RepaymentStatus.DISPUTED:
                    if rep.repayment_type == RepaymentType.PRINCIPAL:
                        actual_principal += rep.amount
                    elif rep.repayment_type == RepaymentType.INTEREST:
                        actual_interest += rep.amount

            expected_interest = contract.principal_amount * contract.interest_rate
            principal_diff = actual_principal - contract.principal_amount
            interest_diff = actual_interest - expected_interest

            results.append({
                "contract_id": contract.contract_id,
                "investor": inv_name,
                "investor_id": contract.investor_id,
                "principal_expected": contract.principal_amount,
                "principal_actual": actual_principal,
                "principal_diff": round(principal_diff, 2),
                "principal_status": "ok" if abs(principal_diff) < 0.01 else "mismatch",
                "interest_expected": round(expected_interest, 2),
                "interest_actual": round(actual_interest, 2),
                "interest_diff": round(interest_diff, 2),
                "interest_status": "ok" if abs(interest_diff) < 0.01 else "mismatch",
                "contract_rate": f"{contract.interest_rate*100:.2f}%",
            })
        return results

    # ── 7. 投资人汇总 ────────────────────────────────────
    def investor_summary(self) -> List[dict]:
        """生成投资人维度的汇总"""
        summary = {}
        for contract in self.ds.contracts.values():
            inv = self.ds.investors.get(contract.investor_id)
            inv_name = inv.name if inv else "未知"

            actual_principal = 0.0
            actual_interest = 0.0
            disputed_amount = 0.0
            for rep in self.ds.repayments.values():
                if rep.contract_id == contract.contract_id:
                    if rep.status == RepaymentStatus.DISPUTED:
                        disputed_amount += rep.amount
                    elif rep.repayment_type == RepaymentType.PRINCIPAL:
                        actual_principal += rep.amount
                    elif rep.repayment_type == RepaymentType.INTEREST:
                        actual_interest += rep.amount

            key = contract.investor_id
            if key not in summary:
                summary[key] = {
                    "investor_id": key,
                    "investor_name": inv_name,
                    "total_contracts": 0,
                    "total_principal_expected": 0.0,
                    "total_principal_actual": 0.0,
                    "total_interest_actual": 0.0,
                    "total_disputed": 0.0,
                    "has_alias": bool(inv.aliases) if inv else False,
                    "merged_into": inv.merged_into if inv else None,
                }
            summary[key]["total_contracts"] += 1
            summary[key]["total_principal_expected"] += contract.principal_amount
            summary[key]["total_principal_actual"] += actual_principal
            summary[key]["total_interest_actual"] += actual_interest
            summary[key]["total_disputed"] += disputed_amount

        return list(summary.values())
