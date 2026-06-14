#!/usr/bin/env python3
import argparse
import json
import sys
import time
from typing import List, Dict, Any

from convex_hull import compute_convex_hull
from sort_instability import detect_sort_instability
from draft_tracker import DraftTracker
from report import generate_report, save_report


def parse_points(s: str):
    try:
        data = json.loads(s)
    except json.JSONDecodeError:
        print(f"错误: 无法解析点集JSON: {s}", file=sys.stderr)
        sys.exit(1)
    if not isinstance(data, list):
        print("错误: 点集必须是数组的数组 [[x1,y1],[x2,y2],...]", file=sys.stderr)
        sys.exit(1)
    points = []
    for item in data:
        if not isinstance(item, (list, tuple)) or len(item) != 2:
            print(f"错误: 每个点必须是 [x, y] 格式: {item}", file=sys.stderr)
            sys.exit(1)
        points.append((float(item[0]), float(item[1])))
    return points


def cmd_start(args):
    points = parse_points(args.points)
    tracker = DraftTracker()
    session_id = args.session_id or f"s_{int(time.time())}"

    hull = compute_convex_hull(
        points,
        input_unit=args.input_unit,
        output_unit=args.output_unit,
        collinear_threshold=args.collinear_threshold,
    )

    rec = tracker.register(session_id, hull.parameters, hull)

    unstable, stable = detect_sort_instability(
        points,
        hull.sort_order,
        hull.collinear_groups,
        hull.intermediate_steps,
        angle_threshold=args.angle_threshold,
        cross_threshold=args.collinear_threshold,
    )

    if args.draft_note:
        judgments = args.judgments_changed.split(",") if args.judgments_changed else []
        tracker.add_draft_note(session_id, args.draft_note, judgments)

    rec.unstable_records = [r.__dict__ for r in unstable]
    rec.stable_records = [r.__dict__ for r in stable]
    tracker.save(session_id)

    report_content = generate_report(
        tracker,
        hull_result=hull,
        unstable_records=unstable,
        stable_records=stable,
        session_id=session_id,
    )

    report_dir = args.report_dir or "."
    report_path = f"{report_dir}/report_{session_id}.md"
    save_report(report_content, report_path)

    output = {
        "session_id": session_id,
        "status": rec.status,
        "area": hull.area,
        "area_unit": hull.area_unit,
    }
    if hull.area_converted is not None:
        output["area_converted"] = hull.area_converted
        output["converted_unit"] = hull.converted_unit
    output["unstable_count"] = len(unstable)
    output["report_path"] = report_path
    if hull.failures:
        output["failures"] = hull.failures

    print(json.dumps(output, ensure_ascii=False, indent=2))


def cmd_rerun(args):
    points = parse_points(args.points)
    tracker = DraftTracker()
    session_id = args.session_id or f"s_{int(time.time())}"

    hull = compute_convex_hull(
        points,
        input_unit=args.input_unit,
        output_unit=args.output_unit,
        collinear_threshold=args.collinear_threshold,
    )

    rec = tracker.register(session_id, hull.parameters, hull)

    unstable, stable = detect_sort_instability(
        points,
        hull.sort_order,
        hull.collinear_groups,
        hull.intermediate_steps,
        angle_threshold=args.angle_threshold,
        cross_threshold=args.collinear_threshold,
    )

    comparison = None
    if args.compare_with:
        try:
            comparison = tracker.compare_parameters(args.compare_with, session_id)
        except ValueError as e:
            print(f"警告: 参数对照失败 - {e}", file=sys.stderr)

    if args.draft_note:
        judgments = args.judgments_changed.split(",") if args.judgments_changed else []
        tracker.add_draft_note(session_id, args.draft_note, judgments)

    rec.unstable_records = [r.__dict__ for r in unstable]
    rec.stable_records = [r.__dict__ for r in stable]
    tracker.save(session_id)

    report_content = generate_report(
        tracker,
        hull_result=hull,
        unstable_records=unstable,
        stable_records=stable,
        comparison=comparison,
        session_id=session_id,
    )

    report_dir = args.report_dir or "."
    report_path = f"{report_dir}/report_{session_id}.md"
    save_report(report_content, report_path)

    output = {
        "session_id": session_id,
        "status": rec.status,
        "area": hull.area,
        "area_unit": hull.area_unit,
    }
    if hull.area_converted is not None:
        output["area_converted"] = hull.area_converted
        output["converted_unit"] = hull.converted_unit
    output["unstable_count"] = len(unstable)
    output["report_path"] = report_path
    if comparison:
        output["comparison"] = comparison

    print(json.dumps(output, ensure_ascii=False, indent=2))


def cmd_view_report(args):
    tracker = DraftTracker()
    if args.session_id:
        report_dir = args.report_dir or "."
        report_path = f"{report_dir}/report_{args.session_id}.md"
        try:
            with open(report_path, "r", encoding="utf-8") as f:
                print(f.read())
        except FileNotFoundError:
            print(f"报告不存在: {report_path}", file=sys.stderr)
            sys.exit(1)
    else:
        sessions = tracker.list_sessions()
        if not sessions:
            print("无任何会话记录。")
            return
        print("已有会话:")
        for s in sessions:
            print(f"  {s['session_id']}  状态={s['status']}  面积={s['area']}")


def _rebuild_instability_records(records_data: List[Dict[str, Any]]):
    from sort_instability import InstabilityRecord
    result = []
    for d in records_data:
        r = InstabilityRecord()
        for k, v in d.items():
            if hasattr(r, k):
                setattr(r, k, v)
        result.append(r)
    return result


def cmd_add_draft(args):
    tracker = DraftTracker()
    judgments = args.judgments_changed.split(",") if args.judgments_changed else []
    try:
        entry = tracker.add_draft_note(args.session_id, args.note, judgments)
    except ValueError as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)

    rec = tracker.sessions.get(args.session_id)
    hull = rec.hull_result if rec else None
    unstable = _rebuild_instability_records(rec.unstable_records) if rec else []
    stable = _rebuild_instability_records(rec.stable_records) if rec else []

    report_dir = args.report_dir or "."
    report_content = generate_report(
        tracker,
        hull_result=hull,
        unstable_records=unstable,
        stable_records=stable,
        session_id=args.session_id,
    )
    report_path = f"{report_dir}/report_{args.session_id}.md"
    save_report(report_content, report_path)

    print(json.dumps({
        "session_id": args.session_id,
        "note": entry.note,
        "judgments_changed": entry.judgments_changed,
        "timestamp": entry.timestamp,
        "report_path": report_path,
    }, ensure_ascii=False, indent=2))


def cmd_override(args):
    tracker = DraftTracker()
    try:
        tracker.mark_manual_override(args.session_id, args.reason)
    except ValueError as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)

    sessions = tracker.sessions
    sid = args.session_id
    rec = sessions.get(sid)
    hull = rec.hull_result if rec else None

    unstable = _rebuild_instability_records(rec.unstable_records) if rec else []
    stable = _rebuild_instability_records(rec.stable_records) if rec else []

    report_content = generate_report(
        tracker,
        hull_result=hull,
        unstable_records=unstable,
        stable_records=stable,
        session_id=sid,
    )

    report_dir = args.report_dir or "."
    report_path = f"{report_dir}/report_{sid}.md"
    save_report(report_content, report_path)

    print(json.dumps({
        "session_id": sid,
        "status": "manual_override",
        "reason": args.reason,
        "report_path": report_path,
    }, ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser(
        prog="hull_explain",
        description="凸包面积图表解释 - 凸包面积计算、排序不稳定检测与Markdown报告生成",
    )
    sub = parser.add_subparsers(dest="command", help="子命令")

    p_start = sub.add_parser("start", help="启动一次凸包面积计算")
    p_start.add_argument("--points", required=True, help="点集JSON，如 [[0,0],[1,0],[0,1]]")
    p_start.add_argument("--session-id", help="会话ID，默认自动生成")
    p_start.add_argument("--input-unit", default="px", help="输入坐标单位 (px/mm/cm)")
    p_start.add_argument("--output-unit", default="px", help="输出面积单位 (px/mm/cm)")
    p_start.add_argument("--collinear-threshold", type=float, default=1e-9, help="共线判定阈值")
    p_start.add_argument("--angle-threshold", type=float, default=1e-6, help="极角差不稳定阈值")
    p_start.add_argument("--draft-note", help="计算草稿备注")
    p_start.add_argument("--judgments-changed", help="备注影响的判断，逗号分隔")
    p_start.add_argument("--report-dir", default=".", help="报告输出目录")

    p_rerun = sub.add_parser("rerun", help="用不同参数重跑，与旧会话对照")
    p_rerun.add_argument("--points", required=True, help="点集JSON")
    p_rerun.add_argument("--session-id", help="新会话ID")
    p_rerun.add_argument("--compare-with", help="对比的旧会话ID")
    p_rerun.add_argument("--input-unit", default="px", help="输入坐标单位")
    p_rerun.add_argument("--output-unit", default="px", help="输出面积单位")
    p_rerun.add_argument("--collinear-threshold", type=float, default=1e-9, help="共线判定阈值")
    p_rerun.add_argument("--angle-threshold", type=float, default=1e-6, help="极角差不稳定阈值")
    p_rerun.add_argument("--draft-note", help="计算草稿备注")
    p_rerun.add_argument("--judgments-changed", help="备注影响的判断，逗号分隔")
    p_rerun.add_argument("--report-dir", default=".", help="报告输出目录")

    p_view = sub.add_parser("view-report", help="查看Markdown报告")
    p_view.add_argument("--session-id", help="会话ID，省略则列出所有会话")
    p_view.add_argument("--report-dir", default=".", help="报告目录")

    p_draft = sub.add_parser("add-draft", help="追加计算草稿备注")
    p_draft.add_argument("--session-id", required=True, help="会话ID")
    p_draft.add_argument("--note", required=True, help="备注内容")
    p_draft.add_argument("--judgments-changed", help="备注影响的判断，逗号分隔")
    p_draft.add_argument("--report-dir", default=".", help="报告目录")

    p_override = sub.add_parser("override", help="标记人工改判")
    p_override.add_argument("--session-id", required=True, help="会话ID")
    p_override.add_argument("--reason", required=True, help="改判原因")
    p_override.add_argument("--report-dir", default=".", help="报告目录")

    args = parser.parse_args()
    if args.command == "start":
        cmd_start(args)
    elif args.command == "rerun":
        cmd_rerun(args)
    elif args.command == "view-report":
        cmd_view_report(args)
    elif args.command == "add-draft":
        cmd_add_draft(args)
    elif args.command == "override":
        cmd_override(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
