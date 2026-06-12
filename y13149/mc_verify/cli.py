import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

from mc_verify.importer import load_questions_from_file, add_boundary_sample
from mc_verify.engine import simulate
from mc_verify.history import HistoryStore
from mc_verify.report import generate_report, format_report_text
from mc_verify.models import ProcessStatus, UnitStatus


def main(argv: list[str] | None = None):
    parser = argparse.ArgumentParser(
        prog="mc_verify",
        description="蒙特卡洛误差批量验算 — 一条命令跑完全部样例",
    )
    parser.add_argument(
        "input",
        nargs="?",
        default="data/sample_questions.json",
        help="题目清单 JSON 路径 (默认 data/sample_questions.json)",
    )
    parser.add_argument("--output-dir", default="output", help="输出目录 (默认 output)")
    parser.add_argument("--samples", type=int, default=10000, help="蒙特卡洛采样次数 (默认 10000)")
    parser.add_argument("--seed", type=int, default=42, help="随机种子 (默认 42)")
    parser.add_argument("--tolerance", type=float, default=0.05, help="相对误差容限 (默认 0.05)")
    parser.add_argument("--boundary-formula", default=None, help="额外补入的边界样本公式")
    parser.add_argument("--boundary-expected", type=float, default=None, help="边界样本期望值")
    parser.add_argument("--boundary-unit", default=None, help="边界样本单位")
    parser.add_argument("--boundary-desc", default="", help="边界样本描述")
    parser.add_argument("--extra-aliases", default=None, help="额外字段别名 JSON 文件路径")
    parser.add_argument("--confirm", default=None, help="人工确认: 格式 question_id:explanation")

    args = parser.parse_args(argv)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    history = HistoryStore(store_path=output_dir / "history.json")

    extra_aliases = None
    if args.extra_aliases:
        with open(args.extra_aliases, "r", encoding="utf-8") as f:
            extra_aliases = json.load(f)

    items = load_questions_from_file(args.input, extra_aliases=extra_aliases)
    history.record_import(items)

    if args.boundary_formula:
        boundary = add_boundary_sample(
            items,
            formula=args.boundary_formula,
            expected_value=args.boundary_expected,
            unit=args.boundary_unit,
            source_description=args.boundary_desc or "(边界样本)",
        )
        history.record_import([boundary])

    results = []
    for item in items:
        result = simulate(
            item,
            sample_count=args.samples,
            seed=args.seed,
            tolerance=args.tolerance,
        )

        is_unit_blocked = (
            item.unit_trace is not None
            and item.unit_trace.status in (UnitStatus.MISSING, UnitStatus.MISMATCH)
        )
        if is_unit_blocked:
            item.process_status = ProcessStatus.UNIT_BLOCKED
        elif result.anomalies:
            item.process_status = ProcessStatus.FAILED
        else:
            item.process_status = ProcessStatus.PASSED

        history.record_verify(item, result)
        results.append(result)

    report = generate_report(
        items,
        results,
        param_version="1.0.0",
        mc_sample_count=args.samples,
        mc_seed=args.seed,
        output_path=output_dir / "report.json",
    )

    if args.confirm:
        parts = args.confirm.split(":", 1)
        qid = parts[0]
        explanation = parts[1] if len(parts) > 1 else "人工确认"
        matching = [i for i in items if i.question_id == qid]
        if matching:
            item = matching[0]
            before = {"process_status": item.process_status.value}
            item.process_status = ProcessStatus.PASSED
            after = {"process_status": ProcessStatus.PASSED.value}
            history.record_confirm(qid, before, after, confirmed_by="human", explanation=explanation)
        else:
            print(f"[警告] 未找到题目 {qid}，跳过确认", file=sys.stderr)

    report_text = format_report_text(report)
    with open(output_dir / "report.txt", "w", encoding="utf-8") as f:
        f.write(report_text)

    print(report_text)

    unit_blocked_items = [
        (item, result) for item, result in zip(items, results)
        if item.unit_trace and item.unit_trace.status in (UnitStatus.MISSING, UnitStatus.MISMATCH)
    ]

    if unit_blocked_items:
        print("\n" + "!" * 72, file=sys.stderr)
        print("退出提示：存在单位缺失/不匹配，验算受阻", file=sys.stderr)
        print("!" * 72, file=sys.stderr)
        for item, result in unit_blocked_items:
            ut = item.unit_trace
            print(
                f"  题目 {item.question_id}: 单位状态=[{ut.status.value}] "
                f"卡在来源字段='{ut.original_field}' "
                f"原始说法='{ut.original_value}' "
                f"期望单位={ut.expected_unit or '(无法推断)'} "
                f"实际单位={ut.actual_unit or '(缺失)'}",
                file=sys.stderr,
            )
            print(f"    → {ut.detail}", file=sys.stderr)
        print(f"\n  共 {len(unit_blocked_items)} 条题目因单位问题受阻，请补全后再跑。", file=sys.stderr)
        sys.exit(2)

    failed_items = [(item, result) for item, result in zip(items, results) if result.anomalies and item.process_status == ProcessStatus.FAILED]
    if failed_items:
        print(f"\n退出提示：{len(failed_items)} 条题目验算失败（非单位原因），请检查异常点。", file=sys.stderr)
        sys.exit(1)

    print("\n全部通过，无单位缺失。", file=sys.stderr)
    sys.exit(0)


if __name__ == "__main__":
    main()
