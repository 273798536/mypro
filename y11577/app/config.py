from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "外协加工对账重试补偿队列系统"
    
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/outsource_settlement"
    
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    
    MAX_RETRIES: int = 3
    RETRY_DELAY_MINUTES: int = 5
    
    class Config:
        case_sensitive = True


settings = Settings()
