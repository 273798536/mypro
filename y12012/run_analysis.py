#!/usr/bin/env python3
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.data_processor import FeeDataProcessor
from src.report_generator import ReportGenerator

def main():
    print('=' * 60)
    print('学校代收费退补分析工具')
    print('=' * 60)
    
    students_path = 'data/students.csv'
    payments_path = 'data/payments.csv'
    
    if len(sys.argv) >= 3:
        students_path = sys.argv[1]
        payments_path = sys.argv[2]
    
    print(f'学生名单文件: {students_path}')
    print(f'缴费流水文件: {payments_path}')
    print()
    
    if not os.path.exists(students_path):
        print(f'错误: 学生名单文件不存在: {students_path}')
        sys.exit(1)
    
    if not os.path.exists(payments_path):
        print(f'错误: 缴费流水文件不存在: {payments_path}')
        sys.exit(1)
    
    print('正在处理数据...')
    processor = FeeDataProcessor()
    processor.process_all(students_path, payments_path)
    print('数据处理完成！')
    print()
    
    print('正在生成报告...')
    generator = ReportGenerator(processor)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    excel_path = f'output/代收费退补报告_{timestamp}.xlsx'
    txt_path = f'output/代收费退补报告_{timestamp}.txt'
    
    os.makedirs('output', exist_ok=True)
    
    generator.generate_excel_report(excel_path)
    print(f'Excel 报告已生成: {excel_path}')
    
    generator.save_plain_report(txt_path)
    print(f'文字报告已生成: {txt_path}')
    print()
    
    print('=' * 60)
    print('分析概要')
    print('=' * 60)
    
    fee_summary = processor.aggregate_fees()
    total_expected = fee_summary['应收金额'].sum()
    total_actual = fee_summary['实收金额'].sum()
    total_diff = total_actual - total_expected
    
    print(f'应收费总额: {total_expected:,.2f} 元')
    print(f'实际收费总额: {total_actual:,.2f} 元')
    print(f'总体差额: {total_diff:,.2f} 元')
    print()
    
    print(f'数据冲突: {len(processor.conflicts)} 条')
    for anomaly_type, records in processor.anomalies.items():
        print(f'{anomaly_type}: {len(records)} 条')
    print()
    
    print('=' * 60)
    print('文字报告预览:')
    print('=' * 60)
    print()
    with open(txt_path, 'r', encoding='utf-8') as f:
        content = f.read()
        print(content[:2000])
        if len(content) > 2000:
            print()
            print('... (报告过长，请查看完整文件)')
    
    print()
    print('完成！请查看 output 目录下的报告文件。')

if __name__ == '__main__':
    main()
