import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).parent.resolve()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./spare_part_replay.db")
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads")).resolve()
EXPORT_DIR = Path(os.getenv("EXPORT_DIR", "./exports")).resolve()
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
EXPORT_DIR.mkdir(parents=True, exist_ok=True)

class BatchStatus:
    DRAFT = "draft"
    SUBMITTED = "submitted"
    PARTIAL_FAILED = "partial_failed"
    WITHDRAWN = "withdrawn"
    FROZEN = "frozen"
    REVISED = "revised"
    APPROVED = "approved"
    REJECTED = "rejected"

    ALL_STATUSES = [DRAFT, SUBMITTED, PARTIAL_FAILED, WITHDRAWN, FROZEN, REVISED, APPROVED, REJECTED]
    CAN_SUBMIT = [DRAFT, WITHDRAWN, PARTIAL_FAILED, REVISED]
    CAN_WITHDRAW = [SUBMITTED, PARTIAL_FAILED]
    CAN_FREEZE = [SUBMITTED, PARTIAL_FAILED, APPROVED]
    CAN_REVISE = [WITHDRAWN, REJECTED]
    CAN_EXPORT = [FROZEN, APPROVED]

class PhotoType:
    RECEIPT = "receipt"
    ABNORMAL = "abnormal"
    SMS = "sms"

class PartStatus:
    NORMAL = "normal"
    RETURNED = "returned"
    SCRAPPED = "scrapped"
    PENDING = "pending"

class DuplicateStrategy:
    IGNORE = "ignore"
    OVERWRITE = "overwrite"
    APPEND = "append"
