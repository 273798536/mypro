import sys
import os
from tabulate import tabulate
from abc_classifier import ABCClassifier
from special_cases import NewProductHandler, PromotionAnomalyAnalyzer, ReturnImpactAnalyzer
from audit_log import AuditLogger
from data_io import DataImporter, ReportExporter
from sample_data import create_sample_excel, generate_sample_sku_data, generate_margin_data, generate_promotion_calendar, generate_sales_history


class ABCInventoryCLI:
    def __init__(self):
        self.classifier = None
        self.new_product_handler = None
        self.promotion_analyzer = None
        self.return_analyzer = None
        self.audit_logger = AuditLogger()
        self.data_importer = DataImporter(self.audit_logger)
        self.report_exporter = ReportExporter(self.audit_logger)
        self.results = None
    
    def print_header(self):
        print("=" * 80)
        print("                    库存ABC动态分类系统")
        print("=" * 80)
        print()
    
    def print_menu(self):
        print("\n" + "-" * 80)
        print("主菜单:")
        print("  1. 生成并加载样例数据")
        print("  2. 从Excel导入数据")
        print("  3. 执行ABC分类分析")
        print("  4. 查看分类结果汇总")
        print("  5. 查看SKU详细追溯信息")
        print("  6. 特殊场景分析（新品/促销/退货）")
        print("  7. 调整分类阈值")
        print("  8. 人工调整分类结果")
        print("  9. 查看审计日志")
        print(" 10. 导出报告")
        print("  0. 退出")
        print("-" * 80)
    
    def generate_sample_data(self):
        print("\n正在生成样例数据...")
        file_path = create_sample_excel()
        print(f"✓ 样例数据已生成: {file_path}")
        
        sku_data = generate_sample_sku_data()
        margin_data = generate_margin_data()
        promotion_calendar = generate_promotion_calendar()
        sales_history = generate_sales_history()
        
        self._init_analyzers(sku_data, margin_data, sales_history, promotion_calendar)
        
        print(f"✓ 已加载 {len(sku_data)} 个SKU，{len(sales_history)} 条销售记录")
        return True
    
    def import_from_excel(self, file_path=None):
        if not file_path:
            file_path = input("请输入Excel文件路径: ").strip()
        
        if not os.path.exists(file_path):
            print(f"✗ 文件不存在: {file_path}")
            return False
        
        try:
            print(f"\n正在导入数据: {file_path}")
            data = self.data_importer.import_from_excel(file_path, operator='user')
            
            sku_data = data['SKU资料']
            margin_data = data['毛利率']
            promotion_calendar = data['促销日历']
            sales_history = data['销售历史']
            
            self._init_analyzers(sku_data, margin_data, sales_history, promotion_calendar)
            
            print(f"✓ 数据导入成功")
            print(f"  - SKU资料: {len(sku_data)} 条")
            print(f"  - 毛利率: {len(margin_data)} 条")
            print(f"  - 促销日历: {len(promotion_calendar)} 条")
            print(f"  - 销售历史: {len(sales_history)} 条")
            return True
        except Exception as e:
            print(f"✗ 导入失败: {e}")
            return False
    
    def _init_analyzers(self, sku_data, margin_data, sales_history, promotion_calendar):
        self.classifier = ABCClassifier(sku_data, margin_data, sales_history, promotion_calendar)
        self.new_product_handler = NewProductHandler(sku_data, sales_history)
        self.promotion_analyzer = PromotionAnomalyAnalyzer(sales_history, promotion_calendar)
        self.return_analyzer = ReturnImpactAnalyzer(sales_history)
    
    def run_classification(self):
        if self.classifier is None:
            print("✗ 请先加载数据")
            return False
        
        print("\n请选择分类依据:")
        print("  1. 毛利额 (默认)")
        print("  2. 销售额")
        print("  3. 销量")
        choice = input("请输入选项 [1]: ").strip() or '1'
        
        basis_map = {'1': 'gross_profit', '2': 'total_revenue', '3': 'total_quantity'}
        basis_name_map = {'gross_profit': '毛利额', 'total_revenue': '销售额', 'total_quantity': '销量'}
        
        basis = basis_map.get(choice, 'gross_profit')
        
        print(f"\n正在执行ABC分类（按{basis_name_map[basis]}）...")
        self.results = self.classifier.classify(by=basis)
        
        print("✓ 分类完成")
        self._print_summary_brief()
        return True
    
    def _print_summary_brief(self):
        if self.results is None:
            return
        
        for abc_class in ['A', 'B', 'C']:
            count = len(self.results[self.results['abc_class'] == abc_class])
            revenue = self.results[self.results['abc_class'] == abc_class]['total_revenue'].sum()
            profit = self.results[self.results['abc_class'] == abc_class]['gross_profit'].sum()
            print(f"  {abc_class}类: {count} 个SKU, 销售额 {revenue:,.0f}, 毛利 {profit:,.0f}")
    
    def view_classification_results(self):
        if self.results is None:
            print("✗ 请先执行分类分析")
            return
        
        print("\n" + "=" * 80)
        print("ABC分类结果汇总")
        print("=" * 80)
        
        display_cols = ['sku_id', 'sku_name', 'abc_class', 'total_revenue', 'gross_profit', 
                        'gross_margin_pct', 'value_pct', 'cumulative_pct', 
                        'is_new_product', 'has_anomaly']
        
        display = self.results[display_cols].copy()
        display['gross_margin_pct'] = (display['gross_margin_pct'] * 100).round(1).astype(str) + '%'
        display['value_pct'] = (display['value_pct'] * 100).round(1).astype(str) + '%'
        display['cumulative_pct'] = (display['cumulative_pct'] * 100).round(1).astype(str) + '%'
        display['total_revenue'] = display['total_revenue'].round(0)
        display['gross_profit'] = display['gross_profit'].round(0)
        
        print(tabulate(display, headers='keys', tablefmt='simple', showindex=False))
        
        print("\n" + "-" * 80)
        print("按类别汇总:")
        summary_data = []
        for abc_class in ['A', 'B', 'C']:
            class_data = self.results[self.results['abc_class'] == abc_class]
            summary_data.append([
                f"{abc_class}类",
                len(class_data),
                f"{len(class_data)/len(self.results)*100:.1f}%",
                f"{class_data['total_revenue'].sum():,.0f}",
                f"{class_data['total_revenue'].sum()/self.results['total_revenue'].sum()*100:.1f}%",
                f"{class_data['gross_profit'].sum():,.0f}",
                f"{class_data['gross_profit'].sum()/self.results['gross_profit'].sum()*100:.1f}%"
            ])
        
        print(tabulate(summary_data, 
                      headers=['类别', 'SKU数', 'SKU占比', '总销售额', '销售占比', '总毛利', '毛利占比'],
                      tablefmt='simple'))
    
    def view_sku_trace(self):
        if self.classifier is None or self.results is None:
            print("✗ 请先执行分类分析")
            return
        
        sku_id = input("\n请输入要追溯的SKU ID: ").strip()
        
        trace_data = self.classifier.get_sku_trace(sku_id)
        if trace_data is None:
            print(f"✗ 未找到SKU: {sku_id}")
            return
        
        print("\n" + "=" * 80)
        print(f"SKU追溯详情: {sku_id}")
        print("=" * 80)
        
        print("\n【基本信息】")
        basic = trace_data['basic_info']
        print(f"  SKU名称: {basic['sku_name']}")
        print(f"  分类: {basic['abc_class']}类")
        print(f"  分类依据: {basic['classification_basis']}")
        
        print("\n【核心指标】")
        metrics = trace_data['metrics']
        print(f"  总销售额: {metrics['total_revenue']:,.0f}")
        print(f"  总毛利: {metrics['gross_profit']:,.0f}")
        print(f"  毛利率: {metrics['gross_margin_pct']*100:.1f}%")
        print(f"  总销量: {metrics['total_quantity']}")
        print(f"  退货率: {metrics['return_rate']*100:.1f}%")
        
        print("\n【分类详情】")
        class_details = trace_data['classification_details']
        print(f"  单品贡献占比: {class_details['value_percentage']*100:.2f}%")
        print(f"  累计贡献占比: {class_details['cumulative_percentage']*100:.2f}%")
        print(f"  A类阈值: {class_details['threshold_A']*100:.0f}%")
        print(f"  B类阈值: {class_details['threshold_B']*100:.0f}%")
        
        print("\n【特殊标记】")
        flags = trace_data['flags']
        print(f"  新品: {'是' if flags['is_new_product'] else '否'}")
        print(f"  有异常: {'是' if flags['has_anomaly'] else '否'}")
        print(f"  促销销量占比: {flags['promo_ratio']*100:.1f}%")
        
        if trace_data['anomalies']:
            print("\n【异常记录】")
            for anomaly in trace_data['anomalies']:
                print(f"  - {anomaly['description']}")
        
        audit_trail = self.audit_logger.get_sku_audit_trail(sku_id)
        if audit_trail:
            print("\n【操作历史】")
            for log in audit_trail:
                print(f"  - {self.audit_logger.format_log_entry(log)}")
        
        export = input("\n是否导出该SKU详情报告? (y/N): ").strip().lower()
        if export == 'y':
            file_path = self.report_exporter.export_detailed_sku_report(trace_data, operator='user')
            print(f"✓ 报告已导出: {file_path}")
    
    def analyze_special_cases(self):
        if self.new_product_handler is None:
            print("✗ 请先加载数据")
            return
        
        print("\n" + "=" * 80)
        print("特殊场景分析")
        print("=" * 80)
        
        print("\n【1. 新品冷启动分析】")
        new_product_report = self.new_product_handler.generate_new_product_report()
        print(f"  新品数量: {new_product_report['total_new_products']}")
        
        if new_product_report['new_products']:
            np_data = []
            for np in new_product_report['new_products']:
                np_data.append([
                    np['sku_id'],
                    np['sku_name'],
                    np['cold_start_phase'],
                    np['days_on_shelf'],
                    f"{np['daily_avg_sales']:.1f}",
                    np['growth_trend'],
                    np['recommendation'][:30] + '...' if len(np['recommendation']) > 30 else np['recommendation']
                ])
            print(tabulate(np_data, 
                          headers=['SKU', '名称', '阶段', '上架天数', '日均销量', '趋势', '建议'],
                          tablefmt='simple'))
        else:
            print("  当前无新品")
        
        print("\n【2. 促销异常分析】")
        promotion_anomalies = self.promotion_analyzer.analyze_promotion_impact()
        print(f"  异常数量: {len(promotion_anomalies)}")
        
        if len(promotion_anomalies) > 0:
            pa_data = []
            for _, pa in promotion_anomalies.iterrows():
                pa_data.append([
                    pa['sku_id'],
                    pa['anomaly_type'],
                    f"{pa['lift_ratio']:.1f}x",
                    pa['explanation'][:40] + '...' if len(pa['explanation']) > 40 else pa['explanation']
                ])
            print(tabulate(pa_data, headers=['SKU', '异常类型', '提升倍数', '说明'], tablefmt='simple'))
        else:
            print("  无促销异常")
        
        print("\n【3. 退货冲击分析】")
        return_impacts = self.return_analyzer.analyze_return_impact()
        high_impact = return_impacts[return_impacts['severity'] == 'high']
        print(f"  高影响SKU: {len(high_impact)} 个")
        
        if len(high_impact) > 0:
            ri_data = []
            for _, ri in high_impact.iterrows():
                ri_data.append([
                    ri['sku_id'],
                    f"{ri['overall_return_rate']*100:.1f}%",
                    ri['severity'],
                    ri['recommendation'][:40] + '...' if len(ri['recommendation']) > 40 else ri['recommendation']
                ])
            print(tabulate(ri_data, headers=['SKU', '退货率', '严重程度', '建议'], tablefmt='simple'))
        
        export = input("\n是否导出特殊场景分析报告? (y/N): ").strip().lower()
        if export == 'y':
            file_path = self.report_exporter.export_special_cases_report(
                new_product_report, promotion_anomalies, return_impacts, operator='user'
            )
            print(f"✓ 报告已导出: {file_path}")
    
    def adjust_thresholds(self):
        if self.classifier is None:
            print("✗ 请先加载数据")
            return
        
        print("\n当前阈值设置:")
        thresholds = self.classifier.dynamic_thresholds
        print(f"  A类: 累计前 {thresholds['A']['cumulative_pct']*100:.0f}%")
        print(f"  B类: 累计 {thresholds['A']['cumulative_pct']*100:.0f}%-{thresholds['B']['cumulative_pct']*100:.0f}%")
        print(f"  C类: 累计 {thresholds['B']['cumulative_pct']*100:.0f}%-100%")
        
        print("\n输入新的阈值 (直接回车保持不变):")
        new_a = input(f"  A类阈值 % [{thresholds['A']['cumulative_pct']*100:.0f}]: ").strip()
        new_b = input(f"  B类阈值 % [{thresholds['B']['cumulative_pct']*100:.0f}]: ").strip()
        
        original = {
            'A': thresholds['A']['cumulative_pct'],
            'B': thresholds['B']['cumulative_pct']
        }
        
        a_pct = float(new_a) / 100 if new_a else None
        b_pct = float(new_b) / 100 if new_b else None
        
        if a_pct is None and b_pct is None:
            print("无变更")
            return
        
        reason = input("请输入调整原因: ").strip()
        
        self.results = self.classifier.adjust_thresholds(a_pct, b_pct)
        
        new_thresholds = {
            'A': self.classifier.dynamic_thresholds['A']['cumulative_pct'],
            'B': self.classifier.dynamic_thresholds['B']['cumulative_pct']
        }
        
        self.audit_logger.log_threshold_adjustment(
            operator='user',
            original_thresholds=original,
            new_thresholds=new_thresholds,
            reason=reason
        )
        
        print("✓ 阈值已更新，分类结果已重新计算")
        self._print_summary_brief()
    
    def manual_adjust_classification(self):
        if self.results is None:
            print("✗ 请先执行分类分析")
            return
        
        sku_id = input("\n请输入要调整的SKU ID: ").strip()
        
        sku_data = self.results[self.results['sku_id'] == sku_id]
        if len(sku_data) == 0:
            print(f"✗ 未找到SKU: {sku_id}")
            return
        
        original_class = sku_data.iloc[0]['abc_class']
        sku_name = sku_data.iloc[0]['sku_name']
        
        print(f"\n当前分类: {sku_name} ({sku_id}) - {original_class}类")
        new_class = input("请输入新的分类 (A/B/C): ").strip().upper()
        
        if new_class not in ['A', 'B', 'C']:
            print("✗ 无效的分类")
            return
        
        if new_class == original_class:
            print("分类未改变")
            return
        
        reason = input("请输入调整原因: ").strip()
        
        idx = self.results[self.results['sku_id'] == sku_id].index[0]
        self.results.at[idx, 'abc_class'] = new_class
        self.results.at[idx, 'manually_adjusted'] = True
        
        self.audit_logger.log_classification_adjustment(
            operator='user',
            sku_id=sku_id,
            original_class=original_class,
            new_class=new_class,
            reason=reason
        )
        
        print(f"✓ 已将 {sku_id} 从 {original_class}类 调整为 {new_class}类")
    
    def view_audit_log(self):
        print("\n" + "=" * 80)
        print("审计日志")
        print("=" * 80)
        
        print("\n筛选选项:")
        print("  1. 显示全部日志")
        print("  2. 仅显示分类调整记录")
        print("  3. 仅显示阈值调整记录")
        print("  4. 按SKU查询")
        
        choice = input("请输入选项 [1]: ").strip() or '1'
        
        logs = []
        if choice == '1':
            logs = self.audit_logger.get_logs()
        elif choice == '2':
            logs = self.audit_logger.get_logs(action_type='classification_adjustment')
        elif choice == '3':
            logs = self.audit_logger.get_logs(action_type='threshold_adjustment')
        elif choice == '4':
            sku_id = input("请输入SKU ID: ").strip()
            logs = self.audit_logger.get_sku_audit_trail(sku_id)
        
        if not logs:
            print("无记录")
            return
        
        print(f"\n共 {len(logs)} 条记录:")
        self.audit_logger.print_logs(logs)
        
        export = input("\n是否导出审计日志? (y/N): ").strip().lower()
        if export == 'y':
            file_path = self.report_exporter.export_audit_log(logs, operator='user')
            print(f"✓ 日志已导出: {file_path}")
    
    def export_reports(self):
        if self.results is None:
            print("✗ 请先执行分类分析")
            return
        
        print("\n导出选项:")
        print("  1. 导出ABC分类报告")
        print("  2. 导出审计日志")
        print("  3. 导出所有报告")
        
        choice = input("请输入选项 [1]: ").strip() or '1'
        
        if choice in ['1', '3']:
            file_path = self.report_exporter.export_classification_report(self.results, operator='user')
            print(f"✓ ABC分类报告已导出: {file_path}")
        
        if choice in ['2', '3']:
            logs = self.audit_logger.get_logs()
            file_path = self.report_exporter.export_audit_log(logs, operator='user')
            print(f"✓ 审计日志已导出: {file_path}")
    
    def run(self):
        self.print_header()
        
        while True:
            self.print_menu()
            choice = input("\n请选择操作 [0-10]: ").strip()
            
            if choice == '0':
                print("\n感谢使用，再见！")
                break
            elif choice == '1':
                self.generate_sample_data()
            elif choice == '2':
                self.import_from_excel()
            elif choice == '3':
                self.run_classification()
            elif choice == '4':
                self.view_classification_results()
            elif choice == '5':
                self.view_sku_trace()
            elif choice == '6':
                self.analyze_special_cases()
            elif choice == '7':
                self.adjust_thresholds()
            elif choice == '8':
                self.manual_adjust_classification()
            elif choice == '9':
                self.view_audit_log()
            elif choice == '10':
                self.export_reports()
            else:
                print("无效选项，请重新输入")


def main():
    cli = ABCInventoryCLI()
    cli.run()


if __name__ == '__main__':
    main()
