import uuid
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from collections import defaultdict

from .models import (
    PolicyRecord,
    LossDistribution,
    ExpenseRate,
    DeductibleRule,
    ConflictRecord,
    ConflictType,
    DataSource,
    ExecutionTimeline,
)


class ConflictDetector:
    def __init__(self):
        self.conflicts: List[ConflictRecord] = []
        self.timeline: List[ExecutionTimeline] = []
        self._order_counter = 0

    def _add_timeline_event(self, event: str, description: str) -> None:
        self._order_counter += 1
        self.timeline.append(
            ExecutionTimeline(
                event=event,
                timestamp=datetime.now(),
                description=description,
                order_index=self._order_counter,
            )
        )

    def _create_conflict(
        self,
        conflict_type: ConflictType,
        description: str,
        sources: List[DataSource],
        values: Dict,
        policy_id: Optional[str] = None,
        policy_type: Optional[str] = None,
        resolution: str = "待人工审核",
    ) -> ConflictRecord:
        self._order_counter += 1
        conflict = ConflictRecord(
            conflict_id=str(uuid.uuid4()),
            conflict_type=conflict_type,
            description=description,
            sources=sources,
            policy_id=policy_id,
            policy_type=policy_type,
            values=values,
            resolution=resolution,
            timestamp=datetime.now(),
            order_index=self._order_counter,
        )
        self.conflicts.append(conflict)
        return conflict

    def detect_all_conflicts(
        self,
        policies: List[PolicyRecord],
        loss_distributions: List[LossDistribution],
        expense_rates: List[ExpenseRate],
        deductible_rules: List[DeductibleRule],
    ) -> Tuple[List[ConflictRecord], List[ExecutionTimeline]]:
        self._add_timeline_event("开始检测", "启动冲突检测流程")
        self._check_deductible_timing(deductible_rules)
        self._check_sample_sufficiency(loss_distributions)
        self._check_deductible_policy_conflict(policies, deductible_rules)
        self._check_loss_distribution_extremes(loss_distributions)
        self._add_timeline_event("检测完成", f"共发现 {len(self.conflicts)} 个冲突")
        return self.conflicts, self.timeline

    def _check_deductible_timing(self, rules: List[DeductibleRule]) -> None:
        for rule in rules:
            if rule.is_late_arrival:
                delay_hours = (rule.received_date - rule.effective_date).total_seconds() / 3600
                self._create_conflict(
                    conflict_type=ConflictType.TIMING_ISSUE,
                    description=f"免赔规则晚到 {delay_hours:.1f} 小时",
                    sources=[DataSource.DEDUCTIBLE_RULE],
                    policy_type=rule.policy_type,
                    values={
                        "effective_date": rule.effective_date.isoformat(),
                        "received_date": rule.received_date.isoformat(),
                        "delay_hours": round(delay_hours, 2),
                        "deductible_amount": rule.deductible_amount,
                    },
                    resolution=f"使用晚到的免赔规则进行后续计算，已记录延迟 {delay_hours:.1f} 小时",
                )
                self._add_timeline_event(
                    "免赔规则晚到", f"{rule.policy_type}: 延迟 {delay_hours:.1f} 小时"
                )

    def _check_sample_sufficiency(self, distributions: List[LossDistribution]) -> None:
        min_sample_size = 100
        for dist in distributions:
            if dist.sample_size < min_sample_size:
                self._create_conflict(
                    conflict_type=ConflictType.SAMPLE_INSUFFICIENT,
                    description=f"赔付分布样本量不足 (n={dist.sample_size})",
                    sources=[DataSource.LOSS_DISTRIBUTION],
                    policy_type=dist.policy_type,
                    values={
                        "sample_size": dist.sample_size,
                        "min_required": min_sample_size,
                        "distribution_type": dist.distribution_type,
                        "params": dist.params,
                    },
                    resolution=f"样本量 {dist.sample_size} 低于建议阈值 {min_sample_size}，结果可能存在偏差",
                )
                self._add_timeline_event(
                    "样本不足", f"{dist.policy_type}: n={dist.sample_size}"
                )

    def _check_deductible_policy_conflict(
        self, policies: List[PolicyRecord], rules: List[DeductibleRule]
    ) -> None:
        rule_map = {r.policy_type: r for r in rules}
        policy_deductibles = defaultdict(list)
        for p in policies:
            if p.deductible is not None:
                policy_deductibles[p.policy_type].append(p.deductible)

        for policy_type, rule in rule_map.items():
            if policy_type in policy_deductibles:
                avg_policy_deductible = sum(policy_deductibles[policy_type]) / len(
                    policy_deductibles[policy_type]
                )
                if abs(avg_policy_deductible - rule.deductible_amount) > 0.01:
                    self._create_conflict(
                        conflict_type=ConflictType.VALUE_MISMATCH,
                        description=f"保单免赔额({avg_policy_deductible:.2f})与规则免赔额({rule.deductible_amount:.2f})不一致",
                        sources=[DataSource.POLICY_MAIN, DataSource.DEDUCTIBLE_RULE],
                        policy_type=policy_type,
                        values={
                            "policy_deductible_avg": round(avg_policy_deductible, 2),
                            "rule_deductible": rule.deductible_amount,
                            "diff_pct": round(
                                abs(avg_policy_deductible - rule.deductible_amount)
                                / rule.deductible_amount
                                * 100,
                                2,
                            ),
                        },
                        resolution="采用规则免赔额进行模拟，已记录与保单样本的差异",
                    )
                    self._add_timeline_event(
                        "免赔额冲突",
                        f"{policy_type}: 保单均值{avg_policy_deductible:.2f} vs 规则{rule.deductible_amount:.2f}",
                    )

    def _check_loss_distribution_extremes(
        self, distributions: List[LossDistribution]
    ) -> None:
        for dist in distributions:
            if dist.distribution_type == "lognormal":
                mean = dist.params.get("mean", 0)
                sigma = dist.params.get("sigma", 0)
                if sigma > 2.0:
                    self._create_conflict(
                        conflict_type=ConflictType.EXTREME_VALUE,
                        description=f"赔付分布存在极端值风险 (sigma={sigma:.2f})",
                        sources=[DataSource.LOSS_DISTRIBUTION],
                        policy_type=dist.policy_type,
                        values={
                            "sigma": round(sigma, 2),
                            "mean": round(mean, 2),
                            "threshold": 2.0,
                            "distribution_type": dist.distribution_type,
                        },
                        resolution="在模拟中将考虑尾部风险，CVaR指标需重点关注",
                    )
                    self._add_timeline_event(
                        "极端值风险", f"{dist.policy_type}: sigma={sigma:.2f}"
                    )

    def get_conflict_summary(self) -> Dict:
        summary = defaultdict(int)
        for conflict in self.conflicts:
            summary[conflict.conflict_type.value] += 1
        return dict(summary)

    def get_data_source_mapping(self) -> Dict[str, List[str]]:
        mapping = defaultdict(list)
        for conflict in self.conflicts:
            for source in conflict.sources:
                mapping[source.value].append(conflict.conflict_id)
        return dict(mapping)
