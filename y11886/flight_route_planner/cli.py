from __future__ import annotations

import argparse
import json
import os
import sys
from typing import List, Optional

from .energy import EnergyModel
from .formatter import JsonFormatter, ReportFormatter, TerminalFormatter
from .models import (
    AircraftSpec,
    BatterySpec,
    NoFlyZone,
    PlanResult,
    Waypoint,
    Wind,
)
from .pathfinder import Pathfinder
from .validator import Validator


def parse_waypoints(data: list, source: str = "") -> List[Waypoint]:
    wps = []
    for item in data:
        if isinstance(item, dict):
            wps.append(
                Waypoint(
                    id=str(item.get("id", item.get("name", ""))),
                    name=item.get("name", item.get("id", "")),
                    lat=float(item["lat"]),
                    lon=float(item["lon"]),
                )
            )
        elif isinstance(item, (list, tuple)) and len(item) >= 3:
            wps.append(Waypoint(id=str(item[0]), name=str(item[0]), lat=float(item[1]), lon=float(item[2])))
    return wps


def parse_nofly_zones(data: list, source: str = "") -> List[NoFlyZone]:
    zones = []
    for item in data:
        zones.append(
            NoFlyZone(
                id=str(item.get("id", "")),
                name=item.get("name", item.get("id", "")),
                polygon=[(float(p[0]), float(p[1])) for p in item.get("polygon", [])],
                source=item.get("source", source),
            )
        )
    return zones


def build_plan_result(
    waypoints: List[Waypoint],
    legs,
    battery: BatterySpec,
    aircraft: AircraftSpec,
    wind: Wind,
    nofly_zones: List[NoFlyZone],
    source: str = "",
) -> PlanResult:
    total_dist = sum(l.distance_m for l in legs)
    total_energy = sum(l.energy_wh for l in legs)
    total_time = sum(l.flight_time_s for l in legs)
    plan = PlanResult(
        waypoints=waypoints,
        legs=legs,
        total_distance_m=total_dist,
        total_energy_wh=total_energy,
        total_time_s=total_time,
        battery_spec=battery,
        aircraft_spec=aircraft,
        wind=wind,
        nofly_zones=nofly_zones,
        issues=[],
        source=source,
    )
    validator = Validator()
    plan.issues = validator.validate(plan)
    return plan


def cmd_plan(args):
    with open(args.waypoints) as f:
        wp_data = json.load(f)
    wp_source = args.waypoints
    waypoints = parse_waypoints(wp_data if isinstance(wp_data, list) else wp_data.get("waypoints", []), wp_source)

    wind = Wind(
        direction_deg=args.wind_dir,
        speed_ms=args.wind_speed,
        source=args.wind_source or "",
    )

    battery = BatterySpec(
        capacity_wh=args.battery,
        safe_margin_pct=args.battery_margin,
        source=args.battery_source or "",
    )

    aircraft = AircraftSpec(
        cruise_speed_ms=args.speed,
        power_w=args.power,
        source=args.aircraft_source or "",
    )

    nofly_zones = []
    if args.nofly:
        with open(args.nofly) as f:
            nfz_data = json.load(f)
        nfz_list = nfz_data if isinstance(nfz_data, list) else nfz_data.get("zones", [])
        nofly_zones = parse_nofly_zones(nfz_list, args.nofly)

    energy_model = EnergyModel(aircraft, battery, wind, nofly_zones)
    pathfinder = Pathfinder(energy_model)

    if args.algorithm == "optimal":
        ordered, legs = pathfinder.plan_optimal(waypoints)
    else:
        ordered, legs = pathfinder.plan_greedy(waypoints)

    plan = build_plan_result(ordered, legs, battery, aircraft, wind, nofly_zones, source=args.algorithm)

    term_fmt = TerminalFormatter()
    print(term_fmt.format(plan))

    if args.report:
        os.makedirs(os.path.dirname(os.path.abspath(args.report)), exist_ok=True)
        report_fmt = ReportFormatter()
        with open(args.report, "w", encoding="utf-8") as f:
            f.write(report_fmt.format(plan))

    if args.json_output:
        os.makedirs(os.path.dirname(os.path.abspath(args.json_output)), exist_ok=True)
        json_fmt = JsonFormatter()
        with open(args.json_output, "w", encoding="utf-8") as f:
            f.write(json_fmt.format(plan))


def cmd_compare(args):
    with open(args.waypoints) as f:
        wp_data = json.load(f)
    wp_source = args.waypoints
    waypoints = parse_waypoints(wp_data if isinstance(wp_data, list) else wp_data.get("waypoints", []), wp_source)

    wind = Wind(
        direction_deg=args.wind_dir,
        speed_ms=args.wind_speed,
        source=args.wind_source or "",
    )

    battery = BatterySpec(
        capacity_wh=args.battery,
        safe_margin_pct=args.battery_margin,
        source=args.battery_source or "",
    )

    aircraft = AircraftSpec(
        cruise_speed_ms=args.speed,
        power_w=args.power,
        source=args.aircraft_source or "",
    )

    nofly_zones = []
    if args.nofly:
        with open(args.nofly) as f:
            nfz_data = json.load(f)
        nfz_list = nfz_data if isinstance(nfz_data, list) else nfz_data.get("zones", [])
        nofly_zones = parse_nofly_zones(nfz_list, args.nofly)

    energy_model = EnergyModel(aircraft, battery, wind, nofly_zones)
    pathfinder = Pathfinder(energy_model)

    results = pathfinder.compare_routes(waypoints)

    ref_plan = build_plan_result(
        waypoints, results[0][2], battery, aircraft, wind, nofly_zones, source="compare"
    )

    term_fmt = TerminalFormatter()
    for name, wps, legs in results:
        total_energy = sum(l.energy_wh for l in legs)
        total_dist = sum(l.distance_m for l in legs)
        total_time = sum(l.flight_time_s for l in legs)
        issue_count = sum(1 for l in legs if l.headwind_missed or l.nofly_breaches)
        issue_count += sum(1 for l in legs if l.cumulative_energy_wh > battery.usable_wh)
        print(f"  [{name}] {'→'.join(wp.id for wp in wps)}  "
              f"距离{total_dist:.0f}m  能耗{total_energy:.2f}Wh  "
              f"时间{total_time:.1f}s  问题{issue_count}个")

    if args.report:
        os.makedirs(os.path.dirname(os.path.abspath(args.report)), exist_ok=True)
        report_fmt = ReportFormatter()
        with open(args.report, "w", encoding="utf-8") as f:
            f.write(report_fmt.format_comparison(results, ref_plan))

    if args.json_output:
        os.makedirs(os.path.dirname(os.path.abspath(args.json_output)), exist_ok=True)
        json_fmt = JsonFormatter()
        with open(args.json_output, "w", encoding="utf-8") as f:
            f.write(json_fmt.format_comparison(results, ref_plan))


def cmd_validate(args):
    with open(args.waypoints) as f:
        wp_data = json.load(f)
    wp_source = args.waypoints
    waypoints = parse_waypoints(wp_data if isinstance(wp_data, list) else wp_data.get("waypoints", []), wp_source)

    wind = Wind(
        direction_deg=args.wind_dir,
        speed_ms=args.wind_speed,
        source=args.wind_source or "",
    )

    battery = BatterySpec(
        capacity_wh=args.battery,
        safe_margin_pct=args.battery_margin,
        source=args.battery_source or "",
    )

    aircraft = AircraftSpec(
        cruise_speed_ms=args.speed,
        power_w=args.power,
        source=args.aircraft_source or "",
    )

    nofly_zones = []
    if args.nofly:
        with open(args.nofly) as f:
            nfz_data = json.load(f)
        nfz_list = nfz_data if isinstance(nfz_data, list) else nfz_data.get("zones", [])
        nofly_zones = parse_nofly_zones(nfz_list, args.nofly)

    energy_model = EnergyModel(aircraft, battery, wind, nofly_zones)

    legs_no_wind = energy_model.compute_route(waypoints, ignore_wind=True)
    plan_no_wind = build_plan_result(
        waypoints, legs_no_wind, battery, aircraft, wind, nofly_zones, source="validate_ignore_wind"
    )

    legs_with_wind = energy_model.compute_route(waypoints, ignore_wind=False)
    plan_with_wind = build_plan_result(
        waypoints, legs_with_wind, battery, aircraft, wind, nofly_zones, source="validate_with_wind"
    )

    term_fmt = TerminalFormatter()

    print(term_fmt.format(plan_with_wind))

    if plan_no_wind.issues:
        headwind_issues = [i for i in plan_no_wind.issues if i.severity.value == "headwind_miss"]
        if headwind_issues:
            print("\n⚠ 逆风漏算检测（对比模式）:")
            print("  以下航段在忽略风向时漏算逆风，实际逆风影响如下:")
            for issue in headwind_issues:
                leg_idx = issue.leg_index
                leg_no = legs_no_wind[leg_idx]
                leg_wt = legs_with_wind[leg_idx]
                print(
                    f"  航段 {issue.from_wp}→{issue.to_wp}: "
                    f"无风地速{leg_no.ground_speed_ms:.2f}m/s → "
                    f"含风地速{leg_wt.ground_speed_ms:.2f}m/s  "
                    f"能耗{leg_no.energy_wh:.2f}Wh → {leg_wt.energy_wh:.2f}Wh"
                )
                print(f"    定位: {issue.step}")


def add_common_args(parser):
    parser.add_argument("--waypoints", "-w", required=True, help="航点文件 (JSON)")
    parser.add_argument("--wind-dir", type=float, required=True, help="风向角度 (0-360)")
    parser.add_argument("--wind-speed", type=float, required=True, help="风速 (m/s)")
    parser.add_argument("--wind-source", default="", help="风况数据来源标注")
    parser.add_argument("--battery", type=float, required=True, help="电池容量 (Wh)")
    parser.add_argument("--battery-margin", type=float, default=20.0, help="安全余量百分比 (默认20%%)")
    parser.add_argument("--battery-source", default="", help="电池数据来源标注")
    parser.add_argument("--speed", type=float, default=15.0, help="巡航速度 (m/s, 默认15)")
    parser.add_argument("--power", type=float, default=200.0, help="巡航功率 (W, 默认200)")
    parser.add_argument("--aircraft-source", default="", help="飞行器参数来源标注")
    parser.add_argument("--nofly", default=None, help="禁飞区文件 (JSON)")


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="flight_route_planner",
        description="航线燃油路径规划 - 根据风向、禁飞区和电池容量规划航点顺序",
    )
    sub = parser.add_subparsers(dest="command", help="子命令")

    plan_parser = sub.add_parser("plan", help="规划航线（日常操作）")
    add_common_args(plan_parser)
    plan_parser.add_argument("--algorithm", choices=["greedy", "optimal"], default="greedy", help="搜索算法")
    plan_parser.add_argument("--report", "-r", default=None, help="输出报告文件 (Markdown)")
    plan_parser.add_argument("--json-output", "-j", default=None, help="输出JSON文件")

    compare_parser = sub.add_parser("compare", help="对比多条路线（月底复盘）")
    add_common_args(compare_parser)
    compare_parser.add_argument("--report", "-r", default=None, help="输出对比报告文件")
    compare_parser.add_argument("--json-output", "-j", default=None, help="输出对比JSON文件")

    validate_parser = sub.add_parser("validate", help="校验现有航线（逆风漏算检测）")
    add_common_args(validate_parser)

    args = parser.parse_args(argv)

    if args.command == "plan":
        cmd_plan(args)
    elif args.command == "compare":
        cmd_compare(args)
    elif args.command == "validate":
        cmd_validate(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
