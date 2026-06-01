import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from typing import List, Dict, Any

from .models import SimulationResult, PolicyRecord, LossDistribution


class ChartGenerator:
    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir) / "charts"
        self.output_dir.mkdir(parents=True, exist_ok=True)

        plt.rcParams["font.sans-serif"] = ["Arial Unicode MS", "DejaVu Sans"]
        plt.rcParams["axes.unicode_minus"] = False
        sns.set_style("whitegrid")

    def generate_all_charts(
        self,
        result: SimulationResult,
        sensitivity: Dict[str, Any],
        policies: List[PolicyRecord],
        loss_distributions: List[LossDistribution],
    ) -> List[str]:
        chart_files = []

        chart_files.append(self._generate_loss_histogram(result))
        chart_files.append(self._generate_loss_cdf(result))
        chart_files.append(self._generate_var_chart(result))
        chart_files.append(self._generate_sensitivity_chart(sensitivity))
        chart_files.append(self._generate_policy_distribution(policies))

        return chart_files

    def _generate_loss_histogram(self, result: SimulationResult) -> str:
        fig, ax = plt.subplots(figsize=(10, 6))
        losses = np.array(result.total_losses)

        sns.histplot(losses, bins=50, kde=True, ax=ax, color="#3498db", alpha=0.7)

        ax.axvline(
            result.var_95,
            color="#e74c3c",
            linestyle="--",
            linewidth=2,
            label=f"VaR (95%): {result.var_95:,.0f}",
        )
        ax.axvline(
            result.var_99,
            color="#9b59b6",
            linestyle="--",
            linewidth=2,
            label=f"VaR (99%): {result.var_99:,.0f}",
        )
        ax.axvline(
            result.mean_loss,
            color="#2ecc71",
            linestyle="-",
            linewidth=2,
            label=f"均值: {result.mean_loss:,.0f}",
        )

        ax.set_title("Monte Carlo Simulation - Loss Distribution", fontsize=14, fontweight="bold")
        ax.set_xlabel("Loss Amount")
        ax.set_ylabel("Frequency")
        ax.legend()
        ax.ticklabel_format(style="plain", axis="x")

        file_path = self.output_dir / "loss_histogram.png"
        plt.tight_layout()
        plt.savefig(file_path, dpi=150, bbox_inches="tight")
        plt.close()

        return str(file_path)

    def _generate_loss_cdf(self, result: SimulationResult) -> str:
        fig, ax = plt.subplots(figsize=(10, 6))
        losses = np.array(result.total_losses)
        sorted_losses = np.sort(losses)
        cdf = np.arange(1, len(losses) + 1) / len(losses)

        ax.plot(sorted_losses, cdf, color="#3498db", linewidth=2)
        ax.fill_between(sorted_losses, cdf, alpha=0.3, color="#3498db")

        ax.axhline(0.95, color="#e74c3c", linestyle="--", alpha=0.7, label="95% Confidence")
        ax.axhline(0.99, color="#9b59b6", linestyle="--", alpha=0.7, label="99% Confidence")

        ax.set_title("Loss Cumulative Distribution Function (CDF)", fontsize=14, fontweight="bold")
        ax.set_xlabel("Loss Amount")
        ax.set_ylabel("Cumulative Probability")
        ax.legend()
        ax.grid(True, alpha=0.3)

        file_path = self.output_dir / "loss_cdf.png"
        plt.tight_layout()
        plt.savefig(file_path, dpi=150, bbox_inches="tight")
        plt.close()

        return str(file_path)

    def _generate_var_chart(self, result: SimulationResult) -> str:
        fig, ax = plt.subplots(figsize=(10, 6))

        metrics = ["Mean Loss", "VaR (95%)", "VaR (99%)", "CVaR (95%)", "CVaR (99%)"]
        values = [
            result.mean_loss,
            result.var_95,
            result.var_99,
            result.cvar_95,
            result.cvar_99,
        ]
        colors = ["#2ecc71", "#f39c12", "#e74c3c", "#9b59b6", "#8e44ad"]

        bars = ax.bar(metrics, values, color=colors, alpha=0.8)

        for bar, val in zip(bars, values):
            height = bar.get_height()
            ax.text(
                bar.get_x() + bar.get_width() / 2.0,
                height * 1.01,
                f"{val:,.0f}",
                ha="center",
                va="bottom",
                fontsize=10,
            )

        ax.set_title("Risk Metrics Comparison", fontsize=14, fontweight="bold")
        ax.set_ylabel("Loss Amount")
        ax.set_ylim(0, max(values) * 1.15)
        ax.grid(True, alpha=0.3, axis="y")

        file_path = self.output_dir / "risk_metrics.png"
        plt.tight_layout()
        plt.savefig(file_path, dpi=150, bbox_inches="tight")
        plt.close()

        return str(file_path)

    def _generate_sensitivity_chart(self, sensitivity: Dict[str, Any]) -> str:
        fig, ax = plt.subplots(figsize=(10, 6))

        factors = []
        var_95_values = []
        var_99_values = []
        cvar_95_values = []
        cvar_99_values = []

        for key, values in sensitivity["sensitivity"].items():
            factor = key.split("_")[-1]
            factors.append(f"×{factor}")
            var_95_values.append(values["var_95"])
            var_99_values.append(values["var_99"])
            cvar_95_values.append(values["cvar_95"])
            cvar_99_values.append(values["cvar_99"])

        x = np.arange(len(factors))
        width = 0.2

        ax.bar(x - 1.5 * width, var_95_values, width, label="VaR 95%", color="#f39c12", alpha=0.8)
        ax.bar(x - 0.5 * width, var_99_values, width, label="VaR 99%", color="#e74c3c", alpha=0.8)
        ax.bar(x + 0.5 * width, cvar_95_values, width, label="CVaR 95%", color="#9b59b6", alpha=0.8)
        ax.bar(x + 1.5 * width, cvar_99_values, width, label="CVaR 99%", color="#8e44ad", alpha=0.8)

        ax.set_title("Sensitivity Analysis - Impact of Loss Scale", fontsize=14, fontweight="bold")
        ax.set_xlabel("Loss Scale Multiplier")
        ax.set_ylabel("Risk Metric")
        ax.set_xticks(x)
        ax.set_xticklabels(factors)
        ax.legend()
        ax.grid(True, alpha=0.3, axis="y")

        file_path = self.output_dir / "sensitivity_analysis.png"
        plt.tight_layout()
        plt.savefig(file_path, dpi=150, bbox_inches="tight")
        plt.close()

        return str(file_path)

    def _generate_policy_distribution(self, policies: List[PolicyRecord]) -> str:
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

        from collections import defaultdict

        type_counts = defaultdict(int)
        type_amounts = defaultdict(float)
        for p in policies:
            type_counts[p.policy_type] += 1
            type_amounts[p.policy_type] += p.insured_amount

        types = list(type_counts.keys())
        counts = [type_counts[t] for t in types]
        amounts = [type_amounts[t] / 1_000_000 for t in types]

        colors = sns.color_palette("Set3", len(types))

        ax1.pie(counts, labels=types, autopct="%1.1f%%", colors=colors, startangle=90)
        ax1.set_title("Policy Count Distribution", fontsize=12, fontweight="bold")

        bars = ax2.bar(types, amounts, color=colors, alpha=0.8)
        ax2.set_title("Insured Amount Distribution (Millions)", fontsize=12, fontweight="bold")
        ax2.set_ylabel("Insured Amount (Millions)")
        ax2.grid(True, alpha=0.3, axis="y")

        for bar, val in zip(bars, amounts):
            height = bar.get_height()
            ax2.text(
                bar.get_x() + bar.get_width() / 2.0,
                height * 1.01,
                f"{val:.1f}M",
                ha="center",
                va="bottom",
                fontsize=9,
            )

        plt.tight_layout()
        file_path = self.output_dir / "policy_distribution.png"
        plt.savefig(file_path, dpi=150, bbox_inches="tight")
        plt.close()

        return str(file_path)
