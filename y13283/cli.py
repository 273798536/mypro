#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from park_noise import (
    DataStore,
    import_points_from_csv,
    VersionTracker,
    AnomalyDetector,
    SchemeComparator,
    ReportGenerator,
    PointStatus,
)


def cmd_import(args):
    csv_path = args.csv
    source_file = args.source or csv_path
    replace = args.replace

    if not Path(csv_path).exists():
        print(f"[ERROR] 文件不存在: {csv_path}")
        return 1

    store = DataStore()
    tracker = VersionTracker()

    new_points = import_points_from_csv(csv_path, source_file)
    existing_points = store.load_points()

    merged, changelog = tracker.merge_points(
        new_points, existing_points, replace_existing=replace
    )

    detector = AnomalyDetector()
    detector.detect(merged)

    store.save_points(merged)

    print(f"\n[导入完成] 新增/更新 {len(new_points)} 条点位")
    for log in changelog:
        print(f"  {log}")
    print(f"\n数据已保存到 {store.points_file}")
    return 0


def cmd_compare(args):
    store = DataStore()
    tracker = VersionTracker()
    detector = AnomalyDetector()
    comparator = SchemeComparator()
    reporter = ReportGenerator()

    points = store.load_points()
    schemes = store.load_schemes()
    feedbacks = store.load_feedbacks()

    if not points:
        print("[ERROR] 没有点位数据，请先执行 import")
        return 1
    if not schemes:
        print("[WARN] 没有方案数据，仅使用点位中的方案ID分组")

    detector.detect(points)
    results = comparator.compare(schemes, points, feedbacks)
    status_summary = comparator.get_status_summary(points)

    changelog = None
    if args.show_changelog:
        changelog = []
        superseded = [p for p in points if p.status == PointStatus.SUPERSEDED]
        for old_p in superseded:
            newer = [
                next(
                    (p for p in points if p.point_id == old_p.point_id and p.version == old_p.version + 1),
                    None,
                )
            ]
            if newer:
                changelog.append(
                    f"[取代] {old_p.name} v{old_p.version}→v{newer[0].version} "
                    f"噪声:{old_p.noise_level}dB→{newer[0].noise_level}dB "
                    f"旧版来源: {old_p.source.source_file}:{old_p.source.source_row} "
                    f"新版来源: {newer[0].source.source_file}:{newer[0].source.source_row}"
                )
            else:
                changelog.append(
                    f"[取代] {old_p.name} v{old_p.version} 被取代 "
                    f"来源: {old_p.source.source_file}:{old_p.source.source_row}"
                )
        added = [p for p in points if p.status != PointStatus.SUPERSEDED]
        for p in added:
            versions = [x for x in points if x.point_id == p.point_id]
            if len(versions) == 1:
                changelog.append(
                    f"[新增] {p.name} (v{p.version}) 来源: {p.source.source_file}:{p.source.source_row}"
                )

    report = reporter.generate_comparison_chart(results, status_summary, changelog)
    print(report)

    trace_csv = reporter.generate_source_trace_csv(points, feedbacks)
    print(f"\n[溯源CSV] 已生成: {trace_csv}")

    anomaly_trace = reporter.generate_anomaly_trace(points, detector)
    print(f"[异常溯源] 已生成: {reporter.output_dir}/anomaly_trace.txt")

    version_hist = reporter.generate_version_history(points, tracker)
    print(f"[版本历史] 已生成: {reporter.output_dir}/version_history.txt")

    return 0


def cmd_trace(args):
    store = DataStore()
    detector = AnomalyDetector()
    tracker = VersionTracker()
    points = store.load_points()

    target = [p for p in points if p.point_id == args.point_id or p.name == args.point_id]
    if not target:
        print(f"[ERROR] 找不到点位: {args.point_id}")
        return 1

    detector.detect(points)
    history = tracker.get_point_history(target[0].point_id, points)

    print(f"\n[点位溯源] {target[0].name} ({target[0].point_id})")
    print("=" * 60)
    for p in history:
        print(f"\n  版本 v{p.version} [{p.status.value}]")
        print(f"    来源: {p.source.source_file}:{p.source.source_row}")
        print(f"    噪声: {p.noise_level}dB / 限值: {p.standard_limit}dB")
        print(f"    影响范围: {p.impact_range}m")
        if p.anomalies:
            print(f"    异常: {', '.join(p.anomalies)}")
        if p.source.source_note:
            print(f"    备注: {p.source.source_note}")
        if p.evidence_notes:
            print(f"    证据: {p.evidence_notes}")
        if p.superseded_by:
            print(f"    被取代: {p.superseded_by}")
    return 0


def cmd_status(args):
    store = DataStore()
    comparator = SchemeComparator()
    points = store.load_points()

    if not points:
        print("[INFO] 尚无数据")
        return 0

    status_summary = comparator.get_status_summary(points)
    total = sum(status_summary.values())

    print("\n[状态概览]")
    print("=" * 40)
    for status, count in status_summary.items():
        pct = count / total * 100
        bar = "█" * int(pct / 100 * 30)
        print(f"  {status}: {count:3d} ({pct:5.1f}%) {bar}")
    print(f"\n  合计: {total}")

    needs_evidence = [p for p in points if p.status.value == "待补证据" and p.status.value != "已被取代"]
    if needs_evidence:
        print(f"\n[待补证据清单] ({len(needs_evidence)}项)")
        print("-" * 40)
        for p in needs_evidence:
            print(f"  □ {p.name} ({p.scheme_id}) 来源: {p.source.source_file}:{p.source.source_row}")

    superseded = [p for p in points if p.status.value == "已被取代"]
    if superseded:
        print(f"\n[已被取代版本] ({len(superseded)}项，已保留)")
        print("-" * 40)
        for p in superseded:
            print(f"  {p.name} v{p.version} → 被 {p.superseded_by} 取代 | 来源: {p.source.source_file}:{p.source.source_row}")

    return 0


def cmd_bad(args):
    store = DataStore()
    detector = AnomalyDetector()
    points = store.load_points()

    if not points:
        print("[INFO] 尚无数据")
        return 0

    detector.detect(points)
    summary = detector.get_anomaly_summary(points)

    print("\n[坏材料排查指南]")
    print("=" * 60)
    print("\n  碰到坏材料，按这个顺序查：")
    print("  1. 看输出目录下 anomaly_trace.txt → 按异常类型分组，带溯源")
    print("  2. 看 source_trace.csv → 筛选 '异常标记' 列")
    print("  3. 用 trace 命令查单个点位 → 看全版本历史")
    print("  4. 看 version_history.txt → 哪次导入覆盖了早先判断")
    print("")

    if not summary:
        print("(当前无异常 ✓)")
        return 0

    print("  当前异常汇总：")
    print("-" * 40)
    for anomaly_type, affected in summary:
        print(f"\n  {anomaly_type} ({len(affected)} 点):")
        for p in affected:
            print(f"    - {p.name} → {p.source.source_file}:{p.source.source_row}")
            if p.status.value == "待补证据":
                print(f"      ⚠ 状态: {p.status.value}")
    return 0


def main():
    parser = argparse.ArgumentParser(prog="park_noise", description="公园噪声方案比选")
    subparsers = parser.add_subparsers(dest="command", required=True)

    p_import = subparsers.add_parser("import", help="导入点位CSV")
    p_import.add_argument("csv", help="CSV文件路径")
    p_import.add_argument("--source", help="来源文件名（默认用csv路径）")
    p_import.add_argument("--replace", action="store_true", help="取代旧版本（默认仅新增并存）")

    p_compare = subparsers.add_parser("compare", help="生成方案比选报告")
    p_compare.add_argument("--show-changelog", action="store_true", help="显示变更日志")

    p_trace = subparsers.add_parser("trace", help="点位溯源")
    p_trace.add_argument("point_id", help="点位ID或名称")

    subparsers.add_parser("status", help="查看状态概览")
    subparsers.add_parser("bad", help="坏材料排查指南")

    args = parser.parse_args()

    if args.command == "import":
        sys.exit(cmd_import(args))
    elif args.command == "compare":
        sys.exit(cmd_compare(args))
    elif args.command == "trace":
        sys.exit(cmd_trace(args))
    elif args.command == "status":
        sys.exit(cmd_status(args))
    elif args.command == "bad":
        sys.exit(cmd_bad(args))


if __name__ == "__main__":
    main()
