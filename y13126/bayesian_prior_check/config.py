from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Optional

import yaml


@dataclass
class BoundaryRule:
    min: Optional[float] = None
    max: Optional[float] = None
    min_inclusive: bool = True
    max_inclusive: bool = True
    description: str = ""

    def check(self, value: float) -> tuple[bool, Optional[str]]:
        if self.min is not None:
            if self.min_inclusive:
                if value < self.min:
                    return False, f"值 {value} 小于最小值 {self.min}（规则：{self.description}）"
            else:
                if value <= self.min:
                    return False, f"值 {value} 小于等于最小值 {self.min}（规则：{self.description}）"
        if self.max is not None:
            if self.max_inclusive:
                if value > self.max:
                    return False, f"值 {value} 大于最大值 {self.max}（规则：{self.description}）"
            else:
                if value >= self.max:
                    return False, f"值 {value} 大于等于最大值 {self.max}（规则：{self.description}）"
        return True, None


@dataclass
class BoundaryConfig:
    probability: BoundaryRule = field(default_factory=BoundaryRule)
    conjugate_priors: dict[str, dict[str, BoundaryRule]] = field(default_factory=dict)
    division_zero_tracking: dict[str, Any] = field(default_factory=dict)


def _dict_to_rule(data: dict[str, Any]) -> BoundaryRule:
    return BoundaryRule(
        min=data.get("min"),
        max=data.get("max"),
        min_inclusive=data.get("min_inclusive", True),
        max_inclusive=data.get("max_inclusive", True),
        description=data.get("description", ""),
    )


def load_boundaries(config_path: Optional[str] = None) -> BoundaryConfig:
    if config_path is None:
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "config",
            "boundaries.yaml",
        )

    with open(config_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    cfg = BoundaryConfig()

    default_prob = data.get("default_boundaries", {}).get("probability", {})
    cfg.probability = _dict_to_rule(default_prob)

    for dist_name, params in data.get("conjugate_priors", {}).items():
        cfg.conjugate_priors[dist_name] = {}
        for param_name, rule_data in params.items():
            cfg.conjugate_priors[dist_name][param_name] = _dict_to_rule(rule_data)

    cfg.division_zero_tracking = data.get("division_zero_tracking", {})

    return cfg
