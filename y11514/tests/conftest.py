import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.auth import get_password_hash
from app.models import User, UserRole

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    admin = User(
        username="admin",
        full_name="管理员",
        role=UserRole.SUPERVISOR,
        hashed_password=get_password_hash("admin123")
    )
    entry_user = User(
        username="entry",
        full_name="录入员",
        role=UserRole.DATA_ENTRY,
        hashed_password=get_password_hash("123456")
    )
    review_user = User(
        username="review",
        full_name="复核员",
        role=UserRole.REVIEWER,
        hashed_password=get_password_hash("123456")
    )
    readonly_user = User(
        username="readonly",
        full_name="只读用户",
        role=UserRole.READ_ONLY,
        hashed_password=get_password_hash("123456")
    )
    session.add_all([admin, entry_user, review_user, readonly_user])
    session.commit()
    
    yield session
    
    session.close()
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


def get_token(client, username, password):
    response = client.post(
        "/token",
        data={"username": username, "password": password}
    )
    return response.json()["access_token"]
