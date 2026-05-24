from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "仓库退供复核权限追责台账 API"
    
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    
    DATABASE_URL: str = "sqlite:///./warehouse_return.db"
    
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    
    SENSITIVE_FIELDS: List[str] = [
        "supplier_contact",
        "supplier_phone",
        "actual_amount",
        "settlement_amount"
    ]
    
    class Config:
        case_sensitive = True


settings = Settings()
