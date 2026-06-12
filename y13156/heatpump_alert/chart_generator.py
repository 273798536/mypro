"""图表生成模块：与明细数据共用同一口径。"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
from typing import Dict

plt.rcParams["font.sans-serif"] = ["Arial Unicode MS", "SimHei", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False


def generate_charts(output_dirs: Dict[str, str], details_df: pd.DataFrame,
                    summary: Dict) -> Dict[str, str]:
    """生成所有图表，返回图表路径映射。

    重要：图表只使用「是否纳入统计」的有效数据，与明细口径完全一致。
    """
    charts = {}
    valid_df = details_df[details_df["是否纳入统计"]].copy()

    chart1 = _plot_cop_by_device(output_dirs["charts"], valid_df)
    charts["设备COP对比图"] = chart1

    chart2 = _plot_alert_pie(output_dirs["charts"], summary)
    charts["预警分布饼图"] = chart2

    chart3 = _plot_temp_trend(output_dirs["charts"], valid_df)
    charts["出水温度趋势图"] = chart3

    return charts


def _plot_cop_by_device(charts_dir: str, valid_df: pd.DataFrame) -> str:
    """各设备 COP 箱线图。"""
    if valid_df.empty or "COP" not in valid_df.columns:
        return ""

    devices = valid_df["设备编号"].unique()
    data_by_device = [valid_df[valid_df["设备编号"] == d]["COP"].dropna().values for d in devices]

    fig, ax = plt.subplots(figsize=(10, 6))
    bp = ax.boxplot(data_by_device, labels=[str(d) for d in devices], patch_artist=True)
    for patch in bp["boxes"]:
        patch.set_facecolor("#4C8BF5")
    for median in bp["medians"]:
        median.set_color("#FF6B6B")
        median.set_linewidth(2)

    ax.set_title("各设备 COP 分布（仅有效样本）", fontsize=14, fontweight="bold")
    ax.set_ylabel("COP")
    ax.set_xlabel("设备编号")
    ax.grid(axis="y", alpha=0.3)
    ax.axhline(y=3.5, color="green", linestyle="--", alpha=0.7, label="COP参考下限")
    ax.legend()

    filepath = os.path.join(charts_dir, "cop_by_device.png")
    fig.tight_layout()
    fig.savefig(filepath, dpi=150)
    plt.close(fig)
    return filepath


def _plot_alert_pie(charts_dir: str, summary: Dict) -> str:
    """结果分布饼图（正常/预警/坏数据/采样缺口/无铭牌）。"""
    labels = ["正常", "预警", "坏数据", "采样缺口", "无铭牌数据"]
    sizes = [
        summary["正常样本数"],
        summary["预警样本数"],
        summary["坏数据数"],
        summary["采样缺口数"],
        summary["无铭牌数据数"],
    ]
    colors = ["#52C41A", "#FAAD14", "#FF4D4F", "#1890FF", "#722ED1"]

    total = sum(sizes)
    if total == 0:
        return ""

    sizes = [s for s in sizes if s > 0]
    labels_filtered = [labels[i] for i, s in enumerate([
        summary["正常样本数"], summary["预警样本数"], summary["坏数据数"],
        summary["采样缺口数"], summary["无铭牌数据数"]
    ]) if s > 0]
    colors_filtered = [colors[i] for i, s in enumerate([
        summary["正常样本数"], summary["预警样本数"], summary["坏数据数"],
        summary["采样缺口数"], summary["无铭牌数据数"]
    ]) if s > 0]

    fig, ax = plt.subplots(figsize=(8, 8))
    wedges, texts, autotexts = ax.pie(
        sizes, labels=labels_filtered, colors=colors_filtered,
        autopct="%1.1f%%", startangle=90,
        textprops={"fontsize": 11}
    )
    ax.set_title("样本结果分布（全量口径）", fontsize=14, fontweight="bold")

    filepath = os.path.join(charts_dir, "alert_distribution.png")
    fig.tight_layout()
    fig.savefig(filepath, dpi=150)
    plt.close(fig)
    return filepath


def _plot_temp_trend(charts_dir: str, valid_df: pd.DataFrame) -> str:
    """出水温度趋势散点图（按设备着色）。"""
    if valid_df.empty or "出水温度(℃)" not in valid_df.columns:
        return ""

    fig, ax = plt.subplots(figsize=(12, 6))
    devices = valid_df["设备编号"].unique()
    colors = plt.cm.tab10.colors

    for i, device in enumerate(devices):
        dev_df = valid_df[valid_df["设备编号"] == device]
        if "采样时间" in dev_df.columns and dev_df["采样时间"].notna().any():
            ax.plot(dev_df["采样时间"], dev_df["出水温度(℃)"],
                    "o-", label=str(device), color=colors[i % len(colors)],
                    markersize=4, linewidth=1)
        else:
            ax.plot(range(len(dev_df)), dev_df["出水温度(℃)"],
                    "o-", label=str(device), color=colors[i % len(colors)],
                    markersize=4, linewidth=1)

    ax.set_title("出水温度趋势（仅有效样本）", fontsize=14, fontweight="bold")
    ax.set_ylabel("出水温度 (℃)")
    ax.set_xlabel("采样时间/序号")
    ax.legend(title="设备")
    ax.grid(alpha=0.3)

    filepath = os.path.join(charts_dir, "water_temp_trend.png")
    fig.tight_layout()
    fig.savefig(filepath, dpi=150)
    plt.close(fig)
    return filepath
