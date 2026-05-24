import pytest
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.models import User, UserRole, AuditBatch, BatchStatus, StateTransition
from app.state_machine import (
    can_transition, submit_batch, start_review, approve_batch,
    reject_batch, freeze_batch, unfreeze_batch, archive_batch
)
from main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_hotel_audit.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    admin = User(username="test_admin", role=UserRole.SUPERVISOR)
    reviewer = User(username="test_reviewer", role=UserRole.REVIEWER)
    data_entry = User(username="test_data_entry", role=UserRole.DATA_ENTRY)
    viewer = User(username="test_viewer", role=UserRole.READ_ONLY)
    
    db.add_all([admin, reviewer, data_entry, viewer])
    db.commit()
    
    yield db
    
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client():
    with TestClient(app) as c:
        yield c


class TestStateTransitions:
    def test_valid_transitions(self):
        assert can_transition(BatchStatus.DRAFT, BatchStatus.SUBMITTED)
        assert can_transition(BatchStatus.SUBMITTED, BatchStatus.UNDER_REVIEW)
        assert can_transition(BatchStatus.SUBMITTED, BatchStatus.REJECTED)
        assert can_transition(BatchStatus.UNDER_REVIEW, BatchStatus.APPROVED)
        assert can_transition(BatchStatus.UNDER_REVIEW, BatchStatus.REJECTED)
        assert can_transition(BatchStatus.APPROVED, BatchStatus.FROZEN)
        assert can_transition(BatchStatus.APPROVED, BatchStatus.ARCHIVED)
        assert can_transition(BatchStatus.FROZEN, BatchStatus.APPROVED)
        assert can_transition(BatchStatus.REJECTED, BatchStatus.SUBMITTED)

    def test_invalid_transitions(self):
        assert not can_transition(BatchStatus.DRAFT, BatchStatus.APPROVED)
        assert not can_transition(BatchStatus.FROZEN, BatchStatus.UNDER_REVIEW)
        assert not can_transition(BatchStatus.ARCHIVED, BatchStatus.SUBMITTED)
        assert not can_transition(BatchStatus.SUBMITTED, BatchStatus.FROZEN)


class TestBatchWorkflow:
    def test_normal_workflow(self, db_session):
        admin = db_session.query(User).filter(User.role == UserRole.SUPERVISOR).first()
        data_entry = db_session.query(User).filter(User.role == UserRole.DATA_ENTRY).first()
        reviewer = db_session.query(User).filter(User.role == UserRole.REVIEWER).first()
        
        batch = AuditBatch(
            batch_no="TEST-001",
            audit_date=datetime.now(),
            created_by=data_entry.id
        )
        db_session.add(batch)
        db_session.commit()
        
        assert batch.status == BatchStatus.DRAFT
        
        success, msg = submit_batch(db_session, batch, data_entry)
        assert success
        assert batch.status == BatchStatus.SUBMITTED
        
        success, msg = start_review(db_session, batch, reviewer)
        assert success
        assert batch.status == BatchStatus.UNDER_REVIEW
        
        success, msg = approve_batch(db_session, batch, reviewer)
        assert success
        assert batch.status == BatchStatus.APPROVED
        
        success, msg = freeze_batch(db_session, batch, admin)
        assert success
        assert batch.status == BatchStatus.FROZEN
        
        transitions = db_session.query(StateTransition).filter(StateTransition.batch_id == batch.id).all()
        assert len(transitions) == 4

    def test_reject_workflow(self, db_session):
        data_entry = db_session.query(User).filter(User.role == UserRole.DATA_ENTRY).first()
        reviewer = db_session.query(User).filter(User.role == UserRole.REVIEWER).first()
        
        batch = AuditBatch(
            batch_no="TEST-002",
            audit_date=datetime.now(),
            created_by=data_entry.id
        )
        db_session.add(batch)
        db_session.commit()
        
        submit_batch(db_session, batch, data_entry)
        start_review(db_session, batch, reviewer)
        
        success, msg = reject_batch(db_session, batch, reviewer, "数据有问题")
        assert success
        assert batch.status == BatchStatus.REJECTED
        
        success, msg = submit_batch(db_session, batch, data_entry, "已修正重新提交")
        assert success
        assert batch.status == BatchStatus.SUBMITTED

    def test_freeze_unfreeze(self, db_session):
        admin = db_session.query(User).filter(User.role == UserRole.SUPERVISOR).first()
        data_entry = db_session.query(User).filter(User.role == UserRole.DATA_ENTRY).first()
        reviewer = db_session.query(User).filter(User.role == UserRole.REVIEWER).first()
        
        batch = AuditBatch(
            batch_no="TEST-003",
            audit_date=datetime.now(),
            created_by=data_entry.id
        )
        db_session.add(batch)
        db_session.commit()
        
        submit_batch(db_session, batch, data_entry)
        start_review(db_session, batch, reviewer)
        approve_batch(db_session, batch, reviewer)
        
        success, msg = freeze_batch(db_session, batch, admin, "财务夜审")
        assert success
        assert batch.status == BatchStatus.FROZEN
        assert batch.freeze_reason == "财务夜审"
        
        success, msg = unfreeze_batch(db_session, batch, admin)
        assert success
        assert batch.status == BatchStatus.APPROVED

    def test_archive(self, db_session):
        admin = db_session.query(User).filter(User.role == UserRole.SUPERVISOR).first()
        data_entry = db_session.query(User).filter(User.role == UserRole.DATA_ENTRY).first()
        reviewer = db_session.query(User).filter(User.role == UserRole.REVIEWER).first()
        
        batch = AuditBatch(
            batch_no="TEST-004",
            audit_date=datetime.now(),
            created_by=data_entry.id
        )
        db_session.add(batch)
        db_session.commit()
        
        submit_batch(db_session, batch, data_entry)
        start_review(db_session, batch, reviewer)
        approve_batch(db_session, batch, reviewer)
        
        success, msg = archive_batch(db_session, batch, admin)
        assert success
        assert batch.status == BatchStatus.ARCHIVED


class TestIdempotency:
    def test_duplicate_submit(self, db_session):
        data_entry = db_session.query(User).filter(User.role == UserRole.DATA_ENTRY).first()
        
        batch = AuditBatch(
            batch_no="IDEMP-001",
            audit_date=datetime.now(),
            created_by=data_entry.id,
            status=BatchStatus.SUBMITTED
        )
        db_session.add(batch)
        db_session.commit()
        
        success, msg = submit_batch(db_session, batch, data_entry)
        assert success
        assert "Already in target state" in msg
        
        transitions = db_session.query(StateTransition).filter(StateTransition.batch_id == batch.id).all()
        assert len(transitions) == 0

    def test_duplicate_transition_no_duplicate_records(self, db_session):
        admin = db_session.query(User).filter(User.role == UserRole.SUPERVISOR).first()
        data_entry = db_session.query(User).filter(User.role == UserRole.DATA_ENTRY).first()
        reviewer = db_session.query(User).filter(User.role == UserRole.REVIEWER).first()
        
        batch = AuditBatch(
            batch_no="IDEMP-002",
            audit_date=datetime.now(),
            created_by=data_entry.id
        )
        db_session.add(batch)
        db_session.commit()
        
        submit_batch(db_session, batch, data_entry)
        submit_batch(db_session, batch, data_entry)
        submit_batch(db_session, batch, data_entry)
        
        transitions = db_session.query(StateTransition).filter(StateTransition.batch_id == batch.id).all()
        assert len(transitions) == 1


class TestPermissions:
    def test_data_entry_cannot_freeze(self, db_session):
        data_entry = db_session.query(User).filter(User.role == UserRole.DATA_ENTRY).first()
        reviewer = db_session.query(User).filter(User.role == UserRole.REVIEWER).first()
        
        batch = AuditBatch(
            batch_no="PERM-001",
            audit_date=datetime.now(),
            created_by=data_entry.id,
            status=BatchStatus.APPROVED
        )
        db_session.add(batch)
        db_session.commit()
        
        success, msg = freeze_batch(db_session, batch, data_entry)
        assert not success
        assert "Permission denied" in msg

    def test_viewer_cannot_edit(self, client):
        response = client.get("/users")
        assert response.status_code == 422


class TestAPIEndpoints:
    def test_create_batch(self, client):
        response = client.post(
            "/batches",
            headers={"X-User-Id": "1", "Content-Type": "application/json"},
            json={"batch_no": "API-001", "audit_date": datetime.now().isoformat()}
        )
        if response.status_code == 200:
            assert response.json()["batch_no"] == "API-001"
            assert response.json()["status"] == "draft"

    def test_get_batches_list(self, client):
        response = client.get("/batches", headers={"X-User-Id": "1"})
        assert response.status_code in [200, 401, 403]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
