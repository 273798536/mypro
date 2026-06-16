#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
蒸馏样本难度分层分析系统 - 主运行脚本

功能：
1. 加载三种口径的数据（模型日志、安全规则、训练样本）
2. 执行完整的难度分层分析
3. 检测安全规则漏配、标签冲突、重复样本等问题
4. 生成可视化图表
5. 输出HTML和Excel格式的报告
"""

import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src import (
    load_all_data,
    run_full_analysis,
    create_all_charts,
    ReportGenerator
)


def print_banner():
    """打印启动横幅"""
    banner = """
╔══════════════════════════════════════════════════════════════╗
║                                                            ║
║       蒸馏样本难度分层分析系统 v1.0                          ║
║                                                            ║
║   自动化检测样本质量问题 · 三种口径数据对齐 · 可视化报告     ║
║                                                            ║
╚══════════════════════════════════════════════════════════════╝
    """
    print(banner)


def print_step(step_num: int, total: int, message: str):
    """打印步骤信息"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] 步骤 {step_num}/{total}: {message}")


def print_summary(analysis_result: dict):
    """打印分析结果摘要"""
    print("\n" + "=" * 70)
    print("📊 分析结果摘要")
    print("=" * 70)
    
    diff_dist = analysis_result['difficulty_distribution']
    conflict_dist = analysis_result['conflict_distribution']
    
    total_samples = len(analysis_result['after_dedup_records'])
    kept_samples = len(analysis_result['kept_records'])
    removed_samples = len(analysis_result['removed_records'])
    
    print(f"\n📈 样本数量统计：")
    print(f"  - 总样本数: {total_samples} 条")
    print(f"  - 去重后保留: {kept_samples} 条")
    print(f"  - 移除重复: {removed_samples} 条")
    
    print(f"\n🎯 难度分布：")
    for level, count in diff_dist.items():
        print(f"  - {level}: {count} 条")
    
    print(f"\n⚠️  问题类型分布：")
    for conflict_type, count in conflict_dist.items():
        print(f"  - {conflict_type}: {count} 次")
    
    need_review = diff_dist.get("困难", 0) + diff_dist.get("极难", 0)
    print(f"\n👀 需要人工审核的样本数: {need_review} 条")
    
    changed_evals = analysis_result['playback'].get_changed_evaluations()
    if changed_evals:
        print(f"🔄 评测回放后改变判断的样本数: {len(changed_evals)} 条")
    
    print("\n" + "=" * 70)


def main():
    """主函数"""
    print_banner()
    
    total_steps = 6
    
    try:
        print_step(1, total_steps, "加载样例数据...")
        safety_rules, model_logs, training_samples = load_all_data()
        print(f"  ✓ 加载安全规则: {len(safety_rules)} 条")
        print(f"  ✓ 加载模型日志: {len(model_logs)} 条")
        print(f"  ✓ 加载训练样本: {len(training_samples)} 条")
        
        print_step(2, total_steps, "执行完整分析（难度分层、冲突检测、去重处理）...")
        analysis_result = run_full_analysis(safety_rules, model_logs, training_samples)
        print("  ✓ 分析完成")
        
        print_step(3, total_steps, "生成可视化图表...")
        charts = create_all_charts(analysis_result)
        chart_count = sum(1 for v in charts.values() if v)
        print(f"  ✓ 生成 {chart_count} 张图表")
        
        print_step(4, total_steps, "生成HTML报告...")
        report_gen = ReportGenerator(output_dir="output")
        html_path = report_gen.generate_html_report(analysis_result, charts)
        print(f"  ✓ HTML报告已生成: {html_path}")
        
        print_step(5, total_steps, "生成Excel报告...")
        excel_path = report_gen.generate_excel_report(analysis_result)
        print(f"  ✓ Excel报告已生成: {excel_path}")
        
        print_step(6, total_steps, "整理输出结果...")
        print_summary(analysis_result)
        
        print("\n" + "=" * 70)
        print("✅ 分析完成！")
        print("=" * 70)
        print(f"\n📁 输出文件位置：")
        print(f"  - HTML报告: file://{os.path.abspath(html_path)}")
        print(f"  - Excel报告: file://{os.path.abspath(excel_path)}")
        print("\n💡 提示：双击HTML文件即可在浏览器中打开查看完整报告")
        print("    Excel文件可直接用WPS或Office打开，包含4个工作表")
        print("\n📝 报告包含以下内容：")
        print("    1. 整体概览 - 各难度等级样本统计")
        print("    2. 难度分布分析 - 饼图 + 分值明细图")
        print("    3. 问题类型分析 - 柱状图 + 详细说明")
        print("    4. 安全规则覆盖 - 匹配/漏配对比图")
        print("    5. 标签冲突溯源 - 桑基图 + 明细表")
        print("    6. 样本去重对比 - 前后对比图 + 变化表")
        print("    7. 评测回放记录 - 人工复核过程记录")
        print("    8. 重点样本详情 - 困难/极难样本完整分析")
        print("    9. 安全规则清单 - 所有规则详细说明")
        print("\n")
        
        return 0
        
    except Exception as e:
        print(f"\n❌ 运行出错: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
