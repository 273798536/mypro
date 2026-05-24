import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/data/replay_service.db")
UPLOAD_DIR = BASE_DIR / "data" / "uploads"
EXPORT_DIR = BASE_DIR / "data" / "exports"
LOG_DIR = BASE_DIR / "data" / "logs"

for directory in [UPLOAD_DIR, EXPORT_DIR, LOG_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", 8000))

MAX_RETRY_TIMES = 3
RETRY_INTERVAL = 60
