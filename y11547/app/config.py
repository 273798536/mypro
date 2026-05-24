from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./exhibition_material.db"
    MAX_RETRY_COUNT: int = 3
    RETRY_INTERVAL_MINUTES: int = 60
    API_V1_STR: str = "/api/v1"

    class Config:
        env_file = ".env"


settings = Settings()
