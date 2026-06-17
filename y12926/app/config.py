import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)

DATA_DIR = os.path.join(PROJECT_ROOT, "data")
EXPORTS_DIR = os.path.join(PROJECT_ROOT, "exports")
SAMPLES_DIR = os.path.join(PROJECT_ROOT, "samples")

DB_PATH = os.path.join(DATA_DIR, "routing_analysis.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(EXPORTS_DIR, exist_ok=True)
os.makedirs(SAMPLES_DIR, exist_ok=True)


class BatchStatus:
    IMPORTED = "imported"
    DEDUPLICATED = "deduplicated"
    ROUTED = "routed"
    REVIEWING = "reviewing"
    REVIEWED = "reviewed"
    APPROVED = "approved"
    REPORTED = "reported"
    ROLLBACK = "rollback"


class QuestionStatus:
    PENDING = "pending"
    DUPLICATE = "duplicate"
    VALID = "valid"
    ROUTED = "routed"
    NEED_REVIEW = "need_review"
    CONFLICT = "conflict"
    APPROVED = "approved"
    ROLLBACK = "rollback"


REVIEW_STATE_FLOW = {
    BatchStatus.IMPORTED: [BatchStatus.DEDUPLICATED, BatchStatus.ROLLBACK],
    BatchStatus.DEDUPLICATED: [BatchStatus.ROUTED, BatchStatus.ROLLBACK],
    BatchStatus.ROUTED: [BatchStatus.REVIEWING, BatchStatus.ROLLBACK],
    BatchStatus.REVIEWING: [BatchStatus.REVIEWED, BatchStatus.ROLLBACK],
    BatchStatus.REVIEWED: [BatchStatus.APPROVED, BatchStatus.REVIEWING, BatchStatus.ROLLBACK],
    BatchStatus.APPROVED: [BatchStatus.REPORTED, BatchStatus.ROLLBACK],
}
