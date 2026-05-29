"""核心反推引擎 - 从最终报价反算折扣阶梯、审批级别、舍入口径"""

from typing import List, Dict, Optional, Tuple
from decimal import Decimal, ROUND_HALF_UP, ROUND_DOWN, ROUND_UP, ROUND_HALF_EVEN
import math

from .models import (
    QuoteItem, DiscountTier, CustomerLevel, ApprovalLevel,
    BacktraceResult, BacktraceSummary, RoundingMode
)


class QuoteBacktester:
    """报价阶梯反推器核心引擎"""

    def __init__(
        self,
        discount_tiers: List[DiscountTier],
        customer_levels: List[CustomerLevel],
        approval_levels: List[ApprovalLevel],
        tolerance: float = 0.01,
        rounding_decimal_places: int = 2,
        run_mode: str = "daily"
    ):
        self.discount_tiers = discount_tiers
        self.customer_levels = customer_levels
        self.approval_levels = approval_levels
        self.tolerance = tolerance
        self.rounding_decimal_places = rounding_decimal_places
        self.run_mode = run_mode
        
        self.customer_level_map: Dict[str, CustomerLevel] = {
            cl.level_name: cl for cl in customer_levels
        }
        self.approval_level_map: Dict[str, ApprovalLevel] = {
            al.level_name: al for al in approval_levels
        }

    def backtrace(self, quote_item: QuoteItem) -> BacktraceResult:
        """对单条报价记录进行反推"""
        transaction_amount = quote_item.final_price * quote_item.quantity
        actual_discount_rate = quote_item.actual_discount_rate

        result = BacktraceResult(
            quote_item=quote_item,
            transaction_amount=transaction_amount,
            actual_discount_rate=actual_discount_rate
        )

        applicable_tiers = self._find_applicable_tiers(quote_item, transaction_amount)
        result.applicable_tiers = applicable_tiers

        overlapping_groups = self._detect_overlapping_tiers(applicable_tiers)
        result.overlapping_tiers = overlapping_groups

        matched_tier, confidence = self._match_best_tier(
            actual_discount_rate, applicable_tiers, overlapping_groups
        )
        result.matched_tier = matched_tier
        result.tier_match_confidence = confidence

        self._check_tier_anomalies(result, quote_item, overlapping_groups)

        required_approval, actual_approval, is_overridden = self._verify_approval(
            quote_item, matched_tier, actual_discount_rate, transaction_amount
        )
        result.required_approval = required_approval
        result.actual_approval = actual_approval
        result.is_approval_overridden = is_overridden

        if is_overridden:
            result.anomalies.append(
                f"审批越权：该折扣({actual_discount_rate*100:.1f}%)需要「{required_approval.level_name}」级别审批，"
                f"但实际由「{actual_approval.level_name if actual_approval else '未指定'}」审批"
            )

        rounding_mode, error, theoretical_prices = self._infer_rounding_mode(
            quote_item.list_price, actual_discount_rate, quote_item.final_price
        )
        result.inferred_rounding_mode = rounding_mode
        result.rounding_error = error
        result.theoretical_prices = theoretical_prices

        if abs(error) > self.tolerance:
            result.warnings.append(
                f"舍入误差：按「{rounding_mode.value}」计算理论价应为{theoretical_prices[rounding_mode.value]:.2f}，"
                f"实际报价{quote_item.final_price:.2f}，差异{error:.2f}元"
            )

        self._generate_explanations(result, quote_item)

        return result

    def backtrace_batch(self, quote_items: List[QuoteItem]) -> Tuple[List[BacktraceResult], BacktraceSummary]:
        """批量反推报价记录"""
        results = []
        summary = BacktraceSummary(run_mode=self.run_mode)
        summary.total_records = len(quote_items)
        
        all_overlapping_groups: Dict[str, List[DiscountTier]] = {}

        for item in quote_items:
            result = self.backtrace(item)
            results.append(result)

            if result.anomalies:
                summary.records_with_anomalies += 1
            if result.warnings:
                summary.records_with_warnings += 1
            if result.overlapping_tiers:
                summary.records_with_overlapping_tiers += 1
                for group in result.overlapping_tiers:
                    key = "|".join(sorted(t.tier_name for t in group))
                    if key not in all_overlapping_groups:
                        all_overlapping_groups[key] = group
            if result.is_approval_overridden:
                summary.records_with_approval_overrides += 1
            if abs(result.rounding_error) > self.tolerance:
                summary.records_with_rounding_issues += 1
                summary.total_rounding_error_amount += abs(result.rounding_error)

        summary.overlapping_tier_groups = list(all_overlapping_groups.values())

        return results, summary

    def _find_applicable_tiers(
        self, quote_item: QuoteItem, transaction_amount: float
    ) -> List[DiscountTier]:
        """找出适用的折扣阶梯（金额匹配 + 客户等级匹配）"""
        applicable = []
        for tier in self.discount_tiers:
            if not tier.is_active:
                continue
            if tier.matches_amount(transaction_amount) and tier.matches_customer(quote_item.customer_level_raw):
                applicable.append(tier)
        
        applicable.sort(key=lambda t: t.discount_rate, reverse=True)
        return applicable

    def _detect_overlapping_tiers(
        self, tiers: List[DiscountTier]
    ) -> List[List[DiscountTier]]:
        """检测阶梯重叠问题"""
        overlapping_groups = []
        
        for i, tier1 in enumerate(tiers):
            for tier2 in tiers[i+1:]:
                if self._tiers_overlap(tier1, tier2):
                    group = [tier1, tier2]
                    existing_group = None
                    for g in overlapping_groups:
                        if any(t in g for t in group):
                            existing_group = g
                            break
                    
                    if existing_group:
                        for t in group:
                            if t not in existing_group:
                                existing_group.append(t)
                    else:
                        overlapping_groups.append(group)
        
        return overlapping_groups

    def _tiers_overlap(self, tier1: DiscountTier, tier2: DiscountTier) -> bool:
        """判断两个阶梯是否重叠"""
        if tier1.min_amount == tier2.min_amount:
            max1 = tier1.max_amount if tier1.max_amount is not None else float('inf')
            max2 = tier2.max_amount if tier2.max_amount is not None else float('inf')
            return max1 > tier2.min_amount and max2 > tier1.min_amount
        
        low, high = (tier1, tier2) if tier1.min_amount < tier2.min_amount else (tier2, tier1)
        low_max = low.max_amount if low.max_amount is not None else float('inf')
        return high.min_amount < low_max

    def _match_best_tier(
        self,
        actual_discount_rate: float,
        applicable_tiers: List[DiscountTier],
        overlapping_groups: List[List[DiscountTier]]
    ) -> Tuple[Optional[DiscountTier], float]:
        """匹配最接近的折扣阶梯"""
        if not applicable_tiers:
            return None, 0.0

        best_tier = None
        best_diff = float('inf')
        best_confidence = 0.0

        for tier in applicable_tiers:
            diff = abs(tier.discount_rate - actual_discount_rate)
            
            is_in_overlap = any(tier in group for group in overlapping_groups)
            overlap_penalty = 0.3 if is_in_overlap else 0.0
            
            confidence = max(0.0, 1.0 - diff * 10 - overlap_penalty)
            confidence = min(1.0, confidence)

            if diff < best_diff:
                best_diff = diff
                best_tier = tier
                best_confidence = confidence

        return best_tier, best_confidence

    def _check_tier_anomalies(
        self, result: BacktraceResult, quote_item: QuoteItem,
        overlapping_groups: List[List[DiscountTier]]
    ) -> None:
        """检查阶梯相关异常"""
        if not result.applicable_tiers:
            result.anomalies.append(
                f"无匹配阶梯：金额{result.transaction_amount:.2f}元、"
                f"客户等级「{quote_item.customer_level_raw}」没有对应的折扣阶梯"
            )
            return

        if overlapping_groups:
            for i, group in enumerate(overlapping_groups, 1):
                tier_names = "、".join(f"「{t.tier_name}」" for t in group)
                ranges = []
                for t in group:
                    max_str = f"{t.max_amount:.2f}" if t.max_amount else "∞"
                    ranges.append(f"{t.min_amount:.2f}~{max_str}")
                result.anomalies.append(
                    f"阶梯重叠（组{i}）：{tier_names} 区间{', '.join(ranges)}存在重叠，"
                    f"可能导致同金额可以套用不同折扣"
                )

        if result.matched_tier and result.tier_match_confidence < 0.5:
            result.warnings.append(
                f"阶梯匹配存疑：最接近的「{result.matched_tier.tier_name}」"
                f"折扣{result.matched_tier.discount_rate*100:.1f}%与实际"
                f"{result.actual_discount_rate*100:.1f}%差异较大"
            )

    def _verify_approval(
        self,
        quote_item: QuoteItem,
        matched_tier: Optional[DiscountTier],
        actual_discount_rate: float,
        transaction_amount: float
    ) -> Tuple[Optional[ApprovalLevel], Optional[ApprovalLevel], bool]:
        """验证审批级别是否正确"""
        required_approval = None
        actual_approval = None
        is_overridden = False

        min_level_for_discount = None
        min_level_order = float('inf')
        for al in self.approval_levels:
            if al.can_approve(actual_discount_rate, transaction_amount):
                if al.level_order < min_level_order:
                    min_level_order = al.level_order
                    min_level_for_discount = al

        tier_required_approval = None
        if matched_tier:
            tier_required_approval = self.approval_level_map.get(matched_tier.required_approval_level)

        if min_level_for_discount and tier_required_approval:
            if min_level_for_discount.level_order <= tier_required_approval.level_order:
                required_approval = min_level_for_discount
            else:
                required_approval = tier_required_approval
        elif min_level_for_discount:
            required_approval = min_level_for_discount
        else:
            required_approval = tier_required_approval

        if quote_item.approval_level_raw:
            actual_approval = self.approval_level_map.get(quote_item.approval_level_raw)

        if required_approval and actual_approval:
            if actual_approval.level_order < required_approval.level_order:
                is_overridden = True
            elif not actual_approval.can_approve(actual_discount_rate, transaction_amount):
                is_overridden = True

        return required_approval, actual_approval, is_overridden

    def _infer_rounding_mode(
        self, list_price: float, discount_rate: float, final_price: float
    ) -> Tuple[RoundingMode, float, Dict[str, float]]:
        """反推舍入模式"""
        raw_price = list_price * (1 - discount_rate)
        
        theoretical_prices: Dict[str, float] = {}
        
        theoretical_prices[RoundingMode.ROUND_HALF_UP.value] = self._apply_rounding(
            raw_price, RoundingMode.ROUND_HALF_UP
        )
        theoretical_prices[RoundingMode.ROUND_DOWN.value] = self._apply_rounding(
            raw_price, RoundingMode.ROUND_DOWN
        )
        theoretical_prices[RoundingMode.ROUND_UP.value] = self._apply_rounding(
            raw_price, RoundingMode.ROUND_UP
        )
        theoretical_prices[RoundingMode.ROUND_HALF_EVEN.value] = self._apply_rounding(
            raw_price, RoundingMode.ROUND_HALF_EVEN
        )
        theoretical_prices[RoundingMode.TRUNCATE.value] = self._apply_rounding(
            raw_price, RoundingMode.TRUNCATE
        )

        best_mode = RoundingMode.ROUND_HALF_UP
        best_error = float('inf')

        for mode in RoundingMode:
            theo_price = theoretical_prices[mode.value]
            error = abs(theo_price - final_price)
            if error < best_error:
                best_error = error
                best_mode = mode

        actual_error = final_price - raw_price
        
        return best_mode, actual_error, theoretical_prices

    def _apply_rounding(self, value: float, mode: RoundingMode) -> float:
        """应用指定的舍入模式"""
        d = Decimal(str(value))
        places = Decimal(f'0.{"0" * self.rounding_decimal_places}')
        
        if mode == RoundingMode.ROUND_HALF_UP:
            return float(d.quantize(places, rounding=ROUND_HALF_UP))
        elif mode == RoundingMode.ROUND_DOWN:
            return float(d.quantize(places, rounding=ROUND_DOWN))
        elif mode == RoundingMode.ROUND_UP:
            return float(d.quantize(places, rounding=ROUND_UP))
        elif mode == RoundingMode.ROUND_HALF_EVEN:
            return float(d.quantize(places, rounding=ROUND_HALF_EVEN))
        elif mode == RoundingMode.TRUNCATE:
            factor = 10 ** self.rounding_decimal_places
            return math.trunc(value * factor) / factor
        else:
            return float(d.quantize(places, rounding=ROUND_HALF_UP))

    def _generate_explanations(self, result: BacktraceResult, quote_item: QuoteItem) -> None:
        """生成销售经理能转述的解释说明"""
        explanations = []

        if result.matched_tier:
            tier = result.matched_tier
            max_str = f"{tier.max_amount:.2f}" if tier.max_amount else "无限大"
            explanations.append(
                f"该单金额{result.transaction_amount:.2f}元落在「{tier.tier_name}」"
                f"阶梯区间[{tier.min_amount:.2f}, {max_str})，对应折扣{tier.discount_rate*100:.1f}%"
            )

        if result.overlapping_tiers:
            tier_names = "、".join(f"「{t.tier_name}」" for group in result.overlapping_tiers for t in group)
            explanations.append(
                f"警告：存在{len(result.overlapping_tiers)}组阶梯重叠（涉及{tier_names}），建议核对配置避免争议"
            )

        if result.is_approval_overridden:
            req = result.required_approval
            actual = result.actual_approval
            explanations.append(
                f"审批越权：「{req.level_name if req else '未知级别'}」才有权力批"
                f"{result.actual_discount_rate*100:.1f}%折扣，"
                f"「{actual.level_name if actual else '实际审批人'}」级别不够"
            )

        if result.inferred_rounding_mode:
            explanations.append(
                f"价格计算采用「{result.inferred_rounding_mode.value}」，"
                f"保留{self.rounding_decimal_places}位小数"
            )

        if abs(result.rounding_error) > self.tolerance:
            explanations.append(
                f"舍入误差「{result.rounding_error:.2f}元」，超过容忍阈值「{self.tolerance}元」，建议复核"
            )

        customer_level = self.customer_level_map.get(quote_item.customer_level_raw)
        if customer_level:
            if result.actual_discount_rate > customer_level.max_allowed_discount_rate:
                explanations.append(
                    f"客户「{quote_item.customer_name}」等级「{customer_level.level_name}」"
                    f"最大折扣「{customer_level.max_allowed_discount_rate*100:.1f}%」，"
                    f"实际「{result.actual_discount_rate*100:.1f}%」超出上限"
                )

        result.explanations = explanations
