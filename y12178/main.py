import sys
import os
from typing import Optional

from models import IssueType
from data_importer import DataImporter
from tracker import RecordStoreTracker
from report_generator import ReportGenerator


class RecordStoreTrackingApp:
    def __init__(self):
        self.importer = DataImporter()
        self.tracker = RecordStoreTracker()
        self.result = None
        self.bad_rows = []
        self.orders = []

    def import_data(self, csv_file: str) -> bool:
        if not os.path.exists(csv_file):
            print(f"错误: 文件不存在: {csv_file}")
            return False
        
        print(f"正在导入数据: {csv_file}")
        self.orders, self.bad_rows, import_issues = self.importer.import_csv(csv_file)
        
        print(f"导入完成: {len(self.orders)} 条订单, {len(self.bad_rows)} 条坏行")
        return True

    def process_tracking(self):
        if not self.orders:
            print("没有订单数据可处理")
            return False
        
        print("正在处理追踪...")
        self.result = self.tracker.process_orders(self.orders)
        print(f"处理完成: 发现 {self.result['total_issues']} 个问题")
        return True

    def show_summary(self):
        if not self.result:
            print("请先运行处理")
            return
        
        report = ReportGenerator.generate_summary_report(self.result, self.bad_rows)
        print(report)

    def show_bad_rows(self):
        if not self.bad_rows:
            print("没有坏行数据")
            return
        
        report = ReportGenerator.generate_bad_rows_report(self.bad_rows)
        print(report)

    def show_duplicates(self):
        if not self.result:
            print("请先运行处理")
            return
        
        report = ReportGenerator.generate_duplicate_report(self.tracker)
        if report:
            print(report)
        else:
            print("没有发现签名号重复")

    def show_gift_issues(self):
        if not self.result:
            print("请先运行处理")
            return
        
        report = ReportGenerator.generate_gift_out_of_stock_report(self.result['issues'])
        if report:
            print(report)
        else:
            print("没有发现赠品缺货问题")

    def show_address_changes(self):
        if not self.result:
            print("请先运行处理")
            return
        
        report = ReportGenerator.generate_address_change_report(self.result['issues'])
        if report:
            print(report)
        else:
            print("没有发现订单改址")

    def show_order_trace(self, order_id: str):
        if not self.tracker:
            print("请先运行处理")
            return
        
        trace = self.tracker.trace_manager.get_trace(order_id)
        if not trace:
            print(f"未找到订单: {order_id}")
            return
        
        report = ReportGenerator.generate_trace_report(trace)
        print(report)

    def show_full_report(self):
        if not self.result:
            print("请先运行处理")
            return
        
        report = ReportGenerator.generate_full_report(
            self.result, self.bad_rows, self.tracker
        )
        print(report)

    def filter_by_sku(self, sku: str):
        if not self.result:
            print("请先运行处理")
            return
        
        issues = self.tracker.filter_issues(sku=sku)
        if not issues:
            print(f"SKU {sku} 没有发现问题")
            return
        
        print(f"\nSKU {sku} 的问题清单 ({len(issues)} 条):")
        for i, issue in enumerate(issues, 1):
            status = "待复核" if not issue.reviewed else "已复核"
            print(f"  {i}. [{issue.issue_type.value}] [{status}] {issue.description}")

    def mark_issue_reviewed(self, issue_id: str, reviewer: str, resolution: str):
        success = self.tracker.mark_issue_reviewed(issue_id, reviewer, resolution)
        if success:
            print(f"问题 {issue_id} 已标记为已复核")
        else:
            print(f"未找到问题: {issue_id}")

    def export_report(self, output_file: str):
        if not self.result:
            print("请先运行处理")
            return
        
        ReportGenerator.export_json(
            self.result, self.bad_rows, self.result['traces'], output_file
        )
        print(f"报告已导出到: {output_file}")

    def run_demo(self):
        demo_file = "demo_data.csv"
        if not os.path.exists(demo_file):
            print("请先生成演示数据: python generate_demo_data.py")
            return
        
        self.import_data(demo_file)
        self.process_tracking()
        self.show_full_report()


def print_menu():
    print("\n" + "=" * 60)
    print("          唱片库存签名版追踪系统")
    print("=" * 60)
    print("1. 导入CSV数据")
    print("2. 显示摘要报告")
    print("3. 显示签名号重复详情")
    print("4. 显示赠品缺货详情")
    print("5. 显示订单改址详情")
    print("6. 显示坏行数据")
    print("7. 查看订单追踪链路")
    print("8. 按SKU筛选问题")
    print("9. 标记问题为已复核")
    print("10. 导出完整报告 (JSON)")
    print("11. 显示完整报告")
    print("12. 运行演示")
    print("0. 退出")
    print("=" * 60)


def interactive_mode():
    app = RecordStoreTrackingApp()
    
    while True:
        print_menu()
        choice = input("请选择操作 (0-12): ").strip()
        
        if choice == '0':
            print("感谢使用，再见！")
            break
        
        elif choice == '1':
            csv_file = input("请输入CSV文件路径: ").strip()
            app.import_data(csv_file)
            app.process_tracking()
        
        elif choice == '2':
            app.show_summary()
        
        elif choice == '3':
            app.show_duplicates()
        
        elif choice == '4':
            app.show_gift_issues()
        
        elif choice == '5':
            app.show_address_changes()
        
        elif choice == '6':
            app.show_bad_rows()
        
        elif choice == '7':
            order_id = input("请输入订单号: ").strip()
            app.show_order_trace(order_id)
        
        elif choice == '8':
            sku = input("请输入SKU: ").strip()
            app.filter_by_sku(sku)
        
        elif choice == '9':
            issue_id = input("请输入问题ID: ").strip()
            reviewer = input("请输入复核人: ").strip()
            resolution = input("请输入处理方案: ").strip()
            app.mark_issue_reviewed(issue_id, reviewer, resolution)
        
        elif choice == '10':
            output_file = input("请输入输出文件名 (默认: report.json): ").strip() or "report.json"
            app.export_report(output_file)
        
        elif choice == '11':
            app.show_full_report()
        
        elif choice == '12':
            app.run_demo()
        
        else:
            print("无效的选择，请重新输入")


def main():
    if len(sys.argv) > 1:
        app = RecordStoreTrackingApp()
        
        if sys.argv[1] == '--demo':
            app.run_demo()
        
        elif sys.argv[1] == '--import' and len(sys.argv) > 2:
            app.import_data(sys.argv[2])
            app.process_tracking()
            app.show_full_report()
        
        elif sys.argv[1] == '--trace' and len(sys.argv) > 3:
            app.import_data(sys.argv[2])
            app.process_tracking()
            app.show_order_trace(sys.argv[3])
        
        elif sys.argv[1] == '--export' and len(sys.argv) > 3:
            app.import_data(sys.argv[2])
            app.process_tracking()
            app.export_report(sys.argv[3])
        
        else:
            print("用法:")
            print("  python main.py                    # 交互模式")
            print("  python main.py --demo             # 运行演示")
            print("  python main.py --import <csv>     # 导入并显示报告")
            print("  python main.py --trace <csv> <order_id>  # 查看订单追踪")
            print("  python main.py --export <csv> <output>   # 导出JSON报告")
    else:
        interactive_mode()


if __name__ == '__main__':
    main()
