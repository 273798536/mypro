#!/usr/bin/env python3
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, engine, SessionLocal
from app.models import (
    Contract, PaymentNode, AcceptanceEmail, SupplementalAgreement,
    ContractStatus, RoleType, SourceFileType
)
from datetime import datetime, timedelta


def init_database():
    print("正在初始化数据库...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("数据库表创建完成！")


def create_sample_data():
    print("正在创建样例数据...")
    db = SessionLocal()

    try:
        contract1 = Contract(
            contract_no="HT-2024-001",
            contract_name="XX系统开发服务合同",
            party_a="甲方科技有限公司",
            party_b="乙方软件股份有限公司",
            total_amount=500000.00,
            sign_date=datetime(2024, 1, 15),
            effective_date=datetime(2024, 2, 1),
            expiry_date=datetime(2024, 12, 31),
            status=ContractStatus.DRAFT,
            created_by="张三",
            remarks="这是一个样例合同"
        )
        db.add(contract1)
        db.flush()

        nodes1 = [
            PaymentNode(
                contract_id=contract1.id,
                node_name="预付款",
                node_no="P001",
                planned_amount=150000.00,
                planned_date=datetime(2024, 2, 10),
                milestone="合同签订后5个工作日",
                version=1,
                is_latest=True,
                original_line_no=1,
                original_value={"node_name": "预付款", "planned_amount": 150000.00}
            ),
            PaymentNode(
                contract_id=contract1.id,
                node_name="需求验收款",
                node_no="P002",
                planned_amount=150000.00,
                planned_date=datetime(2024, 4, 1),
                milestone="需求规格说明书验收通过",
                version=1,
                is_latest=True,
                original_line_no=2,
                original_value={"node_name": "需求验收款", "planned_amount": 150000.00}
            ),
            PaymentNode(
                contract_id=contract1.id,
                node_name="上线验收款",
                node_no="P003",
                planned_amount=150000.00,
                planned_date=datetime(2024, 8, 1),
                milestone="系统上线验收通过",
                version=1,
                is_latest=True,
                original_line_no=3,
                original_value={"node_name": "上线验收款", "planned_amount": 150000.00}
            ),
            PaymentNode(
                contract_id=contract1.id,
                node_name="质保金",
                node_no="P004",
                planned_amount=50000.00,
                planned_date=datetime(2025, 2, 1),
                milestone="质保期满无质量问题",
                version=1,
                is_latest=True,
                original_line_no=4,
                original_value={"node_name": "质保金", "planned_amount": 50000.00}
            )
        ]
        db.add_all(nodes1)

        email1 = AcceptanceEmail(
            contract_id=contract1.id,
            email_subject="关于XX系统需求规格说明书的验收确认",
            sender="项目经理<pm@company-a.com>",
            receiver="法务部<legal@company-b.com>",
            send_date=datetime(2024, 3, 28, 10, 30),
            email_content="您好，经过双方项目组的共同评审，现对XX系统需求规格说明书予以验收通过。请按照合同约定办理付款手续。",
            acceptance_result="通过",
            acceptance_date=datetime(2024, 3, 28),
            is_verified=True,
            verified_by="李四",
            version=1,
            original_line_no=1,
            original_value={"subject": "验收确认", "result": "通过"}
        )
        db.add(email1)

        contract2 = Contract(
            contract_no="HT-2024-002",
            contract_name="YY平台运维服务合同",
            party_a="甲方科技有限公司",
            party_b="丙方运维服务有限公司",
            total_amount=360000.00,
            sign_date=datetime(2024, 3, 1),
            effective_date=datetime(2024, 3, 15),
            expiry_date=datetime(2025, 3, 14),
            status=ContractStatus.SUBMITTED,
            created_by="王五",
            remarks="存在节点变更争议"
        )
        db.add(contract2)
        db.flush()

        nodes2 = [
            PaymentNode(
                contract_id=contract2.id,
                node_name="首季度运维费",
                node_no="Q1",
                planned_amount=90000.00,
                planned_date=datetime(2024, 3, 20),
                actual_date=datetime(2024, 3, 25),
                actual_amount=90000.00,
                milestone="第一季度服务完成",
                is_completed=True,
                version=1,
                is_latest=True,
                original_line_no=1,
                original_value={"node_name": "首季度运维费", "planned_amount": 90000.00}
            ),
            PaymentNode(
                contract_id=contract2.id,
                node_name="第二季度运维费",
                node_no="Q2",
                planned_amount=90000.00,
                planned_date=datetime(2024, 6, 20),
                milestone="第二季度服务完成",
                is_disputed=True,
                dispute_reason="补充协议变更了付款时间，但系统提醒仍按旧版本执行",
                version=2,
                is_latest=True,
                original_line_no=2,
                original_value={"node_name": "第二季度运维费", "planned_amount": 90000.00}
            )
        ]
        db.add_all(nodes2)

        supplement1 = SupplementalAgreement(
            contract_id=contract2.id,
            agreement_no="BC-2024-002-001",
            agreement_name="付款时间变更补充协议",
            sign_date=datetime(2024, 5, 10),
            effective_date=datetime(2024, 5, 15),
            change_summary="将第二季度付款时间从6月20日变更为7月15日",
            original_content="第二季度运维费付款时间：2024年6月20日",
            new_content="第二季度运维费付款时间：2024年7月15日",
            is_applied=False,
            version=1,
            original_line_no=1,
            original_value={"agreement_no": "BC-2024-002-001", "change_date": "2024-05-10"},
            remarks="此变更未正确同步到付款提醒系统"
        )
        db.add(supplement1)

        contract3 = Contract(
            contract_no="HT-2024-003",
            contract_name="ZZ硬件采购合同",
            party_a="甲方科技有限公司",
            party_b="丁方设备销售有限公司",
            total_amount=1200000.00,
            sign_date=datetime(2024, 2, 20),
            effective_date=datetime(2024, 3, 1),
            expiry_date=datetime(2024, 6, 30),
            status=ContractStatus.CONFIRMED,
            is_frozen=True,
            frozen_at=datetime.now(),
            frozen_by="审计员",
            created_by="赵六"
        )
        db.add(contract3)

        db.commit()
        print("样例数据创建完成！")
        print(f"\n创建了 {db.query(Contract).count()} 份合同")
        print(f"创建了 {db.query(PaymentNode).count()} 个付款节点")
        print(f"创建了 {db.query(AcceptanceEmail).count()} 封验收邮件")
        print(f"创建了 {db.query(SupplementalAgreement).count()} 份补充协议")
        print("\n样例合同编号:")
        for c in db.query(Contract).all():
            print(f"  - {c.contract_no}: {c.contract_name} ({c.status})")

    except Exception as e:
        db.rollback()
        print(f"创建样例数据失败: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_database()
    create_sample_data()
    print("\n初始化完成！启动服务命令: uvicorn app.main:app --reload")
