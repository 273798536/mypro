from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./block_trade_ledger.db"
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "二级市场大宗交易台账"
    TIMEZONE: str = "Asia/Shanghai"

    class Config:
        case_sensitive = True


settings = Settings()
