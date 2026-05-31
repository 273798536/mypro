from datetime import date
from typing import Dict, List, Tuple

from .models import (
    ChannelDeduction,
    Contract,
    ContractSnapshot,
    DistributionChannel,
    RightsHolder,
    RoyaltyRecord,
    RoyaltyType,
    SplitResult,
    ValidationIssue,
)


class RoyaltySplitter:
    def __init__(self, rights_holders: Dict[str, RightsHolder]):
        self.rights_holders = rights_holders

    def split_record(
        self, record: RoyaltyRecord
    ) -> Tuple[List[SplitResult], List[ValidationIssue]]:
        results: List[SplitResult] = []
        issues: List[ValidationIssue] = []

        total_deduction = 0.0
        for d in record.deductions:
            if d.amount > 0:
                total_deduction += d.amount
            elif d.percentage > 0:
                total_deduction += record.revenue * (d.percentage / 100)
        net_revenue = record.revenue - total_deduction

        for contract in record.contracts:
            rh = self.rights_holders.get(contract.rights_holder_id)
            rh_name = rh.name if rh else f"未知权利人({contract.rights_holder_id})"

            contract_amount = net_revenue * (contract.percentage / 100)

            snapshot = ContractSnapshot(
                contract_id=contract.id,
                rights_holder_name=rh_name,
                royalty_type=contract.royalty_type.value,
                percentage=contract.percentage,
                effective_date=contract.effective_date.isoformat(),
                expiry_date=(
                    contract.expiry_date.isoformat() if contract.expiry_date else "永久"
                ),
                source_file=contract.source_file,
            )

            source_refs = [
                f"版税报告:{record.source_file}",
                f"合同:{contract.source_file}",
            ]
            for ded in record.deductions:
                source_refs.append(f"渠道扣费:{ded.source_file}")

            result = SplitResult(
                record_id=record.id,
                rights_holder_id=contract.rights_holder_id,
                rights_holder_name=rh_name,
                royalty_type=contract.royalty_type.value,
                original_amount=record.revenue,
                deduction_amount=total_deduction,
                net_amount=net_revenue,
                contract_percentage=contract.percentage,
                final_amount=round(contract_amount, 2),
                contract_snapshot=snapshot.__dict__,
                source_refs=source_refs,
            )
            results.append(result)

        return results, issues

    def validate_record(self, record: RoyaltyRecord) -> List[ValidationIssue]:
        issues: List[ValidationIssue] = []

        total_pct = sum(c.percentage for c in record.contracts)
        if total_pct > 100:
            issues.append(
                ValidationIssue(
                    record_id=record.id,
                    track_name=record.track_name,
                    issue_type="比例超百",
                    severity="ERROR",
                    message=(
                        f"合同比例总和 {total_pct}% 超过100%，"
                        f"涉及 {len(record.contracts)} 份合同"
                    ),
                    source_refs=[f"合同:{c.source_file}" for c in record.contracts],
                )
            )

        report_date = record.report_date
        for contract in record.contracts:
            if contract.expiry_date and contract.expiry_date < report_date:
                rh = self.rights_holders.get(contract.rights_holder_id)
                rh_name = rh.name if rh else "未知"
                issues.append(
                    ValidationIssue(
                        record_id=record.id,
                        track_name=record.track_name,
                        issue_type="合同过期",
                        severity="WARNING",
                        message=(
                            f"权利人[{rh_name}]的合同于 "
                            f"{contract.expiry_date.isoformat()} 过期，"
                            f"报告日期为 {report_date.isoformat()}"
                        ),
                        source_refs=[f"合同:{contract.source_file}"],
                    )
                )

        for ded in record.deductions:
            if ded.percentage > 0 and ded.amount > 0:
                calc_amount = record.revenue * (ded.percentage / 100)
                if abs(calc_amount - ded.amount) > 0.01:
                    issues.append(
                        ValidationIssue(
                            record_id=record.id,
                            track_name=record.track_name,
                            issue_type="渠道补扣差异",
                            severity="WARNING",
                            message=(
                                f"渠道[{ded.channel.value}]扣费"
                                f"[{ded.description}]金额不符："
                                f"按比例计算应为 {calc_amount:.2f}，"
                                f"实际为 {ded.amount:.2f}"
                            ),
                            source_refs=[f"渠道扣费:{ded.source_file}"],
                        )
                    )

        return issues
