#!/usr/bin/env python3
import sys
import os
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.database import init_db
from core.processor import (
    import_sample_boxes, import_aquaculture_logs, import_wave_forecasts,
    list_sample_boxes, get_sample_box, add_review_note, get_abnormal_summary,
    get_trace_chain
)
from core.exporter import export_report, export_single_box_report
from config import STATUS_LABELS, ABNORMAL_TYPES, STATUS_COLORS


def print_header(title):
    print()
    print('=' * 60)
    print(f'  {title}')
    print('=' * 60)


def print_color_bar():
    print()
    print('【颜色图例】')
    for status, color in STATUS_COLORS.items():
        label = STATUS_LABELS.get(status, status)
        print(f'  ██ {color}  {label}')
    print()


def cmd_init(args):
    init_db()
    print('✓ 数据库初始化完成')
    print()
    print_color_bar()
    print('使用方法：')
    print('  python cli.py import boxes <文件路径>  # 导入样品箱数据')
    print('  python cli.py import logs <文件路径>   # 导入养殖日志')
    print('  python cli.py import waves <文件路径>  # 导入风浪预报')
    print('  python cli.py list                    # 列出所有样品箱')
    print('  python cli.py list --status abnormal  # 查看异常样品箱')
    print('  python cli.py show <箱号或ID>         # 查看样品箱详情')
    print('  python cli.py trace <箱号或ID>        # 追溯链路查询')
    print('  python cli.py review <箱号或ID>       # 复核样品箱')
    print('  python cli.py export                  # 导出报告')
    print('  python cli.py summary                 # 查看汇总统计')


def cmd_import(args):
    data_type = args.type
    file_path = args.file
    operator = args.operator or '海洋老师'
    
    if not os.path.exists(file_path):
        print(f'✗ 文件不存在: {file_path}')
        return
    
    print_header(f'导入{data_type}数据')
    print(f'文件: {file_path}')
    print(f'操作人: {operator}')
    print()
    
    if data_type == 'boxes':
        result = import_sample_boxes(file_path, operator)
    elif data_type == 'logs':
        result = import_aquaculture_logs(file_path, operator)
    elif data_type == 'waves':
        result = import_wave_forecasts(file_path, operator)
    else:
        print(f'✗ 未知数据类型: {data_type}')
        return
    
    if result.get('success'):
        print(f'✓ 导入成功，共处理 {result.get("imported", 0) + result.get("updated", 0)} 条记录')
        if 'updated' in result:
            print(f'  - 新增: {result.get("imported", 0)} 条')
            print(f'  - 更新: {result.get("updated", 0)} 条')
    else:
        print(f'✗ 导入失败: {result.get("message", "未知错误")}')
    
    print()


def cmd_list(args):
    status = args.status
    keyword = args.keyword
    
    print_header('样品箱列表')
    
    boxes = list_sample_boxes(status=status, keyword=keyword)
    
    if not boxes:
        print('  暂无数据')
        print()
        return
    
    print(f'  共 {len(boxes)} 个样品箱')
    print()
    print(f'  {"编号":<12} {"站点":<10} {"状态":<8} {"异常类型":<20} {"采样时间":<20}')
    print('  ' + '-' * 72)
    
    for box in boxes:
        status_label = STATUS_LABELS.get(box.get('status', ''), box.get('status', ''))
        abnormal_names = [ABNORMAL_TYPES.get(a, a) for a in box.get('abnormal_list', [])]
        abnormal_str = '、'.join(abnormal_names) if abnormal_names else '-'
        
        print(f'  {box.get("box_code", ""):<12} {box.get("station_name", ""):<10} {status_label:<8} {abnormal_str:<20} {box.get("collection_time", ""):<20}')
    
    print()
    print_color_bar()
    print('【复核入口】')
    print('  运行: python cli.py review <箱号>  进行复核')
    print()


def cmd_show(args):
    identifier = args.identifier
    
    print_header('样品箱详情')
    
    try:
        box_id = int(identifier)
        box = get_sample_box(box_id=box_id)
    except ValueError:
        box = get_sample_box(box_code=identifier)
    
    if not box:
        print(f'  未找到样品箱: {identifier}')
        print()
        return
    
    status_label = STATUS_LABELS.get(box.get('status', ''), box.get('status', ''))
    color = STATUS_COLORS.get(box.get('status', ''), '#666')
    
    print(f'  样品箱编号: {box.get("box_code", "")}')
    print(f'  航次名称: {box.get("expedition_name", "-")}')
    print(f'  站点名称: {box.get("station_name", "-")}')
    print(f'  样品类型: {box.get("sample_type", "-")}')
    print(f'  采样时间: {box.get("collection_time", "-")}')
    print(f'  存储温度: {box.get("storage_temp", "-")} ℃')
    print(f'  运输状态: {box.get("transport_status", "-")}')
    print(f'  当前状态: ██ {color}  {status_label}')
    
    abnormal_list = box.get('abnormal_list', [])
    if abnormal_list:
        abnormal_names = [ABNORMAL_TYPES.get(a, a) for a in abnormal_list]
        print(f'  异常类型: {", ".join(abnormal_names)}')
    
    if box.get('aquaculture_log'):
        log = box['aquaculture_log']
        print()
        print('  ┌─ 养殖日志关联')
        print(f'  │ 日期: {log.get("log_date", "-")}')
        print(f'  │ 水温: {log.get("water_temp", "-")} ℃')
        print(f'  │ 溶解氧: {log.get("dissolved_oxygen", "-")} mg/L')
        print(f'  │ 备注: {log.get("notes", "-")}')
    
    if box.get('wave_forecast'):
        wf = box['wave_forecast']
        print()
        print('  ┌─ 风浪预报关联')
        print(f'  │ 预报日期: {wf.get("forecast_date", "-")}')
        print(f'  │ 浪高: {wf.get("wave_height", "-")} m')
        print(f'  │ 风速: {wf.get("wind_speed", "-")} m/s')
        print(f'  │ 是否延迟: {"是" if wf.get("is_delayed") else "否"}')
        if wf.get('delay_reason'):
            print(f'  │ 延迟原因: {wf.get("delay_reason", "-")}')
    
    if box.get('processing_records'):
        print()
        print('  ┌─ 处理记录 (最近3条)')
        for rec in box['processing_records'][:3]:
            print(f'  │ [{rec.get("created_at", "")}] {rec.get("action", "")} - {rec.get("operator", "")}')
            print(f'  │   {rec.get("detail", "")}')
    
    if box.get('review_notes'):
        print()
        print('  ┌─ 复核记录')
        for note in box['review_notes']:
            print(f'  │ [{note.get("created_at", "")}] {note.get("reviewer", "")}: {note.get("review_result", "")}')
            if note.get('opinion'):
                print(f'  │   意见: {note.get("opinion", "")}')
            if note.get('handling_suggestion'):
                print(f'  │   处理建议: {note.get("handling_suggestion", "")}')
    
    print()
    print('【复核入口】')
    print(f'  运行: python cli.py review {box.get("box_code", "")}  进行复核')
    print()


def cmd_trace(args):
    identifier = args.identifier
    
    print_header('追溯链路查询')
    
    try:
        box_id = int(identifier)
        chain = get_trace_chain(box_id=box_id)
    except ValueError:
        box = get_sample_box(box_code=identifier)
        if not box:
            print(f'  未找到样品箱: {identifier}')
            print()
            return
        chain = get_trace_chain(box_id=box['id'])
    
    if not chain:
        print(f'  未找到追溯数据')
        print()
        return
    
    box = chain['box']
    
    print()
    print('  ▶ 最终结果: 样品箱状态')
    print(f'    样品箱: {box.get("box_code", "")}')
    print(f'    状态: {STATUS_LABELS.get(box.get("status", ""), box.get("status", ""))}')
    
    if box.get('abnormal_list'):
        abnormal_names = [ABNORMAL_TYPES.get(a, a) for a in box['abnormal_list']]
        print(f'    异常: {", ".join(abnormal_names)}')
    
    print()
    print('  ▼ 向下追溯: 处理记录')
    
    if chain.get('processing_records'):
        for i, rec in enumerate(chain['processing_records']):
            prefix = '    └─' if i == len(chain['processing_records']) - 1 else '    ├─'
            print(f'{prefix} [{rec.get("created_at", "")}] {rec.get("action", "")} by {rec.get("operator", "")}')
            print(f'       {rec.get("detail", "")}')
            if rec.get('source_file'):
                print(f'       来源: {rec.get("source_file", "")} 行 {rec.get("source_row", "")}')
    
    print()
    print('  ▼ 向下追溯: 关联原始数据')
    
    related = chain.get('related_data', {})
    
    if related.get('wave_forecast'):
        wf = related['wave_forecast']
        print('    ├─ 风浪预报数据')
        print(f'    │   日期: {wf.get("forecast_date", "-")}')
        print(f'    │   站点: {wf.get("station_name", "-")}')
        print(f'    │   延迟: {"是" if wf.get("is_delayed") else "否"}')
        if wf.get('delay_reason'):
            print(f'    │   原因: {wf.get("delay_reason", "-")}')
        print(f'    │   来源文件: {wf.get("source_file", "-")}')
    
    if related.get('aquaculture_log'):
        log = related['aquaculture_log']
        print('    └─ 养殖日志数据')
        print(f'        日期: {log.get("log_date", "-")}')
        print(f'        站点: {log.get("station_name", "-")}')
        print(f'        水温: {log.get("water_temp", "-")} ℃')
        print(f'        来源文件: {log.get("source_file", "-")}')
    
    if chain.get('review_notes'):
        print()
        print('  ▼ 复核意见')
        for note in chain['review_notes']:
            print(f'    └─ {note.get("reviewer", "")} ({note.get("created_at", "")})')
            print(f'       结果: {note.get("review_result", "")}')
            print(f'       意见: {note.get("opinion", "-")}')
            print(f'       处理建议: {note.get("handling_suggestion", "-")}')
    
    print()
    print('【复核入口】')
    print(f'  运行: python cli.py review {box.get("box_code", "")}  进行复核')
    print()


def cmd_review(args):
    identifier = args.identifier
    
    try:
        box_id = int(identifier)
        box = get_sample_box(box_id=box_id)
    except ValueError:
        box = get_sample_box(box_code=identifier)
    
    if not box:
        print(f'✗ 未找到样品箱: {identifier}')
        return
    
    print_header(f'复核样品箱: {box.get("box_code", "")}')
    print(f'当前状态: {STATUS_LABELS.get(box.get("status", ""), box.get("status", ""))}')
    
    if box.get('abnormal_list'):
        abnormal_names = [ABNORMAL_TYPES.get(a, a) for a in box['abnormal_list']]
        print(f'异常类型: {", ".join(abnormal_names)}')
    
    print()
    
    if args.result:
        result = args.result
    else:
        print('请选择复核结果:')
        print('  1) 通过')
        print('  2) 驳回')
        print('  3) 待跟进')
        choice = input('请输入选项 (1-3): ').strip()
        
        result_map = {'1': '通过', '2': '驳回', '3': '待跟进'}
        result = result_map.get(choice, '待跟进')
    
    if args.reviewer:
        reviewer = args.reviewer
    else:
        reviewer = input('请输入复核人姓名: ').strip() or '海洋老师'
    
    if args.opinion:
        opinion = args.opinion
    else:
        opinion = input('请输入复核意见 (可选): ').strip()
    
    if args.suggestion:
        suggestion = args.suggestion
    else:
        suggestion = input('请输入处理建议 (可选): ').strip()
    
    print()
    print('正在提交复核...')
    
    add_review_note(box['id'], reviewer, result, opinion, suggestion)
    
    print(f'✓ 复核完成')
    print(f'  结果: {result}')
    print(f'  复核人: {reviewer}')
    if opinion:
        print(f'  意见: {opinion}')
    if suggestion:
        print(f'  处理建议: {suggestion}')
    
    print()
    print('  * 复核记录已存入处理记录，报告导出时会自动包含')
    print()


def cmd_export(args):
    format_type = args.format or 'excel'
    status_filter = args.status
    
    print_header('导出报告')
    print(f'格式: {format_type}')
    if status_filter:
        print(f'状态筛选: {status_filter}')
    print()
    
    result = export_report(format_type=format_type, status_filter=status_filter)
    
    if result.get('success'):
        print(f'✓ 导出成功')
        print(f'  文件名: {result.get("file_name", "")}')
        print(f'  路径: {result.get("file_path", "")}')
        print(f'  包含样品箱: {result.get("box_count", 0)} 个')
    else:
        print(f'✗ 导出失败: {result.get("message", "未知错误")}')
    
    print()


def cmd_summary(args):
    summary = get_abnormal_summary()
    
    print_header('数据汇总')
    
    print(f'  样品箱总数: {summary["total"]}')
    print()
    
    print(f'  正常: {summary["normal"]}  ██ {STATUS_COLORS["normal"]}')
    print(f'  预警: {summary["warning"]}  ██ {STATUS_COLORS["warning"]}')
    print(f'  异常: {summary["abnormal"]}  ██ {STATUS_COLORS["abnormal"]}')
    print(f'  已复核: {summary["reviewed"]}  ██ {STATUS_COLORS["reviewed"]}')
    print(f'  待处理: {summary["pending"]}  ██ {STATUS_COLORS["pending"]}')
    
    print()
    print('异常类型分布:')
    for atype, count in summary.get('by_type', {}).items():
        name = ABNORMAL_TYPES.get(atype, atype)
        if count > 0:
            print(f'  - {name}: {count} 条')
    
    print()
    print_color_bar()
    print('【快速操作】')
    print('  python cli.py list --status abnormal  # 查看所有异常')
    print('  python cli.py review <箱号>           # 复核某个样品箱')
    print('  python cli.py export                  # 导出完整报告')
    print()


def main():
    parser = argparse.ArgumentParser(
        description='海洋科考样品箱追踪系统 - 命令行接口',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
示例:
  python cli.py init                      # 初始化数据库
  python cli.py import boxes data.xlsx   # 导入样品箱数据
  python cli.py list --status abnormal   # 查看异常样品箱
  python cli.py show BOX001              # 查看样品箱详情
  python cli.py trace BOX001             # 追溯链路查询
  python cli.py review BOX001            # 复核样品箱
  python cli.py export                   # 导出报告
  python cli.py summary                  # 查看汇总
        '''
    )
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    init_parser = subparsers.add_parser('init', help='初始化数据库')
    
    import_parser = subparsers.add_parser('import', help='导入数据')
    import_parser.add_argument('type', choices=['boxes', 'logs', 'waves'], help='数据类型')
    import_parser.add_argument('file', help='数据文件路径')
    import_parser.add_argument('--operator', '-o', help='操作人姓名')
    
    list_parser = subparsers.add_parser('list', help='列出样品箱')
    list_parser.add_argument('--status', '-s', help='按状态筛选')
    list_parser.add_argument('--keyword', '-k', help='关键词搜索')
    
    show_parser = subparsers.add_parser('show', help='查看样品箱详情')
    show_parser.add_argument('identifier', help='样品箱编号或ID')
    
    trace_parser = subparsers.add_parser('trace', help='追溯链路查询')
    trace_parser.add_argument('identifier', help='样品箱编号或ID')
    
    review_parser = subparsers.add_parser('review', help='复核样品箱')
    review_parser.add_argument('identifier', help='样品箱编号或ID')
    review_parser.add_argument('--result', '-r', choices=['通过', '驳回', '待跟进'], help='复核结果')
    review_parser.add_argument('--reviewer', '-v', help='复核人')
    review_parser.add_argument('--opinion', '-p', help='复核意见')
    review_parser.add_argument('--suggestion', '-g', help='处理建议')
    
    export_parser = subparsers.add_parser('export', help='导出报告')
    export_parser.add_argument('--format', '-f', choices=['excel', 'csv', 'json'], default='excel', help='导出格式')
    export_parser.add_argument('--status', '-s', help='按状态筛选导出')
    
    summary_parser = subparsers.add_parser('summary', help='查看汇总统计')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    if args.command == 'init':
        cmd_init(args)
    elif args.command == 'import':
        cmd_import(args)
    elif args.command == 'list':
        cmd_list(args)
    elif args.command == 'show':
        cmd_show(args)
    elif args.command == 'trace':
        cmd_trace(args)
    elif args.command == 'review':
        cmd_review(args)
    elif args.command == 'export':
        cmd_export(args)
    elif args.command == 'summary':
        cmd_summary(args)


if __name__ == '__main__':
    main()
