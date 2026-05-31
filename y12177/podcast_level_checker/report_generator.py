import os
from typing import Dict, Any
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich import box
from datetime import datetime
from .history_tracker import CheckReport, Finding
from .segment_identifier import format_time, SegmentType


class ReportGenerator:
    TYPE_LABELS = {
        "voice": "人声",
        "silence": "静音",
        "music": "配乐",
        "advertisement": "广告",
        "mixed": "混合",
        "unknown": "未知"
    }

    TYPE_COLORS = {
        "voice": "green",
        "silence": "dim",
        "music": "blue",
        "advertisement": "yellow",
        "mixed": "magenta",
        "unknown": "red"
    }

    SEVERITY_COLORS = {
        "high": "bold red",
        "medium": "yellow",
        "low": "blue",
        "info": "green"
    }

    def __init__(self, console: Console = None):
        self.console = console or Console()

    def _get_type_label(self, seg_type: str) -> str:
        return self.TYPE_LABELS.get(seg_type, seg_type)

    def _get_type_color(self, seg_type: str) -> str:
        return self.TYPE_COLORS.get(seg_type, "white")

    def _get_severity_color(self, severity: str) -> str:
        return self.SEVERITY_COLORS.get(severity, "white")

    def print_terminal_summary(self, report: CheckReport,
                               comparison: Dict[str, Any] = None) -> None:
        self.console.rule("[bold cyan]播客配乐电平检查报告[/bold cyan]")

        header = Table(box=box.SIMPLE, show_header=False)
        header.add_column("项目", style="bold")
        header.add_column("内容")
        header.add_row("报告ID", report.report_id)
        header.add_row("检查时间", datetime.fromisoformat(report.timestamp).strftime("%Y-%m-%d %H:%M:%S"))
        header.add_row("输入目录", report.input_dir)
        header.add_row("输出目录", report.output_dir)
        header.add_row("分析文件数", str(report.total_files))

        params = report.parameters
        param_str = f"静音阈值 {params.get('silence_threshold_db', -40)}dB | "
        param_str += f"配乐阈值 {params.get('music_loud_threshold_db', -15)}dB"
        header.add_row("检查参数", param_str)

        self.console.print(Panel(header, title="检查概览", border_style="cyan"))

        if report.total_findings > 0:
            summary = Table(box=box.ROUNDED, title="问题汇总")
            summary.add_column("严重程度", style="bold")
            summary.add_column("数量", justify="right")
            summary.add_column("占比", justify="right")

            total = report.total_findings
            for severity, count in sorted(report.findings_by_severity.items()):
                pct = (count / total * 100) if total > 0 else 0
                color = self._get_severity_color(severity)
                summary.add_row(
                    Text(severity.upper(), style=color),
                    str(count),
                    f"{pct:.1f}%"
                )

            self.console.print(summary)

            type_summary = Table(box=box.ROUNDED, title="按类型统计")
            type_summary.add_column("类型", style="bold")
            type_summary.add_column("数量", justify="right")

            for ftype, count in sorted(report.findings_by_type.items()):
                type_summary.add_row(ftype, str(count))

            self.console.print(type_summary)

        if comparison and comparison.get("has_previous"):
            comp_panel = Table(box=box.SIMPLE, show_header=False)
            comp_panel.add_column("项目", style="bold")
            comp_panel.add_column("内容")
            comp_panel.add_row("上次检查", comparison.get("previous_timestamp", ""))
            comp_panel.add_row("新增问题", f"[red]{comparison.get('new_count', 0)}[/red]")
            comp_panel.add_row("已解决", f"[green]{comparison.get('resolved_count', 0)}[/green]")
            self.console.print(Panel(comp_panel, title="历史对比", border_style="magenta"))

        for file_summary in report.files:
            if file_summary.total_findings == 0:
                continue

            self.console.rule(f"[bold]{file_summary.file_name}[/bold]")

            seg_table = Table(box=box.HORIZONTALS, title="段落识别结果")
            seg_table.add_column("#", justify="right")
            seg_table.add_column("时间段")
            seg_table.add_column("时长")
            seg_table.add_column("类型", style="bold")
            seg_table.add_column("电平(dB)")
            seg_table.add_column("置信度")
            seg_table.add_column("标记")

            for i, seg in enumerate(file_summary.segments, 1):
                seg_type = seg.get("segment_type", "unknown")
                color = self._get_type_color(seg_type)
                markers = seg.get("markers", [])
                marker_labels = ", ".join([m.get("label", "")[:10] for m in markers if m.get("label")])

                seg_table.add_row(
                    str(i),
                    f"{format_time(seg['start_ms'])} - {format_time(seg['end_ms'])}",
                    seg.get("duration", ""),
                    Text(self._get_type_label(seg_type), style=color),
                    f"{seg.get('average_rms_db', 0):.1f}",
                    f"{seg.get('confidence', 0):.0%}",
                    marker_labels or "-"
                )

            self.console.print(seg_table)

            file_findings = [f for f in report.findings
                             if any(fs.source_file == f.sources[0].file_path
                                    for fs in [file_summary])]

            if file_findings:
                issues_table = Table(box=box.HORIZONTALS, title="需要关注的问题")
                issues_table.add_column("严重", style="bold")
                issues_table.add_column("类型")
                issues_table.add_column("时间段")
                issues_table.add_column("消息")
                issues_table.add_column("来源")

                for finding in file_findings:
                    sev_color = self._get_severity_color(finding.severity)
                    source_files = ", ".join(
                        [os.path.basename(s.file_path) for s in finding.sources[:2]]
                    )

                    issues_table.add_row(
                        Text(finding.severity.upper(), style=sev_color),
                        self._get_type_label(finding.segment_type),
                        finding.time_range_str,
                        finding.message,
                        source_files
                    )

                self.console.print(issues_table)

        self._print_finding_details(report.findings)

        self.console.rule("[bold]检查完成[/bold]")
        if report.total_findings == 0:
            self.console.print("[green]✓ 未发现问题[/green]")
        else:
            self.console.print(
                f"[yellow]⚠ 共发现 {report.total_findings} 个问题, "
                f"详细报告已保存至输出目录[/yellow]"
            )

    def _print_finding_details(self, findings: list) -> None:
        if not findings:
            return

        self.console.rule("[bold]问题详情[/bold]")

        for i, finding in enumerate(findings, 1):
            sev_color = self._get_severity_color(finding.severity)

            title = Text()
            title.append(f"#{i} ", style="bold")
            title.append(f"[{finding.severity.upper()}] ", style=sev_color)
            title.append(f"{self._get_type_label(finding.segment_type)} ")
            title.append(finding.time_range_str, style="dim")

            content = Text()
            content.append(f"消息: {finding.message}\n")
            content.append(f"置信度: {finding.confidence:.0%}\n")
            content.append(f"时长: {finding.duration_str}\n\n")

            content.append("[bold]证据:[/bold]\n")
            for ev in finding.evidence:
                content.append(f"  • {ev}\n")

            content.append("\n[bold]来源追溯:[/bold]\n")
            for src in finding.sources:
                src_type = "音频" if src.file_type == "audio" else "标记"
                line_info = f" (行 {src.line_number})" if src.line_number else ""
                content.append(f"  {src_type}: {os.path.basename(src.file_path)}{line_info}\n")

                for key, value in src.details.items():
                    if isinstance(value, float):
                        content.append(f"    {key}: {value:.2f}\n")
                    else:
                        content.append(f"    {key}: {value}\n")

            self.console.print(Panel(content, title=title, border_style=sev_color))

    def generate_text_report(self, report: CheckReport,
                             file_path: str) -> str:
        lines = []

        lines.append("=" * 70)
        lines.append("                         播客配乐电平检查报告")
        lines.append("=" * 70)
        lines.append("")

        lines.append(f"报告ID:   {report.report_id}")
        lines.append(f"检查时间: {datetime.fromisoformat(report.timestamp).strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"输入目录: {report.input_dir}")
        lines.append(f"输出目录: {report.output_dir}")
        lines.append(f"分析文件: {report.total_files} 个")
        lines.append("")

        params = report.parameters
        lines.append("检查参数:")
        lines.append(f"  - 静音阈值: {params.get('silence_threshold_db', -40)} dB")
        lines.append(f"  - 配乐过响阈值: {params.get('music_loud_threshold_db', -15)} dB")
        lines.append(f"  - 帧长: {params.get('frame_ms', 100)} ms")
        lines.append("")

        lines.append("-" * 70)
        lines.append("问题汇总")
        lines.append("-" * 70)
        lines.append("")

        if report.total_findings == 0:
            lines.append("✓ 未发现任何问题")
        else:
            lines.append(f"共发现 {report.total_findings} 个问题:")
            for severity, count in sorted(report.findings_by_severity.items()):
                lines.append(f"  {severity.upper()}: {count} 个")
            lines.append("")

            for ftype, count in sorted(report.findings_by_type.items()):
                lines.append(f"  {ftype}: {count} 个")
            lines.append("")

        for file_summary in report.files:
            lines.append("-" * 70)
            lines.append(f"文件: {file_summary.file_name}")
            lines.append(f"时长: {file_summary.duration_str}")
            lines.append(f"问题数: {file_summary.total_findings}")
            lines.append("-" * 70)
            lines.append("")

            lines.append("段落识别结果:")
            lines.append(f"{'#':>3} {'时间段':<24} {'时长':<10} {'类型':<6} {'电平':>6} {'置信':>5} {'标记'}")
            lines.append("-" * 90)

            for i, seg in enumerate(file_summary.segments, 1):
                seg_type = self._get_type_label(seg.get("segment_type", "unknown"))
                markers = seg.get("markers", [])
                marker_labels = ", ".join([m.get("label", "")[:10] for m in markers if m.get("label")])

                lines.append(
                    f"{i:>3} "
                    f"{format_time(seg['start_ms'])} - {format_time(seg['end_ms']):<12} "
                    f"{seg.get('duration', ''):<10} "
                    f"{seg_type:<6} "
                    f"{seg.get('average_rms_db', 0):>6.1f} "
                    f"{seg.get('confidence', 0):>4.0%} "
                    f"{marker_labels or '-'}"
                )
            lines.append("")

            file_findings = [f for f in report.findings
                             if f.sources and f.sources[0].file_path == file_summary.source_file]

            if file_findings:
                lines.append("需要关注的问题:")
                lines.append(f"{'#':>3} {'严重':<6} {'类型':<6} {'时间段':<24} {'消息'}")
                lines.append("-" * 90)

                for i, finding in enumerate(file_findings, 1):
                    seg_type = self._get_type_label(finding.segment_type)
                    lines.append(
                        f"{i:>3} "
                        f"{finding.severity.upper():<6} "
                        f"{seg_type:<6} "
                        f"{finding.time_range_str:<24} "
                        f"{finding.message}"
                    )
                lines.append("")

        if report.findings:
            lines.append("=" * 70)
            lines.append("问题详情")
            lines.append("=" * 70)
            lines.append("")

            for i, finding in enumerate(report.findings, 1):
                lines.append(f"--- 问题 #{i} ---")
                lines.append(f"严重程度: {finding.severity.upper()}")
                lines.append(f"类型: {self._get_type_label(finding.segment_type)}")
                lines.append(f"时间段: {finding.time_range_str}")
                lines.append(f"时长: {finding.duration_str}")
                lines.append(f"置信度: {finding.confidence:.0%}")
                lines.append(f"消息: {finding.message}")
                lines.append("")

                lines.append("证据:")
                for ev in finding.evidence:
                    lines.append(f"  - {ev}")
                lines.append("")

                lines.append("来源追溯:")
                for src in finding.sources:
                    src_type = "音频文件" if src.file_type == "audio" else "标记文件"
                    line_info = f" (第 {src.line_number} 行)" if src.line_number else ""
                    lines.append(f"  [{src_type}] {src.file_path}{line_info}")
                    for key, value in src.details.items():
                        if isinstance(value, float):
                            lines.append(f"      {key}: {value:.2f}")
                        else:
                            lines.append(f"      {key}: {value}")
                lines.append("")

        if report.corrections:
            lines.append("=" * 70)
            lines.append("修正历史")
            lines.append("=" * 70)
            lines.append("")

            for corr in report.corrections:
                lines.append(f"时间: {corr.timestamp}")
                lines.append(f"问题ID: {corr.finding_id}")
                lines.append(f"修正: {corr.original_type} -> {corr.corrected_type}")
                lines.append(f"原因: {corr.reason}")
                lines.append("")

        lines.append("=" * 70)
        lines.append(f"报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("=" * 70)

        text_content = "\n".join(lines)

        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(text_content)

        return file_path

    def generate_json_report(self, report: CheckReport,
                             file_path: str) -> str:
        report.save_json(file_path)
        return file_path
