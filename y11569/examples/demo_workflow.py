#!/usr/bin/env python3
"""
示例脚本：从创建到导出的完整工单流程
演示：草稿 → 提交 → 驳回 → 二次确认 → 只读审计 → 冻结 → 脱敏导出
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, init_db
from app.models import Role, WorkOrderStatus
from app.schemas import (
    WorkOrderCreate, StatusChangeRequest, FreezeRequest,
    ExportRequest, JudgmentCreate, EvidenceCreate
)
from app.services import (
    create_user, get_user_by_username, create_work_order,
    change_work_order_status, freeze_work_order, add_evidence,
    add_judgment, export_work_orders
)


def main():
    init_db()
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("城市照明抢修权限追责台账 - 完整流程演示")
        print("=" * 60)
        
        print("\n1. 创建测试用户...")
        if not get_user_by_username(db, "operator1"):
            op = create_user(db, "operator1", "张三", Role.OPERATOR, "pass123")
            print(f"  创建操作员: {op.real_name}")
        else:
            op = get_user_by_username(db, "operator1")
        
        if not get_user_by_username(db, "supervisor1"):
            sp = create_user(db, "supervisor1", "李四", Role.SUPERVISOR, "pass123")
            print(f"  创建主管: {sp.real_name}")
        else:
            sp = get_user_by_username(db, "supervisor1")
        
        if not get_user_by_username(db, "auditor1"):
            ad = create_user(db, "auditor1", "王五", Role.AUDITOR, "pass123")
            print(f"  创建审计员: {ad.real_name}")
        else:
            ad = get_user_by_username(db, "auditor1")
        
        print("\n2. 操作员创建工单草稿...")
        wo_data = WorkOrderCreate(
            work_order_no="WO-TEST-001",
            title="人民路中段路灯反复熄灯",
            description="该路段近一周已出现3次熄灯情况，每次持续约2小时",
            location="人民路中段100-200号",
            creator_id=op.id,
            spare_part_batch="SP202405001",
            hotline_number="13800138000",
            inspection_photo_ref="IMG_20240520_1430.jpg",
        )
        wo = create_work_order(db, wo_data)
        print(f"  工单创建成功: {wo.work_order_no} - {wo.title}")
        print(f"  当前状态: {wo.status.value}")
        
        print("\n3. 添加上传证据...")
        ev = add_evidence(db, EvidenceCreate(
            work_order_id=wo.id,
            evidence_type="inspection_photo",
            reference="IMG_20240520_1430.jpg",
            description="现场巡检照片，显示路灯不亮",
            uploaded_by=op.id,
            is_original=True,
        ))
        print(f"  证据添加成功: {ev.evidence_type}")
        
        print("\n4. 操作员提交工单...")
        wo, trans = change_work_order_status(db, wo.id, StatusChangeRequest(
            new_status=WorkOrderStatus.SUBMITTED,
            reason="现场核实完毕，申请抢修",
            operator_id=op.id,
        ))
        print(f"  工单已提交: {wo.status.value}")
        print(f"  操作人: {trans.operator.real_name}, 原因: {trans.reason}")
        
        print("\n5. 主管驳回工单...")
        wo, trans = change_work_order_status(db, wo.id, StatusChangeRequest(
            new_status=WorkOrderStatus.REJECTED,
            reason="缺少备件批次验证记录，请补充",
            operator_id=sp.id,
        ))
        print(f"  工单已驳回: {wo.status.value}")
        print(f"  操作人: {trans.operator.real_name}, 原因: {trans.reason}")
        
        print("\n6. 人工改判 - 主管补充信息...")
        j = add_judgment(db, JudgmentCreate(
            work_order_id=wo.id,
            judge_id=sp.id,
            judgment_type="补充验证",
            reason="备件批次已通过系统验证，同意继续流程",
            new_data={"description": wo.description + "\n[补充]备件批次SP202405001已验证合格"},
        ))
        print(f"  改判记录: {j.judgment_type} - {j.reason}")
        
        print("\n7. 操作员二次确认后提交...")
        wo, trans = change_work_order_status(db, wo.id, StatusChangeRequest(
            new_status=WorkOrderStatus.RECONFIRMED,
            reason="已补充备件验证记录",
            operator_id=op.id,
        ))
        print(f"  已二次确认: {wo.status.value}")
        
        print("\n8. 转入只读审计状态...")
        wo, trans = change_work_order_status(db, wo.id, StatusChangeRequest(
            new_status=WorkOrderStatus.AUDIT_ONLY,
            reason="信息完整，进入审计",
            operator_id=ad.id,
        ))
        print(f"  只读审计: {wo.status.value}")
        
        print("\n9. 导出前冻结工单...")
        wo = freeze_work_order(db, wo.id, FreezeRequest(
            reason="待导出台账，冻结防止修改",
            operator_id=ad.id,
        ))
        print(f"  已冻结: frozen={wo.is_frozen}, 冻结时间={wo.frozen_at}")
        
        print("\n10. 审计员脱敏导出...")
        export_data, export_log = export_work_orders(db, ExportRequest(
            work_order_ids=[wo.id],
            export_type="json",
            mask_sensitive=True,
            exported_by=ad.id,
        ))
        print(f"  导出成功: {len(export_data)} 条记录")
        print(f"  敏感字段已脱敏: hotline_number = {export_data[0]['hotline_number']}")
        print(f"  状态变更记录数: {len(export_data[0]['status_transitions'])}")
        
        print("\n" + "=" * 60)
        print("状态流转全记录:")
        print("-" * 60)
        for t in wo.status_transitions:
            from_s = t.from_status.value if t.from_status else "无"
            print(f"  {t.occurred_at:%H:%M:%S} | {from_s:10} → {t.to_status.value:12} | {t.operator.real_name:8} | {t.reason}")
        
        print("\n" + "=" * 60)
        print("演示完成！")
        print("=" * 60)
        
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    main()
