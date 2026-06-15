import os
import json
from pathlib import Path
from typing import Dict, Any

BASE_DIR = Path(__file__).resolve().parent.parent

DEFAULT_CONFIG: Dict[str, Any] = {
    "data_dir": str(BASE_DIR / "data"),
    "input_dir": str(BASE_DIR / "data" / "input"),
    "output_dir": str(BASE_DIR / "data" / "output"),
    "sample_dir": str(BASE_DIR / "data" / "samples"),
    "export_dir": str(BASE_DIR / "exports"),
    "state_file": str(BASE_DIR / "data" / "output" / "booth_state.json"),
    "timing_offset_warning_ms": 50,
    "timing_offset_critical_ms": 500,
    "anomaly_keywords": {
        "authorization_hidden": ["备注", "说明", "附", "注", "详见"],
        "timing_offset": ["偏", "差", "delay", "offset", "时码"],
        "incomplete": ["待补", "未齐", "不全", "后续", "等凑齐", "分批次"]
    },
    "status_priority": [
        "待补证据",
        "版本冲突",
        "待复核",
        "处理中",
        "待处理",
        "已驳回",
        "已通过"
    ]
}


class Config:
    def __init__(self, config_path: str = None):
        self._config = DEFAULT_CONFIG.copy()
        if config_path and os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                user_cfg = json.load(f)
                self._config.update(user_cfg)
        self._ensure_dirs()

    def _ensure_dirs(self):
        for key in ["data_dir", "input_dir", "output_dir", "sample_dir", "export_dir"]:
            os.makedirs(self._config[key], exist_ok=True)

    def get(self, key: str, default: Any = None) -> Any:
        return self._config.get(key, default)

    def __getitem__(self, key: str) -> Any:
        return self._config[key]
