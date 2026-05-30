from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    APP_NAME: str = "热泵换热效率台"
    APP_VERSION: str = "1.0.0"
    DATABASE_URL: str = f"sqlite:///{Path(__file__).parent.parent}/heatpump.db"
    WATER_SPECIFIC_HEAT: float = 4.186
    UNIT_CONVERSION: float = 860.0
    FLOW_MISSING_THRESHOLD: float = 0.0
    TEMP_SENSOR_ERROR_THRESHOLD: float = 5.0
    DEFROST_CYCLE_MIN_TEMP: float = 2.0
    DEFROST_CYCLE_MAX_TEMP: float = 15.0

    class Config:
        env_file = ".env"


settings = Settings()
