from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./spring_damper.db"
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "弹簧阻尼实验台"
    
    class Config:
        case_sensitive = True


settings = Settings()
