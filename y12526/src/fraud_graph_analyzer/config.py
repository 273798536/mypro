"""配置管理模块"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Dict


@dataclass
class GraphConfig:
    """图遍历配置"""
    
    max_path_length: int = 5
    max_community_size: int = 50
    min_community_size: int = 2
    address_edge_staleness_days: int = 3
    device_share_threshold: int = 3
    long_relation_threshold: int = 4


@dataclass
class RiskTagConfig:
    """风险标签配置"""
    
    tag_version: str = "v1.0"
    high_risk_tags: List[str] = field(default_factory=lambda: [
        "fraud_confirmed",
        "money_laundering",
        "synthetic_identity"
    ])
    medium_risk_tags: List[str] = field(default_factory=lambda: [
        "suspicious_activity",
        "device_sharing",
        "address_anomaly"
    ])


@dataclass
class Config:
    """全局配置"""
    
    base_dir: Path = field(default_factory=lambda: Path.cwd())
    data_dir: Path = field(default_factory=lambda: Path.cwd() / "data")
    output_dir: Path = field(default_factory=lambda: Path.cwd() / "output")
    
    graph: GraphConfig = field(default_factory=GraphConfig)
    risk_tags: RiskTagConfig = field(default_factory=RiskTagConfig)
    
    def __post_init__(self):
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        (self.output_dir / "graphs").mkdir(parents=True, exist_ok=True)
        (self.output_dir / "reports").mkdir(parents=True, exist_ok=True)


_default_config = None


def get_config() -> Config:
    """获取全局配置"""
    global _default_config
    if _default_config is None:
        _default_config = Config()
    return _default_config
