"""Diagnostic report generation for covariance matrix cleaning."""

import json
import os
from dataclasses import asdict
from typing import Dict, List, Optional, Any

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from tabulate import tabulate

from .types import (
    CorrectionTrace,
    Severity,
    CleaningResult,
    DiagnosticReport,
    StatusCategory,
)


class ReportGenerator:
    """Generates diagnostic reports and visualizations."""

    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate_summary_stats(
        self,
        result: CleaningResult,
        original_matrix: Optional[pd.DataFrame] = None,
    ) -> Dict[str, Any]:
        """Generate summary statistics for the report."""
        matrix = result.cleaned_matrix
        n_assets = len(matrix)

        stats = {
            "n_assets": n_assets,
            "cleaning_time": result.cleaning_time,
            "source_files": result.source_files,
            "asset_order": result.asset_order,
            "total_corrections": len(result.traces),
            "unprocessed_count": len(result.unprocessed_items),
            "corrected_count": len(result.corrected_items),
            "manual_count": len(result.manual_items),
            "severity_counts": self._count_by_severity(result.traces),
            "type_counts": self._count_by_type(result.traces),
        }

        if original_matrix is not None:
            stats["original_shape"] = list(original_matrix.shape)
            stats["cleaned_shape"] = list(matrix.shape)

        try:
            eigenvalues = np.linalg.eigvalsh(matrix.values)
            stats["min_eigenvalue"] = float(eigenvalues.min())
            stats["max_eigenvalue"] = float(eigenvalues.max())
            stats["condition_number"] = float(eigenvalues.max() / eigenvalues.min()) if eigenvalues.min() > 0 else float("inf")
            stats["is_positive_definite"] = bool(eigenvalues.min() > 1e-10)
        except Exception as e:
            stats["eigenvalue_error"] = str(e)

        try:
            corr = matrix.corr() if hasattr(matrix, "corr") else None
            if corr is not None:
                stats["max_correlation"] = float(np.nanmax(np.abs(np.triu(corr.values, k=1))))
                stats["min_correlation"] = float(np.nanmin(np.triu(corr.values, k=1)))
        except:
            pass

        return stats

    def _count_by_severity(self, traces: List[CorrectionTrace]) -> Dict[str, int]:
        """Count traces by severity level."""
        counts = {}
        for trace in traces:
            sev = trace.severity.value
            counts[sev] = counts.get(sev, 0) + 1
        return counts

    def _count_by_type(self, traces: List[CorrectionTrace]) -> Dict[str, int]:
        """Count traces by correction type."""
        counts = {}
        for trace in traces:
            t = trace.correction_type.value
            counts[t] = counts.get(t, 0) + 1
        return counts

    def generate_plots(
        self,
        result: CleaningResult,
        original_matrix: Optional[pd.DataFrame] = None,
        prefix: str = "",
    ) -> List[str]:
        """Generate diagnostic plots."""
        plots = []
        matrix = result.cleaned_matrix

        try:
            eigen_plot = self._plot_eigenvalues(matrix, f"{prefix}eigenvalues.png", original_matrix)
            plots.append(eigen_plot)
        except Exception as e:
            print(f"Warning: Failed to generate eigenvalue plot: {e}")

        try:
            heatmap_plot = self._plot_heatmap(matrix, f"{prefix}covariance_heatmap.png")
            plots.append(heatmap_plot)
        except Exception as e:
            print(f"Warning: Failed to generate heatmap: {e}")

        try:
            corr_plot = self._plot_correlation(matrix, f"{prefix}correlation_heatmap.png")
            plots.append(corr_plot)
        except Exception as e:
            print(f"Warning: Failed to generate correlation plot: {e}")

        try:
            severity_plot = self._plot_severity_distribution(result, f"{prefix}severity_distribution.png")
            plots.append(severity_plot)
        except Exception as e:
            print(f"Warning: Failed to generate severity plot: {e}")

        return plots

    def _plot_eigenvalues(
        self,
        matrix: pd.DataFrame,
        filename: str,
        original_matrix: Optional[pd.DataFrame] = None,
    ) -> str:
        """Plot eigenvalues of the covariance matrix."""
        fig, axes = plt.subplots(1, 2, figsize=(12, 5))

        eigenvalues_clean = np.linalg.eigvalsh(matrix.values)
        axes[0].plot(sorted(eigenvalues_clean, reverse=True), "b-o", label="Cleaned", markersize=4)
        if original_matrix is not None:
            try:
                eigenvalues_orig = np.linalg.eigvalsh(original_matrix.values)
                axes[0].plot(sorted(eigenvalues_orig, reverse=True), "r--s", label="Original", markersize=4, alpha=0.7)
            except:
                pass
        axes[0].set_xlabel("Eigenvalue Index")
        axes[0].set_ylabel("Eigenvalue")
        axes[0].set_title("Eigenvalue Distribution")
        axes[0].legend()
        axes[0].grid(True, alpha=0.3)

        n = len(eigenvalues_clean)
        axes[1].bar(range(n), sorted(eigenvalues_clean, reverse=True), alpha=0.7, color="steelblue")
        axes[1].axhline(y=1e-6, color="r", linestyle="--", label="epsilon=1e-6")
        axes[1].set_yscale("log")
        axes[1].set_xlabel("Eigenvalue Index")
        axes[1].set_ylabel("Eigenvalue (log scale)")
        axes[1].set_title("Eigenvalues (Log Scale)")
        axes[1].legend()
        axes[1].grid(True, alpha=0.3)

        plt.tight_layout()
        filepath = os.path.join(self.output_dir, filename)
        plt.savefig(filepath, dpi=150, bbox_inches="tight")
        plt.close()
        return filepath

    def _plot_heatmap(self, matrix: pd.DataFrame, filename: str) -> str:
        """Plot covariance matrix heatmap."""
        fig, ax = plt.subplots(figsize=(10, 8))
        sns.heatmap(matrix, annot=False, cmap="RdBu_r", center=0,
                    xticklabels=matrix.columns, yticklabels=matrix.index,
                    cbar_kws={"label": "Covariance"}, ax=ax)
        ax.set_title("Cleaned Covariance Matrix")
        plt.xticks(rotation=45, ha="right")
        plt.yticks(rotation=0)
        plt.tight_layout()
        filepath = os.path.join(self.output_dir, filename)
        plt.savefig(filepath, dpi=150, bbox_inches="tight")
        plt.close()
        return filepath

    def _plot_correlation(self, matrix: pd.DataFrame, filename: str) -> str:
        """Plot correlation matrix heatmap."""
        corr = matrix.corr()
        fig, ax = plt.subplots(figsize=(10, 8))
        sns.heatmap(corr, annot=False, cmap="RdBu_r", center=0, vmin=-1, vmax=1,
                    xticklabels=corr.columns, yticklabels=corr.index,
                    cbar_kws={"label": "Correlation"}, ax=ax)
        ax.set_title("Correlation Matrix")
        plt.xticks(rotation=45, ha="right")
        plt.yticks(rotation=0)
        plt.tight_layout()
        filepath = os.path.join(self.output_dir, filename)
        plt.savefig(filepath, dpi=150, bbox_inches="tight")
        plt.close()
        return filepath

    def _plot_severity_distribution(self, result: CleaningResult, filename: str) -> str:
        """Plot distribution of corrections by severity."""
        fig, ax = plt.subplots(figsize=(8, 6))

        categories = ["Unprocessed", "Corrected", "Needs Manual"]
        counts = [
            len(result.unprocessed_items),
            len(result.corrected_items),
            len(result.manual_items),
        ]
        colors = ["#4CAF50", "#FF9800", "#F44336"]

        bars = ax.bar(categories, counts, color=colors, alpha=0.8)

        for bar, count in zip(bars, counts):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width() / 2., height + 0.1,
                    f"{count}", ha="center", va="bottom", fontweight="bold")

        ax.set_ylabel("Number of Items")
        ax.set_title("Processing Outcome Distribution")
        ax.grid(True, alpha=0.3, axis="y")

        plt.tight_layout()
        filepath = os.path.join(self.output_dir, filename)
        plt.savefig(filepath, dpi=150, bbox_inches="tight")
        plt.close()
        return filepath

    def _trace_to_dict(self, trace: CorrectionTrace) -> Dict[str, Any]:
        """Convert trace to dictionary for serialization."""
        return {
            "timestamp": trace.timestamp,
            "correction_type": trace.correction_type.value,
            "severity": trace.severity.value,
            "description": trace.description,
            "source_file": trace.source_file,
            "asset": trace.asset,
            "details": trace.details,
            "before_value": str(trace.before_value) if trace.before_value is not None else None,
            "after_value": str(trace.after_value) if trace.after_value is not None else None,
        }

    def generate_text_report(
        self,
        result: CleaningResult,
        stats: Dict[str, Any],
        plots: List[str],
        filename: str = "report.txt",
    ) -> str:
        """Generate human-readable text report."""
        lines = []
        lines.append("=" * 80)
        lines.append("COVARIANCE MATRIX CLEANING - DIAGNOSTIC REPORT")
        lines.append("=" * 80)
        lines.append(f"Generated at: {result.cleaning_time}")
        lines.append(f"Source files: {', '.join(result.source_files)}")
        lines.append("")

        lines.append("-" * 80)
        lines.append("SUMMARY STATISTICS")
        lines.append("-" * 80)
        lines.append(f"Number of assets: {stats.get('n_assets', 'N/A')}")
        lines.append(f"Asset order: {', '.join(result.asset_order)}")
        if "is_positive_definite" in stats:
            pd_status = "YES" if stats["is_positive_definite"] else "NO"
            lines.append(f"Positive definite: {pd_status}")
        if "min_eigenvalue" in stats:
            lines.append(f"Min eigenvalue: {stats['min_eigenvalue']:.2e}")
        if "condition_number" in stats:
            lines.append(f"Condition number: {stats['condition_number']:.2e}")
        lines.append("")

        lines.append("-" * 80)
        lines.append("PROCESSING SUMMARY")
        lines.append("-" * 80)
        lines.append(f"Total corrections tracked: {stats['total_corrections']}")
        lines.append(f"  - Unprocessed (INFO):    {stats['unprocessed_count']}")
        lines.append(f"  - Corrected (WARNING/ERROR): {stats['corrected_count']}")
        lines.append(f"  - Needs manual review (CRITICAL): {stats['manual_count']}")
        lines.append("")

        if stats.get("severity_counts"):
            lines.append("Severity breakdown:")
            for sev, count in sorted(stats["severity_counts"].items()):
                lines.append(f"  - {sev.upper()}: {count}")
            lines.append("")

        if stats.get("type_counts"):
            lines.append("Correction type breakdown:")
            for t, count in sorted(stats["type_counts"].items()):
                lines.append(f"  - {t}: {count}")
            lines.append("")

        lines.append("-" * 80)
        lines.append("ITEMS NEEDING MANUAL REVIEW (CRITICAL)")
        lines.append("-" * 80)
        if result.manual_items:
            for i, trace in enumerate(result.manual_items, 1):
                lines.append(f"\n{i}. [{trace.severity.value.upper()}] {trace.description}")
                lines.append(f"   Source: {trace.source_file}")
                if trace.asset:
                    lines.append(f"   Asset: {trace.asset}")
                if trace.details:
                    lines.append(f"   Details: {json.dumps(trace.details, ensure_ascii=False)}")
        else:
            lines.append("None - all issues were automatically resolved.")
        lines.append("")

        lines.append("-" * 80)
        lines.append("CORRECTED ITEMS (WARNING/ERROR)")
        lines.append("-" * 80)
        if result.corrected_items:
            for i, trace in enumerate(result.corrected_items, 1):
                lines.append(f"\n{i}. [{trace.severity.value.upper()}] {trace.description}")
                lines.append(f"   Type: {trace.correction_type.value}")
                lines.append(f"   Source: {trace.source_file}")
                if trace.asset:
                    lines.append(f"   Asset: {trace.asset}")
                if trace.before_value is not None or trace.after_value is not None:
                    lines.append(f"   Before -> After: {trace.before_value} -> {trace.after_value}")
        else:
            lines.append("None - no corrections needed.")
        lines.append("")

        lines.append("-" * 80)
        lines.append("UNPROCESSED ITEMS (INFO)")
        lines.append("-" * 80)
        if result.unprocessed_items:
            for i, trace in enumerate(result.unprocessed_items, 1):
                lines.append(f"{i}. {trace.description}")
        else:
            lines.append("None.")
        lines.append("")

        lines.append("-" * 80)
        lines.append("GENERATED PLOTS")
        lines.append("-" * 80)
        for plot in plots:
            lines.append(f"  - {plot}")
        lines.append("")

        if result.manual_items:
            lines.append("!" * 80)
            lines.append(f"WARNING: {len(result.manual_items)} ITEMS REQUIRE MANUAL REVIEW!")
            lines.append("!" * 80)

        report_text = "\n".join(lines)
        filepath = os.path.join(self.output_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(report_text)
        return filepath

    def generate_csv_traces(
        self,
        result: CleaningResult,
        filename: str = "traces.csv",
    ) -> str:
        """Generate CSV file of all traces."""
        records = []
        for trace in result.traces:
            records.append(self._trace_to_dict(trace))

        df = pd.DataFrame(records)
        cols = ["timestamp", "severity", "correction_type", "description",
                "source_file", "asset", "before_value", "after_value", "details"]
        cols = [c for c in cols if c in df.columns]
        df = df[cols]
        df = df.sort_values(["severity", "timestamp"], ascending=[False, True])

        filepath = os.path.join(self.output_dir, filename)
        df.to_csv(filepath, index=False, encoding="utf-8")
        return filepath

    def generate_json_report(
        self,
        result: CleaningResult,
        stats: Dict[str, Any],
        plots: List[str],
        filename: str = "report.json",
    ) -> str:
        """Generate JSON report for machine consumption."""
        report = {
            "generated_at": result.cleaning_time,
            "source_files": result.source_files,
            "asset_order": result.asset_order,
            "summary": stats,
            "plots": plots,
            "traces": {
                "all": [self._trace_to_dict(t) for t in result.traces],
                "unprocessed": [self._trace_to_dict(t) for t in result.unprocessed_items],
                "corrected": [self._trace_to_dict(t) for t in result.corrected_items],
                "needs_manual": [self._trace_to_dict(t) for t in result.manual_items],
            },
            "matrix_shape": list(result.cleaned_matrix.shape),
        }

        filepath = os.path.join(self.output_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False, default=str)
        return filepath

    def generate_all_reports(
        self,
        result: CleaningResult,
        original_matrix: Optional[pd.DataFrame] = None,
        prefix: str = "",
    ) -> DiagnosticReport:
        """Generate all reports and plots."""
        stats = self.generate_summary_stats(result, original_matrix)
        plots = self.generate_plots(result, original_matrix, prefix)

        text_report = self.generate_text_report(result, stats, plots, f"{prefix}report.txt")
        csv_report = self.generate_csv_traces(result, f"{prefix}traces.csv")
        json_report = self.generate_json_report(result, stats, plots, f"{prefix}report.json")

        return DiagnosticReport(
            result=result,
            summary_stats=stats,
            plots=plots + [text_report, csv_report, json_report],
        )
