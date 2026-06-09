import numpy as np
import pandas as pd
from typing import Dict, Tuple, Optional, List
from dataclasses import dataclass
from datetime import datetime


@dataclass
class VaRResult:
    var_value: float
    var_lower: float
    var_upper: float
    is_extrapolation: bool
    extrapolation_bounds_breached: bool
    sample_size: int
    method: str
    details: Dict


class HistoricalVaRCalculator:
    def __init__(
        self,
        quantile: float = 0.95,
        window: int = 252,
        min_samples: int = 30,
        extrapolation_penalty: float = 1.5,
        extrapolation_max_ratio: float = 2.0,
    ):
        self.quantile = quantile
        self.window = window
        self.min_samples = min_samples
        self.extrapolation_penalty = extrapolation_penalty
        self.extrapolation_max_ratio = extrapolation_max_ratio

    def _validate_returns(self, returns: np.ndarray) -> Tuple[bool, str]:
        if len(returns) < self.min_samples:
            return False, f"样本数不足：仅 {len(returns)} 条，需要至少 {self.min_samples} 条"
        if np.all(returns == 0):
            return False, "所有收益率均为 0，数据异常"
        if np.isnan(returns).sum() > len(returns) * 0.1:
            return False, f"缺失值过多：{np.isnan(returns).sum()} / {len(returns)}"
        return True, ""

    def calculate(
        self,
        returns: np.ndarray,
        historical_var: Optional[float] = None,
    ) -> VaRResult:
        returns = np.asarray(returns, dtype=float)
        returns = returns[~np.isnan(returns)]

        is_extrapolation = len(returns) < self.window
        sample_size = len(returns)

        sorted_returns = np.sort(returns)
        idx = int((1 - self.quantile) * len(sorted_returns))
        idx = max(0, min(idx, len(sorted_returns) - 1))

        var_value = -sorted_returns[idx]

        bootstrap_vars = []
        n_bootstrap = 1000
        rng = np.random.RandomState(42)
        for _ in range(n_bootstrap):
            sample = rng.choice(returns, size=len(returns), replace=True)
            sample_sorted = np.sort(sample)
            bidx = max(0, min(int((1 - self.quantile) * len(sample_sorted)), len(sample_sorted) - 1))
            bootstrap_vars.append(-sample_sorted[bidx])

        var_lower = float(np.percentile(bootstrap_vars, 2.5))
        var_upper = float(np.percentile(bootstrap_vars, 97.5))

        bounds_breached = False
        if is_extrapolation and historical_var is not None:
            extrapolation_ratio = var_value / historical_var if historical_var != 0 else float("inf")
            if extrapolation_ratio > self.extrapolation_max_ratio or extrapolation_ratio < 1 / self.extrapolation_max_ratio:
                bounds_breached = True

        details = {
            "sample_size": sample_size,
            "window": self.window,
            "quantile": self.quantile,
            "is_extrapolation": is_extrapolation,
            "extrapolation_gap": max(0, self.window - sample_size),
            "returns_mean": float(np.mean(returns)),
            "returns_std": float(np.std(returns)),
            "returns_min": float(np.min(returns)),
            "returns_max": float(np.max(returns)),
            "bootstrap_ci_lower": var_lower,
            "bootstrap_ci_upper": var_upper,
        }

        return VaRResult(
            var_value=float(var_value),
            var_lower=var_lower,
            var_upper=var_upper,
            is_extrapolation=is_extrapolation,
            extrapolation_bounds_breached=bounds_breached,
            sample_size=sample_size,
            method="historical_simulation",
            details=details,
        )


def check_answer_match(
    computed_var: float,
    historical_var: Optional[float],
    tolerance_pct: float = 0.05,
) -> Optional[bool]:
    if historical_var is None:
        return None
    if historical_var == 0:
        return abs(computed_var) < 1e-8
    diff = abs(computed_var - historical_var) / abs(historical_var)
    return diff <= tolerance_pct


def generate_sample_returns(
    n_days: int = 500,
    seed: int = 42,
    volatility: float = 0.02,
    drift: float = 0.0005,
) -> np.ndarray:
    rng = np.random.RandomState(seed)
    return rng.normal(loc=drift, scale=volatility, size=n_days)
