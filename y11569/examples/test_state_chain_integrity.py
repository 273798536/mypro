#!/usr/bin/env python3
"""
状态链完整性测试
验证：草稿→提交→二次确认→只读审计→冻结→导出 的完整可追责串联
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, init_db
from app.models import Role, WorkOrderStatus
from app.schemas import (
    WorkOrderCreate, StatusChangeRequest, FreezeRequest,
    ExportRequest
)
from app.services import (
    create_user, get_user_by_username, create_work_order,
    change_work_order_status, freeze_work_order,
    WorkOrderStateError, WorkOrderFrozenError,
    PermissionError
)


def test_draft_cannot_freeze():
    """测试草稿工单不能直接冻结"""
    print("\n" + "=" * 60)
    print("测试1: 草稿工单不能直接冻结")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        if not get_user_by_username(db, "integrity_auditor"):
            ad = create_user(db, "integrity_auditor", "完整性审计", Role.AUDITOR, "pass123")
        else:
            ad = get_user_by_username(db, "integrity_auditor")
        
        if not get_user_by_username(db, "integrity_op"):
            op = create_user(db, "integrity_op", "完整性操作员", Role.OPERATOR, "pass123")
        else:
            op = get_user_by_username(db, "integrity_op")
        
        wo_data = WorkOrderCreate(
            work_order_no="WO-INTEG-001",
            title="状态链完整性测试工单",
            description="用于验证状态链不可绕过",
            location="完整路1号",
            creator_id=op.id,
        )
        wo = create_work_order(db, wo_data)
        print(f"  创建草稿工单: {wo.work_order_no}, 当前状态: {wo.status.value}")
        
        print("  尝试直接冻结草稿工单...")
        try:
            freeze_work_order(db, wo.id, FreezeRequest(
                reason="尝试直接冻结草稿",
                operator_id=ad.id,
            ))
            print("  ✗ 错误: 草稿工单应该不能直接冻结！")
            return False
        except WorkOrderStateError as e:
            print(f"  ✓ 正确阻止草稿冻结: {e}")
            return True
            
    except Exception as e:
        print(f"  ✗ 测试异常: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_submitted_cannot_freeze():
    """测试已提交工单不能直接冻结"""
    print("\n" + "=" * 60)
    print("测试2: 已提交工单不能直接冻结")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        op = get_user_by_username(db, "integrity_op")
        ad = get_user_by_username(db, "integrity_auditor")
        
        wo_data = WorkOrderCreate(
            work_order_no="WO-INTEG-002",
            title="已提交工单冻结测试",
            location="完整路2号",
            creator_id=op.id,
        )
        wo = create_work_order(db, wo_data)
        
        wo, _ = change_work_order_status(db, wo.id, StatusChangeRequest(
            new_status=WorkOrderStatus.SUBMITTED,
            reason="提交审核",
            operator_id=op.id,
        ))
        print(f"  工单已提交: {wo.status.value}")
        
        print("  尝试直接冻结已提交工单...")
        try:
            freeze_work_order(db, wo.id, FreezeRequest(
                reason="尝试冻结已提交工单",
                operator_id=ad.id,
            ))
            print("  ✗ 错误: 已提交工单应该不能直接冻结！")
            return False
        except WorkOrderStateError as e:
            print(f"  ✓ 正确阻止已提交工单冻结: {e}")
            return True
            
    except Exception as e:
        print(f"  ✗ 测试异常: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_reconfirmed_cannot_freeze():
    """测试二次确认工单不能直接冻结"""
    print("\n" + "=" * 60)
    print("测试3: 二次确认工单不能直接冻结")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        op = get_user_by_username(db, "integrity_op")
        ad = get_user_by_username(db, "integrity_auditor")
        
        wo_data = WorkOrderCreate(
            work_order_no="WO-INTEG-003",
            title="二次确认工单冻结测试",
            location="完整路3号",
            creator_id=op.id,
        )
        wo = create_work_order(db, wo_data)
        
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
        print(f"  工单已二次确认: {wo.status.value}")
        
        print("  尝试直接冻结二次确认工单...")
        try:
            freeze_work_order(db, wo.id, FreezeRequest(
                reason="尝试冻结二次确认工单",
                operator_id=ad.id,
            ))
            print("  ✗ 错误: 二次确认工单应该不能直接冻结！")
            return False
        except WorkOrderStateError as e:
            print(f"  ✓ 正确阻止二次确认工单冻结: {e}")
            return True
            
    except Exception as e:
        print(f"  ✗ 测试异常: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_audit_only_can_freeze():
    """测试只读审计状态可以正常冻结"""
    print("\n" + "=" * 60)
    print("测试4: 只读审计状态可以正常冻结")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        op = get_user_by_username(db, "integrity_op")
        ad = get_user_by_username(db, "integrity_auditor")
        
        wo_data = WorkOrderCreate(
            work_order_no="WO-INTEG-004",
            title="只读审计冻结测试",
            location="完整路4号",
            creator_id=op.id,
        )
        wo = create_work_order(db, wo_data)
        
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
            reason="进入只读审计",
            operator_id=ad.id,
        ))
        print(f"  工单进入只读审计: {wo.status.value}")
        
        print("  尝试冻结只读审计工单...")
        wo = freeze_work_order(db, wo.id, FreezeRequest(
            reason="导出前冻结",
            operator_id=ad.id,
        ))
        print(f"  ✓ 成功冻结: status={wo.status.value}, is_frozen={wo.is_frozen}")
        
        transitions = wo.status_transitions
        last_trans = transitions[-1]
        print(f"  状态流转记录: {last_trans.from_status.value} → {last_trans.to_status.value}")
        
        if last_trans.from_status == WorkOrderStatus.AUDIT_ONLY and last_trans.to_status == WorkOrderStatus.FROZEN:
            print(f"  ✓ 状态流转记录正确: audit_only → frozen (不是 frozen → frozen)")
            return True
        else:
            print(f"  ✗ 状态流转记录错误: {last_trans.from_status.value} → {last_trans.to_status.value}")
            return False
            
    except Exception as e:
        print(f"  ✗ 测试异常: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_complete_state_chain():
    """测试完整状态链：草稿→提交→二次确认→只读审计→冻结→导出"""
    print("\n" + "=" * 60)
    print("测试5: 完整状态链可追责串联")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        op = get_user_by_username(db, "integrity_op")
        ad = get_user_by_username(db, "integrity_auditor")
        
        wo_data = WorkOrderCreate(
            work_order_no="WO-INTEG-005",
            title="完整状态链测试",
            description="同一路段反复熄灯",
            location="人民大道中段",
            creator_id=op.id,
            spare_part_batch="SP202405099",
            hotline_number="13800139999",
        )
        wo = create_work_order(db, wo_data)
        print(f"  工单创建: {wo.work_order_no}")
        
        expected_chain = [
            (None, WorkOrderStatus.DRAFT, op, "创建工单草稿"),
            (WorkOrderStatus.DRAFT, WorkOrderStatus.SUBMITTED, op, "提交审核"),
            (WorkOrderStatus.SUBMITTED, WorkOrderStatus.RECONFIRMED, op, "二次确认，信息完整"),
            (WorkOrderStatus.RECONFIRMED, WorkOrderStatus.AUDIT_ONLY, ad, "进入只读审计"),
            (WorkOrderStatus.AUDIT_ONLY, WorkOrderStatus.FROZEN, ad, "冻结: 导出前冻结"),
        ]
        
        wo, _ = change_work_order_status(db, wo.id, StatusChangeRequest(
            new_status=WorkOrderStatus.SUBMITTED,
            reason="提交审核",
            operator_id=op.id,
        ))
        print(f"  1. DRAFT → SUBMITTED")
        
        wo, _ = change_work_order_status(db, wo.id, StatusChangeRequest(
            new_status=WorkOrderStatus.RECONFIRMED,
            reason="二次确认，信息完整",
            operator_id=op.id,
        ))
        print(f"  2. SUBMITTED → RECONFIRMED")
        
        wo, _ = change_work_order_status(db, wo.id, StatusChangeRequest(
            new_status=WorkOrderStatus.AUDIT_ONLY,
            reason="进入只读审计",
            operator_id=ad.id,
        ))
        print(f"  3. RECONFIRMED → AUDIT_ONLY")
        
        wo = freeze_work_order(db, wo.id, FreezeRequest(
            reason="导出前冻结",
            operator_id=ad.id,
        ))
        print(f"  4. AUDIT_ONLY → FROZEN")
        
        from app.services import export_work_orders
        export_data, export_log = export_work_orders(db, ExportRequest(
            work_order_ids=[wo.id],
            export_type="json",
            mask_sensitive=True,
            exported_by=ad.id,
        ))
        print(f"  5. FROZEN → EXPORTED")
        
        db.refresh(wo)
        transitions = wo.status_transitions
        
        print(f"\n  完整状态链审计记录:")
        print("  " + "-" * 80)
        print(f"  {'序号':>2} | {'时间':<19} | {'前置状态':>10} → {'后置状态':>12} | {'操作人':<8} | {'原因'}")
        print("  " + "-" * 80)
        
        all_correct = True
        for i, t in enumerate(transitions):
            from_s = t.from_status.value if t.from_status else "无"
            print(f"  {i+1:>2} | {t.occurred_at:%Y-%m-%d %H:%M:%S} | {from_s:>10} → {t.to_status.value:>12} | {t.operator.real_name:<8} | {t.reason}")
            
            if i < len(expected_chain):
                exp_from, exp_to, exp_op, exp_reason = expected_chain[i]
                if t.from_status != exp_from or t.to_status != exp_to:
                    all_correct = False
                    print(f"     ✗ 期望: {exp_from.value if exp_from else '无'} → {exp_to.value}")
        
        export_status_trans = [t for t in transitions if t.to_status == WorkOrderStatus.EXPORTED]
        if export_status_trans:
            t = export_status_trans[0]
            from_s = t.from_status.value if t.from_status else "无"
            print(f"  {len(transitions):>2} | {t.occurred_at:%Y-%m-%d %H:%M:%S} | {from_s:>10} → {t.to_status.value:>12} | {t.operator.real_name:<8} | {t.reason}")
        
        print("\n  导出数据验证:")
        wo_export = export_data[0]
        print(f"    状态变更记录数: {len(wo_export['status_transitions'])}")
        print(f"    热线电话脱敏: {wo_export['hotline_number']}")
        print(f"    最终状态: {wo_export['status']}")
        
        if all_correct:
            print("\n  ✓ 完整状态链验证通过，所有前置/后置状态正确")
        else:
            print("\n  ✗ 状态链存在错误")
        
        return all_correct
        
    except Exception as e:
        print(f"  ✗ 测试异常: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_no_frozen_to_frozen_in_history():
    """测试历史回放中不会出现 frozen→frozen 的错误记录"""
    print("\n" + "=" * 60)
    print("测试6: 历史回放事实可信（无 frozen→frozen 错误记录）")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        from app.queue_service import replay_work_order_history, get_replay_session
        
        ad = get_user_by_username(db, "integrity_auditor")
        op = get_user_by_username(db, "integrity_op")
        
        wo_data = WorkOrderCreate(
            work_order_no="WO-INTEG-006",
            title="历史回放可信性测试",
            location="历史路1号",
            creator_id=op.id,
        )
        wo = create_work_order(db, wo_data)
        
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
        
        session = replay_work_order_history(
            db,
            work_order_id=wo.id,
            created_by=ad.id,
            name="可信性测试回放",
        )
        
        print(f"  回放事件数: {len(session.replay_events)}")
        print(f"  事件序列:")
        
        has_error = False
        for event in session.replay_events:
            from_s = event["from_status"] if event["from_status"] else "无"
            print(f"    {event['sequence']}. {from_s} → {event['to_status']}: {event['reason']}")
            
            if event["from_status"] == "frozen" and event["to_status"] == "frozen":
                has_error = True
                print(f"      ✗ 发现 frozen→frozen 错误记录！")
        
        if has_error:
            print("\n  ✗ 历史回放存在错误记录，事实不可信")
            return False
        else:
            print("\n  ✓ 历史回放所有事件正确，事实可信")
            return True
        
    except Exception as e:
        print(f"  ✗ 测试异常: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def main():
    init_db()
    
    results = []
    
    print("\n" + "=" * 60)
    print("状态链完整性验证")
    print("目标: 草稿→提交→二次确认→只读审计→冻结→导出 可追责串联")
    print("=" * 60)
    
    results.append(("草稿不能直接冻结", test_draft_cannot_freeze()))
    results.append(("已提交不能直接冻结", test_submitted_cannot_freeze()))
    results.append(("二次确认不能直接冻结", test_reconfirmed_cannot_freeze()))
    results.append(("只读审计可以冻结", test_audit_only_can_freeze()))
    results.append(("完整状态链可追责", test_complete_state_chain()))
    results.append(("历史回放事实可信", test_no_frozen_to_frozen_in_history()))
    
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    for name, passed in results:
        status = "✓ 通过" if passed else "✗ 失败"
        print(f"  {name}: {status}")
    
    passed_count = sum(1 for _, p in results if p)
    print(f"\n总计: {passed_count}/{len(results)} 测试通过")
    
    if passed_count == len(results):
        print("\n🎉 状态链完整性验证全部通过！")
        print("   草稿、提交、二次确认、只读审计、冻结/导出可完整追责串联")
        print("   审计历史记录可信，无 frozen→frozen 错误")
    
    sys.exit(0 if passed_count == len(results) else 1)


if __name__ == "__main__":
    main()
