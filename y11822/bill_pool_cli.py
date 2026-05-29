#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

from bill_pool_warning.models import BillPool
from bill_pool_warning.engine import WarningEngine
from bill_pool_warning.validator import DataValidator
from bill_pool_warning.diff import RunDiffer
from bill_pool_warning.audit import AuditTrail
from bill_pool_warning.report import ReportGenerator
from bill_pool_warning.sample_data import generate_sample_data, save_sample_json


def cmd_sample(args):
    path = save_sample_json(args.output)
    print(f"✅ 样例数据已保存到: {path}")
    print(f"   包含: 8张票据, 6份质押合同")
    print(f"   测试场景:")
    print(f"     - B001: 2天后到期, 质押中")
    print(f"     - B002: 5天后到期, 质押中")
    print(f"     - B003: 10天后到期, 已贴现")
    print(f"     - B004: 到期顺延30天 (原3天后到期)")
    print(f"     - B005: 已逾期, 质押释放延迟3天")
    print(f"     - B006: 承兑状态")
    print(f"     - B007: 20天后到期, 质押中")
    print(f"     - B008: 明日到期, 质押中")


def cmd_run(args):
    pool_path = Path(args.pool_file)
    if not pool_path.exists():
        print(f"❌ 错误: 找不到票据池文件 {pool_path}")
        sys.exit(1)

    data = json.loads(pool_path.read_text(encoding="utf-8"))
    pool = BillPool.from_dict(data)

    validator = DataValidator(pool)
    clean_bills, clean_pledges, errors = validator.validate()

    if errors:
        print(f"⚠️  发现 {len(errors)} 个数据问题，已过滤坏数据:")
        for e in errors:
            print(f"   [{e.severity.upper()}] {e.record_type} {e.record_id}: {e.detail}")

    clean_pool = BillPool(
        pool_id=pool.pool_id,
        total_quota=pool.total_quota,
        bills=clean_bills,
        pledge_contracts=clean_pledges,
    )

    engine = WarningEngine(clean_pool, warning_days=args.warning_days)
    ref_date = date.today() if not args.date else date.fromisoformat(args.date)
    warnings = engine.run(reference_date=ref_date)

    differ = RunDiffer(history_dir=args.history_dir)
    prev_run = differ.load_run(args.prev_run) if args.prev_run else differ.load_run()
    diffs = differ.diff(warnings, prev_data=prev_run)
    quota_diffs = differ.diff_quota(engine.get_quota_snapshot(), prev_data=prev_run)

    audit = AuditTrail(audit_dir=args.audit_dir)
    for e in errors:
        audit.record_validation(e.record_id, e.record_type, [e.to_dict()])

    inconsistencies = audit.check_consistency(
        {"quota_snapshot": engine.get_quota_snapshot()},
        {"total_used_in_warnings": sum(w.quota_impact for w in warnings)},
    )

    audit_explanations = [audit.explain_inconsistency(inc) for inc in inconsistencies]

    report_gen = ReportGenerator(engine)
    report_text = report_gen.generate_text_report(
        diffs=diffs if prev_run else None,
        quota_diffs=quota_diffs if prev_run else None,
        inconsistencies=inconsistencies,
        audit_explanations=audit_explanations,
    )

    if args.output:
        report_gen.save_report(args.output, report_text)
        print(f"✅ 文本报告已保存到: {args.output}")

    json_path = args.json_output or (Path(args.output).stem + ".json" if args.output else None)
    if json_path:
        report_gen.save_json(
            json_path,
            warnings,
            engine.get_quota_snapshot(),
            engine.compute_risk_score(),
            diffs=diffs,
            quota_diffs=quota_diffs,
            validation_errors=errors,
            audit_entries=audit.entries,
        )
        print(f"✅ JSON数据已保存到: {json_path}")

    run_id = differ.save_run(
        warnings,
        engine.get_quota_snapshot(),
        engine.compute_risk_score(),
        run_id=args.run_id,
    )
    audit.save(run_id=run_id)
    print(f"💾 运行记录已保存 (run_id={run_id})")

    if not args.output and not args.json_output:
        print()
        print(report_text)


def cmd_list(args):
    differ = RunDiffer(history_dir=args.history_dir)
    runs = differ.list_runs()
    if not runs:
        print("没有历史运行记录")
        return
    print(f"共找到 {len(runs)} 次运行记录:")
    for r in runs:
        data = differ.load_run(r)
        if data:
            count = len(data.get("warnings", []))
            quota = data.get("quota_snapshot", {})
            used = quota.get("used_quota", 0)
            ratio = quota.get("usage_ratio", 0)
            print(f"  {r}: {count}条预警, 已用额度={used:.0f}, 使用率={ratio*100:.1f}%")


def cmd_audit(args):
    audit = AuditTrail(audit_dir=args.audit_dir)
    if args.bill_id:
        entries = audit.lookup_bill_history(args.bill_id, run_id=args.run_id)
        if not entries:
            print(f"未找到票据 {args.bill_id} 的审计记录")
            return
        print(f"票据 {args.bill_id} 审计轨迹:")
        for e in entries:
            print(f"  [{e.timestamp}] {e.action}: {e.detail}")
    else:
        audit_files = sorted(Path(args.audit_dir).glob("audit_*.json"))
        print(f"共找到 {len(audit_files)} 份审计文件")
        for f in audit_files:
            data = json.loads(f.read_text(encoding="utf-8"))
            print(f"  {f.stem}: {len(data.get('entries', []))} 条记录")


def cmd_diff(args):
    differ = RunDiffer(history_dir=args.history_dir)
    runs = differ.list_runs()
    if len(runs) < 2:
        print("需要至少2次运行记录才能对比")
        return

    run2 = args.run2 or runs[-1]
    run1 = args.run1 or runs[-2]

    data1 = differ.load_run(run1)
    data2 = differ.load_run(run2)

    if not data1 or not data2:
        print(f"无法加载运行记录 {run1} 或 {run2}")
        return

    from datetime import date
    from bill_pool_warning.engine import MaturityWarning
    warnings2 = []
    for w in data2.get("warnings", []):
        w = dict(w)
        w["bill_status"] = type('Status', (), {'value': w['bill_status']})
        w["effective_maturity_date"] = date.fromisoformat(w["effective_maturity_date"])
        warnings2.append(MaturityWarning(**w))
    diffs = differ.diff(warnings2, prev_data=data1)
    quota_diffs = differ.diff_quota(data2.get("quota_snapshot", {}), prev_data=data1)

    print(f"对比: {run1} → {run2}")
    print(f"票据预警变化 ({len(diffs)} 项):")
    for d in diffs:
        print(f"  {d.change_type}: {d.bill_id}")
        if d.old_value or d.new_value:
            print(f"    {d.old_value or '-'} → {d.new_value or '-'}")
        print(f"    {d.detail}")

    print(f"\n额度变化 ({len(quota_diffs)} 项):")
    for d in quota_diffs:
        print(f"  {d.change_type}: {d.old_value or '-'} → {d.new_value or '-'}")
        print(f"    {d.detail}")


def main():
    parser = argparse.ArgumentParser(
        description="票据池到期预警工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python bill_pool_cli.py sample                          # 生成样例数据
  python bill_pool_cli.py run sample_data.json            # 第一次运行
  python bill_pool_cli.py run sample_data.json -o r1.txt  # 运行并输出报告
  python bill_pool_cli.py list                            # 列出运行历史
  python bill_pool_cli.py diff                            # 对比最近两次运行
  python bill_pool_cli.py audit --bill_id B001            # 查看某票据审计轨迹
        """,
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    p_sample = subparsers.add_parser("sample", help="生成样例数据")
    p_sample.add_argument("-o", "--output", default="sample_data.json", help="输出文件")
    p_sample.set_defaults(func=cmd_sample)

    p_run = subparsers.add_parser("run", help="运行到期预警")
    p_run.add_argument("pool_file", help="票据池JSON文件")
    p_run.add_argument("-o", "--output", help="文本报告输出路径")
    p_run.add_argument("--json-output", help="JSON数据输出路径")
    p_run.add_argument("--warning-days", type=int, default=7, help="预警天数阈值")
    p_run.add_argument("--date", help="参考日期 (YYYY-MM-DD)")
    p_run.add_argument("--prev-run", help="对比的历史运行ID")
    p_run.add_argument("--run-id", help="指定本次运行ID")
    p_run.add_argument("--history-dir", default=".bill_pool_history", help="历史目录")
    p_run.add_argument("--audit-dir", default=".bill_pool_audit", help="审计目录")
    p_run.set_defaults(func=cmd_run)

    p_list = subparsers.add_parser("list", help="列出历史运行")
    p_list.add_argument("--history-dir", default=".bill_pool_history", help="历史目录")
    p_list.set_defaults(func=cmd_list)

    p_diff = subparsers.add_parser("diff", help="对比运行差异")
    p_diff.add_argument("run1", nargs="?", help="较早的运行ID")
    p_diff.add_argument("run2", nargs="?", help="较晚的运行ID")
    p_diff.add_argument("--history-dir", default=".bill_pool_history", help="历史目录")
    p_diff.set_defaults(func=cmd_diff)

    p_audit = subparsers.add_parser("audit", help="查看审计记录")
    p_audit.add_argument("--bill-id", help="指定票据ID查看轨迹")
    p_audit.add_argument("--run-id", help="指定运行ID")
    p_audit.add_argument("--audit-dir", default=".bill_pool_audit", help="审计目录")
    p_audit.set_defaults(func=cmd_audit)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
