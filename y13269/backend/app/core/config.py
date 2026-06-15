from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    APP_NAME: str = "社区充电公示清单系统"
    VERSION: str = "1.0.0"

    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    EXPORT_DIR: Path = BASE_DIR / "exports"

    AMAP_KEY: str = ""
    BAIDU_MAP_KEY: str = ""
    MAP_PROVIDER: str = "mock"

    COORD_DISTANCE_THRESHOLD: float = 150.0
    SAME_INTERSECTION_THRESHOLD: float = 80.0

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.EXPORT_DIR.mkdir(parents=True, exist_ok=True)
