#!/usr/bin/env python3
import click
import sys
import os
import json
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, Base, engine
from app.enums import BatchStatus, DuplicateStrategy, AttachmentType, TaskStatus
from app.schemas import (
    BatchCreate, BatchUpdate, BatchReview, BatchFreeze, BatchCancel,
    WorkOrderCreate, AttachmentCreate,
)
from app.services import (
    batch_service,
    attachment_service,
    task_service,
    export_service,
    change_log_service,
)

Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        return db
    finally:
        pass


@click.group()
@click.version_option(version="1.0.0")
def cli():
    """城市照明抢修异常回执状态机 CLI"""
    pass


@cli.group()
def batch():
    """批次管理命令"""
    pass


@batch.command("create")
@click.option("--batch-no", required=True, help="批次号")
@click.option("--name", required=True, help="批次名称")
@click.option("--description", help="批次描述")
@click.option("--road-section", help="路段")
@click.option("--shift", help="班次")
@click.option("--operator", help="操作员")
@click.option("--spare-part-batch", help="备件批次")
def batch_create(batch_no, name, description, road_section, shift, operator, spare_part_batch):
    """创建新批次"""
    db = get_db()
    try:
        batch_data = BatchCreate(
            batch_no=batch_no,
            name=name,
            description=description,
            road_section=road_section,
            shift=shift,
            operator=operator,
            spare_part_batch=spare_part_batch,
            work_orders=[],
        )
        result = batch_service.create_batch(db, batch_data, created_by=operator)
        click.echo(json.dumps({
            "id": result.id,
            "batch_no": result.batch_no,
            "name": result.name,
            "status": result.status,
        }, ensure_ascii=False, indent=2))
        sys.exit(0)
    except ValueError as e:
        click.echo(f"错误: {e}", err=True)
        sys.exit(1)
    finally:
        db.close()


@batch.command("list")
@click.option("--status", type=click.Choice([s.value for s in BatchStatus]), help="按状态筛选")
@click.option("--road-section", help="按路段筛选")
@click.option("--limit", default=20, help="显示数量")
def batch_list(status, road_section, limit):
    """列出批次"""
    db = get_db()
    try:
        status_enum = BatchStatus(status) if status else None
        batches, total = batch_service.get_batches(db, limit=limit, status=status_enum, road_section=road_section)
        
        click.echo(f"共 {total} 个批次:")
        for b in batches:
            click.echo(f"  [{b.id}] {b.batch_no} - {b.name} - {b.status} - {b.road_section or '未指定路段'}")
        sys.exit(0)
    finally:
        db.close()


@batch.command("show")
@click.argument("batch_id", type=int)
def batch_show(batch_id):
    """显示批次详情"""
    db = get_db()
    try:
        b = batch_service.get_batch(db, batch_id)
        if not b:
            click.echo(f"错误: 批次 {batch_id} 不存在", err=True)
            sys.exit(1)
        
        click.echo(f"批次号: {b.batch_no}")
        click.echo(f"名称: {b.name}")
        click.echo(f"状态: {b.status}")
        click.echo(f"路段: {b.road_section or '-'}")
        click.echo(f"班次: {b.shift or '-'}")
        click.echo(f"总工单数: {b.total_work_orders}")
        click.echo(f"异常工单数: {b.abnormal_count}")
        if b.frozen_at:
            click.echo(f"冻结时间: {b.frozen_at}")
            click.echo(f"冻结原因: {b.freeze_reason}")
            click.echo(f"冻结前状态: {b.status_before_freeze}")
        click.echo(f"创建时间: {b.created_at}")
        
        if b.work_orders:
            click.echo("\n工单列表:")
            for wo in b.work_orders:
                abnormal = " [异常]" if wo.is_abnormal else ""
                click.echo(f"  - {wo.order_no}: {wo.pole_number or '-'} {abnormal}")
        
        sys.exit(0)
    finally:
        db.close()


@batch.command("submit")
@click.argument("batch_id", type=int)
def batch_submit(batch_id):
    """提交批次审核"""
    db = get_db()
    try:
        result = batch_service.submit_for_review(db, batch_id)
        click.echo(f"批次 {result.batch_no} 已提交审核，当前状态: {result.status}")
        sys.exit(0)
    except ValueError as e:
        click.echo(f"错误: {e}", err=True)
        sys.exit(1)
    finally:
        db.close()


@batch.command("review")
@click.argument("batch_id", type=int)
@click.option("--result", type=click.Choice(["approved", "rejected"]), required=True, help="复核结果")
@click.option("--comment", help="复核意见")
@click.option("--reviewed-by", required=True, help="复核人")
def batch_review(batch_id, result, comment, reviewed_by):
    """复核批次"""
    db = get_db()
    try:
        review_data = BatchReview(
            review_result=result,
            review_comment=comment,
            reviewed_by=reviewed_by,
        )
        result_batch = batch_service.review_batch(db, batch_id, review_data)
        click.echo(f"批次 {result_batch.batch_no} 复核完成，当前状态: {result_batch.status}")
        sys.exit(0)
    except ValueError as e:
        click.echo(f"错误: {e}", err=True)
        sys.exit(1)
    finally:
        db.close()


@batch.command("freeze")
@click.argument("batch_id", type=int)
@click.option("--reason", required=True, help="冻结原因")
@click.option("--frozen-by", required=True, help="冻结人")
def batch_freeze(batch_id, reason, frozen_by):
    """冻结批次"""
    db = get_db()
    try:
        freeze_data = BatchFreeze(freeze_reason=reason, frozen_by=frozen_by)
        result = batch_service.freeze_batch(db, batch_id, freeze_data)
        click.echo(f"批次 {result.batch_no} 已冻结，冻结前状态: {result.status_before_freeze}")
        sys.exit(0)
    except ValueError as e:
        click.echo(f"错误: {e}", err=True)
        sys.exit(1)
    finally:
        db.close()


@batch.command("unfreeze")
@click.argument("batch_id", type=int)
def batch_unfreeze(batch_id):
    """解冻批次"""
    db = get_db()
    try:
        result = batch_service.unfreeze_batch(db, batch_id)
        click.echo(f"批次 {result.batch_no} 已解冻，当前状态: {result.status}")
        sys.exit(0)
    except ValueError as e:
        click.echo(f"错误: {e}", err=True)
        sys.exit(1)
    finally:
        db.close()


@batch.command("settle")
@click.argument("batch_id", type=int)
def batch_settle(batch_id):
    """结算批次"""
    db = get_db()
    try:
        result = batch_service.settle_batch(db, batch_id)
        click.echo(f"批次 {result.batch_no} 已结算")
        sys.exit(0)
    except ValueError as e:
        click.echo(f"错误: {e}", err=True)
        sys.exit(1)
    finally:
        db.close()


@batch.command("archive")
@click.argument("batch_id", type=int)
def batch_archive(batch_id):
    """归档批次"""
    db = get_db()
    try:
        result = batch_service.archive_batch(db, batch_id)
        click.echo(f"批次 {result.batch_no} 已归档")
        sys.exit(0)
    except ValueError as e:
        click.echo(f"错误: {e}", err=True)
        sys.exit(1)
    finally:
        db.close()


@batch.command("cancel")
@click.argument("batch_id", type=int)
@click.option("--reason", required=True, help="撤销原因")
@click.option("--cancelled-by", required=True, help="撤销人")
def batch_cancel(batch_id, reason, cancelled_by):
    """撤销批次"""
    db = get_db()
    try:
        cancel_data = BatchCancel(cancel_reason=reason, cancelled_by=cancelled_by)
        result = batch_service.cancel_batch(db, batch_id, cancel_data)
        click.echo(f"批次 {result.batch_no} 已撤销")
        sys.exit(0)
    except ValueError as e:
        click.echo(f"错误: {e}", err=True)
        sys.exit(1)
    finally:
        db.close()


@batch.command("logs")
@click.argument("batch_id", type=int)
@click.option("--limit", default=50, help="显示数量")
def batch_logs(batch_id, limit):
    """查看批次变更日志"""
    db = get_db()
    try:
        logs = change_log_service.get_change_logs_by_batch(db, batch_id, limit=limit)
        click.echo(f"批次 {batch_id} 变更日志 ({len(logs)} 条):")
        for log in logs:
            click.echo(f"  [{log.created_at}] {log.changed_by or '系统'} - {log.change_type}")
            if log.field_name:
                click.echo(f"    字段: {log.field_name}")
                if log.old_value:
                    click.echo(f"    旧值: {log.old_value}")
                if log.new_value:
                    click.echo(f"    新值: {log.new_value}")
                if log.change_reason:
                    click.echo(f"    原因: {log.change_reason}")
        sys.exit(0)
    finally:
        db.close()


@cli.group()
def workorder():
    """工单管理命令"""
    pass


@workorder.command("add")
@click.argument("batch_id", type=int)
@click.option("--order-no", required=True, help="工单号")
@click.option("--road-section", help="路段")
@click.option("--pole-number", help="灯杆号")
@click.option("--fault", help="故障描述")
@click.option("--is-abnormal", is_flag=True, help="是否异常")
@click.option("--abnormal-reason", help="异常原因")
@click.option("--shift", help="班次")
@click.option("--operator", help="操作员")
@click.option("--duplicate-strategy", 
              type=click.Choice([s.value for s in DuplicateStrategy]), 
              default="ignore",
              help="重复工单处理策略")
def workorder_add(batch_id, order_no, road_section, pole_number, fault, is_abnormal, abnormal_reason, shift, operator, duplicate_strategy):
    """添加工单到批次"""
    db = get_db()
    try:
        wo = WorkOrderCreate(
            order_no=order_no,
            road_section=road_section,
            pole_number=pole_number,
            fault_description=fault,
            is_abnormal=is_abnormal,
            abnormal_reason=abnormal_reason,
            shift=shift,
            operator=operator,
        )
        strategy = DuplicateStrategy(duplicate_strategy)
        results, added, skipped = batch_service.add_work_orders(db, batch_id, [wo], strategy)
        click.echo(f"添加完成: 新增 {added} 条, 跳过 {skipped} 条")
        sys.exit(0)
    except ValueError as e:
        click.echo(f"错误: {e}", err=True)
        sys.exit(1)
    finally:
        db.close()


@cli.group()
def attachment():
    """附件管理命令"""
    pass


@attachment.command("upload")
@click.argument("batch_id", type=int)
@click.argument("file_path", type=click.Path(exists=True))
@click.option("--file-type", 
              type=click.Choice([t.value for t in AttachmentType]),
              default="other",
              help="附件类型")
@click.option("--description", help="附件描述")
@click.option("--uploaded-by", help="上传人")
def attachment_upload(batch_id, file_path, file_type, description, uploaded_by):
    """上传附件到批次"""
    db = get_db()
    try:
        with open(file_path, "rb") as f:
            content = f.read()
        
        filename = os.path.basename(file_path)
        saved_path = attachment_service.save_uploaded_file(content, filename, batch_id=batch_id)
        
        attachment_data = AttachmentCreate(
            file_name=filename,
            file_path=saved_path,
            file_size=len(content),
            file_type=AttachmentType(file_type),
            description=description,
            uploaded_by=uploaded_by,
        )
        
        result = attachment_service.create_attachment(db, attachment_data, batch_id=batch_id)
        click.echo(f"附件上传成功: {result.id} - {result.file_name}")
        sys.exit(0)
    except ValueError as e:
        click.echo(f"错误: {e}", err=True)
        sys.exit(1)
    finally:
        db.close()


@cli.group()
def export():
    """导出命令"""
    pass


@export.command("summary")
@click.option("--batch-ids", multiple=True, type=int, help="指定批次ID，可多次指定")
@click.option("--format", "fmt", type=click.Choice(["xlsx", "csv", "json"]), default="xlsx", help="导出格式")
@click.option("--include-frozen/--no-include-frozen", default=True, help="是否包含冻结批次")
@click.option("--include-logs/--no-include-logs", default=True, help="是否包含变更日志")
def export_summary(batch_ids, fmt, include_frozen, include_logs):
    """导出批次汇总"""
    db = get_db()
    try:
        batch_id_list = list(batch_ids) if batch_ids else None
        filepath = export_service.export_batch_summary(
            db,
            batch_ids=batch_id_list,
            include_frozen=include_frozen,
            include_change_logs=include_logs,
            format=fmt,
        )
        click.echo(f"导出成功: {filepath}")
        sys.exit(0)
    except ValueError as e:
        click.echo(f"错误: {e}", err=True)
        sys.exit(1)
    finally:
        db.close()


@cli.command("stats")
def show_stats():
    """显示统计信息"""
    db = get_db()
    try:
        stats = export_service.get_statistics(db)
        click.echo("系统统计:")
        click.echo(f"  总批次数: {stats['total_batches']}")
        click.echo(f"  总工单数: {stats['total_work_orders']}")
        click.echo(f"  异常工单数: {stats['abnormal_count']}")
        click.echo(f"  异常率: {stats['abnormal_rate'] * 100:.1f}%")
        click.echo(f"  冻结批次数: {stats['frozen_count']}")
        click.echo(f"  含异常的冻结批次数: {stats['frozen_with_abnormal']}")
        click.echo("\n批次状态分布:")
        for status, count in stats['batch_status_stats'].items():
            if count > 0:
                click.echo(f"  {status}: {count}")
        sys.exit(0)
    finally:
        db.close()


@cli.group()
def task():
    """任务管理命令"""
    pass


@task.command("list")
@click.option("--status", type=click.Choice([s.value for s in TaskStatus]), help="按状态筛选")
@click.option("--limit", default=50, help="显示数量")
def task_list(status, limit):
    """列出异步任务"""
    db = get_db()
    try:
        status_enum = TaskStatus(status) if status else None
        tasks = task_service.get_tasks(db, status=status_enum, limit=limit)
        
        for t in tasks:
            click.echo(f"[{t.task_id}] {t.task_type} - {t.status} ({t.progress}%) - {t.message or ''}")
        sys.exit(0)
    finally:
        db.close()


@task.command("retry")
@click.argument("task_id")
@click.option("--reset-retries", is_flag=True, help="重置重试次数")
def task_retry(task_id, reset_retries):
    """重试失败的任务"""
    db = get_db()
    try:
        result = task_service.retry_task(db, task_id, reset_retries)
        click.echo(f"任务 {task_id} 已重置，状态: {result.status}")
        sys.exit(0)
    except ValueError as e:
        click.echo(f"错误: {e}", err=True)
        sys.exit(1)
    finally:
        db.close()


@cli.command("api")
@click.option("--host", default="0.0.0.0", help="监听地址")
@click.option("--port", default=8000, type=int, help="监听端口")
@click.option("--reload", is_flag=True, help="自动重载")
def run_api(host, port, reload):
    """启动 API 服务器"""
    import uvicorn
    click.echo(f"启动 API 服务器: {host}:{port}")
    click.echo(f"API 文档: http://{host}:{port}/docs")
    uvicorn.run("app.api:app", host=host, port=port, reload=reload)


if __name__ == "__main__":
    cli()
