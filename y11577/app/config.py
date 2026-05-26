import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "外协加工对账重试补偿队列系统"
    
    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL",
        "sqlite:///./outsource_settlement.db"
    )
    
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    
    MAX_RETRIES: int = 3
    RETRY_DELAY_MINUTES: int = 5
    
    QUEUE_WORKER_ENABLED: bool = os.environ.get("QUEUE_WORKER_ENABLED", "true").lower() == "true"
    QUEUE_WORKER_INTERVAL_SECONDS: int = int(os.environ.get("QUEUE_WORKER_INTERVAL_SECONDS", "30"))
    
    class Config:
        case_sensitive = True


settings = Settings()
