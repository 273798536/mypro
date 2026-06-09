from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np

from app.models import (
    DataPoint,
    FitBounds,
    FitResult,
    OutlierRecord,
    OutlierType,
)


@dataclass
class OutlierConfig:
    residual_sigma_threshold: float = 2.0
    extrapolation_margin_ratio: float = 0.1


def detect_outliers(
    data_points: list[DataPoint],
    fit_result: FitResult,
    bounds: Optional[FitBounds] = None,
    config: Optional[OutlierConfig] = None,
) -> list[OutlierRecord]:
    if config is None:
        config = OutlierConfig()

    records: list[OutlierRecord] = []
    residuals = np.asarray(fit_result.residuals, dtype=float)

    if residuals.size > 1:
        residual_std = float(np.std(residuals, ddof=1))
    else:
        residual_std = 0.0

    x_min_data = float(np.min(fit_result.x_data))
    x_max_data = float(np.max(fit_result.x_data))
    span = max(x_max_data - x_min_data, 1e-9)
    extrapolation_margin = span * config.extrapolation_margin_ratio
    extrapolation_lower = x_min_data - extrapolation_margin
    extrapolation_upper = x_max_data + extrapolation_margin

    for dp in data_points:
        idx = dp.index
        if idx < 0 or idx >= len(fit_result.residuals):
            continue

        x_val = dp.x
        y_val = dp.y
        resid = fit_result.residuals[idx]
        y_pred = fit_result.y_predicted[idx]

        if residual_std > 1e-12:
            z_score = abs(resid) / residual_std
        else:
            z_score = 0.0

        out_of_bounds_x = False
        if bounds is not None:
            if bounds.x_min is not None and x_val < bounds.x_min:
                out_of_bounds_x = True
            if bounds.x_max is not None and x_val > bounds.x_max:
                out_of_bounds_x = True
            if bounds.y_min is not None and y_val < bounds.y_min:
                out_of_bounds_x = True
            if bounds.y_max is not None and y_val > bounds.y_max:
                out_of_bounds_x = True

        if out_of_bounds_x or x_val < extrapolation_lower or x_val > extrapolation_upper:
            if x_val < extrapolation_lower:
                direction = "低于"
                boundary = x_min_data
            elif x_val > extrapolation_upper:
                direction = "高于"
                boundary = x_max_data
            elif bounds is not None and bounds.x_min is not None and x_val < bounds.x_min:
                direction = "低于约束下限"
                boundary = bounds.x_min
            elif bounds is not None and bounds.x_max is not None and x_val > bounds.x_max:
                direction = "高于约束上限"
                boundary = bounds.x_max
            else:
                direction = "超出 y 值约束"
                boundary = None

            if boundary is not None:
                if "约束" in direction:
                    short = f"外推越界：x={x_val:.4g} {direction} {boundary:.4g}"
                else:
                    short = f"外推越界：x={x_val:.4g} {direction}样本范围边界 {boundary:.4g}"
                detailed = (
                    f"第 {idx + 1} 号数据点 (x={x_val:.4g}, y={y_val:.4g}) 落在最小二乘拟合的可靠范围之外。"
                    f"拟合样本 x 区间为 [{x_min_data:.4g}, {x_max_data:.4g}]，"
                    f"该点已越出 {abs(x_val - boundary):.4g}。外推区间的拟合误差会迅速放大，"
                    f"该点对应的预测值 y_pred={y_pred:.4g} 仅供参考，建议重新采集样本覆盖该区间后再使用。"
                )
                suggestion = f"补充采集 x 在 {boundary:.4g} 附近的数据点，或确认该点是否来自正确的计算草稿页。"
            else:
                short = f"外推越界：数据点 (x={x_val:.4g}, y={y_val:.4g}) 超出 y 值有效约束"
                detailed = (
                    f"第 {idx + 1} 号数据点 y={y_val:.4g} 超出约束范围，预测值 y_pred={y_pred:.4g}。"
                    f"请核对原始测量与计算草稿是否一致，若一致则该样本属于异常区间。"
                )
                suggestion = "核对原始计算草稿中该数据点所在页的测量值与单位。"

            records.append(
                OutlierRecord(
                    outlier_type=OutlierType.EXTRAPOLATION,
                    point_index=idx,
                    point=dp,
                    short_explanation=short,
                    detailed_explanation=detailed,
                    severity=min(1.0, abs(x_val - (x_min_data + x_max_data) / 2) / span),
                    suggestion=suggestion,
                )
            )
            continue

        if z_score >= config.residual_sigma_threshold:
            short = f"残差异常：点 #{idx + 1} 残差 |{resid:.4g}| 超过 {config.residual_sigma_threshold:.1f}σ"
            detailed = (
                f"第 {idx + 1} 号数据点 (x={x_val:.4g}, y={y_val:.4g}) 偏离拟合直线较远，"
                f"预测值 y_pred={y_pred:.4g}，残差 {resid:+.4g}（约 {z_score:.2f} 倍标准残差）。"
                f"可能原因包括：测量录入错误、计算草稿公式不一致、或该实验条件下存在系统偏差。"
            )
            suggestion = "核对计算草稿该点的原始记录；若确认无误，可在复核时标记该点剔除或权重降级。"
            records.append(
                OutlierRecord(
                    outlier_type=OutlierType.RESIDUAL,
                    point_index=idx,
                    point=dp,
                    short_explanation=short,
                    detailed_explanation=detailed,
                    severity=min(1.0, z_score / 5.0),
                    suggestion=suggestion,
                )
            )

    return records
