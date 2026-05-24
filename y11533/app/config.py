import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "银行网点排班验收回放链路服务"
    DEBUG: bool = True
    
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/bank_scheduling.db"
    
    DATA_DIR: str = os.path.join(BASE_DIR, "data")
    EXPORTS_DIR: str = os.path.join(BASE_DIR, "exports")
    UPLOADS_DIR: str = os.path.join(BASE_DIR, "uploads")
    
    MAX_RETRY_COUNT: int = 3
    RETRY_DELAY_SECONDS: int = 60
    
    ADMIN_ROLES: list = ["branch_manager", "admin"]
    OPERATOR_ROLES: list = ["teller_supervisor", "operator"]
    
    class Config:
        env_file = ".env"

settings = Settings()

os.makedirs(settings.DATA_DIR, exist_ok=True)
os.makedirs(settings.EXPORTS_DIR, exist_ok=True)
os.makedirs(settings.UPLOADS_DIR, exist_ok=True)
