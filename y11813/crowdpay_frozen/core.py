from datetime import datetime
from typing import Dict, List, Tuple, Optional
from collections import defaultdict

from .models import (
    RiderPayment,
    FreezeRecord,
    FreezeType,
    FreezeStatus,
    PaymentStatus,
    BatchReport,
)


class FreezePriority:
    PRIORITY_ORDER = {
        FreezeType.COMPLAINT: 1,
        FreezeType.SUBSIDY_RECOVERY: 2,
        FreezeType.BANK_FAILED: 3,
    }

    @classmethod
    def get_priority(cls, freeze_type: FreezeType) -> int:
        return cls.PRIORITY_ORDER.get(freeze_type, 99)

    @classmethod
    def compare(cls, f1: FreezeRecord, f2: FreezeRecord) -> int:
        p1 = cls.get_priority(f1.freeze_type)
        p2 = cls.get_priority(f2.freeze_type)
        return p1 - p2


class PaymentProcessor:
    def __init__(self):
        self.processed_batches: Dict[str, BatchReport] = {}

    def check_duplicate_freezes(
        self, rider: RiderPayment
    ) -> List[Dict[str, any]]:
        duplicates = []
        freeze_groups = defaultdict(list)

        for freeze in rider.freezes:
            key = (freeze.freeze_type, freeze.complaint_id or "no_id")
            freeze_groups[key].append(freeze)

        for (freeze_type, complaint_id), freezes in freeze_groups.items():
            if len(freezes) > 1:
                duplicates.append(
                    {
                        "rider_id": rider.rider_id,
                        "rider_name": rider.rider_name,
                        "freeze_type": freeze_type.value,
                        "complaint_id": complaint_id,
                        "count": len(freezes),
                        "amounts": [f.amount for f in freezes],
                        "reasons": [f.reason for f in freezes],
                        "operators": [f.operator for f in freezes],
                        "selected_index": 0,
                        "human_reason": self._explain_duplicate(
                            rider, freezes
                        ),
                    }
                )
        return duplicates

    def _explain_duplicate(
        self, rider: RiderPayment, freezes: List[FreezeRecord]
    ) -> str:
        freeze_type = freezes[0].freeze_type
        if freeze_type == FreezeType.COMPLAINT:
            return (
                f"骑手{rider.rider_name}同一投诉被重复冻结了{len(freezes)}次，"
                f"将只执行最新一次冻结（操作人：{freezes[-1].operator}）"
            )
        elif freeze_type == FreezeType.SUBSIDY_RECOVERY:
            return (
                f"骑手{rider.rider_name}同一补贴被重复追回{len(freezes)}次，"
                f"将按金额最大的一笔执行"
            )
        else:
            return (
                f"骑手{rider.rider_name}银行卡失败被重复标记{len(freezes)}次，"
                f"将只保留最新一条记录"
            )

    def check_negative_subsidies(
        self, rider: RiderPayment
    ) -> List[Dict[str, any]]:
        negatives = []
        for sub_name, amount in rider.subsidies.items():
            if amount < 0:
                negatives.append(
                    {
                        "rider_id": rider.rider_id,
                        "rider_name": rider.rider_name,
                        "subsidy_name": sub_name,
                        "amount": amount,
                        "human_reason": (
                            f"骑手{rider.rider_name}的【{sub_name}】为负数({amount}元)，"
                            f"将从工资中扣除{abs(amount)}元"
                        ),
                    }
                )
        return negatives

    def validate_bank_account(self, rider: RiderPayment) -> Tuple[bool, str]:
        account = rider.bank_account.strip()
        if not account:
            return False, "银行卡号为空"
        if len(account) < 15 or len(account) > 19:
            return False, f"银行卡号长度异常({len(account)}位)"
        if not account.isdigit():
            return False, "银行卡号包含非数字字符"
        return True, "验证通过"

    def calculate_final_amount(self, rider: RiderPayment) -> float:
        total = rider.total_amount
        for freeze in rider.freezes:
            if freeze.status in (FreezeStatus.APPROVED, FreezeStatus.PARTIAL):
                total -= freeze.amount
        return round(max(0, total), 2)

    def process_freezes(self, rider: RiderPayment, batch_id: str) -> None:
        rider.freezes.sort(key=lambda f: FreezePriority.get_priority(f.freeze_type))

        for i, freeze in enumerate(rider.freezes):
            freeze.sequence = i
            freeze.batch_id = batch_id
            freeze.updated_at = datetime.now()

            if freeze.freeze_type == FreezeType.COMPLAINT:
                freeze.status = FreezeStatus.APPROVED
            elif freeze.freeze_type == FreezeType.SUBSIDY_RECOVERY:
                freeze.status = FreezeStatus.APPROVED
            elif freeze.freeze_type == FreezeType.BANK_FAILED:
                freeze.status = FreezeStatus.PENDING

        rider.final_amount = self.calculate_final_amount(rider)

    def transition_status(
        self,
        rider: RiderPayment,
        new_status: PaymentStatus,
        reason: str,
        operator: str = "system",
    ) -> None:
        old_status = rider.payment_status
        rider.payment_status = new_status
        rider.status_history.append(
            {
                "old_status": old_status.value,
                "new_status": new_status.value,
                "reason": reason,
                "operator": operator,
                "timestamp": datetime.now().isoformat(),
            }
        )

    def get_status_trace(self, rider: RiderPayment) -> List[Dict[str, str]]:
        return [
            {
                "step": i + 1,
                "from": h["old_status"],
                "to": h["new_status"],
                "reason": h["reason"],
                "operator": h["operator"],
                "time": h["timestamp"],
            }
            for i, h in enumerate(rider.status_history)
        ]
