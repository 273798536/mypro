from database import SessionLocal, engine
from models import Base
from schemas import (
    RentalContractCreate, DepositFlowCreate, DeviceLedgerCreate,
    DepositOccupationCreate
)
from services import (
    create_rental_contract, create_deposit_flow, create_device_ledger,
    create_deposit_occupation, review_occupation, confirm_occupation
)
from datetime import datetime, timedelta

Base.metadata.create_all(bind=engine)
db = SessionLocal()

try:
    contract1 = RentalContractCreate(
        contract_no="HT2024001",
        lessee="张三建筑公司",
        start_date=datetime(2024, 1, 1),
        end_date=datetime(2024, 12, 31),
        total_deposit=50000.0,
        status="active",
        remark="脚手架租赁项目"
    )
    db_contract1 = create_rental_contract(db, contract1)
    print(f"创建合同: {db_contract1.contract_no}")
    
    contract2 = RentalContractCreate(
        contract_no="HT2024002",
        lessee="李四工程队",
        start_date=datetime(2024, 3, 1),
        end_date=datetime(2025, 2, 28),
        total_deposit=30000.0,
        status="active",
        remark="升降机租赁项目"
    )
    db_contract2 = create_rental_contract(db, contract2)
    print(f"创建合同: {db_contract2.contract_no}")
    
    flow1 = DepositFlowCreate(
        flow_no="FL20240101001",
        contract_id=db_contract1.id,
        flow_type="deposit_paid",
        amount=50000.0,
        flow_date=datetime(2024, 1, 5),
        operator="财务小王",
        status="confirmed",
        source="manual",
        remark="押金入账"
    )
    create_deposit_flow(db, flow1)
    print(f"创建流水: {flow1.flow_no}")
    
    flow2 = DepositFlowCreate(
        flow_no="FL20240301001",
        contract_id=db_contract2.id,
        flow_type="deposit_paid",
        amount=30000.0,
        flow_date=datetime(2024, 3, 5),
        operator="财务小王",
        status="confirmed",
        source="manual",
        remark="押金入账"
    )
    create_deposit_flow(db, flow2)
    print(f"创建流水: {flow2.flow_no}")
    
    device1 = DeviceLedgerCreate(
        device_no="DEV001",
        contract_id=db_contract1.id,
        device_name="脚手架",
        device_model="A型-10米",
        deposit_amount=20000.0,
        device_status="rented",
        rent_date=datetime(2024, 1, 10)
    )
    db_device1 = create_device_ledger(db, device1)
    print(f"创建设备: {device1.device_no}")
    
    device2 = DeviceLedgerCreate(
        device_no="DEV002",
        contract_id=db_contract1.id,
        device_name="脚手架",
        device_model="A型-15米",
        deposit_amount=30000.0,
        device_status="rented",
        rent_date=datetime(2024, 1, 10)
    )
    db_device2 = create_device_ledger(db, device2)
    print(f"创建设备: {device2.device_no}")
    
    device3 = DeviceLedgerCreate(
        device_no="DEV003",
        contract_id=db_contract2.id,
        device_name="升降机",
        device_model="SC200",
        deposit_amount=30000.0,
        device_status="rented",
        rent_date=datetime(2024, 3, 10)
    )
    create_device_ledger(db, device3)
    print(f"创建设备: {device3.device_no}")
    
    occ1 = DepositOccupationCreate(
        contract_id=db_contract1.id,
        occupation_type="repair_damage",
        occupation_reason="DEV001脚手架损坏维修",
        amount=5000.0,
        deduction_order=1,
        related_device_id=db_device1.id,
        related_repair_order="WX20240501001",
        created_by="运营小李"
    )
    db_occ1 = create_deposit_occupation(db, occ1)
    print(f"创建占用单: {db_occ1.occupation_no}")
    review_occupation(db, db_occ1.id, "主管老张", "维修工单已核实")
    confirm_occupation(db, db_occ1.id, "财务小王", "确认抵扣")
    print(f"  已复核并确认")
    
    occ2 = DepositOccupationCreate(
        contract_id=db_contract1.id,
        occupation_type="model_transfer",
        occupation_reason="换型转押：DEV002转至HT2024002",
        amount=30000.0,
        deduction_order=2,
        related_device_id=db_device2.id,
        is_transfer=True,
        transfer_to_contract=db_contract2.id,
        created_by="运营小李"
    )
    db_occ2 = create_deposit_occupation(db, occ2)
    print(f"创建占用单: {db_occ2.occupation_no} (换型转押)")
    review_occupation(db, db_occ2.id, "主管老张", "转押手续齐全")
    
    occ3 = DepositOccupationCreate(
        contract_id=db_contract1.id,
        occupation_type="rent_overdue",
        occupation_reason="4月份租金逾期",
        amount=8000.0,
        deduction_order=3,
        created_by="运营小李"
    )
    db_occ3 = create_deposit_occupation(db, occ3)
    print(f"创建占用单: {db_occ3.occupation_no} (待复核)")
    
    print("\n=== 示例数据创建完成 ===")
    print(f"合同1({db_contract1.contract_no}): 押金50000, 已占用{5000+30000+8000}, 可用{50000-5000-30000-8000}")
    print(f"合同2({db_contract2.contract_no}): 押金30000")
    print(f"换型转押场景: DEV002从{db_contract1.contract_no}转至{db_contract2.contract_no}")
    print(f"冲突场景: 可通过API创建超过设备押金的占用单测试冲突检测")
    
except Exception as e:
    print(f"错误: {e}")
    db.rollback()
finally:
    db.close()
