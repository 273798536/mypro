#!/usr/bin/env python3

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from settlement import SettlementEngine


def demo_full_settlement():
    print("\n" + "#"*70)
    print("#  演示1: 完整结算流程（导入初始数据 -> 核验 -> 计算 -> 导出）")
    print("#"*70)
    
    engine = SettlementEngine()
    engine.run_full_settlement("data_initial", "output_initial")
    
    return engine


def demo_incremental_with_rematch(engine):
    print("\n" + "#"*70)
    print("#  演示2: 增量更新 - 补赛结果导入（核心场景）")
    print("#"*70)
    
    engine.run_incremental_update("data_rematch", "output_rematch")
    
    print("\n" + "="*70)
    print("重点关注: 补赛追溯问题的原因和处理建议")
    print("="*70)
    
    rematch_issues = engine.issue_manager.get_issues_by_type(
        engine.issue_manager.context.issues[list(engine.issue_manager.context.issues.keys())[0]].issue_type
    )
    
    for issue in engine.issue_manager.get_pending_issues():
        if "补赛追溯" in issue.title:
            engine.issue_manager.print_issue_detail(issue.issue_id)
            break
    
    return engine


def demo_supplementary_data(engine):
    print("\n" + "#"*70)
    print("#  演示3: 补充材料导入（直播记录补录，不覆盖原有判断）")
    print("#"*70)
    
    engine.run_incremental_update("data_supplementary", "output_final")
    
    print("\n" + "="*70)
    print("查看结算版本历史:")
    print("="*70)
    engine.print_settlement_detail("CTR-2024-001")
    
    return engine


def demo_issue_handling(engine):
    print("\n" + "#"*70)
    print("#  演示4: 问题处理流程")
    print("#"*70)
    
    pending_issues = engine.issue_manager.get_pending_issues()
    
    if pending_issues:
        print("\n当前待处理问题:")
        engine.issue_manager.print_pending_issues()
        
        first_issue = pending_issues[0]
        print(f"\n演示处理问题: {first_issue.title}")
        print("-" * 50)
        
        engine.issue_manager.resolve_issue(
            first_issue.issue_id,
            "已与赞助商确认，同意按补赛后新名次计算奖金，补发差额"
        )
        
        print("\n问题处理后状态:")
        engine.issue_manager.print_issue_summary()
    
    return engine


def main():
    print("\n" + "╔" + "═"*68 + "╗")
    print("║" + " "*20 + "电竞赛事赞助结算系统" + " "*27 + "║")
    print("║" + " "*15 + "Esports Sponsorship Settlement System" + " "*18 + "║")
    print("╚" + "═"*68 + "╝")
    
    engine = demo_full_settlement()
    input("\n按回车键继续演示补赛场景...")
    
    engine = demo_incremental_with_rematch(engine)
    input("\n按回车键继续演示补充材料导入...")
    
    engine = demo_supplementary_data(engine)
    input("\n按回车键继续演示问题处理流程...")
    
    engine = demo_issue_handling(engine)
    
    print("\n" + "="*70)
    print("演示完成!")
    print("="*70)
    print("\n生成的文件:")
    print("  output_initial/ - 初始结算结果")
    print("  output_rematch/ - 补赛后结算结果")
    print("  output_final/ - 最终结算结果")
    print("\n每个目录包含:")
    print("  - settlement_summary.txt - 结算汇总表")
    print("  - issues_report.txt - 问题清单报告")
    print("  - settlement_letter_*.txt - 各赞助商结算函")
    print("  - dispute_letter_*.txt - 争议事项沟通函")
    print("  - snapshot.json - 数据快照")
    print()


if __name__ == "__main__":
    main()
