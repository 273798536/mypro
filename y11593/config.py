import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./warehouse.db")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
EXPORT_DIR = BASE_DIR / os.getenv("EXPORT_DIR", "exports")
IMPORT_DIR = BASE_DIR / os.getenv("IMPORT_DIR", "imports")
LOG_DIR = BASE_DIR / os.getenv("LOG_DIR", "logs")

EXPORT_DIR.mkdir(exist_ok=True)
IMPORT_DIR.mkdir(exist_ok=True)
LOG_DIR.mkdir(exist_ok=True)
