"""P2P历史兑付清算 CLI - 主入口

命令:
  run     加载数据 + 检测争议 + 重算本息 + 导出CSV
  check   仅检测争议（不导出）
  export  检测争议 + 导出CSV
  show    检测争议 + 查看汇总/争议/修正日志

公共选项:
  --data-dir <目录>   从指定CSV目录加载数据（投资人/合同/兑付/凭证/争议）
                      未指定时使用内置样例数据
  --load <文件>       从JSON状态文件加载（跳过检测，直接使用之前保存的处理结果）
  --save <文件>       处理完成后将完整状态保存为JSON，供后续加载使用
  --no-detect         加载数据后不自动运行检测（仅与--load或--data-dir配合使用）

示例:
  python3 cli.py run --data-dir ./my_case_data
  python3 cli.py check --data-dir ./case001 --save ./case001_state.json
  python3 cli.py show disputes --load ./case001_state.json
  python3 cli.py export ./output_dir --load ./case001_state.json
"""

import sys
import os
import argparse
from typing import Optional

from models import Dataset, DisputeStatus
from loader import load_dataset
from engine import LiquidationEngine
from exporter import export_all
from persistence import save_state, load_state


def print_section(title: str, items: list, cols: list):
    """打印表格化输出"""
    print(f"\n{'='*60}")
    print(f"  {title} ({len(items)}条)")
    print(f"{'='*60}")
    if not items:
        print("  (无)")
        return
    header = "  ".join(cols)
    print(header)
    print("-" * len(header))
    for item in items:
        row = "  ".join(str(item.get(c, "")) for c in cols)
        print(row)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="p2p-liquidation",
        description="P2P历史兑付清算 CLI - 身份归并 / 本息重算 / 凭证去重 / 争议清单 / CSV导出"
    )
    subparsers = parser.add_subparsers(dest="cmd", required=True)

    # run
    p_run = subparsers.add_parser("run", help="完整处理链：加载+检测+重算+导出")
    p_run.add_argument("output_dir", nargs="?", default="output", help="CSV输出目录（默认: ./output）")
    p_run.add_argument("--data-dir", help="数据CSV目录，含investors/contracts/repayments/vouchers.csv")
    p_run.add_argument("--load", help="从JSON状态文件加载（跳过检测）")
    p_run.add_argument("--save", help="处理完成后保存状态到JSON文件")
    p_run.add_argument("--no-detect", action="store_true", help="加载数据后不自动运行检测")

    # check
    p_check = subparsers.add_parser("check", help="仅检测争议，输出检测结果")
    p_check.add_argument("--data-dir", help="数据CSV目录")
    p_check.add_argument("--load", help="从JSON状态文件加载")
    p_check.add_argument("--save", help="处理完成后保存状态到JSON文件")
    p_check.add_argument("--no-detect", action="store_true", help="加载数据后不自动运行检测")

    # export
    p_export = subparsers.add_parser("export", help="检测争议后导出CSV")
    p_export.add_argument("output_dir", nargs="?", default="output", help="CSV输出目录")
    p_export.add_argument("--data-dir", help="数据CSV目录")
    p_export.add_argument("--load", help="从JSON状态文件加载（跳过检测）")
    p_export.add_argument("--save", help="处理完成后保存状态到JSON文件")
    p_export.add_argument("--no-detect", action="store_true", help="加载数据后不自动运行检测")

    # show
    p_show = subparsers.add_parser("show", help="检测争议后查看结果")
    p_show.add_argument("what", nargs="?", default="all",
                        choices=["all", "disputes", "recalc", "investors", "audit"],
                        help="查看内容（默认: all）")
    p_show.add_argument("--data-dir", help="数据CSV目录")
    p_show.add_argument("--load", help="从JSON状态文件加载（跳过检测）")
    p_show.add_argument("--save", help="处理完成后保存状态到JSON文件")
    p_show.add_argument("--no-detect", action="store_true", help="加载数据后不自动运行检测")

    return parser


def _get_dataset_and_engine(args) -> tuple[Dataset, LiquidationEngine]:
    """统一加载数据，确保所有入口状态一致

    优先级：--load > --data-dir > 内置样例
    行为：
      - 使用 --load 时，默认跳过检测（已包含处理结果），除非 --no-detect=false
      - 使用 --data-dir 或内置样例时，默认运行检测，除非 --no-detect
    """
    # 加载数据
    if getattr(args, "load", None):
        print(f"▶ 从状态文件加载: {args.load}")
        ds = load_state(args.load)
        print(f"  投资人: {len(ds.investors)} 合同: {len(ds.contracts)} 凭证: {len(ds.vouchers)} 兑付: {len(ds.repayments)}")
        if ds.disputes:
            print(f"  已有争议: {len(ds.disputes)} 条")
    else:
        ds = load_dataset(args.data_dir)

    engine = LiquidationEngine(ds)

    # 判断是否运行检测
    should_detect = True
    if getattr(args, "load", None) and not getattr(args, "no_detect", False):
        # 从状态文件加载，默认不重新检测
        should_detect = False
    if getattr(args, "no_detect", False):
        should_detect = False

    if should_detect:
        print("\n▶ 运行检测引擎...")
        counts = engine.run_all()
        for k, v in counts.items():
            print(f"  {k}: {v}")
        print(f"  争议总数: {len(ds.disputes)}")
    else:
        print(f"\n▶ 跳过检测（使用已有状态），争议: {len(ds.disputes)} 条")

    # 保存状态
    if getattr(args, "save", None):
        save_state(ds, args.save)
        print(f"\n▶ 状态已保存到: {args.save}")

    return ds, engine


def cmd_run(args):
    """完整处理链"""
    print("""
┌─────────────────────────────────────────┐
│  P2P 历史兑付清算 CLI                    │
└─────────────────────────────────────────┘""")

    ds, engine = _get_dataset_and_engine(args)
    output_dir = args.output_dir

    # 展示争议清单
    dispute_rows = []
    for d in ds.disputes:
        dispute_rows.append({
            "id": d.dispute_id,
            "type": d.dispute_type.value,
            "entity": f"{d.related_entity_type}:{d.related_entity_id}",
            "status": d.status.value,
            "desc": d.description[:50] + ("..." if len(d.description) > 50 else ""),
        })
    print_section("争议清单", dispute_rows,
                  ["id", "type", "entity", "status", "desc"])

    # 展示本息重算
    recalc = engine.recalculate()
    recalc_rows = []
    for r in recalc:
        recalc_rows.append({
            "contract": r["contract_id"],
            "investor": r["investor"],
            "本金应/实/差": f"{r['principal_expected']:.0f}/{r['principal_actual']:.0f}/{r['principal_diff']:+.0f}",
            "利息应/实/差": f"{r['interest_expected']:.0f}/{r['interest_actual']:.0f}/{r['interest_diff']:+.0f}",
            "本金状态": r["principal_status"],
            "利息状态": r["interest_status"],
        })
    print_section("本息重算核对", recalc_rows,
                  ["contract", "investor", "本金应/实/差", "利息应/实/差", "本金状态", "利息状态"])

    # 投资人汇总
    summary = engine.investor_summary()
    summary_rows = []
    for s in summary:
        summary_rows.append({
            "id": s["investor_id"],
            "name": s["investor_name"],
            "合同数": s["total_contracts"],
            "本金应/实": f"{s['total_principal_expected']:.0f}/{s['total_principal_actual']:.0f}",
            "争议金额": f"{s['total_disputed']:.0f}",
            "归并到": s["merged_into"] or "-",
        })
    print_section("投资人汇总", summary_rows,
                  ["id", "name", "合同数", "本金应/实", "争议金额", "归并到"])

    # 修正日志
    audit_rows = []
    for a in ds.audit_log:
        audit_rows.append({
            "time": a.timestamp[11:19] if len(a.timestamp) > 19 else a.timestamp,
            "entity": f"{a.entity_type}:{a.entity_id}",
            "field": a.field,
            "old→new": f"{a.old_value}→{a.new_value}",
        })
    print_section("修正日志", audit_rows,
                  ["time", "entity", "field", "old→new"])

    # 导出CSV
    print(f"\n▶ 导出CSV到 {output_dir}/ ...")
    export_counts = export_all(ds, engine, output_dir)
    for fname, cnt in export_counts.items():
        print(f"  {fname}.csv: {cnt} 行")

    print("\n✓ 完成。输出目录:", os.path.abspath(output_dir))


def cmd_check(args):
    """仅检测争议"""
    ds, engine = _get_dataset_and_engine(args)

    print(f"\n争议列表:")
    for d in ds.disputes:
        print(f"  [{d.dispute_id}] {d.dispute_type.value} | {d.status.value}")
        print(f"    {d.description[:70]}")
        if d.resolution_notes:
            print(f"    建议: {d.resolution_notes}")


def cmd_export(args):
    """检测后导出CSV"""
    ds, engine = _get_dataset_and_engine(args)
    output_dir = args.output_dir

    print(f"\n▶ 导出CSV到 {output_dir}/ ...")
    export_counts = export_all(ds, engine, output_dir)
    for fname, cnt in export_counts.items():
        print(f"  {fname}.csv: {cnt} 行")

    print("\n✓ 完成。输出目录:", os.path.abspath(output_dir))


def cmd_show(args):
    """查看数据 - 先运行检测确保状态一致"""
    what = args.what
    ds, engine = _get_dataset_and_engine(args)

    if what in ("all", "disputes"):
        print(f"\n争议 ({len(ds.disputes)}):")
        if not ds.disputes:
            print("  (无)")
        for d in ds.disputes:
            print(f"  [{d.dispute_id}] {d.dispute_type.value} | {d.status.value}")
            print(f"    {d.description}")
            if d.evidence:
                for e in d.evidence:
                    print(f"    证据: {e}")
            if d.resolution_notes:
                print(f"    建议: {d.resolution_notes}")

    if what in ("all", "recalc"):
        recalc = engine.recalculate()
        print(f"\n本息核对 ({len(recalc)}):")
        for r in recalc:
            flag_p = "✓" if r["principal_status"] == "ok" else "✗"
            flag_i = "✓" if r["interest_status"] == "ok" else "✗"
            print(f"  {r['contract_id']} {r['investor']}: "
                  f"本金{flag_p}({r['principal_expected']:.0f}/{r['principal_actual']:.0f}) "
                  f"利息{flag_i}({r['interest_expected']:.0f}/{r['interest_actual']:.0f})")

    if what in ("all", "investors"):
        summary = engine.investor_summary()
        print(f"\n投资人 ({len(summary)}):")
        for s in summary:
            print(f"  {s['investor_id']} {s['investor_name']}: "
                  f"{s['total_contracts']}合同 "
                  f"应{s['total_principal_expected']:.0f}/实{s['total_principal_actual']:.0f} "
                  f"争议{s['total_disputed']:.0f}" +
                  (f" →归并到{s['merged_into']}" if s["merged_into"] else ""))

    if what in ("all", "audit"):
        print(f"\n修正日志 ({len(ds.audit_log)}):")
        if not ds.audit_log:
            print("  (无)")
        for a in ds.audit_log:
            print(f"  [{a.timestamp[11:19]}] {a.entity_type}:{a.entity_id} "
                  f"{a.field} {a.old_value}→{a.new_value} ({a.reason})")


def main():
    parser = _build_parser()
    args = parser.parse_args()

    if args.cmd == "run":
        cmd_run(args)
    elif args.cmd == "check":
        cmd_check(args)
    elif args.cmd == "export":
        cmd_export(args)
    elif args.cmd == "show":
        cmd_show(args)


if __name__ == "__main__":
    main()
