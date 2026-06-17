from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

import yaml


@dataclass
class StorageConfig:
    backend: str = "filesystem"
    data_dir: str = "./data"


@dataclass
class SafetyRulesConfig:
    require_train_val_split: bool = True
    max_leak_ratio: float = 0.001
    min_val_size: int = 50
    forbid_user_cross: bool = True


@dataclass
class ReviewConfig:
    include_safety_rules: bool = True
    include_model_logs: bool = True
    include_tool_params: bool = True


@dataclass
class ExportConfig:
    formats: list[str] = field(default_factory=lambda: ["csv", "json", "markdown"])
    sync_summary_with_file: bool = True


@dataclass
class SeedBenchConfig:
    default_seed: int = 42
    hash_algorithm: str = "xxhash64"
    storage: StorageConfig = field(default_factory=StorageConfig)
    safety_rules: SafetyRulesConfig = field(default_factory=SafetyRulesConfig)
    review: ReviewConfig = field(default_factory=ReviewConfig)
    export: ExportConfig = field(default_factory=ExportConfig)

    @classmethod
    def load(cls, config_path: Optional[str | Path] = None) -> "SeedBenchConfig":
        path = Path(config_path) if config_path else Path.cwd() / "config.yaml"
        if not path.exists():
            return cls()
        with open(path, "r", encoding="utf-8") as f:
            raw = yaml.safe_load(f) or {}
        data = raw.get("seed_bench", {})
        return cls(
            default_seed=data.get("default_seed", 42),
            hash_algorithm=data.get("hash_algorithm", "xxhash64"),
            storage=StorageConfig(**data.get("storage", {})),
            safety_rules=SafetyRulesConfig(**data.get("safety_rules", {})),
            review=ReviewConfig(**data.get("review", {})),
            export=ExportConfig(**data.get("export", {})),
        )
