"""
报告生成模块
核心要求：图、表、文字说明三者对得上。
所有数据从同一批 ProcessingRecord 和 aggregate_statistics 取，
绝不各自算各自的。
"""

import os
from datetime import datetime, timezone
from typing import List, Dict

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from .models import ProcessingRecord
from .coverage import aggregate_statistics


plt.rcParams["font.sans-serif"] = ["Arial Unicode MS", "SimHei", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False


class ReportGenerator:
    """报告生成器 - 图/表/文三者对齐"""

    def __init__(self, records: List[ProcessingRecord], batch_id: str,
                 run_timestamp: datetime):
        self.records = records
        self.batch_id = batch_id
        self.run_timestamp = run_timestamp
        self.stats = aggregate_statistics(records)
        self._figures = []

    def generate_coverage_bar_chart(self) -> str:
        """
        覆盖度柱状图
        数据来源：self.records（和表、文字共用）
        """
        estimated = [r for r in self.records if r.coverage is not None]
        if not estimated:
            return ""

        fig, ax = plt.subplots(figsize=(10, 5))
        ids = [r.record_id[:6] for r in estimated]
        coverages = [r.coverage for r in estimated]
        colors = []
        for r in estimated:
            if any(f.startswith("weather_") for f in r.flags):
                colors.append("#ff9800")
            elif any(f.startswith("tide_") for f in r.flags):
                colors.append("#2196f3")
            else:
                colors.append("#4caf50")

        ax.bar(ids, coverages, color=colors, edgecolor="#333", linewidth=0.5)
        ax.set_ylabel("Coverage")
        ax.set_xlabel("Record ID")
        ax.set_title(f"Seagrass Coverage Estimation (batch={self.batch_id})")
        ax.axhline(y=self.stats["average_coverage"], color="red",
                    linestyle="--", linewidth=1,
                    label=f'Avg={self.stats["average_coverage"]:.2%}')
        ax.legend()
        plt.xticks(rotation=45, ha="right", fontsize=8)
        plt.tight_layout()

        path = f"coverage_bar_{self.batch_id}.png"
        fig.savefig(path, dpi=150)
        plt.close(fig)
        self._figures.append(path)
        return path

    def generate_coverage_scatter(self) -> str:
        """
        覆盖度散点图：覆盖度 vs 深度
        """
        estimated = [r for r in self.records if r.coverage is not None]
        if not estimated:
            return ""

        fig, ax = plt.subplots(figsize=(8, 5))
        depths = [r.depth for r in estimated]
        coverages = [r.coverage for r in estimated]
        flags = []
        for r in estimated:
            if r.flags:
                flags.append("flagged")
            else:
                flags.append("normal")

        for label in ("normal", "flagged"):
            idxs = [i for i, f in enumerate(flags) if f == label]
            ax.scatter(
                [depths[i] for i in idxs],
                [coverages[i] for i in idxs],
                label=label,
                s=40,
                alpha=0.7,
            )

        ax.set_xlabel("Depth (m)")
        ax.set_ylabel("Coverage")
        ax.set_title(f"Coverage vs Depth (batch={self.batch_id})")
        ax.legend()
        plt.tight_layout()

        path = f"coverage_scatter_{self.batch_id}.png"
        fig.savefig(path, dpi=150)
        plt.close(fig)
        self._figures.append(path)
        return path

    def generate_flag_pie_chart(self) -> str:
        """
        标记分布饼图
        """
        bd = self.stats["flag_breakdown"]
        labels = []
        sizes = []
        for k, v in bd.items():
            if v > 0:
                labels.append(k)
                sizes.append(v)

        if not sizes:
            return ""

        fig, ax = plt.subplots(figsize=(6, 6))
        ax.pie(sizes, labels=labels, autopct="%1.0f%%", startangle=90)
        ax.set_title(f"Flag Distribution (batch={self.batch_id})")
        plt.tight_layout()

        path = f"flags_pie_{self.batch_id}.png"
        fig.savefig(path, dpi=150)
        plt.close(fig)
        self._figures.append(path)
        return path

    def generate_table_data(self) -> List[Dict]:
        """
        表格数据：每条记录一行。
        和图表共用 self.records，保证对得上。
        """
        rows = []
        for r in self.records:
            weather_cond = ""
            wind = ""
            if r.weather_data:
                weather_cond = r.weather_data.get("weather_condition", "")
                wind = r.weather_data.get("wind_speed_mps", "")
            tide_level = ""
            tide_phase = ""
            if r.tide_data:
                tide_level = r.tide_data.get("tide_level_m", "")
                tide_phase = r.tide_data.get("tide_phase", "")
            rows.append({
                "record_id": r.record_id,
                "vessel_id": r.vessel_id,
                "survey_time": r.survey_time.isoformat(),
                "tz_offset": f"UTC{r.timezone_offset_hours:+d}",
                "lon": round(r.longitude, 4),
                "lat": round(r.latitude, 4),
                "depth_m": round(r.depth, 2),
                "coverage": f"{r.coverage:.2%}" if r.coverage is not None else "N/A",
                "weather": weather_cond,
                "wind_mps": wind,
                "tide_m": tide_level,
                "tide_phase": tide_phase,
                "status": r.status,
                "flags": ", ".join(r.flags) if r.flags else "-",
                "duplicate_of": r.duplicate_of or "-",
            })
        return rows

    def generate_text_report(self) -> str:
        """
        文字说明。
        数据来自 self.stats（和图表共用 aggregate_statistics）。
        """
        s = self.stats
        lines = []
        lines.append("=" * 60)
        lines.append("  SEAGRASS BED COVERAGE ESTIMATION REPORT")
        lines.append("=" * 60)
        lines.append(f"  Batch ID:       {self.batch_id}")
        lines.append(f"  Run Time:       {self.run_timestamp.isoformat()}")
        lines.append(f"  Total Records:  {s['total_records']}")
        lines.append("")
        lines.append("--- Coverage Statistics ---")
        lines.append(f"  Estimated:      {s['estimated_count']} / {s['total_records']}")
        lines.append(f"  Average:        {s['average_coverage']:.2%}")
        lines.append(f"  Median:         {s['median_coverage']:.2%}")
        lines.append(f"  Max:            {s['max_coverage']:.2%}")
        lines.append(f"  Min:            {s['min_coverage']:.2%}")
        lines.append("")
        lines.append("--- Quality Flags ---")
        lines.append(f"  Flagged:        {s['flagged_count']} / {s['total_records']}")
        lines.append(f"  Weather issues: {s['weather_flags_count']}")
        lines.append(f"  Tide issues:    {s['tide_flags_count']}")
        lines.append(f"  Track issues:   {s['track_flags_count']}")
        lines.append(f"  Duplicates:     {s['duplicate_count']}")

        if s["duplicate_count"] > 0:
            lines.append("")
            lines.append("  *** DUPLICATE REPORT (NOT just a vague reminder) ***")
            dups = [r for r in self.records if "duplicate" in r.flags]
            for d in dups:
                dup_opinion = d.get_latest_opinion_by_stage("duplicate_check")
                detail = dup_opinion.opinion if dup_opinion else "duplicate"
                lines.append(f"    Record {d.record_id}: {detail}")

        lines.append("")
        lines.append("--- Anomaly Traceback (for acceptance review) ---")
        flagged = [r for r in self.records if r.flags]
        for r in flagged:
            lines.append(r.trace_back(indent=1))

        lines.append("")
        lines.append("=" * 60)
        lines.append("  END OF REPORT")
        lines.append("=" * 60)
        return "\n".join(lines)

    def generate_all(self, output_dir: str = ".") -> Dict[str, str]:
        """
        生成全部报告输出。
        返回 {类型: 文件路径}。
        """
        os.makedirs(output_dir, exist_ok=True)

        results = {}

        os.chdir(output_dir)
        try:
            bar_path = self.generate_coverage_bar_chart()
            scatter_path = self.generate_coverage_scatter()
            pie_path = self.generate_flag_pie_chart()
        finally:
            os.chdir("..")

        if bar_path:
            results["coverage_bar_chart"] = os.path.join(output_dir, bar_path)
        if scatter_path:
            results["coverage_scatter"] = os.path.join(output_dir, scatter_path)
        if pie_path:
            results["flag_pie"] = os.path.join(output_dir, pie_path)

        table_data = self.generate_table_data()
        table_path = os.path.join(output_dir, f"table_{self.batch_id}.txt")
        with open(table_path, "w", encoding="utf-8") as f:
            if table_data:
                headers = list(table_data[0].keys())
                f.write("\t".join(headers) + "\n")
                for row in table_data:
                    f.write("\t".join(str(row[h]) for h in headers) + "\n")
        results["table"] = table_path

        text_report = self.generate_text_report()
        text_path = os.path.join(output_dir, f"report_{self.batch_id}.txt")
        with open(text_path, "w", encoding="utf-8") as f:
            f.write(text_report)
        results["text_report"] = text_path

        return results
