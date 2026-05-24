from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./agri_delivery.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Status:
    PENDING_IMPORT = "pending_import"
    IMPORTED = "imported"
    ABNORMAL_DETECTED = "abnormal_detected"
    ABNORMAL_CONFIRMED = "abnormal_confirmed"
    REVIEWING = "reviewing"
    VERIFIED = "verified"
    FROZEN = "frozen"
    SETTLED = "settled"
    ARCHIVED = "archived"
    REVOKED = "revoked"

STATUS_TRANSITIONS = {
    Status.PENDING_IMPORT: [Status.IMPORTED, Status.REVOKED],
    Status.IMPORTED: [Status.ABNORMAL_DETECTED, Status.REVOKED],
    Status.ABNORMAL_DETECTED: [Status.ABNORMAL_CONFIRMED, Status.REVIEWING, Status.REVOKED],
    Status.ABNORMAL_CONFIRMED: [Status.REVIEWING, Status.FROZEN, Status.REVOKED],
    Status.REVIEWING: [Status.VERIFIED, Status.ABNORMAL_CONFIRMED, Status.REVOKED],
    Status.VERIFIED: [Status.FROZEN, Status.REVOKED],
    Status.FROZEN: [Status.SETTLED, Status.ARCHIVED, Status.REVOKED],
    Status.SETTLED: [Status.ARCHIVED],
    Status.ARCHIVED: [],
    Status.REVOKED: [Status.PENDING_IMPORT, Status.IMPORTED]
}

ABNORMAL_TYPES = [
    "near_expiry",
    "wrong_damaged",
    "out_of_stock_substitute",
    "credit_sale",
    "returned_goods",
    "signature_mismatch",
    "quantity_mismatch",
    "other"
]

ROLES = {
    "driver": ["import"],
    "store_manager": ["confirm", "attach"],
    "area_manager": ["review", "freeze", "unfreeze"],
    "finance": ["settle", "export"],
    "admin": ["revoke", "archive"]
}
