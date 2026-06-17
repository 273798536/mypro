"""全局配置。"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class AppConfig:
    """应用配置。"""

    data_dir: Path = Path("./data")
    history_file: str = "evaluation_history.json"
    default_operator: str = "algorithm_oncall"

    @classmethod
    def load(cls, config_path: Optional[Path] = None) -> "AppConfig":
        return cls()
