import sys
import os
import argparse
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, Base, SessionLocal
from app.models.base import Batch, Contract, PaymentNode, AcceptanceEmail, PriceChange, BatchStatus
from datetime import datetime, timedelta


def init_database():
    Base.metadata.create_all(bind=engine)
    print("数据库表已创建")


def reset_database():
    db = SessionLocal()
    try:
        db.query(PriceChange).delete()
        db.query(AcceptanceEmail).delete()
        db.query(PaymentNode).delete()
        db.query(Contract).delete()
        db.query(Batch).delete()
        db.commit()
        print("已清空所有现有数据")
    finally:
        db.close()


def load_sample_data(reset_existing=False):
    db = SessionLocal()
    
    try:
        sample_batches = [
            "BATCH_20240101_SAMPLE01",
            "BATCH_20240102_SAMPLE02"
        ]
        
        existing = db.query(Batch).filter(Batch.batch_no.in_(sample_batches)).all()
        
        if existing and not reset_existing:
            print("发现已存在的样例数据，跳过加载")
            print(f"  - 已存在 {len(existing)} 个样例批次:")
            for batch in existing:
                contracts = db.query(Contract).filter(Contract.batch_id == batch.id).count()
                print(f"    * {batch.batch_no}: {contracts} 份合同")
            print(f"  - 如需重新加载，请使用 --reset 参数")
            return
        
        if existing and reset_existing:
            for batch in existing:
                contracts = db.query(Contract).filter(Contract.batch_id == batch.id).all()
                for contract in contracts:
                    db.query(PriceChange).filter(PriceChange.contract_id == contract.id).delete()
                    db.query(AcceptanceEmail).filter(AcceptanceEmail.contract_id == contract.id).delete()
                    db.query(PaymentNode).filter(PaymentNode.contract_id == contract.id).delete()
                    db.delete(contract)
                db.delete(batch)
            db.flush()
            print("已清除现有样例数据")
        
        batch1 = Batch(
            batch_no="BATCH_20240101_SAMPLE01",
            name="2024年Q1合同履约批次",
            description="第一季度法务合同履约异常回执处理",
            status=BatchStatus.CREATED,
            created_by="admin",
            source_type="manual",
            metadata_={"quarter": "Q1", "year": 2024}
        )
        db.add(batch1)
        db.flush()
        
        contract1 = Contract(
            batch_id=batch1.id,
            contract_no="HT2024001",
            contract_name="软件开发服务合同",
            party_a="甲方科技有限公司",
            party_b="乙方软件有限公司",
            sign_date=datetime(2024, 1, 10),
            effective_date=datetime(2024, 1, 15),
            expire_date=datetime(2024, 12, 31),
            total_amount=500000.00,
            version=1,
            is_supplement=False,
            is_frozen=False,
            is_archived=False
        )
        db.add(contract1)
        db.flush()
        
        nodes1 = [
            PaymentNode(
                contract_id=contract1.id,
                node_name="预付款",
                node_type="advance",
                payment_ratio=0.3,
                payment_amount=150000.00,
                due_date=datetime(2024, 1, 20),
                status="completed"
            ),
            PaymentNode(
                contract_id=contract1.id,
                node_name="进度款-阶段一",
                node_type="milestone",
                payment_ratio=0.3,
                payment_amount=150000.00,
                due_date=datetime(2024, 3, 1),
                status="pending"
            ),
            PaymentNode(
                contract_id=contract1.id,
                node_name="进度款-阶段二",
                node_type="milestone",
                payment_ratio=0.25,
                payment_amount=125000.00,
                due_date=datetime(2024, 6, 1),
                status="pending"
            ),
            PaymentNode(
                contract_id=contract1.id,
                node_name="验收尾款",
                node_type="final",
                payment_ratio=0.15,
                payment_amount=75000.00,
                due_date=datetime(2024, 12, 1),
                status="pending"
            )
        ]
        for node in nodes1:
            db.add(node)
        
        email1 = AcceptanceEmail(
            contract_id=contract1.id,
            email_subject="关于软件开发合同第一阶段验收确认",
            email_from="project@party-a.com",
            email_to="manager@party-b.com",
            email_date=datetime(2024, 3, 5),
            acceptance_result="approved",
            acceptance_amount=150000.00,
            content="我方已完成第一阶段验收，确认支付进度款。"
        )
        db.add(email1)
        
        contract2 = Contract(
            batch_id=batch1.id,
            contract_no="HT2024002",
            contract_name="硬件采购合同",
            party_a="甲方科技有限公司",
            party_b="供应商有限公司",
            sign_date=datetime(2024, 2, 1),
            effective_date=datetime(2024, 2, 5),
            expire_date=datetime(2024, 8, 5),
            total_amount=800000.00,
            version=1,
            is_supplement=False,
            is_frozen=True,
            frozen_at=datetime(2024, 3, 15),
            frozen_reason="发现付款节点与合同约定不符，待复核",
            frozen_by="auditor_zhang",
            is_archived=False
        )
        db.add(contract2)
        db.flush()
        
        nodes2 = [
            PaymentNode(
                contract_id=contract2.id,
                node_name="定金",
                node_type="deposit",
                payment_ratio=0.2,
                payment_amount=160000.00,
                due_date=datetime(2024, 2, 10),
                status="completed"
            ),
            PaymentNode(
                contract_id=contract2.id,
                node_name="发货款",
                node_type="delivery",
                payment_ratio=0.5,
                payment_amount=400000.00,
                due_date=datetime(2024, 3, 1),
                status="pending"
            ),
            PaymentNode(
                contract_id=contract2.id,
                node_name="验收款",
                node_type="acceptance",
                payment_ratio=0.3,
                payment_amount=240000.00,
                due_date=datetime(2024, 4, 15),
                status="pending"
            )
        ]
        for node in nodes2:
            db.add(node)
        
        price_change1 = PriceChange(
            contract_id=contract2.id,
            original_price=750000.00,
            new_price=800000.00,
            change_reason="原材料价格上涨，经双方协商调整总价",
            approved_by="director_li",
            approved_date=datetime(2024, 2, 20),
            effective_date=datetime(2024, 2, 20),
            is_manual=True
        )
        db.add(price_change1)
        
        contract3 = Contract(
            batch_id=batch1.id,
            contract_no="HT2024003",
            contract_name="运维服务合同",
            party_a="甲方科技有限公司",
            party_b="运维服务公司",
            sign_date=datetime(2024, 1, 1),
            effective_date=datetime(2024, 1, 1),
            expire_date=datetime(2024, 12, 31),
            total_amount=120000.00,
            version=1,
            is_supplement=False,
            is_frozen=False,
            is_archived=True,
            archived_at=datetime(2024, 4, 1)
        )
        db.add(contract3)
        db.flush()
        
        batch2 = Batch(
            batch_no="BATCH_20240102_SAMPLE02",
            name="历史数据导入批次",
            description="2023年历史合同数据追加导入",
            status=BatchStatus.UPLOADED,
            created_by="importer_wang",
            source_type="archive",
            metadata_={"year": 2023, "import_date": datetime.now().isoformat()}
        )
        db.add(batch2)
        db.flush()
        
        contract4 = Contract(
            batch_id=batch2.id,
            contract_no="HT2023101",
            contract_name="历史合同-咨询服务",
            party_a="甲方科技有限公司",
            party_b="咨询顾问有限公司",
            sign_date=datetime(2023, 6, 1),
            effective_date=datetime(2023, 6, 10),
            expire_date=datetime(2023, 12, 10),
            total_amount=200000.00,
            version=1,
            is_supplement=False,
            is_frozen=False,
            is_archived=False
        )
        db.add(contract4)
        
        db.commit()
        print("样例数据已加载")
        print(f"  - 创建了 {db.query(Batch).count()} 个批次")
        print(f"  - 创建了 {db.query(Contract).count()} 份合同")
        print(f"  - 创建了 {db.query(PaymentNode).count()} 个付款节点")
        print(f"  - 创建了 {db.query(AcceptanceEmail).count()} 封验收邮件")
        print(f"  - 创建了 {db.query(PriceChange).count()} 条改价记录")
        
    except Exception as e:
        db.rollback()
        print(f"加载样例数据失败: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="法务合同履约异常回执状态机 - 数据库初始化"
    )
    parser.add_argument(
        "--reset", 
        action="store_true", 
        help="清除现有数据并重新初始化"
    )
    parser.add_argument(
        "--reset-all", 
        action="store_true", 
        help="清空所有数据（包括非样例数据）"
    )
    
    args = parser.parse_args()
    
    print("=" * 50)
    print("法务合同履约异常回执状态机 - 数据库初始化")
    print("=" * 50)
    init_database()
    print()
    
    if args.reset_all:
        reset_database()
        print()
    
    load_sample_data(reset_existing=args.reset)
    print()
    print("初始化完成！")
    
    if args.reset_all:
        print("  提示: 已清空所有数据")
    elif args.reset:
        print("  提示: 已重置样例数据")
    else:
        print("  提示: 如需重置数据，请使用 --reset 参数")
