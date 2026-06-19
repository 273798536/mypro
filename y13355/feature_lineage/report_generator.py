from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Dict, List

from .config_loader import ConfigLoader
from .models import (
    ChangeAudit,
    ChangeType,
    LineageReport,
    ProcessingResult,
    ReportSection,
    RowStatus,
)


class ReportGenerator:
    def __init__(self, config_loader: ConfigLoader):
        self.config_loader = config_loader

    def generate_report(
        self,
        result: ProcessingResult,
        output_format: str = "text",
        output_file: str = None,
    ) -> LineageReport:
        report = LineageReport(
            report_id=f"report_{uuid.uuid4().hex[:8]}",
            task_id=result.task_id,
            config_id=result.config_id,
            summary=self._build_summary(result),
            sample_changes=self._build_sample_changes(result),
            threshold_changes=self._build_threshold_changes(result),
            manual_overrides=self._build_manual_overrides(result),
            bad_data_issues=self._build_bad_data_issues(result),
            raw_data_references=self._build_raw_data_references(result),
            config_traceability=self._build_config_traceability(result),
        )

        if output_file:
            self._export_report(report, output_file, output_format)

        return report

    def _build_summary(self, result: ProcessingResult) -> ReportSection:
        stats = result.stats.breakdown
        content = [
            f"任务 ID: {result.task_id}",
            f"配置 ID: {result.config_id}",
            f"处理时间: {result.start_time} → {result.end_time}",
            f"总行数: {stats['total']}",
            f"已处理: {stats['processed']}",
            f"坏行: {stats['bad']}",
            f"跳过: {stats['skipped']}",
            f"待处理: {stats['pending']}",
        ]

        if result.has_delayed_feature:
            content.append(
                f"⚠️  测试注入: 特征 {result.delayed_feature_id} 被延迟注入"
            )

        details = [
            {"category": "统计", "key": k, "value": v}
            for k, v in stats.items()
        ]

        if result.changes:
            change_summary = {}
            for c in result.changes:
                ct = c.change_type.value
                change_summary[ct] = change_summary.get(ct, 0) + 1
            for ct, count in change_summary.items():
                details.append(
                    {"category": "变更", "key": ct, "value": count}
                )

        return ReportSection(
            title="处理摘要",
            content=content,
            details=details,
        )

    def _build_sample_changes(self, result: ProcessingResult) -> ReportSection:
        sample_changes = [
            c for c in result.changes if c.change_type == ChangeType.SAMPLE
        ]

        content = [f"样本变化总数: {len(sample_changes)}"]
        details = []

        for change in sample_changes:
            old_set = set(change.old_value or [])
            new_set = set(change.new_value or [])
            added = sorted(new_set - old_set)
            removed = sorted(old_set - new_set)

            content.append(
                f"  特征 {change.feature_id}: +{len(added)} 新样本, -{len(removed)} 移除样本"
            )
            if change.is_overwrite:
                content.append("    ⚠️  此变更覆盖了早先的样本配置")

            details.append(
                {
                    "feature_id": change.feature_id,
                    "added_samples": added,
                    "removed_samples": removed,
                    "source_file": change.source_file,
                    "source_line": change.source_line,
                    "source": change.source.value,
                    "changed_at": change.changed_at.isoformat(),
                    "reason": change.reason,
                    "is_overwrite": change.is_overwrite,
                }
            )

        return ReportSection(
            title="样本变化",
            content=content,
            details=details,
        )

    def _build_threshold_changes(
        self, result: ProcessingResult
    ) -> ReportSection:
        threshold_changes = [
            c
            for c in result.changes
            if c.change_type == ChangeType.THRESHOLD
        ]

        content = [f"阈值变化总数: {len(threshold_changes)}"]
        details = []

        for change in threshold_changes:
            content.append(
                f"  特征 {change.feature_id}: {change.old_value} → {change.new_value}"
            )
            if change.is_overwrite:
                content.append("    ⚠️  此变更覆盖了早先的阈值配置")

            details.append(
                {
                    "feature_id": change.feature_id,
                    "old_threshold": change.old_value,
                    "new_threshold": change.new_value,
                    "source_file": change.source_file,
                    "source_line": change.source_line,
                    "source": change.source.value,
                    "changed_at": change.changed_at.isoformat(),
                    "reason": change.reason,
                    "is_overwrite": change.is_overwrite,
                }
            )

        return ReportSection(
            title="阈值变化",
            content=content,
            details=details,
        )

    def _build_manual_overrides(
        self, result: ProcessingResult
    ) -> ReportSection:
        manual_changes = [
            c
            for c in result.changes
            if c.change_type == ChangeType.MANUAL_OVERRIDE
        ]

        content = [f"人工改判总数: {len(manual_changes)}"]
        details = []

        for change in manual_changes:
            content.append(
                f"  特征 {change.feature_id}: {change.old_value} → {change.new_value}"
            )
            content.append(
                f"    操作人: {change.changed_by}, 原因: {change.reason}"
            )
            if change.is_overwrite:
                content.append("    ⚠️  此改判覆盖了原有配置")

            details.append(
                {
                    "feature_id": change.feature_id,
                    "old_value": change.old_value,
                    "new_value": change.new_value,
                    "changed_by": change.changed_by,
                    "reason": change.reason,
                    "source_file": change.source_file,
                    "source_line": change.source_line,
                    "changed_at": change.changed_at.isoformat(),
                    "is_overwrite": change.is_overwrite,
                }
            )

        return ReportSection(
            title="人工改判",
            content=content,
            details=details,
        )

    def _build_bad_data_issues(
        self, result: ProcessingResult
    ) -> ReportSection:
        bad_rows = [r for r in result.rows if r.status == RowStatus.BAD]

        content = [f"坏数据总数: {len(bad_rows)}"]
        details = []

        for row in bad_rows:
            ref = f"行 {row.source_line}"
            if row.source_object:
                ref += f", 对象 {row.source_object}"

            content.append(
                f"  [{ref}] 特征 {row.feature_id or '未知'}: {row.error_message}"
            )

            details.append(
                {
                    "row_index": row.row_index,
                    "source_line": row.source_line,
                    "source_object": row.source_object,
                    "feature_id": row.feature_id,
                    "error_message": row.error_message,
                    "raw_data": row.raw_data,
                }
            )

        return ReportSection(
            title="坏数据问题",
            content=content,
            details=details,
        )

    def _build_raw_data_references(
        self, result: ProcessingResult
    ) -> ReportSection:
        skipped_rows = [
            r for r in result.rows if r.status == RowStatus.SKIPPED
        ]

        content = [f"跳过行数: {len(skipped_rows)}"]
        details = []

        for row in skipped_rows:
            ref = f"行 {row.source_line}"
            if row.source_object:
                ref += f", 对象 {row.source_object}"

            content.append(
                f"  [{ref}] 特征 {row.feature_id}: {row.skip_reason}"
            )
            if row.matched_feature:
                content.append(
                    f"    可能匹配的灰度配置特征: {row.matched_feature}"
                )

            details.append(
                {
                    "row_index": row.row_index,
                    "source_line": row.source_line,
                    "source_object": row.source_object,
                    "feature_id": row.feature_id,
                    "skip_reason": row.skip_reason,
                    "matched_feature": row.matched_feature,
                    "raw_data": row.raw_data,
                }
            )

        return ReportSection(
            title="原始数据引用与跳过原因",
            content=content,
            details=details,
        )

    def _build_config_traceability(
        self, result: ProcessingResult
    ) -> ReportSection:
        config = self.config_loader.loaded_configs.get(result.config_id)
        if not config:
            return ReportSection(
                title="配置溯源",
                content=["无法找到配置信息"],
                details=[],
            )

        content = [
            f"当前配置 ID: {config.config_id}",
            f"版本: {config.version}",
            f"来源文件: {config.source_file}",
        ]

        if config.parent_config_id:
            content.append(f"父配置 ID: {config.parent_config_id}")

        details = []

        for feature in config.features:
            trace = self.config_loader.get_feature_traceability(
                config.config_id, feature.feature_id
            )

            content.append(
                f"  特征 {feature.feature_id} ({feature.feature_name}):"
            )
            content.append(
                f"    来源: {feature.source_file}:{feature.source_line}"
            )
            content.append(f"    阈值: {feature.threshold}")
            content.append(f"    样本数: {len(feature.sample_ids)}")

            if len(trace) > 1:
                content.append(f"    历史变更 ({len(trace)} 条):")
                for t in trace:
                    content.append(
                        f"      - {t['version']} @ {t['source_file']}:{t['source_line']}"
                        f" → 阈值={t['value']['threshold']}, 样本={len(t['value']['sample_ids'])}"
                    )

            details.append(
                {
                    "feature_id": feature.feature_id,
                    "feature_name": feature.feature_name,
                    "current": {
                        "threshold": feature.threshold,
                        "sample_count": len(feature.sample_ids),
                        "source_file": feature.source_file,
                        "source_line": feature.source_line,
                        "config_source": feature.config_source.value,
                    },
                    "history": trace,
                }
            )

        return ReportSection(
            title="配置溯源",
            content=content,
            details=details,
        )

    def _export_report(
        self,
        report: LineageReport,
        output_file: str,
        output_format: str,
    ) -> None:
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        if output_format == "json":
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(report.model_dump(), f, ensure_ascii=False, indent=2, default=str)
        elif output_format == "text":
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(self._format_text_report(report))
        elif output_format == "markdown":
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(self._format_markdown_report(report))

    def _format_text_report(self, report: LineageReport) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append("  特征血缘任务追踪报告")
        lines.append("=" * 60)
        lines.append("")

        for section_name in [
            "summary",
            "sample_changes",
            "threshold_changes",
            "manual_overrides",
            "bad_data_issues",
            "raw_data_references",
            "config_traceability",
        ]:
            section = getattr(report, section_name)
            lines.append(f"【{section.title}】")
            lines.append("-" * 40)
            lines.extend(section.content)
            lines.append("")

        return "\n".join(lines)

    def _format_markdown_report(self, report: LineageReport) -> str:
        lines = []
        lines.append("# 特征血缘任务追踪报告")
        lines.append("")
        lines.append(f"- **报告 ID**: {report.report_id}")
        lines.append(f"- **任务 ID**: {report.task_id}")
        lines.append(f"- **配置 ID**: {report.config_id}")
        lines.append(f"- **生成时间**: {report.generated_at}")
        lines.append("")

        for section_name in [
            "summary",
            "sample_changes",
            "threshold_changes",
            "manual_overrides",
            "bad_data_issues",
            "raw_data_references",
            "config_traceability",
        ]:
            section = getattr(report, section_name)
            lines.append(f"## {section.title}")
            lines.append("")
            for line in section.content:
                lines.append(f"- {line}")
            lines.append("")

        return "\n".join(lines)

    def print_console_report(self, report: LineageReport) -> None:
        try:
            from rich.console import Console
            from rich.panel import Panel
            from rich.table import Table

            console = Console()

            console.print(
                Panel.fit(
                    "[bold cyan]特征血缘任务追踪报告[/bold cyan]",
                    border_style="cyan",
                )
            )

            stats_table = Table(title="处理统计", show_header=True, header_style="bold magenta")
            stats_table.add_column("类别")
            stats_table.add_column("数量", justify="right")
            stats_table.add_column("占比", justify="right")

            total = report.summary.details[0]["value"] if report.summary.details else 0
            for detail in report.summary.details:
                if detail["category"] == "统计":
                    pct = (detail["value"] / total * 100) if total > 0 else 0
                    stats_table.add_row(
                        detail["key"],
                        str(detail["value"]),
                        f"{pct:.1f}%",
                    )
            console.print(stats_table)

            if report.bad_data_issues.details:
                console.print("\n[bold red]坏数据问题:[/bold red]")
                for detail in report.bad_data_issues.details[:5]:
                    console.print(
                        f"  行 {detail['source_line']}, 对象 {detail['source_object']}: {detail['error_message']}"
                    )
                if len(report.bad_data_issues.details) > 5:
                    console.print(
                        f"  ... 还有 {len(report.bad_data_issues.details) - 5} 条问题"
                    )

            change_count = sum(
                1
                for section in [
                    report.sample_changes,
                    report.threshold_changes,
                    report.manual_overrides,
                ]
                for _ in section.details
            )
            if change_count > 0:
                console.print(f"\n[bold yellow]共有 {change_count} 条变更记录[/bold yellow]")
                console.print(
                    f"  - 样本变化: {len(report.sample_changes.details)} 条"
                )
                console.print(
                    f"  - 阈值变化: {len(report.threshold_changes.details)} 条"
                )
                console.print(
                    f"  - 人工改判: {len(report.manual_overrides.details)} 条"
                )

        except ImportError:
            print(self._format_text_report(report))
