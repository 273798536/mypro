"""
图表生成模块
生成物种分布统计、盐度分布、潮汐曲线等图表。
所有图表使用与地图、报告相同的处理数据，保证三者对得上。
"""
from __future__ import annotations

import os
from typing import Optional, List, Tuple

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np
import pandas as pd

from .audit_log import AuditLog


plt.rcParams["font.sans-serif"] = ["Arial Unicode MS", "SimHei", "PingFang SC", "Microsoft YaHei"]
plt.rcParams["axes.unicode_minus"] = False


class ChartGenerator:
    """图表生成器"""

    def __init__(self, audit_log: AuditLog):
        self.audit = audit_log
        self.generated_charts = []

    def generate_all(
        self,
        species_df: pd.DataFrame,
        tide_df: pd.DataFrame,
        salinity_df: pd.DataFrame,
        output_dir: str = "output/charts"
    ) -> dict:
        """生成所有图表，返回图表路径字典"""
        os.makedirs(output_dir, exist_ok=True)

        charts = {}

        species_chart = self.generate_species_count_chart(species_df, output_dir)
        if species_chart:
            charts["species_count"] = species_chart

        tide_chart = self.generate_tide_curve_chart(tide_df, species_df, output_dir)
        if tide_chart:
            charts["tide_curve"] = tide_chart

        salinity_chart = self.generate_salinity_chart(salinity_df, output_dir)
        if salinity_chart:
            charts["salinity"] = salinity_chart

        issue_chart = self.generate_issue_summary_chart(output_dir)
        if issue_chart:
            charts["issue_summary"] = issue_chart

        self.generated_charts = list(charts.values())
        return charts

    def generate_species_count_chart(
        self, species_df: pd.DataFrame, output_dir: str
    ) -> Optional[str]:
        """生成物种数量统计柱状图"""
        if species_df is None or len(species_df) == 0:
            return None

        if "species" not in species_df.columns:
            return None

        species_counts = species_df["species"].value_counts().sort_values(ascending=True)

        fig, ax = plt.subplots(figsize=(10, 6))

        colors = plt.cm.Set2(np.linspace(0, 1, len(species_counts)))
        bars = ax.barh(species_counts.index, species_counts.values, color=colors, height=0.6)

        for bar, count in zip(bars, species_counts.values):
            ax.text(
                bar.get_width() + 0.3,
                bar.get_y() + bar.get_height() / 2,
                f"{count} 处",
                va="center",
                fontsize=11,
                color="#374151"
            )

        ax.set_xlabel("观测点位数量", fontsize=12, color="#374151")
        ax.set_title("潮间带物种分布数量统计", fontsize=14, fontweight="bold", color="#1f2937", pad=15)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.grid(axis="x", alpha=0.3)

        record_count = len(self.audit.records)
        fig.text(
            0.99, 0.01,
            f"数据来源：处理后数据 · 共 {len(species_df)} 条记录 · 处理日志 {record_count} 条",
            ha="right", fontsize=9, color="#9ca3af"
        )

        plt.tight_layout()

        output_path = os.path.join(output_dir, "species_count.png")
        fig.savefig(output_path, dpi=150, bbox_inches="tight", facecolor="white")
        plt.close(fig)

        return output_path

    def generate_tide_curve_chart(
        self,
        tide_df: pd.DataFrame,
        species_df: pd.DataFrame,
        output_dir: str
    ) -> Optional[str]:
        """生成潮汐曲线图，叠加物种观测点"""
        if tide_df is None or len(tide_df) == 0:
            return None

        time_col = None
        for col in ["datetime_utc8", "datetime", "time"]:
            if col in tide_df.columns and col == "datetime_utc8":
                time_col = col
                break
            elif col in tide_df.columns:
                time_col = col

        if time_col is None or "height" not in tide_df.columns:
            return None

        fig, ax = plt.subplots(figsize=(12, 6))

        tide_times = tide_df[time_col].dropna()
        tide_heights = tide_df.loc[tide_times.index, "height"]

        if pd.api.types.is_datetime64_any_dtype(tide_times):
            times_plot = tide_times
        else:
            times_plot = pd.to_datetime(tide_times, errors="coerce")

        valid_mask = ~times_plot.isna()
        times_plot = times_plot[valid_mask]
        heights_plot = tide_heights[valid_mask]

        if len(times_plot) == 0:
            return None

        ax.plot(
            times_plot, heights_plot,
            color="#0ea5e9", linewidth=2.5,
            marker="o", markersize=4,
            label="潮汐水位"
        )

        if species_df is not None and "survey_datetime_utc8" in species_df.columns:
            species_with_tide = species_df.dropna(subset=["survey_datetime_utc8", "tide_height_at_survey"])
            if len(species_with_tide) > 0:
                species_times = species_with_tide["survey_datetime_utc8"]
                species_heights = species_with_tide["tide_height_at_survey"]

                species_list = species_with_tide["species"].unique()
                markers = ["*", "s", "D", "^", "v", "p"]

                for i, sp in enumerate(species_list[:6]):
                    sp_data = species_with_tide[species_with_tide["species"] == sp]
                    ax.scatter(
                        sp_data["survey_datetime_utc8"],
                        sp_data["tide_height_at_survey"],
                        marker=markers[i % len(markers)],
                        s=80, zorder=5,
                        label=f"{sp} 观测点",
                        alpha=0.8
                    )

        ax.set_xlabel("时间 (UTC+8)", fontsize=12, color="#374151")
        ax.set_ylabel("潮位高度 (cm)", fontsize=12, color="#374151")
        ax.set_title("潮汐水位曲线与物种观测点对照", fontsize=14, fontweight="bold", color="#1f2937", pad=15)
        ax.legend(loc="upper right", fontsize=10)
        ax.grid(True, alpha=0.3)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)

        if pd.api.types.is_datetime64_any_dtype(times_plot):
            ax.xaxis.set_major_formatter(mdates.DateFormatter("%m-%d %H:%M"))
            plt.xticks(rotation=30)

        fig.text(
            0.99, 0.01,
            f"潮汐数据共 {len(tide_df)} 条 · 物种观测 {len(species_df) if species_df is not None else 0} 条",
            ha="right", fontsize=9, color="#9ca3af"
        )

        plt.tight_layout()

        output_path = os.path.join(output_dir, "tide_curve.png")
        fig.savefig(output_path, dpi=150, bbox_inches="tight", facecolor="white")
        plt.close(fig)

        return output_path

    def generate_salinity_chart(
        self, salinity_df: pd.DataFrame, output_dir: str
    ) -> Optional[str]:
        """生成盐度分布图，标注单位转换情况"""
        if salinity_df is None or len(salinity_df) == 0:
            return None

        fig, axes = plt.subplots(1, 2, figsize=(14, 5))

        ax1 = axes[0]
        if "original_unit" in salinity_df.columns:
            unit_counts = salinity_df["original_unit"].value_counts()
            if len(unit_counts) > 0:
                colors = plt.cm.Set3(np.linspace(0, 1, len(unit_counts)))
                wedges, texts, autotexts = ax1.pie(
                    unit_counts.values,
                    labels=unit_counts.index,
                    autopct="%1.1f%%",
                    colors=colors,
                    startangle=90
                )
                ax1.set_title("原始盐度单位分布", fontsize=12, fontweight="bold", color="#1f2937")
            else:
                ax1.text(0.5, 0.5, "无单位信息", ha="center", va="center", color="#9ca3af")
                ax1.set_title("原始盐度单位分布", fontsize=12, fontweight="bold", color="#1f2937")
        else:
            ax1.text(0.5, 0.5, "无单位信息", ha="center", va="center", color="#9ca3af")
            ax1.set_title("原始盐度单位分布", fontsize=12, fontweight="bold", color="#1f2937")

        ax2 = axes[1]
        salinity_col = "salinity_psu" if "salinity_psu" in salinity_df.columns else "salinity" if "salinity" in salinity_df.columns else "value"

        if salinity_col in salinity_df.columns:
            sal_vals = pd.to_numeric(salinity_df[salinity_col], errors="coerce").dropna()
            if len(sal_vals) > 0:
                ax2.hist(sal_vals, bins=15, color="#10b981", edgecolor="white", alpha=0.8)
                ax2.axvline(sal_vals.mean(), color="#ef4444", linestyle="--", linewidth=2,
                           label=f"均值: {sal_vals.mean():.1f} psu")
                ax2.set_xlabel("盐度 (psu)", fontsize=11, color="#374151")
                ax2.set_ylabel("频次", fontsize=11, color="#374151")
                ax2.set_title("盐度分布直方图 (统一为 psu)", fontsize=12, fontweight="bold", color="#1f2937")
                ax2.legend()
                ax2.grid(axis="y", alpha=0.3)
                ax2.spines["top"].set_visible(False)
                ax2.spines["right"].set_visible(False)

        plt.tight_layout()

        output_path = os.path.join(output_dir, "salinity_distribution.png")
        fig.savefig(output_path, dpi=150, bbox_inches="tight", facecolor="white")
        plt.close(fig)

        return output_path

    def generate_issue_summary_chart(self, output_dir: str) -> Optional[str]:
        """生成校验问题统计图表"""
        issues = self.audit.issues
        if not issues:
            return None

        fig, axes = plt.subplots(1, 2, figsize=(12, 5))

        ax1 = axes[0]
        severity_counts = {}
        for issue in issues:
            sev = issue.severity
            severity_counts[sev] = severity_counts.get(sev, 0) + 1

        severities = sorted(severity_counts.keys())
        counts = [severity_counts[s] for s in severities]
        colors_map = {"error": "#ef4444", "warning": "#f59e0b", "info": "#3b82f6"}
        bar_colors = [colors_map.get(s, "#9ca3af") for s in severities]

        bars = ax1.bar(severities, counts, color=bar_colors, width=0.5)
        for bar, count in zip(bars, counts):
            ax1.text(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height() + 0.1,
                str(count),
                ha="center", fontsize=11, color="#374151"
            )

        ax1.set_title("校验问题严重程度分布", fontsize=12, fontweight="bold", color="#1f2937")
        ax1.set_ylabel("问题数量", fontsize=11, color="#374151")
        ax1.spines["top"].set_visible(False)
        ax1.spines["right"].set_visible(False)
        ax1.grid(axis="y", alpha=0.3)

        ax2 = axes[1]
        type_counts = {}
        for issue in issues:
            t = issue.issue_type
            type_counts[t] = type_counts.get(t, 0) + 1

        types = sorted(type_counts.keys(), key=lambda x: type_counts[x], reverse=True)
        type_counts_list = [type_counts[t] for t in types]

        y_pos = range(len(types))
        ax2.barh(list(y_pos), type_counts_list, color="#60a5fa", height=0.6)
        ax2.set_yticks(list(y_pos))
        ax2.set_yticklabels(types, fontsize=10)
        ax2.invert_yaxis()
        ax2.set_title("校验问题类型分布", fontsize=12, fontweight="bold", color="#1f2937")
        ax2.set_xlabel("问题数量", fontsize=11, color="#374151")
        ax2.spines["top"].set_visible(False)
        ax2.spines["right"].set_visible(False)
        ax2.grid(axis="x", alpha=0.3)

        for i, count in enumerate(type_counts_list):
            ax2.text(count + 0.1, i, str(count), va="center", fontsize=10, color="#374151")

        plt.tight_layout()

        output_path = os.path.join(output_dir, "issue_summary.png")
        fig.savefig(output_path, dpi=150, bbox_inches="tight", facecolor="white")
        plt.close(fig)

        return output_path
