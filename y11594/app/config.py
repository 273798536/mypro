from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    
    DATABASE_URL: str = "sqlite:///./warehouse_ledger.db"
    
    SENSITIVE_FIELDS: List[str] = [
        "user_phone", "user_id_card", "actual_amount", "cost_price"
    ]
    
    class Config:
        case_sensitive = True


settings = Settings()
