from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "customs-clearance-statemachine"
    DEBUG: bool = False

    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    LOG_DIR: Path = BASE_DIR / "logs"

    DATABASE_URL: str = f"sqlite:///{DATA_DIR}/customs.db"

    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    MAX_RETRY_COUNT: int = 3
    RETRY_DELAY_SECONDS: int = 60

    def ensure_dirs(self) -> None:
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.LOG_DIR.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_dirs()
