import pytest
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base
from app.models import Receipt, User, UserRole
from app.auth import get_password_hash
from app.crud import create_receipt, create_batch
from app.schemas import ReceiptCreate, BatchCreate

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_restart.db"


class TestRestartPersistence:
    def test_data_persists_after_session_restart(self):
        engine = create_engine(
            SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
        )
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

        db1 = TestingSessionLocal()
        try:
            user = User(
                username="restart_test_user",
                full_name="Restart Test",
                hashed_password=get_password_hash("test123"),
                role=UserRole.DATA_ENTRY,
            )
            db1.add(user)
            db1.flush()

            batch = create_batch(db1, BatchCreate(name="重启测试批次"), user)
            db1.flush()

            receipt_data = ReceiptCreate(
                material_id="RESTART_MAT_001",
                material_name="重启测试素材",
                platform="抖音",
                report_date="2024-01-30T00:00:00",
                daily_cost=5000.0,
                batch_id=batch.id,
            )
            receipt = create_receipt(db1, receipt_data, user)
            receipt_id = receipt.id
            receipt_no = receipt.receipt_no
            db1.commit()
        finally:
            db1.close()

        engine2 = create_engine(
            SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
        )
        TestingSessionLocal2 = sessionmaker(autocommit=False, autoflush=False, bind=engine2)
        db2 = TestingSessionLocal2()
        try:
            loaded_receipt = db2.query(Receipt).filter(Receipt.id == receipt_id).first()
            assert loaded_receipt is not None
            assert loaded_receipt.receipt_no == receipt_no
            assert loaded_receipt.material_id == "RESTART_MAT_001"
            assert loaded_receipt.material_name == "重启测试素材"
            assert loaded_receipt.daily_cost == 5000.0

            loaded_user = db2.query(User).filter(User.username == "restart_test_user").first()
            assert loaded_user is not None
            assert loaded_user.full_name == "Restart Test"
        finally:
            db2.close()
            Base.metadata.drop_all(bind=engine)
            if os.path.exists("test_restart.db"):
                os.remove("test_restart.db")

    def test_status_history_persists(self):
        engine = create_engine(
            SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
        )
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

        db1 = TestingSessionLocal()
        try:
            from app.state_machine import ReceiptStateMachine

            user = User(
                username="history_test_user",
                full_name="History Test",
                hashed_password=get_password_hash("test123"),
                role=UserRole.SUPERVISOR,
            )
            db1.add(user)
            db1.flush()

            receipt_data = ReceiptCreate(
                material_id="HISTORY_MAT_001",
                material_name="状态历史测试素材",
                platform="快手",
                report_date="2024-02-01T00:00:00",
            )
            receipt = create_receipt(db1, receipt_data, user)
            receipt_id = receipt.id

            sm = ReceiptStateMachine(receipt, db1, user)
            sm.submit("提交测试")
            sm.start_review("开始复核")
            sm.approve("复核通过")
            sm.freeze("冻结测试")
            db1.commit()

            history_count = len(receipt.status_histories)
            audit_count = len(receipt.audit_logs)
        finally:
            db1.close()

        engine2 = create_engine(
            SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
        )
        TestingSessionLocal2 = sessionmaker(autocommit=False, autoflush=False, bind=engine2)
        db2 = TestingSessionLocal2()
        try:
            loaded_receipt = db2.query(Receipt).filter(Receipt.id == receipt_id).first()
            assert loaded_receipt is not None
            assert loaded_receipt.status.value == "frozen"
            assert len(loaded_receipt.status_histories) == history_count
            assert len(loaded_receipt.audit_logs) == audit_count
        finally:
            db2.close()
            Base.metadata.drop_all(bind=engine)
            if os.path.exists("test_restart.db"):
                os.remove("test_restart.db")
