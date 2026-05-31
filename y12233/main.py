#!/usr/bin/env python3
import sys
import os
from datetime import datetime, timedelta

from models import Database, ProjectContract, ConstructionNode, NodeStatus, PaymentStatus
from data_import import DataImporter
from node_checker import NodeChecker
from letter_exporter import LetterExporter


def create_sample_data(db: Database):
    print("正在创建样例数据...")
    
    contract = ProjectContract(
        id=None,
        project_code="EXPO-2024-SH001",
        project_name="2024上海国际会展中心展台搭建项目",
        client_name="上海会展科技有限公司",
        contractor="优展搭建工程有限公司",
        contract_amount=580000.00,
        sign_date="2024-03-15",
        start_date="2024-05-01",
        end_date="2024-05-10",
        payment_terms="预付款30%，进场40%，验收20%，质保10%",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    )
    db.insert_contract(contract)
    
    base_date = datetime(2024, 5, 1)
    
    nodes_data = [
        {
            "node_code": "N01",
            "node_name": "预付款节点",
            "planned_date": (base_date - timedelta(days=10)).strftime('%Y-%m-%d'),
            "actual_date": (base_date - timedelta(days=8)).strftime('%Y-%m-%d'),
            "status": NodeStatus.COMPLETED.value,
            "payment_ratio": 30,
            "payment_status": PaymentStatus.PAID.value,
            "design_change": "",
            "change_approved": True,
            "photos_submitted": False,
            "photos_count": 0,
            "remarks": "合同签订后支付"
        },
        {
            "node_code": "N02",
            "node_name": "设计方案确认",
            "planned_date": (base_date - timedelta(days=5)).strftime('%Y-%m-%d'),
            "actual_date": (base_date - timedelta(days=3)).strftime('%Y-%m-%d'),
            "status": NodeStatus.COMPLETED.value,
            "payment_ratio": 0,
            "payment_status": PaymentStatus.NOT_DUE.value,
            "design_change": "调整接待区布局",
            "change_approved": False,
            "photos_submitted": False,
            "photos_count": 0,
            "remarks": "晚补设计变更说明"
        },
        {
            "node_code": "N03",
            "node_name": "材料进场验收",
            "planned_date": base_date.strftime('%Y-%m-%d'),
            "actual_date": "",
            "status": NodeStatus.DELAYED.value,
            "payment_ratio": 40,
            "payment_status": PaymentStatus.PENDING.value,
            "design_change": "木质材料升级为防火板",
            "change_approved": False,
            "photos_submitted": False,
            "photos_count": 0,
            "remarks": ""
        },
        {
            "node_code": "N04",
            "node_name": "主体结构验收",
            "planned_date": (base_date + timedelta(days=3)).strftime('%Y-%m-%d'),
            "actual_date": "",
            "status": NodeStatus.NOT_STARTED.value,
            "payment_ratio": 0,
            "payment_status": PaymentStatus.NOT_DUE.value,
            "design_change": "",
            "change_approved": True,
            "photos_submitted": False,
            "photos_count": 0,
            "remarks": ""
        },
        {
            "node_code": "N05",
            "node_name": "整体验收",
            "planned_date": (base_date + timedelta(days=7)).strftime('%Y-%m-%d'),
            "actual_date": "",
            "status": NodeStatus.PENDING_REVIEW.value,
            "payment_ratio": 20,
            "payment_status": PaymentStatus.PENDING.value,
            "design_change": "",
            "change_approved": True,
            "photos_submitted": False,
            "photos_count": 0,
            "remarks": ""
        }
    ]
    
    for node_data in nodes_data:
        node = ConstructionNode(
            id=None,
            project_code=contract.project_code,
            node_code=node_data["node_code"],
            node_name=node_data["node_name"],
            planned_date=node_data["planned_date"],
            actual_date=node_data["actual_date"] if node_data["actual_date"] else None,
            status=node_data["status"],
            payment_ratio=node_data["payment_ratio"],
            payment_amount=contract.contract_amount * node_data["payment_ratio"] / 100,
            payment_status=node_data["payment_status"],
            design_change=node_data["design_change"],
            change_approved=node_data["change_approved"],
            photos_submitted=node_data["photos_submitted"],
            photos_count=node_data["photos_count"],
            remarks=node_data["remarks"],
            remark_history="",
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )
        db.insert_node(node)
    
    print(f"已创建样例项目: {contract.project_code} - {contract.project_name}")
    print(f"共创建 {len(nodes_data)} 个节点")


def show_menu():
    print("\n" + "="*60)
    print("           会展搭建尾款节点管理系统")
    print("="*60)
    print("1. 导入项目合同")
    print("2. 导入节点计划")
    print("3. 导入尾款报告")
    print("4. 执行节点检查")
    print("5. 查看问题清单")
    print("6. 查看付款占用情况")
    print("7. 验收复核节点")
    print("8. 导出付款催告函")
    print("9. 导出问题整改通知书")
    print("10. 导出最终结算报告")
    print("11. 创建样例数据")
    print("0. 退出")
    print("="*60)


def main():
    db = Database()
    importer = DataImporter(db)
    checker = NodeChecker(db)
    exporter = LetterExporter(db)
    
    project_code = "EXPO-2024-SH001"
    
    while True:
        show_menu()
        choice = input("\n请选择操作 [0-11]: ").strip()
        
        if choice == "0":
            print("感谢使用，再见！")
            break
        
        elif choice == "1":
            file_path = input("请输入合同Excel文件路径: ").strip()
            if os.path.exists(file_path):
                contracts, errors = importer.import_contract_from_excel(file_path)
                print(f"成功导入 {len(contracts)} 份合同")
                if errors:
                    print(f"遇到 {len(errors)} 个错误:")
                    for e in errors[:5]:
                        print(f"  - {e}")
            else:
                print("文件不存在")
        
        elif choice == "2":
            file_path = input("请输入节点计划Excel文件路径: ").strip()
            if os.path.exists(file_path):
                nodes, errors = importer.import_nodes_from_excel(file_path)
                print(f"成功导入 {len(nodes)} 个节点")
                if errors:
                    print(f"遇到 {len(errors)} 个错误:")
                    for e in errors[:5]:
                        print(f"  - {e}")
            else:
                print("文件不存在")
        
        elif choice == "3":
            file_path = input("请输入尾款报告Excel文件路径: ").strip()
            if os.path.exists(file_path):
                updates, errors = importer.import_payment_report(file_path)
                print(f"成功更新 {len(updates)} 个节点")
                if errors:
                    print(f"遇到 {len(errors)} 个错误")
            else:
                print("文件不存在")
        
        elif choice == "4":
            pc = input(f"请输入项目编号 (默认: {project_code}): ").strip() or project_code
            print(f"正在检查项目 {pc} 的节点...")
            issues = checker.check_project_nodes(pc)
            print(f"发现 {len(issues)} 个问题:")
            for issue in issues:
                print(f"  [{issue.severity}] {issue.issue_type}: {issue.description}")
        
        elif choice == "5":
            pc = input(f"请输入项目编号 (默认: {project_code}): ").strip() or project_code
            summary = checker.get_issue_summary(pc)
            print(f"\n问题汇总 (共 {summary['total']} 项):")
            print(f"  按类型: {summary['by_type']}")
            print(f"  按严重程度: {summary['by_severity']}")
            print(f"  按状态: {summary['by_status']}")
            if summary['unresolved']:
                print(f"\n未解决问题 ({len(summary['unresolved'])} 项):")
                for item in summary['unresolved']:
                    print(f"  [{item['severity']}] {item['node_code']} - {item['issue_type']}")
                    print(f"    {item['description']}")
        
        elif choice == "6":
            pc = input(f"请输入项目编号 (默认: {project_code}): ").strip() or project_code
            info = checker.check_payment_occupancy(pc)
            if 'error' in info:
                print(info['error'])
            else:
                print(f"\n付款占用情况:")
                print(f"  合同金额: ￥{info['contract_amount']:,.2f}")
                print(f"  已支付: ￥{info['paid_amount']:,.2f} ({info['paid_ratio']}%)")
                print(f"  待支付: ￥{info['pending_amount']:,.2f} ({info['pending_ratio']}%)")
                print(f"\n节点明细:")
                for detail in info['payment_details']:
                    print(f"  {detail['node_code']} {detail['node_name']}: ￥{detail['payment_amount']:,.2f} - {detail['payment_status']}")
        
        elif choice == "7":
            pc = input(f"请输入项目编号 (默认: {project_code}): ").strip() or project_code
            nc = input("请输入节点编号: ").strip()
            if nc:
                result = checker.review_completion(pc, nc)
                if 'error' in result:
                    print(result['error'])
                else:
                    print(f"\n节点复核结果:")
                    print(f"  节点名称: {result['node_name']}")
                    print(f"  当前状态: {result['status']}")
                    print(f"  可通过: {'是' if result['can_approve'] else '否'}")
                    print(f"  照片合规: {'是' if result['photos_ok'] else '否'}")
                    print(f"  变更已批: {'是' if result['changes_approved'] else '否'}")
                    if result['blocking_issues']:
                        print(f"\n阻碍问题 ({len(result['blocking_issues'])} 项):")
                        for issue in result['blocking_issues']:
                            print(f"  - {issue.issue_type}: {issue.description}")
        
        elif choice == "8":
            pc = input(f"请输入项目编号 (默认: {project_code}): ").strip() or project_code
            content = exporter.generate_payment_reminder(pc)
            output_file = f"payment_reminder_{pc}.txt"
            if exporter.export_to_file(content, output_file):
                print(f"已导出到: {output_file}")
                print("\n" + content[:500] + "...")
            else:
                print("导出失败")
        
        elif choice == "9":
            pc = input(f"请输入项目编号 (默认: {project_code}): ").strip() or project_code
            content = exporter.generate_issue_notification(pc)
            output_file = f"issue_notification_{pc}.txt"
            if exporter.export_to_file(content, output_file):
                print(f"已导出到: {output_file}")
                print("\n" + content[:500] + "...")
            else:
                print("导出失败")
        
        elif choice == "10":
            pc = input(f"请输入项目编号 (默认: {project_code}): ").strip() or project_code
            content = exporter.generate_final_report(pc)
            output_file = f"final_report_{pc}.txt"
            if exporter.export_to_file(content, output_file):
                print(f"已导出到: {output_file}")
                print("\n" + content[:500] + "...")
            else:
                print("导出失败")
        
        elif choice == "11":
            create_sample_data(db)
        
        else:
            print("无效的选择，请重试")
        
        input("\n按回车键继续...")


if __name__ == "__main__":
    main()
