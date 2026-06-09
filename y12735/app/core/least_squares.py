from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np
from scipy import stats

from app.models import FitResult


class InsufficientDataError(ValueError):
    pass


@dataclass
class LinearFitConfig:
    confidence_level: float = 0.95


def fit_linear(x: list[float], y: list[float], config: Optional[LinearFitConfig] = None) -> FitResult:
    if config is None:
        config = LinearFitConfig()

    x_arr = np.asarray(x, dtype=float)
    y_arr = np.asarray(y, dtype=float)

    if x_arr.size != y_arr.size:
        raise InsufficientDataError("x 和 y 数据长度不一致")
    if x_arr.size < 3:
        raise InsufficientDataError(
            f"最小二乘拟合至少需要 3 个有效数据点，当前仅 {x_arr.size} 个。请检查计算草稿是否缺页或存在未录入数据。"
        )

    slope, intercept, r_value, p_value, std_err = stats.linregress(x_arr, y_arr)
    y_pred = intercept + slope * x_arr
    residuals = (y_arr - y_pred).tolist()

    n = x_arr.size
    x_mean = x_arr.mean()
    ss_xx = np.sum((x_arr - x_mean) ** 2)
    mse = np.sum(np.array(residuals) ** 2) / (n - 2)
    intercept_std = np.sqrt(mse * (1.0 / n + x_mean**2 / ss_xx))

    return FitResult(
        params=[float(intercept), float(slope)],
        param_names=["截距", "斜率"],
        param_errors=[float(intercept_std), float(std_err)],
        r_squared=float(r_value**2),
        residuals=residuals,
        x_data=x_arr.tolist(),
        y_data=y_arr.tolist(),
        y_predicted=y_pred.tolist(),
        model_formula=f"y = {slope:.6g} * x + {intercept:.6g}",
    )


def predict_at(fit: FitResult, x_value: float) -> float:
    intercept, slope = fit.params[0], fit.params[1]
    return intercept + slope * x_value
