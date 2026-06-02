#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
from pathlib import Path

from data_manager import DataManager
from correlation_analyzer import CorrelationAnalyzer
from spurious_correlation_detector import SpuriousCorrelationDetector
from report_exporter import ReportExporter


def main():
    print("=" * 80)
    print("  相关性热力假象检查 - 快速测试")
    print("=" * 80)
    
    sample_dir = Path("./sample_data")
    if not sample_dir.exists():
        print("\n未找到示例数据，正在生成...")
        from generate_sample_data import generate_sample_data
        generate_sample_data()
    
    print("\n1. 初始化数据管理器...")
    dm = DataManager(data_dir="./test_data")
    
    print("\n2. 导入指标数据...")
    result = dm.import_metrics("./sample_data/metrics.csv", id_col="sample_id", overwrite=True)
    print(f"   {result}")
    
    print("\n3. 添加样本分组...")
    result = dm.add_sample_groups("./sample_data/groups.csv", group_name="experiment_group")
    print(f"   {result}")
    
    print("\n4. 添加时间窗口...")
    result = dm.add_time_windows("./sample_data/time_windows.csv", window_col="quarter")
    print(f"   {result}")
    
    print("\n5. 数据概览:")
    info = dm.info()
    for k, v in info.items():
        print(f"   {k}: {v}")
    
    print("\n6. 运行相关性分析...")
    ca = CorrelationAnalyzer(dm)
    ca.analyze_all_pairs(method='pearson', outlier_method='iqr')
    
    significant = ca.get_significant_pairs()
    high_risk = ca.get_high_risk_pairs()
    print(f"   显著相关: {len(significant)} 对")
    print(f"   高风险对: {len(high_risk)} 对")
    
    print("\n7. 运行热力假象检测...")
    scd = SpuriousCorrelationDetector(ca)
    scd.detect_spurious_correlations(
        corr_diff_threshold=0.2,
        leverage_threshold=0.1,
        cooks_d_threshold=0.5
    )
    
    summary = scd.get_summary()
    print(f"   总指标对: {summary['total_pairs']}")
    print(f"   发现假象: {summary['spurious_count']} 对")
    print(f"   高风险: {summary['high_risk_count']} 对")
    print(f"   中风险: {summary['medium_risk_count']} 对")
    
    if summary['high_risk_pairs']:
        print("\n   高风险假象:")
        for p in summary['high_risk_pairs']:
            print(f"     - {p['metric1']} vs {p['metric2']}: {p['spurious_type']}")
            print(f"       原始相关: {p['original_corr']:.3f} -> 剔除后: {p['clean_corr']:.3f}")
            print(f"       关键异常点: {', '.join(p['key_outliers'])}")
    
    if summary['high_risk_pairs']:
        p = summary['high_risk_pairs'][0]
        print(f"\n8. 追溯详情示例 ({p['metric1']} vs {p['metric2']}):")
        audit = scd.get_audit_trail(p['metric1'], p['metric2'])
        print(f"   样本数: {audit['n_samples']}")
        print(f"   原始相关: {audit['original_correlation']:.4f} (p={audit['original_p_value']:.4f})")
        print(f"   剔除后: {audit['clean_correlation']:.4f} (p={audit['clean_p_value']:.4f})")
        print(f"   相关系数下降: {audit['correlation_drop']:.4f}")
        print(f"   异常点: {', '.join(audit['influential_sample_ids'])}")
    
    print("\n9. 导出完整报告...")
    exporter = ReportExporter(dm, ca, scd)
    result = exporter.export_full_report("./test_report.xlsx")
    print(f"   {result}")
    
    print("\n" + "=" * 80)
    print("  测试完成!")
    print("=" * 80)
    print("\n可以运行以下命令启动交互式看板:")
    print("  python cli_dashboard.py")


if __name__ == "__main__":
    main()
