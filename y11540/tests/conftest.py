import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, get_db
from app.main import app
from app.auth import get_password_hash
from app.models import User, UserRole

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    del app.dependency_overrides[get_db]


@pytest.fixture(scope="function")
def test_users(db_session):
    users = []
    for role in [UserRole.SUPERVISOR, UserRole.REVIEWER, UserRole.DATA_ENTRY, UserRole.VIEWER]:
        user = User(
            username=f"test_{role.value}",
            full_name=f"Test {role.value}",
            hashed_password=get_password_hash("test123"),
            role=role,
        )
        db_session.add(user)
        db_session.flush()
        users.append(user)
    db_session.commit()
    return {u.role.value: u for u in users}


def get_token(client, username: str, password: str = "test123") -> str:
    response = client.post(
        "/api/v1/auth/token",
        data={"username": username, "password": password},
    )
    return response.json()["access_token"]
