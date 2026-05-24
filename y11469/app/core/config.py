from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./garment_ledger.db"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    ENV: str = "development"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()
