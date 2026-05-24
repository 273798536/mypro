import os
import click
from tabulate import tabulate
from .database import Database
from .config import load_config, save_config
from .importer import DataImporter
from .checker import DataChecker
from .fixer import DataFixer
from .reporter import Reporter
from .history import HistoryManager
from .exporter import DataExporter


def get_db():
    config = load_config()
    db_path = config['database']['path']
    if not os.path.isabs(db_path):
        db_path = os.path.join(os.getcwd(), db_path)
    return Database(db_path)


@click.group()
@click.version_option(version='1.0.0', prog_name='lighting')
def cli():
    """城市照明抢修多源导入巡检 CLI"""
    pass


@cli.command()
@click.option('--reset', is_flag=True, help='重置数据库（删除所有数据）')
def init(reset):
    """初始化数据库和配置"""
    config = load_config()
    save_config(config)
    click.echo(f'配置文件已创建: lighting_config.yaml')
    
    db = get_db()
    if reset:
        db.reset_db()
        click.echo('数据库已重置')
    else:
        db.init_db()
        click.echo('数据库已初始化')
    
    click.echo('初始化完成！')


@cli.command(name='import')
@click.argument('source_type', type=click.Choice(['photo', 'hotline', 'spare_part', 'approval_email']))
@click.argument('source_path')
@click.option('--strategy', type=click.Choice(['ignore', 'append', 'overwrite']), default='ignore',
              help='重复数据处理策略: ignore(忽略,默认), append(追加合并), overwrite(覆盖)')
@click.option('--imported-by', default='system', help='导入人')
def import_data(source_type, source_path, strategy, imported_by):
    """导入数据: photo(照片), hotline(热线), spare_part(备件), approval_email(审批邮件)"""
    if not os.path.exists(source_path):
        click.echo(f'错误: 路径不存在 - {source_path}', err=True)
        return
    
    config = load_config()
    db = get_db()
    session = db.get_session()
    
    try:
        importer = DataImporter(session, config)
        result = importer.import_data(source_type, source_path, strategy, imported_by)
        
        click.echo('导入完成！')
        click.echo(f'批次ID: {result["batch_id"]}')
        click.echo(f'总行数: {result["total"]}')
        click.echo(f'成功: {result["success"]}')
        click.echo(f'失败: {result["failed"]}')
        click.echo(f'跳过: {result["skipped"]}')
    except Exception as e:
        click.echo(f'导入失败: {e}', err=True)
    finally:
        session.close()


@cli.command()
@click.option('--batch-id', help='指定批次ID')
@click.option('--retry', is_flag=True, help='重试可自动恢复的失败任务')
def check(batch_id, retry):
    """校验数据完整性和业务规则"""
    config = load_config()
    db = get_db()
    session = db.get_session()
    
    try:
        checker = DataChecker(session, config)
        
        if retry:
            retry_result = checker.retry_failed_tasks()
            click.echo(f'已重试: {retry_result["retried"]} 个任务')
        
        result = checker.check_all(batch_id)
        
        click.echo('校验完成！')
        click.echo(f'已校验: {result["checked"]}')
        click.echo(f'通过: {result["passed"]}')
        click.echo(f'失败: {result["failed"]}')
        if result['failed'] > 0:
            click.echo(f'  - 可重试: {result["retryable"]}')
            click.echo(f'  - 待人工: {result["manual"]}')
            click.echo(f'  - 永久失败: {result["permanent"]}')
        
        if result['failed'] > 0:
            failed_wo = checker.get_failed_work_orders(batch_id=batch_id)
            click.echo('\n失败工单列表:')
            table_data = []
            for wo in failed_wo[:10]:
                table_data.append([
                    wo.id,
                    wo.original_line_number or 'N/A',
                    wo.location,
                    wo.check_error_type,
                    (wo.check_error or '')[:50]
                ])
            headers = ['工单ID', '原始行号', '位置', '错误类型', '错误详情']
            click.echo(tabulate(table_data, headers=headers, tablefmt='simple'))
            if len(failed_wo) > 10:
                click.echo(f'... 还有 {len(failed_wo) - 10} 条失败记录')
    except Exception as e:
        click.echo(f'校验失败: {e}', err=True)
    finally:
        session.close()


@cli.command()
@click.option('--id', 'work_order_id', type=int, help='工单ID')
@click.option('--field', multiple=True, help='要修改的字段名')
@click.option('--value', multiple=True, help='对应字段的新值')
@click.option('--reason', default='manual_fix', help='修改原因')
@click.option('--fixed-by', default='manual', help='修改人')
@click.option('--approve', is_flag=True, help='标记为人工审核通过')
def fix(work_order_id, field, value, reason, fixed_by, approve):
    """修正数据"""
    config = load_config()
    db = get_db()
    session = db.get_session()
    
    try:
        fixer = DataFixer(session, config)
        
        if approve:
            result = fixer.mark_as_manual_fixed(work_order_id, fixed_by)
            if result['success']:
                click.echo(f'工单 {work_order_id} 已标记为人工审核通过')
            else:
                click.echo(f'操作失败: {result.get("error")}')
            return
        
        if not work_order_id or not field or not value:
            click.echo('请指定工单ID、字段和值，或使用 --approve')
            return
        
        if len(field) != len(value):
            click.echo('错误: 字段数量和值数量不匹配')
            return
        
        field_updates = dict(zip(field, value))
        result = fixer.fix_work_order(work_order_id, field_updates, fixed_by, reason)
        
        if result['success']:
            if result['updated_fields']:
                click.echo(f'已更新字段: {", ".join(result["updated_fields"])}')
            else:
                click.echo('没有字段需要更新')
        else:
            click.echo(f'操作失败: {result.get("error")}')
    except Exception as e:
        click.echo(f'操作失败: {e}', err=True)
    finally:
        session.close()


@cli.command()
@click.option('--batch-id', help='指定批次ID')
@click.option('--format', 'output_format', type=click.Choice(['txt', 'csv', 'xlsx']), default='txt',
              help='输出格式')
def report(batch_id, output_format):
    """生成巡检报告（重点：原始行号、失败清单、修正指引）"""
    config = load_config()
    db = get_db()
    session = db.get_session()
    
    try:
        reporter = Reporter(session, config)
        result = reporter.generate_report(batch_id, output_format)
        click.echo(f'报告已生成: {result["path"]}')
    except Exception as e:
        click.echo(f'生成报告失败: {e}', err=True)
    finally:
        session.close()


@cli.command()
@click.option('--work-order-id', type=int, help='按工单ID查询')
@click.option('--fact-id', help='按事实ID查询')
@click.option('--batch-id', help='按批次ID查询')
@click.option('--batches', 'show_batches', is_flag=True, help='显示所有导入批次')
@click.option('--limit', type=int, default=50, help='显示条数')
def history(work_order_id, fact_id, batch_id, show_batches, limit):
    """查看审计历史和变更记录"""
    db = get_db()
    session = db.get_session()
    
    try:
        manager = HistoryManager(session)
        
        if show_batches:
            batches = manager.get_all_import_batches()
            click.echo(manager.format_batches_table(batches))
            return
        
        if batch_id:
            logs = manager.get_batch_history(batch_id, limit)
        else:
            logs = manager.get_work_order_history(work_order_id, fact_id, limit)
        
        if logs:
            click.echo(manager.format_history_table(logs))
        else:
            click.echo('没有找到历史记录')
    except Exception as e:
        click.echo(f'查询失败: {e}', err=True)
    finally:
        session.close()


@cli.command(name='export')
@click.option('--format', 'output_format', type=click.Choice(['csv', 'xlsx', 'json']), default='csv',
              help='导出格式')
@click.option('--batch-id', help='指定批次ID')
@click.option('--status', type=click.Choice(['passed', 'failed', 'unchecked']), help='筛选状态')
@click.option('--output', help='输出文件路径')
def export_data(output_format, batch_id, status, output):
    """导出数据"""
    config = load_config()
    db = get_db()
    session = db.get_session()
    
    try:
        exporter = DataExporter(session, config)
        result = exporter.export_work_orders(output_format, batch_id, status, output)
        click.echo(f'已导出 {result["count"]} 条记录到: {result["path"]}')
    except Exception as e:
        click.echo(f'导出失败: {e}', err=True)
    finally:
        session.close()


if __name__ == '__main__':
    cli()
