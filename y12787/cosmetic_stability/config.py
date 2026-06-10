"""
配置管理
"""
import json
import os
from pathlib import Path
from typing import Dict, Any


DEFAULT_CONFIG = {
    "stability": {
        "content_degradation_threshold": 5.0,
        "ph_variation_threshold": 1.0,
        "microbial_limit": 100,
        "expiry_criteria": "含量下降不超过5%",
        "calculation_method": "线性回归法",
        "standard_time_points": ["0月", "1月", "3月", "6月", "12月", "24月"]
    },
    "anomaly_detection": {
        "max_time_deviation_hours": 24,
        "required_units": ["mg/g", "pH", "CFU/g", "%", "°C", "mPa·s", "g/cm³"],
        "value_range_check": True
    },
    "export": {
        "format": "html",
        "include_charts": True,
        "anomaly_report_first": True,
        "explain_terms": True
    },
    "paths": {
        "input_dir": "./data/input",
        "output_dir": "./data/output",
        "work_dir": "./data/work"
    }
}


class Config:
    def __init__(self, work_dir: str = None):
        self.work_dir = Path(work_dir or os.getcwd())
        self.config_file = self.work_dir / ".stability_config.json"
        self._data: Dict[str, Any] = {}
        self.load()

    def load(self):
        if self.config_file.exists():
            with open(self.config_file, "r", encoding="utf-8") as f:
                self._data = json.load(f)
        else:
            self._data = json.loads(json.dumps(DEFAULT_CONFIG))

    def save(self):
        self.config_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_file, "w", encoding="utf-8") as f:
            json.dump(self._data, f, ensure_ascii=False, indent=2)

    def get(self, key: str, default: Any = None) -> Any:
        keys = key.split(".")
        value = self._data
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        return value

    def set(self, key: str, value: Any):
        keys = key.split(".")
        data = self._data
        for k in keys[:-1]:
            if k not in data:
                data[k] = {}
            data = data[k]
        data[keys[-1]] = value
