import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from app.database import SessionLocal, engine, Base
from app.models.all_models import *
from app.core.security import get_password_hash


def create_tables():
    Base.metadata.create_all(bind=engine)
    print("数据库表创建完成")


def init_users():
    db = SessionLocal()
    
    users_data = [
        {"username": "admin", "full_name": "系统管理员", "role": "supervisor", "password": "admin123", "department": "仓储部"},
        {"username": "entry1", "full_name": "录入员张三", "role": "entry", "password": "123456", "department": "仓储部"},
        {"username": "entry2", "full_name": "录入员李四", "role": "entry", "password": "123456", "department": "仓储部"},
        {"username": "reviewer1", "full_name": "复核员王五", "role": "reviewer", "password": "123456", "department": "质控部"},
        {"username": "readonly1", "full_name": "查看员赵六", "role": "readonly", "password": "123456", "department": "财务部"}
    ]
    
    created = []
    for user_data in users_data:
        existing = db.query(User).filter(User.username == user_data["username"]).first()
        if not existing:
            user = User(
                username=user_data["username"],
                full_name=user_data["full_name"],
                role=user_data["role"],
                department=user_data["department"],
                hashed_password=get_password_hash(user_data["password"])
            )
            db.add(user)
            created.append(user_data["username"])
    
    db.commit()
    db.close()
    print(f"创建用户: {created if created else '无(已存在)'}")


def init_source_data():
    db = SessionLocal()
    
    wave_count = db.query(WaveOrder).count()
    if wave_count > 0:
        print("源数据已存在，跳过初始化")
        db.close()
        return
    
    waves = []
    for i in range(1, 6):
        wave = WaveOrder(
            wave_no=f"WB2026052500{i}",
            wave_date=datetime.now() - timedelta(days=i % 3),
            warehouse_code="WH001",
            picker_id=f"P{100+i}",
            picker_name=["张三", "李四", "王五", "赵六", "钱七"][i-1],
            pick_zone=f"ZONE-{chr(64+i)}",
            total_orders=10 + i,
            total_skus=20 + i * 2,
            total_qty=100 + i * 10,
            performance_score=round(85 + i * 2, 2),
            inventory_occupied=round(5000 + i * 500, 2)
        )
        db.add(wave)
        waves.append(wave)
    db.flush()
    
    skus = ["SKU001", "SKU002", "SKU003", "SKU004", "SKU005"]
    sku_names = ["商品A", "商品B", "商品C", "商品D", "商品E"]
    
    for idx, wave in enumerate(waves):
        for j in range(3):
            sku_idx = (idx + j) % len(skus)
            pick_diff = PickDifference(
                diff_no=f"DF{wave.wave_no[2:]}{j:02d}",
                wave_id=wave.id,
                wave_no=wave.wave_no,
                order_no=f"ORD{wave.wave_no[2:]}{j:02d}",
                sku_code=skus[sku_idx],
                sku_name=sku_names[sku_idx],
                pick_qty=10 + j * 2,
                actual_pick_qty=8 + j * 2,
                diff_qty=2,
                diff_type="少拣",
                diff_reason="库存不符",
                source_system="WMS"
            )
            db.add(pick_diff)
            
            review_scan = ReviewScan(
                scan_no=f"SC{wave.wave_no[2:]}{j:02d}",
                wave_id=wave.id,
                wave_no=wave.wave_no,
                order_no=f"ORD{wave.wave_no[2:]}{j:02d}",
                sku_code=skus[sku_idx],
                sku_name=sku_names[sku_idx],
                reviewer_id=f"R{200+j}",
                reviewer_name=["复核员A", "复核员B", "复核员C"][j],
                review_qty=8 + j * 2,
                is_pass=True
            )
            db.add(review_scan)
    
    split_record = StockSplitRecord(
        split_no=f"SP{waves[0].wave_no[2:]}",
        original_wave_no=waves[0].wave_no,
        new_wave_no=f"WB20260526999",
        sku_code=skus[0],
        sku_name=sku_names[0],
        split_qty=5,
        split_reason="缺货拆单",
        stock_shortage_qty=5,
        original_performance=90.00,
        new_performance=85.00,
        performance_deviation=-5.00,
        original_inventory_occupied=5000.00,
        new_inventory_occupied=4500.00,
        inventory_deviation=-500.00,
        operator="系统自动",
        operate_time=datetime.now()
    )
    db.add(split_record)
    
    inventory_diff = InventoryDifference(
        check_no=f"IC20260525001",
        check_date=datetime.now(),
        warehouse_code="WH001",
        sku_code=skus[0],
        sku_name=sku_names[0],
        location="A-01-01",
        system_qty=100,
        actual_qty=95,
        diff_qty=-5,
        diff_type="盘亏",
        diff_reason="自然损耗",
        related_wave_no=waves[0].wave_no,
        check_person="盘点员"
    )
    db.add(inventory_diff)
    
    refund = RefundFlow(
        refund_no=f"RF20260525001",
        order_no=f"ORD{waves[0].wave_no[2:]}00",
        wave_no=waves[0].wave_no,
        sku_code=skus[0],
        sku_name=sku_names[0],
        refund_qty=2,
        refund_amount=round(50.00 * 2, 2),
        refund_type="退货退款",
        refund_reason="商品破损",
        is_related_pick_diff=True,
        operator="客服"
    )
    db.add(refund)
    
    db.commit()
    db.close()
    print("源数据初始化完成: 5个波次单, 15条拣货差异, 15条复核扫描, 缺货拆单记录, 盘点差异记录, 退款流水记录")


def main():
    print("=" * 50)
    print("初始化系统数据")
    print("=" * 50)
    
    create_tables()
    init_users()
    init_source_data()
    
    print("=" * 50)
    print("初始化完成!")
    print("默认账号:")
    print("  主管(超级权限): admin / admin123")
    print("  录入员: entry1 / 123456")
    print("  复核员: reviewer1 / 123456")
    print("  只读: readonly1 / 123456")
    print("=" * 50)


if __name__ == "__main__":
    main()
