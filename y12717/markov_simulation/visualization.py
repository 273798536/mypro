"""可视化模块

所有图表都从 ProcessingRecord 读取结果，确保和报告中的表格、
文字说明基于同一份数据。
"""

from __future__ import annotations

import os
from typing import Optional

import matplotlib
matplotlib.use("Agg")  # 无显示环境也能出图
import matplotlib.pyplot as plt
import numpy as np
import networkx as nx

from .records import ProcessingRecord

# 中文显示：尽量配置中文字体，不报错
plt.rcParams["font.sans-serif"] = [
    "PingFang SC", "Heiti SC", "Microsoft YaHei",
    "Noto Sans CJK SC", "SimHei", "Arial Unicode MS",
]
plt.rcParams["axes.unicode_minus"] = False


class MarkovVisualizer:
    """基于 ProcessingRecord 出图"""

    def __init__(self, out_dir: str = "output/figures") -> None:
        self.out_dir = out_dir
        os.makedirs(out_dir, exist_ok=True)

    # ------------------------------------------------------------------
    # 分布随时间演化折线图
    # ------------------------------------------------------------------
    def plot_distribution_series(
        self,
        rec: ProcessingRecord,
        filename: Optional[str] = None,
    ) -> str:
        df = rec.distribution_df()
        if df is None:
            raise ValueError(f"记录 {rec.record_id} 没有分布序列数据")

        fig, ax = plt.subplots(figsize=(10, 5.5))
        steps = np.arange(len(df))
        colors = plt.cm.tab10(np.linspace(0, 1, len(df.columns)))

        for i, state in enumerate(df.columns):
            ax.plot(steps, df[state].values, marker="o",
                    markersize=4, linewidth=1.8,
                    label=state, color=colors[i])

        ax.set_title(f"[{rec.label}] 状态分布随时间演化\n记录ID: {rec.record_id}",
                     fontsize=13, fontweight="bold")
        ax.set_xlabel("步数 t", fontsize=11)
        ax.set_ylabel("P(状态)", fontsize=11)
        ax.set_ylim(-0.02, 1.02)
        ax.grid(True, alpha=0.3, linestyle="--")
        ax.legend(loc="best", fontsize=10, framealpha=0.9)
        fig.tight_layout()

        fname = filename or f"dist_{rec.record_id}.png"
        path = os.path.join(self.out_dir, fname)
        fig.savefig(path, dpi=140, bbox_inches="tight")
        plt.close(fig)
        return path

    # ------------------------------------------------------------------
    # 稳态概率柱状图
    # ------------------------------------------------------------------
    def plot_steady_state(
        self,
        rec: ProcessingRecord,
        filename: Optional[str] = None,
    ) -> str:
        df = rec.steady_state_df()
        if df is None:
            raise ValueError(f"记录 {rec.record_id} 没有稳态数据")

        fig, ax = plt.subplots(figsize=(8, 5))
        bars = ax.bar(df["状态"].astype(str), df["稳态概率"],
                      color=plt.cm.viridis(np.linspace(0.3, 0.8, len(df))),
                      edgecolor="white", linewidth=0.8)

        for bar, val in zip(bars, df["稳态概率"]):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.005,
                    f"{val:.4f}", ha="center", va="bottom", fontsize=10)

        info = rec.results.get("steady_info", {})
        subtitle = f"迭代 {info.get('steps_used', '?')} 步，残差 {info.get('residual', '?'):.2e}"
        ax.set_title(f"[{rec.label}] 稳态分布\n{subtitle}\n记录ID: {rec.record_id}",
                     fontsize=13, fontweight="bold")
        ax.set_xlabel("状态", fontsize=11)
        ax.set_ylabel("稳态概率", fontsize=11)
        ax.set_ylim(0, max(df["稳态概率"]) * 1.15 + 0.02)
        ax.grid(axis="y", alpha=0.3, linestyle="--")
        fig.tight_layout()

        fname = filename or f"steady_{rec.record_id}.png"
        path = os.path.join(self.out_dir, fname)
        fig.savefig(path, dpi=140, bbox_inches="tight")
        plt.close(fig)
        return path

    # ------------------------------------------------------------------
    # 状态转移有向图
    # ------------------------------------------------------------------
    def plot_transition_graph(
        self,
        rec: ProcessingRecord,
        threshold: float = 0.02,
        filename: Optional[str] = None,
    ) -> str:
        df = rec.transition_df(1)
        if df is None:
            raise ValueError(f"记录 {rec.record_id} 没有转移矩阵数据")

        G = nx.DiGraph()
        for s in rec.states:
            G.add_node(s)

        for i, s_from in enumerate(rec.states):
            for j, s_to in enumerate(rec.states):
                p = float(df.iloc[i, j])
                if p >= threshold:
                    G.add_edge(s_from, s_to, weight=p, label=f"{p:.2f}")

        fig, ax = plt.subplots(figsize=(9, 7))
        try:
            pos = nx.nx_agraph.graphviz_layout(G, prog="dot")
        except Exception:
            pos = nx.spring_layout(G, k=2, seed=42)

        node_sizes = [1800 for _ in G.nodes]
        nx.draw_networkx_nodes(G, pos, node_size=node_sizes,
                               node_color="#4C8BF5", alpha=0.9,
                               edgecolors="white", linewidths=2, ax=ax)
        nx.draw_networkx_labels(G, pos, font_size=11,
                                font_color="white", font_weight="bold", ax=ax)

        edges = list(G.edges(data=True))
        if edges:
            widths = [d["weight"] * 5 + 0.5 for _, _, d in edges]
            nx.draw_networkx_edges(
                G, pos, edgelist=[(u, v) for u, v, _ in edges],
                width=widths, edge_color="#555555",
                arrowsize=18, connectionstyle="arc3,rad=0.18", ax=ax,
            )
            edge_labels = {(u, v): d["label"] for u, v, d in edges}
            nx.draw_networkx_edge_labels(
                G, pos, edge_labels=edge_labels,
                font_size=9, label_pos=0.55, ax=ax,
            )

        ax.set_title(f"[{rec.label}] 状态转移图 (≥{threshold:.0%})\n记录ID: {rec.record_id}",
                     fontsize=13, fontweight="bold")
        ax.axis("off")
        fig.tight_layout()

        fname = filename or f"graph_{rec.record_id}.png"
        path = os.path.join(self.out_dir, fname)
        fig.savefig(path, dpi=140, bbox_inches="tight")
        plt.close(fig)
        return path

    # ------------------------------------------------------------------
    # 一键生成所有图
    # ------------------------------------------------------------------
    def plot_all(self, rec: ProcessingRecord) -> dict:
        paths = {}
        if rec.status in ("success", "warning"):
            paths["distribution_series"] = self.plot_distribution_series(rec)
            paths["steady_state"] = self.plot_steady_state(rec)
            paths["transition_graph"] = self.plot_transition_graph(rec)
        return paths
