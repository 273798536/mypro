import sys
import os
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.services.queue_service import QueueService
from app.schemas import (
    LogisticsReceiptCreate, BorrowRecordCreate,
    StoreTransferCreate
)


def seed_sample_data():
    print("=" * 60)
    print("正在导入样例数据...")
    print("=" * 60)

    db = SessionLocal()

    now = datetime.now()

    logistics_data = [
        LogisticsReceiptCreate(
            tracking_number="SF1234567890001",
            material_name="易拉宝",
            material_code="MAT001",
            quantity=10,
            sender="上海总仓",
            receiver="北京展会现场",
            receive_time=now - timedelta(days=2),
            signatory="张三",
            sms_screenshot_url="/sms/sf1234567890001.jpg"
        ),
        LogisticsReceiptCreate(
            tracking_number="SF1234567890002",
            material_name="宣传册",
            material_code="MAT003",
            quantity=500,
            sender="上海总仓",
            receiver="北京展会现场",
            receive_time=now - timedelta(days=2),
            signatory="张三",
            sms_screenshot_url="/sms/sf1234567890002.jpg"
        ),
        LogisticsReceiptCreate(
            tracking_number="SF1234567890003",
            material_name="LED显示屏",
            material_code="MAT005",
            quantity=2,
            sender="深圳分公司",
            receiver="北京展会现场",
            receive_time=now - timedelta(days=1),
            signatory="李四",
            sms_screenshot_url="/sms/sf1234567890003.jpg"
        ),
    ]

    for data in logistics_data:
        QueueService.submit_logistics_receipt(db, data)
        print(f"✓ 物流签收: {data.material_name} x {data.quantity}")

    borrow_data = [
        BorrowRecordCreate(
            borrow_no="BR202401001",
            material_name="投影仪",
            material_code="MAT006",
            quantity=1,
            borrower="王经理",
            borrower_department="市场部",
            borrow_time=now - timedelta(days=3),
            expected_return_time=now + timedelta(days=5),
            handler="赵六",
            remark="北京展会使用"
        ),
        BorrowRecordCreate(
            borrow_no="BR202401002",
            material_name="洽谈桌椅",
            material_code="MAT008",
            quantity=3,
            borrower="刘主管",
            borrower_department="销售部",
            borrow_time=now - timedelta(days=2),
            expected_return_time=now + timedelta(days=3),
            handler="赵六",
            remark="VIP洽谈区使用"
        ),
    ]

    for data in borrow_data:
        QueueService.submit_borrow_record(db, data)
        print(f"✓ 借用记录: {data.material_name} x {data.quantity}")

    transfer_data = [
        StoreTransferCreate(
            transfer_no="ST202401001",
            material_name="展架",
            material_code="MAT002",
            quantity=20,
            from_store="北京朝阳店",
            to_store="北京展会现场",
            transfer_time=now - timedelta(days=1),
            handler="孙七",
            receiver="张三"
        ),
        StoreTransferCreate(
            transfer_no="ST202401002",
            material_name="接待台",
            material_code="MAT007",
            quantity=1,
            from_store="北京海淀店",
            to_store="北京展会现场",
            transfer_time=now - timedelta(days=1),
            handler="周八",
            receiver="李四"
        ),
    ]

    for data in transfer_data:
        QueueService.submit_store_transfer(db, data)
        print(f"✓ 门店交接: {data.material_name} x {data.quantity}")

    db.close()

    print("=" * 60)
    print("样例数据导入完成!")
    print("=" * 60)


if __name__ == "__main__":
    seed_sample_data()
