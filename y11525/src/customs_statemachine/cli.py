import sys
import json
import click
from datetime import datetime
from pathlib import Path

from .database import SessionLocal, init_db
from .models import Batch, BatchStatus, TaskStatus
from .schemas import BatchCreate, BatchDataAppend, PackageCreate
from .state_machine import StateMachine
from .audit_service import AuditService
from .task_processor import TaskProcessor
from .export_service import ExportService
from .config import settings


EXIT_SUCCESS = 0
EXIT_ERROR = 1
EXIT_NOT_FOUND = 2
EXIT_INVALID_OPERATION = 3


def get_db():
    db = SessionLocal()
    try:
        return db
    except Exception as e:
        click.echo(f"Database error: {e}", err=True)
        sys.exit(EXIT_ERROR)


@click.group()
@click.version_option(version="1.0.0")
def cli():
    """跨境小包清关异常回执状态机 CLI"""
    init_db()


@cli.group()
def batch():
    """批次管理命令"""
    pass


@batch.command("list")
@click.option("--status", type=click.Choice([s.value for s in BatchStatus]), help="按状态筛选")
@click.option("--limit", type=int, default=20, help="显示数量")
def batch_list(status, limit):
    """列出所有批次"""
    db = get_db()
    query = db.query(Batch)

    if status:
        query = query.filter(Batch.status == BatchStatus(status))

    batches = query.order_by(Batch.created_at.desc()).limit(limit).all()

    for batch in batches:
        click.echo(
            f"{batch.batch_no:<15} {batch.status.value:<20} "
            f"包裹:{batch.total_packages:<5} 税费:{batch.total_tax_amount:<10.2f} "
            f"创建人:{batch.created_by}"
        )

    sys.exit(EXIT_SUCCESS)


@batch.command("create")
@click.argument("batch_no")
@click.option("--created-by", required=True, help="创建人")
@click.option("--source-type", help="来源类型")
@click.option("--customs-code", help="关区代码")
@click.option("--packages", type=click.Path(exists=True), help="包裹数据 JSON 文件")
@click.option("--idempotency", type=click.Choice(["ignore", "overwrite", "append"]), default="ignore")
def batch_create(batch_no, created_by, source_type, customs_code, packages, idempotency):
    """创建新批次"""
    db = get_db()
    sm = StateMachine(db)

    packages_data = []
    if packages:
        try:
            with open(packages, 'r', encoding='utf-8') as f:
                pkg_list = json.load(f)
                packages_data = [PackageCreate(**p) for p in pkg_list]
        except Exception as e:
            click.echo(f"Failed to load packages: {e}", err=True)
            sys.exit(EXIT_ERROR)

    batch_data = BatchCreate(
        batch_no=batch_no,
        created_by=created_by,
        source_type=source_type,
        customs_code=customs_code,
        packages=packages_data,
        idempotency_mode=idempotency
    )

    try:
        batch, stats = sm.create_batch(batch_data)
        click.echo(f"Batch created: {batch.id}")
        click.echo(f"Batch No: {batch.batch_no}")
        click.echo(f"Status: {batch.status.value}")
        click.echo(f"Operation: {json.dumps(stats, ensure_ascii=False, indent=2)}")
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        click.echo(f"Error: {e}", err=True)
        sys.exit(EXIT_ERROR)


@batch.command("show")
@click.argument("batch_id")
def batch_show(batch_id):
    """显示批次详情"""
    db = get_db()
    batch = db.query(Batch).filter(Batch.id == batch_id).first()

    if not batch:
        click.echo(f"Batch not found: {batch_id}", err=True)
        sys.exit(EXIT_NOT_FOUND)

    click.echo(f"批次号: {batch.batch_no}")
    click.echo(f"ID: {batch.id}")
    click.echo(f"状态: {batch.status.value}")
    click.echo(f"来源类型: {batch.source_type or '-'}")
    click.echo(f"关区代码: {batch.customs_code or '-'}")
    click.echo(f"包裹总数: {batch.total_packages}")
    click.echo(f"税费总额: {batch.total_tax_amount}")
    click.echo(f"创建时间: {batch.created_at}")
    click.echo(f"创建人: {batch.created_by}")

    if batch.frozen_at:
        click.echo(f"\n冻结状态:")
        click.echo(f"  冻结时间: {batch.frozen_at}")
        click.echo(f"  冻结人: {batch.frozen_by}")
        click.echo(f"  冻结原因: {batch.frozen_reason}")
        click.echo(f"  冻结前状态: {batch.status_before_frozen}")

    if batch.manual_remark:
        click.echo(f"\n人工备注: {batch.manual_remark}")

    sys.exit(EXIT_SUCCESS)


@batch.command("transition")
@click.argument("batch_id")
@click.argument("target_status", type=click.Choice([s.value for s in BatchStatus]))
@click.option("--changed-by", required=True, help="操作人")
@click.option("--reason", help="变更原因")
def batch_transition(batch_id, target_status, changed_by, reason):
    """变更批次状态"""
    db = get_db()
    batch = db.query(Batch).filter(Batch.id == batch_id).first()

    if not batch:
        click.echo(f"Batch not found: {batch_id}", err=True)
        sys.exit(EXIT_NOT_FOUND)

    sm = StateMachine(db)
    try:
        batch = sm.transition(
            batch=batch,
            target_status=BatchStatus(target_status),
            changed_by=changed_by,
            reason=reason
        )
        db.commit()
        click.echo(f"Status changed to: {batch.status.value}")
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        click.echo(f"Error: {e}", err=True)
        sys.exit(EXIT_INVALID_OPERATION)


@batch.command("freeze")
@click.argument("batch_id")
@click.option("--frozen-by", required=True, help="冻结人")
@click.option("--reason", required=True, help="冻结原因")
def batch_freeze(batch_id, frozen_by, reason):
    """冻结结算"""
    db = get_db()
    batch = db.query(Batch).filter(Batch.id == batch_id).first()

    if not batch:
        click.echo(f"Batch not found: {batch_id}", err=True)
        sys.exit(EXIT_NOT_FOUND)

    sm = StateMachine(db)
    try:
        batch = sm.freeze_settlement(batch, frozen_by, reason)
        db.commit()
        click.echo(f"Batch frozen: {batch.status.value}")
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        click.echo(f"Error: {e}", err=True)
        sys.exit(EXIT_INVALID_OPERATION)


@batch.command("unfreeze")
@click.argument("batch_id")
@click.option("--unfrozen-by", required=True, help="解冻人")
@click.option("--reason", help="解冻原因")
def batch_unfreeze(batch_id, unfrozen_by, reason):
    """解冻结算"""
    db = get_db()
    batch = db.query(Batch).filter(Batch.id == batch_id).first()

    if not batch:
        click.echo(f"Batch not found: {batch_id}", err=True)
        sys.exit(EXIT_NOT_FOUND)

    sm = StateMachine(db)
    try:
        batch = sm.unfreeze_settlement(batch, unfrozen_by, reason)
        db.commit()
        click.echo(f"Batch unfrozen, status: {batch.status.value}")
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        click.echo(f"Error: {e}", err=True)
        sys.exit(EXIT_INVALID_OPERATION)


@batch.command("history")
@click.argument("batch_id")
@click.option("--limit", type=int, default=50, help="显示数量")
def batch_history(batch_id, limit):
    """查看批次历史记录"""
    db = get_db()
    batch = db.query(Batch).filter(Batch.id == batch_id).first()

    if not batch:
        click.echo(f"Batch not found: {batch_id}", err=True)
        sys.exit(EXIT_NOT_FOUND)

    audit = AuditService(db)
    history = audit.get_changes_summary(batch_id)

    for entry in history[:limit]:
        ts = entry["timestamp"]
        user = entry["user"]
        action = entry["action"]
        reason = entry.get("reason", "")

        line = f"[{ts}] {user:<15} {action:<20}"
        if reason:
            line += f" - {reason}"

        if "status_change" in entry:
            sc = entry["status_change"]
            line += f" ({sc.get('from') or '-'} -> {sc.get('to') or '-'})"

        click.echo(line)

    sys.exit(EXIT_SUCCESS)


@batch.command("export")
@click.argument("batch_id")
@click.option("--output", type=click.Path(), help="输出目录")
@click.option("--no-history", is_flag=True, help="不包含历史记录")
@click.option("--no-packages", is_flag=True, help="不包含包裹明细")
def batch_export(batch_id, output, no_history, no_packages):
    """导出批次数据到 Excel"""
    db = get_db()
    batch = db.query(Batch).filter(Batch.id == batch_id).first()

    if not batch:
        click.echo(f"Batch not found: {batch_id}", err=True)
        sys.exit(EXIT_NOT_FOUND)

    export_service = ExportService(db)
    output_dir = Path(output) if output else None

    result = export_service.export_to_excel(
        batch=batch,
        output_dir=output_dir,
        include_history=not no_history,
        include_packages=not no_packages
    )

    click.echo(f"Exported to: {result['file_path']}")
    click.echo(f"File size: {result['file_size']} bytes")
    sys.exit(EXIT_SUCCESS)


@batch.command("append")
@click.argument("batch_id")
@click.option("--changed-by", required=True, help="操作人")
@click.option("--packages", type=click.Path(exists=True), help="包裹数据 JSON 文件")
@click.option("--idempotency", type=click.Choice(["ignore", "overwrite", "append"]), default="append")
def batch_append(batch_id, changed_by, packages, idempotency):
    """追加数据到批次"""
    db = get_db()
    batch = db.query(Batch).filter(Batch.id == batch_id).first()

    if not batch:
        click.echo(f"Batch not found: {batch_id}", err=True)
        sys.exit(EXIT_NOT_FOUND)

    packages_data = []
    if packages:
        try:
            with open(packages, 'r', encoding='utf-8') as f:
                pkg_list = json.load(f)
                packages_data = [PackageCreate(**p) for p in pkg_list]
        except Exception as e:
            click.echo(f"Failed to load packages: {e}", err=True)
            sys.exit(EXIT_ERROR)

    sm = StateMachine(db)
    append_data = BatchDataAppend(
        packages=packages_data,
        idempotency_mode=idempotency,
        changed_by=changed_by
    )

    stats = sm.append_data(batch, append_data)
    click.echo(f"Data appended: {json.dumps(stats, ensure_ascii=False, indent=2)}")
    sys.exit(EXIT_SUCCESS)


@cli.group()
def task():
    """任务管理命令"""
    pass


@task.command("list")
@click.option("--status", type=click.Choice([s.value for s in TaskStatus]), help="按状态筛选")
def task_list(status):
    """列出任务"""
    db = get_db()
    tp = TaskProcessor(db)

    if status == TaskStatus.WAITING_MANUAL.value:
        tasks = tp.get_manual_tasks()
    else:
        from .models import AsyncTask
        query = db.query(AsyncTask)
        if status:
            query = query.filter(AsyncTask.status == TaskStatus(status))
        tasks = query.order_by(AsyncTask.queued_at.desc()).all()

    for t in tasks:
        click.echo(
            f"{t.id:<36} {t.task_type:<20} {t.status.value:<18} "
            f"重试:{t.retry_count}/{t.max_retries} {t.created_by or '-':<15}"
        )
        if t.last_error:
            click.echo(f"  错误: {t.last_error}")

    sys.exit(EXIT_SUCCESS)


@task.command("process")
def task_process():
    """处理待处理任务"""
    db = get_db()
    tp = TaskProcessor(db)
    count = tp.run_once()
    click.echo(f"Processed {count} tasks")
    sys.exit(EXIT_SUCCESS)


@task.command("recover")
def task_recover():
    """恢复卡住的任务"""
    db = get_db()
    tp = TaskProcessor(db)
    count = tp.recover_tasks()
    click.echo(f"Recovered {count} tasks")
    sys.exit(EXIT_SUCCESS)


@task.command("retry")
@click.argument("task_id")
@click.option("--retried-by", required=True, help="重试人")
@click.option("--reason", help="重试原因")
def task_retry(task_id, retried_by, reason):
    """重试失败的任务"""
    db = get_db()
    from .models import AsyncTask
    task = db.query(AsyncTask).filter(AsyncTask.id == task_id).first()

    if not task:
        click.echo(f"Task not found: {task_id}", err=True)
        sys.exit(EXIT_NOT_FOUND)

    tp = TaskProcessor(db)
    try:
        tp.retry_task(task, retried_by, reason)
        click.echo(f"Task reset for retry")
        sys.exit(EXIT_SUCCESS)
    except ValueError as e:
        click.echo(f"Error: {e}", err=True)
        sys.exit(EXIT_INVALID_OPERATION)


@task.command("resolve")
@click.argument("task_id")
@click.option("--resolved-by", required=True, help="处理人")
@click.option("--resolution", required=True, help="解决方案")
def task_resolve(task_id, resolved_by, resolution):
    """人工解决任务"""
    db = get_db()
    from .models import AsyncTask
    task = db.query(AsyncTask).filter(AsyncTask.id == task_id).first()

    if not task:
        click.echo(f"Task not found: {task_id}", err=True)
        sys.exit(EXIT_NOT_FOUND)

    tp = TaskProcessor(db)
    try:
        tp.resolve_manual_task(task, resolved_by, resolution)
        click.echo(f"Task resolved")
        sys.exit(EXIT_SUCCESS)
    except ValueError as e:
        click.echo(f"Error: {e}", err=True)
        sys.exit(EXIT_INVALID_OPERATION)


@cli.command("serve")
@click.option("--host", default="0.0.0.0", help="监听地址")
@click.option("--port", default=8000, type=int, help="监听端口")
def serve(host, port):
    """启动 API 服务"""
    import uvicorn
    from .api import app

    click.echo(f"Starting server on {host}:{port}")
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    cli()
