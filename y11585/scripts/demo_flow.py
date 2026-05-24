import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
from datetime import datetime
from app.database import SessionLocal
from app.models.base import Batch, Contract, AuditLog, BatchStatus
from app.services.state_machine import ContractStateMachine
from app.services.report_service import ReportService
from app.schemas.contract import (
    ContractCreate, PaymentNodeCreate, FreezeRequest,
    UnfreezeRequest, SupplementRequest, ExportRequest
)


def print_section(title):
    print()
    print("=" * 60)
    print(f"  {title}")
    print("=" * 60)


def demo_basic_workflow():
    print_section("1. 初始化数据库连接")
    db = SessionLocal()
    fsm = ContractStateMachine(db)
    report_service = ReportService(db)
    
    print("✓ 数据库连接成功")
    
    print_section("2. 创建批次和合同")
    
    from sqlalchemy import func
    batch_count = db.query(func.count(Batch.id)).scalar()
    batch = Batch(
        batch_no=f"DEMO_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        name="演示批次 - 农忙临时替代合同",
        description="农忙缺货临时替代合同履约处理演示",
        status=BatchStatus.CREATED,
        created_by="demo_operator",
        source_type="demo"
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    print(f"✓ 创建批次: {batch.batch_no} (ID: {batch.id})")
    
    contract_data = ContractCreate(
        contract_no="HT_DEMO_001",
        contract_name="农忙季节临时用工服务合同",
        party_a="丰收农业有限公司",
        party_b="利民劳务服务有限公司",
        sign_date=datetime(2024, 5, 1),
        effective_date=datetime(2024, 5, 10),
        expire_date=datetime(2024, 6, 30),
        total_amount=350000.00,
        payment_nodes=[
            PaymentNodeCreate(
                node_name="进场预付款",
                node_type="advance",
                payment_ratio=0.3,
                payment_amount=105000.00,
                due_date=datetime(2024, 5, 12),
                status="pending"
            ),
            PaymentNodeCreate(
                node_name="中期进度款",
                node_type="milestone",
                payment_ratio=0.4,
                payment_amount=140000.00,
                due_date=datetime(2024, 5, 30),
                status="pending"
            ),
            PaymentNodeCreate(
                node_name="完工结算款",
                node_type="final",
                payment_ratio=0.3,
                payment_amount=105000.00,
                due_date=datetime(2024, 6, 25),
                status="pending"
            )
        ]
    )
    
    contract = fsm.create_contract(batch.id, contract_data, "demo_operator")
    db.commit()
    print(f"✓ 创建合同: {contract.contract_no} (ID: {contract.id})")
    print(f"  - 付款节点数: {len(contract.payment_nodes)}")
    print(f"  - 当前版本: {contract.version}")
    
    print_section("3. 触发异常: 冻结合同（发现数据问题）")
    
    freeze_request = FreezeRequest(
        contract_ids=[contract.id],
        reason="付款节点比例异常: 中期进度款应为30%，当前为40%，需复核",
        freeze_all=False
    )
    
    frozen = fsm.freeze_contracts(batch.id, freeze_request, "auditor_chen")
    print(f"✓ 已冻结 {len(frozen)} 份合同")
    print(f"  - 冻结原因: {freeze_request.reason}")
    print(f"  - 冻结人: auditor_chen")
    
    db.refresh(contract)
    print(f"  - 合同当前状态: {'已冻结' if contract.is_frozen else '正常'}")
    print(f"  - 合同版本号: {contract.version}")
    
    print_section("4. 查看版本历史和审计日志")
    
    versions = fsm.get_contract_versions(contract.id)
    print(f"✓ 合同版本历史 (共 {len(versions)} 个版本):")
    for v in versions:
        print(f"  - 版本 {v.version}: {v.changed_by} @ {v.created_at.strftime('%Y-%m-%d %H:%M')}")
        print(f"    原因: {v.change_reason}")
    
    audit_logs = fsm.get_audit_logs(contract_id=contract.id)
    print(f"\n✓ 审计日志 (共 {len(audit_logs)} 条):")
    for log in audit_logs:
        print(f"  - [{log.operation_at.strftime('%Y-%m-%d %H:%M')}] {log.operation_type.value}")
        print(f"    操作人: {log.operation_by}, 原因: {log.change_reason}")
    
    print_section("5. 人工修正: 解冻并补充协议（调整付款节点）")
    
    print("正在补充协议，修改付款节点...")
    supplement_request = SupplementRequest(
        contract_no="HT_DEMO_001",
        new_payment_nodes=[
            PaymentNodeCreate(
                node_name="进场预付款(新版)",
                node_type="advance",
                payment_ratio=0.3,
                payment_amount=105000.00,
                due_date=datetime(2024, 5, 12),
                status="pending"
            ),
            PaymentNodeCreate(
                node_name="中期进度款(新版)",
                node_type="milestone",
                payment_ratio=0.3,
                payment_amount=105000.00,
                due_date=datetime(2024, 5, 30),
                status="pending"
            ),
            PaymentNodeCreate(
                node_name="追加服务费",
                node_type="supplement",
                payment_ratio=0.1,
                payment_amount=35000.00,
                due_date=datetime(2024, 6, 10),
                status="pending"
            ),
            PaymentNodeCreate(
                node_name="完工结算款(新版)",
                node_type="final",
                payment_ratio=0.3,
                payment_amount=105000.00,
                due_date=datetime(2024, 6, 25),
                status="pending"
            )
        ],
        change_reason="补充协议001: 调整中期付款比例为30%，新增追加服务费节点"
    )
    
    updated_contract = fsm.add_supplement_contract(batch.id, supplement_request, "manager_wang")
    print(f"✓ 补充协议已生效")
    print(f"  - 合同新版本: {updated_contract.version}")
    print(f"  - 付款节点数: {len(updated_contract.payment_nodes)}")
    print(f"  - 旧版节点标记为 '(旧版)' 保留")
    
    unfreeze_request = UnfreezeRequest(
        contract_ids=[contract.id],
        reason="数据已修正，经复核无误",
        unfreeze_all=False
    )
    unfrozen = fsm.unfreeze_contracts(batch.id, unfreeze_request, "auditor_chen")
    print(f"✓ 已解冻 {len(unfrozen)} 份合同")
    
    print_section("6. 查看变更前后差异")
    
    diffs = report_service.get_freeze_diff_report(contract.id)
    print("✓ 变更历史差异:")
    for diff in diffs:
        print(f"\n  操作: {diff['operation_type']}")
        print(f"  时间: {diff['operation_at']}")
        print(f"  操作人: {diff['operation_by']}")
        print(f"  原因: {diff['change_reason']}")
        if diff['fields_changed']:
            print(f"  变更字段:")
            for field in diff['fields_changed'][:3]:
                print(f"    - {field['field']}: {field['before']} → {field['after']}")
    
    print_section("7. 生成业务汇总报告")
    
    summary = report_service.get_batch_summary(batch.id)
    print("✓ 批次汇总报告:")
    print(f"  批次名称: {summary.batch_name}")
    print(f"  合同总数: {summary.total_contracts}")
    print(f"  冻结合同: {summary.frozen_contracts}")
    print(f"  归档合同: {summary.archived_contracts}")
    print(f"  总金额: {summary.total_amount:,.2f} 元")
    print(f"  冻结金额: {summary.frozen_amount:,.2f} 元")
    if summary.manual_reasons:
        print(f"  人工干预记录: {len(summary.manual_reasons)} 条")
        for reason in summary.manual_reasons:
            print(f"    - {reason['operation_type']}: {reason['change_reason']}")
    
    print_section("8. 导出Excel报告")
    
    try:
        export_request = ExportRequest(
            batch_id=batch.id,
            include_frozen=True,
            include_archived=False,
            export_format="excel"
        )
        export_result = report_service.export_to_excel(export_request, "demo_operator")
        print(f"✓ 导出成功!")
        print(f"  文件名: {export_result['filename']}")
        print(f"  路径: {export_result['filepath']}")
        print(f"  导出合同数: {export_result['contracts_count']}")
    except ImportError as e:
        print(f"⚠ 导出功能需要 pandas/openpyxl 支持: {e}")
    except Exception as e:
        print(f"⚠ 导出时出错: {e}")
    
    print_section("9. 演示完成")
    print("✓ 工作流程演示完成!")
    print("\n  已演示的核心功能:")
    print("  1. ✓ 批次创建与合同建账")
    print("  2. ✓ 异常触发 - 合同冻结")
    print("  3. ✓ 版本追踪 - 完整历史版本")
    print("  4. ✓ 审计追踪 - 操作日志记录")
    print("  5. ✓ 人工修正 - 补充协议调整付款节点")
    print("  6. ✓ 差异对比 - 变更前后字段对比")
    print("  7. ✓ 汇总报告 - 业务重点数据")
    print("  8. ✓ Excel导出 - 含冻结变更明细")
    
    db.close()


if __name__ == "__main__":
    print()
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║       法务合同履约异常回执状态机 - 端到端演示                ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    
    try:
        demo_basic_workflow()
    except Exception as e:
        print(f"\n✗ 演示出错: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
