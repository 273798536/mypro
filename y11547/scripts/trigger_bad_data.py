import sys
import os
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import ReceiptQueue, QueueStatus, DirtyType
from app.services.queue_service import QueueService
from app.schemas import (
    LogisticsReceiptCreate, BorrowRecordCreate,
    MaterialListCreate, StoreTransferCreate,
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

    print("\n7. 金额冲突检测 (同一物料当日金额不一致)...")
    amount_data1 = LogisticsReceiptCreate(
        tracking_number="AMT001",
        material_name="LED显示屏",
        material_code="MAT005",
        quantity=1,
        sender="测试",
        receiver="测试",
        receive_time=now,
        signatory="测试"
    )
    amount_item1 = QueueService.submit_logistics_receipt(db, amount_data1)
    print(f"   ✓ 第1条LED显示屏记录: quantity={amount_item1.quantity}, amount={amount_item1.amount} (单价3500元)")

    amount_item1.amount = 3500.0
    db.commit()
    db.refresh(amount_item1)

    amount_data2_raw = LogisticsReceiptCreate(
        tracking_number="AMT002",
        material_name="LED显示屏",
        material_code="MAT005",
        quantity=1,
        sender="测试",
        receiver="测试",
        receive_time=now,
        signatory="测试"
    )
    raw_data2 = '{"tracking_number": "AMT002", "material_name": "LED显示屏", "material_code": "MAT005", "quantity": 1, "unit_price": 5000.0}'
    from app.schemas import ReceiptQueueCreate
    queue_data = ReceiptQueueCreate(
        material_name="LED显示屏",
        material_code="MAT005",
        quantity=1,
        amount=5000.0,
        source_type="logistics",
        source_id=998,
        original_data=raw_data2
    )
    amount_item2 = QueueService.create_queue_item(db, queue_data, business_time=now)
    print(f"   ✓ 金额冲突检测: is_dirty={amount_item2.is_dirty}, type={amount_item2.dirty_type}, amount={amount_item2.amount} (单价5000元)")

    print("\n8. 跨日检测 (昨日已有相同物料记录)...")
    yesterday_item = ReceiptQueue(
        queue_no=QueueService.generate_queue_no(),
        source_type="logistics",
        source_id=999,
        material_name="投影仪",
        material_code="MAT006",
        quantity=1,
        amount=2800.0,
        status=QueueStatus.PENDING,
        original_data='{"test": "yesterday"}',
        business_date=now - timedelta(days=1),
        created_at=now - timedelta(days=1)
    )
    db.add(yesterday_item)
    db.flush()
    print(f"   ✓ 已创建昨日记录: {yesterday_item.queue_no}, business_date={yesterday_item.business_date.strftime('%Y-%m-%d')}")

    cross_day_data = LogisticsReceiptCreate(
        tracking_number="CROSS001",
        material_name="投影仪",
        material_code="MAT006",
        quantity=1,
        sender="测试",
        receiver="测试",
        receive_time=now,
        signatory="测试"
    )
    cross_day_item = QueueService.submit_logistics_receipt(db, cross_day_data)
    print(f"   ✓ 跨日检测: is_dirty={cross_day_item.is_dirty}, type={cross_day_item.dirty_type}, business_date={cross_day_item.business_date.strftime('%Y-%m-%d')}")

    print("\n8.1 跨日场景专项验证: 2026-01-01 vs 2026-01-02...")
    date_jan1 = datetime(2026, 1, 1, 10, 0, 0)
    date_jan2 = datetime(2026, 1, 2, 14, 0, 0)

    jan1_data = LogisticsReceiptCreate(
        tracking_number="JAN01001",
        material_name="易拉宝",
        material_code="MAT001",
        quantity=5,
        sender="供应商A",
        receiver="展会仓储",
        receive_time=date_jan1,
        signatory="张收货"
    )
    jan1_item = QueueService.submit_logistics_receipt(db, jan1_data)
    print(f"   ✓ 2026-01-01 记录: is_dirty={jan1_item.is_dirty}, type={jan1_item.dirty_type}, business_date={jan1_item.business_date.strftime('%Y-%m-%d')}, amount={jan1_item.amount}")

    jan2_data = LogisticsReceiptCreate(
        tracking_number="JAN02001",
        material_name="易拉宝",
        material_code="MAT001",
        quantity=5,
        sender="供应商A",
        receiver="展会仓储",
        receive_time=date_jan2,
        signatory="张收货"
    )
    jan2_item = QueueService.submit_logistics_receipt(db, jan2_data)
    print(f"   ✓ 2026-01-02 记录: is_dirty={jan2_item.is_dirty}, type={jan2_item.dirty_type}, business_date={jan2_item.business_date.strftime('%Y-%m-%d')}, amount={jan2_item.amount}")
    assert jan2_item.is_dirty == True, "2026-01-02 记录应标记为脏数据"
    assert jan2_item.dirty_type == DirtyType.CROSS_DAY, "2026-01-02 记录脏数据类型应为 cross_day"
    print(f"   ✅ 跨日检测验证通过! 2026-01-02 记录正确标记为 cross_day")

    print("\n8.2 同日金额冲突专项验证...")
    same_day_date = datetime(2026, 1, 15, 9, 0, 0)
    amount_conflict1 = LogisticsReceiptCreate(
        tracking_number="AC001",
        material_name="宣传册",
        material_code="MAT003",
        quantity=100,
        sender="印刷厂",
        receiver="展会筹备组",
        receive_time=same_day_date,
        signatory="李物料"
    )
    ac_item1 = QueueService.submit_logistics_receipt(db, amount_conflict1)
    print(f"   ✓ 同日记录1: is_dirty={ac_item1.is_dirty}, type={ac_item1.dirty_type}, amount={ac_item1.amount} (单价24元×100=2400元)")

    amount_conflict2_data = LogisticsReceiptCreate(
        tracking_number="AC002",
        material_name="宣传册",
        material_code="MAT003",
        quantity=100,
        sender="印刷厂",
        receiver="展会筹备组",
        receive_time=same_day_date,
        signatory="李物料"
    )
    amount_conflict2_data.raw_data = '{"material_code": "MAT003", "quantity": 100, "unit_price": 25.0}'
    amount_conflict2 = QueueService.submit_logistics_receipt(db, amount_conflict2_data)
    amount_conflict2.amount = 2500.0
    db.flush()
    print(f"   ✓ 同日记录2: is_dirty={amount_conflict2.is_dirty}, type={amount_conflict2.dirty_type}, amount={amount_conflict2.amount} (单价25元×100=2500元)")

    ac_redetect_result = QueueService._detect_dirty_data(
        db,
        "宣传册",
        "MAT003",
        100,
        2500.0,
        "logistics",
        same_day_date
    )
    print(f"   ✓ 重检测结果: is_dirty={ac_redetect_result[0]}, type={ac_redetect_result[1]}")
    assert ac_redetect_result[0] == True, "同日金额不同应标记为脏数据"
    assert ac_redetect_result[1] == DirtyType.AMOUNT_CONFLICT, "同日金额不同脏数据类型应为 amount_conflict"
    print(f"   ✅ 同日金额冲突验证通过! 正确标记为 amount_conflict")

    print("\n9. 物料清单提交测试...")
    ml_data = MaterialListCreate(
        list_no="MLTEST001",
        exhibition_name="测试展会",
        material_name="洽谈桌椅",
        material_code="MAT008",
        planned_quantity=5,
        actual_quantity=5,
        unit_price=1200.0,
        responsible_person="测试负责人"
    )
    ml_item = QueueService.submit_material_list(db, ml_data)
    print(f"   ✓ 物料清单提交: queue_no={ml_item.queue_no}, amount={ml_item.amount}, source={ml_item.source_type}")

    print("\n10. 门店交接测试 (含金额计算)...")
    st_data = StoreTransferCreate(
        transfer_no="STTEST001",
        material_name="展架",
        material_code="MAT002",
        quantity=10,
        from_store="测试店A",
        to_store="测试店B",
        transfer_time=now,
        handler="测试",
        receiver="测试"
    )
    st_item = QueueService.submit_store_transfer(db, st_data)
    print(f"   ✓ 门店交接: quantity={st_item.quantity}, amount={st_item.amount} (单价80元 x 10 = 800元)")

    print("\n11. 补偿入账...")
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
