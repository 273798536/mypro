#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from history import History, make_run_dir
from models import ChangeWarning, SourceLocation
from reporter import write_reports
from solver import solve_with_dp
from validator import (
    build_inventory_map,
    deduplicate_denominations,
    load_change_requests,
    load_denominations,
    load_inventory,
    validate_denominations,
    validate_inventory,
)


def _resolve_input(input_dir: Path, name: str) -> Path:
    p = input_dir / f"{name}.json"
    if not p.exists():
        print(f"错误: 输入文件不存在: {p}", file=sys.stderr)
        sys.exit(1)
    return p


def run(args: argparse.Namespace) -> None:
    input_dir = Path(args.input)
    output_dir = Path(args.output)

    if not input_dir.is_dir():
        print(f"错误: 输入目录不存在: {input_dir}", file=sys.stderr)
        sys.exit(1)

    history = History()
    history.record("start", f"输入目录={input_dir}, 输出目录={output_dir}")

    denoms_path = _resolve_input(input_dir, "denominations")
    inv_path = _resolve_input(input_dir, "inventory")
    req_path = _resolve_input(input_dir, "change_requests")

    history.record("load", "加载面额文件", source=SourceLocation(file=str(denoms_path), line=0))
    denoms = load_denominations(denoms_path)
    history.record("load", f"加载 {len(denoms)} 个面额")

    history.record("load", "加载库存文件", source=SourceLocation(file=str(inv_path), line=0))
    inventory = load_inventory(inv_path)
    history.record("load", f"加载 {len(inventory)} 条库存")

    history.record("load", "加载找零请求", source=SourceLocation(file=str(req_path), line=0))
    requests = load_change_requests(req_path)
    history.record("load", f"加载 {len(requests)} 条找零请求")

    all_warnings: list[ChangeWarning] = validate_denominations(denoms)
    if all_warnings:
        for w in all_warnings:
            history.record(
                "warning",
                w.message,
                source=w.source,
            )

    deduped = deduplicate_denominations(denoms, all_warnings)
    if len(deduped) < len(denoms):
        history.record_correction(
            "denominations",
            f"原始 {len(denoms)} 个面额",
            f"去重后 {len(deduped)} 个面额",
            "移除重复面额",
        )

    denom_values = [d.value for d in deduped]
    denom_labels = {d.value: d.label for d in deduped}

    run_dir = make_run_dir(output_dir)
    history.record("output", f"输出目录: {run_dir}")

    combined_results: list[dict] = []
    report_texts: list[str] = []

    for idx, req in enumerate(requests):
        inv_warnings = validate_inventory(inventory, deduped, req.amount)
        req_warnings = all_warnings + inv_warnings

        inv_map = build_inventory_map(inventory, set(denom_values))

        result = solve_with_dp(req.amount, denom_values, inv_map)

        final_warnings = req_warnings + result.warnings

        history.record(
            "solve",
            f"金额={req.amount}, 可行={len(result.feasible)}, "
            f"最优={len(result.optimal)}, 警告={len(final_warnings)}",
            source=req.source,
        )

        suffix = f"{req.amount}_{req.cashier}_{req.shift}" if len(requests) > 1 else ""
        write_reports(
            run_dir, req, result, denom_labels, final_warnings, history.to_list(),
            suffix=suffix,
        )

        txt_name = f"report_{suffix}.txt" if suffix else "report.txt"
        report_texts.append((run_dir / txt_name).read_text(encoding="utf-8"))

        combined_results.append({
            "amount": req.amount,
            "cashier": req.cashier,
            "shift": req.shift,
            "feasible_count": len(result.feasible),
            "optimal_count": len(result.optimal),
            "warnings": len(final_warnings),
        })

    if len(requests) > 1:
        summary_path = run_dir / "summary.json"
        summary_path.write_text(
            json.dumps(combined_results, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    history_path = run_dir / "history.json"
    history.save(history_path)

    for text in report_texts:
        print(text)

    for w in all_warnings:
        src = f" [{w.source}]" if w.source else ""
        print(f"⚠{src}: {w.message}", file=sys.stderr)

    print(f"结果已写入: {run_dir}")


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="cash-change",
        description="现金找零组合器 - 便利店新人训练工具",
    )
    parser.add_argument(
        "-i", "--input",
        required=True,
        help="输入目录（含 denominations.json, inventory.json, change_requests.json）",
    )
    parser.add_argument(
        "-o", "--output",
        required=True,
        help="输出目录（每次运行生成独立子目录，不覆盖旧结果）",
    )
    args = parser.parse_args()
    run(args)


if __name__ == "__main__":
    main()
