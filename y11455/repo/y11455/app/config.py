from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "社区团购售后异常回执状态机"
    
    DATABASE_URL: str = "sqlite:///./after_sale.db"
    
    UPLOAD_DIR: Path = Path("./uploads")
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024
    
    class Config:
        case_sensitive = True


settings = Settings()
