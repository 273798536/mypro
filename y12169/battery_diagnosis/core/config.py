import os
from pathlib import Path


BASE_DIR = Path(__file__).parent.parent.parent.absolute()

DATA_DIR = BASE_DIR / "battery_diagnosis" / "data"
EXPORTS_DIR = BASE_DIR / "battery_diagnosis" / "exports"


def get_db_path() -> Path:
    env_db = os.environ.get("DB_PATH")
    if env_db:
        return Path(env_db)
    return DATA_DIR / "diagnosis.db"


DB_PATH = get_db_path()

TEMP_THRESHOLD_LOW = 0.0
TEMP_THRESHOLD_VERY_LOW = -10.0

FAST_CHARGE_THRESHOLD_WEEK = 3
FAST_CHARGE_RATIO_THRESHOLD = 0.5

TRIP_SPEED_LOW_THRESHOLD = 10.0
TRIP_SPEED_HIGH_THRESHOLD = 100.0
TRIP_DISTANCE_MIN_THRESHOLD = 1.0
TRIP_CONSUMPTION_HIGH_THRESHOLD = 25.0
TRIP_CONSUMPTION_LOW_THRESHOLD = 10.0

BASE_CONSUMPTION_KWH_100KM = 15.0

TEMP_EFFECT_COEFFICIENT = 0.005
FAST_CHARGE_EFFECT_COEFFICIENT = 0.02
DRIVING_SPEED_EFFECT_COEFFICIENT = 0.001
ELEVATION_EFFECT_COEFFICIENT = 0.00015

RANGE_ESTIMATE_METHODS = [
    "weighted_moving_average",
    "physics_based",
    "machine_learning"
]

DEFAULT_ESTIMATE_METHOD = "weighted_moving_average"

MIN_TRIPS_FOR_RELIABLE_ESTIMATE = 5

for path in [DATA_DIR, EXPORTS_DIR]:
    os.makedirs(path, exist_ok=True)
