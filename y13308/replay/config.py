"""配置加载模块"""

import yaml
import os
from typing import Dict, List


def load_config(config_path: str = "config.yaml") -> Dict:
    """加载配置文件"""
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"配置文件不存在: {config_path}")
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def get_field_aliases(config: Dict, field_type: str) -> List[str]:
    """获取指定字段的别名列表"""
    key = f"{field_type}_field_aliases"
    return config.get(key, [])
