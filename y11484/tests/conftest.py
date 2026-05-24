import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta

from app.database import Base, get_db
from app.main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def sample_label_data():
    return {
        "batch_no": f"TEST{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "product_name": "测试菜品",
        "production_time": (datetime.now() - timedelta(hours=2)).isoformat(),
        "sample_time": (datetime.now() - timedelta(hours=1)).isoformat(),
        "sampler": "测试员",
        "storage_location": "测试位置"
    }


@pytest.fixture
def create_sample_label(client, sample_label_data):
    def _create(batch_no=None):
        if batch_no:
            sample_label_data["batch_no"] = batch_no
        response = client.post(
            "/sample-labels/",
            json=sample_label_data,
            headers={"X-User-Id": "test_user"}
        )
        return response.json()
    return _create


@pytest.fixture
def status_request():
    def _make(new_status, reason="测试原因", operator="test_op", role="tester"):
        return {
            "new_status": new_status,
            "change_reason": reason,
            "operator": operator,
            "operator_role": role,
            "ip_address": "127.0.0.1"
        }
    return _make
