from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./contract_fsm.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    UPLOAD_DIR: Path = Path("./uploads")
    EXPORT_DIR: Path = Path("./exports")
    LOG_LEVEL: str = "INFO"
    API_V1_STR: str = "/api/v1"

    class Config:
        env_file = ".env"


settings = Settings()

settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.EXPORT_DIR.mkdir(parents=True, exist_ok=True)
