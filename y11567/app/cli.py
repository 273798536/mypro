import sys
import json
import click
from datetime import datetime

from .database import SessionLocal, init_db
from .models import SourceType, WorkOrderStatus, DirtyType
from .services.work_order_service import WorkOrderService
from .services.dirty_record_service import DirtyRecordService
from .services.report_service import ReportService
from .services.export_service import ExportService


EXIT_SUCCESS = 0
EXIT_ERROR = 1
EXIT_NOT_FOUND = 2
EXIT_INVALID_INPUT = 3


def get_db_session():
    return SessionLocal()


@click.group()
@click.version_option(version="1.0.0")
def cli():
    pass


@cli.command("init")
def init():
    try:
        init_db()
        click.echo("数据库初始化成功")
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        click.echo(f"初始化失败: {e}", err=True)
        sys.exit(EXIT_ERROR)


@cli.command("submit")
@click.option("--type", "source_type", required=True,
              type=click.Choice(["inspection", "hotline", "spare_part", "exception_photo", "sms"]),
              help="数据来源类型")
@click.option("--data", required=True, help="JSON格式的数据内容")
@click.option("--source-id", help="源数据ID")
@click.option("--operator", default="cli", help="操作人")
def submit(source_type, data, source_id, operator):
    try:
        content = json.loads(data)
    except json.JSONDecodeError as e:
        click.echo(f"JSON解析错误: {e}", err=True)
        sys.exit(EXIT_INVALID_INPUT)
    
    db = get_db_session()
    try:
        service = WorkOrderService(db)
        wo, clue, is_new = service.submit_clue(
            source_type=SourceType(source_type),
            content=content,
            source_id=source_id,
            operator=operator
        )
        click.echo(f"{'新工单创建' if is_new else '线索添加到现有工单'}:")
        click.echo(f"  工单号: {wo.order_no}")
        click.echo(f"  地点: {wo.location}")
        click.echo(f"  状态: {wo.status.value}")
        click.echo(f"  线索ID: {clue.id}")
        sys.exit(EXIT_SUCCESS)
    except ValueError as e:
        click.echo(str(e), err=True)
        sys.exit(EXIT_INVALID_INPUT)
    except Exception as e:
        click.echo(f"提交失败: {e}", err=True)
        sys.exit(EXIT_ERROR)
    finally:
        db.close()


@cli.command("queue")
@click.option("--status", type=click.Choice(["pending", "processing", "retrying", "manual", "compensated", "closed", "dead_letter"]),
              help="按状态过滤")
@click.option("--limit", default=50, help="显示数量限制")
def queue(status, limit):
    db = get_db_session()
    try:
        service = WorkOrderService(db)
        status_enum = WorkOrderStatus(status) if status else None
        work_orders = service.get_queue(status=status_enum, limit=limit)
        
        if not work_orders:
            click.echo("队列为空")
            sys.exit(EXIT_SUCCESS)
        
        click.echo(f"共 {len(work_orders)} 条记录:")
        click.echo("-" * 80)
        for wo in work_orders:
            click.echo(f"[{wo.id}] {wo.order_no} | {wo.status.value:12} | {wo.location} | 重试:{wo.retry_count}/{wo.max_retries}")
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        click.echo(f"查询失败: {e}", err=True)
        sys.exit(EXIT_ERROR)
    finally:
        db.close()


@cli.command("retry")
@click.option("--id", "work_order_id", type=int, help="指定工单ID，不指定则处理所有可重试工单")
@click.option("--operator", default="cli", help="操作人")
def retry(work_order_id, operator):
    db = get_db_session()
    try:
        service = WorkOrderService(db)
        
        if work_order_id:
            success, msg = service.process_retry(work_order_id, operator)
            click.echo(msg)
            sys.exit(EXIT_SUCCESS if success else EXIT_ERROR)
        else:
            retry_queue = service.get_retry_queue()
            if not retry_queue:
                click.echo("没有需要重试的工单")
                sys.exit(EXIT_SUCCESS)
            
            click.echo(f"处理 {len(retry_queue)} 个重试工单:")
            success_count = 0
            for wo in retry_queue:
                success, msg = service.process_retry(wo.id, operator)
                status = "✓" if success else "✗"
                click.echo(f"  {status} [{wo.id}] {wo.order_no}: {msg}")
                if success:
                    success_count += 1
            
            click.echo(f"完成: {success_count}/{len(retry_queue)} 成功")
            sys.exit(EXIT_SUCCESS if success_count == len(retry_queue) else EXIT_ERROR)
    except Exception as e:
        click.echo(f"重试失败: {e}", err=True)
        sys.exit(EXIT_ERROR)
    finally:
        db.close()


@cli.command("manual")
@click.option("--id", "work_order_id", type=int, required=True, help="工单ID")
@click.option("--handler", required=True, help="处理人")
def manual(work_order_id, handler):
    db = get_db_session()
    try:
        service = WorkOrderService(db)
        success, msg = service.take_manual(work_order_id, handler)
        click.echo(msg)
        sys.exit(EXIT_SUCCESS if success else EXIT_NOT_FOUND)
    except Exception as e:
        click.echo(f"操作失败: {e}", err=True)
        sys.exit(EXIT_ERROR)
    finally:
        db.close()


@cli.command("compensate")
@click.option("--id", "work_order_id", type=int, required=True, help="工单ID")
@click.option("--amount", type=float, required=True, help="补偿金额")
@click.option("--reason", required=True, help="补偿原因")
@click.option("--executor", default="cli", help="执行人")
@click.option("--voucher", help="凭证号")
def compensate(work_order_id, amount, reason, executor, voucher):
    db = get_db_session()
    try:
        service = WorkOrderService(db)
        success, msg = service.compensate(work_order_id, amount, reason, executor, voucher)
        click.echo(msg)
        sys.exit(EXIT_SUCCESS if success else EXIT_NOT_FOUND)
    except Exception as e:
        click.echo(f"补偿失败: {e}", err=True)
        sys.exit(EXIT_ERROR)
    finally:
        db.close()


@cli.command("close")
@click.option("--id", "work_order_id", type=int, required=True, help="工单ID")
@click.option("--operator", default="cli", help="操作人")
@click.option("--remarks", help="备注")
def close(work_order_id, operator, remarks):
    db = get_db_session()
    try:
        service = WorkOrderService(db)
        success, msg = service.close(work_order_id, operator, remarks)
        click.echo(msg)
        sys.exit(EXIT_SUCCESS if success else EXIT_NOT_FOUND)
    except Exception as e:
        click.echo(f"关闭失败: {e}", err=True)
        sys.exit(EXIT_ERROR)
    finally:
        db.close()


@cli.command("detail")
@click.option("--id", "work_order_id", type=int, help="工单ID")
@click.option("--no", "order_no", help="工单号")
def detail(work_order_id, order_no):
    if not work_order_id and not order_no:
        click.echo("必须指定 --id 或 --no", err=True)
        sys.exit(EXIT_INVALID_INPUT)
    
    db = get_db_session()
    try:
        service = WorkOrderService(db)
        report_service = ReportService(db)
        
        if work_order_id:
            wo = service.get_work_order(work_order_id)
        else:
            wo = service.get_work_order_by_no(order_no)
        
        if not wo:
            click.echo("工单不存在", err=True)
            sys.exit(EXIT_NOT_FOUND)
        
        chain = report_service.get_work_order_clue_chain(wo.id)
        history = service.get_history(wo.id)
        
        click.echo(f"工单详情: {wo.order_no}")
        click.echo("-" * 80)
        click.echo(f"地点: {wo.location}")
        click.echo(f"状态: {wo.status.value}")
        click.echo(f"重试次数: {wo.retry_count}/{wo.max_retries}")
        click.echo(f"补偿金额: {wo.compensated_amount}")
        click.echo(f"创建时间: {wo.created_at}")
        click.echo(f"\n线索链 ({len(chain['clues'])} 条):")
        for c in chain["clues"]:
            dirty_marker = " [脏记录]" if c["is_dirty"] else ""
            click.echo(f"  [{c['id']}] {c['source_type']:15} | {c['occurred_at']}{dirty_marker}")
        
        if history:
            click.echo(f"\n操作历史 ({len(history)} 条):")
            for h in history:
                click.echo(f"  {h['operated_at']} | {h['operation']:12} | {h['operator']} | {h['remarks']}")
        
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        click.echo(f"查询失败: {e}", err=True)
        sys.exit(EXIT_ERROR)
    finally:
        db.close()


@cli.command("dirty")
@click.option("--type", "dirty_type", type=click.Choice(["missing_field", "cross_day", "name_changed", "amount_conflict", "quantity_conflict"]),
              help="按脏记录类型过滤")
def dirty(dirty_type):
    db = get_db_session()
    try:
        service = DirtyRecordService(db)
        dt_enum = DirtyType(dirty_type) if dirty_type else None
        clues = service.get_dirty_clues(dt_enum)
        
        if not clues:
            summary = service.get_dirty_summary()
            click.echo(f"没有脏记录 (总计: {summary['total_dirty']})")
            sys.exit(EXIT_SUCCESS)
        
        click.echo(f"共 {len(clues)} 条脏记录:")
        click.echo("-" * 80)
        for c in clues:
            click.echo(f"[{c.id}] {c.source_type.value:15} | {c.dirty_type.value if c.dirty_type else 'unknown':18} | {c.location}")
            click.echo(f"     原因: {c.dirty_reason}")
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        click.echo(f"查询失败: {e}", err=True)
        sys.exit(EXIT_ERROR)
    finally:
        db.close()


@cli.command("correct")
@click.option("--id", "clue_id", type=int, required=True, help="线索ID")
@click.option("--data", required=True, help="修正后的JSON数据")
@click.option("--notes", required=True, help="修正说明")
@click.option("--operator", default="cli", help="操作人")
def correct(clue_id, data, notes, operator):
    try:
        corrected_content = json.loads(data)
    except json.JSONDecodeError as e:
        click.echo(f"JSON解析错误: {e}", err=True)
        sys.exit(EXIT_INVALID_INPUT)
    
    db = get_db_session()
    try:
        service = DirtyRecordService(db)
        success, msg, aggregation = service.correct_clue(clue_id, corrected_content, notes, operator)
        click.echo(msg)
        if success and aggregation:
            click.echo("重新汇总结果:")
            click.echo(f"  已验证线索: {aggregation.get('validated_clues', 0)}")
            click.echo(f"  总灯数: {aggregation.get('total_lamps', 0)}")
            click.echo(f"  总金额: {aggregation.get('total_amount', 0)}")
            click.echo(f"  数据来源: {', '.join(aggregation.get('source_types', []))}")
        sys.exit(EXIT_SUCCESS if success else EXIT_NOT_FOUND)
    except Exception as e:
        click.echo(f"修正失败: {e}", err=True)
        sys.exit(EXIT_ERROR)
    finally:
        db.close()


@cli.command("stats")
def stats():
    db = get_db_session()
    try:
        report_service = ReportService(db)
        dirty_service = DirtyRecordService(db)
        
        retry_summary = report_service.get_retry_category_summary()
        dl_summary = report_service.get_dead_letter_summary()
        recovery_summary = report_service.get_recovery_summary()
        dirty_summary = dirty_service.get_dirty_summary()
        
        click.echo("=" * 60)
        click.echo("城市照明抢修重试补偿队列 - 统计报告")
        click.echo("=" * 60)
        
        click.echo(f"\n【重试分类统计】(最近{retry_summary['period_days']}天)")
        click.echo(f"  总重试次数: {retry_summary['total_retries']}")
        click.echo(f"  成功率: {retry_summary['success_rate']:.1f}%")
        for cat, data in retry_summary["by_category"].items():
            rate = data['success'] / data['total'] * 100 if data['total'] > 0 else 0
            click.echo(f"    {cat:25} | {data['total']:3}次 | 成功{data['success']:3} | 失败{data['failure']:3} | {rate:5.1f}%")
        
        click.echo(f"\n【死信处理】")
        click.echo(f"  总计: {dl_summary['total_dead_letters']}")
        click.echo(f"  已解决: {dl_summary['resolved_count']}")
        click.echo(f"  待处理: {dl_summary['unresolved_count']}")
        for cat, count in dl_summary["by_category"].items():
            click.echo(f"    {cat:25} | {count}条")
        
        click.echo(f"\n【恢复后续跑】(最近{recovery_summary['period_days']}天)")
        click.echo(f"  死信已解决: {recovery_summary['dead_letters_resolved']}")
        click.echo(f"  工单已恢复: {recovery_summary['work_orders_recovered']}")
        
        click.echo(f"\n【脏记录统计】")
        click.echo(f"  总计: {dirty_summary['total_dirty']}")
        for dtype, count in dirty_summary["by_type"].items():
            click.echo(f"    {dtype:25} | {count}条")
        
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        click.echo(f"统计失败: {e}", err=True)
        sys.exit(EXIT_ERROR)
    finally:
        db.close()


@cli.command("export")
@click.option("--format", "fmt", default="json", type=click.Choice(["json", "csv", "excel"]),
              help="导出格式")
@click.option("--output", help="输出文件路径")
@click.option("--id", "work_order_id", type=int, help="导出单个工单")
def export(fmt, output, work_order_id):
    db = get_db_session()
    try:
        service = ExportService(db)
        
        if work_order_id:
            filepath = service.export_single_work_order(work_order_id, format='json' if fmt == 'excel' else fmt)
        elif fmt == 'json':
            filepath = service.export_work_orders_json(output)
        elif fmt == 'csv':
            filepath = service.export_work_orders_csv(output)
        elif fmt == 'excel':
            filepath = service.export_work_orders_excel(output)
        
        click.echo(f"导出成功: {filepath}")
        sys.exit(EXIT_SUCCESS)
    except ImportError as e:
        click.echo(f"导出失败: 需要安装依赖 - {e}", err=True)
        sys.exit(EXIT_ERROR)
    except ValueError as e:
        click.echo(str(e), err=True)
        sys.exit(EXIT_NOT_FOUND)
    except Exception as e:
        click.echo(f"导出失败: {e}", err=True)
        sys.exit(EXIT_ERROR)
    finally:
        db.close()


@cli.command("resolve-dl")
@click.option("--id", "dl_id", type=int, required=True, help="死信ID")
@click.option("--by", "resolved_by", required=True, help="处理人")
@click.option("--notes", required=True, help="处理说明")
@click.option("--recover", is_flag=True, help="恢复工单到待处理状态")
def resolve_dl(dl_id, resolved_by, notes, recover):
    db = get_db_session()
    try:
        service = ReportService(db)
        success, msg = service.resolve_dead_letter(dl_id, resolved_by, notes, recover)
        click.echo(msg)
        sys.exit(EXIT_SUCCESS if success else EXIT_NOT_FOUND)
    except Exception as e:
        click.echo(f"操作失败: {e}", err=True)
        sys.exit(EXIT_ERROR)
    finally:
        db.close()


if __name__ == "__main__":
    cli()
