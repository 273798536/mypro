"""FFT音频峰值分析工具 - 默认配置"""

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RESULTS_DIR = os.path.join(BASE_DIR, "results")
STATE_FILE = os.path.join(BASE_DIR, ".analysis_state.json")

DEFAULT_WINDOW = "hann"
SUPPORTED_WINDOWS = ["hann", "hamming", "blackman", "blackmanharris", "rect", "triang"]

DEFAULT_NFFT = 2048
DEFAULT_NOVERLAP = 512

PEAK_MIN_HEIGHT = 0.01
PEAK_MIN_DISTANCE = 50

SILENCE_THRESHOLD_DB = -60.0

NOISE_BUCKET_RANGES = {
    "sub_bass": (20, 60),
    "bass": (60, 250),
    "low_mid": (250, 500),
    "mid": (500, 2000),
    "high_mid": (2000, 4000),
    "presence": (4000, 6000),
    "brilliance": (6000, 20000),
}

WINDOW_LEAKAGE_RATIO_THRESHOLD = 0.30

REPORT_META = {
    "tool_name": "FFT音频峰值分析工具",
    "tool_version": "1.0.0",
}
