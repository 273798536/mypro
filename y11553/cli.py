import os
import sys
import json
import click
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.database import SessionLocal, init_db
from src.repository import DataRepository
from src.data_importer import DataImporter
from src.data_exporter import DataExporter
from src.reconciliation import ReconciliationService
from src.models import RecordType


@click.group()
def cli():
    """智能柜补货验收回放链路服务 - 命令行工具"""
    pass


@cli.command()
def init():
    """初始化数据库"""
    init_db()
    click.echo("数据库初始化完成")


@cli.command()
@click.argument("record_type", type=click.Choice(["inventory", "replenishment", "refund", "price_adjustment"]))
@click.argument("file_path", type=click.Path(exists=True))
def import_file(record_type, file_path):
    """从文件导入数据"""
    db = SessionLocal()
    try:
        importer = DataImporter(db)
        rtype = RecordType(record_type)
        task = importer.import_from_file(rtype, file_path)
        click.echo(f"导入任务创建成功: {task.task_id}")
        click.echo(f"状态: {task.status.value}")
        click.echo(f"总计: {task.total_count}, 成功: {task.success_count}, 重复: {task.duplicate_count}, 错误: {task.error_count}")
    finally:
        db.close()


@cli.command()
@click.option("--record-type", type=click.Choice(["inventory", "replenishment", "refund", "price_adjustment"]), required=True)
@click.option("--data", type=str, help="JSON格式的记录数据")
@click.option("--file", type=click.Path(exists=True), help="包含记录的JSON文件")
def import_api(record_type, data, file):
    """通过API方式导入数据"""
    if file:
        with open(file, "r", encoding="utf-8") as f:
            records = json.load(f)
    elif data:
        records = json.loads(data)
    else:
        click.echo("请提供 --data 或 --file 参数")
        return

    db = SessionLocal()
    try:
        importer = DataImporter(db)
        rtype = RecordType(record_type)
        task = importer.import_from_api(rtype, records)
        click.echo(f"导入任务创建成功: {task.task_id}")
        click.echo(f"状态: {task.status.value}")
        click.echo(f"总计: {task.total_count}, 成功: {task.success_count}, 重复: {task.duplicate_count}, 错误: {task.error_count}")
    finally:
        db.close()


@cli.command()
@click.option("--skip", type=int, default=0)
@click.option("--limit", type=int, default=20)
def list_tasks(skip, limit):
    """列出导入任务"""
    db = SessionLocal()
    try:
        repo = DataRepository(db)
        tasks = repo.list_tasks(skip=skip, limit=limit)
        for task in tasks:
            click.echo(f"[{task.task_id}] {task.record_type.value:15} {task.status.value:15} "
                       f"总计:{task.total_count:4} 成功:{task.success_count:4} "
                       f"重复:{task.duplicate_count:4} 错误:{task.error_count:4} "
                       f"{task.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
    finally:
        db.close()


@cli.command()
@click.argument("task_id")
def task_detail(task_id):
    """查看任务详情"""
    db = SessionLocal()
    try:
        repo = DataRepository(db)
        task = repo.get_task_by_id(task_id)
        if not task:
            click.echo(f"任务不存在: {task_id}")
            return

        click.echo("=" * 60)
        click.echo(f"任务ID: {task.task_id}")
        click.echo(f"记录类型: {task.record_type.value}")
        click.echo(f"来源类型: {task.source_type.value}")
        click.echo(f"来源文件: {task.source_file or '-'}")
        click.echo(f"状态: {task.status.value}")
        click.echo(f"重试次数: {task.retry_times}/{task.max_retry_times}")
        click.echo(f"创建时间: {task.created_at}")
        click.echo(f"完成时间: {task.completed_at or '-'}")
        click.echo("-" * 60)
        click.echo(f"总计: {task.total_count}")
        click.echo(f"成功: {task.success_count}")
        click.echo(f"重复: {task.duplicate_count}")
        click.echo(f"错误: {task.error_count}")
        calc_total = task.success_count + task.duplicate_count + task.error_count
        ok = "✅" if calc_total == task.total_count else "❌"
        click.echo(f"计数守恒: {calc_total} == {task.total_count} {ok}")
        if task.error_message:
            click.echo(f"错误信息: {task.error_message[:200]}...")
        click.echo("-" * 60)
        click.echo("行级处理状态:")
        from src.repository import safe_json_loads
        pending_counts = {}
        for pr in task.pending_records:
            st = pr.status.value
            pending_counts[st] = pending_counts.get(st, 0) + 1
            status_color = {
                "success": "green",
                "duplicate": "yellow",
                "waiting_manual": "red",
                "waiting_retry": "yellow",
                "permanent_failed": "red",
                "pending": "white",
                "processing": "blue",
                "error": "red",
            }.get(st, "white")
            err_msg = f" - {pr.error_message}" if pr.error_message else ""
            click.echo(f"  行{pr.source_row_number}: {click.style(st, fg=status_color)}{err_msg}")
        click.echo("-" * 60)
        click.echo("状态汇总:")
        for st, cnt in sorted(pending_counts.items()):
            status_color = {
                "success": "green",
                "duplicate": "yellow",
                "waiting_manual": "red",
                "waiting_retry": "yellow",
                "permanent_failed": "red",
                "pending": "white",
                "processing": "blue",
                "error": "red",
            }.get(st, "white")
            click.echo(f"  {click.style(st, fg=status_color)}: {cnt}")
        click.echo("=" * 60)
    finally:
        db.close()


@cli.command()
@click.argument("task_id")
def task_logs(task_id):
    """查看任务日志"""
    db = SessionLocal()
    try:
        repo = DataRepository(db)
        task = repo.get_task_by_id(task_id)
        if not task:
            click.echo(f"任务不存在: {task_id}")
            return

        logs = repo.get_task_logs(task.id)
        for log in logs:
            level_color = {"error": "red", "warning": "yellow", "info": "green"}.get(log.level, "white")
            click.echo(f"[{log.created_at.strftime('%H:%M:%S')}] {click.style(log.level.upper(), fg=level_color)}: {log.message}")
    finally:
        db.close()


@cli.command()
@click.argument("task_id")
@click.option("--format", type=click.Choice(["xlsx", "csv", "json"]), default="xlsx")
def export_task(task_id, format):
    """导出任务结果"""
    db = SessionLocal()
    try:
        exporter = DataExporter(db)
        filepath = exporter.export_task_results(task_id, format)
        click.echo(f"导出成功: {filepath}")
    except ValueError as e:
        click.echo(f"导出失败: {e}")
    finally:
        db.close()


@cli.command()
@click.argument("cabinet_id")
def reconcile(cabinet_id):
    """对指定柜机进行对账"""
    db = SessionLocal()
    try:
        service = ReconciliationService(db)
        results = service.reconcile_cabinet(cabinet_id)
        summary = service.get_reconciliation_summary(cabinet_id)

        click.echo("=" * 60)
        click.echo(f"柜机 {cabinet_id} 对账结果")
        click.echo("-" * 60)
        click.echo(f"总格口数: {summary['total_cells']}")
        click.echo(f"一致: {summary['consistent_count']}")
        click.echo(f"不一致: {summary['inconsistent_count']}")
        click.echo(f"一致率: {summary['consistency_rate']:.2%}")
        if summary['issues_distribution']:
            click.echo(f"问题分布: {summary['issues_distribution']}")
        click.echo("-" * 60)

        for r in results:
            if not r.is_consistent:
                status = click.style("不一致", fg="red")
                click.echo(f"  格口{r.cell_id}: {status} 预期{r.expected_quantity} 实际{r.actual_quantity} 差异{r.difference:+d}")
                if r.description:
                    click.echo(f"    说明: {r.description}")

        click.echo("=" * 60)
    finally:
        db.close()


@cli.command()
@click.argument("cabinet_id")
def recon_summary(cabinet_id):
    """查看对账历史汇总"""
    db = SessionLocal()
    try:
        service = ReconciliationService(db)
        summary = service.get_reconciliation_summary(cabinet_id)
        click.echo(json.dumps(summary, ensure_ascii=False, indent=2))
    finally:
        db.close()


@cli.command()
def generate_test_data():
    """生成测试数据"""
    from datetime import datetime, timedelta
    import time

    db = SessionLocal()
    try:
        importer = DataImporter(db)

        base_time = datetime.utcnow() - timedelta(hours=2)

        inventory_records = [
            {
                "cabinet_id": "CAB001",
                "cell_id": "A01",
                "sku_id": "SKU001",
                "sku_name": "矿泉水",
                "quantity": 10,
                "is_hot_cell": False,
                "record_time": base_time,
            },
            {
                "cabinet_id": "CAB001",
                "cell_id": "A02",
                "sku_id": "SKU002",
                "sku_name": "可乐",
                "quantity": 5,
                "is_hot_cell": True,
                "record_time": base_time,
            },
            {
                "cabinet_id": "CAB001",
                "cell_id": "A03",
                "sku_id": "SKU003",
                "sku_name": "薯片",
                "quantity": 8,
                "is_hot_cell": False,
                "record_time": base_time,
            },
        ]
        task1 = importer.import_from_api(RecordType.INVENTORY, inventory_records)
        click.echo(f"库存数据导入任务创建: {task1.task_id}, 共{task1.total_count}条记录（异步处理中）")

        replenishment_records = [
            {
                "cabinet_id": "CAB001",
                "cell_id": "A01",
                "photo_url": "http://example.com/photo1.jpg",
                "photo_hash": "abc123def456",
                "replenishment_quantity": 10,
                "operator_id": "OP001",
                "record_time": base_time + timedelta(minutes=30),
            },
            {
                "cabinet_id": "CAB001",
                "cell_id": "A02",
                "photo_url": "http://example.com/photo2.jpg",
                "photo_hash": "xyz789uvw012",
                "replenishment_quantity": 15,
                "operator_id": "OP001",
                "record_time": base_time + timedelta(minutes=30),
            },
        ]
        task2 = importer.import_from_api(RecordType.REPLENISHMENT, replenishment_records)
        click.echo(f"补货数据导入任务创建: {task2.task_id}, 共{task2.total_count}条记录（异步处理中）")

        refund_records = [
            {
                "cabinet_id": "CAB001",
                "order_id": "ORD202401010001",
                "user_id": "USER001",
                "sku_id": "SKU001",
                "refund_amount": 3.5,
                "refund_reason": "商品过期",
                "record_time": base_time + timedelta(hours=1),
            },
        ]
        task3 = importer.import_from_api(RecordType.REFUND, refund_records)
        click.echo(f"退款数据导入任务创建: {task3.task_id}, 共{task3.total_count}条记录（异步处理中）")

        duplicate_records = [inventory_records[0].copy()]
        task4 = importer.import_from_api(RecordType.INVENTORY, duplicate_records)
        click.echo(f"重复数据导入任务创建: {task4.task_id}, 共{task4.total_count}条记录（异步处理中）")

        click.echo("\n测试数据生成完成！请等待异步处理或启动服务。")
        click.echo("启动服务后将自动处理待处理任务。")

    finally:
        db.close()


if __name__ == "__main__":
    cli()
