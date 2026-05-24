#!/usr/bin/env python3
"""
验证修复脚本：
1. 验证良率计算：抽检0.9、返工0.8、班次0.9关联到同一批次后，final_pass_rate 应为 0.8（返工结果）
   而不是被班次记录冲掉的 0.9
2. 验证异步任务闭环：失败后标记等重试、等人工、永久失败、恢复继续处理
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from qfsm.database import SessionLocal, init_db
from qfsm.services import BatchService, SourceDataService, AsyncTaskService
from qfsm.schemas import QualityBatchCreate
from qfsm.models import BatchStatus, DuplicateStrategy, TaskStatus


def test_pass_rate_calculation():
    """测试良率计算：返工结果不应被班次记录冲掉"""
    print("\n" + "=" * 70)
    print("测试 1: 良率计算验证")
    print("=" * 70)
    print("\n场景: 抽检良率 0.9 → 返工良率 0.8 → 机台班次良率 0.9")
    print("期望: final_pass_rate = 0.8 (返工结果)，而不是 0.9 (班次良率)")
    print()

    db = SessionLocal()
    try:
        source_service = SourceDataService(db)
        batch_service = BatchService(db)

        insp = source_service.create_inspection({
            "batch_no": "TEST_BATCH_001",
            "product_code": "TEST001",
            "product_name": "测试产品",
            "total_quantity": 100,
            "defective_quantity": 10,
            "pass_rate": 0.9,
            "defect_type": "测试缺陷",
            "machine_id": "M001",
            "shift_id": "S001",
            "inspector": "测试员",
            "created_by": "test",
            "inspection_date": datetime.now() - timedelta(hours=3),
        })
        print(f"✓ 创建抽检表: pass_rate={insp.pass_rate}")

        rw = source_service.create_rework({
            "rework_no": "RW_TEST_001",
            "batch_no": "TEST_BATCH_001",
            "product_code": "TEST001",
            "rework_quantity": 10,
            "reworked_quantity": 10,
            "passed_quantity": 8,
            "rework_pass_rate": 0.8,
            "machine_id": "M001",
            "shift_id": "S002",
            "is_secondary_rework": False,
            "created_by": "test",
            "rework_date": datetime.now() - timedelta(hours=2),
        })
        print(f"✓ 创建返工单: rework_pass_rate={rw.rework_pass_rate}")

        shift = source_service.create_machine_shift({
            "shift_code": "S003",
            "machine_id": "M001",
            "shift_type": "白班",
            "shift_leader": "组长",
            "operator": "操作员",
            "production_quantity": 1000,
            "defective_quantity": 100,
            "shift_pass_rate": 0.9,
            "created_by": "test",
            "shift_date": datetime.now() - timedelta(hours=1),
        })
        print(f"✓ 创建机台班次: shift_pass_rate={shift.shift_pass_rate}")

        batch_data = QualityBatchCreate(
            batch_no="TEST_BATCH_001",
            product_code="TEST001",
            product_name="测试产品",
            created_by="test",
            duplicate_strategy=DuplicateStrategy.IGNORE,
            inspection_ids=[insp.id],
            rework_ids=[rw.id],
            machine_shift_ids=[shift.id],
        )
        batch = batch_service.create_batch(batch_data)
        print(f"\n✓ 创建批次并关联所有数据源")

        print(f"\n批次计算结果:")
        print(f"  - 返工次数: {batch.rework_count}")
        print(f"  - 初始良率: {batch.initial_pass_rate}")
        print(f"  - 最终良率: {batch.final_pass_rate}")
        print(f"  - 最高良率: {batch.best_pass_rate}")
        print(f"  - 最低良率: {batch.worst_pass_rate}")
        print(f"  - 责任班次: {batch.responsible_shift}")
        print(f"  - 责任机台: {batch.responsible_machine}")

        passed = (
            batch.initial_pass_rate == 0.9
            and batch.final_pass_rate == 0.8
            and batch.best_pass_rate == 0.9
            and batch.worst_pass_rate == 0.8
        )

        if passed:
            print("\n✅ 测试通过: 良率计算正确，返工结果未被班次冲掉！")
        else:
            print("\n❌ 测试失败: 良率计算错误！")
            print(f"   期望: initial=0.9, final=0.8, best=0.9, worst=0.8")
            print(f"   实际: initial={batch.initial_pass_rate}, final={batch.final_pass_rate}, "
                  f"best={batch.best_pass_rate}, worst={batch.worst_pass_rate}")

        return passed, batch.batch_id

    finally:
        db.close()


def test_async_task_workflow():
    """测试异步任务闭环流程"""
    print("\n" + "=" * 70)
    print("测试 2: 异步任务闭环验证")
    print("=" * 70)

    db = SessionLocal()
    try:
        service = AsyncTaskService(db)
        all_passed = True

        print("\n--- 场景 1: 创建任务 → 启动 → 完成 ---")
        task = service.create_task({
            "task_type": "test_export",
            "batch_id": "BATCH-TEST-001",
            "parameters": {"format": "excel"},
            "created_by": "test",
        })
        print(f"✓ 创建任务: {task.task_id}, 状态={task.status.value}")

        task = service.start_task(task.task_id)
        print(f"✓ 启动任务: 状态={task.status.value}")
        all_passed = all_passed and task.status == TaskStatus.RUNNING

        task = service.complete_task(task.task_id, {"success": True, "rows": 100})
        print(f"✓ 完成任务: 状态={task.status.value}")
        all_passed = all_passed and task.status == TaskStatus.COMPLETED

        print("\n--- 场景 2: 创建任务 → 启动 → 失败（可重试） ---")
        task2 = service.create_task({
            "task_type": "test_fail",
            "created_by": "test",
        })
        task2 = service.start_task(task2.task_id)
        task2 = service.fail_task(task2.task_id, "网络超时")
        print(f"✓ 标记失败: 状态={task2.status.value}, 重试次数={task2.retry_count}")
        all_passed = all_passed and task2.status == TaskStatus.WAITING_RETRY

        print("\n--- 场景 3: 重试任务 ---")
        task2 = service.retry_task(task2.task_id)
        print(f"✓ 恢复待处理: 状态={task2.status.value}")
        all_passed = all_passed and task2.status == TaskStatus.PENDING

        print("\n--- 场景 4: 创建任务 → 启动 → 失败（永久失败） ---")
        task3 = service.create_task({
            "task_type": "test_permanent_fail",
            "created_by": "test",
        })
        task3 = service.start_task(task3.task_id)
        task3 = service.fail_task(task3.task_id, "数据格式错误，无法重试", is_permanent=True)
        print(f"✓ 标记永久失败: 状态={task3.status.value}")
        all_passed = all_passed and task3.status == TaskStatus.PERMANENT_FAILED

        print("\n--- 场景 5: 从永久失败恢复（人工修正后） ---")
        task3 = service.retry_task(task3.task_id, reset_retry_count=True)
        print(f"✓ 从永久失败恢复: 状态={task3.status.value}")
        all_passed = all_passed and task3.status == TaskStatus.PENDING

        print("\n--- 场景 6: 标记需要人工处理 ---")
        task4 = service.create_task({
            "task_type": "test_manual",
            "created_by": "test",
        })
        task4 = service.start_task(task4.task_id)
        task4 = service.mark_for_manual(task4.task_id, "异常数据需要人工确认")
        print(f"✓ 标记需人工处理: 状态={task4.status.value}")
        all_passed = all_passed and task4.status == TaskStatus.WAITING_MANUAL

        print("\n--- 场景 7: 人工处理后恢复 ---")
        task4 = service.retry_task(task4.task_id)
        print(f"✓ 从人工处理恢复: 状态={task4.status.value}")
        all_passed = all_passed and task4.status == TaskStatus.PENDING

        print("\n--- 场景 8: 批量处理待处理任务（服务恢复后） ---")
        pending_before = len(service.get_pending_tasks())
        processed = service.process_pending_tasks()
        print(f"✓ 批量处理: 处理了 {len(processed)} 个任务")
        all_passed = all_passed and len(processed) == pending_before

        if all_passed:
            print("\n✅ 所有异步任务闭环测试通过！")
        else:
            print("\n❌ 部分异步任务闭环测试失败！")

        return all_passed

    finally:
        db.close()


def test_cli_help():
    """测试 CLI 命令是否可用"""
    print("\n" + "=" * 70)
    print("测试 3: CLI 命令验证")
    print("=" * 70)
    print("\n检查 CLI 命令是否可用...")

    import subprocess

    commands = [
        ["python3", "-m", "qfsm.cli", "--help"],
        ["python3", "-m", "qfsm.cli", "task", "--help"],
        ["python3", "-m", "qfsm.cli", "batch", "--help"],
    ]

    all_passed = True
    for cmd in commands:
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=os.path.dirname(os.path.dirname(__file__)))
        if result.returncode == 0:
            print(f"✓ {' '.join(cmd[2:])} 可用")
        else:
            print(f"❌ {' '.join(cmd[2:])} 失败: {result.stderr}")
            all_passed = False

    return all_passed


def main():
    print("\n" + "=" * 70)
    print("质检返工异常回执状态机 - 修复验证测试")
    print("=" * 70)

    if os.path.exists("quality_fsm.db"):
        os.remove("quality_fsm.db")

    init_db()

    test1_passed, batch_id = test_pass_rate_calculation()
    test2_passed = test_async_task_workflow()
    test3_passed = test_cli_help()

    print("\n" + "=" * 70)
    print("测试总结")
    print("=" * 70)
    print(f"良率计算测试: {'✅ 通过' if test1_passed else '❌ 失败'}")
    print(f"异步任务测试: {'✅ 通过' if test2_passed else '❌ 失败'}")
    print(f"CLI 命令测试: {'✅ 通过' if test3_passed else '❌ 失败'}")

    all_passed = test1_passed and test2_passed and test3_passed

    print("\n" + "=" * 70)
    if all_passed:
        print("✅ 所有测试通过！修复验证成功。")
        print("=" * 70)
        return 0
    else:
        print("❌ 部分测试失败，请检查修复。")
        print("=" * 70)
        return 1


if __name__ == "__main__":
    sys.exit(main())
