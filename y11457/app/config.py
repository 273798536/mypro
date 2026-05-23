from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./community_aftersales.db"
    SECRET_KEY: str = "dev-secret-key-change-in-production-12345"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ENVIRONMENT: str = "development"
    MAX_RETRY_COUNT: int = 3
    RETRY_INTERVAL_HOURS: int = 4
    UPLOAD_DIR: str = "./uploads"
    ALLOWED_ORIGINS: List[str] = ["*"]

    class Config:
        env_file = ".env"


settings = Settings()
