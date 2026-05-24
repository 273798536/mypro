import os
from pathlib import Path
from typing import Dict, Any
import yaml


DEFAULT_CONFIG = {
    "data_sources": {
        "dispatch_order": {
            "required_columns": ["order_no", "repair_date", "site", "material_list", "quantity"],
            "date_format": "%Y-%m-%d",
            "encoding": "utf-8"
        },
        "valve_inventory": {
            "required_columns": ["valve_code", "valve_name", "inventory_date", "quantity", "unit"],
            "date_format": "%Y-%m-%d",
            "encoding": "utf-8"
        },
        "site_photo": {
            "required_columns": ["order_no", "photo_sequence", "photo_path", "shoot_time", "description"],
            "date_format": "%Y-%m-%d %H:%M:%S",
            "encoding": "utf-8"
        },
        "scan_detail": {
            "required_columns": ["order_no", "material_code", "material_name", "quantity", "scan_time", "operator"],
            "date_format": "%Y-%m-%d %H:%M:%S",
            "encoding": "utf-8"
        }
    },
    "validation": {
        "allow_negative_inventory": False,
        "quantity_precision": 2,
        "max_quantity": 10000
    },
    "reporting": {
        "highlight_thresholds": {
            "negative_inventory": -1,
            "missing_photo": 0,
            "mismatch_rate": 0.1
        }
    }
}


class Config:
    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir)
        self.config_file = self.base_dir / "config.yaml"
        self._config: Dict[str, Any] = {}
        self.load()

    def load(self) -> None:
        if self.config_file.exists():
            with open(self.config_file, 'r', encoding='utf-8') as f:
                self._config = yaml.safe_load(f) or {}
        else:
            self._config = dict(DEFAULT_CONFIG)

    def save(self) -> None:
        self.config_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_file, 'w', encoding='utf-8') as f:
            yaml.dump(self._config, f, allow_unicode=True, default_flow_style=False)

    def get(self, key: str, default: Any = None) -> Any:
        keys = key.split('.')
        value = self._config
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        return value

    def set(self, key: str, value: Any) -> None:
        keys = key.split('.')
        config = self._config
        for k in keys[:-1]:
            if k not in config:
                config[k] = {}
            config = config[k]
        config[keys[-1]] = value

    @property
    def data_sources(self) -> Dict[str, Any]:
        return self.get("data_sources", DEFAULT_CONFIG["data_sources"])

    @property
    def validation(self) -> Dict[str, Any]:
        return self.get("validation", DEFAULT_CONFIG["validation"])

    @property
    def reporting(self) -> Dict[str, Any]:
        return self.get("reporting", DEFAULT_CONFIG["reporting"])
