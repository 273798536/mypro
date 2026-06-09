import os
import warnings
import hashlib
import base64
from io import BytesIO
from typing import Optional, Dict, Tuple
import numpy as np
import matplotlib
matplotlib.use("Agg")
warnings.filterwarnings("ignore", message="Glyph .* missing from current font")
import matplotlib.pyplot as plt

plt.rcParams["axes.unicode_minus"] = False
for _font in ["Arial Unicode MS", "PingFang SC", "Heiti SC", "Microsoft YaHei", "SimHei", "DejaVu Sans"]:
    try:
        plt.rcParams["font.sans-serif"] = [_font]
        break
    except Exception:
        continue
from matplotlib.figure import Figure
from datetime import datetime
from sqlalchemy.orm import Session
from var_backtest.models import VarResult


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHART_DIR = os.path.join(BASE_DIR, "charts")
os.makedirs(CHART_DIR, exist_ok=True)


def _compute_chart_hash(fig: Figure) -> str:
    buf = BytesIO()
    fig.savefig(buf, format="png", dpi=100, bbox_inches="tight")
    data = buf.getvalue()
    return hashlib.sha256(data).hexdigest()


def generate_var_chart(
    returns: np.ndarray,
    var_value: float,
    var_lower: Optional[float] = None,
    var_upper: Optional[float] = None,
    quantile: float = 0.95,
    question_id: str = "unknown",
    is_extrapolation: bool = False,
    extrapolation_bounds_breached: bool = False,
) -> Tuple[str, str, bytes]:
    returns = np.asarray(returns, dtype=float)
    returns = returns[~np.isnan(returns)]

    fig, axes = plt.subplots(2, 1, figsize=(10, 8), gridspec_kw={"height_ratios": [2, 1]})

    ax1 = axes[0]
    sorted_ret = np.sort(returns)
    n = len(sorted_ret)
    ecdf = np.arange(1, n + 1) / n
    ax1.plot(sorted_ret, ecdf, color="#2563eb", linewidth=2, label="经验分布")
    ax1.axvline(-var_value, color="#dc2626", linestyle="--", linewidth=2, label=f"VaR ({quantile*100:.0f}%) = {var_value:.4f}")
    if var_lower is not None and var_upper is not None:
        ax1.axvspan(-var_upper, -var_lower, alpha=0.2, color="#f59e0b", label=f"95% 自助法 CI")
    ax1.set_xlabel("收益率")
    ax1.set_ylabel("累计概率")
    ax1.set_title(f"VaR 经验分布 - 题目 {question_id}")
    ax1.legend(loc="upper left")
    ax1.grid(True, alpha=0.3)

    status_texts = []
    status_colors = []
    if is_extrapolation:
        status_texts.append(f"外推模式 (样本 {n})")
        status_colors.append("#f59e0b")
        if extrapolation_bounds_breached:
            status_texts.append("外推越界 ⚠")
            status_colors.append("#dc2626")
        else:
            status_texts.append("外推合规")
            status_colors.append("#16a34a")
    else:
        status_texts.append(f"样本充足 (n={n})")
        status_colors.append("#16a34a")

    for i, (txt, color) in enumerate(zip(status_texts, status_colors)):
        ax1.text(
            0.98, 0.98 - i * 0.06, txt,
            transform=ax1.transAxes, ha="right", va="top",
            bbox=dict(boxstyle="round,pad=0.3", fc=color, alpha=0.15, ec=color),
            fontsize=10, color=color, fontweight="bold",
        )

    ax2 = axes[1]
    ax2.hist(returns, bins=50, color="#60a5fa", alpha=0.7, edgecolor="white", density=True)
    ax2.axvline(-var_value, color="#dc2626", linestyle="--", linewidth=2, label=f"VaR = {var_value:.4f}")
    if var_lower is not None and var_upper is not None:
        ax2.axvspan(-var_upper, -var_lower, alpha=0.2, color="#f59e0b")
    ax2.set_xlabel("收益率")
    ax2.set_ylabel("密度")
    ax2.set_title("收益率直方图")
    ax2.legend(loc="upper left")
    ax2.grid(True, alpha=0.3)

    fig.tight_layout()

    chart_hash = _compute_chart_hash(fig)
    filename = f"var_{question_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{chart_hash[:8]}.png"
    filepath = os.path.join(CHART_DIR, filename)
    fig.savefig(filepath, format="png", dpi=150, bbox_inches="tight")

    buf = BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    png_bytes = buf.getvalue()
    plt.close(fig)

    return filepath, chart_hash, png_bytes


def chart_to_base64(png_bytes: bytes) -> str:
    return base64.b64encode(png_bytes).decode("ascii")


def sync_chart_with_result(
    db: Session,
    var_result: VarResult,
    returns: np.ndarray,
    quantile: float = 0.95,
) -> Dict:
    filepath, chart_hash, png_bytes = generate_var_chart(
        returns=returns,
        var_value=var_result.var_value,
        var_lower=var_result.var_lower,
        var_upper=var_result.var_upper,
        quantile=quantile,
        question_id=var_result.question_external_id or "unknown",
        is_extrapolation=var_result.is_extrapolation,
        extrapolation_bounds_breached=var_result.extrapolation_bounds_breached,
    )

    old_hash = var_result.chart_hash
    hash_changed = old_hash != chart_hash

    var_result.chart_path = filepath
    var_result.chart_hash = chart_hash
    var_result.chart_generated = True
    var_result.chart_verified = not hash_changed
    var_result.updated_at = datetime.utcnow()
    db.commit()

    return {
        "chart_path": filepath,
        "chart_hash": chart_hash,
        "chart_changed": hash_changed,
        "chart_verified": var_result.chart_verified,
        "base64": chart_to_base64(png_bytes),
    }
