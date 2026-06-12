from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "sqlite:///./segmented_regression.db"
    APP_NAME: str = "分段回归参数试算系统"
    DEBUG: bool = True


settings = Settings()
