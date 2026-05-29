"""报告生成 - CSV/JSON/图片导出"""
from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional

from .models import (
    AnalysisResult, Bond, BondMetrics, PortfolioSummary, YieldCurve,
)


class ReportGenerator:
    """报告生成器"""

    def __init__(self, output_dir: str = "reports"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def export_metrics_csv(
        self, result: AnalysisResult, bonds: list[Bond],
        filename: Optional[str] = None,
    ) -> Path:
        """导出逐券指标CSV"""
        if not filename:
            filename = f"metrics_{result.result_id}_{datetime.now():%Y%m%d_%H%M%S}.csv"
        path = self.output_dir / filename

        bond_map = {b.bond_id: b for b in bonds}
        with open(path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow([
                "债券代码", "债券名称", "持仓面值", "票息率", "评级",
                "修正久期", "麦考利久期", "有效久期", "凸性",
                "DV01(元/bp)", "PV(元)", "应计利息", "全价", "YTM",
                "警告信息",
            ])
            for bid, m in result.bond_metrics.items():
                b = bond_map.get(bid)
                if not b:
                    continue
                writer.writerow([
                    bid, b.name, f"{b.position:,.0f}",
                    f"{b.coupon_rate:.4%}", b.rating.value,
                    f"{m.modified_duration:.4f}" if m.modified_duration is not None else "",
                    f"{m.macaulay_duration:.4f}" if m.macaulay_duration is not None else "",
                    f"{m.effective_duration:.4f}" if m.effective_duration is not None else "",
                    f"{m.convexity:.4f}" if m.convexity is not None else "",
                    f"{m.dv01:,.2f}" if m.dv01 is not None else "",
                    f"{m.present_value:,.2f}" if m.present_value is not None else "",
                    f"{m.accrued_interest:,.2f}" if m.accrued_interest is not None else "",
                    f"{m.dirty_price:,.2f}" if m.dirty_price is not None else "",
                    f"{m.ytm:.4%}" if m.ytm is not None else "",
                    "; ".join(m.warnings) if m.warnings else "",
                ])
        return path

    def export_summary_csv(
        self, result: AnalysisResult, bonds: list[Bond],
        filename: Optional[str] = None,
    ) -> Path:
        """导出归因汇总CSV"""
        if not filename:
            filename = f"summary_{result.result_id}_{datetime.now():%Y%m%d_%H%M%S}.csv"
        path = self.output_dir / filename

        bond_map = {b.bond_id: b for b in bonds}
        with open(path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(["组合汇总指标", "数值"])
            writer.writerow(["组合总PV(元)", f"{result.portfolio.total_pv:,.2f}"])
            writer.writerow(["组合总DV01(元/bp)", f"{result.portfolio.total_dv01:,.2f}"])
            writer.writerow(["加权久期(年)", f"{result.portfolio.weighted_duration:.4f}"])
            writer.writerow(["加权凸性", f"{result.portfolio.weighted_convexity:.4f}"])
            writer.writerow([])
            writer.writerow([
                "排名", "债券代码", "债券名称", "持仓面值", "PV(元)",
                "修正久期", "DV01(元/bp)", "DV01贡献占比(%)",
            ])
            for item in result.portfolio.worst_contributors:
                writer.writerow([
                    item["rank"], item["bond_id"], item["name"],
                    f"{item['position']:,.0f}",
                    f"{item['present_value']:,.2f}",
                    f"{item['modified_duration']:.4f}",
                    f"{item['dv01']:,.2f}",
                    f"{item['contribution_pct']:.2f}%",
                ])
        return path

    def export_scenario_csv(
        self, results: list[AnalysisResult], filename: Optional[str] = None,
    ) -> Path:
        """导出多情景对比CSV"""
        if not filename:
            filename = f"scenario_comparison_{datetime.now():%Y%m%d_%H%M%S}.csv"
        path = self.output_dir / filename

        with open(path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow([
                "情景名称", "组合总PV(元)", "组合总DV01(元/bp)",
                "加权久期(年)", "加权凸性",
            ])
            for r in results:
                writer.writerow([
                    r.scenario_name,
                    f"{r.portfolio.total_pv:,.2f}",
                    f"{r.portfolio.total_dv01:,.2f}",
                    f"{r.portfolio.weighted_duration:.4f}",
                    f"{r.portfolio.weighted_convexity:.4f}",
                ])
        return path

    def export_anomalies_csv(
        self, result: AnalysisResult, filename: Optional[str] = None,
    ) -> Path:
        """导出异常检测结果CSV"""
        if not filename:
            filename = f"anomalies_{result.result_id}_{datetime.now():%Y%m%d_%H%M%S}.csv"
        path = self.output_dir / filename

        with open(path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(["类型", "严重性", "目标", "消息", "详情"])
            for a in result.anomalies:
                writer.writerow([
                    a["type"], a["severity"], a["target"],
                    a["message"], json.dumps(a.get("details", {}), ensure_ascii=False),
                ])
        return path

    def export_json_report(
        self, result: AnalysisResult, bonds: list[Bond],
        filename: Optional[str] = None,
    ) -> Path:
        """导出完整JSON报告"""
        if not filename:
            filename = f"full_report_{result.result_id}_{datetime.now():%Y%m%d_%H%M%S}.json"
        path = self.output_dir / filename

        bond_map = {b.bond_id: b for b in bonds}
        data = {
            "result_id": result.result_id,
            "created_at": result.created_at.isoformat(),
            "curve_id": result.curve_id,
            "scenario": result.scenario_name,
            "portfolio": {
                "total_pv": result.portfolio.total_pv,
                "total_dv01": result.portfolio.total_dv01,
                "weighted_duration": result.portfolio.weighted_duration,
                "weighted_convexity": result.portfolio.weighted_convexity,
                "worst_contributors": result.portfolio.worst_contributors,
            },
            "bond_metrics": {
                bid: {
                    "bond_name": bond_map[bid].name if bid in bond_map else "",
                    "position": bond_map[bid].position if bid in bond_map else 0,
                    "ytm": m.ytm,
                    "modified_duration": m.modified_duration,
                    "macaulay_duration": m.macaulay_duration,
                    "convexity": m.convexity,
                    "dv01": m.dv01,
                    "present_value": m.present_value,
                    "accrued_interest": m.accrued_interest,
                    "dirty_price": m.dirty_price,
                    "effective_duration": m.effective_duration,
                    "key_rate_durations": m.key_rate_durations,
                    "warnings": m.warnings,
                }
                for bid, m in result.bond_metrics.items()
            },
            "anomalies": result.anomalies,
            "corrections_applied": result.corrections_applied,
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        return path

    def export_chart_sensitivity(
        self, results: list[AnalysisResult], bonds: list[Bond],
        filename: Optional[str] = None,
    ) -> Optional[Path]:
        """导出多情景敏感性对比图"""
        if not filename:
            filename = f"sensitivity_{datetime.now():%Y%m%d_%H%M%S}.png"
        path = self.output_dir / filename

        try:
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt
            plt.rcParams["font.sans-serif"] = ["Arial Unicode MS", "PingFang SC"]
            plt.rcParams["axes.unicode_minus"] = False

            fig, axes = plt.subplots(1, 2, figsize=(14, 6))

            # 图1: 各情景加权久期
            ax1 = axes[0]
            names = [r.scenario_name for r in results]
            durations = [r.portfolio.weighted_duration for r in results]
            colors = ["#3b82f6" if n == "base" else "#60a5fa" for n in names]
            ax1.bar(names, durations, color=colors)
            ax1.set_title("各情景组合加权久期")
            ax1.set_ylabel("久期(年)")
            ax1.tick_params(axis="x", rotation=30)
            for i, v in enumerate(durations):
                ax1.text(i, v + max(durations) * 0.01, f"{v:.2f}", ha="center", fontsize=9)

            # 图2: 各情景总DV01
            ax2 = axes[1]
            dv01s = [r.portfolio.total_dv01 for r in results]
            colors2 = ["#ef4444" if n == "base" else "#f87171" for n in names]
            ax2.bar(names, dv01s, color=colors2)
            ax2.set_title("各情景组合总DV01")
            ax2.set_ylabel("DV01(元/bp)")
            ax2.tick_params(axis="x", rotation=30)
            for i, v in enumerate(dv01s):
                ax2.text(i, v + max(dv01s) * 0.01, f"{v:,.0f}", ha="center", fontsize=9)

            plt.tight_layout()
            plt.savefig(path, dpi=120, bbox_inches="tight")
            plt.close(fig)
            return path
        except ImportError:
            return None

    def export_chart_contribution(
        self, result: AnalysisResult, bonds: list[Bond],
        top_n: int = 10,
        filename: Optional[str] = None,
    ) -> Optional[Path]:
        """导出单结果久期贡献排名条形图"""
        if not filename:
            filename = f"contribution_{result.result_id}_{datetime.now():%Y%m%d_%H%M%S}.png"
        path = self.output_dir / filename

        bond_map = {b.bond_id: b for b in bonds}
        contributors = result.portfolio.worst_contributors[:top_n]
        if not contributors:
            return None

        try:
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt
            plt.rcParams["font.sans-serif"] = ["Arial Unicode MS", "PingFang SC"]
            plt.rcParams["axes.unicode_minus"] = False

            fig, ax = plt.subplots(figsize=(12, 6))
            labels = [f"{c['bond_id']}\n{c['name'][:8]}" for c in contributors]
            values = [c["contribution_pct"] for c in contributors]
            colors = [f"#{int(239 - i*20):02x}{int(68 + i*15):02x}{int(68 + i*15):02x}" for i in range(len(values))]

            y_pos = range(len(labels))
            bars = ax.barh(y_pos, values, color=colors)
            ax.set_yticks(y_pos)
            ax.set_yticklabels(labels, fontsize=9)
            ax.invert_yaxis()
            ax.set_xlabel("DV01贡献占比(%)")
            ax.set_title(f"Top {len(contributors)} 久期拖累最大 - {result.scenario_name}")

            for i, (bar, v) in enumerate(zip(bars, values)):
                ax.text(
                    bar.get_width() + max(values) * 0.01,
                    bar.get_y() + bar.get_height() / 2,
                    f"{v:.1f}%",
                    va="center", fontsize=9,
                )

            plt.tight_layout()
            plt.savefig(path, dpi=120, bbox_inches="tight")
            plt.close(fig)
            return path
        except ImportError:
            return None

    def export_chart_duration_bar(
        self, result: AnalysisResult, bonds: list[Bond],
        filename: Optional[str] = None,
    ) -> Optional[Path]:
        """导出逐券修正久期条形图"""
        if not filename:
            filename = f"duration_bar_{result.result_id}_{datetime.now():%Y%m%d_%H%M%S}.png"
        path = self.output_dir / filename

        bond_map = {b.bond_id: b for b in bonds}
        items = []
        for bid, m in result.bond_metrics.items():
            b = bond_map.get(bid)
            if b and m.modified_duration is not None:
                items.append((b.name, m.modified_duration, m.dv01 or 0))
        if not items:
            return None

        items.sort(key=lambda x: x[1], reverse=True)

        try:
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt
            plt.rcParams["font.sans-serif"] = ["Arial Unicode MS", "PingFang SC"]
            plt.rcParams["axes.unicode_minus"] = False

            fig, ax1 = plt.subplots(figsize=(12, 6))
            labels = [f"{n[:10]}" for n, _, _ in items]
            durations = [d for _, d, _ in items]
            dv01s = [dv for _, _, dv in items]

            x = range(len(labels))
            width = 0.35

            ax1.bar(x, durations, width, label="修正久期(年)", color="#3b82f6")
            ax1.set_ylabel("修正久期(年)", color="#3b82f6")
            ax1.tick_params(axis="y", labelcolor="#3b82f6")
            ax1.set_xticks(x)
            ax1.set_xticklabels(labels, rotation=30, ha="right", fontsize=9)

            ax2 = ax1.twinx()
            ax2.bar([i + width for i in x], dv01s, width, label="DV01(元/bp)", color="#f59e0b")
            ax2.set_ylabel("DV01(元/bp)", color="#f59e0b")
            ax2.tick_params(axis="y", labelcolor="#f59e0b")

            plt.title(f"逐券久期与DV01对比 - {result.scenario_name}")
            lines1, labels1 = ax1.get_legend_handles_labels()
            lines2, labels2 = ax2.get_legend_handles_labels()
            ax1.legend(lines1 + lines2, labels1 + labels2, loc="upper right")

            plt.tight_layout()
            plt.savefig(path, dpi=120, bbox_inches="tight")
            plt.close(fig)
            return path
        except ImportError:
            return None
