import click
import json
from tabulate import tabulate
from rich.console import Console
from rich.table import Table

from .config import APP_VERSION, DEFAULT_DB_PATH, SOURCE_TYPES, SOURCE_TYPE_NAMES
from .database import init_database, check_database_exists, get_database_info
from .importer import import_file, reimport_file, withdraw_batch, list_batches
from .checker import run_all_checks, get_check_results, check_format_for_batch, check_duplicates_for_batch, check_cross_validation, check_credit_substitute
from .fixer import override_check, correct_field, get_corrections, get_record_detail, find_record_by_row
from .reporter import generate_report, get_history, freeze_batch, unfreeze_batch, export_data, export_failed_records, get_export_history

console = Console()


@click.group()
@click.version_option(APP_VERSION)
@click.option('--db', 'db_path', default=DEFAULT_DB_PATH, help='数据库路径')
@click.pass_context
def cli(ctx, db_path):
    """农资门店配送多源导入巡检工具"""
    ctx.ensure_object(dict)
    ctx.obj['db_path'] = db_path


@cli.command()
@click.option('--force', is_flag=True, help='强制重新初始化')
@click.pass_context
def init(ctx, force):
    """初始化数据库"""
    result = init_database(ctx.obj['db_path'], force)
    
    if result['success']:
        console.print(f"[green]{result['message']}[/green]")
    else:
        console.print(f"[yellow]{result['message']}[/yellow]")


@cli.command()
@click.pass_context
def status(ctx):
    """查看数据库状态"""
    if not check_database_exists(ctx.obj['db_path']):
        console.print("[red]数据库不存在，请先执行 init 命令[/red]")
        return
    
    info = get_database_info(ctx.obj['db_path'])
    
    table = Table(title="数据库状态")
    table.add_column("项目", style="cyan")
    table.add_column("值", style="white")
    
    table.add_row("数据库路径", info['db_path'])
    table.add_row("大小", f"{info['size_mb']} MB")
    table.add_row("创建时间", info['created_at'])
    table.add_row("修改时间", info['modified_at'])
    table.add_row("表数量", str(info['table_count']))
    table.add_row("表名", ", ".join(info['tables']))
    
    console.print(table)


@cli.group()
def import_cmd():
    """数据导入相关命令"""
    pass


@import_cmd.command('file')
@click.argument('file_path')
@click.option('--type', 'source_type', required=True, type=click.Choice(SOURCE_TYPES), help='数据类型')
@click.option('--operator', default='system', help='操作人')
@click.option('--remark', default='', help='备注')
@click.pass_context
def import_file_cmd(ctx, file_path, source_type, operator, remark):
    """导入数据文件"""
    result = import_file(file_path, source_type, operator, remark, ctx.obj['db_path'])
    
    if result['success']:
        console.print(f"[green]{result['message']}[/green]")
        console.print(f"批次号: [cyan]{result['batch_no']}[/cyan]")
        console.print(f"数据源: [cyan]{result['source_type_name']}[/cyan]")
        if result['errors']:
            console.print(f"[yellow]前20条错误:[/yellow]")
            for err in result['errors']:
                console.print(f"  行{err['row']}: {err['error']}")
    else:
        console.print(f"[red]{result['message']}[/red]")


@import_cmd.command('reimport')
@click.argument('file_path')
@click.option('--type', 'source_type', required=True, type=click.Choice(SOURCE_TYPES), help='数据类型')
@click.option('--original-batch', 'original_batch', required=True, help='原批次号')
@click.option('--operator', default='system', help='操作人')
@click.pass_context
def reimport_file_cmd(ctx, file_path, source_type, original_batch, operator):
    """重导入数据文件"""
    result = reimport_file(file_path, source_type, original_batch, operator, ctx.obj['db_path'])
    
    if result['success']:
        console.print(f"[green]{result['message']}[/green]")
        console.print(f"新批次号: [cyan]{result['batch_no']}[/cyan]")
        console.print(f"原批次号: [cyan]{result.get('parent_batch', 'N/A')}[/cyan]")
    else:
        console.print(f"[red]{result['message']}[/red]")


@import_cmd.command('withdraw')
@click.argument('batch_no')
@click.option('--reason', required=True, help='撤回原因')
@click.option('--operator', default='system', help='操作人')
@click.pass_context
def withdraw_batch_cmd(ctx, batch_no, reason, operator):
    """撤回批次"""
    result = withdraw_batch(batch_no, reason, operator, ctx.obj['db_path'])
    
    if result['success']:
        console.print(f"[green]{result['message']}[/green]")
        console.print(f"撤回记录数: [cyan]{result['record_count']}[/cyan]")
    else:
        console.print(f"[red]{result['message']}[/red]")


@import_cmd.command('list')
@click.option('--type', 'source_type', type=click.Choice(SOURCE_TYPES), help='按类型筛选')
@click.option('--status', help='按状态筛选')
@click.option('--limit', default=50, help='显示数量')
@click.pass_context
def list_batches_cmd(ctx, source_type, status, limit):
    """列出导入批次"""
    result = list_batches(source_type, status, limit, ctx.obj['db_path'])
    
    if not result['success']:
        console.print(f"[red]{result['message']}[/red]")
        return
    
    if not result['batches']:
        console.print("[yellow]暂无批次[/yellow]")
        return
    
    table = Table(title=f"导入批次列表 (共{result['count']}条)")
    table.add_column("批次号", style="cyan")
    table.add_column("类型", style="green")
    table.add_column("源文件", style="white")
    table.add_column("导入时间", style="blue")
    table.add_column("总数/成功/失败", style="magenta")
    table.add_column("状态", style="yellow")
    table.add_column("冻结", style="red")
    
    for batch in result['batches']:
        table.add_row(
            batch['batch_no'],
            batch['source_type_name'],
            batch['source_file'][-50:],
            batch['imported_at'],
            f"{batch['total_rows']}/{batch['success_rows']}/{batch['failed_rows']}",
            batch['status'],
            "是" if batch['is_frozen'] else "否"
        )
    
    console.print(table)


@cli.group()
def check():
    """数据校验相关命令"""
    pass


@check.command('all')
@click.option('--batch', 'batch_no', help='指定批次号')
@click.pass_context
def check_all_cmd(ctx, batch_no):
    """运行所有校验"""
    result = run_all_checks(batch_no, ctx.obj['db_path'])
    
    if result['success']:
        console.print(f"[green]{result['message']}[/green]")
        console.print(f"问题总数: [red]{result['total_issues']}[/red]")
        
        for check_type, detail in result['details'].items():
            if detail.get('success'):
                count = detail.get('failed_count', 0) + detail.get('duplicate_count', 0) + detail.get('issue_count', 0)
                console.print(f"  {check_type}: {count} 个问题")
    else:
        console.print(f"[red]{result['message']}[/red]")


@check.command('format')
@click.argument('batch_no')
@click.pass_context
def check_format_cmd(ctx, batch_no):
    """格式校验"""
    result = check_format_for_batch(batch_no, ctx.obj['db_path'])
    
    if result['success']:
        console.print(f"[green]{result['message']}[/green]")
        if result['check_results']:
            console.print(f"[yellow]失败项:[/yellow]")
            for r in result['check_results'][:20]:
                console.print(f"  行{r['source_row']} - {r['check_item']}: {r['message']}")
    else:
        console.print(f"[red]{result['message']}[/red]")


@check.command('duplicate')
@click.argument('batch_no')
@click.pass_context
def check_duplicate_cmd(ctx, batch_no):
    """重复校验"""
    result = check_duplicates_for_batch(batch_no, ctx.obj['db_path'])
    
    if result['success']:
        console.print(f"[green]{result['message']}[/green]")
        if result['check_results']:
            for r in result['check_results'][:20]:
                console.print(f"  行{r['source_row']} - {r['message']}")
    else:
        console.print(f"[red]{result['message']}[/red]")


@check.command('cross')
@click.option('--batch', 'batch_no', help='指定批次号')
@click.pass_context
def check_cross_cmd(ctx, batch_no):
    """交叉校验"""
    result = check_cross_validation(batch_no, ctx.obj['db_path'])
    
    if result['success']:
        console.print(f"[green]{result['message']}[/green]")
        if result['check_results']:
            console.print(f"[yellow]不一致项:[/yellow]")
            for r in result['check_results'][:30]:
                console.print(f"  订单{r.get('order_no','')} - {r['message']}")
    else:
        console.print(f"[red]{result['message']}[/red]")


@check.command('credit')
@click.option('--batch', 'batch_no', help='指定批次号')
@click.pass_context
def check_credit_cmd(ctx, batch_no):
    """赊销替代校验"""
    result = check_credit_substitute(batch_no, ctx.obj['db_path'])
    
    if result['success']:
        console.print(f"[green]{result['message']}[/green]")
        if result['check_results']:
            for r in result['check_results'][:30]:
                console.print(f"  订单{r.get('order_no','')} - {r['message']}")
    else:
        console.print(f"[red]{result['message']}[/red]")


@check.command('list')
@click.option('--batch', 'batch_no', help='指定批次号')
@click.option('--type', 'check_type', help='校验类型')
@click.option('--failed-only', is_flag=True, help='只显示失败项')
@click.pass_context
def list_checks_cmd(ctx, batch_no, check_type, failed_only):
    """列出校验结果"""
    result = get_check_results(batch_no, check_type, failed_only, ctx.obj['db_path'])
    
    if not result['success']:
        console.print(f"[red]{result['message']}[/red]")
        return
    
    if not result['results']:
        console.print("[yellow]暂无校验结果[/yellow]")
        return
    
    table = Table(title=f"校验结果 (共{result['count']}条)")
    table.add_column("ID", style="cyan")
    table.add_column("行号", style="green")
    table.add_column("类型", style="blue")
    table.add_column("项", style="magenta")
    table.add_column("通过", style="yellow")
    table.add_column("改判", style="red")
    table.add_column("信息", style="white")
    
    for r in result['results'][:50]:
        table.add_row(
            str(r['id']),
            str(r['source_row'] or ''),
            r['check_type'],
            r['check_item'],
            "是" if r['is_passed'] else "否",
            "是" if r['is_overridden'] else "否",
            r['message'][:50]
        )
    
    console.print(table)


@cli.group()
def fix():
    """数据修复相关命令"""
    pass


@fix.command('override')
@click.argument('check_id', type=int)
@click.option('--reason', required=True, help='改判原因')
@click.option('--operator', default='manual', help='操作人')
@click.pass_context
def override_cmd(ctx, check_id, reason, operator):
    """人工改判校验结果"""
    result = override_check(check_id, reason, operator, ctx.obj['db_path'])
    
    if result['success']:
        console.print(f"[green]{result['message']}[/green]")
        console.print(f"校验ID: [cyan]{result['check_id']}[/cyan]")
        console.print(f"原错误: [yellow]{result['original_message']}[/yellow]")
        console.print(f"改判原因: [cyan]{result['override_reason']}[/cyan]")
    else:
        console.print(f"[red]{result['message']}[/red]")


@fix.command('correct')
@click.argument('record_id', type=int)
@click.option('--field', required=True, help='字段名')
@click.option('--value', 'new_value', required=True, help='新值')
@click.option('--reason', required=True, help='修正原因')
@click.option('--operator', default='manual', help='操作人')
@click.pass_context
def correct_cmd(ctx, record_id, field, new_value, reason, operator):
    """修正字段值"""
    result = correct_field(record_id, field, new_value, reason, operator, ctx.obj['db_path'])
    
    if result['success']:
        console.print(f"[green]{result['message']}[/green]")
        console.print(f"记录ID: [cyan]{result['record_id']}[/cyan]")
        console.print(f"字段: [cyan]{result['field_name']}[/cyan]")
        console.print(f"原值: [yellow]{result['old_value']}[/yellow]")
        console.print(f"新值: [green]{result['new_value']}[/green]")
    else:
        console.print(f"[red]{result['message']}[/red]")


@fix.command('record')
@click.argument('record_id', type=int)
@click.pass_context
def record_detail_cmd(ctx, record_id):
    """查看记录详情"""
    result = get_record_detail(record_id, ctx.obj['db_path'])
    
    if not result['success']:
        console.print(f"[red]{result['message']}[/red]")
        return
    
    rec = result['record']
    
    console.print(f"[bold cyan]记录详情[/bold cyan]")
    console.print(f"记录ID: {rec['id']}")
    console.print(f"批次号: {rec['batch_no']}")
    console.print(f"原始行号: {rec['source_row']}")
    console.print(f"来源文件: {rec['source_file']}")
    
    console.print(f"\n[bold green]标准化数据:[/bold green]")
    for k, v in rec['standard_data'].items():
        console.print(f"  {k}: {v}")
    
    if rec['checks']:
        console.print(f"\n[bold yellow]校验结果:[/bold yellow]")
        for c in rec['checks']:
            status = "✓" if c['passed'] else "✗"
            if c['is_overridden']:
                status += " (已改判)"
            console.print(f"  [{status}] {c['type']}/{c['item']}: {c['message']}")
    
    if rec['corrections']:
        console.print(f"\n[bold magenta]修正历史:[/bold magenta]")
        for c in rec['corrections']:
            console.print(f"  {c['field']}: {c['old_value']} → {c['new_value']} ({c['reason']})")


@fix.command('find')
@click.argument('batch_no')
@click.argument('row_num', type=int)
@click.pass_context
def find_record_cmd(ctx, batch_no, row_num):
    """按批次和行号查找记录"""
    result = find_record_by_row(batch_no, row_num, ctx.obj['db_path'])
    
    if result['success']:
        rec = result['record']
        console.print(f"[green]找到记录[/green]")
        console.print(f"记录ID: [cyan]{rec['id']}[/cyan]")
        console.print(f"订单号: [cyan]{rec['standard_data'].get('order_no', 'N/A')}[/cyan]")
        console.print(f"门店: {rec['standard_data'].get('store_name', 'N/A')}")
        console.print(f"商品: {rec['standard_data'].get('product_name', 'N/A')}")
    else:
        console.print(f"[red]{result['message']}[/red]")


@fix.command('history')
@click.option('--record', 'record_id', type=int, help='记录ID')
@click.option('--batch', 'batch_no', help='批次号')
@click.pass_context
def corrections_history(ctx, record_id, batch_no):
    """查看修正历史"""
    result = get_corrections(record_id, batch_no, ctx.obj['db_path'])
    
    if not result['success'] or not result['corrections']:
        console.print("[yellow]暂无修正记录[/yellow]")
        return
    
    table = Table(title=f"修正历史 (共{result['count']}条)")
    table.add_column("ID", style="cyan")
    table.add_column("行号", style="green")
    table.add_column("字段", style="blue")
    table.add_column("原值", style="yellow")
    table.add_column("新值", style="green")
    table.add_column("原因", style="white")
    table.add_column("操作人", style="magenta")
    
    for c in result['corrections']:
        table.add_row(
            str(c['id']),
            str(c['source_row']),
            c['field_name'],
            str(c['old_value'])[:20],
            str(c['new_value'])[:20],
            c['reason'][:30],
            c['corrected_by']
        )
    
    console.print(table)


@cli.command('report')
@click.option('--batch', 'batch_no', help='指定批次号')
@click.option('--json', 'output_json', is_flag=True, help='输出JSON格式')
@click.pass_context
def report_cmd(ctx, batch_no, output_json):
    """生成巡检报告"""
    result = generate_report(batch_no, True, ctx.obj['db_path'])
    
    if not result['success']:
        console.print(f"[red]{result['message']}[/red]")
        return
    
    if output_json:
        console.print(json.dumps(result, ensure_ascii=False, indent=2))
        return
    
    console.print(f"[bold cyan]巡检报告[/bold cyan]")
    console.print(f"生成时间: {result['generated_at']}")
    if batch_no:
        console.print(f"批次号: {batch_no}")
    
    console.print(f"\n[bold green]数据汇总:[/bold green]")
    for data_type, info in result['data_summary'].items():
        console.print(f"  {info['name']}: {info['count']} 条记录，总金额 {info['total_amount']:.2f}")
    
    console.print(f"\n[bold yellow]问题汇总 (共{result['total_issues']}个):[/bold yellow]")
    for check_type, severities in result['issues_summary'].items():
        for severity, count in severities.items():
            console.print(f"  {check_type}/{severity}: {count}")
    
    if result['failed_records']:
        console.print(f"\n[bold red]失败清单:[/bold red]")
        table = Table()
        table.add_column("行号", style="cyan")
        table.add_column("订单号", style="green")
        table.add_column("校验类型", style="blue")
        table.add_column("严重程度", style="magenta")
        table.add_column("错误信息", style="white")
        
        for r in result['failed_records'][:50]:
            table.add_row(
                str(r['source_row'] or ''),
                r['order_no'] or '',
                r['check_type'],
                r['severity'],
                r['message'][:40]
            )
        
        console.print(table)


@cli.command('history')
@click.option('--start-date', help='开始日期')
@click.option('--end-date', help='结束日期')
@click.option('--operator', help='操作人')
@click.pass_context
def history_cmd(ctx, start_date, end_date, operator):
    """查看导入历史"""
    result = get_history(start_date, end_date, operator, ctx.obj['db_path'])
    
    if not result['success'] or not result['history']:
        console.print("[yellow]暂无历史记录[/yellow]")
        return
    
    table = Table(title=f"导入历史 (共{result['count']}条)")
    table.add_column("批次号", style="cyan")
    table.add_column("类型", style="green")
    table.add_column("导入时间", style="blue")
    table.add_column("操作人", style="magenta")
    table.add_column("总数/成功/失败", style="yellow")
    table.add_column("状态", style="white")
    
    for h in result['history']:
        table.add_row(
            h['batch_no'],
            h['source_type_name'],
            h['imported_at'],
            h['imported_by'],
            f"{h['total_rows']}/{h['success_rows']}/{h['failed_rows']}",
            h['status']
        )
    
    console.print(table)


@cli.group()
def export():
    """数据导出相关命令"""
    pass


@export.command('freeze')
@click.argument('batch_no')
@click.option('--operator', default='system', help='操作人')
@click.pass_context
def freeze_cmd(ctx, batch_no, operator):
    """冻结批次（导出前必需）"""
    result = freeze_batch(batch_no, operator, ctx.obj['db_path'])
    
    if result['success']:
        console.print(f"[green]{result['message']}[/green]")
        console.print(f"冻结时间: [cyan]{result['frozen_at']}[/cyan]")
    else:
        console.print(f"[red]{result['message']}[/red]")


@export.command('unfreeze')
@click.argument('batch_no')
@click.option('--operator', default='system', help='操作人')
@click.pass_context
def unfreeze_cmd(ctx, batch_no, operator):
    """解冻批次"""
    result = unfreeze_batch(batch_no, operator, ctx.obj['db_path'])
    
    if result['success']:
        console.print(f"[green]{result['message']}[/green]")
    else:
        console.print(f"[red]{result['message']}[/red]")


@export.command('data')
@click.option('--batch', 'batch_no', help='指定批次号，不指定则导出所有已冻结批次')
@click.option('--output', '-o', 'output_path', help='输出文件路径')
@click.pass_context
def export_data_cmd(ctx, batch_no, output_path):
    """导出数据（需先冻结）"""
    result = export_data(batch_no, "excel", output_path, ctx.obj['db_path'])
    
    if result['success']:
        console.print(f"[green]{result['message']}[/green]")
        console.print(f"导出号: [cyan]{result['export_no']}[/cyan]")
        console.print(f"记录数: [cyan]{result['record_count']}[/cyan]")
        if result.get('failed_count', 0) > 0:
            console.print(f"包含错误: [red]{result['failed_count']}[/red]")
    else:
        console.print(f"[red]{result['message']}[/red]")


@export.command('failed')
@click.option('--batch', 'batch_no', help='指定批次号')
@click.option('--output', '-o', 'output_path', help='输出文件路径')
@click.pass_context
def export_failed_cmd(ctx, batch_no, output_path):
    """导出失败清单"""
    result = export_failed_records(batch_no, output_path, ctx.obj['db_path'])
    
    if result['success']:
        console.print(f"[green]{result['message']}[/green]")
        console.print(f"记录数: [cyan]{result['record_count']}[/cyan]")
    else:
        console.print(f"[red]{result['message']}[/red]")


@export.command('history')
@click.option('--limit', default=50, help='显示数量')
@click.pass_context
def export_history_cmd(ctx, limit):
    """查看导出历史"""
    result = get_export_history(limit, ctx.obj['db_path'])
    
    if not result['success'] or not result['exports']:
        console.print("[yellow]暂无导出记录[/yellow]")
        return
    
    table = Table(title=f"导出历史 (共{result['count']}条)")
    table.add_column("导出号", style="cyan")
    table.add_column("类型", style="green")
    table.add_column("导出时间", style="blue")
    table.add_column("操作人", style="magenta")
    table.add_column("记录数", style="yellow")
    table.add_column("文件", style="white")
    
    for e in result['exports']:
        table.add_row(
            e['export_no'],
            e['export_type'],
            e['exported_at'],
            e['exported_by'],
            str(e['record_count']),
            e['export_file'][-40:]
        )
    
    console.print(table)


def main():
    cli(obj={})


if __name__ == '__main__':
    main()
