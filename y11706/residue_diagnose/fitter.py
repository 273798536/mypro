"""数据拟合模块，支持最小二乘拟合和多模型比较。"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
from scipy.optimize import curve_fit

from .models import MODELS, ModelSpec, evaluate, get_model


@dataclass
class FitResult:
    """拟合结果。"""

    model_name: str
    params: List[float]
    param_errors: List[float]
    y_pred: np.ndarray
    residuals: np.ndarray
    r_squared: float
    adjusted_r_squared: float
    rmse: float
    n_params: int
    n_samples: int
    source: str = ""
    x_data: Optional[np.ndarray] = None
    y_data: Optional[np.ndarray] = None


def _calculate_r_squared(
    y_true: np.ndarray, y_pred: np.ndarray, n_params: int
) -> Tuple[float, float, float]:
    """计算 R²、调整 R² 和 RMSE。"""
    ss_res = np.sum((y_true - y_pred) ** 2)
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)

    r_squared = 1 - ss_res / ss_tot if ss_tot > 1e-15 else 0.0

    n = len(y_true)
    dof = n - n_params - 1
    adjusted_r_squared = (
        1 - (1 - r_squared) * (n - 1) / dof if dof > 0 else r_squared
    )

    rmse = np.sqrt(np.mean((y_true - y_pred) ** 2))

    return r_squared, adjusted_r_squared, rmse


def fit_model(
    x: np.ndarray,
    y: np.ndarray,
    model_name: str,
    initial_params: Optional[List[float]] = None,
    source: str = "",
    max_nfev: int = 10000,
) -> FitResult:
    """对数据进行指定模型的最小二乘拟合。

    Args:
        x: 自变量数据
        y: 因变量数据
        model_name: 模型名称
        initial_params: 初始参数，为 None 时使用模型默认值
        source: 数据来源标识
        max_nfev: 最大函数评估次数

    Returns:
        FitResult 拟合结果
    """
    model = get_model(model_name)

    if initial_params is None:
        initial_params = model.default_initial

    if len(initial_params) != len(model.param_names):
        raise ValueError(
            f"初始参数数量不匹配: 期望 {len(model.param_names)}, "
            f"实际 {len(initial_params)}"
        )

    try:
        popt, pcov = curve_fit(
            model.func,
            x,
            y,
            p0=initial_params,
            maxfev=max_nfev,
        )
        perr = np.sqrt(np.diag(pcov))
    except RuntimeError as e:
        raise RuntimeError(f"拟合失败: {e}") from e
    except Exception as e:
        raise RuntimeError(f"拟合过程出错 (模型: {model_name}): {e}") from e

    y_pred = model.func(x, *popt)
    residuals = y - y_pred

    r_squared, adjusted_r_squared, rmse = _calculate_r_squared(
        y, y_pred, len(popt)
    )

    return FitResult(
        model_name=model_name,
        params=popt.tolist(),
        param_errors=perr.tolist(),
        y_pred=y_pred,
        residuals=residuals,
        r_squared=r_squared,
        adjusted_r_squared=adjusted_r_squared,
        rmse=rmse,
        n_params=len(popt),
        n_samples=len(y),
        source=source,
        x_data=x.copy(),
        y_data=y.copy(),
    )


def fit_multiple_models(
    x: np.ndarray,
    y: np.ndarray,
    model_names: List[str],
    initial_params_map: Optional[Dict[str, List[float]]] = None,
    source: str = "",
) -> Dict[str, FitResult]:
    """对同一数据拟合多个模型进行比较。

    Args:
        x: 自变量数据
        y: 因变量数据
        model_names: 模型名称列表
        initial_params_map: 各模型的初始参数映射
        source: 数据来源标识

    Returns:
        字典，键为模型名称，值为拟合结果
    """
    if initial_params_map is None:
        initial_params_map = {}

    results = {}
    for name in model_names:
        try:
            init_params = initial_params_map.get(name)
            result = fit_model(
                x, y, name, initial_params=init_params, source=source
            )
            results[name] = result
        except (RuntimeError, ValueError) as e:
            print(f"  [警告] 模型 {name} 拟合失败: {e}")

    return results


def rank_models(results: Dict[str, FitResult]) -> List[Tuple[str, float, float]]:
    """根据调整 R² 对模型进行排序。

    Returns:
        列表，每个元素为 (模型名, R², 调整R²)，按调整 R² 降序排列
    """
    ranked = []
    for name, result in results.items():
        ranked.append((name, result.r_squared, result.adjusted_r_squared))
    ranked.sort(key=lambda x: x[2], reverse=True)
    return ranked