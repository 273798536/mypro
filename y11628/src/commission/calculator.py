from datetime import datetime
from typing import List, Dict, Tuple, Optional
from .models import (
    SalesOrder,
    RegionRule,
    TierRate,
    CalculationResult,
    OrderStatus,
    ValidationIssue,
)


class CommissionCalculator:
    def __init__(
        self,
        tier_rates: List[TierRate],
        region_rules: Dict[str, RegionRule],
        target_quarter: Optional[str] = None,
    ):
        self.tier_rates = tier_rates
        self.region_rules = region_rules
        self.target_quarter = target_quarter
        self.validation_issues: List[ValidationIssue] = []

    def calculate(self, order: SalesOrder) -> CalculationResult:
        result = CalculationResult(
            order_id=order.order_id,
            salesperson=order.salesperson,
            base_amount=order.amount,
            applicable_rate=0.0,
            commission_before_adjustment=0.0,
            adjustment=0.0,
            final_commission=0.0,
            status=OrderStatus.NORMAL,
        )

        self.validation_issues = []

        if not self._validate_required_fields(order, result):
            return result

        region_rule = self._get_region_rule(order, result)
        if region_rule is None or result.status in [OrderStatus.ERROR, OrderStatus.MANUAL_REVIEW]:
            return result

        self._check_cross_region(order, region_rule, result)
        self._check_payment_status(order, region_rule, result)

        applicable_rate, tier_level, version_used = self._get_applicable_rate(order, result)
        result.applicable_rate = applicable_rate
        result.tier_level = tier_level
        result.rate_version_used = version_used

        result.commission_before_adjustment = order.amount * applicable_rate
        result.final_commission = result.commission_before_adjustment + result.adjustment

        if result.status == OrderStatus.NORMAL and not result.messages:
            result.messages.append("计算正常")

        return result

    def _validate_required_fields(self, order: SalesOrder, result: CalculationResult) -> bool:
        missing = []
        if not order.order_id:
            missing.append("订单ID")
        if not order.salesperson:
            missing.append("销售人员")
        if not order.region:
            missing.append("区域")
        if not order.product_line:
            missing.append("产品线")
        if order.amount <= 0:
            missing.append("订单金额")
        if not order.order_date:
            missing.append("订单日期")

        if missing:
            result.status = OrderStatus.MISSING_DATA
            result.messages.append(f"缺失必填字段: {', '.join(missing)}")
            return False
        return True

    def _get_region_rule(self, order: SalesOrder, result: CalculationResult) -> Optional[RegionRule]:
        rule = self.region_rules.get(order.region)
        if not rule:
            result.status = OrderStatus.MANUAL_REVIEW
            result.messages.append(f"区域 '{order.region}' 未在规则表中定义")
            self.validation_issues.append(
                ValidationIssue(
                    order_id=order.order_id,
                    issue_type="region_undefined",
                    severity="high",
                    message=f"区域 '{order.region}' 未配置规则",
                    suggested_fix="请在区域规则表中添加该区域配置",
                )
            )
        return rule

    def _check_cross_region(
        self, order: SalesOrder, region_rule: RegionRule, result: CalculationResult
    ) -> None:
        if order.region not in region_rule.allowed_product_lines and region_rule.allowed_product_lines:
            if order.product_line not in region_rule.allowed_product_lines:
                if region_rule.cross_region_allowed:
                    result.status = OrderStatus.CROSS_REGION
                    penalty = order.amount * region_rule.cross_region_penalty
                    result.adjustment -= penalty
                    result.messages.append(
                        f"跨区销售: 产品线 '{order.product_line}' 不属区域 '{order.region}', "
                        f"已扣除罚金 {penalty:.2f} ({region_rule.cross_region_penalty*100}%)"
                    )
                else:
                    result.status = OrderStatus.MANUAL_REVIEW
                    result.messages.append(
                        f"跨区销售警告: 产品线 '{order.product_line}' 不在区域 '{order.region}' 允许范围内, "
                        f"需人工确认"
                    )
                    self.validation_issues.append(
                        ValidationIssue(
                            order_id=order.order_id,
                            issue_type="cross_region",
                            severity="medium",
                            message=f"跨区销售: {order.product_line} 在 {order.region}",
                            suggested_fix="确认是否允许跨区销售或调整区域归属",
                        )
                    )

    def _check_payment_status(
        self, order: SalesOrder, region_rule: RegionRule, result: CalculationResult
    ) -> None:
        if order.payment_status.lower() in ["未回款", "partial", "pending"]:
            result.status = OrderStatus.PAYMENT_PENDING
            payment_ratio = order.payment_amount / order.amount if order.amount > 0 else 0
            result.messages.append(
                f"回款未达标: 状态='{order.payment_status}', "
                f"已回款 {order.payment_amount:.2f} ({payment_ratio*100:.1f}%)"
            )
            result.adjustment -= result.commission_before_adjustment * 0.5

        if order.payment_date:
            try:
                order_dt = datetime.strptime(order.order_date, "%Y-%m-%d")
                payment_dt = datetime.strptime(order.payment_date, "%Y-%m-%d")
                days_diff = (payment_dt - order_dt).days
                if days_diff > region_rule.payment_requirement_days:
                    overdue_days = days_diff - region_rule.payment_requirement_days
                    result.messages.append(
                        f"回款逾期 {overdue_days} 天 (要求 {region_rule.payment_requirement_days} 天内)"
                    )
            except (ValueError, TypeError):
                pass

    def _get_applicable_rate(
        self, order: SalesOrder, result: CalculationResult
    ) -> Tuple[float, str, str]:
        applicable_rates = [
            r
            for r in self.tier_rates
            if r.product_line == order.product_line
        ]

        if not applicable_rates:
            result.status = OrderStatus.ERROR
            result.messages.append(f"产品线 '{order.product_line}' 无对应的费率配置")
            return 0.0, "", ""

        version_matched = [r for r in applicable_rates if r.rate_version == order.rate_version]
        if order.rate_version and not version_matched:
            result.status = OrderStatus.RATE_VERSION_MISMATCH
            result.messages.append(
                f"费率版本不匹配: 订单指定版本 '{order.rate_version}' 不存在, 将使用最新版本"
            )
            self.validation_issues.append(
                ValidationIssue(
                    order_id=order.order_id,
                    issue_type="rate_version_mismatch",
                    severity="high",
                    message=f"费率版本 '{order.rate_version}' 无效",
                    suggested_fix="检查订单费率版本或更新费率表",
                )
            )

        if version_matched:
            rates_to_use = version_matched
            version_used = order.rate_version
        else:
            rates_to_use = self._filter_by_date(applicable_rates, order.order_date)
            version_used = rates_to_use[0].rate_version if rates_to_use else ""

        if not rates_to_use:
            result.status = OrderStatus.ERROR
            result.messages.append(f"订单日期 '{order.order_date}' 不在任何费率有效期内")
            return 0.0, "", version_used

        tier = self._find_tier(rates_to_use, order.amount)
        if tier:
            return tier.rate, self._get_tier_label(tier), version_used

        result.status = OrderStatus.ERROR
        result.messages.append(f"订单金额 {order.amount:.2f} 不在任何费率阶梯范围内")
        return 0.0, "", version_used

    def _filter_by_date(self, rates: List[TierRate], order_date: str) -> List[TierRate]:
        try:
            dt = datetime.strptime(order_date, "%Y-%m-%d")
        except (ValueError, TypeError):
            return rates

        filtered = []
        for r in rates:
            try:
                effective = datetime.strptime(r.effective_date, "%Y-%m-%d")
                if dt < effective:
                    continue
                if r.expiry_date:
                    expiry = datetime.strptime(r.expiry_date, "%Y-%m-%d")
                    if dt > expiry:
                        continue
                filtered.append(r)
            except (ValueError, TypeError):
                filtered.append(r)

        return filtered if filtered else rates

    def _find_tier(self, rates: List[TierRate], amount: float) -> Optional[TierRate]:
        for rate in sorted(rates, key=lambda r: r.min_amount):
            if rate.max_amount is None:
                if amount >= rate.min_amount:
                    return rate
            elif rate.min_amount <= amount < rate.max_amount:
                return rate
        return None

    def _get_tier_label(self, tier: TierRate) -> str:
        if tier.max_amount is None:
            return f"{tier.min_amount:.0f}+"
        return f"{tier.min_amount:.0f}-{tier.max_amount:.0f}"

    def get_validation_issues(self) -> List[ValidationIssue]:
        return self.validation_issues
