import argparse
import sys
from typing import List, Optional

from .param_table import ParameterTable
from .boundary_samples import BoundarySampleSet
from .core import BoundaryCorrectionEngine, CorrectionResult, CorrectionStatus
from .error_analysis import ErrorAnalyzer, AnalysisReport


def _print_header(title: str):
    line = "=" * 64
    print(f"\n{line}")
    print(f"  {title}")
    print(line)


def _print_result(r: CorrectionResult, idx: int):
    status_marks = {
        CorrectionStatus.OK: "✓",
        CorrectionStatus.CONFLICT: "⚠",
        CorrectionStatus.MISSING: "✗",
        CorrectionStatus.OUTLIER: "!",
        CorrectionStatus.NOISY: "~",
        CorrectionStatus.REVIEW: "※",
    }
    mark = status_marks.get(r.status, "?")
    print(f"\n[{mark}] 边界 #{idx}  x = {r.x}")
    print(f"    前段: {r.seg_before or '-'}  后段: {r.seg_after or '-'}")
    if r.y_pred_before is not None:
        print(f"    预测(前段): {r.y_pred_before:.6f}")
    if r.y_pred_after is not None and r.y_pred_after != r.y_pred_before:
        print(f"    预测(后段): {r.y_pred_after:.6f}")
    if r.y_measured is not None:
        print(f"    实测值:    {r.y_measured:.6f}")
    if r.y_corrected is not None and r.y_corrected != r.y_pred_before:
        print(f"    批改值:    {r.y_corrected:.6f}")
    if r.delta is not None:
        print(f"    批改偏移Δ: {r.delta:+.6f}")
    print(f"    状态: {r.status.value}  使用样例: {r.samples_used or '无'}")
    if r.violations:
        print(f"    约束违反 ({len(r.violations)}):")
        for v in r.violations:
            side = "低于下限" if v.side == "low" else "高于上限"
            print(f"      - {v.name} = {v.value:.4f} {side} (允许 {v.allowed[0]}~{v.allowed[1]})")
    if r.review_note:
        print(f"    复核备注: {r.review_note}")


def _print_report(report: AnalysisReport):
    _print_header("误差分析汇总")
    s = report.summary
    print(f"  总边界点数:       {s['total_boundaries']}")
    print(f"  有实测数据:       {s['with_measurements']}")
    print(f"  缺失样例边界:     {s['missing_boundaries']}  {list(report.missing) if report.missing else ''}")
    print(f"  约束冲突数:       {s['conflict_count']}")
    print(f"  需人工复核项:     {s['review_count']}")
    print(f"  误差总改善量:     {s['total_improvement']:+.6f}")
    print(f"  平均每点改善:     {s['avg_improvement_per_boundary']:+.6f}")
    print(f"  改善边界点数:     {s['boundaries_improved']}")
    print(f"  变差边界点数:     {s['boundaries_worsened']}")
    print(f"  冲突处理策略:     {s['conflict_strategy']}")

    if report.metrics:
        print(f"\n  各边界详情:")
        print(f"  {'x':>6}  {'y_before':>12}  {'y_after':>12}  {'Δy':>12}  {'|e|_before':>12}  {'|e|_after':>12}  {'提升':>10}")
        for m in report.metrics:
            yb = f"{m.y_before:.6f}" if m.y_before is not None else "     N/A    "
            ya = f"{m.y_after:.6f}" if m.y_after is not None else "     N/A    "
            dy = f"{(m.y_after - m.y_before):+.6f}" if (m.y_after is not None and m.y_before is not None) else "    N/A     "
            eb = f"{m.abs_error_before:.6f}" if m.abs_error_before is not None else "     N/A    "
            ea = f"{m.abs_error_after:.6f}" if m.abs_error_after is not None else "     N/A    "
            imp = f"{m.improvement:+.6f}" if m.improvement is not None else "   N/A    "
            print(f"  {m.x:6.2f}  {yb:>12}  {ya:>12}  {dy:>12}  {eb:>12}  {ea:>12}  {imp:>10}")

    if report.review_items:
        _print_header("需复核项清单")
        for i, item in enumerate(report.review_items, 1):
            print(f"  [{i}] x={item['x']}  状态={item['status']}")
            print(f"      样例: {item['samples']}")
            print(f"      备注: {item['note']}")


def _review_loop(engine: BoundaryCorrectionEngine, strategy: str):
    _print_header("复核入口")
    print("  输入命令:")
    print("    list            - 列出所有边界批改结果")
    print("    show <x>        - 显示指定边界 x 的详情")
    print("    update <id> <y> - 修正样例 <id> 的实测值为 <y> 并重新批改")
    print("    override <x> <y>- 直接覆盖边界 x 的批改值")
    print("    report          - 重新生成误差分析")
    print("    export <path>   - 导出图表数据 JSON 到 <path>")
    print("    save <path>     - 保存分析报告 JSON 到 <path>")
    print("    quit / exit     - 退出复核")

    while True:
        try:
            raw = input("\n[复核] > ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not raw:
            continue
        parts = raw.split()
        cmd = parts[0].lower()

        if cmd in ("quit", "exit", "q"):
            break

        elif cmd == "list":
            results = engine.correct_all(conflict_strategy=strategy)
            for i, r in enumerate(results, 1):
                _print_result(r, i)

        elif cmd == "show":
            if len(parts) < 2:
                print("  用法: show <x>")
                continue
            try:
                x = float(parts[1])
            except ValueError:
                print("  x 必须是数字")
                continue
            r = engine.correct_boundary(x, conflict_strategy=strategy)
            _print_result(r, 0)

        elif cmd == "update":
            if len(parts) < 3:
                print("  用法: update <sample_id> <y>")
                continue
            sid = parts[1]
            try:
                y = float(parts[2])
            except ValueError:
                print("  y 必须是数字")
                continue
            r = engine.update_sample_and_recheck(sid, y, conflict_strategy=strategy)
            if r is None:
                print(f"  未找到样例 {sid}")
            else:
                print(f"  已更新样例 {sid} 的 y={y}，重新批改结果：")
                _print_result(r, 0)

        elif cmd == "override":
            if len(parts) < 3:
                print("  用法: override <x> <y>")
                continue
            try:
                x = float(parts[1])
                y = float(parts[2])
            except ValueError:
                print("  x 和 y 必须是数字")
                continue
            r = engine.correct_boundary(x, override_measured=y, conflict_strategy=strategy)
            print(f"  已覆盖边界 x={x} 的批改值：")
            _print_result(r, 0)

        elif cmd == "report":
            analyzer = ErrorAnalyzer(engine)
            rep = analyzer.analyze(conflict_strategy=strategy)
            _print_report(rep)

        elif cmd == "export":
            if len(parts) < 2:
                print("  用法: export <path>")
                continue
            path = parts[1]
            analyzer = ErrorAnalyzer(engine)
            analyzer.export_chart_data(path, conflict_strategy=strategy)
            print(f"  图表数据已导出到 {path}")

        elif cmd == "save":
            if len(parts) < 2:
                print("  用法: save <path>")
                continue
            path = parts[1]
            analyzer = ErrorAnalyzer(engine)
            rep = analyzer.analyze(conflict_strategy=strategy)
            rep.to_json(path)
            print(f"  分析报告已保存到 {path}")

        elif cmd == "help":
            print("  list | show <x> | update <id> <y> | override <x> <y> | report | export <path> | save <path> | quit")

        else:
            print(f"  未知命令: {cmd}，输入 help 查看帮助")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="boundary-correction",
        description="分段函数边界批改工具 - 数据分析员复核用",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  boundary-correction run                               # 使用内置默认参数表+样例运行
  boundary-correction run --strategy weighted           # 加权平均处理冲突
  boundary-correction run --export-chart chart.json     # 同时导出图表数据
  boundary-correction run --save-report report.json     # 保存分析报告
  boundary-correction review                            # 运行后进入交互复核模式
  boundary-correction check --x 2.0                     # 单独检查 x=2.0 边界
  boundary-correction check --x 5.0 --override-y 6.5    # 覆盖批改值后检查
""",
    )
    sub = p.add_subparsers(dest="command", required=True)

    p_run = sub.add_parser("run", help="完整运行：批改全部边界+误差分析")
    p_run.add_argument(
        "--strategy", "-s",
        choices=["weighted", "median", "min", "max", "conservative", "raw"],
        default="weighted",
        help="约束冲突处理策略 (默认: weighted 加权平均)",
    )
    p_run.add_argument("--export-chart", metavar="PATH", help="导出图表对比数据 JSON 路径")
    p_run.add_argument("--save-report", metavar="PATH", help="保存误差分析报告 JSON 路径")
    p_run.add_argument("--no-review", action="store_true", help="不进入交互复核模式")

    p_review = sub.add_parser("review", help="运行批改后直接进入交互复核模式")
    p_review.add_argument(
        "--strategy", "-s",
        choices=["weighted", "median", "min", "max", "conservative", "raw"],
        default="weighted",
        help="约束冲突处理策略",
    )

    p_check = sub.add_parser("check", help="检查单一边界点")
    p_check.add_argument("--x", type=float, required=True, help="边界点 x 坐标")
    p_check.add_argument("--override-y", type=float, help="直接指定实测值覆盖批改")
    p_check.add_argument(
        "--strategy", "-s",
        choices=["weighted", "median", "min", "max", "conservative", "raw"],
        default="weighted",
        help="约束冲突处理策略",
    )

    p_samples = sub.add_parser("samples", help="列出所有边界样例")
    p_samples.add_argument("--only-bad", action="store_true", help="只显示有问题的样例")
    p_samples.add_argument("--only-conflict", action="store_true", help="只显示约束冲突样例")

    return p


def main(argv: Optional[List[str]] = None):
    parser = build_parser()
    args = parser.parse_args(argv)

    pt = ParameterTable.default()
    sset = BoundarySampleSet.default()
    engine = BoundaryCorrectionEngine(pt, sset)

    if args.command == "samples":
        _print_header(f"边界样例清单 ({sset.name})")
        for s in sset.samples:
            if args.only_bad and s.quality.value == "good":
                continue
            if args.only_conflict and s.quality.value != "conflict":
                continue
            mark = {"good": "✓", "noisy": "~", "outlier": "!", "missing": "✗", "conflict": "⚠"}.get(s.quality.value, "?")
            y_str = f"{s.y_measured:.6f}" if s.y_measured is not None else "N/A"
            stress_str = f"{s.stress_measured:.2f}" if s.stress_measured is not None else "N/A"
            strain_str = f"{s.strain_measured:.6f}" if s.strain_measured is not None else "N/A"
            print(f"  [{mark}] {s.sample_id}  x={s.x:<7} y={y_str:<14} 应力={stress_str:<10} 应变={strain_str:<12} 质量={s.quality.value}")
            if s.notes:
                print(f"      备注: {s.notes}")
            if s.source:
                print(f"      来源: {s.source}")
        return

    if args.command == "check":
        _print_header(f"单边界检查 x={args.x}")
        r = engine.correct_boundary(args.x, override_measured=args.override_y, conflict_strategy=args.strategy)
        _print_result(r, 1)
        if r.status in (CorrectionStatus.REVIEW, CorrectionStatus.CONFLICT, CorrectionStatus.MISSING):
            print("\n  ▶ 建议进入复核模式修正: boundary-correction review")
        return

    strategy = getattr(args, "strategy", "weighted")

    _print_header(f"分段函数边界批改 - {pt.material}")
    print(f"  参数表来源: {pt.meta.get('source', 'N/A')}")
    print(f"  样例集: {sset.name} (共{len(sset.samples)}条)")
    print(f"  冲突策略: {strategy}")

    results = engine.correct_all(conflict_strategy=strategy)
    for i, r in enumerate(results, 1):
        _print_result(r, i)

    missing = engine.missing_boundary_report()
    if missing:
        _print_header("缺失样例提醒")
        print(f"  以下边界无有效样例数据，已跳过不影响其余计算：")
        for x in missing:
            print(f"    - x = {x}")
        print(f"  请数据分析员补测后使用 update 命令重新导入修正。")

    analyzer = ErrorAnalyzer(engine)
    report = analyzer.analyze(conflict_strategy=strategy)
    _print_report(report)

    if getattr(args, "export_chart", None):
        analyzer.export_chart_data(args.export_chart, conflict_strategy=strategy)
        print(f"\n  ▶ 图表数据已导出: {args.export_chart}")

    if getattr(args, "save_report", None):
        report.to_json(args.save_report)
        print(f"  ▶ 分析报告已保存: {args.save_report}")

    review_needed = any(
        r.status in (CorrectionStatus.REVIEW, CorrectionStatus.CONFLICT, CorrectionStatus.MISSING, CorrectionStatus.OUTLIER)
        for r in results
    )
    if review_needed:
        print(f"\n  ※ 检测到 {len(report.review_items)} 项需人工复核")

    if args.command == "review" or (args.command == "run" and not getattr(args, "no_review", False)):
        print("\n  ▶ 进入交互复核模式（输入 quit 退出，help 查看命令）")
        _review_loop(engine, strategy)

    print("\n完成。")


if __name__ == "__main__":
    main()
