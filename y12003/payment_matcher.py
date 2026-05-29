from datetime import date
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

from models import (
    Customer,
    SalesOrder,
    PaymentRecord,
    PaymentMatchStatus,
    CreditStatus,
)
from credit_calculator import CreditCalculator


class PaymentMatcher:
    def __init__(self, calculator: CreditCalculator):
        self.calculator = calculator

    def get_unmatched_payments(self) -> List[PaymentRecord]:
        return [
            p
            for p in self.calculator.payments.values()
            if p.match_status != PaymentMatchStatus.MATCHED
        ]

    def get_unpaid_orders(self, customer_id: str) -> List[SalesOrder]:
        orders = [
            o
            for o in self.calculator.sales_orders.values()
            if o.customer_id == customer_id and o.is_credit_order
        ]
        return sorted(orders, key=lambda x: x.order_date)

    def suggest_matches(
        self, payment_id: str
    ) -> Tuple[Optional[PaymentRecord], List[Dict]]:
        payment = self.calculator.payments.get(payment_id)
        if not payment:
            return None, []

        if payment.match_status == PaymentMatchStatus.MATCHED:
            return payment, []

        unmatched_amount = payment.unmatched_amount
        suggestions = []

        if payment.customer_id:
            target_customers = [payment.customer_id]
        else:
            target_customers = list(self.calculator.customers.keys())

        for customer_id in target_customers:
            unpaid_orders = self.get_unpaid_orders(customer_id)
            customer = self.calculator.customers.get(customer_id)
            if not customer:
                continue

            for order in unpaid_orders:
                order_unpaid = order.credit_amount - order.paid_amount
                if order_unpaid <= 0:
                    continue

                match_score = 0
                match_reasons = []

                if abs(unmatched_amount - order_unpaid) < 0.01:
                    match_score += 50
                    match_reasons.append("金额完全匹配")
                elif abs(unmatched_amount - order_unpaid) / order_unpaid < 0.1:
                    match_score += 30
                    match_reasons.append("金额接近匹配")

                days_diff = abs((payment.payment_date - order.order_date).days)
                if days_diff <= 7:
                    match_score += 20
                    match_reasons.append("付款日期接近订单日期")
                elif days_diff <= 30:
                    match_score += 10
                    match_reasons.append("付款日期在合理账期内")

                if customer_id == payment.customer_id:
                    match_score += 20
                    match_reasons.append("客户明确匹配")

                if match_score > 0:
                    suggestions.append(
                        {
                            "customer_id": customer_id,
                            "customer_name": customer.name,
                            "order_id": order.order_id,
                            "order_date": order.order_date,
                            "order_total": order.total_amount,
                            "order_unpaid": order_unpaid,
                            "payment_amount": unmatched_amount,
                            "match_score": match_score,
                            "match_reasons": match_reasons,
                        }
                    )

        suggestions.sort(key=lambda x: x["match_score"], reverse=True)
        return payment, suggestions[:5]

    def match_payment_to_order(
        self, payment_id: str, order_id: str, amount: Optional[float] = None
    ) -> Tuple[bool, str]:
        payment = self.calculator.payments.get(payment_id)
        if not payment:
            return False, "回款记录不存在"

        order = self.calculator.sales_orders.get(order_id)
        if not order:
            return False, "销售订单不存在"

        if payment.customer_id and payment.customer_id != order.customer_id:
            return False, "回款客户与订单客户不一致"

        unmatched_amount = payment.unmatched_amount
        order_unpaid = order.credit_amount - order.paid_amount

        if amount is None:
            match_amount = min(unmatched_amount, order_unpaid)
        else:
            if amount > unmatched_amount:
                return False, "匹配金额超过回款未匹配金额"
            if amount > order_unpaid:
                return False, "匹配金额超过订单未付金额"
            match_amount = amount

        order.paid_amount += match_amount
        payment.matched_amount += match_amount
        if order_id not in payment.matched_order_ids:
            payment.matched_order_ids.append(order_id)

        if abs(payment.unmatched_amount) < 0.01:
            payment.match_status = PaymentMatchStatus.MATCHED
        else:
            payment.match_status = PaymentMatchStatus.PARTIAL

        if not payment.customer_id:
            payment.customer_id = order.customer_id

        self.calculator.update_credit_status(order.customer_id)

        return True, f"成功匹配金额：{match_amount:.2f}"

    def auto_match_payment(self, payment_id: str) -> Tuple[bool, str, List[Dict]]:
        payment, suggestions = self.suggest_matches(payment_id)
        if not payment:
            return False, "回款记录不存在", []

        if not suggestions:
            return False, "未找到可匹配的订单", []

        best_match = suggestions[0]
        if best_match["match_score"] < 40:
            return False, "匹配置信度不足，需要人工确认", suggestions

        success, message = self.match_payment_to_order(
            payment_id, best_match["order_id"]
        )
        return success, message, [best_match] if success else suggestions

    def get_unmatched_payment_summary(self) -> Dict:
        unmatched = self.get_unmatched_payments()
        total_unmatched = sum(p.unmatched_amount for p in unmatched)

        by_customer = defaultdict(float)
        by_date = defaultdict(list)

        for p in unmatched:
            customer_name = "未指定客户"
            if p.customer_id:
                customer = self.calculator.customers.get(p.customer_id)
                if customer:
                    customer_name = customer.name
            by_customer[customer_name] += p.unmatched_amount
            by_date[p.payment_date].append(p)

        return {
            "total_unmatched_count": len(unmatched),
            "total_unmatched_amount": total_unmatched,
            "by_customer": dict(by_customer),
            "unmatched_list": [
                {
                    "payment_id": p.payment_id,
                    "customer_id": p.customer_id,
                    "payment_date": p.payment_date,
                    "amount": p.amount,
                    "unmatched_amount": p.unmatched_amount,
                    "match_status": p.match_status,
                    "remarks": p.remarks,
                }
                for p in unmatched
            ],
        }

    def mark_payment_as_unknown(self, payment_id: str) -> Tuple[bool, str]:
        payment = self.calculator.payments.get(payment_id)
        if not payment:
            return False, "回款记录不存在"

        if payment.remarks:
            payment.remarks += " | 待确认来源"
        else:
            payment.remarks = "待确认来源"

        return True, "已标记为待确认，建议：1)核对银行流水备注 2)联系客户确认 3)如无法确认请挂账"

    def get_all_payments_with_status(self) -> List[Dict]:
        result = []
        for payment in self.calculator.payments.values():
            customer_name = ""
            if payment.customer_id:
                customer = self.calculator.customers.get(payment.customer_id)
                if customer:
                    customer_name = customer.name

            result.append(
                {
                    "payment_id": payment.payment_id,
                    "customer_id": payment.customer_id,
                    "customer_name": customer_name,
                    "payment_date": payment.payment_date,
                    "amount": payment.amount,
                    "matched_amount": payment.matched_amount,
                    "unmatched_amount": payment.unmatched_amount,
                    "match_status": payment.match_status,
                    "matched_orders": payment.matched_order_ids,
                    "remarks": payment.remarks,
                }
            )
        return sorted(result, key=lambda x: x["payment_date"], reverse=True)
