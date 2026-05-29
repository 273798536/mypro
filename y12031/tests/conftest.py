import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import (
    FarmerProfile,
    QualityGrade,
    DeliveryTicket,
    FloorPriceAgreement,
    SettlementRecord,
    SettlementChangeLog,
)


TEST_DB_URL = "sqlite:///./test_settlement.db"


@pytest.fixture(scope="function")
def db():
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestSession()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
        if os.path.exists("test_settlement.db"):
            os.remove("test_settlement.db")
