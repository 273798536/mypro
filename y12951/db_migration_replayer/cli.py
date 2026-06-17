"""数据库迁移回放器 - CLI 入口。"""
import argparse
import sys
import os

from .config import Config, set_config, get_config
from .metadb import init_db

from .snapshot import collect_snapshot, list_snapshots, load_snapshot, compare_snapshots, compare_side_by_side
from .migration import MigrationExecutor, MigrationHistory
from .analysis import SlowQueryAnalyzer, LockWaitAnalyzer
from .audit import AuditLogger
from .report import ReportGenerator


def _add_common_args(parser: argparse.ArgumentParser):
    """添加通用参数。"""
    parser.add_argument("-i", "--input-dir", default="./input", help="输入目录（迁移脚本目录）")
    parser.add_argument("-o", "--output-dir", default="./output", help="输出目录（快照、报告等）")
    parser.add_argument("--meta-db", default=None, help="元数据库路径（默认在 output 下）")
    parser.add_argument("-u", "--operator", default="cli_user", help="操作人标识")
    parser.add_argument("-v", "--verbose", action="store_true", help="详细输出")


def _apply_common_args(args):
    """应用通用参数到全局配置。"""
    meta_db = args.meta_db or os.path.join(args.output_dir, "replayer.db")
    cfg = Config(
        input_dir=args.input_dir,
        output_dir=args.output_dir,
        db_path=meta_db,
        operator=args.operator,
        verbose=args.verbose,
    )
    cfg.ensure_dirs()
    set_config(cfg)
    init_db()
    return cfg


def cmd_migrate(args):
    """执行迁移命令。"""
    cfg = _apply_common_args(args)

    if not args.target_db:
        print("错误: 必须指定 --target-db 目标数据库路径")
        sys.exit(1)

    executor = MigrationExecutor(args.target_db, cfg.input_dir)
    results = executor.execute_batch(args.batch_id)

    print(f"批次 {executor.batch_id} 执行结果:")
    print("-" * 60)
    success = 0
    failed = 0
    skipped = 0
    for r in results:
        status_icon = {"success": "✓", "failed": "✗", "skipped": "⊘"}.get(r.status, "?")
        line = f"  {status_icon} {r.migration_name}: {r.status}"
        if r.duration_ms:
            line += f" ({r.duration_ms}ms)"
        if r.error_message:
            line += f"\n    错误: {r.error_message}"
        if r.skipped_reason:
            line += f" ({r.skipped_reason})"
        print(line)
        if r.status == "success":
            success += 1
        elif r.status == "failed":
            failed += 1
        elif r.status == "skipped":
            skipped += 1

    print("-" * 60)
    print(f"共 {len(results)} 个: 成功 {success}, 失败 {failed}, 跳过 {skipped}")

    if args.snapshot_after:
        _do_snapshot_after_migration(args, results)


def _do_snapshot_after_migration(args, results):
    """迁移后自动采集快照。"""
    cfg = get_config()
    snap = collect_snapshot(
        args.target_db,
        args.snapshot_name or "after_migration",
        args.snapshot_version or "1",
        cfg.operator,
        f"批次 {results[0].migration_name if results else 'unknown'} 迁移后快照",
    )
    from .snapshot.storage import save_snapshot
    path = save_snapshot(snap)
    print(f"\n快照已保存: {path}")


def cmd_snapshot(args):
    """快照管理命令。"""
    _apply_common_args(args)

    if args.action == "collect":
        if not args.target_db:
            print("错误: 采集快照必须指定 --target-db")
            sys.exit(1)
        snap = collect_snapshot(
            args.target_db,
            args.name,
            args.version,
            get_config().operator,
            args.description or "",
        )
        from .snapshot.storage import save_snapshot
        path = save_snapshot(snap)
        print(f"快照已保存: {path}")
        print(f"  名称: {snap.name}")
        print(f"  版本: {snap.version}")
        print(f"  表数量: {len(snap.tables)}")

    elif args.action == "list":
        snaps = list_snapshots(args.name)
        if not snaps:
            print("没有找到快照。")
            return
        print(f"共找到 {len(snaps)} 个快照:")
        for s in snaps:
            print(f"  {s['name']} v{s['version']} - {s['created_at']} by {s['created_by']}")

    elif args.action == "diff":
        from .snapshot.storage import load_snapshot
        old = load_snapshot(args.name, args.old_version)
        new = load_snapshot(args.name, args.new_version)
        if not old or not new:
            print("错误: 找不到指定的快照版本")
            sys.exit(1)
        diff = compare_snapshots(old, new)
        if args.side_by_side:
            print(compare_side_by_side(old, new, diff))
        else:
            print(f"变更概要: {diff.change_summary}")
            if diff.tables_added:
                print(f"新增表: {', '.join(diff.tables_added)}")
            if diff.tables_removed:
                print(f"删除表: {', '.join(diff.tables_removed)}")
            for td in diff.tables_modified:
                print(f"修改表: {td.table}")
                for cd in td.columns:
                    print(f"  列 {cd.column}: {cd.change_type}")
                for idx in td.indexes:
                    print(f"  索引 {idx.index}: {idx.change_type}")

    elif args.action == "report":
        gen = ReportGenerator()
        path = gen.generate_snapshot_report(
            args.name, args.old_version, args.new_version, args.format
        )
        print(f"报告已生成: {path}")


def cmd_status(args):
    """迁移状态命令。"""
    _apply_common_args(args)

    history = MigrationHistory()

    if args.action == "list":
        statuses = history.list_all_status()
        if not statuses:
            print("暂无迁移状态记录。")
            return
        print(f"迁移状态（共 {len(statuses)} 个）:")
        print("-" * 80)
        for s in statuses:
            line = f"  {s['migration_name']}: {s['current_status']}"
            if s["slow_query_cause"]:
                line += f" | 慢查询: {s['slow_query_cause']}"
            if s["page_order_unstable"]:
                line += " | 分页顺序: 不稳定(已复核)"
            print(line)

    elif args.action == "batches":
        batches = history.list_batches()
        if not batches:
            print("暂无批次记录。")
            return
        print(f"批次列表（共 {len(batches)} 个）:")
        for b in batches:
            print(
                f"  {b['batch_id']}: {b['total_count']}个 "
                f"(成{b['success_count']} 败{b['failed_count']} 跳{b['skipped_count']}) "
                f"- {b['started_at']}"
            )

    elif args.action == "runs":
        runs = history.list_runs(
            migration_name=args.migration, batch_id=args.batch, limit=args.limit
        )
        if not runs:
            print("暂无执行记录。")
            return
        for r in runs:
            print(
                f"  #{r['id']} {r['migration_name']} [{r['status']}] "
                f"批次:{r['batch_id']} - {r['started_at']}"
            )

    elif args.action == "report":
        gen = ReportGenerator()
        path = gen.generate_migration_status_report(args.format)
        print(f"状态报告已生成: {path}")


def cmd_slow_query(args):
    """慢查询归因命令。"""
    _apply_common_args(args)
    analyzer = SlowQueryAnalyzer()

    if args.action == "set":
        result = analyzer.set_cause(args.migration, args.cause, args.reason or "")
        if result["changed"]:
            print(f"慢查询归因已更新:")
            print(f"  旧值: {result['old_cause'] or '(空)'}")
            print(f"  新值: {result['new_cause']}")
            print(f"  修改人: {result['changed_by']}")
            print(f"  修改时间: {result['changed_at']}")
        else:
            print(f"慢查询归因未变化: {result['new_cause']}")

    elif args.action == "get":
        info = analyzer.get_status_diff(args.migration)
        if not info:
            print(f"未找到迁移 {args.migration} 的记录。")
            return
        print(f"迁移: {info['migration_name']}")
        print(f"  当前状态: {info['current_status']}")
        print(f"  慢查询归因: {info['slow_query_cause'] or '(未设置)'}")
        if info["cause_changed"]:
            print(f"  此前归因: {info['previous_slow_query_cause']}")
            print(f"  修改于: {info['slow_query_cause_changed_at']}")
            print(f"  修改人: {info['slow_query_cause_changed_by']}")

    elif args.action == "list":
        items = analyzer.list_all_with_diff()
        if not items:
            print("暂无记录。")
            return
        for item in items:
            cause = item["slow_query_cause"] or "-"
            changed = " (已变更)" if item["cause_changed"] else ""
            print(f"  {item['migration_name']}: {cause}{changed}")


def cmd_page_order(args):
    """分页顺序复核命令。"""
    _apply_common_args(args)
    logger = AuditLogger()

    if args.action == "review":
        result = logger.review_page_order(
            args.migration, args.approved, args.reason or ""
        )
        status = "通过" if result["approved"] else "驳回"
        print(f"分页顺序复核 {status}:")
        print(f"  迁移: {result['migration_name']}")
        print(f"  复核人: {result['reviewed_by']}")
        print(f"  复核时间: {result['reviewed_at']}")
        if result["reason"]:
            print(f"  原因: {result['reason']}")

    elif args.action == "history":
        logs = logger.get_page_order_review_history(args.migration)
        if not logs:
            print(f"迁移 {args.migration} 暂无复核记录。")
            return
        print(f"迁移 {args.migration} 分页顺序复核历史:")
        for log in logs:
            print(
                f"  {log['created_at']} - {log['operator']} "
                f"{log['old_value']} → {log['new_value']} "
                f"(原因: {log['reason'] or '未填'})"
            )


def cmd_lock_wait(args):
    """锁等待事件命令。"""
    _apply_common_args(args)
    analyzer = LockWaitAnalyzer()

    if args.action == "scenarios":
        scenarios = analyzer.get_scenarios()
        print(f"常见锁等待边界场景（共 {len(scenarios)} 个，每个都会改变结果）:")
        print("=" * 70)
        for i, s in enumerate(scenarios, 1):
            print(f"\n[{i}] {s.name} (严重度: {s.severity})")
            print(f"    描述: {s.description}")
            print(f"    表: {s.table_name}, 等待: {s.wait_seconds}s")
            print(f"    对迁移结果的影响:")
            print(f"      {s.migration_impact}")

    elif args.action == "add":
        event_id = analyzer.add_event(
            args.migration, args.table, args.wait_seconds, args.severity, args.description or ""
        )
        print(f"锁等待事件已记录 (ID: {event_id})")

    elif args.action == "list":
        events = analyzer.list_events(
            migration_name=args.migration, severity=args.severity, limit=args.limit
        )
        if not events:
            print("暂无锁等待事件。")
            return
        for e in events:
            print(
                f"  #{e['id']} {e['migration_name']} @ {e['table_name']} "
                f"[{e['severity']}] {e['wait_seconds']}s - {e['detected_at']}"
            )

    elif args.action == "impact":
        impact = analyzer.assess_migration_impact(args.migration)
        print(f"迁移 {args.migration} 锁等待影响评估:")
        print(f"  是否存在锁等待: {impact['has_lock_wait']}")
        if impact["has_lock_wait"]:
            print(f"  事件数: {impact['event_count']}")
            print(f"  总等待时间: {impact['total_wait_seconds']}s")
            print(f"  最高严重级: {impact['max_severity']}")
            print(f"  影响等级: {impact['impact_level']}")
            print(f"  建议: {impact['recommendation']}")


def cmd_audit(args):
    """审计日志命令。"""
    _apply_common_args(args)
    logger = AuditLogger()

    logs = logger.list(
        entity_type=args.entity_type, entity_id=args.entity_id, action=args.action, limit=args.limit
    )
    if not logs:
        print("暂无审计记录。")
        return
    print(f"审计日志（共 {len(logs)} 条）:")
    print("-" * 80)
    for log in logs:
        print(
            f"[{log['created_at']}] {log['operator']} "
            f"{log['action']} on {log['entity_type']}:{log['entity_id']}"
        )
        if log["old_value"] or log["new_value"]:
            print(f"    {log['old_value']} → {log['new_value']}")
        if log["reason"]:
            print(f"    原因: {log['reason']}")


def cmd_report(args):
    """报告命令。"""
    _apply_common_args(args)
    gen = ReportGenerator()

    if args.type == "snapshot":
        path = gen.generate_snapshot_report(
            args.name, args.old_version, args.new_version, args.format
        )
    elif args.type == "status":
        path = gen.generate_migration_status_report(args.format)
    else:
        print(f"未知报告类型: {args.type}")
        sys.exit(1)

    print(f"报告已生成: {path}")


def cmd_demo(args):
    """一键演示：跑完整的示例流程。"""
    import os
    import shutil
    import tempfile

    tmpdir = tempfile.mkdtemp(prefix="db_replayer_demo_")
    print(f"演示目录: {tmpdir}")
    print("=" * 70)

    input_dir = os.path.join(tmpdir, "input")
    output_dir = os.path.join(tmpdir, "output")
    target_db = os.path.join(tmpdir, "target.db")
    sample_dir = os.path.join(os.path.dirname(__file__), "samples", "migrations")

    shutil.copytree(sample_dir, input_dir)

    cfg = Config(
        input_dir=input_dir,
        output_dir=output_dir,
        operator="demo_user",
    )
    cfg.ensure_dirs()
    set_config(cfg)
    init_db()

    print("\n[1/7] 采集迁移前快照...")
    pre_snap = collect_snapshot(target_db, "demo_schema", "v1_pre", "demo_user", "迁移前快照")
    from .snapshot.storage import save_snapshot
    save_snapshot(pre_snap)
    print(f"  迁移前快照: 共 {len(pre_snap.tables)} 张表")

    print("\n[2/7] 执行第一批迁移 (001-003)...")
    batch1_dir = os.path.join(tmpdir, "batch1")
    os.makedirs(batch1_dir)
    for f in ["001_create_users.sql", "002_create_orders.sql", "003_create_order_items.sql"]:
        shutil.copy(os.path.join(input_dir, f), batch1_dir)
    exec1 = MigrationExecutor(target_db, batch1_dir)
    results1 = exec1.execute_batch("batch_demo_1")
    for r in results1:
        icon = {"success": "✓", "failed": "✗", "skipped": "⊘"}.get(r.status, "?")
        print(f"  {icon} {r.migration_name}: {r.status}")

    print("\n[3/7] 采集迁移后快照 v2...")
    mid_snap = collect_snapshot(target_db, "demo_schema", "v2_mid", "demo_user", "第一批迁移后")
    save_snapshot(mid_snap)
    print(f"  v2 快照: 共 {len(mid_snap.tables)} 张表")

    print("\n[4/7] 执行第二批迁移 (004-006)，包含坏数据...")
    batch2_dir = os.path.join(tmpdir, "batch2")
    os.makedirs(batch2_dir)
    for f in [
        "004_add_user_profile.sql",
        "005_add_order_payment.sql",
        "006_seed_sample_data.sql",
    ]:
        shutil.copy(os.path.join(input_dir, f), batch2_dir)
    exec2 = MigrationExecutor(target_db, batch2_dir)
    results2 = exec2.execute_batch("batch_demo_2")
    for r in results2:
        icon = {"success": "✓", "failed": "✗", "skipped": "⊘"}.get(r.status, "?")
        print(f"  {icon} {r.migration_name}: {r.status}")

    print("\n[5/7] 重跑同一批（验证幂等性，应该全部跳过）...")
    results2b = exec2.execute_batch("batch_demo_2")
    skipped_all = all(r.status == "skipped" for r in results2b)
    print(f"  幂等性验证: {'通过 ✓' if skipped_all else '失败 ✗'}")
    for r in results2b:
        print(f"    {r.migration_name}: {r.status}")

    print("\n[6/7] 采集最终快照并生成并排对比报告...")
    final_snap = collect_snapshot(target_db, "demo_schema", "v3_final", "demo_user", "全部迁移后")
    save_snapshot(final_snap)
    print(f"  v3 快照: 共 {len(final_snap.tables)} 张表")

    gen = ReportGenerator()
    report_path = gen.generate_snapshot_report("demo_schema", "v1_pre", "v3_final", "text")
    print(f"  并排对比报告: {report_path}")

    print("\n[7/7] 模拟场景：慢查询归因变更 + 锁等待事件 + 分页复核...")
    analyzer = SlowQueryAnalyzer()
    analyzer.set_cause("005_add_order_payment", "缺少索引", "初判")
    result = analyzer.set_cause("005_add_order_payment", "元数据锁等待", "经DBA复核，实为并发查询导致元数据锁排队")
    print(f"  慢查询归因变更: {result['old_cause']} → {result['new_cause']}")

    lock_analyzer = LockWaitAnalyzer()
    lock_analyzer.add_event("005_add_order_payment", "orders", 15.2, "medium", "元数据锁排队")
    impact = lock_analyzer.assess_migration_impact("005_add_order_payment")
    print(f"  锁等待影响: {impact['impact_level']} - {impact['recommendation']}")

    auditor = AuditLogger()
    auditor.review_page_order(
        "003_create_order_items",
        True,
        "未设置排序字段时分页顺序不稳定，已确认属于预期行为，无需修复",
    )
    print(f"  分页顺序复核: 已记录")

    status_report = gen.generate_migration_status_report("text")
    print(f"  完整状态报告: {status_report}")

    print("\n" + "=" * 70)
    print("演示完成！以下是关键文件路径：")
    print(f"  目标数据库: {target_db}")
    print(f"  元数据库: {cfg.db_path}")
    print(f"  快照并排对比: {report_path}")
    print(f"  迁移状态总览: {status_report}")
    print("")
    print("你可以用以下命令继续探索：")
    print(f"  python -m db_migration_replayer status list -o {output_dir}")
    print(f"  python -m db_migration_replayer audit list -o {output_dir}")
    print(f"  python -m db_migration_replayer lock-wait scenarios -o {output_dir}")


def main():
    """主入口。"""
    parser = argparse.ArgumentParser(
        prog="db-migration-replayer",
        description="数据库迁移回放器 - 表结构快照比对 / 幂等迁移执行 / 审计追踪",
    )
    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    # migrate
    p_mig = subparsers.add_parser("migrate", help="执行迁移")
    _add_common_args(p_mig)
    p_mig.add_argument("--target-db", required=True, help="目标数据库路径")
    p_mig.add_argument("--batch-id", default=None, help="批次ID（不传则自动生成）")
    p_mig.add_argument("--snapshot-after", action="store_true", help="迁移后自动采集快照")
    p_mig.add_argument("--snapshot-name", default=None, help="快照名称")
    p_mig.add_argument("--snapshot-version", default="1", help="快照版本")
    p_mig.set_defaults(func=cmd_migrate)

    # snapshot
    p_snap = subparsers.add_parser("snapshot", help="快照管理")
    _add_common_args(p_snap)
    snap_sub = p_snap.add_subparsers(dest="action", required=True)

    p_collect = snap_sub.add_parser("collect", help="采集快照")
    p_collect.add_argument("--target-db", required=True, help="目标数据库路径")
    p_collect.add_argument("--name", required=True, help="快照名称")
    p_collect.add_argument("--version", required=True, help="快照版本")
    p_collect.add_argument("--description", default="", help="描述")

    p_list = snap_sub.add_parser("list", help="列出快照")
    p_list.add_argument("--name", default=None, help="按名称过滤")

    p_diff = snap_sub.add_parser("diff", help="对比两个版本")
    p_diff.add_argument("--name", required=True, help="快照名称")
    p_diff.add_argument("--old-version", required=True, help="旧版本")
    p_diff.add_argument("--new-version", required=True, help="新版本")
    p_diff.add_argument("--side-by-side", action="store_true", help="并排显示详情")

    p_report = snap_sub.add_parser("report", help="生成快照对比报告")
    p_report.add_argument("--name", required=True, help="快照名称")
    p_report.add_argument("--old-version", required=True, help="旧版本")
    p_report.add_argument("--new-version", required=True, help="新版本")
    p_report.add_argument("--format", default="text", choices=["text", "markdown"])

    p_snap.set_defaults(func=cmd_snapshot)

    # status
    p_status = subparsers.add_parser("status", help="迁移状态")
    _add_common_args(p_status)
    status_sub = p_status.add_subparsers(dest="action", required=True)

    s_list = status_sub.add_parser("list", help="列出所有迁移状态")
    s_batches = status_sub.add_parser("batches", help="列出批次")
    s_runs = status_sub.add_parser("runs", help="列出执行记录")
    s_runs.add_argument("--migration", default=None, help="迁移名称过滤")
    s_runs.add_argument("--batch", default=None, help="批次过滤")
    s_runs.add_argument("--limit", type=int, default=20, help="数量限制")

    s_report = status_sub.add_parser("report", help="生成状态报告")
    s_report.add_argument("--format", default="text", choices=["text", "markdown"])

    p_status.set_defaults(func=cmd_status)

    # slow-query
    p_sq = subparsers.add_parser("slow-query", help="慢查询归因管理")
    _add_common_args(p_sq)
    sq_sub = p_sq.add_subparsers(dest="action", required=True)

    sq_set = sq_sub.add_parser("set", help="设置归因")
    sq_set.add_argument("--migration", required=True, help="迁移名称")
    sq_set.add_argument("--cause", required=True, help="归因原因")
    sq_set.add_argument("--reason", default="", help="修改原因")

    sq_get = sq_sub.add_parser("get", help="查看归因")
    sq_get.add_argument("--migration", required=True, help="迁移名称")

    sq_list = sq_sub.add_parser("list", help="列出所有")

    p_sq.set_defaults(func=cmd_slow_query)

    # page-order
    p_po = subparsers.add_parser("page-order", help="分页顺序复核")
    _add_common_args(p_po)
    po_sub = p_po.add_subparsers(dest="action", required=True)

    po_review = po_sub.add_parser("review", help="复核")
    po_review.add_argument("--migration", required=True, help="迁移名称")
    po_review.add_argument("--approved", type=lambda x: x.lower() == "true", required=True, help="是否通过: true/false")
    po_review.add_argument("--reason", default="", help="原因")

    po_hist = po_sub.add_parser("history", help="查看历史")
    po_hist.add_argument("--migration", required=True, help="迁移名称")

    p_po.set_defaults(func=cmd_page_order)

    # lock-wait
    p_lw = subparsers.add_parser("lock-wait", help="锁等待事件")
    _add_common_args(p_lw)
    lw_sub = p_lw.add_subparsers(dest="action", required=True)

    lw_sc = lw_sub.add_parser("scenarios", help="查看常见边界场景")

    lw_add = lw_sub.add_parser("add", help="记录事件")
    lw_add.add_argument("--migration", required=True, help="迁移名称")
    lw_add.add_argument("--table", required=True, help="表名")
    lw_add.add_argument("--wait-seconds", type=float, required=True, help="等待秒数")
    lw_add.add_argument("--severity", default="medium", choices=["low", "medium", "high", "critical"])
    lw_add.add_argument("--description", default="", help="描述")

    lw_list = lw_sub.add_parser("list", help="列出事件")
    lw_list.add_argument("--migration", default=None, help="迁移过滤")
    lw_list.add_argument("--severity", default=None, help="严重度过滤")
    lw_list.add_argument("--limit", type=int, default=20, help="数量限制")

    lw_impact = lw_sub.add_parser("impact", help="评估影响")
    lw_impact.add_argument("--migration", required=True, help="迁移名称")

    p_lw.set_defaults(func=cmd_lock_wait)

    # audit
    p_audit = subparsers.add_parser("audit", help="审计日志")
    _add_common_args(p_audit)
    p_audit.add_argument("--entity-type", default=None, help="实体类型过滤")
    p_audit.add_argument("--entity-id", default=None, help="实体ID过滤")
    p_audit.add_argument("--action", default=None, help="动作过滤")
    p_audit.add_argument("--limit", type=int, default=50, help="数量限制")
    p_audit.set_defaults(func=cmd_audit)

    # report
    p_rep = subparsers.add_parser("report", help="生成报告")
    _add_common_args(p_rep)
    rep_sub = p_rep.add_subparsers(dest="type", required=True)

    rep_snap = rep_sub.add_parser("snapshot", help="快照对比报告")
    rep_snap.add_argument("--name", required=True, help="快照名称")
    rep_snap.add_argument("--old-version", required=True, help="旧版本")
    rep_snap.add_argument("--new-version", required=True, help="新版本")
    rep_snap.add_argument("--format", default="text", choices=["text", "markdown"])

    rep_status = rep_sub.add_parser("status", help="迁移状态报告")
    rep_status.add_argument("--format", default="text", choices=["text", "markdown"])

    p_rep.set_defaults(func=cmd_report)

    # demo
    p_demo = subparsers.add_parser("demo", help="一键演示完整流程")
    _add_common_args(p_demo)
    p_demo.set_defaults(func=cmd_demo)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(0)

    args.func(args)


if __name__ == "__main__":
    main()
