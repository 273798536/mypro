from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "线下展会物料异常回执状态机服务"
    APP_VERSION: str = "1.0.0"
    
    DATABASE_URL: str = "sqlite:///./exhibition_material.db"
    
    ASYNC_TASK_MAX_RETRIES: int = 3
    ASYNC_TASK_RETRY_DELAY: int = 60
    
    class Config:
        env_file = ".env"


settings = Settings()
