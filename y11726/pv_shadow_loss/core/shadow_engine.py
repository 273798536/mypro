from __future__ import annotations

import math
from datetime import datetime, timedelta, date, time
from typing import List, Dict, Optional, Tuple
from ..models.schemas import (
    ComponentPosition,
    ShadowPeriod,
    StringTopology,
    HistoricalGeneration,
    WeatherData,
    ShadowLossRequest,
    ShadowAttribution,
    StringCalculation,
    EdgeWarning,
    ShadowType,
)


class ShadowEngine:
    """
    光伏阴影归因与组串计算引擎

    核心计算逻辑：
    1. 基于阴影时段和强度计算单组件阴影损失
    2. 基于组串拓扑聚合到组串级损失
    3. 考虑旁路二极管、串并联效应
    4. 保留数据源追溯
    """

    STC_IRRADIANCE = 1000.0
    TEMP_COEFFICIENT_POWER = -0.0045
    SHADOW_THRESHOLD = 0.05

    def __init__(self, request: ShadowLossRequest, edge_warnings: List[EdgeWarning]):
        self.request = request
        self.edge_warnings = edge_warnings
        self.attributions: List[ShadowAttribution] = []
        self.string_calculations: List[StringCalculation] = []

    def compute(self) -> Tuple[List[ShadowAttribution], List[StringCalculation]]:
        self._compute_component_attributions()
        self._compute_string_level()
        return self.attributions, self.string_calculations

    def _compute_component_attributions(self):
        blocked_shadow_ids = {
            w.affected_fields[0].split("[")[1].split("]")[0]
            for w in self.edge_warnings
            if w.warning_type == "CROSS_DAY_SHADOW" and w.is_blocking
        }

        for sp in self.request.shadow_periods:
            if sp.shadow_id in blocked_shadow_ids:
                continue

            if sp.intensity < self.SHADOW_THRESHOLD:
                continue

            comp = self._find_component(sp.component_id)
            if not comp:
                continue

            hours = (sp.end_time - sp.start_time).total_seconds() / 3600
            shadow_loss_pct = self._calculate_shadow_loss(
                sp.intensity, hours, sp.shadow_type
            )

            irradiance = self._get_irradiance_for_period(sp.start_time, sp.end_time)
            energy_loss = self._estimate_energy_loss(
                comp, shadow_loss_pct, hours, irradiance
            )

            weather_factor = self._get_weather_factor(sp.start_time.date())
            shadow_loss_pct_adjusted = min(1.0, shadow_loss_pct * weather_factor)

            attribution = ShadowAttribution(
                component_id=sp.component_id,
                string_id=comp.string_id,
                shadow_type=sp.shadow_type,
                shadow_loss_pct=round(shadow_loss_pct_adjusted, 4),
                affected_hours=round(hours, 2),
                estimated_energy_loss_kwh=round(energy_loss, 3),
                confidence=self._compute_confidence(sp, comp),
                source_ids=[sp.shadow_id, comp.data_source.name],
            )
            self.attributions.append(attribution)

        self._fill_zero_loss_components()

    def _fill_zero_loss_components(self):
        comps_with_shadow = {a.component_id for a in self.attributions}
        for comp in self.request.components:
            if comp.component_id not in comps_with_shadow:
                attribution = ShadowAttribution(
                    component_id=comp.component_id,
                    string_id=comp.string_id,
                    shadow_type=ShadowType.OTHER,
                    shadow_loss_pct=0.0,
                    affected_hours=0.0,
                    estimated_energy_loss_kwh=0.0,
                    confidence=1.0,
                    source_ids=[comp.data_source.name],
                )
                self.attributions.append(attribution)

    def _calculate_shadow_loss(self, intensity: float, hours: float,
                               shadow_type: ShadowType) -> float:
        base_loss = intensity * (hours / 24.0)
        if shadow_type == ShadowType.TREE:
            base_loss *= 0.85
        elif shadow_type == ShadowType.BUILDING:
            base_loss *= 0.95
        elif shadow_type == ShadowType.CLOUD:
            base_loss *= 0.5
        return min(1.0, base_loss * 2.5)

    def _estimate_energy_loss(self, comp: ComponentPosition, loss_pct: float,
                              hours: float, irradiance: float) -> float:
        if irradiance <= 0:
            irradiance = 800.0
        effective_power = comp.rated_power * (irradiance / self.STC_IRRADIANCE)
        daily_generation = effective_power * hours / 1000.0
        return daily_generation * loss_pct

    def _get_irradiance_for_period(self, start: datetime, end: datetime) -> float:
        avg_irr = 0.0
        count = 0
        for wd in self.request.weather_data:
            if wd.date == start.date():
                avg_irr += wd.solar_irradiance
                count += 1
        if count > 0:
            return avg_irr / count
        hours = start.hour
        if 6 <= hours <= 17:
            return 600.0 + 200.0 * math.sin(math.pi * (hours - 6) / 12)
        return 200.0

    def _get_weather_factor(self, target_date: date) -> float:
        for wd in self.request.weather_data:
            if wd.date == target_date:
                if wd.cloud_cover > 0.6:
                    return 1.0 - wd.cloud_cover * 0.5
                if wd.temperature > 40:
                    temp_factor = 1.0 + self.TEMP_COEFFICIENT_POWER * (wd.temperature - 25)
                    return max(0.5, temp_factor)
                if wd.precipitation > 5:
                    return 0.85
        return 1.0

    def _compute_confidence(self, sp: ShadowPeriod, comp: ComponentPosition) -> float:
        base = min(sp.data_source.confidence, comp.data_source.confidence)
        if sp.shadow_type == ShadowType.TREE:
            base *= 0.85
        elif sp.shadow_type == ShadowType.BUILDING:
            base *= 0.9
        duration = (sp.end_time - sp.start_time).total_seconds() / 3600
        if duration > 8:
            base *= 0.8
        return max(0.0, min(1.0, base))

    def _compute_string_level(self):
        string_groups: Dict[str, List[ShadowAttribution]] = {}
        for attr in self.attributions:
            string_groups.setdefault(attr.string_id, []).append(attr)

        for topo in self.request.string_topology:
            attrs = string_groups.get(topo.string_id, [])
            total_comps = len(topo.component_ids)
            affected_comps = sum(1 for a in attrs if a.shadow_loss_pct > self.SHADOW_THRESHOLD)

            string_loss_pct = self._aggregate_string_loss(attrs, topo)
            total_energy_loss = sum(a.estimated_energy_loss_kwh for a in attrs)
            hotspot_risk = self._estimate_hotspot_risk(attrs, topo)

            warnings: List[str] = []
            if affected_comps > 0 and affected_comps < total_comps:
                mismatch_factor = topo.bypass_count / max(total_comps, 1)
                if mismatch_factor < 0.3:
                    warnings.append(
                        f"组串内仅 {affected_comps}/{total_comps} 组件受阴影影响，"
                        f"旁路二极管比例({mismatch_factor:.0%})偏低，存在热斑风险"
                    )

            calc = StringCalculation(
                string_id=topo.string_id,
                inverter_id=topo.inverter_id,
                total_components=total_comps,
                affected_components=affected_comps,
                string_shadow_loss_pct=round(string_loss_pct, 4),
                estimated_string_loss_kwh=round(total_energy_loss, 3),
                hotspot_risk=round(hotspot_risk, 4),
                calculation_method=self._build_method_string(topo, attrs),
                warnings=warnings,
            )
            self.string_calculations.append(calc)

    def _aggregate_string_loss(self, attrs: List[ShadowAttribution],
                               topo: StringTopology) -> float:
        if not attrs:
            return 0.0

        losses = [a.shadow_loss_pct for a in attrs]
        avg_loss = sum(losses) / len(losses)
        affected_ratio = sum(1 for l in losses if l > self.SHADOW_THRESHOLD) / len(losses)

        if topo.bypass_count > 0:
            bypass_ratio = topo.bypass_count / len(topo.component_ids)
            effective_loss = avg_loss * (1 - bypass_ratio * 0.3)
        else:
            effective_loss = avg_loss * (1 + affected_ratio * 0.1)

        return max(0.0, min(1.0, effective_loss))

    def _estimate_hotspot_risk(self, attrs: List[ShadowAttribution],
                               topo: StringTopology) -> float:
        if not attrs:
            return 0.0

        max_loss = max(a.shadow_loss_pct for a in attrs)
        affected = sum(1 for a in attrs if a.shadow_loss_pct > self.SHADOW_THRESHOLD)
        total = len(topo.component_ids)

        mismatch_penalty = 0.0
        if affected > 0 and affected < total:
            mismatch_penalty = (1 - affected / total) * 0.4

        bypass_factor = 1.0 - (topo.bypass_count / total) * 0.5

        risk = max_loss * 0.6 + mismatch_penalty * 0.4
        risk *= bypass_factor
        return max(0.0, min(1.0, risk))

    def _build_method_string(self, topo: StringTopology,
                             attrs: List[ShadowAttribution]) -> str:
        parts = ["组件级阴影时段聚合"]
        if topo.bypass_count > 0:
            parts.append(f"旁路二极管修正(x{topo.bypass_count})")
        if any(a.shadow_loss_pct > 0.3 for a in attrs):
            parts.append("严重阴影单独处理")
        parts.append("组串级均值聚合")
        return " | ".join(parts)

    def _find_component(self, component_id: str) -> Optional[ComponentPosition]:
        for c in self.request.components:
            if c.component_id == component_id:
                return c
        return None

    def get_overall_loss_pct(self) -> float:
        if not self.attributions:
            return 0.0
        return sum(a.shadow_loss_pct for a in self.attributions) / len(self.attributions)
