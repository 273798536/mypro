from datetime import datetime
from decimal import Decimal
import sys

sys.path.insert(0, '.')

from app.models.user import User  # noqa: E402, F401
from app.database import SessionLocal, engine, Base  # noqa: E402
from app.core.dirty_record_detector import DirtyRecordDetector  # noqa: E402
from app.models.ledger import LedgerRecord  # noqa: E402
from app.models.source_data import StockSplitRecord, RefundFlow, InventoryDifference  # noqa: E402

Base.metadata.create_all(bind=engine)


def test_amount_conflict_with_db():
    print("=" * 60)
    print("测试金额冲突检测 - 真实数据库测试")
    print("=" * 60)

    db = SessionLocal()

    try:
        split_record = StockSplitRecord(
            split_no="SPTEST001",
            original_wave_no="WBTEST001",
            new_wave_no="WBTEST001-NEW",
            sku_code="SKUTEST001",
            sku_name="测试商品",
            split_qty=10,
            split_reason="缺货拆单",
            stock_shortage_qty=5,
            original_performance=Decimal("10"),
            new_performance=Decimal("5"),
            performance_deviation=Decimal("-5"),
            original_inventory_occupied=Decimal("1000"),
            new_inventory_occupied=Decimal("500"),
            inventory_deviation=Decimal("-500"),
            operator="测试员",
            operate_time=datetime.utcnow()
        )
        db.add(split_record)
        db.commit()
        db.refresh(split_record)
        print(f"\n[数据准备] 拆单记录:")
        print(f"  inventory_deviation = {split_record.inventory_deviation}")
        print(f"  performance_deviation = {split_record.performance_deviation}")

        ledger = LedgerRecord(
            ledger_no="LDTEST001",
            wave_no="WBTEST001",
            sku_code="SKUTEST001",
            sku_name="测试商品",
            picker_name="张三",
            reviewer_name="李四",
            diff_qty=5,
            diff_type="缺货",
            inventory_impact=Decimal("-400"),
            performance_impact=Decimal("-3"),
            status="draft",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(ledger)
        db.commit()
        db.refresh(ledger)
        print(f"\n[数据准备] 台账记录:")
        print(f"  inventory_impact = {ledger.inventory_impact}")
        print(f"  performance_impact = {ledger.performance_impact}")

        print(f"\n[预期冲突]")
        print(f"  库存: 台账 -400 vs 拆单 -500 → 差异 100 > 容差(50) → 应检测")
        print(f"  绩效: 台账 -3 vs 拆单 -5 → 差异 2 > 容差(0.5) → 应检测")

        detector = DirtyRecordDetector(db)
        issues = detector.detect_all(ledger)

        print(f"\n[检测结果] 共发现 {len(issues)} 个问题:")
        amount_conflicts = [i for i in issues if i['type'] == 'amount_conflict']
        print(f"  amount_conflict 类型: {len(amount_conflicts)} 个")

        inv_mismatch = None
        perf_mismatch = None

        for i, issue in enumerate(amount_conflicts):
            field = issue['field_name']
            ctype = issue.get('source_data', {}).get('conflict_type')
            print(f"\n  [{i+1}] {field} ({ctype}):")
            print(f"      原值: {issue['original_value']}")
            print(f"      现值: {issue['current_value']}")
            print(f"      错误: {issue['error_message']}")
            if ctype == 'value_mismatch' and field == 'inventory_impact':
                inv_mismatch = issue
            if ctype == 'value_mismatch' and field == 'performance_impact':
                perf_mismatch = issue

        test_passed = inv_mismatch is not None and perf_mismatch is not None

        print(f"\n" + "-" * 60)
        print(f"库存影响数值冲突检测: {'✅ 通过' if inv_mismatch else '❌ 失败'}")
        print(f"绩效影响数值冲突检测: {'✅ 通过' if perf_mismatch else '❌ 失败'}")
        print(f"\n" + "=" * 60)
        print(f"测试结果: {'✅ 全部通过' if test_passed else '❌ 测试失败'}")
        print("=" * 60)

        return test_passed

    finally:
        try:
            db.query(LedgerRecord).filter(LedgerRecord.ledger_no == "LDTEST001").delete()
            db.query(StockSplitRecord).filter(StockSplitRecord.split_no == "SPTEST001").delete()
            db.commit()
        except:
            pass
        db.close()


if __name__ == "__main__":
    result = test_amount_conflict_with_db()
    exit(0 if result else 1)
