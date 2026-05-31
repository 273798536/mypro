#!/usr/bin/env python3
import argparse
import sys
from datetime import date, datetime
from pathlib import Path

from data_import import DataImporter
from rate_manager import RateManager
from fee_calculator import FeeCalculator
from exception_checker import ExceptionChecker
from correction_guide import CorrectionGuide
from report_exporter import ReportExporter


def print_banner():
    banner = """
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║           证券借券费用日结系统 v1.0                             ║
║                                                               ║
║           Stock Loan Fee Settlement System                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    """
    print(banner)


def cmd_import(args):
    """导入数据命令"""
    print(f"\n📥 开始导入数据...")
    print("-" * 60)
    
    importer = DataImporter()
    
    if args.contracts:
        print(f"导入合约数据: {args.contracts}")
        result = importer.import_contracts_from_csv(args.contracts)
        print(f"  总计: {result.total_records} 条")
        print(f"  成功: {result.imported_records} 条")
        print(f"  失败: {result.failed_records} 条")
        if result.errors:
            print(f"  错误: {len(result.errors)} 个")
            for err in result.errors[:5]:
                print(f"    - {err}")
        if result.warnings:
            print(f"  警告: {len(result.warnings)} 个")
            for w in result.warnings[:5]:
                print(f"    - {w}")
    
    if args.rates:
        print(f"\n导入费率数据: {args.rates}")
        result = importer.import_rates_from_csv(args.rates)
        print(f"  总计: {result.total_records} 条")
        print(f"  成功: {result.imported_records} 条")
        print(f"  失败: {result.failed_records} 条")
        if result.errors:
            print(f"  错误: {len(result.errors)} 个")
            for err in result.errors[:5]:
                print(f"    - {err}")
    
    if args.accounts:
        print(f"\n导入账户数据: {args.accounts}")
        result = importer.import_accounts_from_csv(args.accounts)
        print(f"  总计: {result.total_records} 条")
        print(f"  成功: {result.imported_records} 条")
        print(f"  失败: {result.failed_records} 条")
    
    print("\n" + "-" * 60)
    print(f"导入完成:")
    print(f"  合约: {len(importer.get_contracts())} 份")
    print(f"  费率: {len(importer.get_rates())} 只证券")
    print(f"  账户: {len(importer.get_accounts())} 个")


def cmd_check(args):
    """检查异常命令"""
    print(f"\n🔍 开始数据检查...")
    print("-" * 60)
    
    check_date = args.date or date.today()
    print(f"检查日期: {check_date}")
    
    importer = DataImporter()
    
    if args.contracts:
        importer.import_contracts_from_csv(args.contracts)
    if args.rates:
        importer.import_rates_from_csv(args.rates)
    if args.accounts:
        importer.import_accounts_from_csv(args.accounts)
    
    rate_manager = RateManager()
    for r in importer.get_rates():
        rate_manager.add_rate(r)
    
    checker = ExceptionChecker(rate_manager)
    result = checker.run_all_checks(
        importer.get_contracts(),
        importer.get_accounts(),
        check_date
    )
    
    print("\n异常检查结果:")
    print("=" * 60)
    print(f"总计发现 {result.summary['total']} 个异常")
    print(f"  HIGH:   {result.summary['HIGH']} 个 (需立即处理)")
    print(f"  MEDIUM: {result.summary['MEDIUM']} 个 (需人工审核)")
    print(f"  LOW:    {result.summary['LOW']} 个 (提示信息)")
    
    if result.exceptions:
        action_plan = CorrectionGuide.generate_action_plan(result.exceptions)
        print("\n" + "=" * 60)
        print("📋 修正行动计划")
        print("=" * 60)
        
        if action_plan["urgent"]:
            print(f"\n🔴 紧急处理 ({len(action_plan['urgent'])} 项):")
            for i, item in enumerate(action_plan["urgent"], 1):
                print(f"\n  {i}. {item['title']}")
                print(f"     {item['description'][:80]}...")
                print(f"     → {item['suggestion']}")
        
        if action_plan["review"]:
            print(f"\n🟡 人工审核 ({len(action_plan['review'])} 项):")
            for i, item in enumerate(action_plan["review"], 1):
                print(f"\n  {i}. {item['title']}")
                print(f"     {item['description'][:80]}...")
                print(f"     → {item['suggestion']}")
        
        if action_plan["informational"]:
            print(f"\n🟢 提示信息 ({len(action_plan['informational'])} 项):")
            for i, item in enumerate(action_plan["informational"], 1):
                print(f"  {i}. {item['title']}")
    
    print("\n" + "=" * 60)


def cmd_calculate(args):
    """计算费用命令"""
    print(f"\n🧮 开始费用计算...")
    print("-" * 60)
    
    settlement_date = args.date or date.today()
    print(f"结算日期: {settlement_date}")
    
    importer = DataImporter()
    
    if args.contracts:
        importer.import_contracts_from_csv(args.contracts)
    if args.rates:
        importer.import_rates_from_csv(args.rates)
    
    rate_manager = RateManager()
    for r in importer.get_rates():
        rate_manager.add_rate(r)
    
    calculator = FeeCalculator(rate_manager)
    report = calculator.calculate_settlement(
        importer.get_contracts(),
        settlement_date
    )
    
    print("\n计算结果:")
    print("=" * 60)
    print(f"报告编号: {report.report_id}")
    print(f"有效合约: {report.total_contracts} 份")
    print(f"费用合计: ¥ {report.total_fee:>12,.2f}")
    print("=" * 60)
    
    if args.detail:
        print("\n📊 明细列表 (前20条):")
        print("-" * 80)
        for i, item in enumerate(report.items[:20], 1):
            print(f"{i:3d}. {item.account_name:<15} {item.security_name:<12} "
                  f"¥{item.total_fee:>10,.2f} ({item.days}天)")
            if item.exceptions:
                for exc in item.exceptions:
                    print(f"     ⚠️  {exc.title}")
    
    if report.exceptions:
        print(f"\n⚠️  计算过程中发现 {len(report.exceptions)} 个异常")
        print("  请运行 check 命令查看详细信息")


def cmd_export(args):
    """导出报表命令"""
    print(f"\n📤 开始导出报表...")
    print("-" * 60)
    
    settlement_date = args.date or date.today()
    print(f"结算日期: {settlement_date}")
    
    importer = DataImporter()
    
    if args.contracts:
        importer.import_contracts_from_csv(args.contracts)
    if args.rates:
        importer.import_rates_from_csv(args.rates)
    if args.accounts:
        importer.import_accounts_from_csv(args.accounts)
    
    rate_manager = RateManager()
    for r in importer.get_rates():
        rate_manager.add_rate(r)
    
    calculator = FeeCalculator(rate_manager)
    report = calculator.calculate_settlement(
        importer.get_contracts(),
        settlement_date
    )
    
    checker = ExceptionChecker(rate_manager)
    check_result = checker.run_all_checks(
        importer.get_contracts(),
        importer.get_accounts(),
        settlement_date
    )
    
    all_exceptions = report.exceptions + check_result.exceptions
    
    exporter = ReportExporter(args.output or "output")
    files = exporter.export_full_report(report, all_exceptions)
    
    print("\n✅ 导出完成!")
    print("=" * 60)
    print(f"生成的文件:")
    for key, path in files.items():
        print(f"  - {key}: {path}")
    print("=" * 60)
    
    with open(files['business_report'], 'r', encoding='utf-8') as f:
        print("\n📄 业务报告预览:")
        print("-" * 80)
        lines = f.readlines()[:50]
        print(''.join(lines))
        print("...")
        print("-" * 80)


def cmd_trace(args):
    """追溯计算过程命令"""
    print(f"\n🔍 计算追溯查询...")
    print("-" * 60)
    
    settlement_date = args.date or date.today()
    
    importer = DataImporter()
    
    if args.contracts:
        importer.import_contracts_from_csv(args.contracts)
    if args.rates:
        importer.import_rates_from_csv(args.rates)
    
    rate_manager = RateManager()
    for r in importer.get_rates():
        rate_manager.add_rate(r)
    
    calculator = FeeCalculator(rate_manager)
    report = calculator.calculate_settlement(
        importer.get_contracts(),
        settlement_date
    )
    
    if args.contract_id:
        item = next((i for i in report.items if i.contract_id == args.contract_id), None)
        if item:
            print(CorrectionGuide.get_calculation_trace(item))
        else:
            print(f"未找到合约 {args.contract_id} 的结算记录")
    else:
        print("请指定 --contract-id 参数查看具体合约的计算过程")


def cmd_rate_history(args):
    """查看费率历史命令"""
    print(f"\n📈 费率历史查询...")
    print("-" * 60)
    
    importer = DataImporter()
    if args.rates:
        importer.import_rates_from_csv(args.rates)
    
    rate_manager = RateManager()
    for r in importer.get_rates():
        rate_manager.add_rate(r)
    
    if args.security_code:
        history = rate_manager.get_rate_history(args.security_code)
        if history:
            security_name = rate_manager.get_security_name(args.security_code)
            print(f"证券: {security_name} ({args.security_code})")
            print("=" * 80)
            print(f"{'版本ID':<20} {'生效日期':<12} {'失效日期':<12} {'费率(%)':<10} {'状态':<8}")
            print("-" * 80)
            for v in history:
                status = "有效" if v['is_active'] else "无效"
                expiry = v['expiry_date'].strftime('%Y-%m-%d') if v['expiry_date'] else "永久"
                print(f"{v['version_id']:<20} {v['effective_date'].strftime('%Y-%m-%d'):<12} "
                      f"{expiry:<12} {v['rate']:<10.4f} {status:<8}")
        else:
            print(f"未找到证券 {args.security_code} 的费率记录")
    else:
        print("所有证券费率概览:")
        for code in rate_manager.list_all_securities():
            name = rate_manager.get_security_name(code)
            result = rate_manager.get_rate_for_date(code, date.today())
            print(f"  {code} {name:<20} 当前费率: {result.rate:.4f}% {result.message}")


def cmd_run_all(args):
    """一键执行：导入 + 检查 + 计算 + 导出"""
    print_banner()
    
    settlement_date = args.date or date.today()
    
    print(f"\n📅 结算日期: {settlement_date}")
    print("=" * 80)
    
    print("\n[1/4] 导入数据...")
    importer = DataImporter()
    
    if args.contracts:
        result = importer.import_contracts_from_csv(args.contracts)
        print(f"  合约: {result.imported_records}/{result.total_records} 条")
    if args.rates:
        result = importer.import_rates_from_csv(args.rates)
        print(f"  费率: {result.imported_records}/{result.total_records} 条")
    if args.accounts:
        result = importer.import_accounts_from_csv(args.accounts)
        print(f"  账户: {result.imported_records}/{result.total_records} 条")
    
    rate_manager = RateManager()
    for r in importer.get_rates():
        rate_manager.add_rate(r)
    
    print("\n[2/4] 异常检查...")
    checker = ExceptionChecker(rate_manager)
    check_result = checker.run_all_checks(
        importer.get_contracts(),
        importer.get_accounts(),
        settlement_date
    )
    print(f"  发现 {check_result.summary['total']} 个异常")
    print(f"    HIGH: {check_result.summary['HIGH']}, MEDIUM: {check_result.summary['MEDIUM']}, LOW: {check_result.summary['LOW']}")
    
    print("\n[3/4] 费用计算...")
    calculator = FeeCalculator(rate_manager)
    report = calculator.calculate_settlement(
        importer.get_contracts(),
        settlement_date
    )
    print(f"  有效合约: {report.total_contracts} 份")
    print(f"  费用合计: ¥ {report.total_fee:>12,.2f}")
    
    print("\n[4/4] 导出报表...")
    exporter = ReportExporter(args.output or "output")
    all_exceptions = report.exceptions + check_result.exceptions
    files = exporter.export_full_report(report, all_exceptions)
    print(f"  已导出 {len(files)} 个文件")
    
    print("\n" + "=" * 80)
    print("✅ 日结完成!")
    print("=" * 80)
    
    if all_exceptions:
        action_plan = CorrectionGuide.generate_action_plan(all_exceptions)
        print("\n📋 待处理事项:")
        if action_plan["urgent"]:
            print(f"  🔴 紧急: {len(action_plan['urgent'])} 项")
        if action_plan["review"]:
            print(f"  🟡 审核: {len(action_plan['review'])} 项")
        if action_plan["informational"]:
            print(f"  🟢 提示: {len(action_plan['informational'])} 项")
        print("\n  详细修正指引请查看输出文件")
    
    print("\n📁 输出文件:")
    for key, path in files.items():
        print(f"  {path}")
    print("=" * 80)


def main():
    parser = argparse.ArgumentParser(
        description="证券借券费用日结系统",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 一键执行完整流程
  python cli.py run-all --contracts data/contracts.csv --rates data/rates.csv --accounts data/accounts.csv
  
  # 仅导入数据
  python cli.py import --contracts data/contracts.csv --rates data/rates.csv
  
  # 检查异常
  python cli.py check --contracts data/contracts.csv --date 2026-05-31
  
  # 计算费用
  python cli.py calculate --contracts data/contracts.csv --rates data/rates.csv
  
  # 导出报表
  python cli.py export --contracts data/contracts.csv --rates data/rates.csv
  
  # 查看计算追溯
  python cli.py trace --contracts data/contracts.csv --contract-id C001
  
  # 查看费率历史
  python cli.py rate-history --rates data/rates.csv --security-code 600000
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="可用命令")
    
    common_args = argparse.ArgumentParser(add_help=False)
    common_args.add_argument("--date", type=lambda s: datetime.strptime(s, "%Y-%m-%d").date(),
                        help="结算日期 (YYYY-MM-DD)，默认今天")
    common_args.add_argument("--contracts", help="合约数据文件路径 (CSV)")
    common_args.add_argument("--rates", help="费率数据文件路径 (CSV)")
    common_args.add_argument("--accounts", help="账户数据文件路径 (CSV)")
    common_args.add_argument("--output", help="输出目录", default="output")
    
    import_parser = subparsers.add_parser("import", help="导入数据", parents=[common_args])
    import_parser.set_defaults(func=cmd_import)
    
    check_parser = subparsers.add_parser("check", help="检查异常", parents=[common_args])
    check_parser.set_defaults(func=cmd_check)
    
    calc_parser = subparsers.add_parser("calculate", help="计算费用", parents=[common_args])
    calc_parser.add_argument("--detail", action="store_true", help="显示明细")
    calc_parser.set_defaults(func=cmd_calculate)
    
    export_parser = subparsers.add_parser("export", help="导出报表", parents=[common_args])
    export_parser.set_defaults(func=cmd_export)
    
    trace_parser = subparsers.add_parser("trace", help="追溯计算过程", parents=[common_args])
    trace_parser.add_argument("--contract-id", help="合约编号")
    trace_parser.set_defaults(func=cmd_trace)
    
    rate_parser = subparsers.add_parser("rate-history", help="查看费率历史", parents=[common_args])
    rate_parser.add_argument("--security-code", help="证券代码")
    rate_parser.set_defaults(func=cmd_rate_history)
    
    run_parser = subparsers.add_parser("run-all", help="一键执行完整流程", parents=[common_args])
    run_parser.set_defaults(func=cmd_run_all)
    
    args = parser.parse_args()
    
    if args.command is None:
        print_banner()
        parser.print_help()
        return 0
    
    if args.command != "import":
        if not args.contracts and not args.rates:
            print("⚠️  警告: 未指定数据文件路径")
    
    try:
        args.func(args)
        return 0
    except KeyboardInterrupt:
        print("\n\n操作已取消")
        return 1
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
