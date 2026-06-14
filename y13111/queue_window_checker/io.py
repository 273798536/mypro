from __future__ import annotations

import json
import os
from typing import Any

import pandas as pd

from .models import (
    Anomaly,
    AnomalyType,
    HistoricalAnswer,
    Material,
    Unit,
    WindowConfig,
)


_UNIT_MAP = {
    "秒": Unit.SECOND,
    "秒钟": Unit.SECOND,
    "s": Unit.SECOND,
    "分钟": Unit.MINUTE,
    "分": Unit.MINUTE,
    "min": Unit.MINUTE,
    "人": Unit.PERSON,
    "个": Unit.COUNT,
    "本": Unit.COUNT,
    "套": Unit.COUNT,
    "张": Unit.COUNT,
}


def _parse_unit(raw: str) -> Unit:
    s = str(raw).strip().lower()
    if s in _UNIT_MAP:
        return _UNIT_MAP[s]
    for k, v in _UNIT_MAP.items():
        if s == k.lower():
            return v
    raise ValueError(f"无法识别的单位: {raw}")


def load_csv_answer(csv_path: str) -> HistoricalAnswer:
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV 文件不存在: {csv_path}")

    abs_path = os.path.abspath(csv_path)
    df = pd.read_csv(csv_path, dtype=str, keep_default_na=False)

    required_cols = {"id", "name", "expected_name", "quantity", "unit", "answer_id", "expected_window_count"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"CSV 缺少必要列: {missing}")

    if df.empty:
        first_row_raw = {}
        answer_id = "unknown"
        expected_window_count = 0
    else:
        first_row_raw = df.iloc[0].to_dict()
        answer_id = str(first_row_raw.get("answer_id", os.path.basename(csv_path))).strip()
        ewc = str(first_row_raw.get("expected_window_count", "0")).strip()
        expected_window_count = int(ewc) if ewc else 0

    materials: list[Material] = []
    raw_rows: list[dict[str, Any]] = []

    for idx, row in df.iterrows():
        raw = row.to_dict()
        raw_rows.append(raw)

        mid = str(raw.get("id", "")).strip()
        name = str(raw.get("name", "")).strip()
        expected_name = str(raw.get("expected_name", "")).strip()
        qty_str = str(raw.get("quantity", "")).strip()
        unit_str = str(raw.get("unit", "")).strip()

        if not mid and not name and not qty_str:
            continue

        try:
            quantity = float(qty_str) if qty_str else 0.0
        except (ValueError, TypeError):
            quantity = 0.0

        try:
            unit = _parse_unit(unit_str) if unit_str else Unit.COUNT
        except ValueError:
            unit = Unit.COUNT

        materials.append(Material(
            material_id=mid or f"ROW_{idx+2}",
            name=name,
            expected_name=expected_name,
            quantity=quantity,
            unit=unit,
            source_line=idx + 2,
            raw_data=raw,
        ))

    return HistoricalAnswer(
        answer_id=answer_id,
        materials=materials,
        expected_window_count=expected_window_count,
        source_file=abs_path,
        raw_rows=raw_rows,
    )


def load_window_config(config_path: str) -> WindowConfig:
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"配置文件不存在: {config_path}")

    with open(config_path, "r", encoding="utf-8") as fp:
        cfg = json.load(fp)

    required_keys = {"window_size", "window_unit", "lower_bound", "upper_bound", "value_unit"}
    missing = required_keys - set(cfg.keys())
    if missing:
        raise ValueError(f"配置缺少必要字段: {missing}")

    return WindowConfig(
        window_size=float(cfg["window_size"]),
        window_unit=_parse_unit(cfg["window_unit"]),
        lower_bound=float(cfg["lower_bound"]),
        upper_bound=float(cfg["upper_bound"]),
        value_unit=_parse_unit(cfg["value_unit"]),
        formula=str(cfg.get("formula", "avg_throughput = total_count / window_size")),
        tolerance=float(cfg.get("tolerance", 0.0)),
    )


def save_window_config(config: WindowConfig, config_path: str) -> str:
    os.makedirs(os.path.dirname(os.path.abspath(config_path)), exist_ok=True)
    with open(config_path, "w", encoding="utf-8") as fp:
        json.dump(config.to_dict(), fp, ensure_ascii=False, indent=2)
    return os.path.abspath(config_path)


def validate_answer_integrity(answer: HistoricalAnswer) -> list[Anomaly]:
    anomalies: list[Anomaly] = []
    if answer.has_empty_materials():
        anomalies.append(Anomaly(
            anomaly_type=AnomalyType.EMPTY_SET,
            message=f"历史答案 {answer.answer_id} 材料集合为空",
            source_line=None,
            raw_reference=str(answer.raw_rows),
        ))
    seen_ids = set()
    for m in answer.materials:
        if m.material_id in seen_ids:
            anomalies.append(Anomaly(
                anomaly_type=AnomalyType.BAD_DATA,
                message=f"重复的材料ID: {m.material_id}",
                material=m,
                source_line=m.source_line,
                raw_reference=str(m.raw_data),
            ))
        seen_ids.add(m.material_id)
        if m.quantity < 0:
            anomalies.append(Anomaly(
                anomaly_type=AnomalyType.BAD_DATA,
                message=f"材料数量为负: {m.quantity}",
                material=m,
                source_line=m.source_line,
                raw_reference=str(m.raw_data),
            ))
    return anomalies
