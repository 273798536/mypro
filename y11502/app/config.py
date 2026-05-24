from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "售后备件领用重试补偿队列服务"
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite:///./spare_parts_queue.db"
    MAX_RETRY_COUNT: int = 3
    RETRY_INTERVAL_MINUTES: int = 5
    API_PREFIX: str = "/api/v1"

    class Config:
        env_file = ".env"


settings = Settings()
