import click
import sys
from tabulate import tabulate
from datetime import date, datetime
from typing import Optional

from . import __version__
from .database import init_database, is_initialized
from .importer import import_data, SOURCE_TYPES
from .inspector import run_inspection
from .reporting import (
    get_import_history,
    get_session_details,
    get_failed_records,
    get_inspection_results,
    export_to_excel,
    export_failed_records_csv,
    generate_report,
    mark_inspection_fixed,
)


pass_workspace = click.make_pass_decorator(str, ensure=True)


@click.group()
@click.version_option(version=__version__, prog_name='bsi')
@click.option('--workspace', '-w', type=click.Path(), default='.',
              help='工作目录，默认为当前目录')
@click.pass_context
def main(ctx, workspace):
    """银行网点排班多源导入巡检工具"""
    ctx.obj = workspace


@main.command()
@pass_workspace
def init(workspace):
    """初始化数据库"""
    if is_initialized(workspace):
        click.echo(click.style('数据库已存在', fg='yellow'))
        return
    
    success, msg = init_database(workspace)
    if success:
        click.echo(click.style(msg, fg='green'))
    else:
        click.echo(click.style(msg, fg='red'))


@main.command()
@click.argument('source_type', type=click.Choice(['schedule', 'leave', 'forecast']))
@click.argument('file_path', type=click.Path(exists=True))
@click.option('--operator', '-o', default='system', help='操作人')
@click.option('--force', '-f', is_flag=True, help='强制覆盖重复导入')
@pass_workspace
def import_(workspace, source_type, file_path, operator, force):
    """导入数据: schedule(排班), leave(请假), forecast(预测)"""
    if not is_initialized(workspace):
        click.echo(click.style('错误: 数据库未初始化，请先运行 bsi init', fg='red'))
        sys.exit(1)
    
    with click.progressbar(length=1, label='正在导入') as bar:
        result = import_data(source_type, file_path, operator, workspace, force)
        bar.update(1)
    
    if not result['success']:
        if 'existing_session' in result:
            click.echo(click.style(f'错误: {result["error"]}', fg='red'))
            click.echo(f'  已有会话: {result["existing_session"]["session_uuid"]}')
            click.echo(f'  导入时间: {result["existing_session"]["imported_at"]}')
            click.echo(f'  使用 --force 参数可强制重新导入')
        else:
            click.echo(click.style(f'错误: {result["error"]}', fg='red'))
        return
    
    click.echo(click.style(f'\n导入成功! 会话ID: {result["session_id"]}', fg='green'))
    click.echo(f'  源文件: {result["source_file"]}')
    click.echo(f'  数据类型: {SOURCE_TYPES[source_type]}')
    click.echo(f'  总行数: {result["total_rows"]}')
    click.echo(f'  成功: {click.style(str(result["success_rows"]), fg="green")} 行')
    click.echo(f'  失败: {click.style(str(result["failed_rows"]), fg="red" if result["failed_rows"] > 0 else "green")} 行')
    
    if result['failed_rows'] > 0:
        click.echo(f'\n失败记录详情:')
        for fr in result['failed_records'][:5]:
            click.echo(f'  行号 {fr["original_line_no"]}: {fr["error_message"]}')
        if len(result['failed_records']) > 5:
            click.echo(f'  ... 还有 {len(result["failed_records"]) - 5} 条失败记录')
        click.echo(f'\n使用 bsi history {result["session_id"]} 查看完整详情')
    
    if result.get('force_imported'):
        click.echo(click.style('  (本次为强制覆盖导入)', fg='yellow'))


@main.command()
@click.option('--branch', '-b', help='指定网点编号，默认全部')
@click.option('--date', '-d', help='检查日期，格式 YYYY-MM-DD，默认今天')
@pass_workspace
def check(workspace, branch, date):
    """运行排班巡检"""
    if not is_initialized(workspace):
        click.echo(click.style('错误: 数据库未初始化，请先运行 bsi init', fg='red'))
        sys.exit(1)
    
    check_date = date or datetime.now().strftime('%Y-%m-%d')
    
    with click.progressbar(length=1, label='正在巡检') as bar:
        result = run_inspection(branch, check_date, None, workspace)
        bar.update(1)
    
    if not result['success']:
        click.echo(click.style(f'错误: {result["error"]}', fg='red'))
        return
    
    summary = result['summary']
    
    click.echo(f'\n巡检日期: {check_date}')
    click.echo(f'检查网点数: {summary["total_branches"]}')
    click.echo(f'有问题网点: {click.style(str(summary["branches_with_errors"]), fg="yellow" if summary["branches_with_errors"] > 0 else "green")}')
    click.echo(f'错误数: {click.style(str(summary["total_errors"]), fg="red")}')
    click.echo(f'警告数: {click.style(str(summary["total_warnings"]), fg="yellow")}')
    
    if result['issues']:
        click.echo('\n问题详情:')
        
        table_data = []
        for issue in result['issues']:
            severity_style = {'error': 'red', 'warning': 'yellow'}.get(issue['severity'], 'white')
            table_data.append([
                issue['branch_id'],
                issue['check_type'],
                issue['check_item'],
                click.style(issue['severity'].upper(), fg=severity_style),
                issue['description'][:50] + '...' if len(issue['description']) > 50 else issue['description'],
            ])
        
        click.echo(tabulate(table_data, headers=['网点', '类型', '检查项', '级别', '描述'], tablefmt='simple'))


@main.command()
@click.option('--session-id', '-s', type=int, help='修复指定会话的失败记录')
@click.option('--failed-id', '-f', type=int, help='修复单条失败记录')
@click.option('--reimport', '-r', type=click.Path(exists=True), help='修正后重新导入的文件路径')
@pass_workspace
def fix(workspace, session_id, failed_id, reimport):
    """修复失败记录并重新导入"""
    if not is_initialized(workspace):
        click.echo(click.style('错误: 数据库未初始化，请先运行 bsi init', fg='red'))
        sys.exit(1)
    
    if reimport:
        if not session_id:
            click.echo(click.style('错误: 重新导入需指定 --session-id', fg='red'))
            return
        
        session = get_session_details(session_id, workspace)
        if not session:
            click.echo(click.style(f'错误: 找不到会话 {session_id}', fg='red'))
            return
        
        source_type = session['source_type']
        
        click.echo(f'重新导入: {reimport}')
        click.echo(f'原会话ID: {session_id} (类型: {SOURCE_TYPES[source_type]})')
        
        result = import_data(source_type, reimport, 'fix_reimport', workspace, force=False)
        
        if result['success']:
            click.echo(click.style(f'重新导入成功! 新会话ID: {result["session_id"]}', fg='green'))
            click.echo(f'  成功: {result["success_rows"]} 行, 失败: {result["failed_rows"]} 行')
        else:
            click.echo(click.style(f'导入失败: {result["error"]}', fg='red'))
        return
    
    if session_id or failed_id:
        failed = get_failed_records(session_id=session_id if not failed_id else None, workspace=workspace)
        if failed_id:
            failed = [f for f in failed if f['id'] == failed_id]
        
        if not failed:
            click.echo(click.style('没有找到失败记录', fg='yellow'))
            return
        
        export_result = export_failed_records_csv(session_id, None, workspace)
        if export_result['success']:
            click.echo(f'失败记录已导出到: {export_result["output_file"]}')
            click.echo(f'共 {export_result["record_count"]} 条待修复记录')
            click.echo('\n修正后使用: bsi fix --session-id <ID> --reimport <修正文件.xlsx>')
        else:
            click.echo(click.style(f'导出失败: {export_result["error"]}', fg='red'))
        return
    
    pending = get_failed_records(fixed=False, workspace=workspace)
    
    if not pending:
        click.echo(click.style('没有待修复的失败记录', fg='green'))
        return
    
    click.echo(f'待修复记录: {len(pending)} 条\n')
    
    table_data = []
    for f in pending[:20]:
        table_data.append([
            f['id'],
            f['session_id'],
            f['source_type'],
            f['original_line_no'],
            f['error_message'][:40],
        ])
    
    click.echo(tabulate(table_data, headers=['ID', '会话ID', '类型', '原始行号', '错误信息'], tablefmt='simple'))
    
    if len(pending) > 20:
        click.echo(f'\n... 还有 {len(pending) - 20} 条记录')
    
    click.echo(f'\n使用 bsi fix --session-id <ID> 导出该会话的失败记录')


@main.command()
@click.option('--date', '-d', help='报表日期，格式 YYYY-MM-DD，默认今天')
@click.option('--branch', '-b', help='指定网点')
@click.option('--json', '-j', 'output_json', is_flag=True, help='输出 JSON 格式到文件')
@pass_workspace
def report(workspace, date, branch, output_json):
    """生成巡检报表"""
    if not is_initialized(workspace):
        click.echo(click.style('错误: 数据库未初始化，请先运行 bsi init', fg='red'))
        sys.exit(1)
    
    check_date = date or datetime.now().strftime('%Y-%m-%d')
    
    result = generate_report(check_date, branch, 'json' if output_json else 'text', workspace)
    
    if not result['success']:
        click.echo(click.style(f'错误: {result["error"]}', fg='red'))
        return
    
    report = result['report']
    
    click.echo(click.style('\n' + '='*60, fg='cyan'))
    click.echo(click.style('           银行网点排班巡检报表', fg='cyan', bold=True))
    click.echo(click.style('='*60, fg='cyan'))
    click.echo(f'\n报表生成时间: {report["report_date"]}')
    click.echo(f'巡检日期: {report["check_date"]}')
    if branch:
        click.echo(f'指定网点: {branch}')
    
    click.echo(f'\n' + '-'*40)
    click.echo(click.style('【巡检问题汇总】', bold=True))
    summary = report['inspection_summary']
    
    if summary:
        for d, stats in summary.items():
            click.echo(f'  {d}: 错误 {click.style(str(stats["errors"]), fg="red")}, 警告 {click.style(str(stats["warnings"]), fg="yellow")}')
    else:
        click.echo(click.style('  无问题', fg='green'))
    
    click.echo(f'\n' + '-'*40)
    click.echo(click.style('【失败数据统计】', bold=True))
    failed = report['failed_stats']
    click.echo(f'  总失败记录: {failed["total"]}')
    click.echo(f'  待修复: {click.style(str(failed["pending"]), fg="yellow" if failed["pending"] > 0 else "green")}')
    
    click.echo(f'\n' + '-'*40)
    click.echo(click.style('【最近导入】', bold=True))
    for imp in report['recent_imports'][:5]:
        status_color = 'green' if imp['status'] == 'COMPLETED' else 'yellow'
        click.echo(f'  {imp["imported_at"][:16]} | {imp["source_type"]:8s} | {imp["source_file"]} | ' +
                   click.style(imp['status'], fg=status_color))
    
    issues = report['inspection_issues']
    if issues:
        click.echo(f'\n' + '-'*40)
        click.echo(click.style('【问题详情】', bold=True))
        for issue in issues:
            severity_color = 'red' if issue['severity'] == 'error' else 'yellow'
            click.echo(f'\n  [{click.style(issue["severity"].upper(), fg=severity_color)}] '
                      f'{issue["branch_id"]} - {issue["check_item"]}')
            click.echo(f'     {issue["description"]}')
    
    if output_json:
        click.echo(f'\nJSON 报表已保存到: {report["output_file"]}')
    
    click.echo(f'\n' + '='*60)


@main.command()
@click.argument('session_id', required=False, type=int)
@click.option('--limit', '-n', type=int, default=20, help='显示最近N条')
@click.option('--type', '-t', 'source_type', help='过滤类型: schedule/leave/forecast')
@pass_workspace
def history(workspace, session_id, limit, source_type):
    """查看导入历史或会话详情"""
    if not is_initialized(workspace):
        click.echo(click.style('错误: 数据库未初始化，请先运行 bsi init', fg='red'))
        sys.exit(1)
    
    if session_id:
        session = get_session_details(session_id, workspace)
        if not session:
            click.echo(click.style(f'错误: 找不到会话 {session_id}', fg='red'))
            return
        
        click.echo(f'\n会话ID: {session["id"]}')
        click.echo(f'UUID: {session["session_uuid"]}')
        click.echo(f'数据源: {session["source_file"]}')
        click.echo(f'类型: {SOURCE_TYPES.get(session["source_type"], session["source_type"])}')
        click.echo(f'导入时间: {session["imported_at"]}')
        click.echo(f'操作人: {session["imported_by"]}')
        click.echo(f'状态: {session["status"]}')
        click.echo(f'总行数: {session["total_rows"]}, 成功: {session["success_rows"]}, 失败: {session["failed_rows"]}')
        
        if session['failed_records']:
            click.echo(f'\n失败记录:')
            table_data = []
            for fr in session['failed_records']:
                table_data.append([
                    fr['id'],
                    fr['original_line_no'],
                    fr['error_type'],
                    fr['error_message'],
                ])
            click.echo(tabulate(table_data, headers=['ID', '原始行号', '错误类型', '错误信息'], tablefmt='simple'))
        
        if session['success_records']:
            click.echo(f'\n成功记录 ({len(session["success_records"])} 条):')
            table_data = []
            for r in session['success_records'][:10]:
                if 'teller_id' in r:
                    table_data.append([r.get('teller_id', ''), r.get('teller_name', ''), 
                                      r.get('schedule_date', r.get('start_date', '')), r.get('shift_type', r.get('leave_type', ''))])
                else:
                    table_data.append([r.get('branch_id', ''), r.get('forecast_date', ''), 
                                      r.get('time_slot', ''), r.get('forecast_volume', '')])
            click.echo(tabulate(table_data, headers=['编号', '姓名/日期', '日期/时段', '类型/业务量'], tablefmt='simple'))
            if len(session['success_records']) > 10:
                click.echo(f'... 还有 {len(session["success_records"]) - 10} 条记录')
        return
    
    history_list = get_import_history(limit, source_type, workspace)
    
    if not history_list:
        click.echo(click.style('暂无导入历史', fg='yellow'))
        return
    
    table_data = []
    for h in history_list:
        status_color = 'green' if h['status'] == 'COMPLETED' else 'yellow'
        table_data.append([
            h['id'],
            h['imported_at'][:16],
            SOURCE_TYPES.get(h['source_type'], h['source_type']),
            h['source_file'],
            f"{h['success_rows']}/{h['total_rows']}",
            click.style(h['status'], fg=status_color),
            h.get('pending_fixes', 0),
        ])
    
    click.echo(tabulate(table_data, 
                       headers=['ID', '时间', '类型', '文件', '成功/总数', '状态', '待修复'], 
                       tablefmt='simple'))


@main.command()
@click.option('--session-id', '-s', type=int, help='导出指定会话')
@click.option('--output', '-o', help='输出文件路径')
@click.option('--include-failed/--no-failed', default=True, help='包含失败记录')
@pass_workspace
def export(workspace, session_id, output, include_failed):
    """导出数据到 Excel"""
    if not is_initialized(workspace):
        click.echo(click.style('错误: 数据库未初始化，请先运行 bsi init', fg='red'))
        sys.exit(1)
    
    with click.progressbar(length=1, label='正在导出') as bar:
        result = export_to_excel(session_id, output, include_failed, workspace)
        bar.update(1)
    
    if result['success']:
        click.echo(click.style(f'导出成功! 文件: {result["output_file"]}', fg='green'))
    else:
        click.echo(click.style(f'导出失败: {result["error"]}', fg='red'))


@main.command()
@pass_workspace
def doctor(workspace):
    """自动化检查：数据一致性、重启验证等"""
    if not is_initialized(workspace):
        click.echo(click.style('错误: 数据库未初始化，请先运行 bsi init', fg='red'))
        sys.exit(1)
    
    click.echo(click.style('\n[系统诊断检查]', fg='cyan', bold=True))
    
    from .database import get_connection
    conn = get_connection(workspace)
    cursor = conn.cursor()
    
    checks_passed = 0
    checks_failed = 0
    
    cursor.execute('SELECT COUNT(*) FROM import_sessions')
    total_sessions = cursor.fetchone()[0]
    click.echo(f'✓ 导入会话数: {total_sessions}')
    checks_passed += 1
    
    cursor.execute('SELECT COUNT(*) FROM failed_records WHERE fixed = 0')
    pending_failed = cursor.fetchone()[0]
    if pending_failed > 0:
        click.echo(click.style(f'⚠ 待修复失败记录: {pending_failed}', fg='yellow'))
    else:
        click.echo(f'✓ 无待修复记录')
    checks_passed += 1
    
    cursor.execute('''
    SELECT COUNT(*) as cnt, source_type, file_hash 
    FROM import_sessions 
    GROUP BY source_type, file_hash 
    HAVING cnt > 1
    ''')
    duplicates = cursor.fetchall()
    if duplicates:
        click.echo(click.style(f'⚠ 检测到 {len(duplicates)} 组重复导入文件', fg='yellow'))
        for d in duplicates:
            click.echo(f'   - {d["source_type"]}: {d["file_hash"][:16]}... ({d["cnt"]}次)')
        checks_failed += 1
    else:
        click.echo('✓ 无重复导入记录')
        checks_passed += 1
    
    cursor.execute('''
    SELECT s.id, s.session_uuid, s.success_rows as session_success,
           (SELECT COUNT(*) FROM teller_schedules WHERE session_id = s.id) as schedule_count,
           (SELECT COUNT(*) FROM leave_forms WHERE session_id = s.id) as leave_count,
           (SELECT COUNT(*) FROM business_forecasts WHERE session_id = s.id) as forecast_count
    FROM import_sessions s
    ORDER BY s.id DESC
    LIMIT 10
    ''')
    sessions = cursor.fetchall()
    
    consistency_ok = True
    for s in sessions:
        actual_count = s['schedule_count'] + s['leave_count'] + s['forecast_count']
        if actual_count != s['session_success']:
            click.echo(click.style(f'⚠ 会话 {s["id"]} 数据不一致: 记录 {actual_count} != 期望 {s["session_success"]}', fg='yellow'))
            consistency_ok = False
    
    if consistency_ok:
        click.echo('✓ 会话数据一致性验证通过')
        checks_passed += 1
    else:
        checks_failed += 1
    
    cursor.execute('SELECT COUNT(*) FROM import_sessions WHERE imported_at > ?', 
                   (datetime.now().strftime('%Y-%m-%d 00:00:00'),))
    today_count = cursor.fetchone()[0]
    click.echo(f'✓ 今日导入次数: {today_count}')
    
    conn.close()
    
    click.echo(f'\n检查完成: {click.style(str(checks_passed), fg="green")} 项通过, '
               f'{click.style(str(checks_failed), fg="red" if checks_failed > 0 else "green")} 项问题')
    
    if checks_failed > 0:
        click.echo(click.style('\n建议: 请检查上述黄色警告项', fg='yellow'))
    else:
        click.echo(click.style('\n系统运行正常!', fg='green'))


if __name__ == '__main__':
    main()
