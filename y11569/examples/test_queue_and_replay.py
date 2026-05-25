#!/usr/bin/env python3
"""
重试队列、死信队列和历史回放功能演示
"""
import sys
import os
import time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from app.database import SessionLocal, init_db
from app.models import Role, WorkOrderStatus, TaskType
from app.schemas import (
    WorkOrderCreate, StatusChangeRequest,
    JudgmentCreate
)
from app.services import (
    create_user, get_user_by_username, create_work_order,
    change_work_order_status, add_judgment,
    has_permission
)
from app.queue_service import (
    create_retry_task, execute_task, get_pending_tasks,
    move_to_dead_letter, get_dead_letter_tasks, resolve_dead_letter,
    replay_work_order_history, get_replay_session, replay_to_timestamp,
    get_retry_queue_stats, calculate_next_retry_time, MaxRetriesExceeded
)


def test_retry_queue():
    """测试重试队列"""
    print("\n" + "=" * 60)
    print("测试1: 重试队列机制")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        if not get_user_by_username(db, "queue_op"):
            op = create_user(db, "queue_op", "队列测试员", Role.OPERATOR, "pass123")
        else:
            op = get_user_by_username(db, "queue_op")
        
        wo_data = WorkOrderCreate(
            work_order_no="WO-QUEUE-001",
            title="测试队列工单",
            description="用于测试重试队列",
            location="测试路1号",
            creator_id=op.id,
        )
        wo = create_work_order(db, wo_data)
        print(f"  创建测试工单: {wo.work_order_no}")
        
        print("\n  1. 创建重试任务")
        task = create_retry_task(
            db,
            task_type=TaskType.DATA_SYNC,
            task_data={"action": "sync", "work_order_id": wo.id, "attempt": 1},
            created_by=op.id,
            max_retries=3,
            work_order_id=wo.id,
            priority=1,
        )
        print(f"    任务创建成功: ID={task.id}, 最大重试={task.max_retries}")
        
        print("\n  2. 模拟任务失败")
        fail_count = [0]
        
        def failing_executor(data):
            fail_count[0] += 1
            raise Exception(f"模拟失败 #{fail_count[0]}")
        
        for i in range(2):
            try:
                execute_task(db, task, failing_executor)
            except Exception as e:
                db.refresh(task)
                print(f"    第{i+1}次执行失败: retry_count={task.retry_count}, status={task.status.value}")
                print(f"    下次重试时间: {task.next_retry_at}")
        
        print("\n  3. 指数退避策略验证")
        for i in range(4):
            next_time = calculate_next_retry_time(i)
            delay = (next_time - datetime.utcnow()).total_seconds()
            print(f"    重试{i+1}延迟: {delay:.0f}秒 (指数退避: {60 * (2**i)}秒)")
        
        print("\n  4. 超过最大重试次数移入死信队列")
        try:
            execute_task(db, task, failing_executor)
        except MaxRetriesExceeded as e:
            db.refresh(task)
            print(f"    已达最大重试次数: {task.status.value}")
            print(f"    错误: {str(e)[:60]}...")
        
        dlq_tasks = get_dead_letter_tasks(db, only_unresolved=True)
        print(f"    死信队列当前任务数: {len(dlq_tasks)}")
        if dlq_tasks:
            print(f"    最新死信任务: ID={dlq_tasks[-1].id}, 错误={dlq_tasks[-1].error_message[:50]}...")
        
        print("\n  ✓ 重试队列测试完成")
        return True
        
    except Exception as e:
        print(f"  ✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_dead_letter_queue():
    """测试死信队列"""
    print("\n" + "=" * 60)
    print("测试2: 死信队列机制")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        if not get_user_by_username(db, "dlq_op"):
            op = create_user(db, "dlq_op", "死信测试员", Role.OPERATOR, "pass123")
        else:
            op = get_user_by_username(db, "dlq_op")
        
        if not get_user_by_username(db, "dlq_admin"):
            admin = create_user(db, "dlq_admin", "死信管理员", Role.ADMIN, "pass123")
        else:
            admin = get_user_by_username(db, "dlq_admin")
        
        print("\n  1. 查看死信队列统计")
        stats = get_retry_queue_stats(db)
        print(f"    重试队列: {stats['retry_queue']}")
        print(f"    死信队列: {stats['dead_letter_queue']}")
        
        print("\n  2. 创建一个失败任务并移入死信队列")
        task = create_retry_task(
            db,
            task_type=TaskType.IMPORT,
            task_data={"file": "bad_data.csv", "error": "格式错误"},
            created_by=op.id,
            max_retries=1,
        )
        
        def always_fail(data):
            raise Exception("数据格式不可恢复错误")
        
        try:
            execute_task(db, task, always_fail)
        except MaxRetriesExceeded:
            pass
        
        dlq_tasks = get_dead_letter_tasks(db, only_unresolved=True)
        latest_dlq = dlq_tasks[-1]
        print(f"    死信任务: ID={latest_dlq.id}")
        print(f"    错误信息: {latest_dlq.error_message}")
        print(f"    重试次数: {latest_dlq.retry_count}")
        
        print("\n  3. 解决死信任务并重新入队")
        result = resolve_dead_letter(
            db,
            dlq_id=latest_dlq.id,
            resolved_by=admin.id,
            resolution_note="手动修正数据格式后重新处理",
            requeue=True,
        )
        
        db.refresh(latest_dlq)
        print(f"    死信已解决: resolved={latest_dlq.is_resolved}")
        print(f"    重新入队: new_task_id={result.id if result else None}")
        print(f"    处理说明: {latest_dlq.resolution_note}")
        
        print("\n  4. 查看解决后的死信队列")
        dlq_resolved = get_dead_letter_tasks(db, only_unresolved=False, limit=1)
        if dlq_resolved:
            print(f"    已解决任务数: {sum(1 for t in dlq_resolved if t.is_resolved)}")
            print(f"    未解决任务数: {sum(1 for t in dlq_resolved if not t.is_resolved)}")
        
        print("\n  ✓ 死信队列测试完成")
        return True
        
    except Exception as e:
        print(f"  ✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_history_replay():
    """测试历史回放"""
    print("\n" + "=" * 60)
    print("测试3: 历史回放功能")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        if not get_user_by_username(db, "replay_op"):
            op = create_user(db, "replay_op", "回放操作员", Role.OPERATOR, "pass123")
        else:
            op = get_user_by_username(db, "replay_op")
        
        if not get_user_by_username(db, "replay_sp"):
            sp = create_user(db, "replay_sp", "回放主管", Role.SUPERVISOR, "pass123")
        else:
            sp = get_user_by_username(db, "replay_sp")
        
        if not get_user_by_username(db, "replay_ad"):
            ad = create_user(db, "replay_ad", "回放审计", Role.AUDITOR, "pass123")
        else:
            ad = get_user_by_username(db, "replay_ad")
        
        print("\n  1. 创建工单并完成完整状态流转")
        wo_data = WorkOrderCreate(
            work_order_no="WO-REPLAY-001",
            title="历史回放电灯故障",
            description="路灯闪烁，需要维修",
            location="历史街100号",
            creator_id=op.id,
        )
        wo = create_work_order(db, wo_data)
        print(f"    工单创建: {wo.work_order_no}")
        
        status_changes = [
            (WorkOrderStatus.SUBMITTED, op.id, "提交审核"),
            (WorkOrderStatus.REJECTED, sp.id, "缺少备件信息"),
            (WorkOrderStatus.DRAFT, op.id, "修改补充信息"),
            (WorkOrderStatus.SUBMITTED, op.id, "重新提交"),
            (WorkOrderStatus.RECONFIRMED, op.id, "二次确认"),
            (WorkOrderStatus.AUDIT_ONLY, ad.id, "进入审计"),
        ]
        
        transition_times = []
        for new_status, operator_id, reason in status_changes:
            time.sleep(0.1)
            wo, trans = change_work_order_status(db, wo.id, StatusChangeRequest(
                new_status=new_status,
                reason=reason,
                operator_id=operator_id,
            ))
            transition_times.append(trans.occurred_at)
            print(f"    {new_status.value}: {reason} (at {trans.occurred_at:%H:%M:%S.%f})")
        
        print("\n  2. 创建历史回放会话")
        session = replay_work_order_history(
            db,
            work_order_id=wo.id,
            created_by=ad.id,
            name="问题回溯分析",
            description="分析2024年5月历史街路灯反复熄灯问题",
        )
        print(f"    回放会话创建: ID={session.id}")
        print(f"    事件总数: {len(session.replay_events)}")
        print(f"    时间范围: {session.start_time:%H:%M:%S} → {session.end_time:%H:%M:%S}")
        
        print("\n  3. 显示完整事件序列")
        for event in session.replay_events:
            from_s = event["from_status"] if event["from_status"] else "无"
            print(f"    #{event['sequence']:2d} {event['timestamp'][11:19]} | "
                  f"{from_s:10} → {event['to_status']:12} | "
                  f"{event['operator_name']:8} | {event['reason']}")
        
        print("\n  4. 回放至不同时间点")
        for i, target_time in enumerate(transition_times):
            result = replay_to_timestamp(db, session.id, target_time)
            print(f"\n    时间点 #{i+1} ({target_time:%H:%M:%S}):")
            print(f"      已应用事件数: {result['events_applied']}")
            print(f"      当前状态: {result['current_status']}")
            print(f"      最后操作人: {result.get('last_operator', 'N/A')}")
            if result.get('last_reason'):
                print(f"      最后原因: {result['last_reason']}")
        
        print("\n  5. 回放至中间时间点（部分事件）")
        middle_time = transition_times[2] + timedelta(milliseconds=50)
        result = replay_to_timestamp(db, session.id, middle_time)
        print(f"    中间时间点: {middle_time:%H:%M:%S.%f}")
        print(f"    已应用事件数: {result['events_applied']}/{len(session.replay_events)}")
        print(f"    当前状态: {result['current_status']}")
        
        print("\n  ✓ 历史回放测试完成")
        return True
        
    except Exception as e:
        print(f"  ✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def main():
    init_db()
    db = SessionLocal()
    
    results = []
    
    print("\n" + "=" * 60)
    print("重试队列、死信队列和历史回放功能测试")
    print("=" * 60)
    
    results.append(("重试队列机制", test_retry_queue()))
    results.append(("死信队列机制", test_dead_letter_queue()))
    results.append(("历史回放功能", test_history_replay()))
    
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    for name, passed in results:
        status = "✓ 通过" if passed else "✗ 失败"
        print(f"  {name}: {status}")
    
    passed_count = sum(1 for _, p in results if p)
    print(f"\n总计: {passed_count}/{len(results)} 测试通过")
    
    db.close()


if __name__ == "__main__":
    main()
