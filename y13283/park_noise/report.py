from __future__ import annotations

import csv
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from .models import NoisePoint, NoiseScheme, FeedbackRecord, PointStatus
from .comparison import ComparisonResult, SchemeComparator
from .anomaly import AnomalyDetector
from .versioning import VersionTracker


class ReportGenerator:
    def __init__(self, output_dir: str = "output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_comparison_chart(
        self,
        results: List[ComparisonResult],
        status_summary: dict,
        changelog: Optional[List[str]] = None,
    ) -> str:
        lines = []
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        lines.append("=" * 80)
        lines.append("公园噪声方案比选报告")
        lines.append(f"生成时间: {timestamp}")
        lines.append("=" * 80)
        lines.append("")
        lines.append("【状态概览】（现场老师第一眼看）")
        lines.append("-" * 40)
        total = sum(status_summary.values())
        for status, count in status_summary.items():
            bar = "█" * int(count / max(total, 1) * 30)
            lines.append(f"  {status}: {count:3d} {bar}")
        lines.append(f"  合计: {total}")
        lines.append("")
        lines.append("【方案比选排名】")
        lines.append("-" * 60)
        lines.append(
            f"{'排名':<4}{'方案':<12}{'点位':<6}{'超限':<6}{'最大dB':<8}{'平均dB':<8}{'性价比':<8}{'已处理':<8}{'待补证':<8}"
        )
        lines.append("-" * 60)
        comparator = SchemeComparator()
        ranked = comparator.rank_schemes(results)
        for rank, r in ranked:
            mark = " ★" if rank == 1 else ""
            lines.append(
                f"{rank:<4}{r.scheme_name:<12}{r.total_points:<6}"
                f"{r.over_limit_points:<6}{r.max_noise_level:<8}"
                f"{r.avg_noise_level:<8}{r.cost_efficiency:<8}"
                f"{r.done_count:<8}{len(r.needs_evidence):<8}{mark}"
            )
        lines.append("")
        lines.append("【待办清单】（现场老师最后看）")
        lines.append("-" * 40)
        todo_items = []
        for rank, r in ranked:
            if r.needs_evidence:
                todo_items.append(f"  □ 方案[{r.scheme_name}] 待补证据 {len(r.needs_evidence)} 项:")
                for p in r.needs_evidence:
                    todo_items.append(f"      - {p.name} (来源: {p.source.source_file}:{p.source.source_row}")
            if r.unresolved_anomalies:
                todo_items.append(f"  □ 方案[{r.scheme_name}] 异常 {len(r.unresolved_anomalies)} 项未处理:")
                for p in r.unresolved_anomalies:
                    anomaly_str = ", ".join(p.anomalies)
                    todo_items.append(
                        f"      - {p.name} {anomaly_str} "
                        f"(来源: {p.source.source_file}:{p.source.source_row})"
                    )
        if not todo_items:
            todo_items.append("  (全部已处理 ✓)")
        lines.extend(todo_items)
        lines.append("")
        if changelog:
            lines.append("【版本变更日志】（老何不用再临时解释）")
            lines.append("-" * 40)
            for log in changelog:
                lines.append(f"  {log}")
            lines.append("")
        output = "\n".join(lines)
        output_file = self.output_dir / "comparison_report.txt"
        output_file.write_text(output, encoding="utf-8")
        return output

    def generate_source_trace_csv(self, points: List[NoisePoint], feedbacks: List[FeedbackRecord]) -> str:
        csv_path = self.output_dir / "source_trace.csv"
        active_points = [p for p in points if p.status != PointStatus.SUPERSEDED]
        comparator = SchemeComparator()
        with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(
                [
                    "点位ID", "点位名称", "X坐标", "Y坐标", "噪声值dB",
                    "标准限值dB", "影响范围m", "方案ID", "状态",
                    "版本", "异常标记", "来源文件", "来源行", "来源备注",
                    "证据说明", "反馈原始说法", "反馈合并后说法",
                ]
            )
            for p in active_points:
                fb_list = comparator.get_feedback_for_point(p.point_id, feedbacks)
                original_texts = "; ".join([fb.original_text for fb in fb_list])
                merged_texts = "; ".join([fb.merged_text for fb in fb_list])
                writer.writerow(
                    [
                        p.point_id, p.name, p.gis_x, p.gis_y,
                        p.noise_level, p.standard_limit, p.impact_range,
                        p.scheme_id, p.status.value, f"v{p.version}",
                        "; ".join(p.anomalies),
                        p.source.source_file, p.source.source_row,
                        p.source.source_note, p.evidence_notes,
                        original_texts, merged_texts,
                    ]
                )
        return str(csv_path)

    def generate_anomaly_trace(
        self,
        points: List[NoisePoint],
        detector: AnomalyDetector,
    ) -> str:
        anomaly_path = self.output_dir / "anomaly_trace.txt"
        lines = []
        lines.append("=" * 80)
        lines.append("异常点溯源明细（点回材料用）")
        lines.append("=" * 80)
        lines.append("")
        summary = detector.get_anomaly_summary(points)
        if not summary:
            lines.append("(无异常)")
        for anomaly_type, affected_points in summary:
            lines.append(f"## {anomaly_type} ({len(affected_points)} 点位):")
            lines.append("-" * 40)
            for p in affected_points:
                lines.append(detector.trace_anomaly_source(p))
                lines.append("")
        output = "\n".join(lines)
        anomaly_path.write_text(output, encoding="utf-8")
        return output

    def generate_version_history(
        self,
        points: List[NoisePoint],
        tracker: VersionTracker,
    ) -> str:
        history_path = self.output_dir / "version_history.txt"
        lines = []
        lines.append("=" * 80)
        lines.append("版本历史（后补材料不覆盖早先判断）")
        lines.append("=" * 80)
        lines.append("")
        point_ids = {}
        for p in points:
            if p.point_id not in point_ids:
                point_ids[p.point_id] = []
            point_ids[p.point_id].append(p)
        for point_id, history in point_ids.items():
            if len(history) <= 1 and history[0].status != PointStatus.SUPERSEDED:
                continue
            history_sorted = sorted(history, key=lambda x: x.version)
            lines.append(f"[{history_sorted[0].name}] ({point_id})")
            lines.append("-" * 40)
            for p in history_sorted:
                status_mark = ""
                lines.append(
                    f"  v{p.version} 噪声{p.noise_level}dB "
                    f"范围{p.impact_range}m "
                    f"[{p.status.value}{status_mark}]"
                )
                lines.append(
                    f"      ↳ 来源: {p.source.source_file}:{p.source.source_row} "
                    f"时间: {p.updated_at[:19]}"
                )
                if p.superseded_by:
                    lines.append(f"      ↳ 被 {p.superseded_by} 取代")
            lines.append("")
        output = "\n".join(lines)
        history_path.write_text(output, encoding="utf-8")
        return output
