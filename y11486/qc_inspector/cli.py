import os
import sys
from datetime import datetime
from typing import Optional

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
import pandas as pd

from .database import init_db, get_db, update_record_with_audit
from .models import (
    ImportBatch, ReworkRecord, InspectionRecord, ShiftRecord, SupplierRecord,
    ApprovalRecord, AsyncTask, AuditLog, TaskStatus, ConflictStrategy, DataSource, ImportStatus
)
from .processor import DataImporter, TaskProcessor

console = Console()


def get_current_operator() -> str:
    return os.environ.get("QC_OPERATOR", "current_user")


@click.group()
@click.version_option(version="0.1.0")
@click.option("--db", help="数据库文件路径", default="qc_inspector.db")
def cli(db: str):
    """小厂质检返工多源导入巡检 CLI"""
    if db:
        os.environ["QC_INSPECTOR_DB"] = db


@cli.command()
@click.option("--sample/--no-sample", default=True, help="是否生成样例数据")
@click.option("--operator", help="操作者姓名", default=get_current_operator())
def init(sample: bool, operator: str):
    """初始化数据库"""
    init_db()
    console.print(Panel("[green]✓ 数据库初始化成功[/green]", title="初始化"))

    if sample:
        with get_db() as db:
            _create_sample_data(db, operator)
        console.print(Panel("[green]✓ 样例数据已生成[/green]", title="样例数据"))


def _create_sample_data(db, operator: str):
    import uuid

    base_path = os.path.dirname(os.path.abspath(__file__))
    samples_dir = os.path.join(os.path.dirname(base_path), "samples")
    os.makedirs(samples_dir, exist_ok=True)

    rework_data = {
        "product_model": ["Model-A", "Model-B", "Model-A", "Model-C", "Model-B"],
        "serial_number": ["SN001", "SN002", "SN003", "SN004", "SN005"],
        "defect_type": ["外观", "功能", "外观", "尺寸", "功能"],
        "defect_description": ["表面划痕", "无法开机", "掉漆", "偏大", "死机"],
        "rework_action": ["抛光", "更换主板", "喷漆", "返修", "升级固件"],
        "rework_result": ["通过", "通过", "通过", "失败", "通过"],
        "responsible_shift": ["早班", "中班", "早班", "晚班", "中班"],
        "rework_count": [1, 2, 1, 3, 1],
        "yield_rate": [98.5, 85.0, 99.0, 150, 92.0],
        "inspector": ["张工", "李工", "张工", "王工", "赵工"],
        "rework_date": ["2024-01-15", "2024-01-16", "2024-01-17", "2024-01-18", "2024-01-19"]
    }
    pd.DataFrame(rework_data).to_excel(os.path.join(samples_dir, "rework_sample.xlsx"), index=False)

    inspection_data = {
        "product_model": ["Model-A", "Model-B", "Model-C"],
        "inspection_date": ["2024-01-15", "2024-01-16", "2024-01-17"],
        "sample_size": [100, 80, 50],
        "defect_count": [2, 5, 1],
        "defect_rate": [2.0, 6.25, 2.0],
        "inspector": ["质检员A", "质检员B", "质检员C"],
        "result": ["合格", "待复检", "合格"]
    }
    pd.DataFrame(inspection_data).to_excel(os.path.join(samples_dir, "inspection_sample.xlsx"), index=False)

    shift_data = {
        "shift_name": ["早班", "中班", "晚班", "早班", "中班"],
        "shift_date": ["2024-01-15", "2024-01-15", "2024-01-15", "2024-01-16", "2024-01-16"],
        "machine_id": ["M001", "M002", "M001", "M001", "M002"],
        "operator": ["张三", "李四", "王五", "张三", "赵六"],
        "output_count": [500, 450, 480, 520, 470],
        "defect_count": [5, 8, 3, 4, 6]
    }
    pd.DataFrame(shift_data).to_excel(os.path.join(samples_dir, "shift_sample.xlsx"), index=False)

    supplier_data = {
        "supplier_name": ["供应商A", "供应商B", "供应商A", "供应商C"],
        "product_model": ["Part-X", "Part-Y", "Part-X", "Part-Z"],
        "quantity": [1000, 500, 800, 300],
        "unit_price": [15.5, 25.0, 15.5, 50.0],
        "total_amount": [15500, 12500, 12400, 15000],
        "invoice_date": ["2024-01-10", "2024-01-12", "2024-01-15", "2024-01-18"],
        "payment_status": ["已付款", "未付款", "已付款", "未付款"]
    }
    pd.DataFrame(supplier_data).to_excel(os.path.join(samples_dir, "supplier_sample.xlsx"), index=False)

    bad_data = {
        "product_model": ["", "Model-B", None, "Model-E"],
        "serial_number": ["SN006", "", "SN008", None],
        "defect_type": ["外观", "功能", "尺寸", "功能"],
        "defect_description": ["刮伤", "异响", None, "死机"],
        "rework_action": ["打磨", "调整", "修正", "重写程序"],
        "rework_result": ["通过", "失败", "通过", "通过"],
        "responsible_shift": ["早班", "中班", "晚班", "早班"],
        "rework_count": [1, 2, -1, 3],
        "yield_rate": [95.0, -5, 88.0, 105],
        "inspector": ["刘工", "陈工", "周工", "吴工"],
        "rework_date": ["2024-01-20", "2024-01-21", "2024-01-22", "2024-01-23"]
    }
    pd.DataFrame(bad_data).to_excel(os.path.join(samples_dir, "rework_bad_data.xlsx"), index=False)

    approval_data = {
        "email_subject": ["审批：SN001返工方案", "审批：SN002特采申请", "审批：SN004报废申请", "审批：Model-A批次放行"],
        "email_from": ["质检员<qc@factory.com>", "车间主任<workshop@factory.com>", "质检员<qc@factory.com>", "生产经理<pm@factory.com>"],
        "email_to": ["质检主管<qc-head@factory.com>", "质量经理<qa@factory.com>", "总经理<gm@factory.com>", "客户<client@company.com>"],
        "approval_type": ["返工审批", "特采审批", "报废审批", "批次审批"],
        "related_serial": ["SN001", "SN002", "SN004", "Model-A-001"],
        "approval_result": ["同意", "同意", "驳回", "同意"],
        "approval_date": ["2024-01-15", "2024-01-16", "2024-01-18", "2024-01-20"],
        "approver": ["质检主管", "质量经理", "总经理", "生产经理"],
        "comments": ["同意返工方案", "特采但需后续跟进", "不同意报废，需重新返工", "同意批次放行"]
    }
    pd.DataFrame(approval_data).to_excel(os.path.join(samples_dir, "approval_sample.xlsx"), index=False)

    console.print(f"  样例文件已生成至: [cyan]{samples_dir}[/cyan]")


@cli.command("import")
@click.argument("source", type=click.Choice(["rework", "inspection", "shift", "supplier", "approval"]))
@click.argument("file_path", type=click.Path(exists=True))
@click.option("--strategy", type=click.Choice(["ignore", "overwrite", "append"]), default="ignore",
              help="冲突处理策略: ignore(忽略重复)/overwrite(覆盖)/append(追加)")
@click.option("--operator", help="操作者姓名", default=get_current_operator())
def import_cmd(source: str, file_path: str, strategy: str, operator: str):
    """导入数据 (rework|inspection|shift|supplier) FILE"""
    with get_db() as db:
        importer = DataImporter(db, operator)
        try:
            result = importer.import_file(source, file_path, strategy)
            _show_import_result(result, strategy)
        except Exception as e:
            console.print(f"[red]导入失败: {str(e)}[/red]")
            sys.exit(1)


def _show_import_result(result: dict, strategy: str):
    table = Table(title="导入结果")
    table.add_column("项目", style="cyan")
    table.add_column("数量", style="green")

    table.add_row("批次ID", str(result["batch_id"]))
    table.add_row("总行数", str(result["total"]))
    table.add_row("成功行数", str(result["success"]))
    table.add_row("失败行数", str(result["failed"]))
    table.add_row("", "")
    table.add_row("处理策略", strategy)
    table.add_row("  新建", str(result["stats"].get("created", 0)))
    table.add_row("  忽略", str(result["stats"].get("ignored", 0)))
    table.add_row("  覆盖", str(result["stats"].get("overwritten", 0)))
    table.add_row("  追加", str(result["stats"].get("appended", 0)))
    table.add_row("  失败", str(result["stats"].get("failed", 0)))

    console.print(table)


@cli.command()
@click.option("--batch-id", type=int, help="指定批次ID检查")
@click.option("--all-tasks/--no-all-tasks", default=False, help="显示所有任务状态")
@click.option("--retry/--no-retry", default=False, help="自动重试待处理任务")
@click.option("--operator", help="操作者姓名", default=get_current_operator())
def check(batch_id: Optional[int], all_tasks: bool, retry: bool, operator: str):
    """检查数据和任务状态"""
    with get_db() as db:
        if retry:
            processor = TaskProcessor(db, operator)
            results = processor.process_pending_tasks()
            console.print(Panel(
                f"已完成: {results['completed']}\n"
                f"等待重试: {results['retry_waiting']}\n"
                f"需人工处理: {results['manual_required']}\n"
                f"永久失败: {results['permanent_failed']}",
                title="任务重试结果"
            ))

        if batch_id:
            _show_batch_details(db, batch_id)
        else:
            _show_all_batches(db)

        if all_tasks:
            _show_all_tasks(db)


def _show_all_batches(db):
    batches = db.query(ImportBatch).order_by(ImportBatch.created_at.desc()).limit(10).all()

    table = Table(title="最近导入批次")
    table.add_column("ID", style="cyan")
    table.add_column("来源", style="blue")
    table.add_column("文件名", style="green")
    table.add_column("策略", style="yellow")
    table.add_column("状态", style="magenta")
    table.add_column("总数", style="white")
    table.add_column("成功", style="green")
    table.add_column("失败", style="red")
    table.add_column("操作者", style="cyan")
    table.add_column("时间", style="white")

    for batch in batches:
        status_color = "green" if batch.status == ImportStatus.COMPLETED.value else "red"
        table.add_row(
            str(batch.id),
            batch.source,
            batch.file_name,
            batch.strategy,
            f"[{status_color}]{batch.status}[/{status_color}]",
            str(batch.total_rows),
            str(batch.success_rows),
            str(batch.failed_rows),
            batch.operator,
            batch.created_at.strftime("%m-%d %H:%M")
        )

    console.print(table)


def _show_batch_details(db, batch_id: int):
    batch = db.query(ImportBatch).get(batch_id)
    if not batch:
        console.print(f"[red]批次 {batch_id} 不存在[/red]")
        return

    console.print(Panel(
        f"批次ID: {batch.id}\n"
        f"来源: {batch.source}\n"
        f"文件: {batch.file_name}\n"
        f"策略: {batch.strategy}\n"
        f"状态: {batch.status}\n"
        f"总数: {batch.total_rows}, 成功: {batch.success_rows}, 失败: {batch.failed_rows}\n"
        f"操作者: {batch.operator}\n"
        f"创建时间: {batch.created_at}",
        title=f"批次详情 - {batch_id}"
    ))

    failed_tasks = db.query(AsyncTask).filter(
        AsyncTask.batch_id == batch_id,
        AsyncTask.status != TaskStatus.COMPLETED.value
    ).all()

    if failed_tasks:
        table = Table(title="失败记录")
        table.add_column("任务ID", style="cyan")
        table.add_column("原始行号", style="yellow")
        table.add_column("状态", style="red")
        table.add_column("错误信息", style="white")
        table.add_column("重试次数", style="magenta")

        for task in failed_tasks:
            import json
            details = json.loads(task.error_details or "{}")
            original_row = details.get("original_row", "N/A")
            table.add_row(
                str(task.id),
                str(original_row),
                task.status,
                task.error_message or "",
                str(task.retry_count)
            )
        console.print(table)


def _show_all_tasks(db):
    tasks = db.query(AsyncTask).filter(
        AsyncTask.status != TaskStatus.COMPLETED.value
    ).order_by(AsyncTask.created_at.desc()).all()

    if not tasks:
        console.print("[green]✓ 无待处理任务[/green]")
        return

    table = Table(title="待处理任务")
    table.add_column("ID", style="cyan")
    table.add_column("批次", style="blue")
    table.add_column("类型", style="green")
    table.add_column("状态", style="yellow")
    table.add_column("重试", style="magenta")
    table.add_column("错误", style="red")

    for task in tasks:
        status_color = {
            TaskStatus.PENDING.value: "yellow",
            TaskStatus.RETRY.value: "blue",
            TaskStatus.MANUAL.value: "red",
            TaskStatus.PERMANENT.value: "bright_red",
        }.get(task.status, "white")

        table.add_row(
            str(task.id),
            str(task.batch_id),
            task.source_type or "",
            f"[{status_color}]{task.status}[/{status_color}]",
            f"{task.retry_count}/{task.max_retries}",
            (task.error_message or "")[:50]
        )

    console.print(table)


@cli.command()
@click.argument("task_id", type=int)
@click.argument("field_name")
@click.argument("new_value")
@click.option("--reason", required=True, help="修改原因")
@click.option("--operator", help="操作者姓名", default=get_current_operator())
def fix(task_id: int, field_name: str, new_value: str, reason: str, operator: str):
    """修复数据: fix TASK_ID FIELD NEW_VALUE --reason REASON"""
    with get_db() as db:
        task = db.query(AsyncTask).get(task_id)
        if not task:
            console.print(f"[red]任务 {task_id} 不存在[/red]")
            sys.exit(1)

        source_type = task.source_type
        source_id = task.source_id

        model_map = {
            DataSource.REWORK.value: ReworkRecord,
            DataSource.INSPECTION.value: InspectionRecord,
            DataSource.SHIFT.value: ShiftRecord,
            DataSource.SUPPLIER.value: SupplierRecord,
            DataSource.APPROVAL.value: ApprovalRecord,
        }

        model = model_map.get(source_type)
        if not model or not source_id:
            console.print(f"[red]无法找到对应记录，可能需要重新导入[/red]")
            sys.exit(1)

        record = db.query(model).get(source_id)
        if not record:
            console.print(f"[red]记录不存在[/red]")
            sys.exit(1)

        if not hasattr(record, field_name):
            console.print(f"[red]字段 {field_name} 不存在[/red]")
            console.print(f"可用字段: {[c.name for c in model.__table__.columns]}")
            sys.exit(1)

        old_value = getattr(record, field_name)

        converted_value = _convert_field_value(record, field_name, new_value)

        updated = update_record_with_audit(
            db, record, field_name, converted_value, operator, reason
        )

        if updated:
            from .processor import DataValidator
            record_dict = {c.name: getattr(record, c.name) for c in model.__table__.columns}
            is_valid, errors = getattr(DataValidator, f"validate_{source_type}")(record_dict)
            record.is_valid = is_valid
            record.validation_errors = "; ".join(errors) if errors else None

            if is_valid:
                task.status = TaskStatus.COMPLETED.value
                task.completed_at = datetime.now()
                status_msg = "[green]✓ 校验通过[/green]"
            else:
                task.status = TaskStatus.MANUAL.value
                status_msg = f"[yellow]⚠ 仍有问题: {'; '.join(errors)}[/yellow]"

            console.print(Panel(
                f"记录ID: {source_id}\n"
                f"字段: {field_name}\n"
                f"原值: {old_value}\n"
                f"新值: {converted_value}\n"
                f"原因: {reason}\n"
                f"操作者: {operator}\n"
                f"校验结果: {status_msg}",
                title="[green]✓ 修改成功[/green]"
            ))
        else:
            console.print("[yellow]值未变化，无需修改[/yellow]")


def _convert_field_value(record, field_name: str, value: str):
    from sqlalchemy import Integer, Float, DateTime

    column = getattr(record.__class__, field_name).property.columns[0]
    col_type = type(column.type)

    if col_type == Integer:
        return int(value)
    elif col_type == Float:
        return float(value)
    elif col_type == DateTime:
        return pd.to_datetime(value).to_pydatetime()
    return value


@cli.command()
@click.option("--batch-id", type=int, help="指定批次ID")
@click.option("--source", type=click.Choice(["rework", "inspection", "shift", "supplier", "approval"]), help="指定数据源")
@click.option("--format", type=click.Choice(["table", "json", "csv"]), default="table", help="输出格式")
@click.option("--show-failed/--no-failed", default=True, help="显示失败清单")
def report(batch_id: Optional[int], source: Optional[str], format: str, show_failed: bool):
    """生成报告"""
    with get_db() as db:
        if source == "rework" or source is None:
            _show_rework_report(db, batch_id, show_failed)
        if source == "approval":
            _show_approval_report(db, batch_id, show_failed)
        if source == "inspection" or (source is None and show_failed):
            _show_summary_report(db, batch_id)


def _show_rework_report(db, batch_id: Optional[int], show_failed: bool):
    query = db.query(ReworkRecord)
    if batch_id:
        query = query.filter(ReworkRecord.batch_id == batch_id)

    all_records = query.all()
    failed_records = [r for r in all_records if not r.is_valid]

    table = Table(title="返工记录清单（生产经理视图）")
    table.add_column("原始行号", style="cyan")
    table.add_column("型号", style="blue")
    table.add_column("序列号", style="green")
    table.add_column("缺陷类型", style="yellow")
    table.add_column("责任班次", style="magenta")
    table.add_column("返工次数", style="white")
    table.add_column("良率", style="red")
    table.add_column("状态", style="green")

    for record in all_records:
        status = "[green]✓[/green]" if record.is_valid else "[red]✗[/red]"
        yield_str = f"[red]{record.yield_rate}[/red]" if record.yield_rate and (record.yield_rate < 0 or record.yield_rate > 100) else str(record.yield_rate)
        table.add_row(
            str(record.original_row or "N/A"),
            record.product_model,
            record.serial_number,
            record.defect_type or "",
            record.responsible_shift or "",
            str(record.rework_count),
            yield_str,
            status
        )

    console.print(table)

    if show_failed and failed_records:
        fail_table = Table(title="失败清单（需人工修正）")
        fail_table.add_column("原始行号", style="cyan")
        fail_table.add_column("序列号", style="green")
        fail_table.add_column("错误信息", style="red")

        for record in failed_records:
            fail_table.add_row(
                str(record.original_row or "N/A"),
                record.serial_number,
                record.validation_errors or ""
            )
        console.print(fail_table)


def _show_approval_report(db, batch_id: Optional[int], show_failed: bool):
    query = db.query(ApprovalRecord)
    if batch_id:
        query = query.filter(ApprovalRecord.batch_id == batch_id)

    all_records = query.all()
    failed_records = [r for r in all_records if not r.is_valid]

    table = Table(title="审批邮件清单（生产经理视图）")
    table.add_column("原始行号", style="cyan")
    table.add_column("邮件主题", style="blue")
    table.add_column("审批类型", style="green")
    table.add_column("关联序列号", style="yellow")
    table.add_column("审批人", style="magenta")
    table.add_column("审批结果", style="white")
    table.add_column("状态", style="green")

    for record in all_records:
        status = "[green]✓[/green]" if record.is_valid else "[red]✗[/red]"
        table.add_row(
            str(record.original_row or "N/A"),
            (record.email_subject or "")[:30],
            record.approval_type or "",
            record.related_serial or "",
            record.approver or "",
            record.approval_result or "",
            status
        )

    console.print(table)

    if show_failed and failed_records:
        fail_table = Table(title="审批邮件失败清单")
        fail_table.add_column("原始行号", style="cyan")
        fail_table.add_column("邮件主题", style="blue")
        fail_table.add_column("错误信息", style="red")

        for record in failed_records:
            fail_table.add_row(
                str(record.original_row or "N/A"),
                (record.email_subject or "")[:30],
                record.validation_errors or ""
            )
        console.print(fail_table)


def _show_summary_report(db, batch_id: Optional[int]):
    query = db.query(AsyncTask).filter(
        AsyncTask.status != TaskStatus.COMPLETED.value
    )
    if batch_id:
        query = query.filter(AsyncTask.batch_id == batch_id)

    pending_tasks = query.all()

    if pending_tasks:
        console.print(Panel(
            f"待处理任务总数: [red]{len(pending_tasks)}[/red]\n"
            f"  - 需人工处理: {len([t for t in pending_tasks if t.status == TaskStatus.MANUAL.value])}\n"
            f"  - 等待重试: {len([t for t in pending_tasks if t.status == TaskStatus.RETRY.value])}\n"
            f"  - 永久失败: {len([t for t in pending_tasks if t.status == TaskStatus.PERMANENT.value])}",
            title="待处理摘要"
        ))


@cli.command()
@click.option("--record-id", type=int, help="指定记录ID")
@click.option("--source", type=click.Choice(["rework", "inspection", "shift", "supplier", "approval"]), help="数据源类型")
@click.option("--operator", help="按操作者筛选")
@click.option("--limit", type=int, default=50, help="显示条数")
def history(record_id: Optional[int], source: Optional[str], operator: Optional[str], limit: int):
    """查看审计历史"""
    with get_db() as db:
        query = db.query(AuditLog).order_by(AuditLog.created_at.desc())

        if operator:
            query = query.filter(AuditLog.operator == operator)

        if source and record_id:
            filter_map = {
                "rework": AuditLog.rework_record_id == record_id,
                "inspection": AuditLog.inspection_record_id == record_id,
                "shift": AuditLog.shift_record_id == record_id,
                "supplier": AuditLog.supplier_record_id == record_id,
                "approval": AuditLog.approval_record_id == record_id,
            }
            query = query.filter(filter_map[source])

        logs = query.limit(limit).all()

        table = Table(title="变更历史")
        table.add_column("时间", style="cyan")
        table.add_column("操作者", style="blue")
        table.add_column("动作", style="green")
        table.add_column("字段", style="yellow")
        table.add_column("原值", style="red")
        table.add_column("新值", style="green")
        table.add_column("原因", style="magenta")

        for log in logs:
            table.add_row(
                log.created_at.strftime("%m-%d %H:%M:%S"),
                log.operator,
                log.action,
                log.field_name or "",
                (log.old_value or "")[:30],
                (log.new_value or "")[:30],
                log.reason or ""
            )

        console.print(table)


@cli.command()
@click.argument("source", type=click.Choice(["rework", "inspection", "shift", "supplier", "approval"]))
@click.argument("output_file", type=click.Path())
@click.option("--batch-id", type=int, help="指定批次ID")
@click.option("--valid-only/--no-valid-only", default=True, help="只导出有效数据")
def export(source: str, output_file: str, batch_id: Optional[int], valid_only: bool):
    """导出数据: export SOURCE OUTPUT_FILE"""
    with get_db() as db:
        model_map = {
            "rework": ReworkRecord,
            "inspection": InspectionRecord,
            "shift": ShiftRecord,
            "supplier": SupplierRecord,
            "approval": ApprovalRecord,
        }
        model = model_map[source]

        query = db.query(model)
        if batch_id:
            query = query.filter(model.batch_id == batch_id)
        if valid_only:
            query = query.filter(model.is_valid == True)

        records = query.all()

        if not records:
            console.print("[yellow]无数据可导出[/yellow]")
            return

        data = []
        for record in records:
            row = {}
            for col in model.__table__.columns:
                val = getattr(record, col.name)
                if isinstance(val, datetime):
                    val = val.strftime("%Y-%m-%d %H:%M:%S")
                row[col.name] = val
            data.append(row)

        df = pd.DataFrame(data)

        if output_file.endswith(".xlsx"):
            df.to_excel(output_file, index=False)
        elif output_file.endswith(".csv"):
            df.to_csv(output_file, index=False, encoding="utf-8-sig")
        else:
            console.print(f"[red]不支持的导出格式: {output_file}[/red]")
            sys.exit(1)

        console.print(f"[green]✓ 已导出 {len(records)} 条记录至 {output_file}[/green]")


if __name__ == "__main__":
    cli()
