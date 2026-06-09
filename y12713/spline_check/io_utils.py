from __future__ import annotations

import json
from pathlib import Path
from typing import List, Tuple

import pandas as pd

from .models import SampleRecord, SampleSource


def load_samples_from_csv(path: Path | str, source_file: str | None = None) -> List[SampleRecord]:
    """从 CSV 加载样本。

    列约定:
        sample_id, x, y     —— 长表格式，每个 sample_id 多行
        或
        sample_id, xs, ys   —— 宽表格式，xs/ys 为 json 数组字符串或分号分隔
    """
    path = Path(path)
    df = pd.read_csv(path)
    src = source_file or path.name

    if "x" in df.columns and "y" in df.columns and "sample_id" in df.columns:
        records: List[SampleRecord] = []
        for sid, g in df.groupby("sample_id"):
            g = g.sort_values("x")
            records.append(SampleRecord(
                sample_id=str(sid),
                x_values=g["x"].astype(float).tolist(),
                y_values=g["y"].astype(float).tolist(),
                source=SampleSource.BATCH_IMPORT,
                source_file=src,
            ))
        return records

    if "xs" in df.columns and "ys" in df.columns and "sample_id" in df.columns:
        out: List[SampleRecord] = []
        for _, row in df.iterrows():
            xs = _parse_array(row["xs"])
            ys = _parse_array(row["ys"])
            out.append(SampleRecord(
                sample_id=str(row["sample_id"]),
                x_values=xs,
                y_values=ys,
                source=SampleSource.BATCH_IMPORT,
                source_file=src,
            ))
        return out

    raise ValueError(
        "CSV 缺少必要列。需包含 (sample_id, x, y) 或 (sample_id, xs, ys)"
    )


def _parse_array(val) -> List[float]:
    if isinstance(val, (list, tuple)):
        return [float(v) for v in val]
    s = str(val).strip()
    if s.startswith("["):
        try:
            return [float(v) for v in json.loads(s)]
        except Exception:
            pass
    sep = ";" if ";" in s else ","
    return [float(x.strip()) for x in s.split(sep) if x.strip()]


def _parse_raw(cls, raw: str):
    if hasattr(cls, "model_validate_json"):
        return cls.model_validate_json(raw)
    return cls.parse_raw(raw)


def load_samples_from_jsonl(path: Path | str) -> List[SampleRecord]:
    out = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            out.append(_parse_raw(SampleRecord, line))
    return out
