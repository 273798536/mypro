import os
import sys
from unittest.mock import MagicMock, patch

os.environ["DATABASE_URL"] = "sqlite:///./test.db"

sys.modules['celery'] = MagicMock()
sys.modules['celery_app'] = MagicMock()

mock_celery = MagicMock()
mock_celery.control = MagicMock()
mock_celery.control.ping = MagicMock(return_value=[])
mock_task = MagicMock()
mock_task.delay = MagicMock()
mock_celery.task = MagicMock(return_value=lambda f: mock_task)
mock_celery.on_after_configure = MagicMock()
mock_celery.on_after_configure.connect = MagicMock()
sys.modules['app.celery_app'] = MagicMock(celery_app=mock_celery)

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function", autouse=True)
def mock_celery():
    with patch('app.api.compensation.process_compensation_task') as mock_task:
        mock_task.delay = MagicMock()
        yield mock_task


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            db_session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
