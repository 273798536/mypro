#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.auth import get_password_hash
from app import models, schemas
from app.enums import (
    UserRole,
    ReturnApplicationStatus,
    CompensationStatus,
    RetryStrategy,
    ReceiptSource,
    DisputeCategory,
)
from app.services import (
    generate_no,
    enum_value,
    ExternalReceiptService,
    CompensationQueueService,
    AuditService,
)
from datetime import datetime


def setup_in_memory_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()


def create_test_user(db):
    user = models.User(
        username="test_proc",
        hashed_password=get_password_hash("test123"),
        full_name="测试采购内勤",
        email="test@example.com",
        role=UserRole.PROCUREMENT_STAFF,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_return_application(db, creator_user):
    application = models.ReturnApplication(
        application_no=generate_no("RA"),
        supplier_id="SUP_TEST",
        supplier_name="测试供应商有限公司",
        warehouse_id="WH_TEST",
        description="测试退供申请",
        total_items=2,
        total_amount=9000.0,
        status=ReturnApplicationStatus.SUBMITTED,
        created_by=creator_user.id,
    )

    item1 = models.ReturnItem(
        sku_code="SKU_TEST1",
        sku_name="测试商品A",
        batch_no="BATCH001",
        quantity=100,
        unit_price=50.0,
        amount=5000.0,
    )

    item2 = models.ReturnItem(
        sku_code="SKU_TEST2",
        sku_name="测试商品B",
        batch_no="BATCH002",
        quantity=50,
        unit_price=80.0,
        amount=4000.0,
    )

    application.items.append(item1)
    application.items.append(item2)
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


def test_core_flow():
    print("=" * 60)
    print("仓库退供复核重试补偿队列 - 核心链路测试")
    print("=" * 60)

    db = setup_in_memory_db()
    test_user = create_test_user(db)
    print(f"✅ 创建测试用户: {test_user.full_name} (角色: {test_user.role})")

    application = create_return_application(db, test_user)
    print(f"✅ 创建退供申请: {application.application_no}")
    print(f"   - 供应商: {application.supplier_name}")
    print(f"   - 商品数量: {application.total_items}")
    print(f"   - 总金额: {application.total_amount}")

    print("\n" + "-" * 60)
    print("步骤1: 提交含争议的外部回执")
    print("-" * 60)

    receipt_data = schemas.ExternalReceiptCreate(
        application_id=application.id,
        source=ReceiptSource.EXTERNAL_RECEIPT,
        supplier_id="SUP_TEST",
        confirmed_items=[
            {
                "sku_code": "SKU_TEST1",
                "batch_no": "BATCH001",
                "quantity": 80,
            }
        ],
        disputed_items=[
            {
                "sku_code": "SKU_TEST1",
                "batch_no": "BATCH001",
                "quantity": 20,
                "dispute_category": DisputeCategory.QUALITY_MISMATCH.value,
                "dispute_reason": "质量不符合标准",
            },
            {
                "sku_code": "SKU_TEST2",
                "batch_no": "BATCH002",
                "quantity": 30,
                "dispute_category": DisputeCategory.MISSING_ITEMS.value,
                "dispute_reason": "缺少配件",
            },
        ],
        total_confirmed_qty=80,
        total_disputed_qty=50,
        confirmation_date=datetime.now(),
        received_by="供应商签收人",
        notes="供应商确认回执，部分商品有争议",
        import_batch_no="IMP_TEST_001",
        retry_strategy=RetryStrategy.APPEND,
    )

    try:
        receipt = ExternalReceiptService.create_receipt(db, receipt_data, test_user)
        print(f"✅ 创建外部回执: {receipt.receipt_no}")
        print(f"   - 确认数量: {receipt.total_confirmed_qty}")
        print(f"   - 争议数量: {receipt.total_disputed_qty}")
    except Exception as e:
        print(f"❌ 创建外部回执失败: {e}")
        import traceback
        traceback.print_exc()
        return False

    print("\n" + "-" * 60)
    print("步骤2: 验证补偿队列自动创建")
    print("-" * 60)

    queue = db.query(models.CompensationQueue).filter(
        models.CompensationQueue.application_id == application.id
    ).first()

    if queue:
        print(f"✅ 补偿队列自动创建: {queue.queue_no}")
        print(f"   - 状态: {queue.status}")
        print(f"   - 争议商品数: {len(queue.disputed_items_summary or [])}")
        print(f"   - 预估补偿金额: {queue.total_compensation_amount}")
    else:
        print("❌ 补偿队列未创建")
        return False

    print("\n" + "-" * 60)
    print("步骤3: 处理补偿队列")
    print("-" * 60)

    try:
        queue = CompensationQueueService.process_queue_item(db, queue.id, test_user)
        print(f"✅ 处理补偿队列完成")
        print(f"   - 处理后状态: {queue.status}")
        print(f"   - 重试次数: {queue.retry_count}")
        print(f"   - 处理成功商品数: {len(queue.processed_items or [])}")
        print(f"   - 处理失败商品数: {len(queue.failed_items or [])}")
    except Exception as e:
        print(f"❌ 处理补偿队列失败: {e}")
        import traceback
        traceback.print_exc()
        return False

    print("\n" + "-" * 60)
    print("步骤4: 测试人工接管")
    print("-" * 60)

    try:
        queue = CompensationQueueService.manual_review(
            db, queue.id, test_user, "测试人工介入审查"
        )
        print(f"✅ 转人工审查成功")
        print(f"   - 当前状态: {queue.status}")
        print(f"   - 指派给: {queue.assigned_to}")
    except Exception as e:
        print(f"❌ 转人工审查失败: {e}")
        return False

    print("\n" + "-" * 60)
    print("步骤5: 测试人工改判和补偿入账")
    print("-" * 60)

    resolve_request = schemas.ManualResolveRequest(
        resolved_items=[
            {
                "item_id": application.items[0].id,
                "sku_code": "SKU_TEST1",
                "disputed_qty": 20,
                "compensation_amount": 1000.0,
                "resolution": "同意补偿",
            }
        ],
        compensation_amount=1000.0,
        change_reason="人工判定：质量问题属实，同意全额补偿",
    )

    try:
        queue = CompensationQueueService.manual_resolve(db, queue.id, test_user, resolve_request)
        print(f"✅ 人工改判成功")
        print(f"   - 最终状态: {queue.status}")
        print(f"   - 实际补偿金额: {queue.total_compensation_amount}")
        print(f"   - 完成时间: {queue.completed_at}")
    except Exception as e:
        print(f"❌ 人工改判失败: {e}")
        import traceback
        traceback.print_exc()
        return False

    print("\n" + "-" * 60)
    print("步骤6: 验证审计日志")
    print("-" * 60)

    audit_logs = db.query(models.AuditLog).filter(
        models.AuditLog.application_id == application.id
    ).all()

    if audit_logs:
        print(f"✅ 审计日志记录完整，共 {len(audit_logs)} 条:")
        for log in audit_logs:
            print(f"   - [{log.created_at.strftime('%H:%M:%S')}] {enum_value(log.operation_type)}: {log.change_reason}")
    else:
        print("❌ 审计日志为空")

    print("\n" + "-" * 60)
    print("步骤7: 测试死信恢复")
    print("-" * 60)

    dl_application = create_return_application(db, test_user)
    dl_queue = CompensationQueueService.create_queue(db, dl_application.id, operator=test_user)
    dl_queue.status = CompensationStatus.DEAD_LETTER
    dl_queue.retry_count = 3
    dl_queue.last_error = "模拟死信错误"
    db.commit()

    try:
        dl_queue = CompensationQueueService.recover_dead_letter(
            db, dl_queue.id, test_user, "测试死信恢复"
        )
        print(f"✅ 死信恢复成功")
        print(f"   - 恢复后状态: {dl_queue.status}")
        print(f"   - 重置重试次数: {dl_queue.retry_count}")
    except Exception as e:
        print(f"❌ 死信恢复失败: {e}")
        return False

    print("\n" + "-" * 60)
    print("步骤8: 测试导出冻结")
    print("-" * 60)

    try:
        dl_queue = CompensationQueueService.freeze_queue(
            db, dl_queue.id, test_user, 24, "导出前冻结"
        )
        print(f"✅ 冻结成功")
        print(f"   - 冻结后状态: {dl_queue.status}")
        print(f"   - 是否冻结: {dl_queue.is_frozen}")
        print(f"   - 解冻时间: {dl_queue.frozen_until}")
    except Exception as e:
        print(f"❌ 冻结失败: {e}")
        return False

    print("\n" + "=" * 60)
    print("✅ 所有核心链路测试通过！")
    print("=" * 60)
    return True


if __name__ == "__main__":
    success = test_core_flow()
    sys.exit(0 if success else 1)
