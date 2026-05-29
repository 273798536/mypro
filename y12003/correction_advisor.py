from datetime import date, datetime, timedelta
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

from models import (
    Customer,
    SalesOrder,
    ReturnOrder,
    TemporaryCreditLimit,
    ReturnStatus,
    TemporaryLimitStatus,
    CreditStatus,
)
from credit_calculator import CreditCalculator


class CorrectionAdvisor:
    def __init__(self, calculator: CreditCalculator):
        self.calculator = calculator

    def get_pending_returns_analysis(self) -> Dict:
        pending_returns = [
            r
            for r in self.calculator.return_orders.values()
            if r.status == ReturnStatus.PENDING
        ]

        by_customer = defaultdict(list)
        for ret in pending_returns:
            by_customer[ret.customer_id].append(ret)

        analysis = []
        for customer_id, returns in by_customer.items():
            customer = self.calculator.customers.get(customer_id)
            if not customer:
                continue

            total_pending = sum(r.return_amount for r in returns)
            usage = self.calculator.get_credit_usage(customer_id)
            available_after_processing = usage.get("available_credit", 0) + total_pending
            usage_after_processing = (
                usage.get("actual_usage", 0) - total_pending
            ) / usage.get("effective_limit", 1) * 100 if usage.get("effective_limit", 0) > 0 else 0

            days_pending = []
            for r in returns:
                days = (date.today() - r.return_date).days
                days_pending.append(days)

            avg_days_pending = sum(days_pending) / len(days_pending) if days_pending else 0
            max_days_pending = max(days_pending) if days_pending else 0

            urgency = "正常"
            if max_days_pending > 30:
                urgency = "紧急"
            elif max_days_pending > 14:
                urgency = "重要"

            analysis.append(
                {
                    "customer_id": customer_id,
                    "customer_name": customer.name,
                    "pending_count": len(returns),
                    "pending_total_amount": total_pending,
                    "avg_days_pending": round(avg_days_pending, 1),
                    "max_days_pending": max_days_pending,
                    "urgency": urgency,
                    "current_available_credit": usage.get("available_credit", 0),
                    "available_after_processing": available_after_processing,
                    "usage_rate_after_processing": round(usage_after_processing, 2),
                    "returns_detail": [
                        {
                            "return_id": r.return_id,
                            "order_id": r.order_id,
                            "return_date": r.return_date,
                            "return_amount": r.return_amount,
                            "days_pending": (date.today() - r.return_date).days,
                            "remarks": r.remarks,
                        }
                        for r in returns
                    ],
                }
            )

        return {
            "total_pending_count": len(pending_returns),
            "total_pending_amount": sum(r.return_amount for r in pending_returns),
            "affected_customers": len(analysis),
            "by_customer": sorted(analysis, key=lambda x: x["pending_total_amount"], reverse=True),
        }

    def get_return_correction_suggestions(self, customer_id: str) -> List[Dict]:
        suggestions = []
        customer = self.calculator.customers.get(customer_id)
        if not customer:
            return suggestions

        pending_returns = [
            r
            for r in self.calculator.return_orders.values()
            if r.customer_id == customer_id and r.status == ReturnStatus.PENDING
        ]

        usage = self.calculator.get_credit_usage(customer_id)
        current_available = usage.get("available_credit", 0)

        for ret in pending_returns:
            days_pending = (date.today() - ret.return_date).days
            actions = []

            if days_pending > 30:
                actions.append("立即处理：退货单已超过30天未处理")
                actions.append("建议：联系仓库确认收货情况")
                actions.append("建议：核实退货商品是否可销售")
            elif days_pending > 14:
                actions.append("优先处理：退货单已超过14天")
                actions.append("建议：检查质检流程是否完成")

            if ret.return_amount > current_available * 0.5 and current_available < 0:
                actions.append("高优先级：处理后可释放额度，帮助客户恢复发货能力")

            potential_credit = ret.return_amount
            actions.append(f"处理后预计释放额度：{potential_credit:.2f}")

            suggestions.append(
                {
                    "return_id": ret.return_id,
                    "order_id": ret.order_id,
                    "return_amount": ret.return_amount,
                    "days_pending": days_pending,
                    "priority": "高" if days_pending > 14 or potential_credit > 10000 else "中",
                    "actions": actions,
                }
            )

        return sorted(suggestions, key=lambda x: x["days_pending"], reverse=True)

    def get_temp_limits_analysis(self) -> Dict:
        today = date.today()
        all_temp_limits = list(self.calculator.temp_limits.values())

        active_limits = [t for t in all_temp_limits if t.is_active(today)]
        expiring_soon = [
            t
            for t in active_limits
            if (t.expiry_date - today).days <= 7 and t.status == TemporaryLimitStatus.ACTIVE
        ]
        expired_limits = [
            t
            for t in all_temp_limits
            if t.expiry_date < today and t.status == TemporaryLimitStatus.ACTIVE
        ]

        by_customer = defaultdict(list)
        for t in active_limits + expired_limits:
            by_customer[t.customer_id].append(t)

        customer_analysis = []
        for customer_id, temp_limits in by_customer.items():
            customer = self.calculator.customers.get(customer_id)
            if not customer:
                continue

            active_for_customer = [t for t in temp_limits if t.is_active(today)]
            expired_for_customer = [
                t for t in temp_limits if t.expiry_date < today and t.status == TemporaryLimitStatus.ACTIVE
            ]

            total_active_amount = sum(t.amount for t in active_for_customer)
            usage = self.calculator.get_credit_usage(customer_id)

            base_limit = usage.get("base_limit", 0)
            effective_without_temp = base_limit
            actual_usage = usage.get("actual_usage", 0)
            would_be_over = actual_usage > effective_without_temp

            customer_analysis.append(
                {
                    "customer_id": customer_id,
                    "customer_name": customer.name,
                    "active_temp_count": len(active_for_customer),
                    "active_temp_amount": total_active_amount,
                    "expired_count": len(expired_for_customer),
                    "expired_amount": sum(t.amount for t in expired_for_customer),
                    "would_be_over_limit": would_be_over,
                    "current_usage_rate": usage.get("usage_rate", 0),
                    "usage_rate_without_temp": round(
                        actual_usage / effective_without_temp * 100 if effective_without_temp > 0 else 0,
                        2,
                    ),
                }
            )

        return {
            "total_active_count": len(active_limits),
            "total_active_amount": sum(t.amount for t in active_limits),
            "expiring_soon_count": len(expiring_soon),
            "expiring_soon_amount": sum(t.amount for t in expiring_soon),
            "expired_count": len(expired_limits),
            "expired_amount": sum(t.amount for t in expired_limits),
            "expiring_soon_detail": [
                {
                    "temp_id": t.temp_id,
                    "customer_id": t.customer_id,
                    "customer_name": self.calculator.customers.get(t.customer_id, Customer("", "", 0)).name,
                    "amount": t.amount,
                    "expiry_date": t.expiry_date,
                    "days_remaining": (t.expiry_date - today).days,
                    "reason": t.reason,
                }
                for t in expiring_soon
            ],
            "expired_detail": [
                {
                    "temp_id": t.temp_id,
                    "customer_id": t.customer_id,
                    "customer_name": self.calculator.customers.get(t.customer_id, Customer("", "", 0)).name,
                    "amount": t.amount,
                    "expiry_date": t.expiry_date,
                    "days_expired": (today - t.expiry_date).days,
                    "reason": t.reason,
                }
                for t in expired_limits
            ],
            "customer_summary": customer_analysis,
        }

    def get_temp_limit_correction_suggestions(self, customer_id: str) -> List[Dict]:
        suggestions = []
        today = date.today()

        customer = self.calculator.customers.get(customer_id)
        if not customer:
            return suggestions

        temp_limits = [
            t for t in self.calculator.temp_limits.values() if t.customer_id == customer_id
        ]

        usage = self.calculator.get_credit_usage(customer_id)
        actual_usage = usage.get("actual_usage", 0)
        base_limit = usage.get("base_limit", 0)

        for temp in temp_limits:
            actions = []
            days_remaining = (temp.expiry_date - today).days

            if temp.status == TemporaryLimitStatus.ACTIVE:
                if days_remaining < 0:
                    actions.append("状态异常：额度已过期但系统状态仍为生效中")
                    actions.append("操作建议：立即更新临时额度状态为已过期")

                    if actual_usage > base_limit:
                        actions.append(
                            f"风险提示：客户当前使用额度{actual_usage:.2f}超过基础额度{base_limit:.2f}"
                        )
                        actions.append("建议：1) 评估是否需要续期 2) 催缴超额部分")

                elif days_remaining <= 3:
                    actions.append(f"即将到期：剩余{days_remaining}天")
                    if actual_usage > base_limit:
                        actions.append(
                            "建议：与客户沟通是否需要续期，避免额度突然不足影响发货"
                        )
                    else:
                        actions.append("建议：可正常到期结束，不影响客户使用")

                elif days_remaining <= 7:
                    actions.append(f"一周内到期：剩余{days_remaining}天")
                    actions.append("建议：提前规划后续额度需求")

            suggestions.append(
                {
                    "temp_id": temp.temp_id,
                    "amount": temp.amount,
                    "effective_date": temp.effective_date,
                    "expiry_date": temp.expiry_date,
                    "days_remaining": max(0, days_remaining),
                    "status": temp.status,
                    "actions": actions,
                }
            )

        return suggestions

    def get_all_correction_tasks(self) -> Dict:
        returns_analysis = self.get_pending_returns_analysis()
        temp_analysis = self.get_temp_limits_analysis()

        high_priority_tasks = []
        medium_priority_tasks = []

        for ret in returns_analysis["by_customer"]:
            if ret["urgency"] == "紧急":
                high_priority_tasks.append(
                    {
                        "type": "退货处理",
                        "priority": "高",
                        "customer_id": ret["customer_id"],
                        "customer_name": ret["customer_name"],
                        "description": f"{ret['pending_count']}笔退货待处理，总额{ret['pending_total_amount']:.2f}，最长待{ret['max_days_pending']}天",
                        "action": "立即审核退货单，释放占用额度",
                    }
                )
            elif ret["urgency"] == "重要":
                medium_priority_tasks.append(
                    {
                        "type": "退货处理",
                        "priority": "中",
                        "customer_id": ret["customer_id"],
                        "customer_name": ret["customer_name"],
                        "description": f"{ret['pending_count']}笔退货待处理，总额{ret['pending_total_amount']:.2f}",
                        "action": "尽快审核退货单",
                    }
                )

        for expired in temp_analysis["expired_detail"]:
            high_priority_tasks.append(
                {
                    "type": "临时额度",
                    "priority": "高",
                    "customer_id": expired["customer_id"],
                    "customer_name": expired["customer_name"],
                    "description": f"临时额度已过期{expired['days_expired']}天，金额{expired['amount']:.2f}",
                    "action": "更新额度状态，评估是否续期",
                }
            )

        for expiring in temp_analysis["expiring_soon_detail"]:
            medium_priority_tasks.append(
                {
                    "type": "临时额度",
                    "priority": "中",
                    "customer_id": expiring["customer_id"],
                    "customer_name": expiring["customer_name"],
                    "description": f"临时额度{expiring['days_remaining']}天后到期，金额{expiring['amount']:.2f}",
                    "action": "与客户确认是否需要续期",
                }
            )

        return {
            "high_priority": high_priority_tasks,
            "medium_priority": medium_priority_tasks,
            "summary": {
                "high_priority_count": len(high_priority_tasks),
                "medium_priority_count": len(medium_priority_tasks),
                "pending_returns_count": returns_analysis["total_pending_count"],
                "expired_temp_count": temp_analysis["expired_count"],
                "expiring_temp_count": temp_analysis["expiring_soon_count"],
            },
        }
