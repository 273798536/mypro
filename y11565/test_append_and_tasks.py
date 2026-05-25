#!/usr/bin/env python3
"""测试 APPEND 策略和异步任务功能"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, Base, engine
from app.schemas import BatchCreate, WorkOrderCreate
from app.services import batch_service, task_service
from app.enums import DuplicateStrategy, TaskType, TaskStatus

Base.metadata.create_all(bind=engine)


def test_append_strategy():
    print("=" * 60)
    print("测试 APPEND 策略 - 同号工单可追加到不同批次")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        # 创建批次1
        batch1 = batch_service.create_batch(db, BatchCreate(
            batch_no="APPEND-TEST-001",
            name="APPEND测试批次1",
            work_orders=[WorkOrderCreate(order_no="WO-APPEND-001", road_section="测试路")],
        ))
        print(f"创建批次1: {batch1.batch_no}, 工单数: {batch1.total_work_orders}")
        
        # 创建批次2
        batch2 = batch_service.create_batch(db, BatchCreate(
            batch_no="APPEND-TEST-002",
            name="APPEND测试批次2",
            work_orders=[],
        ))
        print(f"创建批次2: {batch2.batch_no}, 工单数: {batch2.total_work_orders}")
        
        # 使用 APPEND 策略将同号工单追加到批次2
        wo = WorkOrderCreate(order_no="WO-APPEND-001", road_section="测试路", pole_number="P-002")
        results, added, skipped = batch_service.add_work_orders(
            db, batch2.id, [wo], DuplicateStrategy.APPEND
        )
        print(f"APPEND 策略结果: 新增 {added}, 跳过 {skipped}")
        
        # 验证两个批次都有同号工单
        batch1 = batch_service.get_batch(db, batch1.id)
        batch2 = batch_service.get_batch(db, batch2.id)
        print(f"批次1工单数: {batch1.total_work_orders}")
        print(f"批次2工单数: {batch2.total_work_orders}")
        
        # 验证批次1和批次2的工单号相同但ID不同
        wo1 = batch1.work_orders[0]
        wo2 = batch2.work_orders[0]
        print(f"批次1工单: ID={wo1.id}, 单号={wo1.order_no}")
        print(f"批次2工单: ID={wo2.id}, 单号={wo2.order_no}")
        
        assert wo1.order_no == wo2.order_no, "工单号应该相同"
        assert wo1.id != wo2.id, "工单ID应该不同"
        assert wo1.batch_id != wo2.batch_id, "批次ID应该不同"
        
        print("\n✅ APPEND 策略测试通过！同号工单可追加到不同批次")
        
        return batch2.id
    finally:
        db.close()


def test_same_batch_append():
    print("\n" + "=" * 60)
    print("测试 APPEND 策略 - 同批次内也可追加同号工单")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        # 创建批次
        batch = batch_service.create_batch(db, BatchCreate(
            batch_no="SAME-BATCH-APPEND",
            name="同批次APPEND测试",
            work_orders=[WorkOrderCreate(order_no="WO-SAME-001")],
        ))
        print(f"创建批次: {batch.batch_no}, 初始工单数: {batch.total_work_orders}")
        
        # 使用 APPEND 策略追加同号工单
        wo = WorkOrderCreate(order_no="WO-SAME-001", pole_number="P-APPENDED")
        results, added, skipped = batch_service.add_work_orders(
            db, batch.id, [wo], DuplicateStrategy.APPEND
        )
        print(f"APPEND 策略结果: 新增 {added}, 跳过 {skipped}")
        
        # 验证
        batch = batch_service.get_batch(db, batch.id)
        print(f"追加后工单数: {batch.total_work_orders}")
        
        order_nos = [wo.order_no for wo in batch.work_orders]
        print(f"工单号列表: {order_nos}")
        
        assert len(order_nos) == 2, "应该有2个工单"
        assert order_nos[0] == order_nos[1], "两个工单的单号应该相同"
        
        print("\n✅ 同批次内 APPEND 测试通过！同号工单可在同批次内追加")
        
        return batch.id
    finally:
        db.close()


def test_async_tasks():
    print("\n" + "=" * 60)
    print("测试异步任务创建和状态管理")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        # 创建任务
        task = task_service.create_task(db, TaskType.EXPORT_REPORT, batch_id=1)
        print(f"创建任务: {task.task_id}, 类型: {task.task_type}, 状态: {task.status}")
        
        # 查询待执行任务
        pending = task_service.get_pending_tasks(db)
        print(f"待执行任务数: {len(pending)}")
        
        # 手动执行任务
        from app.services.scheduler_service import run_once
        run_once()
        
        # 验证任务已完成
        task = task_service.get_task(db, task.task_id)
        print(f"执行后任务状态: {task.status}")
        print(f"任务进度: {task.progress}%")
        print(f"任务消息: {task.message}")
        
        assert task.status == TaskStatus.SUCCESS.value, "任务应该成功完成"
        
        print("\n✅ 异步任务测试通过！任务可创建、执行、完成")
        
        return task.task_id
    finally:
        db.close()


def test_task_failure_handling():
    print("\n" + "=" * 60)
    print("测试任务失败处理 - 区分等重试、等人工、永久失败")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        # 创建一个会失败的任务场景
        task = task_service.create_task(db, TaskType.BATCH_IMPORT, batch_id=1)
        print(f"创建任务: {task.task_id}")
        
        # 模拟失败
        task_service.mark_task_failed(db, task.task_id, "模拟失败1")
        task = task_service.get_task(db, task.task_id)
        print(f"第1次失败后: 状态={task.status}, 重试={task.retry_count}/{task.max_retries}")
        
        task_service.mark_task_failed(db, task.task_id, "模拟失败2")
        task = task_service.get_task(db, task.task_id)
        print(f"第2次失败后: 状态={task.status}, 重试={task.retry_count}/{task.max_retries}")
        
        task_service.mark_task_failed(db, task.task_id, "模拟失败3")
        task = task_service.get_task(db, task.task_id)
        print(f"第3次失败后: 状态={task.status}, 重试={task.retry_count}/{task.max_retries}")
        
        assert task.status == TaskStatus.FAILED_PERMANENT.value, "超过最大重试次数后应该是永久失败"
        
        # 测试标记为等待人工处理
        task2 = task_service.create_task(db, TaskType.SYNC_EXTERNAL, batch_id=1)
        task_service.mark_task_manual(db, task2.task_id, "需要人工确认数据")
        task2 = task_service.get_task(db, task2.task_id)
        print(f"\n标记为人工处理: 状态={task2.status}")
        assert task2.status == TaskStatus.WAITING_MANUAL.value, "应该是等待人工处理"
        
        # 测试重试
        task_service.retry_task(db, task.task_id, reset_retries=True)
        task = task_service.get_task(db, task.task_id)
        print(f"重试后: 状态={task.status}, 重试={task.retry_count}/{task.max_retries}")
        assert task.status == TaskStatus.PENDING.value, "重试后应该是待执行"
        
        print("\n✅ 任务失败处理测试通过！支持等重试、等人工、永久失败")
        
    finally:
        db.close()


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("开始核心功能验证测试")
    print("=" * 60)
    
    try:
        test_append_strategy()
        test_same_batch_append()
        test_async_tasks()
        test_task_failure_handling()
        
        print("\n" + "=" * 60)
        print("✅ 所有测试通过！")
        print("=" * 60)
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
