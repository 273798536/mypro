import os
from pathlib import Path

class Config:
    BASE_DIR = Path(__file__).parent.parent.parent
    
    DATA_DIR = BASE_DIR / "data"
    SAMPLE_DATA_DIR = DATA_DIR / "sample"
    TEST_DATA_DIR = DATA_DIR / "test"
    OUTPUT_DIR = BASE_DIR / "output"
    REPORTS_DIR = BASE_DIR / "reports"
    LOGS_DIR = BASE_DIR / "logs"
    
    REQUIRED_COLUMNS = [
        "zone",
        "segment_id",
        "slope_angle",
        "temperature",
        "surface_type"
    ]
    
    OPTIONAL_COLUMNS = [
        "friction_coeff",
        "accident_point",
        "accident_count",
        "snow_quality",
        "weather_condition",
        "timestamp"
    ]
    
    FRICTION_THRESHOLD_LOW = 0.03
    FRICTION_THRESHOLD_HIGH = 0.15
    
    TEMPERATURE_CHANGE_THRESHOLD = 5.0
    
    SPEED_FACTOR = 1.5
    
    RISK_LEVELS = {
        "LOW": {"color": "green", "max_speed": 30},
        "MEDIUM": {"color": "yellow", "max_speed": 50},
        "HIGH": {"color": "orange", "max_speed": 70},
        "CRITICAL": {"color": "red", "max_speed": 100}
    }
    
    @classmethod
    def ensure_dirs(cls):
        for dir_path in [
            cls.DATA_DIR, cls.SAMPLE_DATA_DIR, cls.TEST_DATA_DIR,
            cls.OUTPUT_DIR, cls.REPORTS_DIR, cls.LOGS_DIR
        ]:
            dir_path.mkdir(parents=True, exist_ok=True)
