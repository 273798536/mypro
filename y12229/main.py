#!/usr/bin/env python3
import argparse
import sys
import os

from data_import import DataStore
from verification import PriceLockVerifier
from report_generator import ReportGenerator
from bill_exporter import BillExporter


def main():
    parser = argparse.ArgumentParser(
        description="海运运价锁价核验工具 - 核验锁价协议、订舱单和费用报告的一致性",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  python main.py --agreements data/agreements.xlsx --bookings data/bookings.xlsx --amendments data/amendments.xlsx --baf-rates data/baf_rates.xlsx --cost-reports data/cost_reports.xlsx --output output/
  python main.py -a agreements.xlsx -b bookings.xlsx -m amendments.xlsx -r baf_rates.xlsx -c cost_reports.xlsx -o output/ --summary
        """,
    )

    parser.add_argument(
        "-a",
        "--agreements",
        required=True,
        help="锁价协议文件路径 (Excel/CSV)",
    )
    parser.add_argument(
        "-b",
        "--bookings",
        required=True,
        help="订舱单文件路径 (Excel/CSV)",
    )
    parser.add_argument(
        "-m",
        "--amendments",
        default=None,
        help="改单记录文件路径 (Excel/CSV)",
    )
    parser.add_argument(
        "-r",
        "--baf-rates",
        default=None,
        help="燃油费率表文件路径 (Excel/CSV)",
    )
    parser.add_argument(
        "-c",
        "--cost-reports",
        default=None,
        help="费用报告文件路径 (Excel/CSV)",
    )
    parser.add_argument(
        "-o",
        "--output",
        default="./output",
        help="输出目录路径 (默认: ./output)",
    )
    parser.add_argument(
        "--summary",
        action="store_true",
        help="只显示汇总信息，不显示详细报告",
    )
    parser.add_argument(
        "--no-export",
        action="store_true",
        help="不导出文件，只在控制台显示结果",
    )

    args = parser.parse_args()

    print("=" * 80)
    print("海运运价锁价核验工具")
    print("=" * 80)
    print()

    try:
        print("正在加载数据...")
        data_store = DataStore()
        
        data_store.load_agreements(args.agreements)
        print(f"  ✓ 已加载 {len(data_store.agreements)} 条锁价协议")
        
        data_store.load_bookings(args.bookings)
        print(f"  ✓ 已加载 {len(data_store.bookings)} 条订舱记录")
        
        if args.amendments and os.path.exists(args.amendments):
            data_store.load_amendments(args.amendments)
            total_amendments = sum(len(amds) for amds in data_store.amendments.values())
            print(f"  ✓ 已加载 {total_amendments} 条改单记录")
        
        if args.baf_rates and os.path.exists(args.baf_rates):
            data_store.load_baf_rates(args.baf_rates)
            print(f"  ✓ 已加载 {len(data_store.baf_rates)} 条燃油费率")
        
        if args.cost_reports and os.path.exists(args.cost_reports):
            data_store.load_cost_reports(args.cost_reports)
            total_reports = sum(len(reps) for reps in data_store.cost_reports.values())
            print(f"  ✓ 已加载 {total_reports} 条费用报告")
        
        print()

        print("正在执行核验...")
        verifier = PriceLockVerifier(data_store)
        results = verifier.verify_all()
        print(f"  ✓ 已完成 {len(results)} 条订舱的核验")
        print()

        report_gen = ReportGenerator(results)

        print("问题清单:")
        print("-" * 80)
        print(report_gen.generate_issue_summary())
        print()

        if not args.summary:
            print("详细报告:")
            print("-" * 80)
            print(report_gen.generate_detailed_report())

        print("汇总表:")
        print("-" * 80)
        print(report_gen.generate_tabular_summary())

        if not args.no_export:
            os.makedirs(args.output, exist_ok=True)
            print("正在导出文件...")

            json_path = os.path.join(args.output, "verification_results.json")
            report_gen.export_to_json(json_path)
            print(f"  ✓ 已导出核验结果 (JSON): {json_path}")

            excel_path = os.path.join(args.output, "export_bills.xlsx")
            bill_exporter = BillExporter(data_store, results)
            bill_exporter.export_to_excel(excel_path)
            print(f"  ✓ 已导出账单 (Excel): {excel_path}")

            csv_path = os.path.join(args.output, "export_bills.csv")
            bill_exporter.export_to_csv(csv_path)
            print(f"  ✓ 已导出账单 (CSV): {csv_path}")

            print()
            print("✓ 核验完成！所有文件已导出到:", os.path.abspath(args.output))

    except FileNotFoundError as e:
        print(f"✗ 错误: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"✗ 执行出错: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
