import click
import sys
from tabulate import tabulate

from .database import init_db, get_db_path
from .permissions import can_perform_action, get_user_role, get_role_name, list_users
from .importer import import_file, get_import_sessions, get_session_records, track_batch_stores
from .checker import check_session, get_record_issues, get_issue_summary, ISSUE_TYPES
from .fixer import fix_issue, reimport_after_fix, get_fix_history, verify_record
from .reporter import generate_report, get_supervisor_dashboard, get_daily_summary
from .exporter import export_session, export_report, export_batch_tracking


class Context:
    def __init__(self):
        self.username = None
        self.role = None


pass_context = click.make_pass_decorator(Context, ensure=True)


@click.group()
@click.option('--user', '-u', default='admin', help='当前操作用户名')
@pass_context
def cli(ctx, user):
    """中央厨房留样多源导入巡检工具"""
    ctx.username = user
    ctx.role = get_user_role(user)


@cli.command()
@pass_context
def init(ctx):
    """初始化数据库"""
    init_db()
    click.echo(f"数据库已初始化: {get_db_path()}")
    click.echo("\n默认用户:")
    for user in list_users():
        click.echo(f"  {user['username']} ({get_role_name(user['role'])})")


@cli.command()
@click.argument('file_path')
@click.option('--type', '-t', 'source_type', default='auto', 
              type=click.Choice(['auto', 'sample_label', 'temperature', 'complaint', 'supplement']),
              help='数据类型')
@pass_context
def import_cmd(ctx, file_path, source_type):
    """导入数据文件"""
    if not can_perform_action(ctx.username, 'import'):
        click.echo(f"错误: 用户 {ctx.username} 没有导入权限", err=True)
        sys.exit(1)
    
    result = import_file(file_path, source_type, ctx.username)
    if result['success']:
        click.echo(f"导入成功!")
        click.echo(f"  会话ID: {result['session_id']}")
        click.echo(f"  数据类型: {result['source_type']}")
        click.echo(f"  文件名: {result['file_name']}")
        click.echo(f"  总行数: {result['total_rows']}")
    else:
        click.echo(f"导入失败: {result['error']}", err=True)
        sys.exit(1)


@cli.command()
@click.argument('session_id', type=int)
@pass_context
def check(ctx, session_id):
    """检查导入批次的脏数据"""
    if not can_perform_action(ctx.username, 'check'):
        click.echo(f"错误: 用户 {ctx.username} 没有检查权限", err=True)
        sys.exit(1)
    
    result = check_session(session_id)
    if result['success']:
        click.echo(f"检查完成!")
        click.echo(f"  总记录数: {result['total_records']}")
        click.echo(f"  有问题记录: {result['records_with_issues']}")
        click.echo(f"  问题总数: {result['total_issues']}")
        
        if result['total_issues'] > 0:
            click.echo("\n问题清单:")
            issues = get_record_issues(session_id=session_id, status='open')
            table_data = []
            for issue in issues:
                type_name = ISSUE_TYPES.get(issue['issue_type'], issue['issue_type'])
                table_data.append([
                    issue['original_line_no'],
                    issue['batch_no'] or '-',
                    type_name,
                    issue['issue_description'][:50] + '...' if len(issue['issue_description']) > 50 else issue['issue_description'],
                    issue['severity']
                ])
            click.echo(tabulate(table_data, headers=['行号', '批次号', '问题类型', '描述', '级别']))
    else:
        click.echo(f"检查失败: {result['error']}", err=True)
        sys.exit(1)


@cli.command()
@click.argument('issue_id', type=int)
@click.option('--value', '-v', required=True, help='修正后的值')
@click.option('--note', '-n', help='处理意见/备注')
@pass_context
def fix(ctx, issue_id, value, note):
    """修正单个问题"""
    if not can_perform_action(ctx.username, 'fix'):
        click.echo(f"错误: 用户 {ctx.username} 没有修正权限", err=True)
        sys.exit(1)
    
    result = fix_issue(issue_id, value, note or '', ctx.username)
    if result['success']:
        click.echo(f"问题 {issue_id} 已修正")
    else:
        click.echo(f"修正失败: {result['error']}", err=True)
        sys.exit(1)


@cli.command()
@click.argument('session_id', type=int)
@pass_context
def reimport(ctx, session_id):
    """修正后重新导入"""
    if not can_perform_action(ctx.username, 'fix'):
        click.echo(f"错误: 用户 {ctx.username} 没有重新导入权限", err=True)
        sys.exit(1)
    
    result = reimport_after_fix(session_id)
    if result['success']:
        click.echo(f"重新导入完成! 重新导入 {result['reimported_count']} 条记录")
    else:
        click.echo(f"重新导入失败", err=True)
        sys.exit(1)


@cli.command()
@click.option('--session', '-s', 'session_id', type=int, help='指定导入会话')
@click.option('--batch', '-b', 'batch_no', help='指定批次号追踪')
@click.option('--dashboard', is_flag=True, help='显示主管仪表盘')
@pass_context
def report(ctx, session_id, batch_no, dashboard):
    """生成品控报告"""
    if not can_perform_action(ctx.username, 'report'):
        click.echo(f"错误: 用户 {ctx.username} 没有报告权限", err=True)
        sys.exit(1)
    
    if dashboard:
        dash = get_supervisor_dashboard()
        click.echo("=" * 60)
        click.echo("品控主管仪表盘")
        click.echo("=" * 60)
        click.echo(f"待处理会话: {dash['pending_sessions']}")
        click.echo(f"待处理问题: {dash['open_issues']}")
        click.echo(f"\n问题严重程度:")
        for sev, cnt in dash['issues_by_severity'].items():
            click.echo(f"  {sev}: {cnt}")
        
        click.echo(f"\n常见问题类型 TOP 5:")
        for issue in dash['top_issues']:
            type_name = ISSUE_TYPES.get(issue['issue_type'], issue['issue_type'])
            click.echo(f"  {type_name}: {issue['count']}")
        
        click.echo(f"\n最近会话:")
        table_data = []
        for s in dash['recent_sessions']:
            table_data.append([
                s['id'],
                s['source_type'],
                s['file_name'],
                s['imported_by'],
                s['imported_at'][:16],
                s['status'],
                s['invalid_rows'] or 0
            ])
        click.echo(tabulate(table_data, headers=['ID', '类型', '文件', '导入人', '时间', '状态', '问题数']))
    
    elif session_id:
        result = generate_report(session_id=session_id)
        click.echo("=" * 60)
        click.echo(f"导入批次报告 - 会话 {session_id}")
        click.echo("=" * 60)
        
        s = result['summary']
        click.echo(f"\n汇总:")
        click.echo(f"  总记录数: {s['total_records']}")
        click.echo(f"  有效记录: {s['valid_records']}")
        click.echo(f"  失败记录: {s['failed_records']}")
        click.echo(f"  已修正: {s['fixed_records']}")
        click.echo(f"  错误数: {s['error_count']}")
        click.echo(f"  警告数: {s['warning_count']}")
        
        if result['failed_records']:
            click.echo(f"\n失败清单 (原始行号):")
            table_data = []
            for issue in result['failed_records']:
                table_data.append([
                    issue['original_line_no'],
                    issue['batch_no'] or '-',
                    issue['issue_type_name'],
                    issue['issue_description']
                ])
            click.echo(tabulate(table_data, headers=['行号', '批次号', '问题', '描述']))
    
    elif batch_no:
        result = generate_report(batch_no=batch_no)
        info = result['batch_info']
        click.echo("=" * 60)
        click.echo(f"批次追踪报告 - {batch_no}")
        click.echo("=" * 60)
        click.echo(f"\n批次信息:")
        click.echo(f"  涉及门店数: {info['store_count']}")
        click.echo(f"  留样记录: {info.get('sample_count', 0)}")
        click.echo(f"  温度记录: {info.get('temperature_count', 0)}")
        click.echo(f"  投诉记录: {info.get('complaint_count', 0)}")
        
        click.echo(f"\n涉及门店: {', '.join(info['affected_stores']) if info['affected_stores'] else '无'}")
        
        if result['batch_tracking']:
            click.echo(f"\n追踪明细:")
            table_data = []
            for t in result['batch_tracking']:
                table_data.append([
                    t['store_id'] or '-',
                    t['source_type'],
                    t['tracking_type'],
                    t['created_at'][:16],
                    t['file_name'] or '-',
                    t['imported_by'] or '-'
                ])
            click.echo(tabulate(table_data, headers=['门店', '来源', '类型', '时间', '文件', '导入人']))
    else:
        daily = get_daily_summary()
        if daily:
            click.echo("每日汇总:")
            table_data = []
            for d in daily:
                table_data.append([
                    d['import_date'],
                    d['source_type'],
                    d['session_count'],
                    d['total_records'],
                    d['valid_records'] or 0,
                    d['invalid_records'] or 0
                ])
            click.echo(tabulate(table_data, headers=['日期', '类型', '会话数', '总记录', '有效', '无效']))
        else:
            click.echo("暂无数据，请使用 --session 或 --batch 指定报告范围")


@cli.command()
@click.option('--limit', '-n', default=10, help='显示最近N条记录')
@click.option('--session', '-s', type=int, help='指定会话ID')
@click.option('--batch', '-b', help='指定批次号')
@pass_context
def history(ctx, limit, session, batch):
    """查看历史记录"""
    if not can_perform_action(ctx.username, 'view_history'):
        click.echo(f"错误: 用户 {ctx.username} 没有查看历史权限", err=True)
        sys.exit(1)
    
    if session:
        records = get_session_records(session)
        click.echo(f"会话 {session} 记录 ({len(records)}条):")
        table_data = []
        for r in records:
            table_data.append([
                r['original_line_no'],
                r['batch_no'] or '-',
                r['store_id'] or '-',
                r['record_date'] or '-',
                r['status']
            ])
        click.echo(tabulate(table_data, headers=['行号', '批次号', '门店', '日期', '状态']))
    elif batch:
        tracking = track_batch_stores(batch)
        click.echo(f"批次 {batch} 追踪记录 ({len(tracking)}条):")
        table_data = []
        for t in tracking:
            table_data.append([
                t['store_id'] or '-',
                t['source_type'],
                t['created_at'][:16],
                t['file_name'] or '-',
                t['imported_by'] or '-'
            ])
        click.echo(tabulate(table_data, headers=['门店', '来源', '时间', '文件', '导入人']))
    else:
        sessions = get_import_sessions(limit)
        click.echo(f"最近导入会话:")
        table_data = []
        for s in sessions:
            table_data.append([
                s['id'],
                s['source_type'],
                s['file_name'],
                s['imported_by'],
                s['imported_at'][:16],
                s['total_rows'],
                s['status']
            ])
        click.echo(tabulate(table_data, headers=['ID', '类型', '文件', '导入人', '时间', '行数', '状态']))


@cli.command()
@click.argument('session_id', type=int)
@click.argument('output_path')
@click.option('--format', '-f', 'fmt', default='csv', type=click.Choice(['csv', 'json']), help='导出格式')
@click.option('--report', is_flag=True, help='导出报告而非原始数据')
@pass_context
def export(ctx, session_id, output_path, fmt, report):
    """导出数据"""
    if not can_perform_action(ctx.username, 'export'):
        click.echo(f"错误: 用户 {ctx.username} 没有导出权限", err=True)
        sys.exit(1)
    
    if report:
        result = export_report(session_id, output_path)
    else:
        result = export_session(session_id, output_path, fmt)
    
    if result['success']:
        click.echo(f"导出成功: {result['output_path']}")
    else:
        click.echo(f"导出失败: {result.get('error', '未知错误')}", err=True)
        sys.exit(1)


@cli.command()
@click.argument('batch_no')
@click.argument('output_path')
@pass_context
def track(ctx, batch_no, output_path):
    """导出批次追踪数据"""
    if not can_perform_action(ctx.username, 'export'):
        click.echo(f"错误: 用户 {ctx.username} 没有导出权限", err=True)
        sys.exit(1)
    
    result = export_batch_tracking(batch_no, output_path)
    if result['success']:
        click.echo(f"导出成功: {result['output_path']} ({result['record_count']}条记录)")
    else:
        click.echo(f"导出失败: {result.get('error', '未知错误')}", err=True)
        sys.exit(1)


@cli.command(name='issues')
@click.option('--session', '-s', type=int, help='指定会话ID')
@click.option('--status', default='open', type=click.Choice(['all', 'open', 'fixed']), help='问题状态')
@pass_context
def list_issues(ctx, session, status):
    """列出问题清单"""
    issues = get_record_issues(session_id=session, status=status)
    click.echo(f"问题清单 ({len(issues)}条):")
    table_data = []
    for issue in issues:
        type_name = ISSUE_TYPES.get(issue['issue_type'], issue['issue_type'])
        table_data.append([
            issue['id'],
            issue['original_line_no'],
            issue['batch_no'] or '-',
            type_name,
            issue['severity'],
            issue['status'],
            issue['issue_description'][:40] + '...' if len(issue['issue_description']) > 40 else issue['issue_description']
        ])
    click.echo(tabulate(table_data, headers=['问题ID', '行号', '批次号', '问题类型', '级别', '状态', '描述']))


@cli.command()
@pass_context
def users(ctx):
    """列出所有用户"""
    users = list_users()
    table_data = []
    for u in users:
        table_data.append([
            u['username'],
            get_role_name(u['role']),
            u['created_at'][:10]
        ])
    click.echo(tabulate(table_data, headers=['用户名', '角色', '创建时间']))


if __name__ == '__main__':
    cli()
