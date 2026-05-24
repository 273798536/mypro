import click
import json
import sys
from datetime import datetime
from sqlalchemy.orm import Session

from ..models import init_db, SessionLocal, QueueStatus, RetryCategory, DirtyType, RecordSource
from ..services import QueueService, DataService, ExportService, DataValidator


@click.group()
@click.option("--operator", "-o", default="system", help="操作员名称")
@click.option("--role", "-r", default="worker", help="操作员角色: worker/supervisor/manager")
@click.pass_context
def cli(ctx, operator, role):
    """小厂质检返工重试补偿队列服务 (qq)"""
    ctx.ensure_object(dict)
    ctx.obj["operator"] = operator
    ctx.obj["role"] = role
    init_db()


def get_db():
    return SessionLocal()


@cli.command()
@click.pass_context
def init(ctx):
    """初始化数据库"""
    init_db()
    click.echo("数据库初始化完成")
    sys.exit(0)


@cli.group()
def submit():
    """提交数据到队列"""
    pass


@submit.command("inspection")
@click.argument("json_file", type=click.File("r"))
@click.pass_context
def submit_inspection(ctx, json_file):
    """提交抽检表数据"""
    data = json.load(json_file)
    db = get_db()
    try:
        data_service = DataService(db)
        inspection, dirty_records = data_service.create_inspection(data)

        if dirty_records:
            click.echo(f"检测到 {len(dirty_records)} 条脏记录:")
            for dr in dirty_records:
                click.echo(f"  - {dr.dirty_type.value}: {dr.processing_opinion}")

        queue_service = QueueService(db, ctx.obj["operator"], ctx.obj["role"])
        queue_item = queue_service.submit_from_inspection(inspection.id)
        db.commit()

        click.echo(f"抽检表已提交，队列编号: {queue_item.queue_no}")
        sys.exit(0)
    except Exception as e:
        db.rollback()
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(1)
    finally:
        db.close()


@submit.command("rework")
@click.argument("json_file", type=click.File("r"))
@click.pass_context
def submit_rework(ctx, json_file):
    """提交返工单数据"""
    data = json.load(json_file)
    db = get_db()
    try:
        data_service = DataService(db)
        rework, dirty_records = data_service.create_rework_order(data)

        if dirty_records:
            click.echo(f"检测到 {len(dirty_records)} 条脏记录:")
            for dr in dirty_records:
                click.echo(f"  - {dr.dirty_type.value}: {dr.processing_opinion}")

        queue_service = QueueService(db, ctx.obj["operator"], ctx.obj["role"])
        queue_item = queue_service.submit_from_rework(rework.id)
        db.commit()

        click.echo(f"返工单已提交，队列编号: {queue_item.queue_no}")
        sys.exit(0)
    except Exception as e:
        db.rollback()
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(1)
    finally:
        db.close()


@submit.command("exception")
@click.argument("json_file", type=click.File("r"))
@click.pass_context
def submit_exception(ctx, json_file):
    """提交异常记录（短信截图/照片）"""
    data = json.load(json_file)
    db = get_db()
    try:
        data_service = DataService(db)
        exception = data_service.create_exception_record(data)

        queue_service = QueueService(db, ctx.obj["operator"], ctx.obj["role"])
        queue_item = queue_service.submit_from_exception(exception.id)
        db.commit()

        click.echo(f"异常记录已提交，队列编号: {queue_item.queue_no}")
        sys.exit(0)
    except Exception as e:
        db.rollback()
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(1)
    finally:
        db.close()


@submit.command("shift")
@click.argument("json_file", type=click.File("r"))
@click.pass_context
def submit_shift(ctx, json_file):
    """提交机台班次数据"""
    data = json.load(json_file)
    db = get_db()
    try:
        data_service = DataService(db)
        shift, dirty_records = data_service.create_machine_shift(data)

        if dirty_records:
            click.echo(f"检测到 {len(dirty_records)} 条脏记录:")
            for dr in dirty_records:
                click.echo(f"  - {dr.dirty_type.value}: {dr.processing_opinion}")

        db.commit()
        click.echo(f"机台班次已创建: {shift.shift_code}")
        sys.exit(0)
    except Exception as e:
        db.rollback()
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(1)
    finally:
        db.close()


@cli.command()
@click.argument("queue_id", type=int)
@click.pass_context
def process(ctx, queue_id):
    """处理队列项"""
    db = get_db()
    try:
        service = QueueService(db, ctx.obj["operator"], ctx.obj["role"])
        success, msg = service.process_queue(queue_id)
        db.commit()

        if success:
            click.echo(msg)
            sys.exit(0)
        else:
            click.echo(msg, err=True)
            sys.exit(1)
    finally:
        db.close()


@cli.command()
@click.argument("queue_id", type=int)
@click.option("--error", "-e", default="", help="错误信息")
@click.pass_context
def retry(ctx, queue_id, error):
    """重试队列项"""
    db = get_db()
    try:
        service = QueueService(db, ctx.obj["operator"], ctx.obj["role"])
        success, msg = service.retry_queue(queue_id, error)
        db.commit()

        if success:
            click.echo(msg)
            sys.exit(0)
        else:
            click.echo(msg, err=True)
            sys.exit(2)
    finally:
        db.close()


@cli.command()
@click.argument("queue_id", type=int)
@click.option("--note", "-n", default="", help="备注")
@click.pass_context
def manual(ctx, queue_id, note):
    """人工接管队列项"""
    db = get_db()
    try:
        service = QueueService(db, ctx.obj["operator"], ctx.obj["role"])
        success, msg = service.take_manual(queue_id, note)
        db.commit()

        if success:
            click.echo(msg)
            sys.exit(0)
        else:
            click.echo(msg, err=True)
            sys.exit(3)
    finally:
        db.close()


@cli.command()
@click.argument("queue_id", type=int)
@click.option("--amount", "-a", type=float, help="补偿金额")
@click.option("--quantity", "-q", type=int, help="补偿数量")
@click.pass_context
def compensate(ctx, queue_id, amount, quantity):
    """补偿入账"""
    db = get_db()
    try:
        service = QueueService(db, ctx.obj["operator"], ctx.obj["role"])
        success, msg = service.compensate(queue_id, amount, quantity)
        db.commit()

        if success:
            click.echo(msg)
            sys.exit(0)
        else:
            click.echo(msg, err=True)
            sys.exit(4)
    finally:
        db.close()


@cli.command()
@click.argument("queue_id", type=int)
@click.option("--reason", "-r", required=True, help="关闭原因")
@click.pass_context
def close(ctx, queue_id, reason):
    """关闭队列项"""
    db = get_db()
    try:
        service = QueueService(db, ctx.obj["operator"], ctx.obj["role"])
        success, msg = service.close_queue(queue_id, reason)
        db.commit()

        if success:
            click.echo(msg)
            sys.exit(0)
        else:
            click.echo(msg, err=True)
            sys.exit(5)
    finally:
        db.close()


@cli.command()
@click.argument("queue_id", type=int)
@click.pass_context
def recover(ctx, queue_id):
    """从死信队列恢复"""
    db = get_db()
    try:
        service = QueueService(db, ctx.obj["operator"], ctx.obj["role"])
        success, msg = service.recover_dead_letter(queue_id)
        db.commit()

        if success:
            click.echo(msg)
            sys.exit(0)
        else:
            click.echo(msg, err=True)
            sys.exit(6)
    finally:
        db.close()


@cli.command("list")
@click.option("--status", "-s", type=click.Choice([s.value for s in QueueStatus]), help="按状态过滤")
@click.option("--category", "-c", type=click.Choice([c.value for c in RetryCategory]), help="按重试分类过滤")
@click.option("--machine", "-m", help="按机台号过滤")
@click.option("--shift", help="按班次过滤")
@click.option("--limit", "-l", type=int, default=50, help="显示数量")
@click.pass_context
def list_queue(ctx, status, category, machine, shift, limit):
    """列出队列项"""
    db = get_db()
    try:
        service = QueueService(db, ctx.obj["operator"], ctx.obj["role"])
        items = service.list_queue(
            status=QueueStatus(status) if status else None,
            category=RetryCategory(category) if category else None,
            machine_no=machine,
            shift_code=shift,
            limit=limit
        )

        click.echo(f"{'队列编号':<20} {'状态':<12} {'分类':<18} {'机台':<10} {'责任班次':<12} {'重试':<4}")
        click.echo("-" * 80)
        for item in items:
            click.echo(
                f"{item.queue_no:<20} "
                f"{(item.status.value if item.status else ''):<12} "
                f"{(item.retry_category.value if item.retry_category else ''):<18} "
                f"{(item.machine_no or ''):<10} "
                f"{(item.responsible_shift_code or ''):<12} "
                f"{item.retry_count:<4}"
            )

        sys.exit(0)
    finally:
        db.close()


@cli.command()
@click.argument("queue_id", type=int)
@click.pass_context
def detail(ctx, queue_id):
    """查看队列项详情"""
    db = get_db()
    try:
        service = ExportService(db)
        detail = service.get_queue_detail(queue_id)

        if not detail:
            click.echo("队列项不存在", err=True)
            sys.exit(1)

        click.echo(json.dumps(detail, ensure_ascii=False, indent=2))
        sys.exit(0)
    finally:
        db.close()


@cli.group()
def export():
    """导出数据"""
    pass


@export.command("csv")
@click.argument("output_file", type=click.File("w"))
@click.option("--status", "-s", type=click.Choice([s.value for s in QueueStatus]), help="按状态过滤")
def export_csv(output_file, status):
    """导出为 CSV"""
    db = get_db()
    try:
        service = ExportService(db)
        csv_content = service.export_queue_to_csv(status)
        output_file.write(csv_content)
        click.echo(f"已导出到 {output_file.name}")
        sys.exit(0)
    finally:
        db.close()


@export.command("excel")
@click.argument("output_file", type=click.Path())
@click.option("--status", "-s", type=click.Choice([s.value for s in QueueStatus]), help="按状态过滤")
def export_excel(output_file, status):
    """导出为 Excel"""
    db = get_db()
    try:
        service = ExportService(db)
        success = service.export_queue_to_excel(output_file, status)
        if success:
            click.echo(f"已导出到 {output_file}")
            sys.exit(0)
        else:
            click.echo("导出失败", err=True)
            sys.exit(1)
    finally:
        db.close()


@cli.command()
@click.pass_context
def summary(ctx):
    """生产经理视图 - 汇总统计"""
    db = get_db()
    try:
        service = QueueService(db, ctx.obj["operator"], ctx.obj["role"])
        summary = service.get_manager_summary()

        click.echo("=" * 50)
        click.echo("生产经理视图 - 补偿队列汇总")
        click.echo("=" * 50)
        click.echo(f"总计: {summary['total']}")
        click.echo()
        click.echo("按状态:")
        for k, v in summary["by_status"].items():
            click.echo(f"  {k:<15} {v:>5}")
        click.echo()
        click.echo("按重试分类:")
        for k, v in summary["by_category"].items():
            click.echo(f"  {k:<20} {v:>5}")
        click.echo()
        click.echo("补偿汇总:")
        click.echo(f"  总金额: {summary['compensation_summary']['total_amount']:.2f}")
        click.echo(f"  总数量: {summary['compensation_summary']['total_quantity']}")
        click.echo("=" * 50)

        sys.exit(0)
    finally:
        db.close()


@cli.group()
def dirty():
    """脏记录管理"""
    pass


@dirty.command("list")
@click.option("--type", "-t", type=click.Choice([t.value for t in DirtyType]), help="按脏类型过滤")
@click.option("--source", "-s", type=click.Choice([s.value for s in RecordSource]), help="按来源过滤")
@click.option("--corrected/--uncorrected", default=None, help="是否已修正")
@click.option("--limit", "-l", type=int, default=50, help="显示数量")
def dirty_list(type, source, corrected, limit):
    """列出脏记录"""
    db = get_db()
    try:
        validator = DataValidator(db)
        records = validator.get_dirty_records(
            source_type=RecordSource(source) if source else None,
            dirty_type=DirtyType(type) if type else None,
            is_corrected=corrected,
            limit=limit
        )

        click.echo(f"{'ID':<5} {'来源':<12} {'类型':<20} {'字段':<20} {'已修正':<6}")
        click.echo("-" * 70)
        for r in records:
            click.echo(
                f"{r.id:<5} "
                f"{r.source_type.value:<12} "
                f"{r.dirty_type.value:<20} "
                f"{(r.field_name or ''):<20} "
                f"{'是' if r.is_corrected else '否':<6}"
            )
            if r.processing_opinion:
                click.echo(f"      {r.processing_opinion}")

        sys.exit(0)
    finally:
        db.close()


@dirty.command("correct")
@click.argument("dirty_id", type=int)
@click.argument("corrected_value")
@click.option("--operator", "-o", required=True, help="修正人")
def dirty_correct(dirty_id, corrected_value, operator):
    """修正脏记录"""
    db = get_db()
    try:
        validator = DataValidator(db)
        success, msg = validator.correct_dirty_record(dirty_id, corrected_value, operator)
        db.commit()

        if success:
            click.echo(msg)
            sys.exit(0)
        else:
            click.echo(msg, err=True)
            sys.exit(1)
    finally:
        db.close()


@cli.group()
def worker():
    """Worker 调度服务"""
    pass


@worker.command("run")
@click.option("--worker-id", "-w", help="Worker ID")
@click.option("--interval", "-i", type=int, default=5, help="轮询间隔(秒)")
@click.option("--batch-size", "-b", type=int, default=10, help="批量处理大小")
@click.pass_context
def worker_run(ctx, worker_id, interval, batch_size):
    """启动 Worker 处理队列"""
    from ..services import QueueWorker

    db = get_db()
    try:
        worker = QueueWorker(db, worker_id, interval, batch_size)
        click.echo(f"Worker {worker.worker_id} 启动，按 Ctrl+C 停止")
        worker.start()
    except KeyboardInterrupt:
        click.echo("Worker 停止")
        sys.exit(0)
    finally:
        db.close()


@worker.command("once")
@click.option("--worker-id", "-w", help="Worker ID")
@click.option("--batch-size", "-b", type=int, default=10, help="批量处理大小")
@click.pass_context
def worker_once(ctx, worker_id, batch_size):
    """执行一次队列处理"""
    from ..services import QueueWorker

    db = get_db()
    try:
        worker = QueueWorker(db, worker_id, 5, batch_size)
        processed = worker.process_once()
        click.echo(f"处理完成，共处理 {processed} 条")
        sys.exit(0)
    finally:
        db.close()


@worker.command("list")
def worker_list():
    """列出所有 Worker 状态"""
    from ..models import WorkerState

    db = get_db()
    try:
        workers = db.query(WorkerState).all()

        click.echo(f"{'Worker ID':<25} {'状态':<10} {'处理数':<8} {'错误数':<8} {'最后心跳':<25}")
        click.echo("-" * 80)
        for w in workers:
            click.echo(
                f"{w.worker_id:<25} "
                f"{w.status.value if w.status else '':<10} "
                f"{w.processed_count:<8} "
                f"{w.error_count:<8} "
                f"{w.last_heartbeat.strftime('%Y-%m-%d %H:%M:%S') if w.last_heartbeat else '':<25}"
            )

        sys.exit(0)
    finally:
        db.close()


@cli.group()
def receipt():
    """外部回执管理"""
    pass


@receipt.command("submit")
@click.argument("source_type", type=click.Choice(["shift", "inspection", "rework", "sms"]))
@click.argument("json_file", type=click.File("r"))
@click.option("--source-system", "-s", default="external", help="来源系统")
@click.option("--callback-url", "-c", help="回调 URL")
def receipt_submit(source_type, json_file, source_system, callback_url):
    """提交外部回执"""
    from ..services import ReceiptProcessor

    data = json.load(json_file)
    db = get_db()
    try:
        processor = ReceiptProcessor(db)
        receipt = processor.submit_receipt(
            source_type=source_type,
            payload=data,
            source_system=source_system,
            callback_url=callback_url
        )
        db.commit()

        click.echo(f"回执已提交，编号: {receipt.receipt_no}")
        sys.exit(0)
    except Exception as e:
        db.rollback()
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(1)
    finally:
        db.close()


@receipt.command("process")
@click.option("--limit", "-l", type=int, default=100, help="处理数量")
def receipt_process(limit):
    """处理待处理的回执"""
    from ..services import ReceiptProcessor

    db = get_db()
    try:
        processor = ReceiptProcessor(db)
        processed = processor.process_pending_receipts(limit)
        click.echo(f"处理完成，成功 {processed} 条")
        sys.exit(0)
    finally:
        db.close()


@receipt.command("list")
@click.option("--status", "-s", type=click.Choice(["received", "validating", "queued", "processing", "success", "failed"]), help="按状态过滤")
@click.option("--limit", "-l", type=int, default=50, help="显示数量")
def receipt_list(status, limit):
    """列出回执"""
    from ..models import ExternalReceipt, ReceiptStatus

    db = get_db()
    try:
        query = db.query(ExternalReceipt)
        if status:
            query = query.filter(ExternalReceipt.status == ReceiptStatus(status))

        receipts = query.order_by(ExternalReceipt.created_at.desc()).limit(limit).all()

        click.echo(f"{'回执编号':<20} {'来源':<15} {'状态':<12} {'重试':<5} {'创建时间':<25}")
        click.echo("-" * 80)
        for r in receipts:
            click.echo(
                f"{r.receipt_no:<20} "
                f"{r.source_system:<15} "
                f"{r.status.value if r.status else '':<12} "
                f"{r.retry_count:<5} "
                f"{r.created_at.strftime('%Y-%m-%d %H:%M:%S') if r.created_at else '':<25}"
            )

        sys.exit(0)
    finally:
        db.close()


@cli.group()
def history():
    """数据历史查询"""
    pass


@history.command("list")
@click.argument("resource_type", type=click.Choice(["shift", "inspection", "rework", "sms"]))
@click.argument("resource_id")
@click.option("--limit", "-l", type=int, default=20, help="显示数量")
def history_list(resource_type, resource_id, limit):
    """查看数据变更历史"""
    from ..models import DataHistory

    db = get_db()
    try:
        histories = db.query(DataHistory).filter(
            DataHistory.resource_type == resource_type,
            DataHistory.resource_id == resource_id
        ).order_by(DataHistory.version.desc()).limit(limit).all()

        click.echo(f"{'版本':<6} {'变更原因':<30} {'变更人':<12} {'创建时间':<25}")
        click.echo("-" * 80)
        for h in histories:
            click.echo(
                f"{h.version:<6} "
                f"{(h.change_reason or '')[:28]:<30} "
                f"{(h.changed_by or ''):<12} "
                f"{h.created_at.strftime('%Y-%m-%d %H:%M:%S') if h.created_at else '':<25}"
            )

        sys.exit(0)
    finally:
        db.close()


if __name__ == "__main__":
    cli()
