from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "代码审查误判回放系统"
    APP_VERSION: str = "1.0.0"
    
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/review_replay"
    
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    
    class Config:
        env_file = ".env"


settings = Settings()
