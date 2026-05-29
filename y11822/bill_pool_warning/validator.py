from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Optional

from .models import Bill, PledgeContract, BillPool


@dataclass
class ValidationError:
    record_id: str
    record_type: str
    field_name: str
    error_type: str
    detail: str
    severity: str

    def to_dict(self) -> dict:
        return {
            "record_id": self.record_id,
            "record_type": self.record_type,
            "field_name": self.field_name,
            "error_type": self.error_type,
            "detail": self.detail,
            "severity": self.severity,
        }


class DataValidator:
    def __init__(self, pool: BillPool):
        self.pool = pool
        self.errors: list[ValidationError] = []
        self.bill_ids: set[str] = set()
        self.pledge_contract_ids: set[str] = set()
        self.bill_pledge_map: dict[str, list[str]] = {}

    def validate(self) -> tuple[list[Bill], list[PledgeContract], list[ValidationError]]:
        self.errors = []
        self.bill_ids = set()
        self.pledge_contract_ids = set()
        self.bill_pledge_map = {}

        for pc in self.pool.pledge_contracts:
            self._validate_pledge_contract(pc)

        for bill in self.pool.bills:
            self._validate_bill(bill)

        self._check_cross_references()

        clean_bills = []
        dirty_bill_ids = {e.record_id for e in self.errors if e.record_type == "票据"}
        for bill in self.pool.bills:
            if bill.bill_id not in dirty_bill_ids:
                clean_bills.append(bill)

        clean_pledges = []
        dirty_pledge_ids = {e.record_id for e in self.errors if e.record_type == "质押合同"}
        for pc in self.pool.pledge_contracts:
            if pc.contract_id not in dirty_pledge_ids:
                clean_pledges.append(pc)

        return clean_bills, clean_pledges, self.errors

    def _add_error(self, record_id: str, record_type: str, field_name: str,
                   error_type: str, detail: str, severity: str = "reject") -> None:
        self.errors.append(ValidationError(
            record_id=record_id,
            record_type=record_type,
            field_name=field_name,
            error_type=error_type,
            detail=detail,
            severity=severity,
        ))

    def _validate_bill(self, bill: Bill) -> None:
        if bill.bill_id in self.bill_ids:
            self._add_error(
                bill.bill_id, "票据", "bill_id", "重复",
                f"票据ID {bill.bill_id} 重复出现，可能造成额度重复计算",
            )
        self.bill_ids.add(bill.bill_id)

        if bill.amount <= 0:
            self._add_error(
                bill.bill_id, "票据", "amount", "无效值",
                f"票据金额 {bill.amount} <= 0，无法参与额度计算",
            )

        if bill.maturity_date < bill.issue_date:
            self._add_error(
                bill.bill_id, "票据", "maturity_date", "逻辑矛盾",
                f"到期日 {bill.maturity_date} 早于签发日 {bill.issue_date}",
            )

        if bill.extended_maturity_date and bill.extended_maturity_date < bill.maturity_date:
            self._add_error(
                bill.bill_id, "票据", "extended_maturity_date", "逻辑矛盾",
                f"顺延到期日 {bill.extended_maturity_date} 早于原始到期日 {bill.maturity_date}",
            )

        if bill.pledge_contract_id and bill.pledge_contract_id not in self.bill_pledge_map:
            self.bill_pledge_map[bill.bill_id] = [bill.pledge_contract_id]
        elif bill.pledge_contract_id:
            self.bill_pledge_map[bill.bill_id].append(bill.pledge_contract_id)

    def _validate_pledge_contract(self, pc: PledgeContract) -> None:
        if pc.contract_id in self.pledge_contract_ids:
            self._add_error(
                pc.contract_id, "质押合同", "contract_id", "重复",
                f"质押合同ID {pc.contract_id} 重复出现",
            )
        self.pledge_contract_ids.add(pc.contract_id)

        if pc.pledged_amount <= 0:
            self._add_error(
                pc.contract_id, "质押合同", "pledged_amount", "无效值",
                f"质押金额 {pc.pledged_amount} <= 0",
            )

        if pc.start_date and pc.expected_release_date:
            if pc.expected_release_date < pc.start_date:
                self._add_error(
                    pc.contract_id, "质押合同", "expected_release_date", "逻辑矛盾",
                    f"预期释放日 {pc.expected_release_date} 早于质押开始日 {pc.start_date}",
                )

        if pc.actual_release_date and pc.expected_release_date:
            if pc.actual_release_date > pc.expected_release_date:
                self._add_error(
                    pc.contract_id, "质押合同", "actual_release_date", "释放延迟",
                    f"实际释放日 {pc.actual_release_date} 晚于预期释放日 {pc.expected_release_date}，延迟{(pc.actual_release_date - pc.expected_release_date).days}天",
                    severity="warn",
                )

    def _check_cross_references(self) -> None:
        for bid, pids in self.bill_pledge_map.items():
            if len(pids) > 1:
                self._add_error(
                    bid, "票据", "pledge_contract_id", "重复质押",
                    f"票据 {bid} 被多个质押合同引用: {pids}，额度可能被重复占用",
                )

        for pc in self.pool.pledge_contracts:
            for bid in pc.bill_ids:
                if bid not in self.bill_ids:
                    self._add_error(
                        pc.contract_id, "质押合同", "bill_ids", "引用缺失",
                        f"质押合同 {pc.contract_id} 引用了不存在的票据 {bid}",
                    )

        for bill in self.pool.bills:
            if bill.pledge_contract_id and bill.pledge_contract_id not in self.pledge_contract_ids:
                self._add_error(
                    bill.bill_id, "票据", "pledge_contract_id", "引用缺失",
                    f"票据 {bill.bill_id} 引用了不存在的质押合同 {bill.pledge_contract_id}",
                )
