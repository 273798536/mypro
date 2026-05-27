"""样例数据生成模块。"""

import json
import os
from typing import Dict, List

import numpy as np


def generate_sample_data() -> Dict:
    """生成样例数据集。"""
    np.random.seed(42)

    datasets = []

    x_normal = np.linspace(1, 20, 20)
    y_normal = 2 * x_normal + 1 + np.random.normal(0, 0.5, 20)

    datasets.append({
        "name": "normal_linear",
        "source": "样例-正常线性数据",
        "description": "标准线性关系 y=2x+1，添加高斯噪声 σ=0.5，拟合效果良好",
        "model_type": "linear",
        "x": x_normal.tolist(),
        "y": [round(v, 2) for v in y_normal.tolist()],
    })

    x_boundary = np.linspace(1, 15, 15)
    y_boundary = x_boundary ** 2 + np.random.normal(0, 1, 15)
    y_boundary[11] = 200.0
    y_boundary[13] = 195.5

    datasets.append({
        "name": "boundary_outlier",
        "source": "样例-边界异常数据",
        "description": "二次关系但有2个边界异常点，接近但未超过严重阈值",
        "model_type": "quadratic",
        "x": x_boundary.tolist(),
        "y": [round(v, 2) for v in y_boundary.tolist()],
    })

    x_bad = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0])
    y_bad = np.array([1.5, 12.3, 28.8, 62.5, 125.0, 216.5, 343.0])

    datasets.append({
        "name": "bad_overfit",
        "source": "样例-坏数据(过拟合+单位混用风险)",
        "description": "少量数据用高阶模型，存在单位混用风险，典型坏数据",
        "model_type": "cubic",
        "x": x_bad.tolist(),
        "y": y_bad.tolist(),
    })

    x_exp = np.linspace(0, 10, 11)
    y_exp = 0.5 * np.exp(0.3 * x_exp) + 0.1 + np.random.normal(0, 0.1, 11)

    datasets.append({
        "name": "exponential_good",
        "source": "样例-指数增长数据",
        "description": "正常指数关系 y=0.5*exp(0.3x)+0.1，拟合效果良好",
        "model_type": "exponential",
        "x": x_exp.tolist(),
        "y": [round(v, 2) for v in y_exp.tolist()],
    })

    return {"datasets": datasets}


def save_samples(output_dir: str = "./samples") -> str:
    """保存样例数据到文件。"""
    os.makedirs(output_dir, exist_ok=True)

    data = generate_sample_data()
    filepath = os.path.join(output_dir, "sample_data.json")

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    return filepath