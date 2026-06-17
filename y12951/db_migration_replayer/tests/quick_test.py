"""快速验证脚本 - 测试核心功能。"""
import os
import sys
import tempfile
import shutil

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db_migration_replayer.config import Config, set_config
from db_migration_replayer.metadb import init_db
from db_migration_replayer.snapshot import collect_snapshot, save_snapshot, load_snapshot, compare_snapshots
from db_migration_replayer.migration import MigrationExecutor
from db_migration_replayer.analysis import SlowQueryAnalyzer, LockWaitAnalyzer
from db_migration_replayer.audit import AuditLogger
from db_migration_replayer.report import ReportGenerator


def main():
    tmpdir = tempfile.mkdtemp(prefix="test_")
    print(f"测试目录: {tmpdir}")

    input_dir = os.path.join(tmpdir, "input")
    output_dir = os.path.join(tmpdir, "output")
    target_db = os.path.join(tmpdir, "target.db")
    sample_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "samples", "migrations"
    )

    shutil.copytree(sample_dir, input_dir)

    cfg = Config(input_dir=input_dir, output_dir=output_dir, operator="tester")
    cfg.ensure_dirs()
    set_config(cfg)
    init_db()

    print("\n[1] 测试快照采集...")
    snap1 = collect_snapshot(target_db, "test_schema", "v1", "tester", "初始")
    save_snapshot(snap1)
    print(f"  ✓ v1 快照: {len(snap1.tables)} 张表")

    print("\n[2] 测试迁移执行...")
    executor = MigrationExecutor(target_db, input_dir)
    results = executor.execute_batch("batch_001")
    success = sum(1 for r in results if r.status == "success")
    print(f"  ✓ 执行 {len(results)} 个迁移，成功 {success} 个")

    print("\n[3] 测试幂等性（重跑同批次）...")
    results2 = executor.execute_batch("batch_001")
    skipped = sum(1 for r in results2 if r.status == "skipped")
    print(f"  ✓ 重跑，跳过 {skipped} 个（共 {len(results2)} 个）")
    assert skipped == len(results2), "幂等性验证失败！"

    print("\n[4] 测试迁移后快照...")
    snap2 = collect_snapshot(target_db, "test_schema", "v2", "tester", "迁移后")
    save_snapshot(snap2)
    print(f"  ✓ v2 快照: {len(snap2.tables)} 张表")

    print("\n[5] 测试快照对比...")
    diff = compare_snapshots(snap1, snap2)
    print(f"  ✓ 变更: {diff.change_summary}")
    assert diff.has_changes, "应该有变更！"

    print("\n[6] 测试慢查询归因...")
    sq = SlowQueryAnalyzer()
    r1 = sq.set_cause("005_add_order_payment", "缺少索引", "初判")
    r2 = sq.set_cause("005_add_order_payment", "元数据锁等待", "经复核")
    print(f"  ✓ 归因变更: {r2['old_cause']} → {r2['new_cause']}")
    assert r2["changed"], "应该有变更！"

    print("\n[7] 测试锁等待...")
    lw = LockWaitAnalyzer()
    lw.add_event("005_add_order_payment", "orders", 15.2, "medium", "测试")
    impact = lw.assess_migration_impact("005_add_order_payment")
    print(f"  ✓ 影响等级: {impact['impact_level']}")
    scenarios = lw.get_scenarios()
    print(f"  ✓ 边界场景数: {len(scenarios)} 个")
    assert len(scenarios) >= 3, "至少要有 3 个边界场景"

    print("\n[8] 测试分页复核...")
    al = AuditLogger()
    r = al.review_page_order(
        "003_create_order_items", True, "未排序分页顺序不稳定，属预期行为"
    )
    print(f"  ✓ 复核人: {r['reviewed_by']}, 批准: {r['approved']}")
    hist = al.get_page_order_review_history("003_create_order_items")
    print(f"  ✓ 历史记录: {len(hist)} 条")
    assert len(hist) >= 1, "应该有历史记录！"

    print("\n[9] 测试报告生成...")
    gen = ReportGenerator()
    report = gen.generate_snapshot_report("test_schema", "v1", "v2", "text")
    print(f"  ✓ 快照报告: {report}")
    status_report = gen.generate_migration_status_report("text")
    print(f"  ✓ 状态报告: {status_report}")

    print("\n" + "=" * 50)
    print("✅ 所有测试通过！")
    print(f"测试目录: {tmpdir}")
    print("=" * 50)


if __name__ == "__main__":
    main()
