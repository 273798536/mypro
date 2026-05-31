#!/usr/bin/env python3
import sys
import os
import argparse
from datetime import datetime, date
from pathlib import Path

from database import init_db, get_db
from core import VerificationEngine
from export import DataImporter, ExcelExporter


def init_database():
    init_db()
    print('数据库初始化完成 ✓')


def import_data(data_type: str, file_path: str):
    if not os.path.exists(file_path):
        print(f'错误: 文件不存在 {file_path}')
        return
    with get_db() as db:
        importer = DataImporter(db)
        print(f'正在导入 {data_type} 数据...')
        if data_type == 'contract':
            result = importer.import_contracts(file_path)
        elif data_type == 'stay':
            result = importer.import_stays(file_path)
        elif data_type == 'reschedule':
            result = importer.import_reschedules(file_path)
        elif data_type == 'cancel':
            result = importer.import_cancellations(file_path)
        else:
            print(f'错误: 不支持的数据类型 {data_type}')
            return
        print(f'导入完成: 总计{result["total"]}条, 成功{result["imported"]}条, 跳过{result["skipped"]}条')
        if result['warnings']:
            print(f'\n警告 ({len(result["warnings"])}条):')
            for w in result['warnings'][:10]:
                print(f'  ⚠  {w}')
            if len(result['warnings']) > 10:
                print(f'  ... 还有 {len(result["warnings"]) - 10} 条警告')
        if result['errors']:
            print(f'\n错误 ({len(result["errors"])}条):')
            for e in result['errors'][:10]:
                print(f'  ✗ {e}')
            if len(result['errors']) > 10:
                print(f'  ... 还有 {len(result["errors"]) - 10} 条错误')


def run_verification(start_date: str = None, end_date: str = None,
                      hotel: str = None, export: bool = True):
    with get_db() as db:
        engine = VerificationEngine(db)
        print('开始执行核销...')
        start = datetime.strptime(start_date, '%Y-%m-%d').date() if start_date else None
        end = datetime.strptime(end_date, '%Y-%m-%d').date() if end_date else None
        result = engine.verify_all(start_date=start, end_date=end, hotel_name=hotel)
        print(f'\n===== 核销完成 =====')
        print(f'合同总数: {result["total_contracts"]}')
        print(f'核销记录数: {result["total_results"]}')
        summary = result['summary']
        print(f'核销房晚总数: {summary["total_nights"]} 晚')
        print(f'核销金额总计: ¥{summary["total_amount"]:,.2f}')
        print(f'跨周改期: {summary["cross_week_count"]} 条')
        print(f'修正后核销: {summary["revised_count"]} 条')
        print(f'晚到未住: {summary["no_show_count"]} 条')
        print(f'自营补房: {summary["self_booked_count"]} 条')
        print(f'有争议记录: {summary["dispute_count"]} 条')
        print(f'\n按分类统计:')
        for cat, stats in summary['by_category'].items():
            from config import VERIFICATION_CATEGORY
            cat_name = VERIFICATION_CATEGORY.get(cat, cat)
            print(f'  {cat_name}: {stats["count"]}条 / {stats["nights"]}晚 / ¥{stats["amount"]:,.2f}')
        if result['duplicates']:
            print(f'\n⚠ 发现 {len(result["duplicates"])} 组重复房晚:')
            for dup in result['duplicates']:
                print(f'  - {dup["guest_name"]} {dup["checkin_date"]}: 涉及合同 {", ".join(dup["contracts"])}')
        if result['warnings']:
            print(f'\n⚠ 共 {len(result["warnings"])} 条警告信息')
        if result['errors']:
            print(f'\n✗ 共 {len(result["errors"])} 条错误信息')
        if export:
            exporter = ExcelExporter()
            filepath = exporter.export_verification_report(result)
            print(f'\n核销报告已导出: {filepath}')
            audit_path = exporter.export_audit_log(db=db)
            print(f'审计日志已导出: {audit_path}')
        return result


def show_help():
    help_text = '''
旅游包销房晚核销系统 - 使用说明

命令:
  init                 初始化数据库
  import <类型> <文件> 导入数据
    类型: contract | stay | reschedule | cancel
  verify [选项]        执行核销
    选项:
      --start YYYY-MM-DD    开始日期
      --end YYYY-MM-DD      结束日期
      --hotel 名称          酒店名称筛选
      --no-export          不导出报告
  export               导出已生成的核销单
  help                 显示帮助

示例:
  python main.py init
  python main.py import contract 包销合同.xlsx
  python main.py import stay 入住清单.xlsx
  python main.py import reschedule 改期记录.xlsx
  python main.py import cancel 取消记录.xlsx
  python main.py verify --start 2026-05-01 --end 2026-05-31
  python main.py verify --hotel 希尔顿

数据格式要求:
  - Excel或CSV文件均可
  - 列名支持中英文自动识别
  - 日期格式支持多种格式 (YYYY-MM-DD, YYYY/MM/DD, YYYY年MM月DD日等)
  - 空值会自动处理
  - 备注中的关键字会自动识别(晚到、自营、争议、改期等)
'''
    print(help_text)


def main():
    if len(sys.argv) < 2:
        show_help()
        return
    command = sys.argv[1]
    if command == 'init':
        init_database()
    elif command == 'import':
        if len(sys.argv) < 4:
            print('用法: python main.py import <类型> <文件>')
            print('类型: contract | stay | reschedule | cancel')
            return
        import_data(sys.argv[2], sys.argv[3])
    elif command == 'verify':
        parser = argparse.ArgumentParser()
        parser.add_argument('--start', help='开始日期 YYYY-MM-DD')
        parser.add_argument('--end', help='结束日期 YYYY-MM-DD')
        parser.add_argument('--hotel', help='酒店名称')
        parser.add_argument('--no-export', action='store_true', help='不导出报告')
        args, _ = parser.parse_known_args(sys.argv[2:])
        run_verification(args.start, args.end, args.hotel, not args.no_export)
    elif command == 'help' or command == '-h' or command == '--help':
        show_help()
    else:
        print(f'未知命令: {command}')
        show_help()


if __name__ == '__main__':
    main()
