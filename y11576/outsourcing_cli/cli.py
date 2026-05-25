import json
import csv
import sys
from pathlib import Path
from datetime import datetime

import click
from tabulate import tabulate

from .database import Database
from .core import (
    ImportManager, ReconciliationEngine, 
    VALID_FILE_TYPES, FILE_TYPE_NAMES
)


def get_db():
    return Database()


def print_table(data, headers):
    click.echo(tabulate(data, headers=headers, tablefmt='simple'))


@click.group()
@click.version_option(version='1.0.0')
def cli():
    pass


@cli.command()
def init():
    db = get_db()
    db.init_db()
    click.secho("✓ 数据库初始化成功！", fg='green')
    click.echo(f"数据库位置: {db.db_path}")


@cli.command()
@click.option('--batch-id', required=True, help='批次号，如 BATCH-2024-001')
@click.option('--file-type', required=True, 
              type=click.Choice(VALID_FILE_TYPES),
              help=f'文件类型: {", ".join(VALID_FILE_TYPES)}')
@click.option('--file', 'file_path', required=True, type=click.Path(exists=True),
              help='导入文件路径 (支持 Excel/CSV)')
@click.option('--operator', default='system', help='操作人')
def import_file(batch_id, file_type, file_path, operator):
    db = get_db()
    manager = ImportManager(db)
    
    try:
        result = manager.import_file(batch_id, file_path, file_type, operator)
        
        click.echo()
        click.secho(f"=== 导入结果 ===", fg='cyan', bold=True)
        click.echo(f"批次号: {result.batch_id}")
        click.echo(f"文件类型: {FILE_TYPE_NAMES.get(file_type, file_type)}")
        click.echo(f"文件名: {result.file_name}")
        click.echo(f"总行数: {result.total_rows}")
        click.echo(f"成功: {result.success_rows}")
        click.echo(f"失败: {result.failed_rows}")
        
        if result.is_duplicate:
            click.secho("⚠ 警告: 该文件内容之前已导入过 (内容重复)", fg='yellow')
        
        if result.errors:
            click.echo()
            click.secho(f"=== 失败清单 ({len(result.errors)} 条) ===", fg='red', bold=True)
            error_data = [
                [e['original_row'], 
                 str(e.get('raw_data', {}).get('物料编码', 'N/A'))[:20], 
                 e['error']]
                for e in result.errors
            ]
            print_table(error_data, ['原始行号', '物料编码', '错误原因'])
            
            with open(f'{batch_id}_failures.csv', 'w', newline='', encoding='utf-8-sig') as f:
                writer = csv.writer(f)
                writer.writerow(['原始行号', '物料编码', '错误原因', '原始数据'])
                for e in result.errors:
                    writer.writerow([
                        e['original_row'],
                        e.get('raw_data', {}).get('物料编码', ''),
                        e['error'],
                        json.dumps(e.get('raw_data', {}), ensure_ascii=False)
                    ])
            click.echo()
            click.secho(f"✓ 失败清单已导出: {batch_id}_failures.csv", fg='yellow')
        
        click.echo()
        if result.failed_rows == 0:
            click.secho("✓ 导入完成，全部成功！", fg='green')
        elif result.success_rows > 0:
            click.secho("⚠ 导入完成，部分成功，请修正失败行后重新导入", fg='yellow')
        else:
            click.secho("✗ 导入失败，无成功记录", fg='red')
            sys.exit(1)
            
    except Exception as e:
        click.secho(f"✗ 导入出错: {str(e)}", fg='red')
        sys.exit(1)


@cli.command()
@click.option('--batch-id', required=True, help='批次号')
@click.option('--operator', default='system', help='操作人')
def check(batch_id, operator):
    db = get_db()
    engine = ReconciliationEngine(db)
    
    try:
        result = engine.calculate_batch(batch_id, operator)
        
        click.echo()
        click.secho(f"=== 对账检查结果 ===", fg='cyan', bold=True)
        click.echo(f"批次号: {batch_id}")
        click.echo(f"产品数: {result['total_products']}")
        click.echo(f"需人工复核: {result['needs_review']}")
        
        click.echo()
        click.secho("=== 对账明细 ===", fg='cyan')
        table_data = []
        for r in result['records']:
            status_color = 'green' if r['status'] == 'success' else 'yellow'
            status_display = click.style(r['status'], fg=status_color)
            table_data.append([
                r['product_code'],
                r['product_name'][:15],
                r['delivery'],
                r['repair'],
                r['deduction'],
                r['final_settlement'],
                status_display
            ])
        
        print_table(table_data, 
                   ['物料编码', '产品名称', '送货数', '返修数', '扣款', '结算数', '状态'])
        
        if result['needs_review'] > 0:
            click.echo()
            click.secho("⚠ 有产品需要人工复核，请使用 fix 命令进行改判", fg='yellow')
        
    except Exception as e:
        click.secho(f"✗ 检查出错: {str(e)}", fg='red')
        sys.exit(1)


@cli.command('fix')
@click.option('--batch-id', required=True, help='批次号')
@click.option('--product-code', required=True, help='物料编码')
@click.option('--new-settlement', required=True, type=float, help='新的结算数量')
@click.option('--reason', required=True, help='改判原因')
@click.option('--operator', default='system', help='操作人')
def manual_fix(batch_id, product_code, new_settlement, reason, operator):
    db = get_db()
    
    try:
        db.manual_override(batch_id, product_code, new_settlement, reason, operator)
        click.secho(f"✓ 人工改判成功！", fg='green')
        click.echo(f"批次: {batch_id}")
        click.echo(f"物料: {product_code}")
        click.echo(f"新结算数: {new_settlement}")
        click.echo(f"原因: {reason}")
    except ValueError as e:
        click.secho(f"✗ 改判失败: {str(e)}", fg='red')
        sys.exit(1)


@cli.command()
@click.option('--batch-id', required=True, help='批次号')
@click.option('--operator', default='system', help='操作人')
def freeze(batch_id, operator):
    db = get_db()
    count = db.freeze_batch(batch_id, operator)
    
    if count > 0:
        click.secho(f"✓ 已冻结 {count} 条对账记录", fg='green')
    else:
        click.secho("⚠ 没有需要冻结的记录", fg='yellow')


@cli.command()
@click.option('--batch-id', required=True, help='批次号')
def report(batch_id):
    db = get_db()
    
    failed = db.get_failed_records(batch_id)
    reconciliations = db.get_reconciliation_records(batch_id)
    
    click.echo()
    click.secho(f"=== 批次 {batch_id} 完整报告 ===", fg='cyan', bold=True)
    click.echo()
    
    if failed:
        click.secho(f"=== 1. 导入失败记录 ({len(failed)} 条) ===", fg='red')
        table_data = []
        for f in failed:
            table_data.append([
                FILE_TYPE_NAMES.get(f['file_type'], f['file_type']),
                f['file_name'],
                f['original_row_number'],
                f['status'],
                f['check_result']
            ])
        print_table(table_data, ['文件类型', '文件名', '原始行号', '状态', '错误'])
        click.echo()
    
    click.secho(f"=== 2. 对账结果 ({len(reconciliations)} 条) ===", fg='green')
    table_data = []
    for r in reconciliations:
        flags = []
        if r['is_frozen']:
            flags.append('已冻结')
        if r['is_manual_override']:
            flags.append('人工改判')
        
        status_display = r['status']
        if flags:
            status_display += ' (' + ','.join(flags) + ')'
        
        table_data.append([
            r['product_code'],
            r['product_name'][:15],
            r['delivery_quantity'] or 0,
            r['repair_quantity'] or 0,
            r['deduction_amount'] or 0,
            r['final_settlement'] or 0,
            status_display
        ])
    print_table(table_data, 
               ['物料编码', '产品名称', '送货数', '返修数', '扣款', '结算数', '状态'])
    
    click.echo()
    manual_count = len([r for r in reconciliations if r['is_manual_override']])
    frozen_count = len([r for r in reconciliations if r['is_frozen']])
    click.echo(f"统计: 总记录 {len(reconciliations)} | 人工改判 {manual_count} | 已冻结 {frozen_count}")


@cli.command()
@click.option('--batch-id', help='批次号（不指定则显示所有批次）')
@click.option('--limit', default=50, help='显示条数')
def history(batch_id, limit):
    db = get_db()
    
    if batch_id:
        logs = db.get_audit_history(batch_id, limit)
        click.echo()
        click.secho(f"=== 批次 {batch_id} 操作轨迹 ===", fg='cyan', bold=True)
    else:
        batches = db.get_all_batches()
        click.echo()
        click.secho(f"=== 所有批次列表 ===", fg='cyan', bold=True)
        for b in batches:
            click.echo(f"  • {b}")
        return
    
    click.echo()
    table_data = []
    for log in logs:
        old = log['old_value']
        new = log['new_value']
        if old and len(old) > 30:
            old = old[:27] + '...'
        if new and len(new) > 30:
            new = new[:27] + '...'
        
        table_data.append([
            log['timestamp'][:19],
            log['action'],
            log['operator'],
            log['record_id'] or '-',
            old or '-',
            new or '-',
            log['reason'] or '-'
        ])
    
    print_table(table_data, 
               ['时间', '操作', '操作人', '记录ID', '旧值', '新值', '原因'])


@cli.command()
@click.option('--batch-id', required=True, help='批次号')
@click.option('--format', 'export_format', default='csv', 
              type=click.Choice(['csv', 'json']), help='导出格式')
@click.option('--output', help='输出文件路径')
@click.option('--frozen-only', is_flag=True, help='仅导出已冻结记录')
@click.option('--operator', default='system', help='操作人')
def export(batch_id, export_format, output, frozen_only, operator):
    db = get_db()
    
    records = db.get_reconciliation_records(batch_id, include_frozen=True)
    
    if frozen_only:
        records = [r for r in records if r['is_frozen']]
    
    if not output:
        output = f"{batch_id}_reconciliation.{export_format}"
    
    if export_format == 'csv':
        with open(output, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([
                '物料编码', '产品名称', '送货数量', '返修数量', 
                '扣款金额', '最终结算', '状态', '是否冻结', 
                '是否人工改判', '改判原因'
            ])
            for r in records:
                writer.writerow([
                    r['product_code'],
                    r['product_name'],
                    r['delivery_quantity'] or 0,
                    r['repair_quantity'] or 0,
                    r['deduction_amount'] or 0,
                    r['final_settlement'] or 0,
                    r['status'],
                    '是' if r['is_frozen'] else '否',
                    '是' if r['is_manual_override'] else '否',
                    r['override_reason'] or ''
                ])
    else:
        export_data = []
        for r in records:
            export_data.append({
                'product_code': r['product_code'],
                'product_name': r['product_name'],
                'delivery_quantity': r['delivery_quantity'],
                'repair_quantity': r['repair_quantity'],
                'deduction_amount': r['deduction_amount'],
                'final_settlement': r['final_settlement'],
                'status': r['status'],
                'is_frozen': bool(r['is_frozen']),
                'is_manual_override': bool(r['is_manual_override']),
                'override_reason': r['override_reason']
            })
        
        with open(output, 'w', encoding='utf-8') as f:
            json.dump({
                'batch_id': batch_id,
                'export_time': datetime.now().isoformat(),
                'record_count': len(export_data),
                'records': export_data
            }, f, ensure_ascii=False, indent=2)
    
    db.log_action(
        batch_id, 'export', operator,
        new_value={
            'format': export_format,
            'output': output,
            'record_count': len(records),
            'frozen_only': frozen_only
        },
        reason=f'导出对账结果 [格式: {export_format}, 记录数: {len(records)}'
    )
    
    click.secho(f"✓ 导出成功: {output}", fg='green')
    click.echo(f"导出记录数: {len(records)}")


@cli.command()
@click.option('--batch-id', required=True, help='批次号')
@click.option('--file-type', required=True, 
              type=click.Choice(VALID_FILE_TYPES),
              help='要撤回的文件类型')
@click.option('--operator', default='system', help='操作人')
def withdraw(batch_id, file_type, operator):
    db = get_db()
    count = db.withdraw_import(batch_id, file_type, operator)
    
    if count > 0:
        click.secho(f"✓ 已撤回 {count} 个 {FILE_TYPE_NAMES.get(file_type, file_type)} 文件", fg='green')
    else:
        click.secho("⚠ 未找到可撤回的文件", fg='yellow')


@cli.command()
def list_batches():
    db = get_db()
    batches = db.get_all_batches()
    
    click.echo()
    click.secho("=== 所有批次 ===", fg='cyan', bold=True)
    for b in batches:
        click.echo(f"  • {b}")
    if not batches:
        click.echo("  (暂无批次)")


if __name__ == '__main__':
    cli()
