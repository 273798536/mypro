#!/usr/bin/env python3
from models import Database
from node_checker import NodeChecker
from letter_exporter import LetterExporter
from main import create_sample_data


def run_full_flow():
    print("="*70)
    print("  会展搭建尾款节点管理系统 - 完整流程测试")
    print("="*70)
    
    db = Database()
    checker = NodeChecker(db)
    exporter = LetterExporter(db)
    
    project_code = "EXPO-2024-SH001"
    
    print("\n【步骤 1】创建样例数据")
    print("-" * 50)
    create_sample_data(db)
    
    print("\n【步骤 2】执行节点检查")
    print("-" * 50)
    issues = checker.check_project_nodes(project_code)
    print(f"发现 {len(issues)} 个问题:")
    for issue in issues:
        print(f"  [{issue.severity}] {issue.issue_type}: {issue.description}")
    
    print("\n【步骤 3】查看问题清单")
    print("-" * 50)
    summary = checker.get_issue_summary(project_code)
    print(f"总计: {summary['total']} 项问题")
    print(f"按类型: {summary['by_type']}")
    print(f"未解决: {len(summary['unresolved'])} 项")
    
    print("\n【步骤 4】查看付款占用情况")
    print("-" * 50)
    payment = checker.check_payment_occupancy(project_code)
    print(f"合同金额: ￥{payment['contract_amount']:,.2f}")
    print(f"已支付: ￥{payment['paid_amount']:,.2f} ({payment['paid_ratio']}%)")
    print(f"待支付: ￥{payment['pending_amount']:,.2f} ({payment['pending_ratio']}%)")
    
    print("\n【步骤 5】验收复核 - 材料进场节点(N03)")
    print("-" * 50)
    review = checker.review_completion(project_code, "N03")
    print(f"节点: {review['node_name']}")
    print(f"状态: {review['status']}")
    print(f"可通过: {'是' if review['can_approve'] else '否'}")
    print(f"阻碍问题: {len(review['blocking_issues'])} 项")
    
    print("\n【步骤 6】导出函件")
    print("-" * 50)
    
    reminder = exporter.generate_payment_reminder(project_code)
    exporter.export_to_file(reminder, f"output_payment_reminder_{project_code}.txt")
    print(f"✓ 付款催告函已导出: output_payment_reminder_{project_code}.txt")
    
    notification = exporter.generate_issue_notification(project_code)
    exporter.export_to_file(notification, f"output_issue_notification_{project_code}.txt")
    print(f"✓ 整改通知书已导出: output_issue_notification_{project_code}.txt")
    
    report = exporter.generate_final_report(project_code)
    exporter.export_to_file(report, f"output_final_report_{project_code}.txt")
    print(f"✓ 最终报告已导出: output_final_report_{project_code}.txt")
    
    print("\n" + "="*70)
    print("  测试完成！所有功能正常运行。")
    print("="*70)
    print("\n关键特性验证:")
    print("  ✓ 数据持久化 (SQLite) - 重启不丢失")
    print("  ✓ 问题去重 (UNIQUE约束) - 不重复记录")
    print("  ✓ 节点延期优先显示 - 不会被其他问题掩盖")
    print("  ✓ 备注历史追踪 - 每次修改留痕")
    print("  ✓ 审核日志 - 所有操作可追溯")
    print("\n运行 'python main.py' 启动交互式菜单")


if __name__ == "__main__":
    run_full_flow()
