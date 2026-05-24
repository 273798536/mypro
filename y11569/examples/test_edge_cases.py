#!/usr/bin/env python3
"""
边界情况测试脚本
演示：重复提交、撤回后再提交、部分失败、人工改判、导出前冻结
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, init_db
from app.models import Role, WorkOrderStatus
from app.schemas import (
    WorkOrderCreate, StatusChangeRequest, FreezeRequest,
    ExportRequest, JudgmentCreate
)
from app.services import (
    create_user, get_user_by_username, create_work_order,
    change_work_order_status, freeze_work_order, add_judgment,
    export_work_orders, check_duplicate_submission,
    WorkOrderStateError, WorkOrderFrozenError,
    DuplicateSubmissionError, PermissionError
)


def test_duplicate_submission(db, op):
    """测试重复提交检测"""
    print("\n" + "=" * 60)
    print("测试1: 重复提交检测")
    print("=" * 60)
    
    wo_data = WorkOrderCreate(
        work_order_no="WO-DUP-001",
        title="建设路路灯故障",
        description="路灯不亮",
        location="建设路50号",
        creator_id=op.id,
    )
    wo1 = create_work_order(db, wo_data)
    print(f"  创建工单1: {wo1.work_order_no}")
    
    wo, _ = change_work_order_status(db, wo1.id, StatusChangeRequest(
        new_status=WorkOrderStatus.SUBMITTED,
        reason="提交",
        operator_id=op.id,
    ))
    print(f"  工单1已提交")
    
    print("  尝试创建相同地点相同标题的工单...")
    try:
        wo_data2 = WorkOrderCreate(
            work_order_no="WO-DUP-002",
            title="建设路路灯故障",
            description="另一报修",
            location="建设路50号",
            creator_id=op.id,
        )
        wo2 = create_work_order(db, wo_data2)
        print(f"  错误: 应该检测到重复但没有！")
        return False
    except DuplicateSubmissionError as e:
        print(f"  ✓ 正确检测到重复提交: {e}")
        return True


def test_withdraw_and_resubmit(db, op):
    """测试撤回后再提交"""
    print("\n" + "=" * 60)
    print("测试2: 撤回后再提交")
    print("=" * 60)
    
    wo_data = WorkOrderCreate(
        work_order_no="WO-WITHDRAW-001",
        title="公园路灯需要维修",
        location="人民公园东门",
        creator_id=op.id,
    )
    wo = create_work_order(db, wo_data)
    print(f"  创建工单: {wo.work_order_no}, 状态: {wo.status.value}")
    
    wo, _ = change_work_order_status(db, wo.id, StatusChangeRequest(
        new_status=WorkOrderStatus.SUBMITTED,
        reason="首次提交",
        operator_id=op.id,
    ))
    print(f"  已提交: {wo.status.value}")
    
    wo, _ = change_work_order_status(db, wo.id, StatusChangeRequest(
        new_status=WorkOrderStatus.WITHDRAWN,
        reason="发现信息不全，撤回修改",
        operator_id=op.id,
    ))
    print(f"  已撤回: {wo.status.value}")
    
    wo, _ = change_work_order_status(db, wo.id, StatusChangeRequest(
        new_status=WorkOrderStatus.DRAFT,
        reason="重新编辑",
        operator_id=op.id,
    ))
    print(f"  回到草稿: {wo.status.value}")
    
    wo, _ = change_work_order_status(db, wo.id, StatusChangeRequest(
        new_status=WorkOrderStatus.SUBMITTED,
        reason="补充完整后重新提交",
        operator_id=op.id,
    ))
    print(f"  ✓ 重新提交成功: {wo.status.value}")
    
    print(f"  状态流转记录数: {len(wo.status_transitions)}")
    for t in wo.status_transitions:
        from_s = t.from_status.value if t.from_status else "无"
        print(f"    {from_s} → {t.to_status.value}: {t.reason}")
    
    return True


def test_invalid_state_transition(db, op, sp):
    """测试非法状态转换"""
    print("\n" + "=" * 60)
    print("测试3: 非法状态转换检测")
    print("=" * 60)
    
    wo_data = WorkOrderCreate(
        work_order_no="WO-INVALID-001",
        title="测试非法转换",
        location="测试路",
        creator_id=op.id,
    )
    wo = create_work_order(db, wo_data)
    print(f"  创建工单: {wo.work_order_no}, 状态: {wo.status.value}")
    
    print("  尝试从草稿直接跳转到导出状态...")
    try:
        wo, _ = change_work_order_status(db, wo.id, StatusChangeRequest(
            new_status=WorkOrderStatus.EXPORTED,
            reason="非法跳转",
            operator_id=op.id,
        ))
        print(f"  错误: 应该检测到非法转换！")
        return False
    except WorkOrderStateError as e:
        print(f"  ✓ 正确阻止非法转换: {e}")
    
    print("  尝试让操作员执行驳回操作...")
    try:
        wo, _ = change_work_order_status(db, wo.id, StatusChangeRequest(
            new_status=WorkOrderStatus.REJECTED,
            reason="越权操作",
            operator_id=op.id,
        ))
        print(f"  错误: 应该检测到权限问题！")
        return False
    except (WorkOrderStateError, PermissionError) as e:
        print(f"  ✓ 正确阻止越权操作: {e}")
    
    return True


def test_frozen_work_order(db, op, ad):
    """测试冻结后无法修改"""
    print("\n" + "=" * 60)
    print("测试4: 冻结后保护机制")
    print("=" * 60)
    
    wo_data = WorkOrderCreate(
        work_order_no="WO-FROZEN-001",
        title="测试冻结保护",
        location="冻结路",
        creator_id=op.id,
    )
    wo = create_work_order(db, wo_data)
    print(f"  创建工单: {wo.work_order_no}")
    
    wo, _ = change_work_order_status(db, wo.id, StatusChangeRequest(
        new_status=WorkOrderStatus.SUBMITTED,
        reason="提交",
        operator_id=op.id,
    ))
    wo, _ = change_work_order_status(db, wo.id, StatusChangeRequest(
        new_status=WorkOrderStatus.RECONFIRMED,
        reason="二次确认",
        operator_id=op.id,
    ))
    wo, _ = change_work_order_status(db, wo.id, StatusChangeRequest(
        new_status=WorkOrderStatus.AUDIT_ONLY,
        reason="进入审计",
        operator_id=ad.id,
    ))
    wo = freeze_work_order(db, wo.id, FreezeRequest(
        reason="导出前冻结",
        operator_id=ad.id,
    ))
    print(f"  已冻结: frozen={wo.is_frozen}")
    
    print("  尝试修改冻结工单...")
    try:
        from app.services import update_work_order
        from app.schemas import WorkOrderUpdate
        update_work_order(db, wo.id, WorkOrderUpdate(title="修改后的标题"), op.id)
        print(f"  错误: 应该阻止修改冻结工单！")
        return False
    except WorkOrderFrozenError as e:
        print(f"  ✓ 正确阻止修改冻结工单: {e}")
    
    print("  尝试修改冻结工单状态...")
    try:
        wo, _ = change_work_order_status(db, wo.id, StatusChangeRequest(
            new_status=WorkOrderStatus.DRAFT,
            reason="修改",
            operator_id=op.id,
        ))
        print(f"  错误: 应该阻止修改冻结工单状态！")
        return False
    except WorkOrderFrozenError as e:
        print(f"  ✓ 正确阻止修改冻结工单状态: {e}")
    
    return True


def test_manual_judgment_preserves_evidence(db, op, sp):
    """测试人工改判保留原始证据"""
    print("\n" + "=" * 60)
    print("测试5: 人工改判保留原始证据")
    print("=" * 60)
    
    wo_data = WorkOrderCreate(
        work_order_no="WO-JUDGE-001",
        title="路灯亮度不足",
        description="原描述: 亮度不够",
        location="广场北路",
        creator_id=op.id,
    )
    wo = create_work_order(db, wo_data)
    original_description = wo.description
    print(f"  创建工单: {wo.work_order_no}")
    print(f"  原始描述: {original_description}")
    
    j = add_judgment(db, JudgmentCreate(
        work_order_id=wo.id,
        judge_id=sp.id,
        judgment_type="内容修正",
        reason="核实后确认为路灯老化，需要更换",
        new_data={"description": "修正描述: 路灯老化，亮度严重不足"},
    ))
    print(f"  添加改判记录: {j.judgment_type}")
    
    db.refresh(wo)
    print(f"  修改后描述: {wo.description}")
    print(f"  改判前数据: {j.previous_data}")
    print(f"  改判后数据: {j.new_data}")
    
    if j.previous_data and j.new_data:
        print(f"  ✓ 原始证据已保留")
        return True
    else:
        print(f"  错误: 原始证据未正确保存")
        return False


def main():
    init_db()
    db = SessionLocal()
    
    results = []
    
    try:
        if not get_user_by_username(db, "op_test"):
            op = create_user(db, "op_test", "测试员", Role.OPERATOR, "pass123")
        else:
            op = get_user_by_username(db, "op_test")
        
        if not get_user_by_username(db, "sp_test"):
            sp = create_user(db, "sp_test", "测试主管", Role.SUPERVISOR, "pass123")
        else:
            sp = get_user_by_username(db, "sp_test")
        
        if not get_user_by_username(db, "ad_test"):
            ad = create_user(db, "ad_test", "测试审计", Role.AUDITOR, "pass123")
        else:
            ad = get_user_by_username(db, "ad_test")
        
        results.append(("重复提交检测", test_duplicate_submission(db, op)))
        db.commit()
        
        results.append(("撤回后再提交", test_withdraw_and_resubmit(db, op)))
        db.commit()
        
        results.append(("非法状态转换", test_invalid_state_transition(db, op, sp)))
        db.commit()
        
        results.append(("冻结后保护机制", test_frozen_work_order(db, op, ad)))
        db.commit()
        
        results.append(("人工改判保留证据", test_manual_judgment_preserves_evidence(db, op, sp)))
        db.commit()
        
        print("\n" + "=" * 60)
        print("测试结果汇总")
        print("=" * 60)
        for name, passed in results:
            status = "✓ 通过" if passed else "✗ 失败"
            print(f"  {name}: {status}")
        
        passed_count = sum(1 for _, p in results if p)
        print(f"\n总计: {passed_count}/{len(results)} 测试通过")
        
    except Exception as e:
        print(f"测试执行错误: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    main()
