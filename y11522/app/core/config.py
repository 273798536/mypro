from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./compensation_queue.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "家电安装回访重试补偿队列服务"
    MAX_RETRY_TIMES: int = 3
    RETRY_INTERVAL_MINUTES: int = 30

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
