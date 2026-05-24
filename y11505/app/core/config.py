from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    APP_NAME: str = "医疗器械巡检异常回执状态机"
    DEBUG: bool = False
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/medical_device_fsm.db"
    
    UPLOAD_DIR: Path = BASE_DIR / "app" / "uploads"
    EXPORT_DIR: Path = BASE_DIR / "exports"
    
    MAX_RETRY_COUNT: int = 3
    RETRY_DELAY_SECONDS: int = 60
    
    class Config:
        env_file = ".env"


settings = Settings()

settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.EXPORT_DIR.mkdir(parents=True, exist_ok=True)
