from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./water_repair.db"
    APP_NAME: str = "水务抢修材料权限追责台账服务"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    SECRET_KEY: str = "your-secret-key-here"
    ASYNC_TASK_MAX_RETRIES: int = 3
    ASYNC_TASK_RETRY_INTERVAL: int = 60

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()
