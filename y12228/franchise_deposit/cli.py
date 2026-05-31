from __future__ import annotations

import argparse
import sys
from datetime import date
from pathlib import Path

from franchise_deposit.engine import ClearanceEngine
from franchise_deposit.models import (
    load_ad_deductions,
    load_breach_penalties,
    load_contracts,
    load_ledgers,
    load_store_changes,
)
from franchise_deposit.reporter import Reporter


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="franchise-deposit",
        description="连锁加盟保证金清算工具 —— 对齐合同版本、违约扣款、广告基金抵扣和换店转存，输出可追溯的清算报告",
    )
    parser.add_argument(
        "-i", "--input-dir",
        type=str,
        required=True,
        help="输入目录路径，包含 contracts.json、ledgers.json、store_changes.json、breach_penalties.json、ad_deductions.json",
    )
    parser.add_argument(
        "-o", "--output-dir",
        type=str,
        required=True,
        help="输出目录路径，用于存放清算报告文件",
    )
    parser.add_argument(
        "--reference-date",
        type=str,
        default=None,
        help="清算基准日期（YYYY-MM-DD），默认为今天",
    )
    parser.add_argument(
        "--no-terminal-summary",
        action="store_true",
        default=False,
        help="不在终端输出摘要",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    input_dir = Path(args.input_dir)
    if not input_dir.is_dir():
        print(f"错误：输入目录不存在 → {input_dir}", file=sys.stderr)
        return 1

    output_dir = Path(args.output_dir)

    ref_date = date.today()
    if args.reference_date:
        try:
            ref_date = date.fromisoformat(args.reference_date)
        except ValueError:
            print(f"错误：日期格式不正确 → {args.reference_date}，应为 YYYY-MM-DD", file=sys.stderr)
            return 1

    contracts_path = input_dir / "contracts.json"
    ledgers_path = input_dir / "ledgers.json"
    store_changes_path = input_dir / "store_changes.json"
    breach_penalties_path = input_dir / "breach_penalties.json"
    ad_deductions_path = input_dir / "ad_deductions.json"

    for p in [contracts_path, ledgers_path]:
        if not p.exists():
            print(f"错误：缺少必要输入文件 → {p}", file=sys.stderr)
            return 1

    contracts = load_contracts(contracts_path)
    ledgers = load_ledgers(ledgers_path)
    store_changes = load_store_changes(store_changes_path)
    breach_penalties = load_breach_penalties(breach_penalties_path)
    ad_deductions = load_ad_deductions(ad_deductions_path)

    print(f"加载完成：{len(contracts)} 份合同，{len(ledgers)} 条账本，{len(store_changes)} 份换店申请，{len(breach_penalties)} 条违约扣款，{len(ad_deductions)} 条广告抵扣")

    engine = ClearanceEngine(
        contracts=contracts,
        ledgers=ledgers,
        store_changes=store_changes,
        breach_penalties=breach_penalties,
        ad_deductions=ad_deductions,
        reference_date=ref_date,
    )

    results = engine.run()

    reporter = Reporter(results=results, output_dir=output_dir)

    if not args.no_terminal_summary:
        reporter.print_terminal_summary()

    detail_path = reporter.write_detail_report()
    plain_path = reporter.write_plain_report()
    evidence_path = reporter.write_evidence_trail()

    print(f"\n报告已生成：")
    print(f"  详细报告（JSON）：{detail_path}")
    print(f"  人话报告（TXT）： {plain_path}")
    print(f"  证据链（JSON）：  {evidence_path}")

    has_mismatch = any(r.conclusion.value == "mismatch" for r in results)
    if has_mismatch:
        print(f"\n⚠ 存在不一致的清算结果，请重点关注人话报告中的说明。")
        return 2

    return 0


if __name__ == "__main__":
    sys.exit(main())
