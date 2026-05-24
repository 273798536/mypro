import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Config:
    DB_PATH = os.getenv("BID_DB_PATH", "./bid_inspect.db")
    DATA_DIR = Path(os.getenv("BID_DATA_DIR", "./data"))
    EXPORT_DIR = Path(os.getenv("BID_EXPORT_DIR", "./exports"))
    ALLOWED_USERS = os.getenv("BID_ALLOWED_USERS", "admin,operator,viewer").split(",")

    DB_URL = f"sqlite:///{os.path.abspath(DB_PATH)}"

    @classmethod
    def ensure_dirs(cls):
        cls.DATA_DIR.mkdir(parents=True, exist_ok=True)
        cls.EXPORT_DIR.mkdir(parents=True, exist_ok=True)
