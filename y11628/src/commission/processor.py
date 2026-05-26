from typing import List, Dict, Tuple
from collections import defaultdict
from .models import (
    SalesOrder,
    CalculationResult,
    OrderStatus,
    ValidationIssue,
    ReportSummary,
    CorrectionRecord,
)


class OrderProcessor:
    def __init__(self, calculator):
        self.calculator = calculator
        self.all_validation_issues: List[ValidationIssue] = []

    def process_batch(self, orders: List[SalesOrder]) -> List[CalculationResult]:
        results = []
        self.all_validation_issues = []

        for order in orders:
            result = self.calculator.calculate(order)
            results.append(result)
            self.all_validation_issues.extend(self.calculator.get_validation_issues())

        return results

    def group_by_status(
        self, results: List[CalculationResult]
    ) -> Dict[OrderStatus, List[CalculationResult]]:
        grouped = defaultdict(list)
        for result in results:
            grouped[result.status].append(result)
        return dict(grouped)

    def group_by_salesperson(
        self, results: List[CalculationResult]
    ) -> Dict[str, List[CalculationResult]]:
        grouped = defaultdict(list)
        for result in results:
            grouped[result.salesperson].append(result)
        return dict(grouped)

    def group_by_region(
        self, results: List[CalculationResult], orders: List[SalesOrder]
    ) -> Dict[str, List[CalculationResult]]:
        order_map = {o.order_id: o for o in orders}
        grouped = defaultdict(list)
        for result in results:
            order = order_map.get(result.order_id)
            region = order.region if order else "未知"
            grouped[region].append(result)
        return dict(grouped)

    def get_pending_review(self, results: List[CalculationResult]) -> List[CalculationResult]:
        return [r for r in results if r.status == OrderStatus.MANUAL_REVIEW]

    def get_cross_region(self, results: List[CalculationResult]) -> List[CalculationResult]:
        return [r for r in results if r.status == OrderStatus.CROSS_REGION]

    def get_payment_pending(self, results: List[CalculationResult]) -> List[CalculationResult]:
        return [r for r in results if r.status == OrderStatus.PAYMENT_PENDING]

    def get_rate_mismatch(self, results: List[CalculationResult]) -> List[CalculationResult]:
        return [r for r in results if r.status == OrderStatus.RATE_VERSION_MISMATCH]

    def get_errors(self, results: List[CalculationResult]) -> List[CalculationResult]:
        return [r for r in results if r.status in [OrderStatus.ERROR, OrderStatus.MISSING_DATA]]

    def get_normal(self, results: List[CalculationResult]) -> List[CalculationResult]:
        return [r for r in results if r.status == OrderStatus.NORMAL]

    def get_corrected(self, results: List[CalculationResult]) -> List[CalculationResult]:
        return [r for r in results if r.status == OrderStatus.CORRECTED]

    def summarize(self, results: List[CalculationResult]) -> ReportSummary:
        summary = ReportSummary()
        summary.total_orders = len(results)

        status_groups = self.group_by_status(results)

        summary.normal_count = len(status_groups.get(OrderStatus.NORMAL, []))
        summary.corrected_count = len(status_groups.get(OrderStatus.CORRECTED, []))
        summary.pending_review_count = len(status_groups.get(OrderStatus.MANUAL_REVIEW, []))
        summary.error_count = len(
            status_groups.get(OrderStatus.ERROR, [])
            + status_groups.get(OrderStatus.MISSING_DATA, [])
        )
        summary.cross_region_count = len(status_groups.get(OrderStatus.CROSS_REGION, []))
        summary.payment_pending_count = len(status_groups.get(OrderStatus.PAYMENT_PENDING, []))
        summary.rate_mismatch_count = len(status_groups.get(OrderStatus.RATE_VERSION_MISMATCH, []))

        for result in results:
            summary.total_commission += result.final_commission

        summary.corrections_count = len(
            [r for r in results if r.status == OrderStatus.CORRECTED]
        )

        return summary

    def summarize_by_salesperson(
        self, results: List[CalculationResult]
    ) -> List[Dict]:
        groups = self.group_by_salesperson(results)
        summaries = []

        for person, person_results in groups.items():
            total_amount = sum(r.base_amount for r in person_results)
            total_commission = sum(r.final_commission for r in person_results)
            normal = sum(1 for r in person_results if r.status == OrderStatus.NORMAL)
            issues = len(person_results) - normal

            summaries.append(
                {
                    "salesperson": person,
                    "order_count": len(person_results),
                    "total_amount": total_amount,
                    "total_commission": total_commission,
                    "normal_count": normal,
                    "issue_count": issues,
                }
            )

        return sorted(summaries, key=lambda x: x["total_commission"], reverse=True)

    def apply_corrections(
        self,
        orders: List[SalesOrder],
        corrections: List[CorrectionRecord],
    ) -> List[SalesOrder]:
        correction_map = defaultdict(list)
        for corr in corrections:
            correction_map[corr.order_id].append(corr)

        corrected_orders = []
        for order in orders:
            order_corrections = correction_map.get(order.order_id, [])
            if not order_corrections:
                corrected_orders.append(order)
                continue

            new_order = self._apply_order_corrections(order, order_corrections)
            corrected_orders.append(new_order)

        return corrected_orders

    def _apply_order_corrections(
        self, order: SalesOrder, corrections: List[CorrectionRecord]
    ) -> SalesOrder:
        for corr in corrections:
            if hasattr(order, corr.field_name):
                setattr(order, corr.field_name, corr.new_value)
        return order
