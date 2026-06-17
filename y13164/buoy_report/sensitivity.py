"""参数敏感性分析模块."""

from copy import deepcopy
from datetime import datetime
from typing import Any

from .anomaly_detector import detect_anomalies
from .data_loader import to_buoy_dataframe
from .models import AnomalyRecord, BuoyData, CalculationParams, MaintenanceNote


def analyze_param_sensitivity(
    buoys: list[BuoyData],
    notes: list[MaintenanceNote],
    base_params: CalculationParams,
) -> dict[str, Any]:
    """参数调一档复算，分析敏感性."""
    result: dict[str, Any] = {
        "base_params": base_params.describe(),
        "formulas": base_params.formulas(),
        "adjustments": [],
        "summary": {},
    }

    param_adjustments = _get_param_adjustments(base_params)
    base_anomalies = detect_anomalies(buoys, notes, base_params)
    base_count = len(base_anomalies)

    for adj_name, adj_params, delta_desc in param_adjustments:
        adj_anomalies = detect_anomalies(buoys, notes, adj_params)
        adj_count = len(adj_anomalies)
        diff = adj_count - base_count

        changed_ids = _find_changed_anomalies(base_anomalies, adj_anomalies)

        result["adjustments"].append(
            {
                "adjustment": adj_name,
                "delta": delta_desc,
                "anomaly_count_before": base_count,
                "anomaly_count_after": adj_count,
                "change": diff,
                "changed_samples": changed_ids[:5],
                "params_used": adj_params.describe(),
                "why_it_changes": _explain_change(adj_name, diff, changed_ids),
            }
        )

    result["summary"] = {
        "most_sensitive": max(
            result["adjustments"], key=lambda x: abs(x["change"])
        )["adjustment"]
        if result["adjustments"]
        else "",
        "total_tested": len(result["adjustments"]),
        "max_change": max(abs(a["change"]) for a in result["adjustments"])
        if result["adjustments"]
        else 0,
    }

    return result


def rerun_with_adjusted_params(
    buoys: list[BuoyData],
    notes: list[MaintenanceNote],
    base_params: CalculationParams,
    adjustment: str,
) -> tuple[CalculationParams, list[dict[str, Any]]]:
    """使用调档后的参数重新运行，返回新参数和变化的样本."""
    adjustments = _get_param_adjustments(base_params)
    adj_map = {a[0]: a[1] for a in adjustments}

    if adjustment not in adj_map:
        raise ValueError(
            f"未知的调档选项: {adjustment}. 可用选项: {list(adj_map.keys())}"
        )

    new_params = adj_map[adjustment]
    base_anomalies = detect_anomalies(buoys, notes, base_params)
    new_anomalies = detect_anomalies(buoys, notes, new_params)

    changed = _find_changed_anomalies(base_anomalies, new_anomalies)
    return new_params, changed


def _get_param_adjustments(
    base: CalculationParams,
) -> list[tuple[str, CalculationParams, str]]:
    """生成参数调档组合."""
    adjustments = []

    param_configs = [
        ("wave_height_threshold", -0.5, "浪高阈值 -0.5m"),
        ("wave_height_threshold", 0.5, "浪高阈值 +0.5m"),
        ("wind_speed_threshold", -2.0, "风速阈值 -2m/s"),
        ("wind_speed_threshold", 2.0, "风速阈值 +2m/s"),
        ("anomaly_sigma", -0.5, "异常检测敏感度 +0.5σ"),
        ("anomaly_sigma", 0.5, "异常检测敏感度 -0.5σ"),
        ("temp_max", -3.0, "水温上限 -3°C"),
        ("temp_max", 3.0, "水温上限 +3°C"),
    ]

    for param_name, delta, desc in param_configs:
        new_params = deepcopy(base)
        new_params.param_id = base.param_id + "_adj"
        current = getattr(new_params, param_name)
        setattr(new_params, param_name, current + delta)
        adjustments.append((desc, new_params, f"{param_name}: {current:.2f} → {current + delta:.2f}"))

    return adjustments


def _find_changed_anomalies(
    base: list[AnomalyRecord], new: list[AnomalyRecord]
) -> list[dict[str, Any]]:
    """找出两次运行间异常状态变化的样本."""
    base_key = {(a.device_id, a.timestamp.isoformat(), a.metric): a for a in base}
    new_key = {(a.device_id, a.timestamp.isoformat(), a.metric): a for a in new}

    all_keys = set(base_key.keys()) | set(new_key.keys())
    changed = []

    for key in all_keys:
        in_base = key in base_key
        in_new = key in new_key

        if in_base != in_new:
            a = base_key.get(key) or new_key.get(key)
            assert a is not None
            changed.append(
                {
                    "device_id": a.device_id,
                    "timestamp": a.timestamp,
                    "metric": a.metric,
                    "value": a.value,
                    "was_anomaly": in_base,
                    "is_anomaly": in_new,
                    "change_type": "新增异常" if in_new and not in_base else "异常消除",
                    "location": _get_location(a.device_id, a.timestamp),
                }
            )
        elif in_base and in_new:
            a_base = base_key[key]
            a_new = new_key[key]
            if a_base.severity != a_new.severity:
                changed.append(
                    {
                        "device_id": a_base.device_id,
                        "timestamp": a_base.timestamp,
                        "metric": a_base.metric,
                        "value": a_base.value,
                        "was_anomaly": True,
                        "is_anomaly": True,
                        "change_type": f"严重等级: {a_base.severity} → {a_new.severity}",
                        "location": _get_location(a_base.device_id, a_base.timestamp),
                    }
                )

    return changed


def _get_location(device_id: str, timestamp: datetime) -> str:
    """获取位置（简化实现，实际应关联原始数据）."""
    return "详见原始数据"


def _explain_change(
    adj_name: str, diff: int, changed: list[dict[str, Any]]
) -> str:
    """解释参数变化为什么会导致结果变化."""
    if diff == 0:
        return f"{adj_name} 对本次数据集无显著影响"

    direction = "增加" if diff > 0 else "减少"
    examples = [
        f"{c['device_id']} {c['metric']}={c['value']:.2f}"
        for c in changed[:3]
    ]

    return (
        f"{adj_name} 使异常数量{direction} {abs(diff)} 个。"
        f"原因：边界样本 {', '.join(examples)} 恰好跨阈值，"
        f"参数调档改变了判定结果。可查看边界样本详情确认。"
    )
