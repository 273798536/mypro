import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

APP_NAME = "agri_delivery_inspector"
APP_VERSION = "0.1.0"

DEFAULT_DB_PATH = os.path.join(Path.home(), ".agri-inspect", "inspector.db")

SOURCE_TYPES = ["store_order", "driver_track", "sign_receipt", "second_confirm"]

SOURCE_TYPE_NAMES = {
    "store_order": "门店订单",
    "driver_track": "司机轨迹",
    "sign_receipt": "签收欠条",
    "second_confirm": "二次确认单"
}

CHECK_TYPES = [
    "format",
    "duplicate",
    "cross_validate",
    "amount_consistency",
    "credit_substitute"
]

SEVERITY_LEVELS = ["info", "warning", "error", "critical"]


def get_engine(db_path=None):
    if db_path is None:
        db_path = DEFAULT_DB_PATH
    
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    engine_url = f"sqlite:///{db_path}"
    return create_engine(engine_url, echo=False)


def get_session(engine=None, db_path=None):
    if engine is None:
        engine = get_engine(db_path)
    Session = sessionmaker(bind=engine)
    return Session()
