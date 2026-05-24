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


if __name__ == "__main__":
    cli()
