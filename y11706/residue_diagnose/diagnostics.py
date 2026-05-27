"""残差诊断模块。

提供以下诊断能力：
- 残差统计分析（均值、标准差、偏度、峰度）
- 异常点检测（3σ 法则 + Cook's 距离）
- 过拟合检测（R² 与调整 R² 的差异 + 残差模式）
- 残差结构性问题检测（趋势、异方差、自相关）
- 单位混用检测（数值范围异常）
"""

from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import numpy as np
from scipy import stats as scipy_stats

from .fitter import FitResult


@dataclass
class OutlierInfo:
    """异常点信息。"""

    index: int
    x_value: float
    y_value: float
    residual: float
    std_residual: float
    cooks_distance: float
    severity: str  # "mild", "moderate", "severe"


@dataclass
class DiagnosticReport:
    """诊断报告。"""

    source: str
    model_name: str
    r_squared: float
    adjusted_r_squared: float
    rmse: float

    residual_mean: float
    residual_std: float
    residual_skewness: float
    residual_kurtosis: float

    outliers: List[OutlierInfo]
    severe_outliers: List[OutlierInfo]
    outlier_dominance: bool
    outlier_dominance_ratio: float

    has_trend: bool
    trend_slope: float
    has_heteroscedasticity: bool
    heteroscedasticity_pvalue: float
    has_autocorrelation: bool
    autocorrelation_lag1: float

    is_overfitting: bool
    overfit_warning: str

    has_unit_mix: bool
    unit_mix_warning: str

    warnings: List[str]
    critical_issues: List[str]


def _detect_outliers(
    x: np.ndarray,
    y: np.ndarray,
    residuals: np.ndarray,
    leverage: np.ndarray,
    mse: float,
) -> Tuple[List[OutlierInfo], List[OutlierInfo]]:
    """检测异常点。

    使用 3σ 法则（标准化残差）和 Cook's 距离。
    """
    n = len(residuals)
    p = np.sum(leverage > 0)  # 近似参数数量
    p = max(p, 1)

    std_residuals = residuals / (np.sqrt(mse) * np.sqrt(np.maximum(1 - leverage, 1e-10)))

    cooks_d = (std_residuals**2) / p * (leverage / np.maximum(1 - leverage, 1e-10))

    outliers = []
    severe_outliers = []

    for i in range(n):
        abs_std = abs(std_residuals[i])
        severity = None

        if abs_std > 4.0 or cooks_d[i] > 4.0 / n:
            severity = "severe"
        elif abs_std > 3.0 or cooks_d[i] > 3.0 / n:
            severity = "moderate"
        elif abs_std > 2.5:
            severity = "mild"

        if severity:
            info = OutlierInfo(
                index=i,
                x_value=float(x[i]),
                y_value=float(y[i]),
                residual=float(residuals[i]),
                std_residual=float(std_residuals[i]),
                cooks_distance=float(cooks_d[i]),
                severity=severity,
            )
            outliers.append(info)
            if severity == "severe":
                severe_outliers.append(info)

    return outliers, severe_outliers


def _check_residual_trend(
    x: np.ndarray, residuals: np.ndarray, alpha: float = 0.05
) -> Tuple[bool, float]:
    """检查残差是否存在趋势（结构性问题）。"""
    if len(residuals) < 3:
        return False, 0.0

    slope, intercept, r_value, p_value, std_err = scipy_stats.linregress(
        x, residuals
    )
    has_trend = p_value < alpha
    return has_trend, float(slope)


def _check_heteroscedasticity(
    x: np.ndarray, residuals: np.ndarray, n_bins: int = 5
) -> Tuple[bool, float]:
    """检查异方差性（残差方差是否随 x 变化）。"""
    if len(residuals) < n_bins * 3:
        return False, 1.0

    sorted_idx = np.argsort(x)
    sorted_residuals = residuals[sorted_idx]

    bin_size = len(sorted_residuals) // n_bins
    variances = []
    for i in range(n_bins):
        start = i * bin_size
        end = (i + 1) * bin_size if i < n_bins - 1 else len(sorted_residuals)
        bin_res = sorted_residuals[start:end]
        variances.append(np.var(bin_res))

    variances = np.array(variances)
    if np.max(variances) < 1e-15:
        return False, 1.0

    f_stat = np.max(variances) / np.min(variances)
    df1 = bin_size - 1
    df2 = bin_size - 1
    p_value = 1 - scipy_stats.f.cdf(f_stat, df1, df2)

    has_hetero = p_value < 0.05 and f_stat > 3.0
    return has_hetero, float(p_value)


def _check_autocorrelation(residuals: np.ndarray) -> Tuple[bool, float]:
    """检查残差自相关性（Durbin-Watson 近似）。"""
    if len(residuals) < 4:
        return False, 0.0

    diff = np.diff(residuals)
    dw = np.sum(diff**2) / (np.sum(residuals**2) + 1e-15)
    lag1_autocorr = 1 - dw / 2

    has_auto = abs(lag1_autocorr) > 0.3
    return has_auto, float(lag1_autocorr)


def _check_overfitting(
    r_squared: float,
    adjusted_r_squared: float,
    n_params: int,
    n_samples: int,
    residuals: np.ndarray,
) -> Tuple[bool, str]:
    """检测过拟合。"""
    warnings = []

    r2_diff = r_squared - adjusted_r_squared
    if r2_diff > 0.05 and n_params > 2:
        warnings.append(
            f"R²({r_squared:.4f}) 与调整 R²({adjusted_r_squared:.4f}) "
            f"差异过大({r2_diff:.4f})，参数可能冗余"
        )

    if n_params > n_samples / 3:
        warnings.append(
            f"参数数量({n_params})相对样本量({n_samples})过多，"
            f"建议参数不超过样本数的 1/3"
        )

    if r_squared > 0.999 and n_params > 1:
        warnings.append(
            f"R² 过高({r_squared:.6f})，可能存在过拟合或数据过度平滑"
        )

    is_overfit = len(warnings) > 0
    overfit_warning = "; ".join(warnings) if warnings else ""
    return is_overfit, overfit_warning


def _check_unit_mix(
    x: np.ndarray, y: np.ndarray, residuals: np.ndarray
) -> Tuple[bool, str]:
    """检测单位混用（数值范围异常跳变）。"""
    warnings = []

    x_range = np.max(x) - np.min(x)
    y_range = np.max(y) - np.min(y)

    if x_range > 0 and y_range > 0:
        x_std = np.std(x)
        y_std = np.std(y)

        if x_std > 0 and y_std > 0:
            ratio = max(x_range / x_std, y_range / y_std)
            if ratio > 10:
                warnings.append(
                    f"数据范围与标准差比例过大(={ratio:.1f})，"
                    f"可能存在单位混用或量级不一致"
                )

    x_diff = np.diff(np.sort(x))
    if len(x_diff) > 0 and np.median(x_diff) > 0:
        max_jump = np.max(x_diff) / np.median(x_diff)
        if max_jump > 20:
            warnings.append(
                f"x 值存在异常跳变({max_jump:.1f}倍中位数间距)，"
                f"可能单位不一致"
            )

    y_diff = np.diff(np.sort(y))
    if len(y_diff) > 0 and np.median(y_diff) > 0:
        max_jump_y = np.max(y_diff) / np.median(y_diff)
        if max_jump_y > 20:
            warnings.append(
                f"y 值存在异常跳变({max_jump_y:.1f}倍中位数间距)，"
                f"可能单位不一致"
            )

    has_unit_mix = len(warnings) > 0
    unit_mix_warning = "; ".join(warnings) if warnings else ""
    return has_unit_mix, unit_mix_warning


def _calculate_leverage(x: np.ndarray, n_params: int) -> np.ndarray:
    """计算杠杆值（帽子矩阵对角元素的近似）。"""
    n = len(x)
    if n <= n_params:
        return np.ones(n) * n_params / n

    x_mean = np.mean(x)
    x_centered = x - x_mean
    ss_xx = np.sum(x_centered**2)
    if ss_xx < 1e-15:
        return np.ones(n) / n

    leverage = 1 / n + (x_centered**2) / ss_xx
    return np.clip(leverage, 0, 1)


def diagnose(
    result: FitResult,
    x: Optional[np.ndarray] = None,
    y: Optional[np.ndarray] = None,
    outlier_threshold: float = 2.5,
) -> DiagnosticReport:
    """生成完整的残差诊断报告。

    Args:
        result: 拟合结果
        x: 自变量数据（为 None 时从 result 获取）
        y: 因变量数据（为 None 时从 result 获取）
        outlier_threshold: 异常点阈值（标准化残差倍数）

    Returns:
        DiagnosticReport 诊断报告
    """
    if x is None:
        x = result.x_data
    if y is None:
        y = result.y_data

    if x is None or y is None:
        raise ValueError("无法获取 x 或 y 数据")

    residuals = result.residuals
    n = len(residuals)

    residual_mean = float(np.mean(residuals))
    residual_std = float(np.std(residuals, ddof=1)) if n > 1 else 0.0

    if n > 3:
        residual_skewness = float(scipy_stats.skew(residuals))
        residual_kurtosis = float(scipy_stats.kurtosis(residuals))
    else:
        residual_skewness = 0.0
        residual_kurtosis = 0.0

    leverage = _calculate_leverage(x, result.n_params)
    mse = np.mean(residuals**2)

    outliers, severe_outliers = _detect_outliers(x, y, residuals, leverage, mse)

    outlier_ratio = len(outliers) / n if n > 0 else 0
    outlier_dominance = outlier_ratio > 0.2 or len(severe_outliers) > 0

    has_trend, trend_slope = _check_residual_trend(x, residuals)
    has_hetero, hetero_p = _check_heteroscedasticity(x, residuals)
    has_auto, autocorr = _check_autocorrelation(residuals)

    is_overfit, overfit_warning = _check_overfitting(
        result.r_squared,
        result.adjusted_r_squared,
        result.n_params,
        result.n_samples,
        residuals,
    )

    has_unit_mix, unit_mix_warning = _check_unit_mix(x, y, residuals)

    warnings = []
    critical_issues = []

    if outlier_dominance:
        msg = f"异常点占比过高 ({outlier_ratio:.1%})，结果可能不可靠"
        warnings.append(msg)

    if len(severe_outliers) > 0:
        msg = f"存在 {len(severe_outliers)} 个严重异常点，主导拟合结果"
        critical_issues.append(msg)

    if has_trend:
        warnings.append(f"残差存在显著趋势(斜率={trend_slope:.4f})，模型可能遗漏重要变量")

    if has_hetero:
        warnings.append(f"残差存在异方差性(p={hetero_p:.4f})，方差估计可能不准")

    if has_auto:
        warnings.append(f"残差存在自相关(lag1={autocorr:.4f})，观测可能不独立")

    if is_overfit:
        critical_issues.append(f"过拟合警告: {overfit_warning}")

    if has_unit_mix:
        critical_issues.append(f"单位混用警告: {unit_mix_warning}")

    return DiagnosticReport(
        source=result.source,
        model_name=result.model_name,
        r_squared=result.r_squared,
        adjusted_r_squared=result.adjusted_r_squared,
        rmse=result.rmse,
        residual_mean=residual_mean,
        residual_std=residual_std,
        residual_skewness=residual_skewness,
        residual_kurtosis=residual_kurtosis,
        outliers=outliers,
        severe_outliers=severe_outliers,
        outlier_dominance=outlier_dominance,
        outlier_dominance_ratio=outlier_ratio,
        has_trend=has_trend,
        trend_slope=trend_slope,
        has_heteroscedasticity=has_hetero,
        heteroscedasticity_pvalue=hetero_p,
        has_autocorrelation=has_auto,
        autocorrelation_lag1=autocorr,
        is_overfitting=is_overfit,
        overfit_warning=overfit_warning,
        has_unit_mix=has_unit_mix,
        unit_mix_warning=unit_mix_warning,
        warnings=warnings,
        critical_issues=critical_issues,
    )