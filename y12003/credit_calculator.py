from datetime import date, datetime
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

from models import (
    Customer,
    SalesOrder,
    PaymentRecord,
    ReturnOrder,
    TemporaryCreditLimit,
    CreditStatus,
    ReturnStatus,
    TemporaryLimitStatus,
    PaymentMatchStatus,
    CreditStatusHistory,
)


class CreditCalculator:
    def __init__(self):
        self.customers: Dict[str, Customer] = {}
        self.sales_orders: Dict[str, SalesOrder] = {}
        self.payments: Dict[str, PaymentRecord] = {}
        self.return_orders: Dict[str, ReturnOrder] = {}
        self.temp_limits: Dict[str, TemporaryCreditLimit] = {}
        self.status_history: List[CreditStatusHistory] = []
        self._history_counter = 0

    def add_customer(self, customer: Customer) -> None:
        self.customers[customer.customer_id] = customer

    def add_sales_order(self, order: SalesOrder) -> None:
        self.sales_orders[order.order_id] = order

    def add_payment(self, payment: PaymentRecord) -> None:
        self.payments[payment.payment_id] = payment

    def add_return_order(self, return_order: ReturnOrder) -> None:
        self.return_orders[return_order.return_id] = return_order

    def add_temp_limit(self, temp_limit: TemporaryCreditLimit) -> None:
        self.temp_limits[temp_limit.temp_id] = temp_limit

    def _change_customer_status(
        self,
        customer_id: str,
        new_status: CreditStatus,
        reason: str,
        operator: Optional[str] = None,
    ) -> None:
        customer = self.customers.get(customer_id)
        if not customer:
            return

        old_status = customer.current_credit_status
        if old_status == new_status:
            return

        customer.current_credit_status = new_status
        self._history_counter += 1
        self.status_history.append(
            CreditStatusHistory(
                history_id=f"HIST{self._history_counter:06d}",
                customer_id=customer_id,
                old_status=old_status,
                new_status=new_status,
                change_reason=reason,
                operator=operator,
            )
        )

    def get_effective_credit_limit(
        self, customer_id: str, check_date: date = None
    ) -> float:
        customer = self.customers.get(customer_id)
        if not customer:
            return 0.0

        check_date = check_date or date.today()
        total_limit = customer.base_credit_limit

        for temp_limit in self.temp_limits.values():
            if temp_limit.customer_id == customer_id and temp_limit.is_active(check_date):
                total_limit += temp_limit.amount

        return total_limit

    def get_credit_usage(self, customer_id: str) -> Dict:
        customer = self.customers.get(customer_id)
        if not customer:
            return {}

        total_credit_amount = 0.0
        total_paid_amount = 0.0
        approved_return_amount = 0.0
        pending_return_amount = 0.0

        customer_orders = [
            o for o in self.sales_orders.values() if o.customer_id == customer_id
        ]
        for order in customer_orders:
            if order.is_credit_order:
                total_credit_amount += order.credit_amount
                total_paid_amount += order.paid_amount

        customer_returns = [
            r for r in self.return_orders.values() if r.customer_id == customer_id
        ]
        for ret in customer_returns:
            if ret.status == ReturnStatus.APPROVED:
                approved_return_amount += ret.return_amount
            elif ret.status == ReturnStatus.PENDING:
                pending_return_amount += ret.return_amount

        actual_usage = total_credit_amount - total_paid_amount - approved_return_amount
        effective_limit = self.get_effective_credit_limit(customer_id)
        available_credit = effective_limit - actual_usage
        usage_rate = (actual_usage / effective_limit * 100) if effective_limit > 0 else 0

        return {
            "customer_id": customer_id,
            "customer_name": customer.name,
            "base_limit": customer.base_credit_limit,
            "effective_limit": effective_limit,
            "total_credit_amount": total_credit_amount,
            "total_paid_amount": total_paid_amount,
            "approved_return_amount": approved_return_amount,
            "pending_return_amount": pending_return_amount,
            "actual_usage": actual_usage,
            "available_credit": available_credit,
            "usage_rate": round(usage_rate, 2),
            "current_status": customer.current_credit_status,
        }

    def update_credit_status(self, customer_id: str) -> CreditStatus:
        usage = self.get_credit_usage(customer_id)
        if not usage:
            return CreditStatus.NORMAL

        usage_rate = usage["usage_rate"]
        available_credit = usage["available_credit"]

        customer = self.customers.get(customer_id)
        if not customer:
            return CreditStatus.NORMAL

        if customer.current_credit_status == CreditStatus.FROZEN:
            if usage_rate <= 80 and available_credit > 0:
                self._change_customer_status(
                    customer_id, CreditStatus.NORMAL, "额度使用率恢复正常，解冻账户"
                )
            return customer.current_credit_status

        if available_credit < 0 or usage_rate >= 100:
            new_status = CreditStatus.FROZEN
            reason = "额度已用尽，冻结账户"
        elif usage_rate >= 90:
            new_status = CreditStatus.OVERDUE
            reason = f"额度使用率达{usage_rate}%，进入逾期状态"
        elif usage_rate >= 80:
            new_status = CreditStatus.WARNING
            reason = f"额度使用率达{usage_rate}%，进入预警状态"
        else:
            new_status = CreditStatus.NORMAL
            reason = "额度使用正常"

        self._change_customer_status(customer_id, new_status, reason)
        return new_status

    def can_ship(self, customer_id: str, order_amount: float = 0) -> Tuple[bool, str]:
        usage = self.get_credit_usage(customer_id)
        if not usage:
            return False, "客户不存在"

        customer = self.customers.get(customer_id)
        if not customer:
            return False, "客户不存在"

        if customer.current_credit_status == CreditStatus.FROZEN:
            return False, "客户账户已冻结，无法发货"

        if usage["current_status"] in [CreditStatus.OVERDUE, CreditStatus.FROZEN]:
            return False, f"客户信用状态为{usage['current_status']}，无法发货"

        available_after_order = usage["available_credit"] - order_amount

        if available_after_order < 0:
            return (
                False,
                f"可用额度不足。当前可用：{usage['available_credit']:.2f}，订单金额：{order_amount:.2f}",
            )

        return True, f"可以发货。发货后剩余可用额度：{available_after_order:.2f}"

    def get_all_customers_credit_summary(self) -> List[Dict]:
        summaries = []
        for customer_id in self.customers:
            usage = self.get_credit_usage(customer_id)
            if usage:
                summaries.append(usage)
        return sorted(summaries, key=lambda x: x["usage_rate"], reverse=True)

    def recalculate_all(self) -> None:
        for customer_id in self.customers:
            self.update_credit_status(customer_id)
