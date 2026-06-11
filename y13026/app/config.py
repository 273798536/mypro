from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    app_name: str = "券商适当性异常回放系统"
    database_url: str = "sqlite:///./appropriateness_playback.db"

    class Config:
        env_file = ".env"


settings = Settings()
