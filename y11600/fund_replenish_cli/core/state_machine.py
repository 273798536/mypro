from typing import Optional, Tuple
from ..models import ReplenishRecord, ReplenishStatus, RiskType


class StateMachine:
    def __init__(self):
        self.transitions = {
            ReplenishStatus.PENDING: [
                ReplenishStatus.ELIGIBLE,
                ReplenishStatus.REVIEW_REQUIRED,
                ReplenishStatus.PAUSED,
                ReplenishStatus.CANCELLED,
                ReplenishStatus.DUPLICATE_RISK,
                ReplenishStatus.HOLIDAY_DEFERRED,
            ],
            ReplenishStatus.REVIEW_REQUIRED: [
                ReplenishStatus.ELIGIBLE,
                ReplenishStatus.CANCELLED,
                ReplenishStatus.PAUSED,
            ],
            ReplenishStatus.ELIGIBLE: [
                ReplenishStatus.PROCESSING,
                ReplenishStatus.PAUSED,
                ReplenishStatus.HOLIDAY_DEFERRED,
                ReplenishStatus.DUPLICATE_RISK,
            ],
            ReplenishStatus.PAUSED: [
                ReplenishStatus.ELIGIBLE,
                ReplenishStatus.CANCELLED,
            ],
            ReplenishStatus.DUPLICATE_RISK: [
                ReplenishStatus.ELIGIBLE,
                ReplenishStatus.CANCELLED,
                ReplenishStatus.REVIEW_REQUIRED,
            ],
            ReplenishStatus.HOLIDAY_DEFERRED: [
                ReplenishStatus.ELIGIBLE,
                ReplenishStatus.CANCELLED,
            ],
            ReplenishStatus.PROCESSING: [
                ReplenishStatus.SUCCESS,
                ReplenishStatus.FAILED,
            ],
            ReplenishStatus.FAILED: [
                ReplenishStatus.ELIGIBLE,
                ReplenishStatus.CANCELLED,
                ReplenishStatus.REVIEW_REQUIRED,
            ],
        }

    def can_transition(self, current: ReplenishStatus, target: ReplenishStatus) -> bool:
        if target == current:
            return True
        allowed = self.transitions.get(current, [])
        return target in allowed

    def transition(
        self,
        record: ReplenishRecord,
        target_status: ReplenishStatus,
        reason: str,
        source: str,
        operator: str = "system",
    ) -> Tuple[bool, Optional[str]]:
        if not self.can_transition(record.status, target_status):
            return False, f"不允许从 {record.status} 转换到 {target_status}"

        record.add_audit(target_status, reason, source, operator)
        return True, None

    def evaluate_initial_state(self, record: ReplenishRecord) -> ReplenishStatus:
        plan = record.customer_plan
        bank_return = record.bank_return

        if plan.status == "暂停":
            record.add_risk(RiskType.PAUSED)
            return ReplenishStatus.PAUSED

        if plan.status == "终止":
            return ReplenishStatus.CANCELLED

        if record.failure_reason and not record.failure_reason.allow_replenish:
            return ReplenishStatus.CANCELLED

        if record.replenish_window:
            window = record.replenish_window
            if window.attempts_made >= (record.failure_reason.max_attempts if record.failure_reason else 3):
                return ReplenishStatus.CANCELLED

        for remark in record.manual_remarks:
            if remark.action == "拒绝补扣":
                return ReplenishStatus.CANCELLED
            if remark.action == "暂停":
                record.add_risk(RiskType.PAUSED)
                return ReplenishStatus.PAUSED

        if record.risks:
            if RiskType.DUPLICATE in record.risks:
                return ReplenishStatus.DUPLICATE_RISK
            if RiskType.INVALID_DATA in record.risks:
                return ReplenishStatus.REVIEW_REQUIRED
            if RiskType.MANUAL_REVIEW in record.risks:
                return ReplenishStatus.REVIEW_REQUIRED

        return ReplenishStatus.ELIGIBLE
