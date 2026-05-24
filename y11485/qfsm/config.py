from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./quality_fsm.db"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = False
    ASYNC_TASK_MAX_RETRIES: int = 3
    ASYNC_TASK_RETRY_DELAY: int = 60
    EXPORT_DIR: Path = Path("./exports")

    class Config:
        env_file = ".env"


settings = Settings()
