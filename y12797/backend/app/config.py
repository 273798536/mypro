from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    APP_NAME: str = "酶促反应底物换算系统"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    UPLOAD_DIR: Path = DATA_DIR / "uploads"
    EXPORT_DIR: Path = DATA_DIR / "exports"
    DB_PATH: Path = DATA_DIR / "enzyme_conversion.db"

    DATABASE_URL: str = f"sqlite:///{DB_PATH}"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
    )

    def ensure_dirs(self):
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        self.EXPORT_DIR.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_dirs()
