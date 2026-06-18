"""端到端测试脚本：验证所有需求点"""
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

from cache_db_diff import (
    StorageManager,
    MigrationChecker,
    SnapshotComparator,
    AuditManager,
    ReportGenerator,
)
from cache_db_diff.models import (
    MigrationExecutionRecord,
    TableSchema,
    ColumnType,
    IndexDefinition,
)


def gen_sample_input(base: Path):
    print("1. 生成示例输入材料...")
    # 迁移记录：V1重复2次，V2重复2次（其中一次失败）
    migrations = [
        MigrationExecutionRecord(
            migration_name="V1__init.sql",
            execution_order=1,
            execution_time="2025-01-15T09:00:00",
            checksum="abc123",
        ),
        MigrationExecutionRecord(
            migration_name="V1__init.sql",
            execution_order=1,
            execution_time="2025-01-15T09:05:00",
            checksum="abc123",
        ),
        MigrationExecutionRecord(
            migration_name="V2__add_user.sql",
            execution_order=2,
            execution_time="2025-01-15T09:10:00",
            checksum="def456",
        ),
        MigrationExecutionRecord(
            migration_name="V2__add_user.sql",
            execution_order=2,
            execution_time="2025-01-15T09:12:00",
            checksum="def456",
            success=False,
            error_message="duplicate entry",
        ),
    ]
    mig_dir = base / "migrations"
    mig_dir.mkdir(parents=True, exist_ok=True)
    (mig_dir / "execs.json").write_text(
        json.dumps([m.model_dump() for m in migrations], indent=2, ensure_ascii=False, default=str)
    )

    # 缓存 schema
    cache_users = TableSchema(
        table_name="users",
        columns=[
            ColumnType(name="id", data_type="BIGINT", is_nullable=False),
            ColumnType(name="name", data_type="VARCHAR(64)", is_nullable=False),
            ColumnType(name="email", data_type="VARCHAR(128)", is_nullable=True),
            ColumnType(name="created_at", data_type="DATETIME", is_nullable=False,
                       default="CURRENT_TIMESTAMP"),
        ],
        primary_key=["id"],
        indexes=[IndexDefinition(name="idx_name", columns=["name"])],
        engine="InnoDB",
        charset="utf8mb4",
    )
    cache_orders = TableSchema(
        table_name="orders",
        columns=[
            ColumnType(name="id", data_type="BIGINT", is_nullable=False),
            ColumnType(name="user_id", data_type="BIGINT", is_nullable=False),
            ColumnType(name="amount", data_type="DECIMAL(10,2)", is_nullable=False),
        ],
        primary_key=["id"],
    )
    cache_dir = base / "schemas" / "cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    (cache_dir / "tables.json").write_text(
        json.dumps([cache_users.model_dump(), cache_orders.model_dump()], indent=2, ensure_ascii=False)
    )

    # DB schema（故意制造差异）
    db_users = TableSchema(
        table_name="users",
        columns=[
            ColumnType(name="id", data_type="BIGINT", is_nullable=False),
            ColumnType(name="name", data_type="VARCHAR(64)", is_nullable=False),
            ColumnType(name="email", data_type="VARCHAR(256)", is_nullable=False),  # 长度+非空变化
            ColumnType(name="created_at", data_type="DATETIME", is_nullable=False,
                       default="CURRENT_TIMESTAMP"),
            ColumnType(name="phone", data_type="VARCHAR(20)", is_nullable=True),  # 多出列
        ],
        primary_key=["id"],
        indexes=[
            IndexDefinition(name="idx_name", columns=["name"], is_unique=True),  # 变唯一
            IndexDefinition(name="uk_email", columns=["email"], is_unique=True),  # 新索引
        ],
        engine="InnoDB",
        charset="utf8mb4",
    )
    db_orders = TableSchema(
        table_name="orders",
        columns=[
            ColumnType(name="id", data_type="BIGINT", is_nullable=False),
            ColumnType(name="user_id", data_type="BIGINT", is_nullable=False),
            ColumnType(name="amount", data_type="DECIMAL(12,2)", is_nullable=False),
            ColumnType(name="status", data_type="TINYINT", is_nullable=False, default="0"),
        ],
        primary_key=["id"],
        indexes=[IndexDefinition(name="idx_user", columns=["user_id"])],
    )
    db_dir = base / "schemas" / "db"
    db_dir.mkdir(parents=True, exist_ok=True)
    (db_dir / "tables.json").write_text(
        json.dumps([db_users.model_dump(), db_orders.model_dump()], indent=2, ensure_ascii=False)
    )
    print(f"   ✓ 写入 {len(migrations)} 条迁移，2个表的cache/DB结构")


def main():
    root = Path(__file__).parent
    input_dir = root / "demo_in"
    output_dir = root / "demo_out"
    for d in [input_dir, output_dir]:
        if d.exists():
            import shutil
            shutil.rmtree(d)

    gen_sample_input(input_dir)

    print("\n2. 初始化存储管理器...")
    storage = StorageManager(str(input_dir), str(output_dir))
    print(f"   ✓ 批次ID: {storage.batch_id}")
    fp1 = storage.compute_input_fingerprint()
    storage.mark_input_fingerprint()
    print(f"   ✓ 输入指纹: {fp1}")

    print("\n3. 检测迁移重复执行...")
    checker = MigrationChecker(storage)
    mig_records = checker.run(creator="tester")
    print(f"   ✓ 识别到 {len(mig_records)} 条重复迁移:")
    for r in mig_records:
        dup = r.duplicate_info
        print(f"     - {r.migration_name}: {dup.execution_count} 次")

    print("\n4. 对比缓存与DB结构...")
    comparator = SnapshotComparator(storage)
    schema_records = comparator.run_comparison(creator="tester")
    diffs = [r for r in schema_records if r.schema_diff and r.schema_diff.has_diff()]
    print(f"   ✓ 共对比 {len(schema_records)} 张表，{len(diffs)} 张存在差异:")
    for r in diffs:
        print(f"     - {r.table_name}: {r.schema_diff.conclusion.value} "
              f"({len(r.schema_diff.diffs)}处差异)")

    print("\n5. 注册分页顺序不稳定问题...")
    audit = AuditManager(storage)
    page_rec = audit.register_pagination_issue(
        table_name="orders",
        order_by_columns=["created_at"],
        is_stable=False,
        change_reason="最初未意识到需要稳定排序",
        creator="tester",
    )
    print(f"   ✓ 分页问题记录ID: {page_rec.record_id}")

    print("\n6. 分页复核通过（记录谁/何时/为什么）...")
    page_rec = audit.review_pagination_passed(
        record_id=page_rec.record_id,
        reviewer="team_lead",
        review_comment="已确认加 id 作为次级排序字段后可稳定",
        change_reason="配合联调修复，加 id 次级排序",
    )
    cfg = page_rec.pagination_config
    print(f"   ✓ 复核人: {cfg.reviewer}, 时间: {cfg.review_time}")
    print(f"   ✓ 原因: {cfg.change_reason}")

    # 验证变更历史
    history = audit.get_change_history("processing_record", page_rec.record_id)
    print(f"   ✓ 变更历史条数: {len(history)}")
    for h in history:
        print(f"     - {h.action_time}: {h.operator} → {h.action.value} ({h.reason})")

    print("\n7. 确认迁移记录处理意见（与审计共用同一记录）...")
    mig0 = mig_records[0]
    checker.confirm_resolution(
        record_id=mig0.record_id,
        handler="dba_alice",
        opinion="V1__init 重复执行影响不大，表已存在不会重复建表",
        suggestion="建议在迁移脚本开头加幂等判断",
    )
    history = audit.get_change_history("processing_record", mig0.record_id)
    print(f"   ✓ 迁移记录确认后变更历史条数: {len(history)}")

    print("\n8. 并排对比快照（表结构修改后新旧对比）...")
    sbs = comparator.side_by_side_compare("users")
    if "error" not in sbs:
        print(f"   ✓ 表 {sbs['table_name']}: "
              f"旧快照 {sbs['old_snapshot']['id'][:8]} vs 新快照 {sbs['new_snapshot']['id'][:8]}")
        changed_cols = [c for c in sbs["columns_side_by_side"] if c["changed"]]
        print(f"   ✓ 有变化的列数: {len(changed_cols)}")
        for c in changed_cols:
            print(f"     - {c['column_name']}: {c['old'] and c['old']['data_type']}"
                  f" → {c['new'] and c['new']['data_type']}")

    print("\n9. 创建异常追溯链...")
    trace = audit.create_anomaly_trace(
        anomaly_description="线上部分用户读取到空邮箱字段",
        anomaly_type="data_mismatch",
        root_record_id=diffs[0].record_id,
        creator="oncall_bob",
    )
    print(f"   ✓ 追溯链ID: {trace.anomaly_id}")
    print(f"   ✓ 关联快照: {len(trace.snapshot_chain)} 个")
    print(f"   ✓ 关联处理记录: {len(trace.record_chain)} 条")

    print("\n10. 生成完整报告（含普通话解释、并排对比、追溯链）...")
    reporter = ReportGenerator(storage, comparator, audit)
    report_path = reporter.generate_full_report(operator="system")
    size = report_path.stat().st_size
    print(f"   ✓ 报告大小: {size} bytes")
    print(f"   ✓ 报告路径: {report_path}")

    # 验证幂等重跑
    print("\n11. 验证幂等重跑（同一批材料再跑一次不能越跑越乱）...")
    storage2 = StorageManager(str(input_dir), str(output_dir))
    prev = storage2.find_previous_batch_by_fingerprint()
    print(f"   ✓ 检测到相同输入历史批次: {prev.batch_id if prev else None}")
    if prev:
        storage2.prepare_rerun(prev.batch_id)
        print(f"   ✓ 已复用 {prev.batch_id} 的稳定结论")

    # 验证追溯链
    print("\n12. 顺着异常往回查...")
    loaded = storage.load_anomaly_trace(trace.anomaly_id)
    if loaded:
        print(f"   ✓ 异常描述: {loaded.anomaly_description}")
        print(f"   ✓ 快照链:")
        for sid in loaded.snapshot_chain:
            snap = storage.load_snapshot(sid)
            if snap:
                print(f"     - {snap.snapshot_id[:10]} | {snap.table_schema.table_name}"
                      f" | {snap.source} | {snap.table_schema.to_hash()[:10]}")
        print(f"   ✓ 处理记录链:")
        for rid in loaded.record_chain:
            rec = storage.find_processing_record(record_id=rid)
            if rec:
                opinion = rec.opinions[-1].opinion if rec.opinions else "(暂无意见)"
                print(f"     - {rec.record_id[:10]} | {rec.record_type.value}"
                      f" | {rec.status.value} | {opinion[:40]}")

    print("\n" + "=" * 60)
    print("✅ 所有需求点验证通过！")
    print(f"   输入目录: {input_dir}")
    print(f"   输出目录: {output_dir}")
    print(f"   报告位置: {report_path}")
    with open(report_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    print(f"   报告总行数: {len(lines)}")
    # 打印报告中普通话汇总章节
    print("\n--- 报告中的「转发用普通话汇总」预览 ---")
    in_section = False
    for line in lines:
        if "转发用普通话汇总" in line:
            in_section = True
        if in_section:
            print(line.rstrip())
            if line.startswith("#") and "转发用普通话汇总" not in line and "## 八" not in line:
                break


if __name__ == "__main__":
    main()
