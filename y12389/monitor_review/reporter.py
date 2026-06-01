from __future__ import annotations

import json
from pathlib import Path

from .models import (
    ChannelList,
    ConsoleSnapshot,
    CorrespondenceEntry,
    ProblemType,
    ReviewReport,
)

_SEVERITY_MARKERS = {
    "high": "⚠️⚠️⚠️",
    "medium": "⚠️⚠️",
    "low": "⚠️",
}

_PROBLEM_TYPE_MARKERS = {
    ProblemType.CHANNEL_MISMATCH: "【通道错配】",
    ProblemType.SNAPSHOT_MISSING: "【快照缺失】",
    ProblemType.FEEDBACK_DUPLICATE: "【反馈重复】",
}


def _format_problems_text(report: ReviewReport) -> str:
    lines: list[str] = []
    lines.append("=" * 60)
    lines.append("问题清单")
    lines.append("=" * 60)

    grouped: dict[ProblemType, list] = {pt: [] for pt in ProblemType}
    for p in report.problems:
        grouped[p.problem_type].append(p)

    for ptype in ProblemType:
        items = grouped[ptype]
        if not items:
            continue
        marker = _PROBLEM_TYPE_MARKERS[ptype]
        lines.append("")
        lines.append(f"{marker} ({len(items)} 项)")
        lines.append("-" * 40)
        for i, p in enumerate(items, 1):
            sev = _SEVERITY_MARKERS.get(p.severity, "⚠️")
            lines.append(f"  {i}. {sev} [{p.severity}] {p.description}")
            if p.channel_refs:
                lines.append(f"     涉及通道: {p.channel_refs}")
            if p.bus_refs:
                lines.append(f"     涉及 Bus: {p.bus_refs}")
            if p.snapshot_refs:
                lines.append(f"     涉及快照: {p.snapshot_refs}")
            if p.musician_refs:
                lines.append(f"     涉及乐手: {p.musician_refs}")
            if p.trace_refs:
                lines.append(f"     来源追溯: {p.trace_refs}")

    return "\n".join(lines)


def _format_attributions_text(report: ReviewReport) -> str:
    lines: list[str] = []
    lines.append("")
    lines.append("=" * 60)
    lines.append("故障归因")
    lines.append("=" * 60)
    for i, a in enumerate(report.attributions, 1):
        lines.append(f"  {i}. 根因: {a.root_cause}")
        lines.append(f"     置信度: {a.confidence}")
        if a.affected_channels:
            lines.append(f"     受影响通道: {a.affected_channels}")
        if a.affected_buses:
            lines.append(f"     受影响 Bus: {a.affected_buses}")
        for e in a.evidence:
            lines.append(f"     依据: {e}")
    return "\n".join(lines)


def _format_time_alignments_text(report: ReviewReport) -> str:
    lines: list[str] = []
    lines.append("")
    lines.append("=" * 60)
    lines.append("时间对齐")
    lines.append("=" * 60)
    for i, t in enumerate(report.time_alignments, 1):
        status = "✓ 对齐" if t.aligned else "✗ 未对齐"
        lines.append(f"  {i}. {status}")
        lines.append(f"     事件时间: {t.event_time or '未知'}")
        lines.append(f"     快照时间: {t.snapshot_time or '未知'}")
        lines.append(f"     反馈时间: {t.feedback_time or '未知'}")
        if t.offset_seconds is not None:
            lines.append(f"     时间偏差: {t.offset_seconds:.0f} 秒")
        if t.note:
            lines.append(f"     备注: {t.note}")
    return "\n".join(lines)


def _format_corrections_text(report: ReviewReport) -> str:
    lines: list[str] = []
    lines.append("")
    lines.append("=" * 60)
    lines.append("修正建议")
    lines.append("=" * 60)
    for i, c in enumerate(report.corrections, 1):
        sev = _SEVERITY_MARKERS.get(c.priority, "⚠️")
        lines.append(f"  {i}. {sev} [{c.priority}] {c.target}")
        lines.append(f"     操作: {c.action}")
        if c.rationale:
            lines.append(f"     依据: {c.rationale}")
    return "\n".join(lines)


def _format_correspondences_text(report: ReviewReport) -> str:
    lines: list[str] = []
    lines.append("")
    lines.append("=" * 60)
    lines.append("对应关系（通道列表 / 返听设置 / 报告导出）")
    lines.append("=" * 60)
    if not report.correspondences:
        lines.append("  无对应关系记录")
    for i, c in enumerate(report.correspondences, 1):
        lines.append(f"  {i}. 通道列表来源: {c.channel_list_trace_id}")
        lines.append(f"     快照来源: {c.snapshot_trace_id}")
        lines.append(f"     报告来源: {c.report_trace_id}")
        lines.append(f"     涉及通道: {c.channel_numbers}")
        lines.append(f"     涉及 Bus: {c.bus_names}")
        if c.note:
            lines.append(f"     备注: {c.note}")
    return "\n".join(lines)


def _format_header(report: ReviewReport) -> str:
    lines: list[str] = []
    lines.append("=" * 60)
    lines.append("现场返听故障复盘报告")
    lines.append("=" * 60)
    lines.append(f"  演出名称: {report.event_name}")
    lines.append(f"  生成时间: {report.created_at}")
    lines.append(f"  报告来源: {report.trace.source}")
    lines.append(f"  报告 ID: {report.trace.record_id}")
    lines.append(f"  通道列表来源 ID: {report.channel_list_trace_id}")
    lines.append(f"  快照来源 ID: {report.snapshot_trace_id}")
    return "\n".join(lines)


def format_report_text(report: ReviewReport) -> str:
    sections = [
        _format_header(report),
        _format_problems_text(report),
        _format_attributions_text(report),
        _format_time_alignments_text(report),
        _format_corrections_text(report),
        _format_correspondences_text(report),
    ]
    return "\n".join(sections)


def build_correspondences(
    channel_list: ChannelList,
    snapshot: ConsoleSnapshot,
    report: ReviewReport,
) -> list[CorrespondenceEntry]:
    entries: list[CorrespondenceEntry] = []
    ch_trace_id = channel_list.trace.record_id
    snap_trace_id = snapshot.trace.record_id
    report_trace_id = report.trace.record_id

    for setting in snapshot.monitor_settings:
        entries.append(
            CorrespondenceEntry(
                channel_list_trace_id=ch_trace_id,
                snapshot_trace_id=snap_trace_id,
                report_trace_id=report_trace_id,
                channel_numbers=setting.channels,
                bus_names=[setting.bus],
                note=f"乐手 {setting.musician} 的返听设置",
            )
        )

    for ch in channel_list.channels:
        if not any(ch.ch_number in e.channel_numbers for e in entries):
            entries.append(
                CorrespondenceEntry(
                    channel_list_trace_id=ch_trace_id,
                    snapshot_trace_id=snap_trace_id,
                    report_trace_id=report_trace_id,
                    channel_numbers=[ch.ch_number],
                    bus_names=[ch.bus_assignment] if ch.bus_assignment else [],
                    note=f"通道 {ch.ch_number}（{ch.name}）未在返听设置中出现",
                )
            )

    return entries


def export_report_text(report: ReviewReport, path: str) -> str:
    text = format_report_text(report)
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")
    return str(p.resolve())


def export_report_json(report: ReviewReport, path: str) -> str:
    data = report.to_dict()
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(p.resolve())
