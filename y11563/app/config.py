from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./hotel_audit.db"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENV: str = "development"
    EXPORT_DIR: str = "./exports"
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
