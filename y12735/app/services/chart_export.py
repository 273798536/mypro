from __future__ import annotations

import io
import warnings

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib import font_manager

from app.models import ReviewRecord


def _configure_cjk_font() -> None:
    candidates = [
        "PingFang SC",
        "Heiti SC",
        "STHeiti",
        "Hiragino Sans GB",
        "Arial Unicode MS",
        "SimHei",
        "Noto Sans CJK SC",
        "WenQuanYi Zen Hei",
    ]
    available = {f.name for f in font_manager.fontManager.ttflist}
    for name in candidates:
        if name in available:
            plt.rcParams["font.sans-serif"] = [name] + plt.rcParams.get("font.sans-serif", [])
            break
    plt.rcParams["axes.unicode_minus"] = False
    warnings.filterwarnings("ignore", message="Glyph .* missing from font")


_configure_cjk_font()


def export_fit_chart(record: ReviewRecord) -> bytes:
    if not record.fit_result:
        raise ValueError("该复核记录尚未生成拟合结果，无法导出图表。请先完成最小二乘计算。")

    fig, ax = plt.subplots(figsize=(8, 5.5))
    fit = record.fit_result

    x = np.asarray(fit.x_data, dtype=float)
    y = np.asarray(fit.y_data, dtype=float)
    y_pred = np.asarray(fit.y_predicted, dtype=float)

    usable = set(record.explanation.usable_points) if record.explanation else set(range(len(x)))
    deferred = set(record.explanation.deferred_points) if record.explanation else set()
    recollect = set(record.explanation.recollect_points) if record.explanation else set()

    def _mask(idx_set: set[int]) -> np.ndarray:
        return np.array([i in idx_set for i in range(len(x))], dtype=bool)

    if usable:
        ax.scatter(x[_mask(usable)], y[_mask(usable)], c="#2E7D32", label="可用", s=50, zorder=3)
    if deferred:
        ax.scatter(x[_mask(deferred)], y[_mask(deferred)], c="#F9A825", label="暂缓（需复核）", s=60, marker="s", zorder=4)
    if recollect:
        ax.scatter(x[_mask(recollect)], y[_mask(recollect)], c="#C62828", label="建议重新采集", s=70, marker="^", zorder=5)

    order = np.argsort(x)
    ax.plot(x[order], y_pred[order], "b-", linewidth=2, label=fit.model_formula, zorder=2)

    if record.fit_bounds:
        fb = record.fit_bounds
        if fb.x_min is not None:
            ax.axvline(fb.x_min, color="gray", linestyle="--", linewidth=1, label=f"x下限={fb.x_min:.4g}")
        if fb.x_max is not None:
            ax.axvline(fb.x_max, color="gray", linestyle=":", linewidth=1, label=f"x上限={fb.x_max:.4g}")

    explanation = record.explanation
    if explanation:
        status_text = explanation.committee_summary
        fig.text(
            0.5,
            0.01,
            status_text,
            ha="center",
            va="bottom",
            fontsize=9,
            bbox=dict(boxstyle="round,pad=0.4", facecolor="#FFF9C4", alpha=0.9),
            wrap=True,
        )

    ax.set_title(f"{record.title}  —  最小二乘异常点复核\n状态：{record.status.value} / {record.classification.value}")
    ax.set_xlabel("x")
    ax.set_ylabel("y")
    ax.legend(loc="best", fontsize=9)
    ax.grid(True, linestyle="--", alpha=0.4)

    source_info = f"来源：{record.source_file}（{', '.join(record.source_sheets)}）"
    ax.text(0.01, 0.01, source_info, transform=ax.transAxes, fontsize=8, color="gray")

    plt.tight_layout(rect=(0, 0.12, 1, 1))

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150)
    plt.close(fig)
    buf.seek(0)
    return buf.read()
