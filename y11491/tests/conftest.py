import os
import tempfile
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from bid_inspect.database import Base, get_db
from bid_inspect.models import CheckRule


@pytest.fixture
def test_db():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)

    engine = create_engine(f"sqlite:///{path}", echo=False)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db = TestingSessionLocal()

    rules = [
        CheckRule(rule_code="QUAL_VALIDITY", rule_name="资质有效期检查", rule_type="qualification", is_enabled=True),
        CheckRule(rule_code="PRICE_AMOUNT", rule_name="报价金额检查", rule_type="price", is_enabled=True),
        CheckRule(rule_code="SCAN_PAGE", rule_name="扫描件页码检查", rule_type="scan", is_enabled=True),
        CheckRule(rule_code="SUPPLIER_NAME", rule_name="供应商名称检查", rule_type="general", is_enabled=True),
    ]
    db.add_all(rules)
    db.commit()

    yield db

    db.close()
    os.unlink(path)


@pytest.fixture
def temp_csv_file():
    def _create_file(content):
        fd, path = tempfile.mkstemp(suffix=".csv")
        os.write(fd, content.encode("utf-8"))
        os.close(fd)
        return path
    return _create_file


@pytest.fixture
def temp_excel_file():
    import pandas as pd

    def _create_file(df, sheet_name="Sheet1", filename=None):
        if filename:
            path = os.path.join(tempfile.gettempdir(), filename)
        else:
            fd, path = tempfile.mkstemp(suffix=".xlsx")
            os.close(fd)
        df.to_excel(path, sheet_name=sheet_name, index=False)
        return path
    return _create_file
