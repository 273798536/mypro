from __future__ import annotations

import json
import math
from dataclasses import asdict
from typing import List, Optional, Tuple

from .models import (
    IssueSeverity,
    LegResult,
    PlanResult,
    ValidationIssue,
)

RED = "\033[91m"
YELLOW = "\033[93m"
BOLD = "\033[1m"
RESET = "\033[0m"
CYAN = "\033[96m"
GREEN = "\033[92m"
DIM = "\033[2m"


class TerminalFormatter:
    def format(self, plan: PlanResult) -> str:
        lines = []
        lines.append(f"{BOLD}{'=' * 60}{RESET}")
        lines.append(f"{BOLD}  航线燃油路径规划 结果摘要{RESET}")
        lines.append(f"{BOLD}{'=' * 60}{RESET}")
        lines.append("")

        lines.append(f"  航点顺序: {' → '.join(wp.id for wp in plan.waypoints)}")
        lines.append(f"  总航程:   {plan.total_distance_m:.0f} m")
        lines.append(f"  总时间:   {plan.total_time_s:.1f} s ({plan.total_time_s / 60:.1f} min)")
        lines.append(
            f"  总能耗:   {plan.total_energy_wh:.2f} Wh / "
            f"{plan.battery_spec.usable_wh:.2f} Wh 可用 "
            f"({plan.total_energy_wh / plan.battery_spec.usable_wh * 100:.1f}%)"
        )
        lines.append(
            f"  风况:     {plan.wind.direction_deg}° @ {plan.wind.speed_ms} m/s"
            + (f"  [{plan.wind.source}]" if plan.wind.source else "")
        )
        lines.append("")

        lines.append(f"{BOLD}  航段明细:{RESET}")
        lines.append(f"  {'序号':>4}  {'航段':<14} {'距离m':>8} {'航向°':>7} "
                      f"{'逆风m/s':>8} {'地速m/s':>8} {'时间s':>7} "
                      f"{'能耗Wh':>8} {'累计Wh':>8} {'问题':<20}")
        lines.append(f"  {'─' * 100}")

        for i, leg in enumerate(plan.legs):
            flags = []
            if leg.headwind_missed:
                flags.append(f"{RED}{BOLD}⚠逆风漏算{RESET}")
            for nfz in leg.nofly_breaches:
                flags.append(f"{RED}{BOLD}⚠禁飞区[{nfz}]{RESET}")
            cum_pct = leg.cumulative_energy_wh / plan.battery_spec.usable_wh * 100
            if cum_pct > 100:
                flags.append(f"{RED}{BOLD}⚠电量不足{RESET}")
            elif cum_pct > 80:
                flags.append(f"{YELLOW}⚠电量紧张{RESET}")

            flag_str = " ".join(flags) if flags else f"{GREEN}✓{RESET}"
            lines.append(
                f"  {i + 1:>4}  {leg.from_wp + '→' + leg.to_wp:<14} "
                f"{leg.distance_m:>8.0f} {leg.bearing_deg:>7.1f} "
                f"{leg.wind_headwind_ms:>8.2f} {leg.ground_speed_ms:>8.2f} "
                f"{leg.flight_time_s:>7.1f} {leg.energy_wh:>8.2f} "
                f"{leg.cumulative_energy_wh:>8.2f} {flag_str}"
            )

        lines.append("")

        if plan.issues:
            lines.append(f"{RED}{BOLD}  ⚠ 发现 {len(plan.issues)} 个问题:{RESET}")
            for issue in plan.issues:
                label = self._severity_label(issue.severity)
                lines.append(f"    {label} 航段 {issue.from_wp}→{issue.to_wp}: {issue.message}")
                lines.append(f"    {DIM}定位步骤: {issue.step}{RESET}")
                if issue.detail:
                    src_parts = []
                    for k, v in issue.detail.items():
                        if "source" in k and v:
                            src_parts.append(f"{k}={v}")
                    if src_parts:
                        lines.append(f"    {DIM}数据来源: {', '.join(src_parts)}{RESET}")
                lines.append("")
        else:
            lines.append(f"{GREEN}  ✓ 未发现问题，航线安全{RESET}")
            lines.append("")

        return "\n".join(lines)

    def _severity_label(self, severity: IssueSeverity) -> str:
        if severity == IssueSeverity.HEADWIND_MISS:
            return f"{RED}{BOLD}[逆风漏算]{RESET}"
        elif severity == IssueSeverity.NOFLY_BREACH:
            return f"{RED}{BOLD}[禁飞区穿越]{RESET}"
        elif severity == IssueSeverity.BATTERY_LOW:
            return f"{YELLOW}{BOLD}[电量不足]{RESET}"
        return f"[{severity.value}]"


class ReportFormatter:
    def format(self, plan: PlanResult, title: str = "航线燃油路径规划报告") -> str:
        lines = []
        lines.append(f"# {title}")
        lines.append("")
        lines.append("## 1. 概览")
        lines.append("")
        lines.append(f"- **航点顺序**: {' → '.join(wp.id for wp in plan.waypoints)}")
        lines.append(f"- **总航程**: {plan.total_distance_m:.0f} m")
        lines.append(f"- **总时间**: {plan.total_time_s:.1f} s ({plan.total_time_s / 60:.1f} min)")
        lines.append(
            f"- **总能耗**: {plan.total_energy_wh:.2f} Wh / "
            f"{plan.battery_spec.usable_wh:.2f} Wh 可用 "
            f"({plan.total_energy_wh / plan.battery_spec.usable_wh * 100:.1f}%)"
        )
        lines.append(
            f"- **风况**: {plan.wind.direction_deg}° @ {plan.wind.speed_ms} m/s"
            + (f"  *来源: {plan.wind.source}*" if plan.wind.source else "")
        )
        if plan.battery_spec.source:
            lines.append(f"- **电池数据来源**: {plan.battery_spec.source}")
        if plan.aircraft_spec.source:
            lines.append(f"- **飞行器数据来源**: {plan.aircraft_spec.source}")
        lines.append("")

        lines.append("## 2. 航段明细")
        lines.append("")
        lines.append("| 序号 | 航段 | 距离(m) | 航向(°) | 逆风(m/s) | "
                      "地速(m/s) | 时间(s) | 能耗(Wh) | 累计(Wh) | 问题 |")
        lines.append("|------|------|---------|---------|-----------|"
                      "----------|---------|----------|----------|------|")

        for i, leg in enumerate(plan.legs):
            flags = []
            if leg.headwind_missed:
                flags.append("⚠**逆风漏算**")
            for nfz in leg.nofly_breaches:
                flags.append(f"⚠**禁飞区[{nfz}]**")
            cum_pct = leg.cumulative_energy_wh / plan.battery_spec.usable_wh * 100
            if cum_pct > 100:
                flags.append("⚠**电量不足**")
            elif cum_pct > 80:
                flags.append("⚠电量紧张")
            flag_str = " ".join(flags) if flags else "✓"

            lines.append(
                f"| {i + 1} | {leg.from_wp}→{leg.to_wp} | "
                f"{leg.distance_m:.0f} | {leg.bearing_deg:.1f} | "
                f"{leg.wind_headwind_ms:.2f} | {leg.ground_speed_ms:.2f} | "
                f"{leg.flight_time_s:.1f} | {leg.energy_wh:.2f} | "
                f"{leg.cumulative_energy_wh:.2f} | {flag_str} |"
            )
        lines.append("")

        lines.append("## 3. 数据溯源")
        lines.append("")
        lines.append("| 数据项 | 来源 |")
        lines.append("|--------|------|")
        lines.append(f"| 风向风速 | {plan.wind.source or '命令行参数'} |")
        lines.append(f"| 电池容量 | {plan.battery_spec.source or '命令行参数'} |")
        lines.append(f"| 飞行器参数 | {plan.aircraft_spec.source or '命令行参数'} |")
        for nfz in plan.nofly_zones:
            lines.append(f"| 禁飞区[{nfz.id}] | {nfz.source or '未标注'} |")
        for leg in plan.legs:
            lines.append(f"| 航段 {leg.from_wp}→{leg.to_wp} | {leg.source} |")
        lines.append("")

        if plan.issues:
            lines.append("## 4. 问题清单")
            lines.append("")
            for issue in plan.issues:
                sev = issue.severity.value
                lines.append(f"### ⚠ [{sev}] 航段 {issue.from_wp}→{issue.to_wp}")
                lines.append(f"- **问题**: {issue.message}")
                lines.append(f"- **定位步骤**: `{issue.step}`")
                if issue.detail:
                    lines.append("- **详情**:")
                    for k, v in issue.detail.items():
                        lines.append(f"  - {k}: {v}")
                lines.append("")
        else:
            lines.append("## 4. 问题清单")
            lines.append("")
            lines.append("✓ 未发现问题，航线安全。")
            lines.append("")

        if plan.source:
            lines.append(f"> 报告来源: {plan.source}")
            lines.append("")

        return "\n".join(lines)

    def format_comparison(
        self,
        results: List[Tuple[str, List, List[LegResult]]],
        plan: PlanResult,
    ) -> str:
        lines = []
        lines.append("# 路线对比报告")
        lines.append("")
        lines.append("| 方案 | 航点顺序 | 总距离(m) | 总能耗(Wh) | 总时间(s) | 问题数 |")
        lines.append("|------|----------|-----------|------------|-----------|--------|")

        for name, wps, legs in results:
            total_dist = sum(l.distance_m for l in legs)
            total_energy = sum(l.energy_wh for l in legs)
            total_time = sum(l.flight_time_s for l in legs)
            issue_count = sum(
                1 for l in legs if l.headwind_missed or l.nofly_breaches
            )
            issue_count += sum(1 for l in legs if l.cumulative_energy_wh > plan.battery_spec.usable_wh)
            order = " → ".join(wp.id for wp in wps)
            lines.append(
                f"| {name} | {order} | {total_dist:.0f} | "
                f"{total_energy:.2f} | {total_time:.1f} | {issue_count} |"
            )
        lines.append("")
        return "\n".join(lines)


class JsonFormatter:
    def format(self, plan: PlanResult) -> str:
        data = {
            "summary": {
                "waypoint_order": [wp.id for wp in plan.waypoints],
                "waypoint_details": [
                    {"id": wp.id, "name": wp.name, "lat": wp.lat, "lon": wp.lon}
                    for wp in plan.waypoints
                ],
                "total_distance_m": round(plan.total_distance_m, 2),
                "total_time_s": round(plan.total_time_s, 2),
                "total_energy_wh": round(plan.total_energy_wh, 2),
                "battery_usable_wh": round(plan.battery_spec.usable_wh, 2),
                "energy_pct": round(
                    plan.total_energy_wh / plan.battery_spec.usable_wh * 100, 2
                ),
            },
            "wind": {
                "direction_deg": plan.wind.direction_deg,
                "speed_ms": plan.wind.speed_ms,
                "source": plan.wind.source,
            },
            "battery": {
                "capacity_wh": plan.battery_spec.capacity_wh,
                "safe_margin_pct": plan.battery_spec.safe_margin_pct,
                "usable_wh": round(plan.battery_spec.usable_wh, 2),
                "source": plan.battery_spec.source,
            },
            "aircraft": {
                "cruise_speed_ms": plan.aircraft_spec.cruise_speed_ms,
                "power_w": plan.aircraft_spec.power_w,
                "source": plan.aircraft_spec.source,
            },
            "legs": [
                {
                    "index": i,
                    "from": leg.from_wp,
                    "to": leg.to_wp,
                    "distance_m": round(leg.distance_m, 2),
                    "bearing_deg": round(leg.bearing_deg, 2),
                    "wind_headwind_ms": round(leg.wind_headwind_ms, 2),
                    "wind_crosswind_ms": round(leg.wind_crosswind_ms, 2),
                    "ground_speed_ms": round(leg.ground_speed_ms, 2),
                    "flight_time_s": round(leg.flight_time_s, 2),
                    "energy_wh": round(leg.energy_wh, 4),
                    "cumulative_energy_wh": round(leg.cumulative_energy_wh, 4),
                    "headwind_missed": leg.headwind_missed,
                    "nofly_breaches": leg.nofly_breaches,
                    "source": leg.source,
                }
                for i, leg in enumerate(plan.legs)
            ],
            "issues": [
                {
                    "severity": issue.severity.value,
                    "leg_index": issue.leg_index,
                    "from_wp": issue.from_wp,
                    "to_wp": issue.to_wp,
                    "message": issue.message,
                    "step": issue.step,
                    "detail": issue.detail,
                }
                for issue in plan.issues
            ],
            "nofly_zones": [
                {
                    "id": nfz.id,
                    "name": nfz.name,
                    "source": nfz.source,
                }
                for nfz in plan.nofly_zones
            ],
            "source": plan.source,
        }
        return json.dumps(data, ensure_ascii=False, indent=2)

    def format_comparison(
        self,
        results: List[Tuple[str, List, List[LegResult]]],
        plan: PlanResult,
    ) -> str:
        routes = []
        for name, wps, legs in results:
            total_dist = sum(l.distance_m for l in legs)
            total_energy = sum(l.energy_wh for l in legs)
            total_time = sum(l.flight_time_s for l in legs)
            issue_count = sum(
                1 for l in legs if l.headwind_missed or l.nofly_breaches
            )
            issue_count += sum(
                1 for l in legs if l.cumulative_energy_wh > plan.battery_spec.usable_wh
            )
            routes.append(
                {
                    "name": name,
                    "waypoint_order": [wp.id for wp in wps],
                    "total_distance_m": round(total_dist, 2),
                    "total_energy_wh": round(total_energy, 2),
                    "total_time_s": round(total_time, 2),
                    "issue_count": issue_count,
                }
            )
        return json.dumps(
            {"comparison": routes, "battery_usable_wh": round(plan.battery_spec.usable_wh, 2)},
            ensure_ascii=False,
            indent=2,
        )
