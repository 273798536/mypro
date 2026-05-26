import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/carbon_clearing.db")

CROSS_MONTH_THRESHOLD_DAYS = 3

RED_FLUSH_KEYWORDS = ["红冲", "红字", "冲销", "冲正"]

ANOMALY_SEVERITY_LEVELS = {"critical", "warning", "info"}

IMPORT_BATCH_PREFIX = "BATCH"