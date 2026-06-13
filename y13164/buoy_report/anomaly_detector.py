"""异常检测和高亮模块."""

import numpy as np
import pandas as pd
from uuid import uuid4

from .models import AnomalyRecord, BuoyData, CalculationParams, MaintenanceNote, Severity
from .data_loader import to_buoy_dataframe


def detect_anomalies(
    buoys: list[BuoyData],
    notes: list[MaintenanceNote],
    params: CalculationParams,
) -> list[AnomalyRecord]:
    """检测异常，关联空间位置和维修备注."""
    df = to_buoy_dataframe(buoys)
    if df.empty:
        return []

    anomalies: list[AnomalyRecord] = []
    metrics = ["wave_height", "wave_period", "water_temperature", "wind_speed"]
    fixed_ranges = {
        "wave_height": (0.0, 30.0),
        "wave_period": (params.wave_period_min, params.wave_period_max),
        "water_temperature": (params.temp_min, params.temp_max),
        "wind_speed": (0.0, 50.0),
    }

    for metric in metrics:
        values = df[metric].values
        mean = np.mean(values)
        std = np.std(values)
        sigma_range = (mean - params.anomaly_sigma * std, mean + params.anomaly_sigma * std)
        fixed_range = fixed_ranges[metric]

        for _, row in df.iterrows():
            value = row[metric]
            severity: Severity = "normal"
            in_sigma = sigma_range[0] <= value <= sigma_range[1]
            in_fixed = fixed_range[0] <= value <= fixed_range[1]

            if not in_fixed:
                severity = "critical"
            elif not in_sigma:
                severity = "warning"
            elif metric == "wave_height" and value >= params.wave_height_threshold:
                severity = "warning"
            elif metric == "wind_speed" and value >= params.wind_speed_threshold:
                severity = "warning"

            if severity != "normal":
                linked_note = _find_linked_note(row["device_id"], row["timestamp"], notes)
                anomalies.append(
                    AnomalyRecord(
                        anomaly_id=uuid4().hex[:8],
                        device_id=row["device_id"],
                        timestamp=row["timestamp"],
                        metric=metric,
                        value=float(value),
                        expected_range=sigma_range if in_fixed else fixed_range,
                        severity=severity,
                        linked_note_id=linked_note.note_id if linked_note else None,
                        description=_build_description(
                            metric, value, sigma_range, fixed_range, in_sigma, in_fixed, params
                        ),
                    )
                )

    return anomalies


def highlight_extremes(df: pd.DataFrame, anomalies: list[AnomalyRecord]) -> pd.DataFrame:
    """为DataFrame添加高亮标记列，显示空间位置和关联备注."""
    df = df.copy()
    df["is_anomaly"] = False
    df["anomaly_severity"] = ""
    df["anomaly_metrics"] = ""
    df["linked_note"] = ""
    df["location"] = df.apply(
        lambda r: f"({r['longitude']:.4f}°, {r['latitude']:.4f}°)", axis=1
    )

    anomaly_map: dict[tuple[str, pd.Timestamp], list[AnomalyRecord]] = {}
    for a in anomalies:
        key = (a.device_id, pd.Timestamp(a.timestamp))
        anomaly_map.setdefault(key, []).append(a)

    for idx, row in df.iterrows():
        key = (row["device_id"], pd.Timestamp(row["timestamp"]))
        if key in anomaly_map:
            record_anomalies = anomaly_map[key]
            df.at[idx, "is_anomaly"] = True
            df.at[idx, "anomaly_severity"] = max(
                (a.severity for a in record_anomalies),
                key=lambda s: {"warning": 1, "critical": 2}.get(s, 0),
            )
            df.at[idx, "anomaly_metrics"] = ", ".join(
                f"{a.metric}={a.value:.2f}" for a in record_anomalies
            )
            df.at[idx, "linked_note"] = ", ".join(
                [a.linked_note_id for a in record_anomalies if a.linked_note_id]
            )

    return df


def find_boundary_samples(
    df: pd.DataFrame, anomalies: list[AnomalyRecord], params: CalculationParams
) -> list[dict]:
    """找出边界样本，说明为什么结果会变化."""
    boundaries = []
    metrics_thresholds = {
        "wave_height": params.wave_height_threshold,
        "wind_speed": params.wind_speed_threshold,
    }

    for metric, threshold in metrics_thresholds.items():
        near = df[(df[metric] >= threshold * 0.9) & (df[metric] <= threshold * 1.1)]
        for _, row in near.iterrows():
            value = row[metric]
            boundaries.append(
                {
                    "device_id": row["device_id"],
                    "timestamp": row["timestamp"],
                    "metric": metric,
                    "value": float(value),
                    "threshold": threshold,
                    "distance": float(abs(value - threshold)),
                    "is_over": bool(value >= threshold),
                    "location": f"({row['longitude']:.4f}°, {row['latitude']:.4f}°)",
                    "why_it_matters": f"{metric}={value:.2f} 接近阈值 {threshold}，"
                    f"参数调档±10%将{'触发' if value < threshold else '取消'}异常标记",
                }
            )

    for a in anomalies:
        if a.severity == "warning":
            within_10pct = (
                abs(a.value - a.expected_range[0]) / abs(a.expected_range[0]) < 0.1
                or abs(a.value - a.expected_range[1]) / abs(a.expected_range[1]) < 0.1
            )
            if within_10pct:
                boundaries.append(
                    {
                        "device_id": a.device_id,
                        "timestamp": a.timestamp,
                        "metric": a.metric,
                        "value": a.value,
                        "threshold": f"{a.expected_range[0]:.2f}~{a.expected_range[1]:.2f}",
                        "distance": float(
                            min(
                                abs(a.value - a.expected_range[0]),
                                abs(a.value - a.expected_range[1]),
                            )
                        ),
                        "is_over": a.value > a.expected_range[1],
                        "location": "见关联记录",
                        "why_it_matters": f"{a.metric}={a.value:.2f} 刚越界，参数微调可能改变判定结果",
                    }
                )

    return sorted(boundaries, key=lambda x: x["distance"])[:10]


def _find_linked_note(
    device_id: str, timestamp: pd.Timestamp, notes: list[MaintenanceNote]
) -> MaintenanceNote | None:
    """查找时间和设备匹配的维修备注."""
    ts = timestamp.to_pydatetime()
    candidates = [
        n
        for n in notes
        if n.device_id == device_id and abs((n.timestamp - ts).total_seconds()) < 86400 * 7
    ]
    return candidates[0] if candidates else None


def _build_description(
    metric: str,
    value: float,
    sigma_range: tuple[float, float],
    fixed_range: tuple[float, float],
    in_sigma: bool,
    in_fixed: bool,
    params: CalculationParams,
) -> str:
    """构建异常描述."""
    unit_map = {
        "wave_height": "m",
        "wave_period": "s",
        "water_temperature": "°C",
        "wind_speed": "m/s",
    }
    unit = unit_map.get(metric, "")

    if not in_fixed:
        return (
            f"{metric}={value:.2f}{unit} 超出物理范围 {fixed_range[0]}-{fixed_range[1]}{unit}，"
            f"已被平均后风险不明显，需人工复核原始数据"
        )
    if not in_sigma:
        return (
            f"{metric}={value:.2f}{unit} 偏离 {params.anomaly_sigma}σ 范围 "
            f"{sigma_range[0]:.2f}-{sigma_range[1]:.2f}{unit}"
        )
    if metric == "wave_height" and value >= params.wave_height_threshold:
        return f"浪高 {value:.2f}m ≥ 阈值 {params.wave_height_threshold}m"
    if metric == "wind_speed" and value >= params.wind_speed_threshold:
        return f"风速 {value:.2f}m/s ≥ 阈值 {params.wind_speed_threshold}m/s"
    return ""
