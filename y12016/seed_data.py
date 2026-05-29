from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models


def seed_all():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("开始插入示例数据...")

        contract1 = models.LeaseContract(
            contract_no="HT2024001",
            tenant_name="张三",
            room_no="A-101",
            monthly_rent=3000.0,
            deposit_amount=6000.0,
            rent_free_days=0,
            lease_start_date=datetime(2024, 1, 1),
            lease_end_date=datetime(2024, 12, 31),
            check_out_date=datetime(2024, 12, 25),
            status="ended",
        )
        contract2 = models.LeaseContract(
            contract_no="HT2024002",
            tenant_name="李四",
            room_no="B-203",
            monthly_rent=4500.0,
            deposit_amount=9000.0,
            rent_free_days=15,
            lease_start_date=datetime(2024, 3, 1),
            lease_end_date=datetime(2025, 2, 28),
            check_out_date=datetime(2024, 11, 30),
            status="ended",
        )
        contract3 = models.LeaseContract(
            contract_no="HT2024003",
            tenant_name="王五",
            room_no="C-305",
            monthly_rent=3500.0,
            deposit_amount=7000.0,
            rent_free_days=7,
            lease_start_date=datetime(2024, 6, 1),
            lease_end_date=datetime(2025, 5, 31),
            check_out_date=datetime(2024, 12, 15),
            status="ended",
        )
        db.add_all([contract1, contract2, contract3])
        db.flush()
        print(f"已插入 {len([contract1, contract2, contract3])} 份租约合同")

        flow1 = models.DepositFlow(
            flow_no="YL2024001",
            contract_id=contract1.id,
            flow_type="deposit_received",
            amount=6000.0,
            occurred_at=datetime(2024, 1, 1),
            remark="入住押金",
            operator="财务-刘",
        )
        flow2 = models.DepositFlow(
            flow_no="YL2024002",
            contract_id=contract2.id,
            flow_type="deposit_received",
            amount=9000.0,
            occurred_at=datetime(2024, 3, 1),
            remark="入住押金（含免租期误扣2250元）",
            operator="财务-刘",
        )
        flow3 = models.DepositFlow(
            flow_no="YL2024003",
            contract_id=contract3.id,
            flow_type="deposit_received",
            amount=7816.67,
            occurred_at=datetime(2024, 6, 1),
            remark="入住押金（含免租期7天，应收7816.67）",
            operator="财务-陈",
        )
        db.add_all([flow1, flow2, flow3])
        db.flush()
        print(f"已插入 {len([flow1, flow2, flow3])} 条押金流水")

        bill1 = models.UtilityBill(
            bill_no="SD20241201",
            contract_id=contract1.id,
            bill_period="2024-12",
            water_fee=85.5,
            electricity_fee=210.0,
            gas_fee=0.0,
            other_fee=0.0,
            total_amount=295.5,
            is_paid=False,
            billed_at=datetime(2024, 12, 26),
            remark="退租前最后一期水电费",
        )
        bill2 = models.UtilityBill(
            bill_no="SD20241101",
            contract_id=contract2.id,
            bill_period="2024-11",
            water_fee=120.0,
            electricity_fee=380.0,
            gas_fee=45.0,
            other_fee=0.0,
            total_amount=545.0,
            is_paid=False,
            billed_at=datetime(2024, 12, 1),
            remark="租客未缴",
        )
        bill3 = models.UtilityBill(
            bill_no="SD20241202",
            contract_id=contract3.id,
            bill_period="2024-12",
            water_fee=50.0,
            electricity_fee=150.0,
            gas_fee=0.0,
            other_fee=0.0,
            total_amount=200.0,
            is_paid=True,
            billed_at=datetime(2024, 12, 16),
            remark="租客已结清",
        )
        db.add_all([bill1, bill2, bill3])
        db.flush()
        print(f"已插入 {len([bill1, bill2, bill3])} 条水电账单")

        repair1 = models.RepairOrder(
            order_no="WX20241201",
            contract_id=contract1.id,
            repair_type="门锁维修",
            description="租客退租时发现门锁损坏",
            repair_cost=350.0,
            is_tenant_responsible=True,
            status="completed",
            reported_at=datetime(2024, 12, 25),
            completed_at=datetime(2024, 12, 26),
            remark="确认为租客使用不当",
        )
        repair2 = models.RepairOrder(
            order_no="WX20241101",
            contract_id=contract2.id,
            repair_type="墙面修补",
            description="墙面有明显污渍和钉孔",
            repair_cost=800.0,
            is_tenant_responsible=None,
            status="completed",
            reported_at=datetime(2024, 11, 30),
            completed_at=datetime(2024, 12, 2),
            remark="责任待确认，可能是自然损耗",
        )
        repair3 = models.RepairOrder(
            order_no="WX20241202",
            contract_id=contract3.id,
            repair_type="空调保养",
            description="常规保养，无需租客承担",
            repair_cost=150.0,
            is_tenant_responsible=False,
            status="completed",
            reported_at=datetime(2024, 12, 10),
            completed_at=datetime(2024, 12, 10),
            remark="物业承担",
        )
        db.add_all([repair1, repair2, repair3])
        db.flush()
        print(f"已插入 {len([repair1, repair2, repair3])} 条维修工单")

        db.commit()
        print("\n示例数据插入完成！")
        print("\n=== 数据说明 ===")
        print("1. 张三(HT2024001)：水电费未缴295.5元，门锁维修350元（租客责任）→ 争议较少")
        print("2. 李四(HT2024002)：免租期15天误扣2250元，水电费未缴545元，墙面维修责任待确认 → 多个争议")
        print("3. 王五(HT2024003)：水电费已缴，空调维修非租客责任 → 无争议")
        print("\n接下来可以调用 /deposit-ledgers/calculate 计算押金账本")

    except Exception as e:
        db.rollback()
        print(f"插入数据失败: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
