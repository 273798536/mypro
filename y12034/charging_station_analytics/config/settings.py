"""
全局配置管理
"""
import os
import yaml
from pathlib import Path
from typing import Dict, Any, Optional

BASE_DIR = Path(__file__).resolve().parent.parent.parent
CONFIG_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "output"
EXAMPLES_DIR = BASE_DIR / "examples"
UPLOAD_DIR = BASE_DIR / "uploads"


class Config:
    _instance = None
    _tariff_config: Optional[Dict[str, Any]] = None
    _columns_config: Optional[Dict[str, Any]] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._load_configs()
        return cls._instance

    def _load_configs(self):
        tariff_path = CONFIG_DIR / "tariff_config.yaml"
        columns_path = CONFIG_DIR / "columns_config.yaml"

        with open(tariff_path, "r", encoding="utf-8") as f:
            self._tariff_config = yaml.safe_load(f)

        with open(columns_path, "r", encoding="utf-8") as f:
            self._columns_config = yaml.safe_load(f)

    @property
    def tariff(self) -> Dict[str, Any]:
        return self._tariff_config.get("tariff_config", {})

    @property
    def periods(self) -> Dict[str, Any]:
        return self.tariff.get("periods", {})

    @property
    def columns(self) -> Dict[str, Any]:
        return self._columns_config.get("columns", {})

    @property
    def required_columns(self) -> list:
        return self.columns.get("required", [])

    @property
    def optional_columns(self) -> list:
        return self.columns.get("optional", [])

    def get_period_price(self, period_key: str) -> float:
        return self.periods.get(period_key, {}).get("price", 0.0)

    def get_period_name(self, period_key: str) -> str:
        return self.periods.get(period_key, {}).get("name", period_key)

    def get_default_service_fee(self) -> float:
        return self.tariff.get("service_fee", {}).get("default_rate", 0.60)

    def get_rounding_precision(self) -> int:
        return self.tariff.get("rounding", {}).get("precision", 2)


def get_config() -> Config:
    return Config()
