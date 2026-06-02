from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime

from .models import AuditVersion, GachaLog, ProbConfig, PityRule
from .prob_validator import ProbValidator
from .pity_tracker import PityTracker
from .version_manager import VersionManager
from .filter_engine import FilterEngine
from .report_exporter import ReportExporter


def _print_banner() -> None:
    print("=" * 60)
    print("  概率保底抽卡审计工具 v0.1")
    print("=" * 60)


def _print_issues(issues: list, verbose: bool = False) -> None:
    if not issues:
        print("  ✅ 无问题")
        return
    for iss in issues:
        icon = {"CRITICAL": "🚨", "WARNING": "⚠️", "INFO": "ℹ️"}.get(
            iss.severity.value, "?"
        )
        print(f"  {icon} [{iss.severity.value}] [{iss.category}] {iss.description}")
        print(f"     定位: {iss.location}")
        if verbose and iss.detail:
            for k, v in iss.detail.items():
                if isinstance(v, (dict, list)):
                    import json
                    print(f"     {k}: {json.dumps(v, ensure_ascii=False)}")
                else:
                    print(f"     {k}: {v}")


def _print_pity_snapshots(snapshots: list) -> None:
    if not snapshots:
        return
    anomaly = [s for s in snapshots if s.is_anomaly]
    normal = [s for s in snapshots if not s.is_anomaly]

    if anomaly:
        print("\n  🚨 保底计数异常:")
        for s in anomaly:
            print(
                f"     玩家 {s.player_id} 卡池 {s.pool_id} [{s.pity_type}] "
                f"计数={s.current_count} 阈值={s.threshold} "
                f"{'· 上次重置seq=' + str(s.last_reset_seq) if s.last_reset_seq else ''}"
            )
            if s.anomaly_reason:
                print(f"     原因: {s.anomaly_reason}")

    if normal:
        print("\n  保底计数快照:")
        print(f"     {'玩家':<8} {'卡池':<14} {'类型':<6} {'当前':>4} {'阈值':>4} {'上次重置':<12}")
        print(f"     {'-'*8} {'-'*14} {'-'*6} {'-'*4} {'-'*4} {'-'*12}")
        for s in normal:
            last = f"seq={s.last_reset_seq}" if s.last_reset_seq else "-"
            print(
                f"     {s.player_id:<8} {s.pool_id:<14} {s.pity_type:<6} "
                f"{s.current_count:>4} {s.threshold:>4} {last:<12}"
            )


def _print_stats(stats: dict) -> None:
    print(f"\n  抽卡总数: {stats['total_pulls']}")
    if stats["rarity_counts"]:
        print("  稀有度分布:")
        for r, c in sorted(stats["rarity_counts"].items()):
            rate = stats["rarity_actual_rates"].get(r, 0.0)
            print(f"    {r}: {c} ({rate:.4f})")
    if stats["deviation"]:
        print("  配置偏差:")
        for pool_id, pool_dev in stats["deviation"].items():
            print(f"    卡池 {pool_id}:")
            for rarity, info in pool_dev.items():
                sign = "+" if info["deviation"] >= 0 else ""
                flag = " ⚠️" if abs(info["deviation"]) > 0.05 else ""
                print(
                    f"      {rarity}: 实际={info['actual']:.4f} "
                    f"配置={info['expected']:.4f} "
                    f"偏差={sign}{info['deviation']:.4f}{flag}"
                )


def cmd_audit(args: argparse.Namespace) -> None:
    _print_banner()

    configs = ProbConfig.load(args.prob_config)
    rules = PityRule.load(args.pity_rules)
    logs = GachaLog.load(args.gacha_logs)

    print(f"\n📥 加载数据:")
    print(f"  概率配置: {len(configs)} 个卡池")
    print(f"  保底规则: {len(rules)} 条")
    print(f"  抽卡日志: {len(logs.records)} 条记录")

    filter_kw = {}
    if args.pool_id:
        filter_kw["pool_id"] = args.pool_id
    if args.player_id:
        filter_kw["player_id"] = args.player_id
    if args.rarity:
        filter_kw["rarity"] = args.rarity
    if args.time_from:
        filter_kw["time_from"] = args.time_from
    if args.time_to:
        filter_kw["time_to"] = args.time_to

    engine = FilterEngine(logs, configs, rules)
    result = engine.apply(**filter_kw)

    if filter_kw:
        print(f"\n🔍 筛选条件: {filter_kw}")
        filtered_logs = result["logs"]
        print(f"  筛选后记录数: {len(filtered_logs.records)}")
    else:
        filtered_logs = logs

    print(f"\n{'='*60}")
    print("  1. 概率校验")
    print(f"{'='*60}")
    validator = ProbValidator(result["configs"])
    prob_issues = validator.validate()
    for cfg in result["configs"]:
        total = sum(e.probability for e in cfg.entries)
        status = "✅ 归一" if abs(total - 1.0) < 1e-6 else "🚨 未归一"
        print(f"  {cfg.pool_name}({cfg.pool_id}) v{cfg.version}: 总和={total:.6f} {status}")
        rarity_summary = validator.get_rarity_summary(cfg)
        for r, s in rarity_summary.items():
            print(f"    {r}: {s:.6f}")
    if prob_issues:
        print(f"\n  概率问题({len(prob_issues)}):")
        _print_issues(prob_issues, verbose=args.verbose)

    print(f"\n{'='*60}")
    print("  2. 保底追踪")
    print(f"{'='*60}")
    tracker = PityTracker(result["logs"], result["rules"], result["configs"])
    pity_issues, snapshots = tracker.track()
    if pity_issues:
        print(f"  保底问题({len(pity_issues)}):")
        _print_issues(pity_issues, verbose=args.verbose)
    else:
        print("  ✅ 保底追踪无异常")
    _print_pity_snapshots(snapshots)

    print(f"\n{'='*60}")
    print("  3. 统计与偏差")
    print(f"{'='*60}")
    _print_stats(result["stats"])

    all_issues = prob_issues + pity_issues
    critical_count = sum(1 for i in all_issues if i.severity.value == "CRITICAL")

    output_dir = args.output or os.path.join(os.getcwd(), "output")
    os.makedirs(output_dir, exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    version_id = f"audit_{ts}"

    version = AuditVersion(
        version_id=version_id,
        created_at=datetime.now().isoformat(),
        prob_configs=result["configs"],
        pity_rules=result["rules"],
        issues=all_issues,
        pity_snapshots=snapshots,
        filter_applied=filter_kw,
    )

    store_dir = os.path.join(output_dir, "versions")
    vm = VersionManager(store_dir)
    vm.save(version)

    exporter = ReportExporter(output_dir)
    json_path = exporter.export_json(version)
    html_path = exporter.export_html(version)

    print(f"\n{'='*60}")
    print("  审计结果")
    print(f"{'='*60}")
    print(f"  版本ID: {version_id}")
    print(f"  严重问题: {critical_count}")
    print(f"  总问题数: {len(all_issues)}")
    print(f"  JSON报告: {json_path}")
    print(f"  HTML报告: {html_path}")

    if critical_count > 0:
        print(f"\n  🚨 存在 {critical_count} 个严重问题，请重点关注概率未归一和保底异常重置!")
        sys.exit(1)
    else:
        print(f"\n  ✅ 审计通过")
        sys.exit(0)


def cmd_supplement(args: argparse.Namespace) -> None:
    _print_banner()

    output_dir = args.output or os.path.join(os.getcwd(), "output")
    store_dir = os.path.join(output_dir, "versions")
    vm = VersionManager(store_dir)

    base_version = vm.load(args.base_version)
    if not base_version:
        print(f"❌ 找不到基础版本: {args.base_version}")
        sys.exit(1)

    supplemental_configs = ProbConfig.load(args.supplemental_config)
    print(f"\n📥 补充概率配置: {len(supplemental_configs)} 个卡池")
    for cfg in supplemental_configs:
        print(f"  {cfg.pool_name}({cfg.pool_id}) v{cfg.version}")

    rules = PityRule.load(args.pity_rules) if args.pity_rules else base_version.pity_rules
    logs = GachaLog.load(args.gacha_logs) if args.gacha_logs else GachaLog()

    validator = ProbValidator(supplemental_configs)
    new_prob_issues = validator.validate()

    tracker = PityTracker(logs, rules, supplemental_configs)
    new_pity_issues, new_snapshots = tracker.track()

    new_issues = new_prob_issues + new_pity_issues

    version = vm.create_supplemental(
        base_version_id=args.base_version,
        supplemental_configs=supplemental_configs,
        new_issues=new_issues,
        new_snapshots=new_snapshots,
        pity_rules=rules,
        filter_applied={},
    )

    exporter = ReportExporter(output_dir)
    json_path = exporter.export_json(version)
    html_path = exporter.export_html(version)

    comparison = vm.compare_with_base(version.version_id)

    print(f"\n{'='*60}")
    print("  补充版本审计结果")
    print(f"{'='*60}")
    print(f"  基础版本: {args.base_version}")
    print(f"  补充版本: {version.version_id}")

    if comparison:
        print(f"  新增卡池: {', '.join(comparison['new_pools']) or '无'}")
        print(f"  更新卡池: {', '.join(comparison['updated_pools']) or '无'}")
        print(f"  基础版本问题数: {comparison['base_issue_count']}")
        print(f"  补充后问题数: {comparison['current_issue_count']}")
        print(f"  新增问题分类: {comparison['new_issue_summary']}")

    if new_issues:
        print(f"\n  新增问题({len(new_issues)}):")
        _print_issues(new_issues, verbose=args.verbose)

    print(f"\n  JSON报告: {json_path}")
    print(f"  HTML报告: {html_path}")


def cmd_history(args: argparse.Namespace) -> None:
    _print_banner()

    output_dir = args.output or os.path.join(os.getcwd(), "output")
    store_dir = os.path.join(output_dir, "versions")
    vm = VersionManager(store_dir)

    versions = vm.list_versions()
    if not versions:
        print("  暂无审计历史")
        return

    print(f"\n  审计历史 ({len(versions)} 个版本):\n")
    print(f"  {'版本ID':<30} {'时间':<22} {'问题数':>4} {'补充于':<30}")
    print(f"  {'-'*30} {'-'*22} {'-'*4} {'-'*30}")
    for v in versions:
        supp = v.get("supplemental_for") or "-"
        print(f"  {v['version_id']:<30} {v['created_at']:<22} {v['issue_count']:>4} {supp:<30}")

    if args.export_history:
        full_versions = []
        for v in versions:
            loaded = vm.load(v["version_id"])
            if loaded:
                full_versions.append(loaded)
        exporter = ReportExporter(output_dir)
        path = exporter.export_version_history_html(full_versions)
        print(f"\n  历史回放报告: {path}")


def cmd_compare(args: argparse.Namespace) -> None:
    _print_banner()

    output_dir = args.output or os.path.join(os.getcwd(), "output")
    store_dir = os.path.join(output_dir, "versions")
    vm = VersionManager(store_dir)

    v1 = vm.load(args.version1)
    v2 = vm.load(args.version2)
    if not v1:
        print(f"❌ 找不到版本: {args.version1}")
        sys.exit(1)
    if not v2:
        print(f"❌ 找不到版本: {args.version2}")
        sys.exit(1)

    print(f"\n  版本对比:")
    print(f"    A: {v1.version_id} ({v1.created_at})")
    print(f"    B: {v2.version_id} ({v2.created_at})")

    pools_a = {c.pool_id: c.version for c in v1.prob_configs}
    pools_b = {c.pool_id: c.version for c in v2.prob_configs}

    new_pools = set(pools_b) - set(pools_a)
    removed_pools = set(pools_a) - set(pools_b)
    common_pools = set(pools_a) & set(pools_b)

    print(f"\n  新增卡池: {', '.join(new_pools) or '无'}")
    print(f"  移除卡池: {', '.join(removed_pools) or '无'}")

    if common_pools:
        print(f"\n  共同卡池版本变更:")
        for pid in sorted(common_pools):
            va = pools_a[pid]
            vb = pools_b[pid]
            changed = " ⚠️ 版本变更" if va != vb else ""
            print(f"    {pid}: v{va} → v{vb}{changed}")

    cats_a = {}
    for i in v1.issues:
        cats_a[i.category] = cats_a.get(i.category, 0) + 1
    cats_b = {}
    for i in v2.issues:
        cats_b[i.category] = cats_b.get(i.category, 0) + 1

    print(f"\n  问题分类对比:")
    all_cats = sorted(set(list(cats_a.keys()) + list(cats_b.keys())))
    for cat in all_cats:
        ca = cats_a.get(cat, 0)
        cb = cats_b.get(cat, 0)
        diff = cb - ca
        sign = "+" if diff > 0 else ""
        print(f"    {cat}: A={ca} B={cb} ({sign}{diff})")


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="gacha-audit",
        description="概率保底抽卡审计工具",
    )
    subparsers = parser.add_subparsers(dest="command")

    audit_parser = subparsers.add_parser("audit", help="执行完整审计")
    audit_parser.add_argument("--prob-config", required=True, help="概率配置文件路径")
    audit_parser.add_argument("--pity-rules", required=True, help="保底规则文件路径")
    audit_parser.add_argument("--gacha-logs", required=True, help="抽卡日志文件路径")
    audit_parser.add_argument("--pool-id", help="筛选: 卡池ID")
    audit_parser.add_argument("--player-id", help="筛选: 玩家ID")
    audit_parser.add_argument("--rarity", help="筛选: 稀有度")
    audit_parser.add_argument("--time-from", help="筛选: 起始时间")
    audit_parser.add_argument("--time-to", help="筛选: 结束时间")
    audit_parser.add_argument("--output", help="输出目录")
    audit_parser.add_argument("--verbose", action="store_true", help="显示详细信息")

    supp_parser = subparsers.add_parser("supplement", help="补充概率配置(增量版本)")
    supp_parser.add_argument("--base-version", required=True, help="基础审计版本ID")
    supp_parser.add_argument("--supplemental-config", required=True, help="补充概率配置文件路径")
    supp_parser.add_argument("--pity-rules", help="保底规则(缺省用基础版本的)")
    supp_parser.add_argument("--gacha-logs", help="抽卡日志(缺省不重跑保底追踪)")
    supp_parser.add_argument("--output", help="输出目录")
    supp_parser.add_argument("--verbose", action="store_true")

    hist_parser = subparsers.add_parser("history", help="查看审计历史")
    hist_parser.add_argument("--output", help="版本存储目录")
    hist_parser.add_argument("--export-history", action="store_true", help="导出历史回放HTML")

    cmp_parser = subparsers.add_parser("compare", help="对比两个审计版本")
    cmp_parser.add_argument("version1", help="版本A")
    cmp_parser.add_argument("version2", help="版本B")
    cmp_parser.add_argument("--output", help="版本存储目录")

    args = parser.parse_args()
    if args.command == "audit":
        cmd_audit(args)
    elif args.command == "supplement":
        cmd_supplement(args)
    elif args.command == "history":
        cmd_history(args)
    elif args.command == "compare":
        cmd_compare(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
