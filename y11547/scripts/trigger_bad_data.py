import sys
import os
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.services.queue_service import QueueService
from app.schemas import (
    LogisticsReceiptCreate, BorrowRecordCreate,
    RetryRequest, ManualReviewRequest,
    CompensationRequest, DeadLetterRecoverRequest
)


def trigger_dirty_data():
    print("=" * 60)
    print("正在触发脏数据场景...")
    print("=" * 60)

    db = SessionLocal()
    now = datetime.now()

    print("\n1. 缺字段检测 (缺少物料名称)...")
    try:
        bad_data1 = LogisticsReceiptCreate(
            tracking_number="BAD001",
            material_name="",
            material_code="MAT001",
            quantity=5,
            sender="测试",
            receiver="测试",
            receive_time=now,
            signatory="测试"
        )
        item = QueueService.submit_logistics_receipt(db, bad_data1)
        print(f"   ✓ 已触发缺字段检测: is_dirty={item.is_dirty}, type={item.dirty_type}")
    except Exception as e:
        print(f"   ✗ 错误: {e}")

    print("\n2. 物料名称与编码不匹配 (改名检测)...")
    bad_data2 = LogisticsReceiptCreate(
        tracking_number="BAD002",
        material_name="错误名称易拉宝",
        material_code="MAT001",
        quantity=5,
        sender="测试",
        receiver="测试",
        receive_time=now,
        signatory="测试"
    )
    item2 = QueueService.submit_logistics_receipt(db, bad_data2)
    print(f"   ✓ 已触发改名检测: is_dirty={item2.is_dirty}, type={item2.dirty_type}")

    print("\n3. 同一物料当日数量冲突...")
    bad_data3 = LogisticsReceiptCreate(
        tracking_number="BAD003",
        material_name="易拉宝",
        material_code="MAT001",
        quantity=999,
        sender="测试",
        receiver="测试",
        receive_time=now,
        signatory="测试"
    )
    item3 = QueueService.submit_logistics_receipt(db, bad_data3)
    print(f"   ✓ 已触发数量冲突: is_dirty={item3.is_dirty}, type={item3.dirty_type}")

    print("\n4. 模拟重试达到上限进入死信队列...")
    normal_data = LogisticsReceiptCreate(
        tracking_number="DEAD001",
        material_name="名片",
        material_code="MAT004",
        quantity=10,
        sender="测试",
        receiver="测试",
        receive_time=now,
        signatory="测试"
    )
    dead_item = QueueService.submit_logistics_receipt(db, normal_data)
    print(f"   创建测试记录: {dead_item.queue_no}")

    for i in range(3):
        dead_item = QueueService.process_retry(
            db, dead_item.id,
            RetryRequest(triggered_by="system", reason=f"模拟网络错误 #{i+1}")
        )
        print(f"   第{i+1}次重试后状态: {dead_item.status}, 重试次数: {dead_item.retry_count}")

    print(f"   ✓ 最终状态: {dead_item.status} (死信队列)")

    print("\n5. 人工修正脏数据...")
    corrected_item = QueueService.manual_review(
        db, item3.id,
        ManualReviewRequest(
            handler="张主管",
            handle_note="修正数量录入错误",
            corrected_data={"quantity": 15},
            correction_note="实际应为15个，原录入999为手误"
        )
    )
    print(f"   ✓ 人工修正完成: status={corrected_item.status}, is_dirty={corrected_item.is_dirty}")

    print("\n6. 死信恢复并重新处理...")
    recovered_item = QueueService.recover_dead_letter(
        db, dead_item.id,
        DeadLetterRecoverRequest(
            recovered_by="李经理",
            recovery_note="网络问题已解决，恢复重试",
            new_max_retry=3
        )
    )
    print(f"   ✓ 死信恢复完成: status={recovered_item.status}, retry_count={recovered_item.retry_count}")

    print("\n7. 补偿入账...")
    compensated_item = QueueService.compensate(
        db, item2.id,
        CompensationRequest(
            compensated_amount=500.0,
            compensated_by="王财务",
            compensation_note="物料名称不符，差额补偿"
        )
    )
    print(f"   ✓ 补偿入账完成: status={compensated_item.status}, amount={compensated_item.compensated_amount}")

    db.close()

    print("\n" + "=" * 60)
    print("脏数据场景触发完成!")
    print("=" * 60)
    print("\n可通过以下接口查看结果:")
    print("  - GET /api/v1/queue?is_dirty=true  查看脏数据")
    print("  - GET /api/v1/queue?status=dead_letter  查看死信队列")
    print("  - GET /api/v1/dashboard  查看仪表盘统计")


if __name__ == "__main__":
    trigger_dirty_data()
