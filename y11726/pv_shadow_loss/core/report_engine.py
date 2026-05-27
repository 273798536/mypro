from __future__ import annotations

import uuid
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Tuple
from ..models.schemas import (
    ShadowLossRequest,
    ShadowAttribution,
    StringCalculation,
    ScenarioComparison,
    MaintenanceSuggestion,
    ExportReport,
    ShadowType,
    EdgeWarning,
)


class ReportEngine:
    """
    报告生成引擎：情景对比、维修建议、报告导出
    """

    ELECTRICITY_PRICE = 0.45
    DEFAULT_ANNUAL_DAYS = 365

    def __init__(self, request: ShadowLossRequest,
                 attributions: List[ShadowAttribution],
                 string_calculations: List[StringCalculation],
                 edge_warnings: List[EdgeWarning]):
        self.request = request
        self.attributions = attributions
        self.string_calculations = string_calculations
        self.edge_warnings = edge_warnings

    def generate_all(self) -> Tuple[List[ScenarioComparison],
                                     List[MaintenanceSuggestion],
                                     ExportReport]:
        scenarios = self._generate_scenarios()
        suggestions = self._generate_suggestions()
        report = self._generate_export_report()
        return scenarios, suggestions, report

    def _generate_scenarios(self) -> List[ScenarioComparison]:
        scenarios: List[ScenarioComparison] = []

        current_loss = self._calc_weighted_loss()
        current_kwh = self._total_energy_loss()
        current_revenue = current_kwh * self.ELECTRICITY_PRICE

        scenarios.append(ScenarioComparison(
            scenario_name="当前状态",
            description="不采取任何措施的现状",
            shadow_loss_pct=round(current_loss, 4),
            estimated_annual_loss_kwh=round(current_kwh, 2),
            estimated_annual_revenue_loss=round(current_revenue, 2),
            parameters={"action": "none"},
        ))

        reduced_loss = current_loss * 0.6
        reduced_kwh = current_kwh * 0.6
        scenarios.append(ScenarioComparison(
            scenario_name="修剪树木",
            description="修剪后树影减少约40%",
            shadow_loss_pct=round(reduced_loss, 4),
            estimated_annual_loss_kwh=round(reduced_kwh, 2),
            estimated_annual_revenue_loss=round(reduced_kwh * self.ELECTRICITY_PRICE, 2),
            parameters={"action": "prune_trees", "reduction_pct": 0.4},
        ))

        reduced_loss2 = current_loss * 0.3
        reduced_kwh2 = current_kwh * 0.3
        scenarios.append(ScenarioComparison(
            scenario_name="全面修剪+优化",
            description="修剪树影+优化建筑遮挡，减少约70%",
            shadow_loss_pct=round(reduced_loss2, 4),
            estimated_annual_loss_kwh=round(reduced_kwh2, 2),
            estimated_annual_revenue_loss=round(reduced_kwh2 * self.ELECTRICITY_PRICE, 2),
            parameters={"action": "prune_all", "reduction_pct": 0.7},
        ))

        zero_loss = 0.0
        scenarios.append(ScenarioComparison(
            scenario_name="完全消除阴影",
            description="理论上消除所有阴影后的理想状态",
            shadow_loss_pct=0.0,
            estimated_annual_loss_kwh=0.0,
            estimated_annual_revenue_loss=0.0,
            parameters={"action": "ideal", "reduction_pct": 1.0},
        ))

        return scenarios

    def _generate_suggestions(self) -> List[MaintenanceSuggestion]:
        suggestions: List[MaintenanceSuggestion] = []

        tree_attrs = [a for a in self.attributions
                      if a.shadow_type == ShadowType.TREE and a.shadow_loss_pct > 0.05]
        tree_strings = set(a.string_id for a in tree_attrs)

        for string_id in tree_strings:
            string_attrs = [a for a in tree_attrs if a.string_id == string_id]
            max_loss = max(a.shadow_loss_pct for a in string_attrs)
            affected_ids = [a.component_id for a in string_attrs]
            priority = self._calc_priority(max_loss)

            suggestions.append(MaintenanceSuggestion(
                suggestion_id=str(uuid.uuid4()),
                priority=priority,
                action_type="prune",
                target_id=string_id,
                description=f"修剪影响组串 {string_id} 的树木，涉及组件 {', '.join(affected_ids)}",
                estimated_effect_pct=round(max_loss * 0.6, 4),
                estimated_cost=500.0 + len(affected_ids) * 100,
                estimated_roi_period=self._calc_roi(
                    sum(a.estimated_energy_loss_kwh for a in string_attrs) * 0.6,
                    500.0 + len(affected_ids) * 100
                ),
                time_window="建议在非雨季、晴天上午执行",
            ))

        building_attrs = [a for a in self.attributions
                          if a.shadow_type == ShadowType.BUILDING and a.shadow_loss_pct > 0.05]
        building_strings = set(a.string_id for a in building_attrs)

        for string_id in building_strings:
            string_attrs = [a for a in building_attrs if a.string_id == string_id]
            max_loss = max(a.shadow_loss_pct for a in string_attrs)
            affected_ids = [a.component_id for a in string_attrs]
            priority = self._calc_priority(max_loss)

            suggestions.append(MaintenanceSuggestion(
                suggestion_id=str(uuid.uuid4()),
                priority=priority,
                action_type="inspect",
                target_id=string_id,
                description=f"检查组串 {string_id} 受建筑遮挡情况，涉及组件 {', '.join(affected_ids)}",
                estimated_effect_pct=round(max_loss * 0.3, 4),
                estimated_cost=200.0,
                estimated_roi_period=self._calc_roi(
                    sum(a.estimated_energy_loss_kwh for a in string_attrs) * 0.3,
                    200.0
                ),
                time_window="建议在冬至前后评估，阴影最明显",
            ))

        hotspots = [s for s in self.string_calculations if s.hotspot_risk > 0.5]
        for sc in hotspots:
            suggestions.append(MaintenanceSuggestion(
                suggestion_id=str(uuid.uuid4()),
                priority="high",
                action_type="inspect",
                target_id=sc.string_id,
                description=f"组串 {sc.string_id} 存在热斑风险({sc.hotspot_risk:.0%})，建议现场检测",
                estimated_effect_pct=0.1,
                estimated_cost=300.0,
                estimated_roi_period=None,
                time_window="建议尽快安排",
            ))

        return sorted(suggestions, key=lambda s: {
            "critical": 0, "high": 1, "medium": 2, "low": 3
        }.get(s.priority, 4))

    def _generate_export_report(self) -> ExportReport:
        total_comps = len(self.request.components)
        affected_comps = sum(1 for a in self.attributions if a.shadow_loss_pct > 0.05)
        overall_loss = self._calc_weighted_loss()
        total_kwh = self._total_energy_loss()

        shadow_sources: List[str] = []
        for st in [ShadowType.TREE, ShadowType.BUILDING, ShadowType.CLOUD]:
            count = sum(1 for a in self.attributions if a.shadow_type == st and a.shadow_loss_pct > 0.05)
            if count > 0:
                shadow_sources.append(f"{st.value}({count})")

        actions = [s.description for s in self._generate_suggestions()][:5]

        quality_score = 1.0 - len(self.edge_warnings) * 0.05
        quality_score = max(0.0, min(1.0, quality_score))

        return ExportReport(
            report_id=str(uuid.uuid4()),
            station_id=self.request.station_id,
            period_start=self.request.calculation_date - timedelta(days=7),
            period_end=self.request.calculation_date,
            total_components=total_comps,
            affected_components=affected_comps,
            overall_shadow_loss_pct=round(overall_loss, 4),
            total_estimated_loss_kwh=round(total_kwh, 2),
            top_shadow_sources=shadow_sources,
            maintenance_actions=actions,
            data_quality_score=round(quality_score, 2),
        )

    def _calc_weighted_loss(self) -> float:
        if not self.attributions:
            return 0.0
        total = sum(a.shadow_loss_pct * a.confidence for a in self.attributions)
        total_conf = sum(a.confidence for a in self.attributions)
        if total_conf == 0:
            return 0.0
        return total / total_conf

    def _total_energy_loss(self) -> float:
        return sum(a.estimated_energy_loss_kwh for a in self.attributions)

    def _calc_priority(self, loss_pct: float) -> str:
        if loss_pct >= 0.3:
            return "critical"
        elif loss_pct >= 0.15:
            return "high"
        elif loss_pct >= 0.08:
            return "medium"
        return "low"

    def _calc_roi(self, annual_savings_kwh: float, cost: float) -> Optional[float]:
        annual_savings = annual_savings_kwh * self.ELECTRICITY_PRICE
        if annual_savings <= 0:
            return None
        return round(cost / annual_savings * 365, 1)
