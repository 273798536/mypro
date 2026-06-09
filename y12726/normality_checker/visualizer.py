from __future__ import annotations

import io
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from matplotlib.figure import Figure
from scipy import stats

from .core import CombinedTestResult
from .data_processor import ProcessedData


@dataclass
class VisualizationResult:
    dataset_name: str
    figure_map: Dict[str, Figure] = field(default_factory=dict)
    failed_figures: List[str] = field(default_factory=list)
    error_messages: Dict[str, str] = field(default_factory=dict)

    @property
    def success_count(self) -> int:
        return len(self.figure_map)

    @property
    def fail_count(self) -> int:
        return len(self.failed_figures)

    def get_figure(self, name: str) -> Optional[Figure]:
        return self.figure_map.get(name)

    def list_figures(self) -> List[str]:
        return list(self.figure_map.keys())

    def close_all(self):
        for fig in self.figure_map.values():
            plt.close(fig)
        self.figure_map.clear()


class NormalityVisualizer:
    def __init__(
        self,
        style: str = "seaborn-v0_8-whitegrid",
        figure_size: Tuple[int, int] = (10, 7),
        dpi: int = 120,
        colors: Optional[Dict] = None,
    ):
        plt.style.use(style)
        self.figure_size = figure_size
        self.dpi = dpi
        self.colors = colors or {
            "before": "#E74C3C",
            "after": "#2ECC71",
            "normal_curve": "#3498DB",
            "outlier": "#F39C12",
            "box": "#9B59B6",
        }

    def _safe_render(
        self,
        fig_name: str,
        vis_result: VisualizationResult,
        render_fn,
    ):
        try:
            fig = render_fn()
            if fig is not None:
                vis_result.figure_map[fig_name] = fig
        except Exception as e:
            vis_result.failed_figures.append(fig_name)
            vis_result.error_messages[fig_name] = str(e)

    def _plot_histogram(
        self,
        data: np.ndarray,
        title: str,
        color: str,
        show_normal: bool = True,
    ) -> Figure:
        fig, ax = plt.subplots(figsize=self.figure_size, dpi=self.dpi)

        if len(data) == 0:
            ax.text(
                0.5, 0.5,
                "无数据可绘制",
                ha="center", va="center", fontsize=14,
                transform=ax.transAxes,
            )
            ax.set_title(title)
            return fig

        ax.hist(
            data,
            bins="auto",
            density=True,
            alpha=0.7,
            color=color,
            edgecolor="white",
            label="数据分布",
        )

        if show_normal and len(data) >= 2 and np.std(data) > 0:
            mu, sigma = np.mean(data), np.std(data, ddof=1)
            xmin, xmax = ax.get_xlim()
            x = np.linspace(xmin, xmax, 100)
            p = stats.norm.pdf(x, mu, sigma)
            ax.plot(
                x, p,
                self.colors["normal_curve"],
                linewidth=2,
                label=f"正态拟合 N({mu:.2f}, {sigma:.2f}²)",
            )

        ax.set_title(title, fontsize=13, fontweight="bold")
        ax.set_xlabel("数值")
        ax.set_ylabel("密度")
        ax.legend()
        ax.grid(True, alpha=0.3)
        fig.tight_layout()
        return fig

    def _plot_qq(
        self,
        data: np.ndarray,
        title: str,
        color: str,
    ) -> Figure:
        fig, ax = plt.subplots(figsize=self.figure_size, dpi=self.dpi)

        if len(data) < 3:
            ax.text(
                0.5, 0.5,
                f"样本量不足（需≥3，实际{len(data)}）",
                ha="center", va="center", fontsize=14,
                transform=ax.transAxes,
            )
            ax.set_title(title)
            return fig

        if np.std(data) == 0:
            ax.text(
                0.5, 0.5,
                "数据标准差为0，无法绘制Q-Q图",
                ha="center", va="center", fontsize=14,
                transform=ax.transAxes,
            )
            ax.set_title(title)
            return fig

        stats.probplot(data, dist="norm", plot=ax)
        ax.get_lines()[0].set_markerfacecolor(color)
        ax.get_lines()[0].set_markeredgecolor(color)
        ax.get_lines()[0].set_alpha(0.7)
        if len(ax.get_lines()) > 1:
            ax.get_lines()[1].set_color(self.colors["normal_curve"])
            ax.get_lines()[1].set_linewidth(2)

        ax.set_title(title, fontsize=13, fontweight="bold")
        ax.grid(True, alpha=0.3)
        fig.tight_layout()
        return fig

    def _plot_boxplot(
        self,
        data: np.ndarray,
        title: str,
        color: str,
        outlier_indices: Optional[List[int]] = None,
    ) -> Figure:
        fig, ax = plt.subplots(figsize=self.figure_size, dpi=self.dpi)

        if len(data) == 0:
            ax.text(
                0.5, 0.5,
                "无数据可绘制",
                ha="center", va="center", fontsize=14,
                transform=ax.transAxes,
            )
            ax.set_title(title)
            return fig

        box = ax.boxplot(
            data,
            vert=True,
            patch_artist=True,
            labels=["数据"],
            showmeans=True,
            meanprops={"marker": "D", "markerfacecolor": self.colors["outlier"]},
        )

        for patch in box["boxes"]:
            patch.set_facecolor(color)
            patch.set_alpha(0.7)

        for flier in box["fliers"]:
            flier.set_markerfacecolor(self.colors["outlier"])
            flier.set_markeredgecolor(self.colors["outlier"])

        if outlier_indices:
            ymin, ymax = ax.get_ylim()
            ax.text(
                1, ymax * 0.98,
                f"检测到{len(outlier_indices)}个异常值\n(IQR×{1.5})",
                ha="center", va="top", fontsize=10,
                bbox=dict(boxstyle="round", facecolor=self.colors["outlier"], alpha=0.2),
            )

        ax.set_title(title, fontsize=13, fontweight="bold")
        ax.set_ylabel("数值")
        ax.grid(True, axis="y", alpha=0.3)
        fig.tight_layout()
        return fig

    def _plot_comparison(
        self,
        before_data: Optional[np.ndarray],
        after_data: np.ndarray,
        title: str,
    ) -> Figure:
        fig, axes = plt.subplots(1, 2, figsize=(14, 6), dpi=self.dpi)

        before_valid = before_data is not None and len(before_data) > 0
        after_valid = after_data is not None and len(after_data) > 0

        if before_valid and np.std(before_data) > 0:
            axes[0].hist(
                before_data, bins="auto", density=True,
                alpha=0.7, color=self.colors["before"],
                edgecolor="white",
            )
            mu, sigma = np.mean(before_data), np.std(before_data, ddof=1)
            xmin, xmax = axes[0].get_xlim()
            x = np.linspace(xmin, xmax, 100)
            axes[0].plot(
                x, stats.norm.pdf(x, mu, sigma),
                self.colors["normal_curve"], linewidth=2,
            )
            axes[0].set_title(
                f"清洗前 (n={len(before_data)})\n偏度={stats.skew(before_data):.2f}, 峰度={stats.kurtosis(before_data):.2f}",
                fontsize=11, fontweight="bold",
            )
        else:
            axes[0].text(
                0.5, 0.5,
                "无有效数据" if not before_valid else "标准差为0",
                ha="center", va="center", fontsize=12,
                transform=axes[0].transAxes,
            )
            axes[0].set_title("清洗前", fontsize=11, fontweight="bold")

        if after_valid and np.std(after_data) > 0:
            axes[1].hist(
                after_data, bins="auto", density=True,
                alpha=0.7, color=self.colors["after"],
                edgecolor="white",
            )
            mu, sigma = np.mean(after_data), np.std(after_data, ddof=1)
            xmin, xmax = axes[1].get_xlim()
            x = np.linspace(xmin, xmax, 100)
            axes[1].plot(
                x, stats.norm.pdf(x, mu, sigma),
                self.colors["normal_curve"], linewidth=2,
            )
            axes[1].set_title(
                f"清洗后 (n={len(after_data)})\n偏度={stats.skew(after_data):.2f}, 峰度={stats.kurtosis(after_data):.2f}",
                fontsize=11, fontweight="bold",
            )
        else:
            axes[1].text(
                0.5, 0.5,
                "无有效数据" if not after_valid else "标准差为0",
                ha="center", va="center", fontsize=12,
                transform=axes[1].transAxes,
            )
            axes[1].set_title("清洗后", fontsize=11, fontweight="bold")

        for ax in axes:
            ax.set_xlabel("数值")
            ax.set_ylabel("密度")
            ax.grid(True, alpha=0.3)

        fig.suptitle(title, fontsize=14, fontweight="bold", y=1.02)
        fig.tight_layout()
        return fig

    def _plot_qq_comparison(
        self,
        before_data: Optional[np.ndarray],
        after_data: np.ndarray,
        title: str,
    ) -> Figure:
        fig, axes = plt.subplots(1, 2, figsize=(14, 6), dpi=self.dpi)

        before_valid = before_data is not None and len(before_data) >= 3 and np.std(before_data) > 0
        after_valid = after_data is not None and len(after_data) >= 3 and np.std(after_data) > 0

        if before_valid:
            stats.probplot(before_data, dist="norm", plot=axes[0])
            axes[0].get_lines()[0].set_markerfacecolor(self.colors["before"])
            axes[0].get_lines()[0].set_markeredgecolor(self.colors["before"])
            axes[0].get_lines()[0].set_alpha(0.7)
            if len(axes[0].get_lines()) > 1:
                axes[0].get_lines()[1].set_color(self.colors["normal_curve"])
                axes[0].get_lines()[1].set_linewidth(2)
            axes[0].set_title(
                f"清洗前 Q-Q图 (n={len(before_data)})",
                fontsize=11, fontweight="bold",
            )
        else:
            axes[0].text(
                0.5, 0.5,
                "无有效数据或样本不足",
                ha="center", va="center", fontsize=12,
                transform=axes[0].transAxes,
            )
            axes[0].set_title("清洗前 Q-Q图", fontsize=11, fontweight="bold")

        if after_valid:
            stats.probplot(after_data, dist="norm", plot=axes[1])
            axes[1].get_lines()[0].set_markerfacecolor(self.colors["after"])
            axes[1].get_lines()[0].set_markeredgecolor(self.colors["after"])
            axes[1].get_lines()[0].set_alpha(0.7)
            if len(axes[1].get_lines()) > 1:
                axes[1].get_lines()[1].set_color(self.colors["normal_curve"])
                axes[1].get_lines()[1].set_linewidth(2)
            axes[1].set_title(
                f"清洗后 Q-Q图 (n={len(after_data)})",
                fontsize=11, fontweight="bold",
            )
        else:
            axes[1].text(
                0.5, 0.5,
                "无有效数据或样本不足",
                ha="center", va="center", fontsize=12,
                transform=axes[1].transAxes,
            )
            axes[1].set_title("清洗后 Q-Q图", fontsize=11, fontweight="bold")

        for ax in axes:
            ax.grid(True, alpha=0.3)

        fig.suptitle(title, fontsize=14, fontweight="bold", y=1.02)
        fig.tight_layout()
        return fig

    def generate_all(
        self,
        processed: ProcessedData,
        test_result: Optional[CombinedTestResult] = None,
        include_comparison: bool = True,
    ) -> VisualizationResult:
        vis = VisualizationResult(dataset_name=processed.dataset_name)

        if processed.is_empty or processed.cleaned_data is None:
            msg = processed.issues[0] if processed.issues else "数据为空"
            fig_empty, ax = plt.subplots(figsize=self.figure_size, dpi=self.dpi)
            ax.text(
                0.5, 0.5,
                f"【{processed.dataset_name}】\n\n数据为空，无法生成图表\n\n原因: {msg}\n\n来源材料: {processed.source_material}",
                ha="center", va="center", fontsize=13,
                transform=ax.transAxes,
                bbox=dict(boxstyle="round", facecolor="#FDEDEC", alpha=0.8),
            )
            ax.set_axis_off()
            fig_empty.tight_layout()
            vis.figure_map["数据状态说明"] = fig_empty
            vis.failed_figures.append("直方图（数据为空）")
            vis.failed_figures.append("Q-Q图（数据为空）")
            vis.failed_figures.append("箱线图（数据为空）")
            return vis

        self._safe_render(
            "直方图-清洗后", vis,
            lambda: self._plot_histogram(
                processed.cleaned_data,
                f"{processed.dataset_name} - 直方图（清洗后）\n来源: {processed.source_material}",
                self.colors["after"],
            ),
        )

        self._safe_render(
            "Q-Q图-清洗后", vis,
            lambda: self._plot_qq(
                processed.cleaned_data,
                f"{processed.dataset_name} - Q-Q图（清洗后）\n来源: {processed.source_material}",
                self.colors["after"],
            ),
        )

        self._safe_render(
            "箱线图-清洗后", vis,
            lambda: self._plot_boxplot(
                processed.cleaned_data,
                f"{processed.dataset_name} - 箱线图（清洗后）\n来源: {processed.source_material}",
                self.colors["after"],
                processed.outlier_indices,
            ),
        )

        if include_comparison:
            self._safe_render(
                "直方图-清洗前后对比", vis,
                lambda: self._plot_comparison(
                    processed.raw_data,
                    processed.cleaned_data,
                    f"{processed.dataset_name} - 分布对比（清洗前 vs 后）\n来源: {processed.source_material}",
                ),
            )

            self._safe_render(
                "Q-Q图-清洗前后对比", vis,
                lambda: self._plot_qq_comparison(
                    processed.raw_data,
                    processed.cleaned_data,
                    f"{processed.dataset_name} - Q-Q图对比（清洗前 vs 后）\n来源: {processed.source_material}",
                ),
            )

        if test_result is not None:
            self._safe_render(
                "检验结论总览", vis,
                lambda: self._plot_verdict_summary(processed, test_result),
            )

        return vis

    def _plot_verdict_summary(
        self,
        processed: ProcessedData,
        test_result: CombinedTestResult,
    ) -> Figure:
        fig, ax = plt.subplots(figsize=(12, 7), dpi=self.dpi)

        ax.set_axis_off()

        verdict_color = {
            "正态": "#2ECC71",
            "非正态": "#E74C3C",
            "无法判断": "#F39C12",
            "跳过": "#95A5A6",
            "错误": "#E67E22",
        }

        v_color = verdict_color.get(test_result.overall_verdict.value, "#34495E")

        header_text = f"{processed.dataset_name} - 正态性检验结论总览"
        ax.text(
            0.5, 0.95, header_text,
            ha="center", va="top", fontsize=16, fontweight="bold",
            transform=ax.transAxes,
        )

        verdict_text = f"总体结论: {test_result.overall_verdict.value}"
        ax.text(
            0.5, 0.85, verdict_text,
            ha="center", va="center", fontsize=22, fontweight="bold",
            color=v_color,
            bbox=dict(boxstyle="round", facecolor=v_color, alpha=0.15),
            transform=ax.transAxes,
        )

        info_lines = [
            f"置信度: {test_result.overall_confidence:.1%}",
            f"样本量（清洗后）: {processed.n_clean}",
            f"来源材料: {processed.source_material}",
            f"成功检验: {test_result.n_tests_run} | 跳过: {test_result.n_tests_skipped} | 错误: {test_result.n_tests_error}",
        ]
        for i, line in enumerate(info_lines):
            ax.text(
                0.05, 0.75 - i * 0.05, line,
                ha="left", va="center", fontsize=12,
                transform=ax.transAxes,
            )

        y_start = 0.45
        ax.text(
            0.05, y_start + 0.05, "各检验方法详情:",
            ha="left", va="center", fontsize=13, fontweight="bold",
            transform=ax.transAxes,
        )

        for i, tr in enumerate(test_result.individual_results):
            tc = verdict_color.get(tr.verdict.value, "#7F8C8D")
            row_y = y_start - i * 0.06
            p_str = f"P={tr.p_value:.4f}" if tr.p_value is not None else "P=--"
            s_str = f"W={tr.statistic:.4f}" if tr.statistic is not None else "W=--"
            ax.text(
                0.05, row_y,
                f"  ● {tr.test_name}:",
                ha="left", va="center", fontsize=11,
                transform=ax.transAxes,
            )
            ax.text(
                0.45, row_y,
                f"{s_str}, {p_str}",
                ha="left", va="center", fontsize=11,
                transform=ax.transAxes,
            )
            ax.text(
                0.72, row_y, tr.verdict.value,
                ha="center", va="center", fontsize=11, fontweight="bold",
                color="white",
                bbox=dict(boxstyle="round,pad=0.3", facecolor=tc),
                transform=ax.transAxes,
            )

        if test_result.issues or test_result.gap_items:
            note_y = 0.05
            all_notes = test_result.issues + test_result.gap_items
            ax.text(
                0.05, note_y + 0.05, "注意事项 / 材料缺口:",
                ha="left", va="center", fontsize=12, fontweight="bold",
                color="#C0392B",
                transform=ax.transAxes,
            )
            for i, note in enumerate(all_notes[:3]):
                ax.text(
                    0.05, note_y - i * 0.04,
                    f"  - {note}",
                    ha="left", va="center", fontsize=10,
                    color="#7F8C8D",
                    transform=ax.transAxes,
                )
            if len(all_notes) > 3:
                ax.text(
                    0.05, note_y - 3 * 0.04,
                    f"  ... 另有{len(all_notes) - 3}项，详见Excel报告",
                    ha="left", va="center", fontsize=10,
                    color="#7F8C8D",
                    transform=ax.transAxes,
                )

        fig.tight_layout()
        return fig

    def save_figure(
        self,
        fig: Figure,
        filepath: str,
        fmt: str = "png",
    ) -> str:
        os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
        if not filepath.lower().endswith(f".{fmt}"):
            filepath = f"{filepath}.{fmt}"
        fig.savefig(filepath, format=fmt, bbox_inches="tight", dpi=self.dpi)
        return filepath

    def save_all(
        self,
        vis_result: VisualizationResult,
        output_dir: str,
        fmt: str = "png",
    ) -> Tuple[List[str], List[str]]:
        os.makedirs(output_dir, exist_ok=True)
        saved: List[str] = []
        failed: List[str] = []

        for name, fig in vis_result.figure_map.items():
            safe_name = name.replace("/", "_").replace("\\", "_")
            filepath = os.path.join(output_dir, f"{vis_result.dataset_name}_{safe_name}.{fmt}")
            try:
                self.save_figure(fig, filepath, fmt)
                saved.append(filepath)
            except Exception as e:
                failed.append(f"{name}: {e}")

        for name in vis_result.failed_figures:
            failed.append(f"[生成失败] {name}: {vis_result.error_messages.get(name, '未知错误')}")

        return saved, failed

    def figure_to_bytes(
        self,
        fig: Figure,
        fmt: str = "png",
    ) -> bytes:
        buf = io.BytesIO()
        fig.savefig(buf, format=fmt, bbox_inches="tight", dpi=self.dpi)
        buf.seek(0)
        return buf.read()
