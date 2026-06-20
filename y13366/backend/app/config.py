from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    APP_NAME: str = "召回漏斗版本快照系统"
    DATABASE_URL: str = "sqlite:///./recall_funnel.db"
    SNAPSHOT_DATA_DIR: Path = Path("./snapshot_data")
    TRAINING_LOG_DIR: Path = Path("./training_logs")
    MAX_HISTORY_VERSIONS: int = 100

    class Config:
        env_file = ".env"


settings = Settings()
settings.SNAPSHOT_DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.TRAINING_LOG_DIR.mkdir(parents=True, exist_ok=True)
