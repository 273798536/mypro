from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime

from .models import DiscountTier, ExceptionType, ReverseStep
from .config_loader import ConfigLoader


@dataclass
class TierOverlapIssue:
    tier1_id: str
    tier2_id: str
    overlap_range: Tuple[float, float]
    severity: str = "warning"

    def to_dict(self) -> Dict:
        return {
            "tier1_id": self.tier1_id,
            "tier2_id": self.tier2_id,
            "overlap_range": [self.overlap_range[0], self.overlap_range[1]],
            "severity": self.severity,
            "description": f"阶梯[{self.tier1_id}]与[{self.tier2_id}]在区间{self.overlap_range}重叠"
        }


@dataclass
class TierGapIssue:
    previous_tier_id: str
    next_tier_id: str
    gap_range: Tuple[float, float]
    severity: str = "info"

    def to_dict(self) -> Dict:
        return {
            "previous_tier_id": self.previous_tier_id,
            "next_tier_id": self.next_tier_id,
            "gap_range": [self.gap_range[0], self.gap_range[1]],
            "severity": self.severity,
            "description": f"阶梯[{self.previous_tier_id}]与[{self.next_tier_id}]之间存在间隙{self.gap_range}"
        }


@dataclass
class ConfigValidationResult:
    is_valid: bool
    overlap_issues: List[TierOverlapIssue]
    gap_issues: List[TierGapIssue]
    other_issues: List[str]
    checked_at: datetime = None

    def __post_init__(self):
        if self.checked_at is None:
            self.checked_at = datetime.now()

    @property
    def has_warnings(self) -> bool:
        return len(self.overlap_issues) > 0 or len(self.gap_issues) > 0

    def to_dict(self) -> Dict:
        return {
            "is_valid": self.is_valid,
            "has_warnings": self.has_warnings,
            "overlap_issues": [i.to_dict() for i in self.overlap_issues],
            "gap_issues": [i.to_dict() for i in self.gap_issues],
            "other_issues": self.other_issues,
            "checked_at": self.checked_at.isoformat()
        }


class ConfigValidator:
    def __init__(self, config_loader: ConfigLoader):
        self.config_loader = config_loader

    def validate_tiers(self) -> ConfigValidationResult:
        tiers = self.config_loader.get_tier_list()
        overlap_issues: List[TierOverlapIssue] = []
        gap_issues: List[TierGapIssue] = []
        other_issues: List[str] = []

        for i, tier1 in enumerate(tiers):
            for j, tier2 in enumerate(tiers):
                if i >= j:
                    continue

                overlap = self._check_overlap(tier1, tier2)
                if overlap:
                    overlap_issues.append(TierOverlapIssue(
                        tier1_id=tier1.tier_id,
                        tier2_id=tier2.tier_id,
                        overlap_range=overlap,
                        severity="error" if overlap[0] != overlap[1] else "warning"
                    ))

        for i in range(len(tiers) - 1):
            gap = self._check_gap(tiers[i], tiers[i + 1])
            if gap:
                gap_issues.append(TierGapIssue(
                    previous_tier_id=tiers[i].tier_id,
                    next_tier_id=tiers[i + 1].tier_id,
                    gap_range=gap
                ))

        for tier in tiers:
            if tier.min_quantity < 0:
                other_issues.append(f"阶梯[{tier.tier_id}]最小数量{tier.min_quantity}不能为负数")
            if tier.max_quantity is not None and tier.max_quantity < tier.min_quantity:
                other_issues.append(f"阶梯[{tier.tier_id}]最大数量{tier.max_quantity}小于最小数量{tier.min_quantity}")
            if tier.discount_rate < 0 or tier.discount_rate > 1:
                other_issues.append(f"阶梯[{tier.tier_id}]折扣率{tier.discount_rate}应在0到1之间")

        is_valid = len(other_issues) == 0

        return ConfigValidationResult(
            is_valid=is_valid,
            overlap_issues=overlap_issues,
            gap_issues=gap_issues,
            other_issues=other_issues
        )

    def _check_overlap(self, tier1: DiscountTier, tier2: DiscountTier) -> Optional[Tuple[float, float]]:
        t1_max = tier1.max_quantity if tier1.max_quantity is not None else float('inf')
        t2_max = tier2.max_quantity if tier2.max_quantity is not None else float('inf')

        overlap_start = max(tier1.min_quantity, tier2.min_quantity)
        overlap_end = min(t1_max, t2_max)

        if overlap_start <= overlap_end:
            return (overlap_start, overlap_end)
        return None

    def _check_gap(self, lower_tier: DiscountTier, upper_tier: DiscountTier) -> Optional[Tuple[float, float]]:
        if lower_tier.max_quantity is None:
            return None

        gap_start = lower_tier.max_quantity + 0.0001
        gap_end = upper_tier.min_quantity - 0.0001

        if gap_start < gap_end:
            return (round(gap_start, 4), round(gap_end, 4))
        return None

    def generate_validation_report(self, result: ConfigValidationResult) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append("配置校验报告")
        lines.append("=" * 60)

        if result.is_valid and not result.has_warnings:
            lines.append("✅ 配置完全正确，无任何问题")
        else:
            lines.append(f"配置有效性: {'✅ 通过' if result.is_valid else '❌ 失败'}")
            lines.append(f"警告数量: {len(result.overlap_issues) + len(result.gap_issues)}")

            if result.overlap_issues:
                lines.append("\n⚠️  阶梯重叠问题:")
                for issue in result.overlap_issues:
                    lines.append(f"  [{issue.severity.upper()}] {issue.to_dict()['description']}")

            if result.gap_issues:
                lines.append("\nℹ️  阶梯间隙问题:")
                for issue in result.gap_issues:
                    lines.append(f"  [{issue.severity.upper()}] {issue.to_dict()['description']}")

            if result.other_issues:
                lines.append("\n❌ 其他问题:")
                for issue in result.other_issues:
                    lines.append(f"  - {issue}")

        lines.append("\n" + "=" * 60)
        return "\n".join(lines)
