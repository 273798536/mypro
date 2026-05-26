from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    
    DATABASE_URL: str = "sqlite:///./warehouse_ledger.db"
    
    SENSITIVE_FIELDS: List[str] = [
        "拣货员", "复核员", "绩效影响", "库存影响", "处理意见", "创建人"
    ]
    
    EXPORT_COLUMN_TO_FIELD_MAP: dict = {
        "拣货员": "picker_name",
        "复核员": "reviewer_name",
        "绩效影响": "performance_impact",
        "库存影响": "inventory_impact",
        "处理意见": "handle_opinion",
        "创建人": "created_by"
    }
    
    class Config:
        case_sensitive = True


settings = Settings()
