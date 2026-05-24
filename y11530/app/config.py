from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "银行网点排班异常回执状态机服务"
    
    DATABASE_URL: str = "sqlite:///./scheduling_exception.db"
    
    MAX_BATCH_SIZE: int = 1000
    EXPORT_DIR: str = "./exports"
    
    class Config:
        case_sensitive = True


settings = Settings()
