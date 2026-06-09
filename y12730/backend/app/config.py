import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "KKT 条件练习台"
    DATABASE_URL: str = "sqlite:///./kkt_platform.db"
    UPLOAD_DIR: str = "./uploads"
    EXPORT_DIR: str = "./exports"
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024
    ERROR_THRESHOLD_WARN: float = 0.05
    ERROR_THRESHOLD_CRITICAL: float = 0.15

    class Config:
        env_file = ".env"

settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.EXPORT_DIR, exist_ok=True)
