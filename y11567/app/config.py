import os
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "lighting_repair.db"
EXPORT_DIR = DATA_DIR / "exports"

MAX_RETRY_COUNT = 3
RETRY_INTERVAL_MINUTES = 30

for directory in [DATA_DIR, EXPORT_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

DATABASE_URL = f"sqlite:///{DB_PATH}"
