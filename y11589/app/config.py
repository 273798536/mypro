from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "法务合同履约权限追责台账API"
    VERSION: str = "1.0.0"
    DATABASE_URL: str = "sqlite:///./contract_ledger.db"
    UPLOAD_DIR: str = "./uploads"
    EXPORT_DIR: str = "./exports"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    SENSITIVE_FIELDS: list = ["amount", "bank_account", "id_card", "phone", "email"]

    class Config:
        env_file = ".env"


settings = Settings()
