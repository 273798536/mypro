"""P2P历史兑付清算 CLI - 主入口

命令:
  run     加载数据 + 检测争议 + 重算本息 + 导出CSV
  check   仅检测争议（不导出）
  export  仅导出CSV（不重跑检测）
  show    查看汇总/争议/修正日志
"""

import sys
import os
from typing import Optional

from models import Dataset, DisputeStatus
from data import build_sample_dataset
from engine import LiquidationEngine
from exporter import export_all


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


def cmd_run(output_dir: str = "output"):
    """加载样例数据，执行完整处理链"""
    print("""
┌─────────────────────────────────────────┐
│  P2P 历史兑付清算 CLI                    │
│  数据: 3投资人 / 3合同 / 4凭证 / 7兑付  │
└─────────────────────────────────────────┘""")

    ds = build_sample_dataset()
    engine = LiquidationEngine(ds)

    print("\n▶ 运行检测引擎...")
    counts = engine.run_all()
    for k, v in counts.items():
        print(f"  {k}: {v}")

    print(f"\n▶ 争议总数: {len(ds.disputes)}")

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


def cmd_check():
    """仅检测争议"""
    ds = build_sample_dataset()
    engine = LiquidationEngine(ds)
    counts = engine.run_all()
    print("检测结果:")
    for k, v in counts.items():
        print(f"  {k}: {v}")
    print(f"\n争议总数: {len(ds.disputes)}")
    for d in ds.disputes:
        print(f"  [{d.dispute_id}] {d.dispute_type.value} - {d.description[:60]}")


def cmd_export(output_dir: str = "output"):
    """仅导出"""
    ds = build_sample_dataset()
    engine = LiquidationEngine(ds)
    counts = export_all(ds, engine, output_dir)
    for fname, cnt in counts.items():
        print(f"  {fname}.csv: {cnt} 行")


def cmd_show(what: str = "all"):
    """查看数据"""
    ds = build_sample_dataset()
    engine = LiquidationEngine(ds)

    if what in ("all", "disputes"):
        print(f"\n争议 ({len(ds.disputes)}):")
        for d in ds.disputes:
            print(f"  [{d.dispute_id}] {d.dispute_type.value} | {d.status.value}")
            print(f"    {d.description}")
            if d.evidence:
                for e in d.evidence:
                    print(f"    证据: {e}")

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
        for a in ds.audit_log:
            print(f"  [{a.timestamp[11:19]}] {a.entity_type}:{a.entity_id} "
                  f"{a.field} {a.old_value}→{a.new_value} ({a.reason})")


def main():
    if len(sys.argv) < 2:
        print("用法: python cli.py [run|check|export|show] [选项]")
        print("  run     完整处理链（检测+重算+导出）")
        print("  check   仅检测争议")
        print("  export  仅导出CSV")
        print("  show [all|disputes|recalc|investors|audit]")
        sys.exit(0)

    cmd = sys.argv[1]

    if cmd == "run":
        out = sys.argv[2] if len(sys.argv) > 2 else "output"
        cmd_run(out)
    elif cmd == "check":
        cmd_check()
    elif cmd == "export":
        out = sys.argv[2] if len(sys.argv) > 2 else "output"
        cmd_export(out)
    elif cmd == "show":
        what = sys.argv[2] if len(sys.argv) > 2 else "all"
        cmd_show(what)
    else:
        print(f"未知命令: {cmd}")
        sys.exit(1)


if __name__ == "__main__":
    main()
