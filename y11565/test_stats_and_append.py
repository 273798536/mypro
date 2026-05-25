#!/usr/bin/env python3
"""测试批次统计和 APPEND 策略功能"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 使用内存数据库进行测试
engine = create_engine("sqlite:///:memory:")
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from app.models import Base
from app.schemas import BatchCreate, WorkOrderCreate
from app.services import batch_service
from app.enums import DuplicateStrategy

Base.metadata.create_all(bind=engine)


def test_batch_stats():
    print("=" * 60)
    print("测试批次统计数字段与实际数量一致性")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        # 测试1: 创建批次时的统计
        print("\n1. 创建批次时统计")
        batch = batch_service.create_batch(db, BatchCreate(
            batch_no="STATS-TEST-001",
            name="统计测试批次1",
            work_orders=[
                WorkOrderCreate(order_no="WO-STAT-001", is_abnormal=False),
                WorkOrderCreate(order_no="WO-STAT-002", is_abnormal=True),
                WorkOrderCreate(order_no="WO-STAT-003", is_abnormal=True),
            ],
        ))
        print(f"   创建批次，含3个工单（2个异常）")
        print(f"   stored_total={batch.total_work_orders}, stored_abnormal={batch.abnormal_count}")
        
        assert batch.total_work_orders == 3, f"总工单数应该是3，实际是 {batch.total_work_orders}"
        assert batch.abnormal_count == 2, f"异常工单数应该是2，实际是 {batch.abnormal_count}"
        print("   ✅ 创建批次时统计正确")
        
        # 测试2: 普通新增工单
        print("\n2. 普通新增工单统计")
        new_wo = WorkOrderCreate(order_no="WO-STAT-004", is_abnormal=False)
        results, added, skipped = batch_service.add_work_orders(
            db, batch.id, [new_wo], DuplicateStrategy.IGNORE
        )
        
        batch = batch_service.get_batch(db, batch.id)
        actual_count = db.query(batch_service.WorkOrder).filter(
            batch_service.WorkOrder.batch_id == batch.id
        ).count()
        print(f"   新增1个工单")
        print(f"   stored_total={batch.total_work_orders}, actual_count={actual_count}")
        
        assert batch.total_work_orders == actual_count, f"总工单数不匹配: stored={batch.total_work_orders}, actual={actual_count}"
        assert batch.total_work_orders == 4, f"总工单数应该是4，实际是 {batch.total_work_orders}"
        print("   ✅ 普通新增工单统计正确")
        
        # 测试3: APPEND 策略统计
        print("\n3. APPEND 策略统计")
        append_wo = WorkOrderCreate(order_no="WO-STAT-001", is_abnormal=True)
        results, added, skipped = batch_service.add_work_orders(
            db, batch.id, [append_wo], DuplicateStrategy.APPEND
        )
        
        batch = batch_service.get_batch(db, batch.id)
        actual_count = db.query(batch_service.WorkOrder).filter(
            batch_service.WorkOrder.batch_id == batch.id
        ).count()
        actual_abnormal = db.query(batch_service.WorkOrder).filter(
            batch_service.WorkOrder.batch_id == batch.id,
            batch_service.WorkOrder.is_abnormal == True
        ).count()
        print(f"   APPEND 1个同号工单（标记异常）")
        print(f"   stored_total={batch.total_work_orders}, actual_total={actual_count}")
        print(f"   stored_abnormal={batch.abnormal_count}, actual_abnormal={actual_abnormal}")
        
        assert batch.total_work_orders == actual_count, f"总工单数不匹配: stored={batch.total_work_orders}, actual={actual_count}"
        assert batch.abnormal_count == actual_abnormal, f"异常工单数不匹配: stored={batch.abnormal_count}, actual={actual_abnormal}"
        assert batch.total_work_orders == 5, f"总工单数应该是5，实际是 {batch.total_work_orders}"
        print("   ✅ APPEND 策略统计正确")
        
        # 测试4: OVERWRITE 策略统计
        print("\n4. OVERWRITE 策略统计")
        overwrite_wo = WorkOrderCreate(order_no="WO-STAT-001", is_abnormal=False)
        results, added, skipped = batch_service.add_work_orders(
            db, batch.id, [overwrite_wo], DuplicateStrategy.OVERWRITE
        )
        
        batch = batch_service.get_batch(db, batch.id)
        actual_count = db.query(batch_service.WorkOrder).filter(
            batch_service.WorkOrder.batch_id == batch.id
        ).count()
        print(f"   OVERWRITE 1个同号工单（取消异常标记）")
        print(f"   stored_total={batch.total_work_orders}, actual_total={actual_count}")
        
        assert batch.total_work_orders == actual_count, f"总工单数不匹配: stored={batch.total_work_orders}, actual={actual_count}"
        print("   ✅ OVERWRITE 策略统计正确")
        
        print("\n" + "=" * 60)
        print("✅ 所有批次统计测试通过！")
        print("=" * 60)
        
        return True
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_cross_batch_append():
    print("\n" + "=" * 60)
    print("测试跨批次同号工单 APPEND")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        # 创建两个批次，都添加同号工单
        batch1 = batch_service.create_batch(db, BatchCreate(
            batch_no="CROSS-BATCH-001",
            name="跨批次测试1",
            work_orders=[WorkOrderCreate(order_no="WO-CROSS-001")],
        ))
        
        batch2 = batch_service.create_batch(db, BatchCreate(
            batch_no="CROSS-BATCH-002",
            name="跨批次测试2",
            work_orders=[],
        ))
        
        # 向批次2追加同号工单
        wo = WorkOrderCreate(order_no="WO-CROSS-001")
        results, added, skipped = batch_service.add_work_orders(
            db, batch2.id, [wo], DuplicateStrategy.APPEND
        )
        
        batch1 = batch_service.get_batch(db, batch1.id)
        batch2 = batch_service.get_batch(db, batch2.id)
        
        print(f"批次1工单数: {batch1.total_work_orders}")
        print(f"批次2工单数: {batch2.total_work_orders}")
        
        assert batch1.total_work_orders == 1, f"批次1应该有1个工单，实际是 {batch1.total_work_orders}"
        assert batch2.total_work_orders == 1, f"批次2应该有1个工单，实际是 {batch2.total_work_orders}"
        
        # 验证两个批次都有同号工单
        wo1 = batch1.work_orders[0]
        wo2 = batch2.work_orders[0]
        print(f"批次1工单: ID={wo1.id}, 单号={wo1.order_no}")
        print(f"批次2工单: ID={wo2.id}, 单号={wo2.order_no}")
        
        assert wo1.order_no == wo2.order_no, "工单号应该相同"
        assert wo1.id != wo2.id, "工单ID应该不同"
        
        print("\n✅ 跨批次同号工单 APPEND 测试通过！")
        return True
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("开始批次统计功能验证测试")
    print("=" * 60)
    
    success = True
    success &= test_batch_stats()
    success &= test_cross_batch_append()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ 所有测试通过！")
        print("=" * 60)
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("❌ 部分测试失败")
        print("=" * 60)
        sys.exit(1)
