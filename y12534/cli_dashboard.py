import sys
import os
from tabulate import tabulate
from data_manager import DataManager
from correlation_analyzer import CorrelationAnalyzer
from spurious_correlation_detector import SpuriousCorrelationDetector


class CLIDashboard:
    def __init__(self, data_dir="./data"):
        self.dm = DataManager(data_dir)
        self.ca = CorrelationAnalyzer(self.dm)
        self.scd = SpuriousCorrelationDetector(self.ca)
        self.last_results = None
    
    def print_header(self, title):
        print("\n" + "=" * 80)
        print(f"  {title}")
        print("=" * 80)
    
    def print_separator(self):
        print("-" * 80)
    
    def show_data_info(self):
        self.print_header("数据概览")
        info = self.dm.info()
        
        table_data = [
            ["指标数据", info['指标数据']],
            ["指标数量", info['指标数量']],
            ["样本分组数量", info['样本分组数量']],
            ["时间窗口数量", info['时间窗口数量']]
        ]
        print(tabulate(table_data, headers=["项目", "状态"], tablefmt="simple"))
        
        if info['分组列']:
            print(f"\n分组列: {', '.join(info['分组列'])}")
        if info['窗口列']:
            print(f"窗口列: {', '.join(info['窗口列'])}")
    
    def show_metric_list(self):
        metrics = self.dm.get_metric_columns()
        if not metrics:
            print("\n暂无指标数据")
            return
        
        self.print_header("指标列表")
        for i, metric in enumerate(metrics, 1):
            print(f"  {i}. {metric}")
    
    def run_correlation_analysis(self, method='pearson', outlier_method='iqr', group_col=None):
        self.print_header("相关性分析")
        print(f"  相关方法: {method}")
        print(f"  异常检测方法: {outlier_method}")
        if group_col:
            print(f"  分组列: {group_col}")
        
        self.last_results = self.ca.analyze_all_pairs(
            method=method,
            outlier_method=outlier_method,
            group_col=group_col
        )
        
        if not self.last_results:
            print("  无数据可分析")
            return
        
        pairs = self.last_results['pairs']
        
        print(f"\n  分析完成，共 {len(pairs)} 对指标组合")
        self.print_separator()
        
        significant = self.ca.get_significant_pairs()
        high_risk = self.ca.get_high_risk_pairs()
        
        print(f"\n  显著相关 (p<0.05): {len(significant)} 对")
        print(f"  异常剔除后相关系数大幅变化 (>0.2): {len(high_risk)} 对")
        
        if significant:
            print("\n  【显著相关列表】")
            table_data = []
            for p in sorted(significant, key=lambda x: abs(x['correlation']), reverse=True):
                table_data.append([
                    p['metric1'],
                    p['metric2'],
                    p.get('subset', 'all'),
                    f"{p['correlation']:.3f}",
                    f"{p['p_value']:.4f}",
                    p['n_samples'],
                    f"{p['corr_without_outliers']:.3f}",
                    f"{p['correlation_diff']:.3f}"
                ])
            
            print(tabulate(table_data, 
                          headers=["指标1", "指标2", "子集", "相关系数", "P值", "样本数", "剔除异常后", "变化量"],
                          tablefmt="simple",
                          maxcolwidths=[15, 15, 15, 8, 8, 6, 10, 8]))
        
        if high_risk:
            print("\n  【高风险对 - 异常点影响显著】")
            table_data = []
            for p in sorted(high_risk, key=lambda x: x['correlation_diff'], reverse=True):
                table_data.append([
                    p['metric1'],
                    p['metric2'],
                    f"{p['correlation']:.3f}",
                    f"{p['corr_without_outliers']:.3f}",
                    f"{p['correlation_diff']:.3f}"
                ])
            
            print(tabulate(table_data, 
                          headers=["指标1", "指标2", "原始相关", "剔除异常后", "变化量"],
                          tablefmt="simple"))
        
        self.print_separator()
    
    def run_spurious_detection(self, corr_diff_threshold=0.2, leverage_threshold=0.1, cooks_d_threshold=0.5):
        self.print_header("热力假象检测")
        print(f"  相关系数变化阈值: {corr_diff_threshold}")
        print(f"  杠杆值阈值: {leverage_threshold}")
        print(f"  Cook's D 阈值: {cooks_d_threshold}")
        
        results = self.scd.detect_spurious_correlations(
            corr_diff_threshold=corr_diff_threshold,
            leverage_threshold=leverage_threshold,
            cooks_d_threshold=cooks_d_threshold
        )
        
        if not results:
            print("  无数据可分析")
            return
        
        summary = self.scd.get_summary()
        
        print(f"\n  分析完成")
        print(f"  总指标对: {summary['total_pairs']}")
        print(f"  发现假象: {summary['spurious_count']} 对 ({summary['spurious_rate']:.1%})")
        print(f"    - 高风险: {summary['high_risk_count']} 对")
        print(f"    - 中风险: {summary['medium_risk_count']} 对")
        
        self.print_separator()
        
        if summary['high_risk_pairs']:
            print("\n  【高风险假象】")
            table_data = []
            for p in summary['high_risk_pairs']:
                table_data.append([
                    p['metric1'],
                    p['metric2'],
                    p['spurious_type'],
                    f"{p['original_corr']:.3f}",
                    f"{p['clean_corr']:.3f}",
                    f"{p['corr_drop']:.3f}",
                    p['outlier_count'],
                    ', '.join(p['key_outliers'][:3])
                ])
            
            print(tabulate(table_data,
                          headers=["指标1", "指标2", "类型", "原始相关", "剔除后", "下降", "异常数", "关键异常点"],
                          tablefmt="simple"))
        
        if summary['medium_risk_pairs']:
            print("\n  【中风险假象】")
            table_data = []
            for p in summary['medium_risk_pairs']:
                table_data.append([
                    p['metric1'],
                    p['metric2'],
                    p['spurious_type'],
                    f"{p['original_corr']:.3f}",
                    f"{p['clean_corr']:.3f}",
                    f"{p['corr_drop']:.3f}"
                ])
            
            print(tabulate(table_data,
                          headers=["指标1", "指标2", "类型", "原始相关", "剔除后", "下降"],
                          tablefmt="simple"))
        
        self.print_separator()
        return results
    
    def show_pair_detail(self, metric1, metric2):
        self.print_header(f"详细追溯: {metric1} vs {metric2}")
        
        audit = self.scd.get_audit_trail(metric1, metric2)
        if not audit:
            print("  未找到该指标对的分析记录，请先运行热力假象检测")
            return
        
        print(f"\n  【基础信息】")
        print(f"    样本数量: {audit.get('n_samples', 'N/A')}")
        print(f"    原始相关系数: {audit.get('original_correlation', 'N/A'):.4f}")
        print(f"    原始P值: {audit.get('original_p_value', 'N/A'):.4f}")
        print(f"    剔除异常后相关: {audit.get('clean_correlation', 'N/A'):.4f}")
        print(f"    剔除异常后P值: {audit.get('clean_p_value', 'N/A'):.4f}")
        print(f"    相关系数下降: {audit.get('correlation_drop', 'N/A'):.4f}")
        print(f"    异常点占比: {audit.get('influence_ratio', 'N/A'):.1%}")
        
        original_sig = audit.get('original_p_value', 1) < 0.05
        clean_sig = audit.get('clean_p_value', 1) < 0.05
        sig_changed = original_sig != clean_sig
        
        print(f"\n  【显著性提示】")
        print(f"    原始数据显著性: {'显著 *' if original_sig else '不显著'}")
        print(f"    剔除异常后显著性: {'显著 *' if clean_sig else '不显著'}")
        if sig_changed:
            print(f"    ⚠️  显著性发生变化! 结论受异常点影响")
        
        influential_ids = audit.get('influential_sample_ids', [])
        if influential_ids:
            print(f"\n  【异常剔除记录】")
            print(f"    共 {len(influential_ids)} 个高影响样本:")
            print(f"    {', '.join(influential_ids)}")
            
            influential_data = audit.get('influential_data', [])
            if influential_data:
                print(f"\n  【异常点明细】")
                table_data = []
                id_col = self.dm.metadata.get('id_column', 'sample_id')
                for item in influential_data:
                    table_data.append([
                        item.get(id_col, 'N/A'),
                        f"{item.get(metric1, 'N/A'):.4f}",
                        f"{item.get(metric2, 'N/A'):.4f}",
                        f"{item.get('leverage', 'N/A'):.4f}",
                        f"{item.get('cooks_d', 'N/A'):.4f}"
                    ])
                print(tabulate(table_data,
                              headers=[id_col, metric1, metric2, '杠杆值', "Cook's D"],
                              tablefmt="simple"))
        
        raw_data = self.scd.get_raw_data_for_pair(metric1, metric2)
        if raw_data is not None:
            print(f"\n  【原始明细数据 (前10条)】")
            display_cols = [self.dm.metadata.get('id_column', 'sample_id'), metric1, metric2]
            if 'is_influential' in raw_data.columns:
                display_cols.append('is_influential')
            for group_col in self.dm.get_group_columns():
                if group_col in raw_data.columns:
                    display_cols.append(group_col)
            
            print(tabulate(raw_data[display_cols].head(10),
                          headers=display_cols,
                          tablefmt="simple",
                          showindex=False))
    
    def show_outliers(self, metric_name=None):
        self.print_header("异常值详情")
        
        outliers = self.ca.get_outlier_details(metric_name)
        if not outliers:
            print("  暂无异常值记录，请先运行相关性分析")
            return
        
        if metric_name:
            print(f"\n  指标: {metric_name}")
            print(f"  异常点数量: {outliers.get('outlier_count', 0)}")
            if outliers.get('outlier_indices'):
                print(f"  异常样本ID: {', '.join(map(str, outliers['outlier_indices']))}")
        else:
            table_data = []
            for metric, info in outliers.items():
                table_data.append([
                    metric,
                    info.get('outlier_count', 0),
                    ', '.join(map(str, info.get('outlier_indices', [])[:5]))
                ])
            
            print(tabulate(table_data,
                          headers=["指标", "异常点数量", "异常样本ID(前5)"],
                          tablefmt="simple"))
    
    def interactive_menu(self):
        while True:
            self.print_header("相关性热力假象检查系统")
            print("  1. 数据概览")
            print("  2. 导入指标数据")
            print("  3. 添加样本分组")
            print("  4. 添加时间窗口")
            print("  5. 运行相关性分析")
            print("  6. 运行热力假象检测")
            print("  7. 查看指标对详细追溯")
            print("  8. 查看异常值详情")
            print("  9. 导出完整报告")
            print("  0. 退出")
            self.print_separator()
            
            choice = input("\n请选择操作 [0-9]: ").strip()
            
            if choice == '0':
                print("\n感谢使用，再见!")
                break
            elif choice == '1':
                self.show_data_info()
            elif choice == '2':
                self._import_metrics_interactive()
            elif choice == '3':
                self._add_groups_interactive()
            elif choice == '4':
                self._add_windows_interactive()
            elif choice == '5':
                self._run_corr_interactive()
            elif choice == '6':
                self._run_spurious_interactive()
            elif choice == '7':
                self._show_detail_interactive()
            elif choice == '8':
                self._show_outliers_interactive()
            elif choice == '9':
                self._export_report_interactive()
            
            input("\n按回车继续...")
    
    def _import_metrics_interactive(self):
        file_path = input("请输入指标数据文件路径: ").strip()
        id_col = input("请输入ID列名 (默认 sample_id): ").strip() or "sample_id"
        date_col = input("请输入日期列名 (可选，回车跳过): ").strip() or None
        
        try:
            result = self.dm.import_metrics(file_path, id_col=id_col, date_col=date_col)
            print(f"\n✅ {result}")
        except Exception as e:
            print(f"\n❌ 导入失败: {e}")
    
    def _add_groups_interactive(self):
        file_path = input("请输入样本分组文件路径: ").strip()
        group_name = input("请输入分组列名 (默认 group): ").strip() or "group"
        
        try:
            result = self.dm.add_sample_groups(file_path=file_path, group_name=group_name)
            print(f"\n✅ {result}")
        except Exception as e:
            print(f"\n❌ 添加失败: {e}")
    
    def _add_windows_interactive(self):
        file_path = input("请输入时间窗口文件路径: ").strip()
        window_col = input("请输入窗口列名 (默认 window): ").strip() or "window"
        
        try:
            result = self.dm.add_time_windows(file_path=file_path, window_col=window_col)
            print(f"\n✅ {result}")
        except Exception as e:
            print(f"\n❌ 添加失败: {e}")
    
    def _run_corr_interactive(self):
        method = input("相关方法 [pearson/spearman/kendall] (默认 pearson): ").strip() or "pearson"
        outlier_method = input("异常检测方法 [iqr/zscore/mad] (默认 iqr): ").strip() or "iqr"
        
        group_cols = self.dm.get_group_columns()
        group_col = None
        if group_cols:
            print(f"可用分组列: {', '.join(group_cols)}")
            group_col = input("按分组分析? 输入分组列名或回车跳过: ").strip() or None
        
        try:
            self.run_correlation_analysis(method=method, outlier_method=outlier_method, group_col=group_col)
        except Exception as e:
            print(f"\n❌ 分析失败: {e}")
    
    def _run_spurious_interactive(self):
        corr_diff = input("相关系数变化阈值 (默认 0.2): ").strip()
        corr_diff = float(corr_diff) if corr_diff else 0.2
        
        leverage = input("杠杆值阈值 (默认 0.1): ").strip()
        leverage = float(leverage) if leverage else 0.1
        
        cooks_d = input("Cook's D 阈值 (默认 0.5): ").strip()
        cooks_d = float(cooks_d) if cooks_d else 0.5
        
        try:
            self.run_spurious_detection(
                corr_diff_threshold=corr_diff,
                leverage_threshold=leverage,
                cooks_d_threshold=cooks_d
            )
        except Exception as e:
            print(f"\n❌ 检测失败: {e}")
    
    def _show_detail_interactive(self):
        metrics = self.dm.get_metric_columns()
        if not metrics:
            print("请先导入指标数据")
            return
        
        print("可用指标:")
        for i, m in enumerate(metrics, 1):
            print(f"  {i}. {m}")
        
        try:
            idx1 = int(input("选择第一个指标编号: ")) - 1
            idx2 = int(input("选择第二个指标编号: ")) - 1
            self.show_pair_detail(metrics[idx1], metrics[idx2])
        except Exception as e:
            print(f"\n❌ 操作失败: {e}")
    
    def _show_outliers_interactive(self):
        metrics = self.dm.get_metric_columns()
        if not metrics:
            print("请先导入指标数据")
            return
        
        metric_name = input("输入指标名查看具体异常，回车查看全部: ").strip() or None
        self.show_outliers(metric_name)
    
    def _export_report_interactive(self):
        from report_exporter import ReportExporter
        
        output_path = input("输出文件路径 (默认 ./report.xlsx): ").strip() or "./report.xlsx"
        
        try:
            exporter = ReportExporter(self.dm, self.ca, self.scd)
            result = exporter.export_full_report(output_path)
            print(f"\n✅ {result}")
        except Exception as e:
            print(f"\n❌ 导出失败: {e}")


if __name__ == "__main__":
    dashboard = CLIDashboard()
    dashboard.interactive_menu()
