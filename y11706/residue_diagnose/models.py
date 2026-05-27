"""模型定义与注册模块。

支持的拟合模型类型：
- linear: 线性模型 y = a*x + b
- quadratic: 二次多项式 y = a*x^2 + b*x + c
- cubic: 三次多项式 y = a*x^3 + b*x^2 + c*x + d
- exponential: 指数模型 y = a*exp(b*x) + c
- power: 幂函数模型 y = a*x^b + c
- logarithmic: 对数模型 y = a*ln(x) + b
"""

from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional

import numpy as np


@dataclass
class ModelSpec:
    """模型规格定义。"""

    name: str
    display_name: str
    func: Callable
    param_names: List[str]
    default_initial: List[float]
    description: str = ""


def _linear(x: np.ndarray, a: float, b: float) -> np.ndarray:
    return a * x + b


def _quadratic(x: np.ndarray, a: float, b: float, c: float) -> np.ndarray:
    return a * x**2 + b * x + c


def _cubic(x: np.ndarray, a: float, b: float, c: float, d: float) -> np.ndarray:
    return a * x**3 + b * x**2 + c * x + d


def _exponential(x: np.ndarray, a: float, b: float, c: float) -> np.ndarray:
    return a * np.exp(b * x) + c


def _power(x: np.ndarray, a: float, b: float, c: float) -> np.ndarray:
    return a * np.power(np.abs(x), b) + c


def _logarithmic(x: np.ndarray, a: float, b: float) -> np.ndarray:
    return a * np.log(np.abs(x) + 1e-10) + b


MODELS: Dict[str, ModelSpec] = {
    "linear": ModelSpec(
        name="linear",
        display_name="线性模型",
        func=_linear,
        param_names=["a (斜率)", "b (截距)"],
        default_initial=[1.0, 0.0],
        description="y = a*x + b",
    ),
    "quadratic": ModelSpec(
        name="quadratic",
        display_name="二次多项式",
        func=_quadratic,
        param_names=["a (二次项)", "b (一次项)", "c (常数项)"],
        default_initial=[1.0, 0.0, 0.0],
        description="y = a*x^2 + b*x + c",
    ),
    "cubic": ModelSpec(
        name="cubic",
        display_name="三次多项式",
        func=_cubic,
        param_names=["a (三次项)", "b (二次项)", "c (一次项)", "d (常数项)"],
        default_initial=[1.0, 0.0, 0.0, 0.0],
        description="y = a*x^3 + b*x^2 + c*x + d",
    ),
    "exponential": ModelSpec(
        name="exponential",
        display_name="指数模型",
        func=_exponential,
        param_names=["a (振幅)", "b (速率)", "c (偏移)"],
        default_initial=[1.0, 0.1, 0.0],
        description="y = a*exp(b*x) + c",
    ),
    "power": ModelSpec(
        name="power",
        display_name="幂函数模型",
        func=_power,
        param_names=["a (系数)", "b (指数)", "c (偏移)"],
        default_initial=[1.0, 1.0, 0.0],
        description="y = a*x^b + c",
    ),
    "logarithmic": ModelSpec(
        name="logarithmic",
        display_name="对数模型",
        func=_logarithmic,
        param_names=["a (系数)", "b (截距)"],
        default_initial=[1.0, 0.0],
        description="y = a*ln(x) + b",
    ),
}


def list_models() -> List[str]:
    """列出所有可用模型名称。"""
    return list(MODELS.keys())


def get_model(model_name: str) -> ModelSpec:
    """根据名称获取模型规格。"""
    if model_name not in MODELS:
        available = ", ".join(list_models())
        raise ValueError(f"未知模型 '{model_name}'。可选模型: {available}")
    return MODELS[model_name]


def evaluate(model_name: str, x: np.ndarray, params: List[float]) -> np.ndarray:
    """计算模型在给定 x 和参数下的值。"""
    model = get_model(model_name)
    return model.func(x, *params)