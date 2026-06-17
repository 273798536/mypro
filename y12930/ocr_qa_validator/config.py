"""配置加载模块"""

import os
import yaml
from pathlib import Path


DEFAULT_CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"


def load_config(config_path: str = None) -> dict:
    """加载 YAML 配置文件

    Args:
        config_path: 配置文件路径，默认使用项目根目录下的 config.yaml

    Returns:
        配置字典
    """
    if config_path is None:
        config_path = DEFAULT_CONFIG_PATH
    else:
        config_path = Path(config_path)

    if not config_path.exists():
        raise FileNotFoundError(f"配置文件不存在: {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    return config


def ensure_dirs(config: dict) -> None:
    """确保所有数据目录存在

    Args:
        config: 配置字典
    """
    paths = config.get("paths", {})
    for key, dir_path in paths.items():
        Path(dir_path).mkdir(parents=True, exist_ok=True)
