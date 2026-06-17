from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
SAMPLES_FILE = DATA_DIR / "samples.json"
RULES_FILE = DATA_DIR / "rules.json"
QUEUE_FILE = DATA_DIR / "queue_state.json"
REPLAY_LOG = DATA_DIR / "replay_log.json"
EXPORT_DIR = BASE_DIR / "exports"

MAX_TEXT_LENGTH = 500
GRAYSCALE_PASS_THRESHOLD = 0.7
GRAYSCALE_REVIEW_THRESHOLD = 0.4

SAMPLE_STATUS = {
    "PENDING": "pending",
    "PASSED": "passed",
    "REVIEW": "needs_review",
    "REJECTED": "rejected",
    "CONFIRMED": "confirmed",
}
