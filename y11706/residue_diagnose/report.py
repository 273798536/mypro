"""报告生成模块。

生成残差诊断图和诊断报告，支持控制台输出和文件导出。
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional

import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

from .diagnostics import DiagnosticReport, OutlierInfo
from .fitter import FitResult
from .models import MODELS, get_model


class NumpyEncoder(json.JSONEncoder):
    """处理 numpy 类型的 JSON 编码器。"""

    def default(self, obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, (np.bool_,)):
            return bool(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)

plt.rcParams["font.sans-serif"] = ["Arial Unicode MS", "SimHei", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False


def generate_residual_plots(
    result: FitResult,
    report: DiagnosticReport,
    output_dir: str,
    prefix: str = "",
) -> List[str]:
    """生成残差诊断图。

    生成:
    1. 残差 vs 拟合值 图
    2. 残差直方图（含正态分布对比）
    3. Q-Q 图
    4. 残差 vs 自变量 图

    Args:
        result: 拟合结果
        report: 诊断报告
        output_dir: 输出目录
        prefix: 文件名前缀

    Returns:
        生成的图片文件路径列表
    """
    os.makedirs(output_dir, exist_ok=True)
    generated = []

    if result.x_data is None or result.y_data is None:
        return generated

    x = result.x_data
    y = result.y_data
    y_pred = result.y_pred
    residuals = result.residuals

    model = get_model(result.model_name)
    display_name = model.display_name

    fig, axes = plt.subplots(2, 2, figsize=(14, 10))

    ax1 = axes[0, 0]
    ax1.scatter(y_pred, residuals, alpha=0.7, s=50, edgecolors="gray", linewidth=0.5)
    if report.outliers:
        outlier_y_pred = [y_pred[o.index] for o in report.outliers]
        outlier_res = [o.residual for o in report.outliers]
        ax1.scatter(
            outlier_y_pred,
            outlier_res,
            facecolors="none",
            edgecolors="red",
            linewidths=2,
            s=100,
            label="异常点",
        )
        ax1.legend(fontsize=8)
    ax1.axhline(y=0, color="black", linestyle="-", alpha=0.3)
    ax1.set_xlabel("拟合值", fontsize=11)
    ax1.set_ylabel("残差", fontsize=11)
    ax1.set_title(f"残差 vs 拟合值\n{display_name}", fontsize=12)
    ax1.grid(True, alpha=0.3)

    ax2 = axes[0, 1]
    ax2.hist(
        residuals,
        bins=min(20, len(residuals) // 2),
        density=True,
        alpha=0.7,
        color="steelblue",
        edgecolor="white",
    )
    if len(residuals) > 3:
        mu = report.residual_mean
        sigma = report.residual_std
        if sigma > 0:
            x_range = np.linspace(
                min(residuals) - 0.5 * sigma, max(residuals) + 0.5 * sigma, 100
            )
            normal_curve = (
                1
                / (sigma * np.sqrt(2 * np.pi))
                * np.exp(-0.5 * ((x_range - mu) / sigma) ** 2)
            )
            ax2.plot(
                x_range, normal_curve, "r--", linewidth=2, label="正态分布对比"
            )
            ax2.legend(fontsize=8)
    ax2.set_xlabel("残差", fontsize=11)
    ax2.set_ylabel("密度", fontsize=11)
    ax2.set_title("残差分布直方图", fontsize=12)
    ax2.grid(True, alpha=0.3)

    ax3 = axes[1, 0]
    from scipy import stats as scipy_stats

    if len(residuals) > 3:
        scipy_stats.probplot(residuals, dist="norm", plot=ax3)
    ax3.get_lines()[0].set_markerfacecolor("steelblue")
    ax3.get_lines()[0].set_markeredgecolor("steelblue")
    ax3.get_lines()[0].set_markersize(5)
    ax3.get_lines()[1].set_color("red")
    ax3.get_lines()[1].set_linestyle("--")
    ax3.set_title("Q-Q 图 (残差正态性检验)", fontsize=12)
    ax3.grid(True, alpha=0.3)

    ax4 = axes[1, 1]
    ax4.scatter(x, residuals, alpha=0.7, s=50, edgecolors="gray", linewidth=0.5)
    if report.outliers:
        outlier_x = [x[o.index] for o in report.outliers]
        outlier_res = [o.residual for o in report.outliers]
        ax4.scatter(
            outlier_x,
            outlier_res,
            facecolors="none",
            edgecolors="red",
            linewidths=2,
            s=100,
            label="异常点",
        )
        ax4.legend(fontsize=8)
    ax4.axhline(y=0, color="black", linestyle="-", alpha=0.3)
    ax4.set_xlabel("自变量 x", fontsize=11)
    ax4.set_ylabel("残差", fontsize=11)
    ax4.set_title(f"残差 vs 自变量\n{display_name}", fontsize=12)
    ax4.grid(True, alpha=0.3)

    plt.suptitle(
        f"残差诊断报告 - {result.source or '未命名数据源'}\n"
        f"R²={report.r_squared:.4f}  调整R²={report.adjusted_r_squared:.4f}  "
        f"RMSE={report.rmse:.4f}",
        fontsize=13,
        fontweight="bold",
    )
    plt.tight_layout()

    if prefix:
        filename = f"{prefix}_residual_diagnostic.png"
    else:
        filename = "residual_diagnostic.png"
    filepath = os.path.join(output_dir, filename)
    plt.savefig(filepath, dpi=150, bbox_inches="tight")
    plt.close(fig)
    generated.append(filepath)

    return generated


def generate_fit_plot(
    result: FitResult,
    report: DiagnosticReport,
    output_dir: str,
    prefix: str = "",
) -> Optional[str]:
    """生成拟合曲线与原始数据对比图。"""
    if result.x_data is None or result.y_data is None:
        return None

    os.makedirs(output_dir, exist_ok=True)

    x = result.x_data
    y = result.y_data
    y_pred = result.y_pred

    model = get_model(result.model_name)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    x_sorted_idx = np.argsort(x)
    x_sorted = x[x_sorted_idx]
    y_pred_sorted = y_pred[x_sorted_idx]

    ax1.scatter(x, y, alpha=0.7, s=50, label="原始数据", color="steelblue")
    ax1.plot(
        x_sorted, y_pred_sorted, "r-", linewidth=2, label=f"{model.display_name}拟合"
    )
    if report.outliers:
        outlier_x = [x[o.index] for o in report.outliers]
        outlier_y = [y[o.index] for o in report.outliers]
        ax1.scatter(
            outlier_x,
            outlier_y,
            facecolors="none",
            edgecolors="orange",
            linewidths=2,
            s=150,
            label="异常点",
        )
    ax1.set_xlabel("x", fontsize=12)
    ax1.set_ylabel("y", fontsize=12)
    ax1.set_title(f"拟合结果 - {model.display_name}", fontsize=13)
    ax1.legend(fontsize=9)
    ax1.grid(True, alpha=0.3)

    residuals = result.residuals
    ax2.bar(range(len(residuals)), residuals, alpha=0.7, color="steelblue")
    ax2.axhline(y=0, color="black", linestyle="-", alpha=0.3)
    ax2.axhline(y=2 * report.residual_std, color="orange", linestyle="--", alpha=0.7)
    ax2.axhline(y=-2 * report.residual_std, color="orange", linestyle="--", alpha=0.7)
    ax2.set_xlabel("样本序号", fontsize=12)
    ax2.set_ylabel("残差", fontsize=12)
    ax2.set_title("各样本残差（±2σ线）", fontsize=13)
    ax2.grid(True, alpha=0.3)

    plt.suptitle(
        f"{result.source or '未命名数据源'}\n"
        f"R²={report.r_squared:.4f}  调整R²={report.adjusted_r_squared:.4f}",
        fontsize=13,
        fontweight="bold",
    )
    plt.tight_layout()

    if prefix:
        filename = f"{prefix}_fit_comparison.png"
    else:
        filename = "fit_comparison.png"
    filepath = os.path.join(output_dir, filename)
    plt.savefig(filepath, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return filepath


def format_diagnostic_text(
    report: DiagnosticReport, result: FitResult
) -> str:
    """格式化诊断报告为可读文本。"""
    lines = []
    separator = "=" * 60

    lines.append(separator)
    lines.append(f"  残差诊断报告 - {report.source}")
    lines.append(separator)
    lines.append("")

    model = get_model(result.model_name)
    lines.append(f"【模型】{model.display_name} ({result.model_name})")
    lines.append(f"【公式】{model.description}")
    lines.append("")

    lines.append(f"【拟合参数】")
    for i, (name, val, err) in enumerate(
        zip(model.param_names, result.params, result.param_errors)
    ):
        lines.append(f"  {name}: {val:.6f} ± {err:.6f}")
    lines.append("")

    lines.append(f"【拟合优度】")
    lines.append(f"  R²        = {report.r_squared:.6f}")
    lines.append(f"  调整 R²   = {report.adjusted_r_squared:.6f}")
    lines.append(f"  RMSE      = {report.rmse:.6f}")
    lines.append("")

    lines.append(f"【残差统计】")
    lines.append(f"  均值      = {report.residual_mean:.6f}")
    lines.append(f"  标准差    = {report.residual_std:.6f}")
    lines.append(f"  偏度      = {report.residual_skewness:.6f}")
    lines.append(f"  峰度      = {report.residual_kurtosis:.6f}")
    lines.append("")

    lines.append(f"【结构诊断】")
    lines.append(f"  残差趋势: {'存在' if report.has_trend else '无'}")
    if report.has_trend:
        lines.append(f"    趋势斜率 = {report.trend_slope:.6f}")
    lines.append(
        f"  异方差性: {'存在' if report.has_heteroscedasticity else '无'}"
        f" (p={report.heteroscedasticity_pvalue:.4f})"
    )
    lines.append(
        f"  自相关性: {'存在' if report.has_autocorrelation else '无'}"
        f" (lag1={report.autocorrelation_lag1:.4f})"
    )
    lines.append("")

    lines.append(f"【异常点检测】共 {len(report.outliers)} 个异常点")
    lines.append(f"  异常点占比: {report.outlier_dominance_ratio:.1%}")
    if report.outliers:
        lines.append(f"  {'严重程度':<8} {'序号':<6} {'x':<12} {'y':<12} {'残差':<12} {'标准化残差':<12}")
        for o in report.outliers:
            lines.append(
                f"  {o.severity:<8} {o.index:<6} "
                f"{o.x_value:<12.4f} {o.y_value:<12.4f} "
                f"{o.residual:<12.4f} {o.std_residual:<12.4f}"
            )
    lines.append("")

    lines.append(f"【关键检查】")
    if report.is_overfitting:
        lines.append(f"  ⚠ 过拟合: {report.overfit_warning}")
    else:
        lines.append(f"  ✓ 过拟合: 未检测到")

    if report.has_unit_mix:
        lines.append(f"  ⚠ 单位混用: {report.unit_mix_warning}")
    else:
        lines.append(f"  ✓ 单位混用: 未检测到")

    if report.outlier_dominance:
        lines.append(f"  ⚠ 异常点主导: 异常点占比过高")
    else:
        lines.append(f"  ✓ 异常点主导: 未检测到")
    lines.append("")

    if report.warnings:
        lines.append(f"【警告】共 {len(report.warnings)} 条")
        for w in report.warnings:
            lines.append(f"  - {w}")
        lines.append("")

    if report.critical_issues:
        lines.append(f"【严重问题】共 {len(report.critical_issues)} 条")
        for c in report.critical_issues:
            lines.append(f"  !!! {c}")
        lines.append("")

    lines.append(separator)
    lines.append(f"  生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(separator)

    return "\n".join(lines)


def export_json_report(
    report: DiagnosticReport,
    result: FitResult,
    output_dir: str,
    prefix: str = "",
) -> str:
    """导出 JSON 格式的诊断报告。"""
    os.makedirs(output_dir, exist_ok=True)

    model = get_model(result.model_name)

    data = {
        "metadata": {
            "source": report.source,
            "model_name": report.model_name,
            "model_display": model.display_name,
            "model_formula": model.description,
            "generated_at": datetime.now().isoformat(),
        },
        "fit_statistics": {
            "r_squared": report.r_squared,
            "adjusted_r_squared": report.adjusted_r_squared,
            "rmse": report.rmse,
            "n_params": result.n_params,
            "n_samples": result.n_samples,
        },
        "parameters": [
            {
                "name": name,
                "value": val,
                "std_error": err,
            }
            for name, val, err in zip(
                model.param_names, result.params, result.param_errors
            )
        ],
        "residual_statistics": {
            "mean": report.residual_mean,
            "std": report.residual_std,
            "skewness": report.residual_skewness,
            "kurtosis": report.residual_kurtosis,
        },
        "structural_diagnostics": {
            "has_trend": report.has_trend,
            "trend_slope": report.trend_slope,
            "has_heteroscedasticity": report.has_heteroscedasticity,
            "heteroscedasticity_pvalue": report.heteroscedasticity_pvalue,
            "has_autocorrelation": report.has_autocorrelation,
            "autocorrelation_lag1": report.autocorrelation_lag1,
        },
        "outliers": [
            {
                "index": o.index,
                "x": o.x_value,
                "y": o.y_value,
                "residual": o.residual,
                "std_residual": o.std_residual,
                "cooks_distance": o.cooks_distance,
                "severity": o.severity,
            }
            for o in report.outliers
        ],
        "critical_checks": {
            "is_overfitting": report.is_overfitting,
            "overfit_warning": report.overfit_warning,
            "has_unit_mix": report.has_unit_mix,
            "unit_mix_warning": report.unit_mix_warning,
            "outlier_dominance": report.outlier_dominance,
            "outlier_dominance_ratio": report.outlier_dominance_ratio,
        },
        "warnings": report.warnings,
        "critical_issues": report.critical_issues,
    }

    if prefix:
        filename = f"{prefix}_diagnostic_report.json"
    else:
        filename = "diagnostic_report.json"
    filepath = os.path.join(output_dir, filename)

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, cls=NumpyEncoder)

    return filepath