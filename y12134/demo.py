#!/usr/bin/env python3

import sys
import os

def install_dependencies():
    print("=" * 80)
    print("正在安装依赖...")
    print("=" * 80)
    import subprocess
    result = subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', '-r', 'requirements.txt'], 
                      capture_output=True, text=True)
    if result.returncode == 0:
        print("✓ 依赖安装成功")
        print()
    else:
        print(f"✗ 依赖安装失败:")
        print(result.stderr)
        sys.exit(1)

def run_demo():
    print("=" * 80)
    print("库存ABC动态分类系统 - 完整演示")
    print("=" * 80)
    print()
    
    from sample_data import create_sample_excel, generate_sample_sku_data, generate_margin_data, generate_promotion_calendar, generate_sales_history
    from abc_classifier import ABCClassifier
    from special_cases import NewProductHandler, PromotionAnomalyAnalyzer, ReturnImpactAnalyzer
    from audit_log import AuditLogger
    from data_io import DataImporter, ReportExporter
    
    print("【步骤1】生成样例数据")
    print("-" * 80)
    file_path = create_sample_excel()
    print(f"✓ 样例数据Excel已生成: data/sample_data.xlsx")
    
    sku_data = generate_sample_sku_data()
    margin_data = generate_margin_data()
    promotion_calendar = generate_promotion_calendar()
    sales_history = generate_sales_history()
    
    print(f"  - SKU数量: {len(sku_data)}")
    print(f"  - SKU列表: {', '.join(sku_data['sku_id'].tolist())}")
    print(f"  - 销售记录: {len(sales_history)}")
    print(f"  - 促销活动: {len(promotion_calendar)}")
    print()
    
    print("【步骤2】执行ABC分类分析")
    print("-" * 80)
    classifier = ABCClassifier(sku_data, margin_data, sales_history, promotion_calendar)
    
    results = classifier.classify(by='gross_profit')
    print("✓ ABC分类完成（按毛利额）")
    print()
    
    print("分类结果汇总:")
    for abc_class in ['A', 'B', 'C']:
        class_data = results[results['abc_class'] == abc_class]
        print(f"  {abc_class}类: {len(class_data)} 个SKU, "
              f"销售额 {class_data['total_revenue'].sum():,.0f}, "
              f"毛利 {class_data['gross_profit'].sum():,.0f}")
    print()
    
    print("详细分类结果:")
    display = results[['sku_id', 'sku_name', 'abc_class', 'gross_profit', 
                         'value_pct', 'cumulative_pct', 'is_new_product', 'has_anomaly']].copy()
    display['value_pct'] = (display['value_pct'] * 100).round(1).astype(str) + '%'
    display['cumulative_pct'] = (display['cumulative_pct'] * 100).round(1).astype(str) + '%'
    display['gross_profit'] = display['gross_profit'].round(0)
    print(display.to_string(index=False))
    print()
    
    print("【步骤3】新品冷启动分析")
    print("-" * 80)
    new_handler = NewProductHandler(sku_data, sales_history)
    new_report = new_handler.generate_new_product_report()
    
    print(f"  新品数量: {new_report['total_new_products']}")
    for np in new_report['new_products']:
        print(f"  - {np['sku_id']} {np['sku_name']}: "
              f"{np['cold_start_phase']} ({np['days_on_shelf']}天), "
              f"日均销量 {np['daily_avg_sales']:.1f}, {np['growth_trend']}")
        print(f"    建议: {np['recommendation']}")
    print()
    
    print("【步骤4】促销异常分析")
    print("-" * 80)
    promo_analyzer = PromotionAnomalyAnalyzer(sales_history, promotion_calendar)
    promo_anomalies = promo_analyzer.analyze_promotion_impact()
    
    print(f"  促销异常数量: {len(promo_anomalies)}")
    for _, pa in promo_anomalies.iterrows():
        print(f"  - {pa['sku_id']}: {pa['anomaly_type']}, "
              f"提升 {pa['lift_ratio']:.1f}x")
        print(f"    {pa['explanation']}")
        print(f"    影响: {pa['impact']}")
    print()
    
    print("【步骤5】退货冲击分析")
    print("-" * 80)
    return_analyzer = ReturnImpactAnalyzer(sales_history)
    return_impacts = return_analyzer.analyze_return_impact()
    
    high_impact = return_impacts[return_impacts['severity'] == 'high']
    print(f"  高退货影响SKU: {len(high_impact)} 个")
    for _, ri in high_impact.iterrows():
        print(f"  - {ri['sku_id']}: 退货率 {ri['overall_return_rate']*100:.1f}%")
        print(f"    {ri['recommendation']}")
    print()
    
    print("【步骤6】SKU追溯示例")
    print("-" * 80)
    sample_sku = 'SKU001'
    trace = classifier.get_sku_trace(sample_sku)
    print(f"SKU追溯: {sample_sku}")
    print(f"  分类: {trace['basic_info']['abc_class']}类")
    print(f"  毛利: {trace['metrics']['gross_profit']:,.0f}")
    print(f"  累计占比: {trace['classification_details']['cumulative_percentage']*100:.2f}%")
    print(f"  新品: {'是' if trace['flags']['is_new_product'] else '否'}")
    print(f"  异常: {'是' if trace['flags']['has_anomaly'] else '否'}")
    if trace['anomalies']:
        for a in trace['anomalies']:
            print(f"  异常记录: {a['description']}")
    print()
    
    print("【步骤7】审计日志演示")
    print("-" * 80)
    audit = AuditLogger()
    
    audit.log_classification_adjustment(
        operator='demo_user',
        sku_id='SKU006',
        original_class='C',
        new_class='B',
        reason='新品表现良好，临时提升关注等级'
    )
    
    audit.log_threshold_adjustment(
        operator='demo_user',
        original_thresholds={'A': 0.7, 'B': 0.9},
        new_thresholds={'A': 0.75, 'B': 0.9},
        reason='调整A类阈值以优化分类颗粒度'
    )
    
    print("✓ 已记录审计日志")
    print("最近操作记录:")
    audit.print_logs()
    print()
    
    print("【步骤8】导出报告")
    print("-" * 80)
    exporter = ReportExporter(audit)
    
    report_path = exporter.export_classification_report(results, operator='demo_user')
    print(f"✓ ABC分类报告已导出: {report_path}")
    
    special_path = exporter.export_special_cases_report(
        new_report, promo_anomalies, return_impacts, operator='demo_user')
    print(f"✓ 特殊场景报告已导出: {special_path}")
    
    sku_report_path = exporter.export_detailed_sku_report(trace, operator='demo_user')
    print(f"✓ SKU追溯报告已导出: {sku_report_path}")
    print()
    
    print("=" * 80)
    print("演示完成！")
    print("=" * 80)
    print()
    print("生成的文件:")
    print("  - data/sample_data.xlsx        - 样例数据")
    print(f"  - output/audit_log.json          - 审计日志")
    print(f"  - {report_path}")
    print(f"  - {special_path}")
    print(f"  - {sku_report_path}")
    print()
    print("运行 'python cli.py 启动交互式界面")
    print()

if __name__ == '__main__':
    install_dependencies()
    run_demo()
