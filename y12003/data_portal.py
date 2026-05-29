import json
import csv
from datetime import date, datetime
from typing import List, Dict, Any
from io import StringIO

from models import CreditStatus
from credit_calculator import CreditCalculator
from payment_matcher import PaymentMatcher
from correction_advisor import CorrectionAdvisor


def _json_serializer(obj):
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    if hasattr(obj, "value"):
        return str(obj.value)
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")


class DataPortal:
    def __init__(self, calculator: CreditCalculator):
        self.calculator = calculator
        self.payment_matcher = PaymentMatcher(calculator)
        self.correction_advisor = CorrectionAdvisor(calculator)
        self._data_snapshot_time: datetime = datetime.now()

    def refresh_data(self) -> None:
        self.calculator.recalculate_all()
        self._data_snapshot_time = datetime.now()

    def get_unified_data(self) -> Dict[str, Any]:
        self.refresh_data()

        return {
            "snapshot_time": self._data_snapshot_time.isoformat(),
            "credit_summary": self.get_credit_summary_data(),
            "payment_summary": self.get_payment_data(),
            "correction_tasks": self.get_correction_data(),
            "detail_data": self.get_detail_data(),
        }

    def get_credit_summary_data(self) -> Dict[str, Any]:
        all_customers = self.calculator.get_all_customers_credit_summary()

        status_counts = {
            "正常": 0,
            "预警": 0,
            "逾期": 0,
            "冻结": 0,
        }
        total_base_limit = 0.0
        total_effective_limit = 0.0
        total_usage = 0.0

        for customer in all_customers:
            status = str(customer["current_status"])
            status_counts[status] = status_counts.get(status, 0) + 1
            total_base_limit += customer["base_limit"]
            total_effective_limit += customer["effective_limit"]
            total_usage += customer["actual_usage"]

        overall_usage_rate = (
            (total_usage / total_effective_limit * 100) if total_effective_limit > 0 else 0
        )

        return {
            "customer_count": len(all_customers),
            "status_distribution": status_counts,
            "total_base_limit": round(total_base_limit, 2),
            "total_effective_limit": round(total_effective_limit, 2),
            "total_usage": round(total_usage, 2),
            "overall_usage_rate": round(overall_usage_rate, 2),
            "top_usage_customers": all_customers[:10],
            "customers_by_status": {
                "frozen": [c for c in all_customers if c["current_status"] == CreditStatus.FROZEN],
                "overdue": [c for c in all_customers if c["current_status"] == CreditStatus.OVERDUE],
                "warning": [c for c in all_customers if c["current_status"] == CreditStatus.WARNING],
                "normal": [c for c in all_customers if c["current_status"] == CreditStatus.NORMAL],
            },
        }

    def get_payment_data(self) -> Dict[str, Any]:
        unmatched_summary = self.payment_matcher.get_unmatched_payment_summary()
        all_payments = self.payment_matcher.get_all_payments_with_status()

        for item in unmatched_summary["unmatched_list"]:
            if hasattr(item["payment_date"], "isoformat"):
                item["payment_date"] = item["payment_date"].isoformat()
            item["match_status"] = str(item["match_status"])

        return {
            "unmatched_summary": unmatched_summary,
            "all_payments": all_payments,
            "total_payments_count": len(all_payments),
            "total_payments_amount": round(sum(p["amount"] for p in all_payments), 2),
        }

    def get_correction_data(self) -> Dict[str, Any]:
        returns_analysis = self.correction_advisor.get_pending_returns_analysis()
        temp_analysis = self.correction_advisor.get_temp_limits_analysis()
        all_tasks = self.correction_advisor.get_all_correction_tasks()

        return {
            "pending_returns": returns_analysis,
            "temp_limits": temp_analysis,
            "correction_tasks": all_tasks,
        }

    def get_detail_data(self) -> Dict[str, Any]:
        return {
            "customers": [
                {
                    "customer_id": c.customer_id,
                    "name": c.name,
                    "base_credit_limit": c.base_credit_limit,
                    "current_credit_status": str(c.current_credit_status),
                    "contact": c.contact,
                    "phone": c.phone,
                    "remarks": c.remarks,
                }
                for c in self.calculator.customers.values()
            ],
            "sales_orders": [
                {
                    "order_id": o.order_id,
                    "customer_id": o.customer_id,
                    "order_date": o.order_date.isoformat(),
                    "total_amount": o.total_amount,
                    "credit_amount": o.credit_amount,
                    "paid_amount": o.paid_amount,
                    "unpaid_amount": o.credit_amount - o.paid_amount,
                    "is_credit_order": o.is_credit_order,
                    "salesperson": o.salesperson,
                    "remarks": o.remarks,
                }
                for o in self.calculator.sales_orders.values()
            ],
            "payments": [
                {
                    "payment_id": p.payment_id,
                    "customer_id": p.customer_id,
                    "payment_date": p.payment_date.isoformat(),
                    "amount": p.amount,
                    "matched_amount": p.matched_amount,
                    "unmatched_amount": p.unmatched_amount,
                    "match_status": str(p.match_status),
                    "matched_order_ids": p.matched_order_ids,
                    "payment_method": p.payment_method,
                    "remarks": p.remarks,
                }
                for p in self.calculator.payments.values()
            ],
            "return_orders": [
                {
                    "return_id": r.return_id,
                    "order_id": r.order_id,
                    "customer_id": r.customer_id,
                    "return_date": r.return_date.isoformat(),
                    "return_amount": r.return_amount,
                    "status": str(r.status),
                    "processed_date": r.processed_date.isoformat() if r.processed_date else None,
                    "remarks": r.remarks,
                }
                for r in self.calculator.return_orders.values()
            ],
            "temp_limits": [
                {
                    "temp_id": t.temp_id,
                    "customer_id": t.customer_id,
                    "amount": t.amount,
                    "effective_date": t.effective_date.isoformat(),
                    "expiry_date": t.expiry_date.isoformat(),
                    "status": str(t.status),
                    "is_active": t.is_active(),
                    "reason": t.reason,
                    "approver": t.approver,
                }
                for t in self.calculator.temp_limits.values()
            ],
        }

    def export_to_json(self, file_path: str) -> None:
        data = self.get_unified_data()
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=_json_serializer)

    def export_credit_summary_to_csv(self, file_path: str) -> None:
        all_customers = self.calculator.get_all_customers_credit_summary()

        with open(file_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(
                [
                    "客户ID",
                    "客户名称",
                    "基础额度",
                    "有效额度",
                    "赊销总额",
                    "已回款",
                    "已批退货",
                    "待批退货",
                    "实际占用",
                    "可用额度",
                    "使用率(%)",
                    "当前状态",
                ]
            )

            for cust in all_customers:
                writer.writerow(
                    [
                        cust["customer_id"],
                        cust["customer_name"],
                        cust["base_limit"],
                        cust["effective_limit"],
                        cust["total_credit_amount"],
                        cust["total_paid_amount"],
                        cust["approved_return_amount"],
                        cust["pending_return_amount"],
                        cust["actual_usage"],
                        cust["available_credit"],
                        cust["usage_rate"],
                        str(cust["current_status"]),
                    ]
                )

    def export_unmatched_payments_to_csv(self, file_path: str) -> None:
        unmatched_summary = self.payment_matcher.get_unmatched_payment_summary()
        unmatched_list = unmatched_summary["unmatched_list"]

        with open(file_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(
                [
                    "回款ID",
                    "客户ID",
                    "回款日期",
                    "总金额",
                    "未匹配金额",
                    "匹配状态",
                    "备注",
                ]
            )

            for p in unmatched_list:
                writer.writerow(
                    [
                        p["payment_id"],
                        p["customer_id"],
                        p["payment_date"].isoformat(),
                        p["amount"],
                        p["unmatched_amount"],
                        str(p["match_status"]),
                        p["remarks"],
                    ]
                )

    def export_correction_tasks_to_csv(self, file_path: str) -> None:
        tasks = self.correction_advisor.get_all_correction_tasks()
        all_tasks = tasks["high_priority"] + tasks["medium_priority"]

        with open(file_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(
                [
                    "任务类型",
                    "优先级",
                    "客户ID",
                    "客户名称",
                    "问题描述",
                    "建议操作",
                ]
            )

            for task in all_tasks:
                writer.writerow(
                    [
                        task["type"],
                        task["priority"],
                        task["customer_id"],
                        task["customer_name"],
                        task["description"],
                        task["action"],
                    ]
                )

    def get_chart_data(self) -> Dict[str, Any]:
        credit_summary = self.get_credit_summary_data()
        payment_data = self.get_payment_data()
        correction_data = self.get_correction_data()

        return {
            "status_pie_chart": {
                "labels": list(credit_summary["status_distribution"].keys()),
                "values": list(credit_summary["status_distribution"].values()),
                "title": "客户信用状态分布",
            },
            "usage_bar_chart": {
                "labels": [c["customer_name"] for c in credit_summary["top_usage_customers"]],
                "values": [c["usage_rate"] for c in credit_summary["top_usage_customers"]],
                "title": "额度使用率TOP10",
            },
            "unmatched_payments_trend": {
                "total_count": payment_data["unmatched_summary"]["total_unmatched_count"],
                "total_amount": payment_data["unmatched_summary"]["total_unmatched_amount"],
            },
            "correction_tasks_summary": {
                "high_priority": len(correction_data["correction_tasks"]["high_priority"]),
                "medium_priority": len(correction_data["correction_tasks"]["medium_priority"]),
                "pending_returns": correction_data["correction_tasks"]["summary"]["pending_returns_count"],
                "expired_temp": correction_data["correction_tasks"]["summary"]["expired_temp_count"],
            },
        }

    def get_customer_detail(self, customer_id: str) -> Dict[str, Any]:
        usage = self.calculator.get_credit_usage(customer_id)
        if not usage:
            return {}

        can_ship, ship_message = self.calculator.can_ship(customer_id)
        return_suggestions = self.correction_advisor.get_return_correction_suggestions(customer_id)
        temp_suggestions = self.correction_advisor.get_temp_limit_correction_suggestions(customer_id)

        customer_orders = [
            o for o in self.calculator.sales_orders.values() if o.customer_id == customer_id
        ]
        customer_payments = [
            p for p in self.calculator.payments.values() if p.customer_id == customer_id
        ]
        customer_returns = [
            r for r in self.calculator.return_orders.values() if r.customer_id == customer_id
        ]

        return {
            "usage": usage,
            "can_ship": can_ship,
            "ship_message": ship_message,
            "return_suggestions": return_suggestions,
            "temp_suggestions": temp_suggestions,
            "orders": [
                {
                    "order_id": o.order_id,
                    "order_date": o.order_date,
                    "total_amount": o.total_amount,
                    "credit_amount": o.credit_amount,
                    "paid_amount": o.paid_amount,
                    "unpaid": o.credit_amount - o.paid_amount,
                }
                for o in customer_orders
            ],
            "payments": [
                {
                    "payment_id": p.payment_id,
                    "payment_date": p.payment_date,
                    "amount": p.amount,
                    "matched_amount": p.matched_amount,
                    "status": str(p.match_status),
                }
                for p in customer_payments
            ],
            "returns": [
                {
                    "return_id": r.return_id,
                    "order_id": r.order_id,
                    "return_date": r.return_date,
                    "return_amount": r.return_amount,
                    "status": str(r.status),
                }
                for r in customer_returns
            ],
        }
