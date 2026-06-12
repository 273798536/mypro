from pathlib import Path

BASE_DIR = Path(__file__).parent

DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "output"
REPORT_DIR = BASE_DIR / "reports"

for dir_path in [DATA_DIR, OUTPUT_DIR, REPORT_DIR]:
    dir_path.mkdir(exist_ok=True)

ICE_THICKNESS_THRESHOLD = 30.0

NO_SAIL_ZONES = {
    "zone_a": {"lat_min": 38.5, "lat_max": 39.5, "lon_min": 120.0, "lon_max": 121.5},
    "zone_b": {"lat_min": 39.5, "lat_max": 40.5, "lon_min": 121.0, "lon_max": 122.5},
}

TIDE_CORRECTION_FACTOR = 0.85
