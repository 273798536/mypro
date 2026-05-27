import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATABASE_URL = os.environ.get(
    "FREEZE_DB_URL", f"sqlite:///{os.path.join(BASE_DIR, 'freeze_data.db')}"
)

DATA_DIR = os.path.join(BASE_DIR, "data")
EXPORT_DIR = os.path.join(BASE_DIR, "exports")
IMPORT_DIR = os.path.join(BASE_DIR, "imports")

for d in [DATA_DIR, EXPORT_DIR, IMPORT_DIR]:
    os.makedirs(d, exist_ok=True)

FREEZE_STATUS_FLOW = {
    "frozen": ["appealing", "partially_unfrozen", "unfrozen"],
    "appealing": ["appeal_approved", "appeal_rejected", "partially_unfrozen"],
    "appeal_approved": ["partially_unfrozen", "unfrozen"],
    "appeal_rejected": ["frozen"],
    "partially_unfrozen": ["partially_unfrozen", "unfrozen"],
    "unfrozen": [],
}

APPEAL_STATUS_FLOW = {
    "pending": ["processing", "rejected"],
    "processing": ["approved", "rejected", "partial_approved"],
    "approved": [],
    "rejected": [],
    "partial_approved": [],
}

RISK_THRESHOLDS = {
    "freeze_expansion_ratio": 1.5,
    "balance_mismatch_threshold": 0.01,
    "multiple_unfreeze_days": 1,
}
