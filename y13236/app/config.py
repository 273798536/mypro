from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./piano_schedule.db"
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "琴房课时排期冲突检测系统"

    class Config:
        env_file = ".env"


settings = Settings()
