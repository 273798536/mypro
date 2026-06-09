#!/usr/bin/env python3
"""凸包面积试算 CLI

用法:
  python convex_hull_cli.py run    --input data.csv [--params meta.json] [--expected-param v2] [--notes "..."]
  python convex_hull_cli.py anomalies --result-id <id> | --latest
  python convex_hull_cli.py history   [--list] [--compare v001 v002] [--show v001]
  python convex_hull_cli.py export    --latest | --result-id <id> | --version v001 [--format txt|json|csv]
  python convex_hull_cli.py chart     --latest | --result-id <id> | --version v001
  python convex_hull_cli.py dashboard --latest | --version v001
"""
import argparse
import json
import os
import sys

HISTORY_DIR = os.environ.get("CONVEX_HULL_HISTORY", "./history")
OUTPUT_DIR = os.environ.get("CONVEX_HULL_OUTPUT", "./output")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from convex_hull_cli.core.data_manager import CalculationEngine
from convex_hull_cli.core.history import HistoryManager
from convex_hull_cli.core.unified_data import UnifiedDataset
from convex_hull_cli.core.chart import ChartRenderer
from convex_hull_cli.core.models import AnomalyAction
from convex_hull_cli.exporters.report import ReportExporter


ACTION_LABELS = {
    AnomalyAction.SUPPLEMENT_MATERIAL.value: "补材料",
    AnomalyAction.ADJUST_CALIBER.value: "改口径",
    AnomalyAction.REVIEW_DATA.value: "核对数据",
    AnomalyAction.WAIT_PARAMETER.value: "等参数表"
}


def _print_header(text: str):
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60)


def cmd_run(args):
    engine = CalculationEngine(parameter_file=args.params)
    result = engine.run(
        data_file=args.input,
        parameter_expected_version=args.expected_param,
        notes=args.notes or ""
    )
    dataset = UnifiedDataset(result)
    if not dataset.ensure_consistency():
        print("[警告] 图表/明细/导出数据源不一致，请检查代码。")

    hist = HistoryManager(HISTORY_DIR)
    latest = hist.get_latest()

    renderer = ChartRenderer(OUTPUT_DIR)
    chart_path = renderer.render(dataset)

    change_reason = args.reason or ""
    if latest and latest.result.parameter_version != result.parameter_version:
        affected = latest.result.parameter_version or "无"
        newer = result.parameter_version or "无"
        change_reason = change_reason or f"参数表版本变化: {affected} → {newer}"
        _print_header("参数表版本变更提示")
        print(f"  上一版本: {affected}")
        print(f"  当前版本: {newer}")
        conclusions = latest.affected_conclusions(hist._latest_dummy(result)) if False else [
            "凸包原始面积（如换算系数变了）",
            "单位校准结论"
        ]
        if result.parameter_version and latest.result.parameter_version and result.parameter_version != latest.result.parameter_version:
            print(f"  可能受影响的结论: {', '.join(conclusions)}")
            print("  操作: 旧结果已保存在 history/，不会被覆盖。")

    snapshot = hist.save_snapshot(result, chart_path=chart_path, change_reason=change_reason)

    _print_header("计算完成")
    print(f"  结果 ID  : {result.result_id}")
    print(f"  版本号   : {snapshot.version}")
    print(f"  原始面积 : {result.raw_area:.6f}")
    print(f"  单位     : {result.unit or '未统一'}")
    print(f"  是否有效 : {'是' if result.is_valid else '否（阻断异常）'}")
    print(f"  图表文件 : {chart_path}")

    _show_anomalies(result)


def _show_anomalies(result):
    if not result.anomalies:
        print("\n  未发现异常。")
        return
    _print_header(f"异常明细  (共 {len(result.anomalies)} 条，阻断 {len(result.blocking_anomalies)})")
    by_action: dict = {}
    for a in result.anomalies:
        by_action.setdefault(a.action.value, []).append(a)
    for action_key, items in by_action.items():
        label = ACTION_LABELS.get(action_key, action_key)
        print(f"\n  ▶ 下一步【{label}】（{len(items)} 条）")
        for a in items:
            tag = "✗ 阻断" if a.is_blocking else "! 提示"
            rid = f" 记录={a.record_id}" if a.record_id else ""
            print(f"    [{tag}] {a.description}{rid}")
            print(f"        详情  : {a.details}")
            if a.affected_fields:
                print(f"        字段  : {', '.join(a.affected_fields)}")
            print(f"        建议  : {a.next_step}")


def cmd_anomalies(args):
    hist = HistoryManager(HISTORY_DIR)
    snapshot = _resolve_snapshot(hist, args)
    if not snapshot:
        print("未找到指定结果。")
        sys.exit(1)
    _show_anomalies(snapshot.result)


def cmd_history(args):
    hist = HistoryManager(HISTORY_DIR)
    if args.list:
        snaps = hist.list_snapshots()
        if not snaps:
            print("暂无历史版本。")
            return
        _print_header("历史版本列表")
        for s in snaps:
            flag = "✓" if s["is_valid"] else "✗"
            print(f"  {s['version']}  {s['timestamp']}  {flag}  "
                  f"面积={s['raw_area']:.4f}  参数={s.get('parameter_version') or '-'}  "
                  f"{s.get('change_reason') or ''}")
        return
    if args.compare:
        a, b = args.compare
        diff = hist.compare(a, b)
        if "error" in diff:
            print(diff["error"])
            sys.exit(1)
        _print_header(f"版本对比: {a} → {b}")
        print(f"  时间: {diff['timestamp_a']} → {diff['timestamp_b']}")
        print(f"  面积: {diff['area_a']:.6f} → {diff['area_b']:.6f}  (Δ = {diff['area_diff']:+.6f})")
        print(f"  单位: {diff['unit_a'] or '-'} → {diff['unit_b'] or '-'}")
        print(f"  参数: {diff['param_a'] or '-'} → {diff['param_b'] or '-'}")
        print(f"  阻断异常数: {diff['anomalies_a_blocking']} → {diff['anomalies_b_blocking']}")
        print(f"  变更原因(a): {diff['change_reason_a'] or '-'}")
        print(f"  变更原因(b): {diff['change_reason_b'] or '-'}")
        print(f"  受影响结论: {', '.join(diff['affected_conclusions']) or '无'}")
        return
    if args.show:
        snap = hist.load_snapshot(args.show)
        if not snap:
            print(f"找不到版本 {args.show}")
            sys.exit(1)
        _print_header(f"版本 {snap.version}")
        print(f"  时间        : {snap.timestamp}")
        print(f"  变更原因    : {snap.change_reason or '-'}")
        print(f"  图表文件    : {snap.chart_path or '-'}")
        _show_anomalies(snap.result)
        return
    print("请使用 --list / --compare vA vB / --show vN 之一。")


def cmd_export(args):
    hist = HistoryManager(HISTORY_DIR)
    snapshot = _resolve_snapshot(hist, args)
    if not snapshot:
        print("未找到指定结果。")
        sys.exit(1)
    dataset = UnifiedDataset(snapshot.result)
    exporter = ReportExporter(OUTPUT_DIR)
    fmt = args.format or "txt"
    if fmt == "txt":
        p = exporter.export_text_report(dataset)
    elif fmt == "json":
        p = exporter.export_json(dataset)
    elif fmt == "csv":
        p = exporter.export_csv(dataset)
    else:
        print(f"不支持的格式: {fmt}")
        sys.exit(1)
    print(f"导出完成: {p}")


def cmd_chart(args):
    hist = HistoryManager(HISTORY_DIR)
    snapshot = _resolve_snapshot(hist, args)
    if not snapshot:
        print("未找到指定结果。")
        sys.exit(1)
    dataset = UnifiedDataset(snapshot.result)
    renderer = ChartRenderer(OUTPUT_DIR)
    path = renderer.render(dataset)
    print(f"图表已生成/更新: {path}")
    hist2 = HistoryManager(HISTORY_DIR)
    old = hist2.load_snapshot(snapshot.version)
    if old:
        old.chart_path = path
        import pickle
        with open(os.path.join(hist2.history_dir, f"{snapshot.version}.pkl"), "wb") as f:
            pickle.dump(old, f)
    diffs = hist2.list_snapshots()
    for s in diffs:
        if s["version"] == snapshot.version:
            s["chart_path"] = path
    hist2._save_index({"snapshots": diffs, "current_version": diffs[-1]["version"] if diffs else None})


def cmd_dashboard(args):
    hist = HistoryManager(HISTORY_DIR)
    snapshot = _resolve_snapshot(hist, args) or hist.get_latest()
    if not snapshot:
        print("暂无数据。请先执行 run 命令导入数据。")
        sys.exit(1)
    result = snapshot.result
    dataset = UnifiedDataset(result)
    detail = dataset.detail_payload()

    _print_header(f"凸包面积试算看板  版本 {snapshot.version}  结果ID {result.result_id}")
    s = detail["summary"]
    print(f"  状态      : {'✓ 正常' if detail['is_valid'] else '✗ 存在阻断异常'}")
    print(f"  原始面积  : {s['raw_area']:.6f}")
    print(f"  校准面积  : {s['converted_area'] if s['converted_area'] is not None else '（阻断，未校准）'}")
    print(f"  单位      : {s['unit'] or '未统一'}")
    print(f"  输入点    : {s['total_points']}    凸包顶点: {s['hull_vertices']}")
    print(f"  参数版本  : {s['parameter_version'] or '未指定'}")
    print(f"  变更原因  : {snapshot.change_reason or '-'}")
    print(f"  图表文件  : {snapshot.chart_path or '未生成'}")

    ans = detail["anomaly_summary"]
    if ans["total"]:
        print(f"\n  异常合计  : {ans['total']}")
        print(f"    阻断类  : {ans['blocking']}")
        print(f"    提示类  : {ans['warning']}")
        print(f"    按处置分类:")
        for k, v in ans["by_action"].items():
            print(f"      · 【{ACTION_LABELS.get(k, k)}】: {v} 条")

    if ans["total"]:
        print("\n  -- 每条异常的下一步行动 --")
        for action_key, items in detail["anomalies_by_action"].items():
            label = ACTION_LABELS.get(action_key, action_key)
            print(f"\n  ▶ 【{label}】共 {len(items)} 条:")
            for a in items:
                tag = "阻断" if a["is_blocking"] else "提示"
                rid = f" (记录 {a['record_id']})" if a.get("record_id") else ""
                print(f"    [{tag}] {a['description']}{rid}")
                print(f"        → {a['next_step']}")

    if snapshot.chart_path and os.path.exists(snapshot.chart_path):
        print(f"\n  数据来源校验: 图表/明细/导出 同一份数据 = {'是' if dataset.ensure_consistency() else '否'}")


def _resolve_snapshot(hist: HistoryManager, args) -> object:
    if getattr(args, "latest", False):
        return hist.get_latest()
    if getattr(args, "result_id", None):
        for meta in hist.list_snapshots():
            if meta["result_id"] == args.result_id:
                return hist.load_snapshot(meta["version"])
        return None
    if getattr(args, "version", None):
        return hist.load_snapshot(args.version)
    return None


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="convex_hull_cli", description="凸包面积试算 CLI")
    sub = p.add_subparsers(dest="command", required=True)

    r = sub.add_parser("run", help="导入数据并计算")
    r.add_argument("--input", "-i", required=True, help="输入 CSV 文件 (含 x,y,unit,record_id 列)")
    r.add_argument("--params", "-p", help="参数表元数据 JSON (含 version, timestamp)")
    r.add_argument("--expected-param", help="预期参数表版本号，不一致会告警")
    r.add_argument("--notes", help="本次计算备注")
    r.add_argument("--reason", help="变更原因（写入历史快照）")
    r.set_defaults(func=cmd_run)

    a = sub.add_parser("anomalies", help="查看异常")
    a.add_argument("--latest", action="store_true", help="查看最新结果的异常")
    a.add_argument("--result-id", help="按结果 ID 查看")
    a.add_argument("--version", help="按历史版本号查看")
    a.set_defaults(func=cmd_anomalies)

    h = sub.add_parser("history", help="历史版本管理")
    h.add_argument("--list", action="store_true", help="列出所有版本")
    h.add_argument("--compare", nargs=2, metavar=("vA", "vB"), help="对比两个版本")
    h.add_argument("--show", metavar="vN", help="显示指定版本详情")
    h.set_defaults(func=cmd_history)

    e = sub.add_parser("export", help="导出报告")
    e.add_argument("--latest", action="store_true")
    e.add_argument("--result-id")
    e.add_argument("--version")
    e.add_argument("--format", "-f", choices=["txt", "json", "csv"], default="txt")
    e.set_defaults(func=cmd_export)

    c = sub.add_parser("chart", help="生成/更新图表")
    c.add_argument("--latest", action="store_true")
    c.add_argument("--result-id")
    c.add_argument("--version")
    c.set_defaults(func=cmd_chart)

    d = sub.add_parser("dashboard", help="文本看板（图表/明细/导出同一数据）")
    d.add_argument("--latest", action="store_true")
    d.add_argument("--version")
    d.set_defaults(func=cmd_dashboard)

    return p


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
