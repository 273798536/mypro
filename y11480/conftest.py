import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app import models
from app.security import get_password_hash

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()

    supervisor = models.User(
        username="supervisor_test",
        hashed_password=get_password_hash("test123"),
        role=models.UserRole.SUPERVISOR,
        full_name="测试主管",
        is_active=True
    )
    db.add(supervisor)

    reviewer = models.User(
        username="reviewer_test",
        hashed_password=get_password_hash("test123"),
        role=models.UserRole.REVIEWER,
        full_name="测试复核员",
        is_active=True
    )
    db.add(reviewer)

    data_entry = models.User(
        username="data_entry_test",
        hashed_password=get_password_hash("test123"),
        role=models.UserRole.DATA_ENTRY,
        full_name="测试录入员",
        is_active=True
    )
    db.add(data_entry)

    db.commit()

    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def get_token(client: TestClient, username: str, password: str) -> str:
    response = client.post(
        "/api/v1/auth/login",
        data={"username": username, "password": password}
    )
    return response.json()["access_token"]


@pytest.fixture(scope="function")
def supervisor_token(client):
    return get_token(client, "supervisor_test", "test123")


@pytest.fixture(scope="function")
def reviewer_token(client):
    return get_token(client, "reviewer_test", "test123")


@pytest.fixture(scope="function")
def data_entry_token(client):
    return get_token(client, "data_entry_test", "test123")
