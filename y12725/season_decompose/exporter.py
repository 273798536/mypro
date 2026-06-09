import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from typing import Optional
from pathlib import Path
from .decompose import DecomposeResult
from .data_loader import DataStatus


plt.rcParams["font.sans-serif"] = ["PingFang SC", "Heiti SC", "SimHei", "Arial Unicode MS", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False


STATUS_COLORS = {
    DataStatus.AVAILABLE: "#2ecc71",
    DataStatus.PENDING: "#f39c12",
    DataStatus.NEED_RECOLLECT: "#e74c3c",
}


class ChartExporter:
    def __init__(self, dpi: int = 120):
        self.dpi = dpi

    def export(
        self,
        result: DecomposeResult,
        output_path: str,
        title: str = "时间序列季节拆分",
    ) -> str:
        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)

        fig, axes = plt.subplots(4, 1, figsize=(14, 12), sharex=True)
        fig.suptitle(title, fontsize=16, fontweight="bold", y=0.98)

        status = result.status_series if result.status_series is not None else None

        self._plot_observed(axes[0], result, status)
        self._plot_trend(axes[1], result, status)
        self._plot_seasonal(axes[2], result)
        self._plot_residual(axes[3], result, status)

        self._add_legend(fig)

        for ax in axes:
            ax.grid(True, alpha=0.3, linestyle="--")

        fig.tight_layout(rect=[0, 0.06, 1, 0.96])

        fig.savefig(output, dpi=self.dpi, bbox_inches="tight")
        plt.close(fig)
        return str(output)

    def _plot_observed(
        self, ax, result: DecomposeResult, status: Optional[pd.Series]
    ):
        dates = result.dates.values
        observed = result.observed.values

        if status is not None:
            status_values = status.values
            for s in [DataStatus.AVAILABLE, DataStatus.PENDING, DataStatus.NEED_RECOLLECT]:
                mask = np.array([x == s for x in status_values])
                if mask.sum() > 0:
                    ax.scatter(
                        dates[mask], observed[mask],
                        color=STATUS_COLORS[s],
                        label=f"观测值（{s.value}）",
                        s=30, alpha=0.8, zorder=3,
                    )
        else:
            ax.scatter(dates, observed, color="#3498db", label="观测值", s=30, alpha=0.8, zorder=3)

        ax.plot(dates, observed, color="#3498db", linewidth=0.8, alpha=0.6)
        ax.set_ylabel("观测值")
        ax.legend(loc="upper left")
        ax.set_title("观测数据（含数据状态标注）", fontsize=12)

    def _plot_trend(
        self, ax, result: DecomposeResult, status: Optional[pd.Series]
    ):
        dates = result.dates.values
        trend = result.trend.values
        ax.plot(dates, trend, color="#9b59b6", linewidth=2, label="趋势")
        ax.set_ylabel("趋势")
        ax.legend(loc="upper left")
        ax.set_title("趋势分量", fontsize=12)

    def _plot_seasonal(self, ax, result: DecomposeResult):
        dates = result.dates.values
        seasonal = result.seasonal.values
        ax.plot(dates, seasonal, color="#27ae60", linewidth=1.2, label="季节")
        ax.fill_between(dates, seasonal, alpha=0.2, color="#27ae60")
        ax.axhline(y=0, color="gray", linestyle=":", alpha=0.5)
        ax.set_ylabel("季节")
        ax.legend(loc="upper left")
        ax.set_title(f"季节分量（周期={result.seasonal_period}）", fontsize=12)

    def _plot_residual(
        self, ax, result: DecomposeResult, status: Optional[pd.Series]
    ):
        dates = result.dates.values
        residual = result.residual.values

        if status is not None:
            status_values = status.values
            for s in [DataStatus.AVAILABLE, DataStatus.PENDING, DataStatus.NEED_RECOLLECT]:
                mask = np.array([x == s for x in status_values])
                if mask.sum() > 0:
                    ax.scatter(
                        dates[mask], residual[mask],
                        color=STATUS_COLORS[s],
                        s=25, alpha=0.8, zorder=3,
                    )
        else:
            ax.scatter(dates, residual, color="#e67e22", s=25, alpha=0.8, zorder=3)

        ax.axhline(y=0, color="red", linestyle="-", alpha=0.5)
        ax.set_ylabel("残差")
        ax.set_xlabel("日期")
        ax.set_title("残差分量", fontsize=12)

        ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m-%d"))
        plt.setp(ax.xaxis.get_majorticklabels(), rotation=30, ha="right")

    def _add_legend(self, fig):
        from matplotlib.patches import Patch
        legend_elements = [
            Patch(facecolor=STATUS_COLORS[DataStatus.AVAILABLE], label="可用 - 可直接使用"),
            Patch(facecolor=STATUS_COLORS[DataStatus.PENDING], label="暂缓 - 需数据分析员复核"),
            Patch(facecolor=STATUS_COLORS[DataStatus.NEED_RECOLLECT], label="需重采 - 已排除"),
        ]
        fig.legend(
            handles=legend_elements,
            loc="lower center",
            ncol=3,
            fontsize=10,
            title="数据状态说明（运营同事请注意区分）",
            title_fontsize=10,
        )


class CSVExporter:
    def export(
        self,
        result: DecomposeResult,
        output_path: str,
    ) -> str:
        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)

        df = result.full_df.copy()
        if result.status_series is not None:
            df["data_status"] = result.status_series.values
        else:
            df["data_status"] = DataStatus.AVAILABLE

        df = df.rename(columns={
            "date": "日期",
            "observed": "观测值",
            "trend": "趋势",
            "seasonal": "季节分量",
            "residual": "残差",
            "data_status": "数据状态",
        })

        df["运营提示"] = df["数据状态"].apply(self._status_hint)
        df.to_csv(output, index=False, encoding="utf-8-sig")
        return str(output)

    @staticmethod
    def _status_hint(status: DataStatus) -> str:
        if status == DataStatus.AVAILABLE:
            return "可直接使用"
        elif status == DataStatus.PENDING:
            return "找数据分析员复核"
        elif status == DataStatus.NEED_RECOLLECT:
            return "已排除，勿用"
        return ""
