"""CLI 入口 - 按 CLI 交付，输入输出目录可指定"""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.table import Table

from .audit import AuditManager
from .migration import MigrationChecker
from .models import (
    BatchInfo,
    DiffConclusion,
    PaginationOrderConfig,
    RecordStatus,
    RecordType,
    SchemaSnapshot,
    TableSchema,
)
from .report import ReportGenerator
from .snapshot import SnapshotComparator
from .storage import StorageManager

console = Console()


def _build_storage(input_dir: str, output_dir: str,
                   batch_id: Optional[str] = None) -> StorageManager:
    storage = StorageManager(input_dir, output_dir, batch_id)
    # 检测幂等重跑
    prev = storage.find_previous_batch_by_fingerprint()
    if prev:
        storage.prepare_rerun(prev.batch_id)
        console.print(f"[yellow]检测到相同输入材料，复用历史批次结论: {prev.batch_id}[/yellow]")
    return storage


def _save_batch_info(storage: StorageManager, operator: str,
                     remark: str = None) -> BatchInfo:
    storage.mark_input_fingerprint()
    prev = storage.find_previous_batch_by_fingerprint()
    batch = BatchInfo(
        batch_id=storage.batch_id,
        input_dir=str(storage.input_dir),
        output_dir=str(storage.output_dir),
        operator=operator,
        remark=remark,
        is_rerun=prev is not None and prev.batch_id != storage.batch_id,
        rerun_of_batch=prev.batch_id if prev and prev.batch_id != storage.batch_id else None,
    )
    storage.save_batch_info(batch)
    return batch


@click.group()
@click.version_option(package_name="cache-db-diff")
def main():
    """缓存与数据库差异分析工具 (cache-db-diff)

    处理迁移重复执行、表结构快照对比、审计追溯、异常链等。
    输入输出目录可指定，同一批材料重复跑不会越跑越乱。
    """
    pass


@main.command("run")
@click.option("--input-dir", "-i", required=True, type=click.Path(file_okay=False),
              help="输入材料目录（含 migrations/schemas/snapshots/rollbacks）")
@click.option("--output-dir", "-o", required=True, type=click.Path(file_okay=False),
              help="输出目录（批次数据、报告、快照等均写入此处）")
@click.option("--batch-id", default=None, help="自定义批次ID，不填则自动生成")
@click.option("--operator", "-u", default="cli_user", help="操作人标识")
@click.option("--remark", default=None, help="批次备注")
@click.option("--skip-report", is_flag=True, help="跳过生成报告")
def cmd_run(input_dir, output_dir, batch_id, operator, remark, skip_report):
    """一次性执行：迁移检测 + 结构对比 + 生成报告"""
    storage = _build_storage(input_dir, output_dir, batch_id)
    batch = _save_batch_info(storage, operator, remark)
    console.print(f"[green]批次已创建: {batch.batch_id}[/green]")

    # 迁移重复检测
    console.print("[cyan]步骤 1/3：检测迁移重复执行记录...[/cyan]")
    checker = MigrationChecker(storage)
    mig_records = checker.run(creator=operator)
    console.print(f"  → 识别到 {len(mig_records)} 条重复迁移记录")

    # 结构对比
    console.print("[cyan]步骤 2/3：对比缓存与DB表结构...[/cyan]")
    comparator = SnapshotComparator(storage)
    schema_records = comparator.run_comparison(creator=operator)
    diff_count = sum(1 for r in schema_records if r.schema_diff and r.schema_diff.has_diff())
    console.print(f"  → 共对比 {len(schema_records)} 张表，其中 {diff_count} 张存在差异")

    total = len(mig_records) + len(schema_records)
    batch_info = storage.load_batch_info()
    if batch_info:
        batch_info.record_count = total
        batch_info.end_time = datetime.now()
        storage.save_batch_info(batch_info)

    # 报告
    if not skip_report:
        console.print("[cyan]步骤 3/3：生成报告...[/cyan]")
        reporter = ReportGenerator(storage, comparator, AuditManager(storage))
        path = reporter.generate_full_report(operator=operator)
        console.print(f"  → 报告已写入: [link=file://{path}]{path}[/link]")

    console.print(f"[bold green]✓ 完成，批次 {batch.batch_id} 共 {total} 条处理记录[/bold green]")


@main.command("check-migrations")
@click.option("--input-dir", "-i", required=True, type=click.Path(file_okay=False))
@click.option("--output-dir", "-o", required=True, type=click.Path(file_okay=False))
@click.option("--batch-id", default=None)
@click.option("--operator", "-u", default="cli_user")
def cmd_check_migrations(input_dir, output_dir, batch_id, operator):
    """单独执行：迁移重复执行检测"""
    storage = _build_storage(input_dir, output_dir, batch_id)
    _save_batch_info(storage, operator, "仅检测迁移重复")
    checker = MigrationChecker(storage)
    records = checker.run(creator=operator)

    table = Table(title=f"重复迁移记录（{len(records)} 条）")
    table.add_column("记录ID", style="dim")
    table.add_column("迁移脚本")
    table.add_column("重复次数", justify="right")
    table.add_column("首次执行")
    table.add_column("最近执行")
    table.add_column("状态")
    for r in records:
        dup = r.duplicate_info
        table.add_row(
            r.record_id[:10],
            r.migration_name or "-",
            str(dup.execution_count) if dup else "-",
            dup.first_execution.strftime("%Y-%m-%d %H:%M") if dup else "-",
            dup.last_execution.strftime("%Y-%m-%d %H:%M") if dup else "-",
            r.status.value,
        )
    console.print(table)


@main.command("compare-schemas")
@click.option("--input-dir", "-i", required=True, type=click.Path(file_okay=False))
@click.option("--output-dir", "-o", required=True, type=click.Path(file_okay=False))
@click.option("--batch-id", default=None)
@click.option("--operator", "-u", default="cli_user")
def cmd_compare_schemas(input_dir, output_dir, batch_id, operator):
    """单独执行：缓存 vs DB 表结构对比"""
    storage = _build_storage(input_dir, output_dir, batch_id)
    _save_batch_info(storage, operator, "仅对比结构")
    comparator = SnapshotComparator(storage)
    records = comparator.run_comparison(creator=operator)

    table = Table(title=f"结构对比结果（{len(records)} 张表）")
    table.add_column("表名")
    table.add_column("结论")
    table.add_column("差异数", justify="right")
    table.add_column("状态")
    table.add_column("记录ID", style="dim")
    for r in records:
        diff = r.schema_diff
        conclusion_cn = {
            DiffConclusion.MATCH: "✅ 一致",
            DiffConclusion.TYPE_MISMATCH: "⚠️ 类型不符",
            DiffConclusion.COLUMN_MISSING: "⚠️ 缓存缺列",
            DiffConclusion.COLUMN_EXTRA: "⚠️ DB多列",
            DiffConclusion.INDEX_MISMATCH: "⚠️ 索引不同",
            DiffConclusion.PK_MISMATCH: "⚠️ 主键不同",
            DiffConclusion.MULTIPLE_DIFFS: "🔴 多处差异",
        }.get(diff.conclusion, diff.conclusion.value) if diff else "-"
        table.add_row(
            r.table_name or "-",
            conclusion_cn,
            str(len(diff.diffs)) if diff else "-",
            r.status.value,
            r.record_id[:10],
        )
    console.print(table)


@main.command("side-by-side")
@click.option("--output-dir", "-o", required=True, type=click.Path(file_okay=False))
@click.option("--batch-id", default=None)
@click.option("--table", "table_name", required=True, help="要并排对比的表名")
@click.option("--old-snapshot", "old_id", default=None, help="旧快照ID（不填则取最早）")
@click.option("--new-snapshot", "new_id", default=None, help="新快照ID（不填则取最新）")
def cmd_side_by_side(output_dir, batch_id, table_name, old_id, new_id):
    """表结构快照并排对比（旧 vs 新）"""
    storage = _build_storage(str(Path(output_dir).parent), output_dir, batch_id)
    comparator = SnapshotComparator(storage)
    result = comparator.side_by_side_compare(table_name, old_id, new_id)
    if "error" in result:
        console.print(f"[red]✗ {result['error']}[/red]")
        sys.exit(1)

    console.print(f"[bold]并排对比：[/bold]{result['table_name']}")
    console.print(f"  旧快照 {result['old_snapshot']['id'][:10]} "
                  f"({result['old_snapshot']['time'][:19]}, 来源: {result['old_snapshot']['source']})")
    console.print(f"  新快照 {result['new_snapshot']['id'][:10]} "
                  f"({result['new_snapshot']['time'][:19]}, 来源: {result['new_snapshot']['source']})")
    console.print()

    table = Table(title="列定义并排（⚠️ 表示有变化）")
    table.add_column("列名")
    table.add_column("旧快照")
    table.add_column("新快照")
    for r in result["columns_side_by_side"]:
        mark = " ⚠️" if r["changed"] else ""
        old_d = r["old"]
        new_d = r["new"]
        old_str = (f"{old_d['data_type']} {'NOT NULL' if not old_d['is_nullable'] else 'NULL'}"
                   if old_d else "(不存在)")
        new_str = (f"{new_d['data_type']} {'NOT NULL' if not new_d['is_nullable'] else 'NULL'}"
                   if new_d else "(不存在)")
        table.add_row(r["column_name"] + mark, old_str, new_str)
    console.print(table)


@main.command("review-pagination")
@click.option("--output-dir", "-o", required=True, type=click.Path(file_okay=False))
@click.option("--batch-id", required=True)
@click.option("--record-id", required=True, help="分页问题处理记录ID")
@click.option("--reviewer", required=True, help="复核人")
@click.option("--comment", "review_comment", required=True, help="复核意见")
@click.option("--reason", default=None, help="变更原因（谁改的为什么改）")
def cmd_review_pagination(output_dir, batch_id, record_id, reviewer, review_comment, reason):
    """分页顺序不稳定：复核通过（写入审计，记录谁/何时/为什么）"""
    storage = _build_storage(str(Path(output_dir).parent), output_dir, batch_id)
    audit = AuditManager(storage)
    rec = audit.review_pagination_passed(record_id, reviewer, review_comment, reason)
    console.print(f"[green]✓ 复核通过，处理记录状态已更新为: {rec.status.value}[/green]")
    console.print(f"  复核人: {rec.pagination_config.reviewer}")
    console.print(f"  复核时间: {rec.pagination_config.review_time}")


@main.command("register-pagination")
@click.option("--input-dir", "-i", required=True, type=click.Path(file_okay=False))
@click.option("--output-dir", "-o", required=True, type=click.Path(file_okay=False))
@click.option("--batch-id", default=None)
@click.option("--table", "table_name", required=True)
@click.option("--order-by", multiple=True, required=True, help="排序字段（可多次指定）")
@click.option("--stable/--unstable", default=False, help="排序是否稳定")
@click.option("--reason", default=None, help="变更原因")
@click.option("--operator", "-u", default="cli_user")
def cmd_register_pagination(input_dir, output_dir, batch_id, table_name,
                            order_by, stable, reason, operator):
    """登记分页顺序稳定性问题"""
    storage = _build_storage(input_dir, output_dir, batch_id)
    _save_batch_info(storage, operator, f"登记分页问题: {table_name}")
    audit = AuditManager(storage)
    rec = audit.register_pagination_issue(
        table_name=table_name,
        order_by_columns=list(order_by),
        is_stable=stable,
        change_reason=reason,
        creator=operator,
    )
    console.print(f"[green]✓ 已登记分页问题，记录ID: {rec.record_id}[/green]")


@main.command("create-trace")
@click.option("--output-dir", "-o", required=True, type=click.Path(file_okay=False))
@click.option("--batch-id", required=True)
@click.option("--description", required=True, help="异常描述")
@click.option("--type", "anomaly_type", required=True, help="异常类型")
@click.option("--root-record-id", required=True, help="根处理记录ID")
@click.option("--operator", "-u", default="cli_user")
def cmd_create_trace(output_dir, batch_id, description, anomaly_type,
                     root_record_id, operator):
    """创建异常追溯链（顺着异常 → 快照 → 处理意见）"""
    storage = _build_storage(str(Path(output_dir).parent), output_dir, batch_id)
    audit = AuditManager(storage)
    trace = audit.create_anomaly_trace(
        anomaly_description=description,
        anomaly_type=anomaly_type,
        root_record_id=root_record_id,
        creator=operator,
    )
    console.print(f"[green]✓ 追溯链创建成功: {trace.anomaly_id}[/green]")
    console.print(f"  关联快照数: {len(trace.snapshot_chain)}")
    console.print(f"  关联记录数: {len(trace.record_chain)}")


@main.command("report")
@click.option("--output-dir", "-o", required=True, type=click.Path(file_okay=False))
@click.option("--batch-id", required=True)
@click.option("--no-sbs", is_flag=True, help="不包含并排对比")
@click.option("--no-traces", is_flag=True, help="不包含异常追溯")
@click.option("--no-audit", is_flag=True, help="不包含审计日志")
def cmd_report(output_dir, batch_id, no_sbs, no_traces, no_audit):
    """为已存在的批次生成 Markdown 报告"""
    storage = _build_storage(str(Path(output_dir).parent), output_dir, batch_id)
    reporter = ReportGenerator(
        storage,
        SnapshotComparator(storage),
        AuditManager(storage),
    )
    path = reporter.generate_full_report(
        include_sbs=not no_sbs,
        include_traces=not no_traces,
        include_audit=not no_audit,
    )
    console.print(f"[green]✓ 报告已生成:[/green] [link=file://{path}]{path}[/link]")


@main.command("add-opinion")
@click.option("--output-dir", "-o", required=True, type=click.Path(file_okay=False))
@click.option("--batch-id", required=True)
@click.option("--record-id", required=True)
@click.option("--handler", required=True, help="处理人")
@click.option("--opinion", required=True, help="处理意见")
@click.option("--suggestion", default=None, help="建议")
@click.option("--resolved", is_flag=True, help="同时标记为已解决")
def cmd_add_opinion(output_dir, batch_id, record_id, handler,
                    opinion, suggestion, resolved):
    """为处理记录添加处理意见（审计组/后端负责人共用）"""
    storage = _build_storage(str(Path(output_dir).parent), output_dir, batch_id)
    audit = AuditManager(storage)
    rec = audit.confirm_record(record_id, handler, opinion, suggestion)
    if resolved and rec.status != RecordStatus.RESOLVED:
        comparator = SnapshotComparator(storage)
        rec = comparator.add_opinion(record_id, handler, opinion, suggestion,
                                     mark_resolved=True)
    console.print(f"[green]✓ 意见已保存，状态: {rec.status.value}[/green]")


@main.command("list-batches")
@click.option("--output-dir", "-o", required=True, type=click.Path(file_okay=False))
@click.option("--limit", default=20, help="显示最近 N 批")
def cmd_list_batches(output_dir, limit):
    """列出历史批次"""
    storage = StorageManager(
        input_dir=str(Path(output_dir) / "input_placeholder"),
        output_dir=output_dir,
    )
    batches = storage.list_all_batches()[:limit]
    table = Table(title=f"历史批次（最近 {len(batches)} 批）")
    table.add_column("批次ID")
    table.add_column("开始时间")
    table.add_column("记录数", justify="right")
    table.add_column("是否重跑")
    table.add_column("操作人")
    table.add_column("备注")
    for b in batches:
        table.add_row(
            b.batch_id,
            b.start_time.strftime("%Y-%m-%d %H:%M:%S"),
            str(b.record_count),
            "✓" if b.is_rerun else "",
            b.operator or "-",
            (b.remark or "")[:20],
        )
    console.print(table)


@main.command("trace-anomaly")
@click.option("--output-dir", "-o", required=True, type=click.Path(file_okay=False))
@click.option("--batch-id", required=True)
@click.option("--anomaly-id", required=True)
def cmd_trace_anomaly(output_dir, batch_id, anomaly_id):
    """顺着异常往回查：展示表结构快照和处理意见"""
    storage = _build_storage(str(Path(output_dir).parent), output_dir, batch_id)
    trace = storage.load_anomaly_trace(anomaly_id)
    if not trace:
        console.print(f"[red]✗ 找不到异常: {anomaly_id}[/red]")
        sys.exit(1)

    console.print(f"[bold]异常描述:[/bold] {trace.anomaly_description}")
    console.print(f"[bold]异常类型:[/bold] {trace.anomaly_type}")
    console.print(f"[bold]是否解决:[/bold] {'✅ 已解决' if trace.is_resolved else '❌ 未解决'}")
    console.print()

    console.print("[bold]🔗 处理记录链：[/bold]")
    t1 = Table()
    t1.add_column("#")
    t1.add_column("记录ID")
    t1.add_column("类型")
    t1.add_column("对象")
    t1.add_column("状态")
    t1.add_column("最新处理意见")
    for i, rid in enumerate(trace.record_chain, 1):
        rec = storage.find_processing_record(record_id=rid)
        if rec:
            rt_cn = {
                RecordType.MIGRATION_DUPLICATE: "重复迁移",
                RecordType.ROLLBACK: "回滚",
                RecordType.SCHEMA_DIFF: "结构差异",
                RecordType.PAGINATION_ORDER: "分页",
                RecordType.ANOMALY_TRACE: "追溯",
            }.get(rec.record_type, rec.record_type.value)
            opinion = rec.opinions[-1].opinion if rec.opinions else "(无)"
            t1.add_row(str(i), rid[:10], rt_cn,
                       rec.table_name or rec.migration_name or "-",
                       rec.status.value, opinion[:30])
        else:
            t1.add_row(str(i), rid[:10], "(丢失)", "-", "-", "-")
    console.print(t1)

    console.print("[bold]📸 表结构快照链：[/bold]")
    t2 = Table()
    t2.add_column("#")
    t2.add_column("快照ID")
    t2.add_column("表名")
    t2.add_column("时间")
    t2.add_column("来源")
    t2.add_column("结构哈希")
    for i, sid in enumerate(trace.snapshot_chain, 1):
        snap = storage.load_snapshot(sid)
        if snap:
            t2.add_row(str(i), sid[:10], snap.table_schema.table_name,
                       snap.snapshot_time.strftime("%Y-%m-%d %H:%M"),
                       snap.source, snap.table_schema.to_hash()[:10])
        else:
            t2.add_row(str(i), sid[:10], "(丢失)", "-", "-", "-")
    console.print(t2)


@main.command("gen-sample")
@click.option("--input-dir", "-i", required=True, type=click.Path(file_okay=False),
              help="示例材料写入目录")
def cmd_gen_sample(input_dir):
    """生成示例输入材料，便于快速体验"""
    base = Path(input_dir)
    (base / "migrations").mkdir(parents=True, exist_ok=True)
    (base / "schemas" / "cache").mkdir(parents=True, exist_ok=True)
    (base / "schemas" / "db").mkdir(parents=True, exist_ok=True)

    # 迁移记录：含重复
    migrations = [
        {"migration_name": "V1__init.sql", "execution_order": 1,
         "execution_time": "2025-01-15T09:00:00", "checksum": "abc123", "success": True},
        {"migration_name": "V1__init.sql", "execution_order": 1,
         "execution_time": "2025-01-15T09:05:00", "checksum": "abc123", "success": True},
        {"migration_name": "V2__add_user.sql", "execution_order": 2,
         "execution_time": "2025-01-15T09:10:00", "checksum": "def456", "success": True},
        {"migration_name": "V2__add_user.sql", "execution_order": 2,
         "execution_time": "2025-01-15T09:12:00", "checksum": "def456",
         "success": False, "error_message": "duplicate entry"},
    ]
    (base / "migrations" / "executions.json").write_text(
        json.dumps(migrations, indent=2, ensure_ascii=False), encoding="utf-8")

    # 缓存侧表结构
    cache_users = {
        "table_name": "users",
        "columns": [
            {"name": "id", "data_type": "BIGINT", "is_nullable": False},
            {"name": "name", "data_type": "VARCHAR(64)", "is_nullable": False},
            {"name": "email", "data_type": "VARCHAR(128)", "is_nullable": True},
            {"name": "created_at", "data_type": "DATETIME", "is_nullable": False,
             "default": "CURRENT_TIMESTAMP"},
        ],
        "primary_key": ["id"],
        "indexes": [
            {"name": "idx_name", "columns": ["name"], "is_unique": False},
        ],
        "engine": "InnoDB",
        "charset": "utf8mb4",
    }
    cache_orders = {
        "table_name": "orders",
        "columns": [
            {"name": "id", "data_type": "BIGINT", "is_nullable": False},
            {"name": "user_id", "data_type": "BIGINT", "is_nullable": False},
            {"name": "amount", "data_type": "DECIMAL(10,2)", "is_nullable": False},
        ],
        "primary_key": ["id"],
        "indexes": [],
    }
    (base / "schemas" / "cache" / "tables.json").write_text(
        json.dumps([cache_users, cache_orders], indent=2, ensure_ascii=False),
        encoding="utf-8")

    # DB侧表结构（故意制造差异）
    db_users = {
        "table_name": "users",
        "columns": [
            {"name": "id", "data_type": "BIGINT", "is_nullable": False},
            {"name": "name", "data_type": "VARCHAR(64)", "is_nullable": False},
            {"name": "email", "data_type": "VARCHAR(256)", "is_nullable": False},  # 长度+非空
            {"name": "created_at", "data_type": "DATETIME", "is_nullable": False,
             "default": "CURRENT_TIMESTAMP"},
            {"name": "phone", "data_type": "VARCHAR(20)", "is_nullable": True},  # 多出列
        ],
        "primary_key": ["id"],
        "indexes": [
            {"name": "idx_name", "columns": ["name"], "is_unique": True},  # 变唯一
            {"name": "uk_email", "columns": ["email"], "is_unique": True},  # 新增索引
        ],
        "engine": "InnoDB",
        "charset": "utf8mb4",
    }
    db_orders = {
        "table_name": "orders",
        "columns": [
            {"name": "id", "data_type": "BIGINT", "is_nullable": False},
            {"name": "user_id", "data_type": "BIGINT", "is_nullable": False},
            {"name": "amount", "data_type": "DECIMAL(12,2)", "is_nullable": False},  # 精度变化
            {"name": "status", "data_type": "TINYINT", "is_nullable": False, "default": "0"},
        ],
        "primary_key": ["id"],
        "indexes": [
            {"name": "idx_user", "columns": ["user_id"], "is_unique": False},
        ],
    }
    (base / "schemas" / "db" / "tables.json").write_text(
        json.dumps([db_users, db_orders], indent=2, ensure_ascii=False),
        encoding="utf-8")

    console.print(f"[green]✓ 示例材料已写入 {base}[/green]")
    console.print("  提示：下一条可以跑：")
    console.print(f"    cache-db-diff run -i {base} -o {base.parent / 'output'}")


if __name__ == "__main__":
    main()
