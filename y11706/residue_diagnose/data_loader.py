"""数据加载和批量处理模块。

支持从 CSV/JSON 文件加载实验数据，批量处理多个数据集。
"""

import csv
import json
import os
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np


@dataclass
class Dataset:
    """单个数据集。"""

    name: str
    source: str
    x: np.ndarray
    y: np.ndarray
    model_type: str = "linear"
    initial_params: Optional[List[float]] = None
    description: str = ""
    raw_data: Dict[str, Any] = field(default_factory=dict)


def load_from_csv(filepath: str, name: str = "") -> Dataset:
    """从 CSV 文件加载数据。

    CSV 格式要求:
    - 必须包含 x, y 列
    - 可选 model_type, param1, param2, ... 列
    """
    data_x = []
    data_y = []
    model_type = "linear"
    initial_params = None
    source = filepath

    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if "x" in row and "y" in row:
                try:
                    data_x.append(float(row["x"]))
                    data_y.append(float(row["y"]))
                except (ValueError, TypeError):
                    continue
            if "model_type" in row:
                model_type = row["model_type"]
            if "params" in row:
                try:
                    initial_params = json.loads(row["params"])
                except (json.JSONDecodeError, TypeError):
                    pass

    if not name:
        name = os.path.splitext(os.path.basename(filepath))[0]

    return Dataset(
        name=name,
        source=source,
        x=np.array(data_x),
        y=np.array(data_y),
        model_type=model_type,
        initial_params=initial_params,
        raw_data={"filepath": filepath},
    )


def load_from_json(filepath: str, name: str = "") -> List[Dataset]:
    """从 JSON 文件加载数据（支持批量）。

    JSON 格式:
    {
        "datasets": [
            {
                "name": "dataset1",
                "source": "实验A",
                "x": [1, 2, 3],
                "y": [2, 4, 6],
                "model_type": "linear",
                "initial_params": [1.0, 0.0],
                "description": "说明"
            }
        ]
    }
    """
    datasets = []

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = data.get("datasets", [data]) if isinstance(data, dict) else data

    for i, item in enumerate(items):
        if not isinstance(item, dict):
            continue

        x = np.array(item.get("x", []), dtype=float)
        y = np.array(item.get("y", []), dtype=float)

        if len(x) != len(y) or len(x) < 2:
            print(f"  [警告] 数据集 {item.get('name', i)} 数据无效，跳过")
            continue

        ds_name = item.get("name", name or f"dataset_{i}")
        source = item.get("source", filepath)
        model_type = item.get("model_type", "linear")
        initial_params = item.get("initial_params")
        description = item.get("description", "")

        datasets.append(
            Dataset(
                name=ds_name,
                source=source,
                x=x,
                y=y,
                model_type=model_type,
                initial_params=initial_params,
                description=description,
                raw_data=item,
            )
        )

    return datasets


def load_datasets(
    filepath: str, name: str = ""
) -> List[Dataset]:
    """从文件加载数据集，自动识别格式。"""
    ext = os.path.splitext(filepath)[1].lower()

    if ext == ".json":
        return load_from_json(filepath, name)
    elif ext == ".csv":
        return [load_from_csv(filepath, name)]
    else:
        raise ValueError(f"不支持的文件格式: {ext}")


def load_directory(dirpath: str) -> List[Dataset]:
    """从目录批量加载数据文件。"""
    datasets = []
    for filename in sorted(os.listdir(dirpath)):
        filepath = os.path.join(dirpath, filename)
        if not os.path.isfile(filepath):
            continue
        ext = os.path.splitext(filename)[1].lower()
        if ext in (".json", ".csv"):
            try:
                datasets.extend(load_datasets(filepath))
            except Exception as e:
                print(f"  [警告] 加载 {filename} 失败: {e}")
    return datasets


def validate_dataset(dataset: Dataset) -> Tuple[bool, List[str]]:
    """验证数据集是否有效。"""
    issues = []

    if len(dataset.x) != len(dataset.y):
        issues.append(f"x 和 y 长度不一致: {len(dataset.x)} vs {len(dataset.y)}")

    if len(dataset.x) < 3:
        issues.append(f"样本数量过少: {len(dataset.x)} < 3")

    if not np.all(np.isfinite(dataset.x)):
        issues.append("x 包含非有限值")

    if not np.all(np.isfinite(dataset.y)):
        issues.append("y 包含非有限值")

    if dataset.x.size > 0 and np.std(dataset.x) < 1e-15:
        issues.append("x 值没有变化")

    if dataset.y.size > 0 and np.std(dataset.y) < 1e-15:
        issues.append("y 值没有变化")

    return len(issues) == 0, issues


def load_from_dict(data: Dict[str, Any], name: str = "") -> Dataset:
    """从字典创建数据集。"""
    x = np.array(data.get("x", []), dtype=float)
    y = np.array(data.get("y", []), dtype=float)

    return Dataset(
        name=name or data.get("name", "unnamed"),
        source=data.get("source", ""),
        x=x,
        y=y,
        model_type=data.get("model_type", "linear"),
        initial_params=data.get("initial_params"),
        description=data.get("description", ""),
        raw_data=data,
    )