try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./tender_queue.db"
    MAX_RETRY_TIMES: int = 3
    RETRY_INTERVAL_SECONDS: int = 60
    QUEUE_WORKER_INTERVAL: int = 10
    
    class Config:
        env_file = ".env"

settings = Settings()
