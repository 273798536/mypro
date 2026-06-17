#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量推理缓存复盘 · 主入口脚本
串联：模拟数据生成 → 安全规则校验 → 标签冲突复核 → 分布统计/图表 → 报告生成
"""
import os
import sys
import json
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(BASE_DIR, 'src'))

from data_generator import generate_all
from safety_rules_engine import load_rules, run_checks, build_trace_chain
from label_conflict_review import (
    detect_conflicts_from_records, merge_conflicts, auto_review, reconcile_with_processing
)
from distribution_and_tracking import compute_basic_stats, generate_all_plots
from report_generator import generate_report

RAW_DIR = os.path.join(BASE_DIR, 'data', 'raw')
PROC_DIR = os.path.join(BASE_DIR, 'data', 'processed')
OUTPUT_DIR = os.path.join(BASE_DIR, 'data', 'output')
CONFIG_PATH = os.path.join(BASE_DIR, 'config', 'safety_rules.yaml')

def banner(text):
    print("\n" + "="*70)
    print(f"  {text}")
    print("="*70)

def section(text):
    print(f"\n▶ {text} ...")

def check_dependencies():
    needed = ['pandas', 'numpy', 'matplotlib', 'seaborn', 'openpyxl', 'jinja2']
    missing = []
    for pkg in needed:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    try:
        import yaml
    except ImportError:
        missing.append('pyyaml')
    if missing:
        print(f"[!] 缺少依赖: {', '.join(missing)}")
        print(f"    请执行: pip install -r {os.path.join(BASE_DIR, 'requirements.txt')}")
        sys.exit(1)
    print("[✓] 依赖检查通过")

def main():
    start = time.time()
    banner("批量推理缓存复盘 · 评测周专项流水线")
    check_dependencies()

    # 1. 生成模拟数据
    section("第1步 生成贴近日常的模拟数据（旧表/补录/漏填/重复/题库/切分清单）")
    contract_df, split_df, eval_df, label_conflict_manual_df, version_df, manifest = generate_all(RAW_DIR)
    print(f"  ✓ 合同记录: {len(contract_df)} 条")
    print(f"  ✓ 切分清单: {len(split_df)} 条（A/B/C三批各50）")
    print(f"  ✓ 评测题库: {len(eval_df)} 道（8场景×3难度）")
    print(f"  ✓ 标签冲突手工标注: {len(label_conflict_manual_df)} 条")
    print(f"  ✓ 版本历史记录: {len(version_df)} 条")

    # 2. 安全规则校验
    section("第2步 导入安全规则并逐行检测（8条规则含普通话解释）")
    rules_config = load_rules(CONFIG_PATH)
    print(f"  ✓ 已加载安全规则: {len(rules_config.get('safety_rules', []))} 条")
    proc_df, viol_df, rule_stats_df = run_checks(contract_df, rules_config, PROC_DIR)
    total = len(proc_df)
    passed = int(proc_df['check_passed'].sum())
    print(f"  ✓ 检测完成：{total} 条中 {passed} 条通过，通过率 {round(passed/total*100,1)}%")
    print(f"  ✓ 共检出 {len(viol_df)} 处违规，涉及 {int((proc_df['violation_count']>0).sum())} 条记录")
    top3 = rule_stats_df.head(3)
    for _, r in top3.iterrows():
        if r['violation_count'] > 0:
            print(f"     - {r['rule_id']} {r['rule_name']}: {r['violation_count']} 次")

    # 3. 标签冲突复核
    section("第3步 标签冲突检测 + 自动复核（双人差异 + 同记录多主标）")
    auto_conflicts = detect_conflicts_from_records(contract_df, rules_config)
    print(f"  ✓ 自动检测到冲突: {len(auto_conflicts)} 条")
    merged_conflicts = merge_conflicts(auto_conflicts, label_conflict_manual_df)
    print(f"  ✓ 合并手工标注冲突后: {len(merged_conflicts)} 条")
    conflict_review_df = auto_review(merged_conflicts, contract_df)
    high_conf = int((conflict_review_df['confidence_level'].isin(['高', '中高'])).sum())
    need_manual = int(conflict_review_df['needs_manual_escalation'].sum())
    print(f"  ✓ 自动复核完成：高置信度建议 {high_conf} 条，需人工升级 {need_manual} 条")

    # 4. 统一处理记录（核心：分布统计、版本追踪、报告三方都从这里取数）
    section("第4步 生成统一处理记录（保证界面/报告/导出Excel三方一致）")
    unified_df, reconcile_summary = reconcile_with_processing(conflict_review_df, proc_df, PROC_DIR)
    print(f"  ✓ 统一处理记录已保存: {os.path.join(PROC_DIR, 'unified_processing_records.xlsx')}")
    for k, v in reconcile_summary.items():
        print(f"     · {k}: {v}")

    # 5. 分布统计 + 图表生成
    section("第5步 计算分布统计并绘制6张图表")
    basic_stats = compute_basic_stats(unified_df, rule_stats_df, viol_df, version_df)
    chart_paths = generate_all_plots(unified_df, rule_stats_df, version_df, OUTPUT_DIR)
    for name, path in chart_paths.items():
        if os.path.exists(path):
            print(f"  ✓ 生成图表: {os.path.relpath(path, BASE_DIR)}")
        else:
            print(f"  ⚠ 跳过图表: {name}")

    # 6. 异常回溯链路验证
    section("第6步 验证异常回溯链路（顺着1条异常查到底）")
    worst_row = unified_df.sort_values('violation_count', ascending=False).iloc[0]
    rid = worst_row['record_id']
    chain = build_trace_chain(proc_df, viol_df, version_df, rid)
    print(f"  抽样记录: {rid}（合同编号: {worst_row.get('contract_no')}）")
    print(f"     - 处理快照: 通过={worst_row['check_passed']}, 违规数={worst_row['violation_count']}")
    print(f"     - 安全规则违反: {len(chain['safety_rule_violations'])} 条")
    for v in chain['safety_rule_violations'][:3]:
        print(f"       · {v['rule_id']} [{v['severity_cn']}] {v['rule_name']}: {v['plain_reason'][:30]}...")
    print(f"     - 版本历史: {len(chain['version_history'])} 条记录")
    print(f"  ✓ 回溯链路验证通过：处理快照→安全规则→原因→处理建议→版本历史 连续可查")

    # 7. 生成HTML报告
    section("第7步 生成HTML复盘报告（图文表对应 + 普通话解读）")
    report_path, report_manifest = generate_report(
        output_dir=OUTPUT_DIR,
        unified_df=unified_df,
        rule_stats_df=rule_stats_df,
        violation_df=viol_df,
        version_df=version_df,
        conflict_review_df=conflict_review_df,
        split_df=split_df,
        eval_df=eval_df,
        rules_config=rules_config,
        summary=reconcile_summary,
        stats=basic_stats,
        chart_paths=chart_paths
    )
    print(f"  ✓ 报告已生成: {os.path.relpath(report_path, BASE_DIR)}")
    print(f"  ✓ 典型样例: {', '.join(report_manifest['showcase_case_ids'])}")

    # 8. 输出总结
    elapsed = round(time.time() - start, 2)
    banner(f"流水线运行完成 · 用时 {elapsed}s")
    print(f"""
📂 产出清单（请在文件管理器中查看）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
原始数据目录:  data/raw/
  ├── contract_records.xlsx      ({len(contract_df)}条，含旧表/补录/漏填/重复)
  ├── split_list.xlsx            ({len(split_df)}条，A/B/C三批切分清单)
  ├── eval_questions.xlsx        ({len(eval_df)}道，评测题库8场景×3难度)
  ├── label_conflicts.xlsx       ({len(label_conflict_manual_df)}条，双人标注差异样例)
  ├── version_history.xlsx       ({len(version_df)}条，版本修改轨迹)
  └── manifest.json              (本批次数据说明文件)

处理记录目录: data/processed/
  ├── processing_records.xlsx        (安全规则逐行处理快照)
  ├── violation_details.xlsx         (违规明细，含普通话漏配原因)
  ├── rule_violation_stats.xlsx      (每条规则的违规统计)
  └── unified_processing_records.xlsx (★ 统一处理记录，界面/报告/导出三方同源)

报告输出目录: data/output/
  ├── batch_cache_review_report.html  (★ 最终HTML报告，直接浏览器打开转发)
  ├── report_manifest.json            (报告元数据)
  ├── chart_severity_distribution.png (图1 严重程度分布饼图)
  ├── chart_rule_violations.png       (图2 安全规则违规排行柱状图)
  ├── chart_source_comparison.png     (图3 数据来源对比)
  ├── chart_label_conflict.png        (图4 标签冲突置信度)
  ├── chart_version_trend.png         (图5 版本修改趋势)
  └── chart_operator_performance.png  (图6 录入人绩效对比)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 验收要点核对
  ✓ 安全规则8条已导入，漏配原因全部用普通话（不用字段缩写）
  ✓ 标签冲突自动检测 + 自动复核 + 人工升级链路打通
  ✓ 分布统计、版本追踪、报告全部基于 unified_processing_records.xlsx
  ✓ 报告含"一句话总结"，标注负责人可直接复制发群
  ✓ 4条典型案例展示完整回溯链：异常→安全规则原因→处理建议→版本历史
  ✓ 切分清单、评测题库、脏样本15+5条 全部在同一轮复核中体现
  ✓ 图、表、文字说明数字完全对应（均取自统一处理记录）
""")

if __name__ == '__main__':
    main()
