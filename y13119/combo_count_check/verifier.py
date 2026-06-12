"""
核心验算逻辑
==============
1. 组合计数一致性校验：当前记录 vs 历史答案
2. 外推越界检测：异常记录单独拎出，绝不混进正常结果
"""
import os
import pandas as pd
from typing import Dict, List, Tuple

from .params import VerifyParams


ERROR_TEMPLATE = "[{code}] {msg} | combo_key={key} | detail={detail}"


def load_inputs(params: VerifyParams) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    history = pd.read_csv(params.history_answers_path, encoding="utf-8")
    current = pd.read_csv(params.current_records_path, encoding="utf-8")
    notes = pd.DataFrame()
    if params.supplementary_notes_path and os.path.exists(params.supplementary_notes_path):
        notes = pd.read_csv(params.supplementary_notes_path, encoding="utf-8")
    return history, current, notes


def detect_extrapolation_outliers(
    current: pd.DataFrame,
    history: pd.DataFrame,
    params: VerifyParams,
) -> Tuple[pd.DataFrame, List[str]]:
    """
    外推越界检测。把异常记录单独拎出来，绝不揉进正常结果。
    返回 (outliers_df, outlier_combo_keys)
    """
    merged = current.merge(
        history[["combo_key", "historical_count"]],
        on="combo_key",
        how="left",
    )

    outlier_mask = pd.Series(False, index=merged.index)

    if "extrapolation_flag" in merged.columns:
        outlier_mask |= merged["extrapolation_flag"].fillna(False).astype(bool)

    with_hist = merged["historical_count"].notna()
    if with_hist.any():
        ratio = (
            merged.loc[with_hist, "current_count"].abs()
            / merged.loc[with_hist, "historical_count"].abs().clip(lower=1)
        )
        outlier_mask.loc[with_hist] |= (
            ratio > (1.0 + params.extrapolation_relative_delta)
        ) | (
            ratio < max(0.0, 1.0 - params.extrapolation_relative_delta)
        )

    outlier_mask |= merged["current_count"] > params.extrapolation_upper_bound
    outlier_mask |= merged["current_count"] < params.extrapolation_lower_bound

    outliers = merged.loc[outlier_mask].copy()
    outliers["outlier_reason"] = outliers.apply(
        lambda r: _explain_outlier(r, params), axis=1
    )
    return outliers, sorted(outliers["combo_key"].unique().tolist())


def _explain_outlier(row: pd.Series, params: VerifyParams) -> str:
    reasons = []
    if row.get("extrapolation_flag"):
        reasons.append("标记为外推填充")
    if pd.notna(row.get("historical_count")) and row["historical_count"] > 0:
        ratio = row["current_count"] / row["historical_count"]
        if ratio > (1.0 + params.extrapolation_relative_delta):
            reasons.append(
                f"较历史上升{(ratio-1)*100:.1f}%，超过阈值{params.extrapolation_relative_delta*100:.0f}%"
            )
        elif ratio < (1.0 - params.extrapolation_relative_delta):
            reasons.append(
                f"较历史下降{(1-ratio)*100:.1f}%，超过阈值{params.extrapolation_relative_delta*100:.0f}%"
            )
    if row["current_count"] > params.extrapolation_upper_bound:
        reasons.append(
            f"绝对值 {row['current_count']} 超过上限 {params.extrapolation_upper_bound}"
        )
    if row["current_count"] < params.extrapolation_lower_bound:
        reasons.append(
            f"绝对值 {row['current_count']} 低于下限 {params.extrapolation_lower_bound}"
        )
    return "; ".join(reasons) if reasons else "未分类异常"


def verify_count_consistency(
    current: pd.DataFrame,
    history: pd.DataFrame,
    params: VerifyParams,
    exclude_keys: List[str] = None,
) -> Tuple[pd.DataFrame, List[str]]:
    """
    组合计数一致性校验。外推越界的 combo_key 默认排除。
    返回 (check_result_df, failed_combo_keys)
    """
    exclude_keys = exclude_keys or []
    merged = current.merge(history, on="combo_key", how="outer", suffixes=("_curr", "_hist"))
    merged = merged[~merged["combo_key"].isin(exclude_keys)].copy()

    merged["count_diff"] = merged["current_count"].fillna(0) - merged["historical_count"].fillna(0)
    denom = merged["historical_count"].abs().clip(lower=1)
    merged["count_diff_ratio"] = merged["count_diff"].abs() / denom

    passed_mask = (
        (merged["count_diff"].abs() <= params.count_absolute_tolerance)
        | (merged["count_diff_ratio"] <= params.count_relative_tolerance)
    )
    merged["check_passed"] = passed_mask
    merged["fail_reason"] = merged.apply(
        lambda r: "" if r["check_passed"] else _explain_count_fail(r, params),
        axis=1,
    )
    failed = sorted(merged.loc[~merged["check_passed"], "combo_key"].unique().tolist())
    return merged, failed


def _explain_count_fail(row: pd.Series, params: VerifyParams) -> str:
    parts = []
    parts.append(
        f"历史={row['historical_count']} 当前={row['current_count']} "
        f"差值={row['count_diff']}"
    )
    if row["count_diff_ratio"] > params.count_relative_tolerance:
        parts.append(
            f"相对差={row['count_diff_ratio']*100:.2f}% > 阈值{params.count_relative_tolerance*100:.1f}%"
        )
    if abs(row["count_diff"]) > params.count_absolute_tolerance:
        parts.append(
            f"绝对差={abs(row['count_diff'])} > 阈值{params.count_absolute_tolerance}"
        )
    return " | ".join(parts)


def run_verification(params: VerifyParams) -> Dict:
    """
    主验算入口，返回结构化结果字典，包含：
    - history/current/notes: 原始数据
    - outliers: 外推越界记录（已单独拎出）
    - outlier_keys
    - check_result: 正常范围内的一致性校验结果
    - failed_keys
    - params_snapshot: 参数版本快照
    """
    history, current, notes = load_inputs(params)
    outliers, outlier_keys = detect_extrapolation_outliers(current, history, params)
    check_result, failed_keys = verify_count_consistency(
        current, history, params, exclude_keys=outlier_keys
    )
    return {
        "history": history,
        "current": current,
        "notes": notes,
        "outliers": outliers,
        "outlier_keys": outlier_keys,
        "check_result": check_result,
        "failed_keys": failed_keys,
        "params_snapshot": params.to_dict(),
    }
