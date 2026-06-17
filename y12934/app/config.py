from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./data/copyright_ledger.db"
    DATA_DIR: Path = Path("./data")
    EXPORT_DIR: Path = Path("./data/exports")

    class Config:
        env_file = ".env"


settings = Settings()
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.EXPORT_DIR.mkdir(parents=True, exist_ok=True)
