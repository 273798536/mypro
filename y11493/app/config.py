from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "投标资料封版验收回放链路服务"
    
    BASE_DIR: Path = Path(__file__).parent.parent
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/data/bid_system.db"
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    EXPORT_DIR: Path = BASE_DIR / "exports"
    ARCHIVE_DIR: Path = BASE_DIR / "archives"
    
    MAX_RETRY_COUNT: int = 3
    RETRY_INTERVAL_MINUTES: int = 5
    
    ADMIN_TOKEN: str = "admin-token-bid-2024"
    READ_TOKEN: str = "read-token-bid-2024"
    
    class Config:
        env_file = ".env"


settings = Settings()

for directory in [settings.UPLOAD_DIR, settings.EXPORT_DIR, settings.ARCHIVE_DIR, settings.BASE_DIR / "data"]:
    directory.mkdir(parents=True, exist_ok=True)
