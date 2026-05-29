from __future__ import annotations

from typing import List

from .models import (
    BatterySpec,
    IssueSeverity,
    LegResult,
    NoFlyZone,
    PlanResult,
    ValidationIssue,
    Wind,
)


class Validator:
    def validate(self, plan: PlanResult) -> List[ValidationIssue]:
        issues: List[ValidationIssue] = []
        issues.extend(self._check_headwind_miss(plan))
        issues.extend(self._check_nofly_breach(plan))
        issues.extend(self._check_battery(plan))
        return issues

    def _check_headwind_miss(self, plan: PlanResult) -> List[ValidationIssue]:
        issues = []
        for i, leg in enumerate(plan.legs):
            if leg.headwind_missed:
                step = (
                    f"energy_model.compute_leg(leg_index={i}, ignore_wind=True) → "
                    f"headwind component {plan.wind.headwind_component(leg.bearing_deg):.2f} m/s "
                    f"not applied to ground speed"
                )
                issues.append(
                    ValidationIssue(
                        severity=IssueSeverity.HEADWIND_MISS,
                        leg_index=i,
                        from_wp=leg.from_wp,
                        to_wp=leg.to_wp,
                        message=(
                            f"逆风漏算: 航段 {leg.from_wp}→{leg.to_wp} "
                            f"航向{leg.bearing_deg:.1f}° 存在逆风 "
                            f"{plan.wind.headwind_component(leg.bearing_deg):.2f}m/s "
                            f"但未计入地速计算"
                        ),
                        step=step,
                        detail={
                            "bearing_deg": leg.bearing_deg,
                            "wind_direction_deg": plan.wind.direction_deg,
                            "wind_speed_ms": plan.wind.speed_ms,
                            "headwind_component_ms": plan.wind.headwind_component(leg.bearing_deg),
                            "wind_source": plan.wind.source,
                            "leg_source": leg.source,
                        },
                    )
                )
        return issues

    def _check_nofly_breach(self, plan: PlanResult) -> List[ValidationIssue]:
        issues = []
        for i, leg in enumerate(plan.legs):
            for nfz_id in leg.nofly_breaches:
                nfz = next((z for z in plan.nofly_zones if z.id == nfz_id), None)
                nfz_name = nfz.name if nfz else nfz_id
                nfz_source = nfz.source if nfz else ""
                step = (
                    f"nofly_zone.segment_intersects(leg_index={i}) → "
                    f"穿越禁飞区 [{nfz_id}] {nfz_name}"
                )
                issues.append(
                    ValidationIssue(
                        severity=IssueSeverity.NOFLY_BREACH,
                        leg_index=i,
                        from_wp=leg.from_wp,
                        to_wp=leg.to_wp,
                        message=(
                            f"禁飞区穿越: 航段 {leg.from_wp}→{leg.to_wp} "
                            f"穿越禁飞区 [{nfz_id}] {nfz_name}"
                        ),
                        step=step,
                        detail={
                            "nofly_zone_id": nfz_id,
                            "nofly_zone_name": nfz_name,
                            "nofly_zone_source": nfz_source,
                            "leg_source": leg.source,
                        },
                    )
                )
        return issues

    def _check_battery(self, plan: PlanResult) -> List[ValidationIssue]:
        issues = []
        usable = plan.battery_spec.usable_wh
        for i, leg in enumerate(plan.legs):
            if leg.cumulative_energy_wh > usable:
                step = (
                    f"cumulative_energy_wh={leg.cumulative_energy_wh:.2f} > "
                    f"usable_wh={usable:.2f} "
                    f"(capacity={plan.battery_spec.capacity_wh}Wh × "
                    f"(1 - margin{plan.battery_spec.safe_margin_pct}%)= {usable:.2f}Wh) "
                    f"at leg_index={i}"
                )
                issues.append(
                    ValidationIssue(
                        severity=IssueSeverity.BATTERY_LOW,
                        leg_index=i,
                        from_wp=leg.from_wp,
                        to_wp=leg.to_wp,
                        message=(
                            f"电量不足: 航段 {leg.from_wp}→{leg.to_wp} "
                            f"累计耗电 {leg.cumulative_energy_wh:.2f}Wh "
                            f"超过可用电量 {usable:.2f}Wh "
                            f"(总容量{plan.battery_spec.capacity_wh}Wh, "
                            f"安全余量{plan.battery_spec.safe_margin_pct}%)"
                        ),
                        step=step,
                        detail={
                            "cumulative_energy_wh": round(leg.cumulative_energy_wh, 2),
                            "usable_wh": round(usable, 2),
                            "capacity_wh": plan.battery_spec.capacity_wh,
                            "safe_margin_pct": plan.battery_spec.safe_margin_pct,
                            "battery_source": plan.battery_spec.source,
                            "leg_source": leg.source,
                        },
                    )
                )
        return issues
