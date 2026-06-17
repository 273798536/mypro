"""全局配置管理。"""
import os
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Config:
    """运行时配置。"""

    input_dir: str = "./input"
    output_dir: str = "./output"
    db_path: Optional[str] = None
    operator: str = "unknown"
    verbose: bool = False

    def __post_init__(self):
        self.input_dir = os.path.abspath(self.input_dir)
        self.output_dir = os.path.abspath(self.output_dir)
        if self.db_path is None:
            self.db_path = os.path.join(self.output_dir, "replayer.db")
        else:
            self.db_path = os.path.abspath(self.db_path)

    def ensure_dirs(self):
        """确保必要目录存在。"""
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(os.path.join(self.output_dir, "snapshots"), exist_ok=True)
        os.makedirs(os.path.join(self.output_dir, "reports"), exist_ok=True)
        os.makedirs(os.path.join(self.output_dir, "migrations"), exist_ok=True)
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)


_global_config: Optional[Config] = None


def get_config() -> Config:
    """获取全局配置。"""
    global _global_config
    if _global_config is None:
        _global_config = Config()
    return _global_config


def set_config(cfg: Config):
    """设置全局配置。"""
    global _global_config
    _global_config = cfg
