import os
import sys
import traceback
from pathlib import Path
from typing import Dict, List

import click

from .config import Config
from .storage import RecordStorage


class Context:
    def __init__(self):
        self.base_dir = Path.cwd()
        self.config = None
        self.storage = None
        self.verbose = False

    def init_config(self):
        self.config = Config(str(self.base_dir))

    def init_storage(self):
        self.storage = RecordStorage(str(self.base_dir))


pass_ctx = click.make_pass_decorator(Context, ensure=True)


def init_project(base_dir: Path):
    base_dir.mkdir(parents=True, exist_ok=True)
    
    config = Config(str(base_dir))
    config.save()
    
    storage = RecordStorage(str(base_dir))
    
    for subdir in ["imports", "exports", "data/records", "data/history", "data/deadletter", "logs"]:
        (base_dir / subdir).mkdir(parents=True, exist_ok=True)
    
    click.echo(f"✓ 已初始化巡检项目: {base_dir}")
    click.echo("  目录结构:")
    click.echo("  ├── imports/     # 待导入文件")
    click.echo("  ├── exports/     # 导出报表")
    click.echo("  ├── data/        # 数据存储")
    click.echo("  │   ├── records/ # 巡检记录")
    click.echo("  │   ├── history/ # 变更历史")
    click.echo("  │   └── deadletter/ # 死信队列")
    click.echo("  ├── logs/        # 操作日志")
    click.echo("  └── config.yaml  # 配置文件")


@click.group()
@click.option('--verbose', '-v', is_flag=True, help='显示详细信息')
@click.pass_context
def cli(ctx, verbose):
    """水务抢修材料多源导入巡检工具"""
    ctx_obj = ctx.ensure_object(Context)
    ctx_obj.verbose = verbose
    
    ctx.call_on_close(lambda: None)


@cli.command()
@click.option('--dir', '-d', default='.', help='项目目录 (默认: 当前目录)')
def init(dir):
    """初始化巡检项目"""
    base_dir = Path(dir).resolve()
    init_project(base_dir)


@cli.command('import')
@click.argument('source_type', type=click.Choice(['dispatch_order', 'valve_inventory', 'site_photo', 'scan_detail']))
@click.argument('file_path', type=click.Path(exists=True))
@click.option('--sheet', '-s', default=0, help='Excel工作表名称或索引')
@pass_ctx
def import_data(ctx, source_type, file_path, sheet):
    """导入数据: dispatch_order|valve_inventory|site_photo|scan_detail"""
    from .importer import DataImporter
    
    ctx.init_config()
    ctx.init_storage()
    
    importer = DataImporter(ctx.config, ctx.storage)
    
    try:
        result = importer.import_file(source_type, file_path, sheet)
        _print_import_result(result)
    except Exception as e:
        click.echo(f"✗ 导入失败: {str(e)}", err=True)
        if ctx.verbose:
            traceback.print_exc()
        sys.exit(1)


def _print_import_result(result):
    click.echo(f"\n{'='*60}")
    click.echo(f"导入结果: {result['source_type']}")
    click.echo(f"{'='*60}")
    click.echo(f"源文件: {result['source_file']}")
    click.echo(f"总行数: {result['total_rows']}")
    click.echo(f"成功: {result['success_count']}")
    click.echo(f"失败: {result['failed_count']}")
    click.echo(f"重复: {result['duplicate_count']}")
    click.echo(f"状态: {result['status']}")
    
    if result['failed_rows']:
        click.echo(f"\n失败清单 (已进入死信队列):")
        for fail in result['failed_rows']:
            dlq_info = f" [DLQ: {fail.get('dlq_id', 'N/A')}]" if fail.get('dlq_id') else ""
            click.echo(f"  行{fail['row']}: {fail['error']}{dlq_info}")
    
    if result['updated_ids']:
        click.echo(f"\n更新记录数: {len(result['updated_ids'])}")
    
    click.echo(f"\n导入批次: {result['batch_id']}")


@cli.command()
@click.option('--order-no', '-o', help='指定工单编号检查')
@click.option('--source-type', '-t', help='指定数据源类型检查')
@pass_ctx
def check(ctx, order_no, source_type):
    """检查数据一致性"""
    from .checker import DataChecker
    
    ctx.init_config()
    ctx.init_storage()
    
    checker = DataChecker(ctx.config, ctx.storage)
    
    try:
        result = checker.check_all(order_no=order_no, source_type=source_type)
        _print_check_result(result)
    except Exception as e:
        click.echo(f"✗ 检查失败: {str(e)}", err=True)
        if ctx.verbose:
            traceback.print_exc()
        sys.exit(1)


def _print_check_result(result):
    click.echo(f"\n{'='*60}")
    click.echo("检查结果")
    click.echo(f"{'='*60}")
    
    for source_type, summary in result['summary'].items():
        if summary['total'] > 0:
            click.echo(f"\n{source_type}:")
            click.echo(f"  总数: {summary['total']}")
            click.echo(f"  有效: {summary['valid']}")
            click.echo(f"  无效: {summary['invalid']}")
            click.echo(f"  待处理: {summary['pending']}")
    
    if result['issues']:
        click.echo(f"\n问题清单 ({len(result['issues'])} 项):")
        for i, issue in enumerate(result['issues'], 1):
            status_icon = "!" if issue['severity'] == 'error' else "?"
            click.echo(f"  {status_icon} [{i}] {issue['type']}")
            click.echo(f"     记录: {issue['record_id']}")
            click.echo(f"     描述: {issue['message']}")
            if 'original_row' in issue:
                click.echo(f"     原始行号: {issue['original_row']}")
            if 'source_file' in issue:
                click.echo(f"     来源文件: {issue['source_file']}")
    
    click.echo(f"\n检查完成时间: {result['check_time']}")


@cli.command()
@click.argument('record_id', required=False)
@click.option('--all', '-a', is_flag=True, help='修复所有可自动修复的问题')
@click.option('--withdraw', '-w', help='撤回指定记录 (填record_id)')
@pass_ctx
def fix(ctx, record_id, all, withdraw):
    """修复数据问题"""
    from .fixer import DataFixer
    
    ctx.init_config()
    ctx.init_storage()
    
    fixer = DataFixer(ctx.config, ctx.storage)
    
    try:
        if withdraw:
            result = fixer.withdraw_record(withdraw)
            click.echo(f"✓ 已撤回记录: {withdraw}")
            click.echo(f"  原状态: {result['old_status']}")
            click.echo(f"  新状态: {result['new_status']}")
        elif all:
            result = fixer.fix_all()
            _print_fix_result(result)
        elif record_id:
            result = fixer.fix_record(record_id)
            _print_fix_result(result)
        else:
            click.echo("请指定 --all 或 record_id", err=True)
            sys.exit(1)
    except Exception as e:
        click.echo(f"✗ 修复失败: {str(e)}", err=True)
        if ctx.verbose:
            traceback.print_exc()
        sys.exit(1)


def _print_fix_result(result):
    click.echo(f"\n{'='*60}")
    click.echo("修复结果")
    click.echo(f"{'='*60}")
    click.echo(f"处理记录: {result['processed']}")
    click.echo(f"成功修复: {result['fixed']}")
    click.echo(f"需人工处理: {result['manual_required']}")
    click.echo(f"跳过: {result['skipped']}")


@cli.command()
@click.argument('record_id')
@click.argument('judgment')
@click.option('--operator', '-o', required=True, help='操作人姓名')
@click.option('--override', '-O', multiple=True, help='覆盖字段值，格式: key=value')
@click.option('--reason', '-r', help='改判原因说明')
@pass_ctx
def judge(ctx, record_id, judgment, operator, override, reason):
    """人工改判指定记录
    
    JUDGMENT: 改判结论，如 '有效'、'无效'、'保留'、'驳回' 等
    """
    from .fixer import DataFixer
    from .auth import AuthManager
    
    ctx.init_config()
    ctx.init_storage()
    
    auth = AuthManager(ctx.config)
    if not auth.check_permission(operator, 'manual_judge'):
        click.echo(f"✗ 权限不足: {operator} 没有人工改判权限", err=True)
        sys.exit(1)
    
    fixer = DataFixer(ctx.config, ctx.storage)
    
    override_value = None
    if override:
        override_value = {}
        for item in override:
            if '=' in item:
                key, val = item.split('=', 1)
                override_value[key.strip()] = val.strip()
    
    try:
        result = fixer.manual_judge(
            record_id=record_id,
            judgment=judgment,
            operator=operator,
            override_value=override_value
        )
        
        if reason:
            record = ctx.storage.get_record(record_id)
            if record and record.manual_judgment:
                record.manual_judgment['reason'] = reason
                ctx.storage.save_record(record)
        
        auth.log_operation(operator, 'manual_judge', record_id, judgment)
        
        click.echo(f"✓ 人工改判完成: {record_id}")
        click.echo(f"  改判人: {operator}")
        click.echo(f"  改判结论: {judgment}")
        if reason:
            click.echo(f"  改判原因: {reason}")
        if override_value:
            click.echo(f"  覆盖字段: {override_value}")
        click.echo(f"  新状态: {result['new_status']}")
    except Exception as e:
        click.echo(f"✗ 人工改判失败: {str(e)}", err=True)
        if ctx.verbose:
            traceback.print_exc()
        sys.exit(1)


@cli.command()
@click.option('--format', '-f', type=click.Choice(['text', 'html']), default='text', help='报表格式')
@click.option('--output', '-o', help='输出文件路径')
@pass_ctx
def report(ctx, format, output):
    """生成巡检报表"""
    from .reporter import ReportGenerator
    
    ctx.init_config()
    ctx.init_storage()
    
    reporter = ReportGenerator(ctx.config, ctx.storage)
    
    try:
        if format == 'html':
            report_content = reporter.generate_html_report()
        else:
            report_content = reporter.generate_text_report()
        
        if output:
            output_path = Path(output)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(report_content)
            click.echo(f"✓ 报表已保存: {output_path}")
        else:
            click.echo(report_content)
    except Exception as e:
        click.echo(f"✗ 报表生成失败: {str(e)}", err=True)
        if ctx.verbose:
            traceback.print_exc()
        sys.exit(1)


@cli.command()
@click.argument('record_id', required=False)
@click.option('--limit', '-n', default=10, help='显示最近N条记录')
@pass_ctx
def history(ctx, record_id, limit):
    """查看变更历史"""
    ctx.init_config()
    ctx.init_storage()
    
    if record_id:
        _show_record_history(ctx, record_id)
    else:
        _show_all_history(ctx, limit)


def _show_record_history(ctx, record_id):
    history = ctx.storage.get_record_history(record_id)
    
    if not history:
        click.echo(f"未找到记录历史: {record_id}")
        return
    
    click.echo(f"\n{'='*60}")
    click.echo(f"记录历史: {record_id}")
    click.echo(f"{'='*60}")
    
    for i, (timestamp, data) in enumerate(reversed(history[-10:]), 1):
        click.echo(f"\n[{i}] {timestamp}")
        click.echo(f"  状态: {data.get('status', 'N/A')}")
        click.echo(f"  更新时间: {data.get('updated_at', 'N/A')}")
        if data.get('source_evidence'):
            latest_evidence = data['source_evidence'][-1]
            click.echo(f"  来源文件: {latest_evidence.get('source_file', 'N/A')}")
            click.echo(f"  原始行号: {latest_evidence.get('original_row_number', 'N/A')}")


def _show_all_history(ctx, limit):
    click.echo("显示所有记录历史功能待实现")


@cli.command()
@click.option('--format', '-f', type=click.Choice(['csv', 'excel']), default='excel', help='导出格式')
@click.option('--freeze/--no-freeze', default=True, help='导出前冻结数据')
@click.option('--source-type', '-t', help='指定数据源类型')
@pass_ctx
def export(ctx, format, freeze, source_type):
    """导出巡检数据"""
    from .exporter import DataExporter
    
    ctx.init_config()
    ctx.init_storage()
    
    exporter = DataExporter(ctx.config, ctx.storage)
    
    try:
        if freeze:
            exporter.freeze_data(source_type)
            click.echo("✓ 数据已冻结")
        
        result = exporter.export_data(format, source_type)
        click.echo(f"✓ 导出成功: {result['file_path']}")
        click.echo(f"  导出记录: {result['record_count']}")
    except Exception as e:
        click.echo(f"✗ 导出失败: {str(e)}", err=True)
        if ctx.verbose:
            traceback.print_exc()
        sys.exit(1)


@cli.command()
@click.argument('record_id', required=False)
@click.option('--status', '-s', type=click.Choice(['pending', 'processing', 'success', 'failed', 'manual']), help='按状态筛选')
@click.option('--source-type', '-t', help='按数据源类型筛选')
@click.option('--stats', is_flag=True, help='仅显示统计信息')
@pass_ctx
def dlq(ctx, record_id, status, source_type, stats):
    """死信队列管理：查看、统计失败记录"""
    from .deadletter import DeadLetterQueue
    
    ctx.init_config()
    ctx.init_storage()
    
    dlq = DeadLetterQueue(ctx.config)
    
    if record_id:
        entry = dlq.get(record_id)
        if entry:
            _print_dlq_entry(entry)
        else:
            click.echo(f"未找到死信记录: {record_id}")
            sys.exit(1)
    elif stats:
        _print_dlq_stats(dlq.get_statistics())
    else:
        entries = dlq.list_all(status=status, source_type=source_type)
        _print_dlq_list(entries)


def _print_dlq_stats(stats: Dict):
    click.echo(f"\n{'='*60}")
    click.echo("死信队列统计")
    click.echo(f"{'='*60}")
    click.echo(f"总记录数: {stats['total']}")
    click.echo(f"待处理: {stats['pending']}")
    click.echo(f"处理中: {stats['processing']}")
    click.echo(f"成功: {stats['success']}")
    click.echo(f"失败: {stats['failed']}")
    click.echo(f"人工处理: {stats['manual']}")
    click.echo(f"\n按数据源:")
    for st, count in stats['by_source_type'].items():
        click.echo(f"  {st}: {count}")


def _print_dlq_list(entries: List[Dict]):
    if not entries:
        click.echo("死信队列为空")
        return
    
    click.echo(f"\n{'='*80}")
    click.echo(f"死信队列 ({len(entries)} 条)")
    click.echo(f"{'='*80}")
    
    for i, entry in enumerate(entries, 1):
        click.echo(f"\n[{i}] {entry.get('dlq_id', 'N/A')}")
        click.echo(f"    数据源: {entry.get('source_type', 'N/A')}")
        click.echo(f"    原始行号: {entry.get('row_number', 'N/A')}")
        click.echo(f"    来源文件: {entry.get('source_file', 'N/A')}")
        click.echo(f"    错误信息: {entry.get('error_message', 'N/A')}")
        click.echo(f"    状态: {entry.get('status', 'N/A')}")
        click.echo(f"    重试次数: {entry.get('retry_count', 0)}")
        click.echo(f"    创建时间: {entry.get('created_at', 'N/A')}")


def _print_dlq_entry(entry: Dict):
    click.echo(f"\n{'='*60}")
    click.echo(f"死信记录详情")
    click.echo(f"{'='*60}")
    click.echo(f"DLQ ID: {entry.get('dlq_id')}")
    click.echo(f"数据源: {entry.get('source_type')}")
    click.echo(f"原始行号: {entry.get('row_number')}")
    click.echo(f"来源文件: {entry.get('source_file')}")
    click.echo(f"批次ID: {entry.get('batch_id')}")
    click.echo(f"错误信息: {entry.get('error_message')}")
    click.echo(f"状态: {entry.get('status')}")
    click.echo(f"重试次数: {entry.get('retry_count')}")
    click.echo(f"创建时间: {entry.get('created_at')}")
    click.echo(f"更新时间: {entry.get('updated_at')}")
    if entry.get('processed_at'):
        click.echo(f"处理时间: {entry['processed_at']}")
    if entry.get('result_record_id'):
        click.echo(f"结果记录ID: {entry['result_record_id']}")
    click.echo(f"\n原始内容:")
    click.echo(f"  {entry.get('original_content', {})}")


@cli.command()
@click.argument('dlq_id')
@pass_ctx
def dlq_retry(ctx, dlq_id):
    """重试死信队列中的单条记录"""
    from .deadletter import DeadLetterQueue
    
    ctx.init_config()
    ctx.init_storage()
    
    dlq = DeadLetterQueue(ctx.config)
    entry = dlq.retry(dlq_id)
    
    if not entry:
        click.echo(f"未找到死信记录: {dlq_id}")
        sys.exit(1)
    
    click.echo(f"已标记为处理中: {dlq_id}")
    click.echo(f"原始行号: {entry.get('row_number')}")
    click.echo(f"原始内容: {entry.get('original_content')}")
    click.echo(f"错误信息: {entry.get('error_message')}")
    click.echo(f"\n请根据原始内容修正后重新导入对应文件")


@cli.command()
@click.option('--operator', '-o', required=True, help='操作人')
@click.option('--note', '-n', help='备注')
@click.argument('dlq_id')
@pass_ctx
def dlq_mark(ctx, dlq_id, operator, note):
    """将死信记录标记为人工处理"""
    from .deadletter import DeadLetterQueue
    from .auth import AuthManager
    
    ctx.init_config()
    ctx.init_storage()
    
    auth = AuthManager(ctx.config)
    if not auth.check_permission(operator, 'manual_judge'):
        click.echo(f"✗ 权限不足: {operator}", err=True)
        sys.exit(1)
    
    dlq = DeadLetterQueue(ctx.config)
    
    if dlq.mark_manual(dlq_id, operator, note):
        click.echo(f"✓ 已标记为人工处理: {dlq_id}")
        click.echo(f"  操作人: {operator}")
        if note:
            click.echo(f"  备注: {note}")
    else:
        click.echo(f"未找到死信记录: {dlq_id}", err=True)
        sys.exit(1)


@cli.command()
@click.option('--days', '-d', default=7, help='清理N天前的已处理记录')
@pass_ctx
def dlq_clear(ctx, days):
    """清理已处理的死信记录"""
    from .deadletter import DeadLetterQueue
    
    ctx.init_config()
    ctx.init_storage()
    
    dlq = DeadLetterQueue(ctx.config)
    count = dlq.clear_processed(older_than_days=days)
    click.echo(f"已清理 {count} 条已处理记录")


@cli.command()
@click.option('--username', '-u', required=True, help='用户名')
@click.option('--role', '-r', type=click.Choice(['admin', 'inspector', 'reviewer', 'operator']), required=True, help='角色')
@click.option('--name', '-n', help='显示名称')
@click.option('--operator', '-o', required=True, help='操作人(需admin权限)')
@pass_ctx
def user_add(ctx, username, role, name, operator):
    """添加用户"""
    from .auth import AuthManager
    
    ctx.init_config()
    
    auth = AuthManager(ctx.config)
    if not auth.check_permission(operator, 'manual_judge'):
        click.echo(f"✗ 权限不足: {operator}", err=True)
        sys.exit(1)
    
    if auth.add_user(username, role, name):
        click.echo(f"✓ 用户添加成功: {username} (角色: {role})")
        auth.log_operation(operator, 'user_add', username, f'role={role}')
    else:
        click.echo(f"✗ 添加失败: 角色不存在或用户已存在", err=True)
        sys.exit(1)


@cli.command()
@click.option('--username', '-u', required=True, help='用户名')
@click.option('--operator', '-o', required=True, help='操作人(需admin权限)')
@pass_ctx
def user_remove(ctx, username, operator):
    """删除用户"""
    from .auth import AuthManager
    
    ctx.init_config()
    
    auth = AuthManager(ctx.config)
    if not auth.check_permission(operator, 'manual_judge'):
        click.echo(f"✗ 权限不足: {operator}", err=True)
        sys.exit(1)
    
    if auth.remove_user(username):
        click.echo(f"✓ 用户已删除: {username}")
        auth.log_operation(operator, 'user_remove', username)
    else:
        click.echo(f"✗ 删除失败: 用户不存在或为admin", err=True)
        sys.exit(1)


@cli.command()
@pass_ctx
def user_list(ctx):
    """列出所有用户"""
    from .auth import AuthManager
    
    ctx.init_config()
    
    auth = AuthManager(ctx.config)
    users = auth.list_users()
    
    if not users:
        click.echo("无用户")
        return
    
    click.echo(f"\n{'='*60}")
    click.echo("用户列表")
    click.echo(f"{'='*60}")
    for user in users:
        click.echo(f"  {user['username']:20s} | {user['role']:15s} | {user['name']}")


@cli.command()
@click.option('--limit', '-n', default=50, help='显示最近N条')
@pass_ctx
def audit(ctx, limit):
    """查看审计日志"""
    from .auth import AuthManager
    
    ctx.init_config()
    
    auth = AuthManager(ctx.config)
    logs = auth.get_audit_logs(limit=limit)
    
    if not logs:
        click.echo("无审计日志")
        return
    
    click.echo(f"\n{'='*60}")
    click.echo(f"审计日志 (最近 {len(logs)} 条)")
    click.echo(f"{'='*60}")
    for log in logs:
        click.echo(f"  {log.strip()}")


def main():
    try:
        cli()
    except KeyboardInterrupt:
        click.echo("\n操作已取消")
        sys.exit(1)
    except Exception as e:
        click.echo(f"\n错误: {str(e)}", err=True)
        if '--verbose' in sys.argv or '-v' in sys.argv:
            traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
