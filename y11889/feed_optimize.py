#!/usr/bin/env python3
import argparse
import sys
import os

from feed_optimizer import (
    FormulationRunner,
    SolutionComparator,
    HistoryManager,
    ReportGenerator
)


def main():
    parser = argparse.ArgumentParser(
        description='饲料配方线性规划助手 - 实用型配方优化工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例:
  # 基础配方
  python feed_optimize.py run examples/ingredients_base.csv --protein 18 --energy 3.2
  
  # 指定产量和最低比例
  python feed_optimize.py run examples/ingredients_base.csv --protein 18 --production 500
  
  # 对比两次运行结果
  python feed_optimize.py compare 1 2
  
  # 查看历史记录
  python feed_optimize.py history
  
  # 查看月度汇总
  python feed_optimize.py monthly 2026 5
  
  # 导出报告
  python feed_optimize.py report 1 --excel report.xlsx
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    run_parser = subparsers.add_parser('run', help='运行配方优化')
    run_parser.add_argument('ingredients_file', help='原料数据文件(csv/xlsx)')
    run_parser.add_argument('--name', '-n', help='方案名称')
    run_parser.add_argument('--protein', type=float, required=True, help='粗蛋白最低要求(%)')
    run_parser.add_argument('--protein-max', type=float, help='粗蛋白最高限制(%)')
    run_parser.add_argument('--energy', type=float, required=True, help='消化能最低要求(兆卡/公斤)')
    run_parser.add_argument('--energy-max', type=float, help='消化能最高限制(兆卡/公斤)')
    run_parser.add_argument('--production', type=float, default=1000, help='目标产量(吨),默认1000吨')
    run_parser.add_argument('--save', action='store_true', help='保存到历史记录')
    run_parser.add_argument('--export-excel', help='导出Excel报告')
    run_parser.add_argument('--export-txt', help='导出文本报告')
    
    compare_parser = subparsers.add_parser('compare', help='对比两个方案')
    compare_parser.add_argument('run_id1', type=int, help='第一个方案ID')
    compare_parser.add_argument('run_id2', type=int, help='第二个方案ID')
    compare_parser.add_argument('--export-txt', help='导出对比报告')
    
    history_parser = subparsers.add_parser('history', help='查看历史记录')
    history_parser.add_argument('--limit', type=int, default=10, help='显示最近N条记录')
    
    monthly_parser = subparsers.add_parser('monthly', help='查看月度汇总')
    monthly_parser.add_argument('year', type=int, help='年份')
    monthly_parser.add_argument('month', type=int, help='月份')
    monthly_parser.add_argument('--export-excel', help='导出月度汇总Excel')
    
    report_parser = subparsers.add_parser('report', help='生成指定方案的报告')
    report_parser.add_argument('run_id', type=int, help='方案ID')
    report_parser.add_argument('--excel', help='导出Excel报告')
    report_parser.add_argument('--txt', help='导出文本报告')
    
    load_parser = subparsers.add_parser('load', help='加载历史方案')
    load_parser.add_argument('filepath', help='历史方案文件路径')
    
    args = parser.parse_args()
    
    runner = FormulationRunner()
    history_mgr = HistoryManager()
    reporter = ReportGenerator()
    
    if args.command == 'run':
        constraints = {
            '目标产量': args.production,
            '粗蛋白最低': args.protein,
            '消化能最低': args.energy
        }
        if args.protein_max:
            constraints['粗蛋白最高'] = args.protein_max
        if args.energy_max:
            constraints['消化能最高'] = args.energy_max
        
        print(f"正在运行配方优化: {args.name or '未命名方案'}")
        print(f"原料文件: {args.ingredients_file}")
        print(f"约束条件: {constraints}")
        print("-" * 60)
        
        result = runner.run_formulation(args.ingredients_file, constraints, args.name)
        
        report = reporter.generate_text_report(result)
        print(report)
        
        if args.save:
            filepath = history_mgr.save_run(result)
            print(f"\n方案已保存: {filepath}")
        
        if args.export_excel:
            reporter.export_to_excel(result, args.export_excel)
            print(f"\nExcel报告已导出: {args.export_excel}")
        
        if args.export_txt:
            reporter.export_to_text(report, args.export_txt)
            print(f"文本报告已导出: {args.export_txt}")
    
    elif args.command == 'compare':
        run1 = history_mgr.get_run_by_id(args.run_id1)
        run2 = history_mgr.get_run_by_id(args.run_id2)
        
        if not run1 or not run2:
            print(f"错误: 找不到方案记录")
            print(f"  方案{args.run_id1}: {'存在' if run1 else '不存在'}")
            print(f"  方案{args.run_id2}: {'存在' if run2 else '不存在'}")
            sys.exit(1)
        
        comparator = SolutionComparator()
        comparison = comparator.compare(run1, run2)
        
        report = reporter.generate_comparison_report(comparison)
        print(report)
        
        if args.export_txt:
            reporter.export_to_text(report, args.export_txt)
            print(f"\n对比报告已导出: {args.export_txt}")
    
    elif args.command == 'history':
        runs = history_mgr.list_runs()
        if not runs:
            print("暂无历史记录")
            return
        
        print(f"最近运行记录 (显示前{args.limit}条):")
        print("-" * 80)
        print(f"{'ID':<4} {'名称':<15} {'时间':<20} {'状态':<15} {'成本(元)':>10}")
        print("-" * 80)
        
        for run in runs[:args.limit]:
            status = "✓可行" if run['可行'] else "✗不可行"
            print(f"{run['run_id']:<4} {run['run_name'][:14]:<15} {run['timestamp'][:19]:<20} {status:<15} {run['总成本(元)']:>10.2f}")
    
    elif args.command == 'monthly':
        summary = history_mgr.get_monthly_summary(args.year, args.month)
        print(f"\n{summary['月份']}汇总")
        print("=" * 40)
        print(f"总运行次数: {summary['总运行次数']}")
        print(f"可行方案数: {summary['可行方案数']}")
        print(f"成功率: {summary['成功率']}%")
        print(f"最低成本: {summary['成本统计']['最低成本']:.2f} 元")
        print(f"最高成本: {summary['成本统计']['最高成本']:.2f} 元")
        print(f"平均成本: {summary['成本统计']['平均成本']:.2f} 元")
        
        if args.export_excel:
            history_mgr.export_to_excel(args.year, args.month, args.export_excel)
            print(f"\n月度汇总已导出: {args.export_excel}")
    
    elif args.command == 'report':
        run = history_mgr.get_run_by_id(args.run_id)
        if not run:
            print(f"错误: 找不到方案ID {args.run_id}")
            sys.exit(1)
        
        report = reporter.generate_text_report(run)
        print(report)
        
        if args.excel:
            reporter.export_to_excel(run, args.excel)
            print(f"\nExcel报告已导出: {args.excel}")
        
        if args.txt:
            reporter.export_to_text(report, args.txt)
            print(f"文本报告已导出: {args.txt}")
    
    elif args.command == 'load':
        if os.path.exists(args.filepath):
            run = history_mgr.load_run(args.filepath)
            print(f"已加载方案: {run['run_name']} (ID: {run['run_id']})")
        else:
            print(f"错误: 文件不存在 {args.filepath}")
            sys.exit(1)
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
