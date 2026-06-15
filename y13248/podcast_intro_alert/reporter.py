from __future__ import annotations

import json
from pathlib import Path

from podcast_intro_alert.models import (
    AnomalyRecord,
    AnomalyCategory,
    ProcessingStatus,
    ChannelTableEntry,
)
from podcast_intro_alert.adjudicator import Adjudicator


class Reporter:
    def __init__(self, adjudicator: Adjudicator) -> None:
        self._adj = adjudicator

    def generate(
        self,
        entries: list[ChannelTableEntry],
        anomalies: list[AnomalyRecord],
        output_dir: str | Path,
    ) -> dict[str, Path]:
        out = Path(output_dir)
        out.mkdir(parents=True, exist_ok=True)

        paths: dict[str, Path] = {}
        paths["channel_table"] = self._write_channel_table(entries, out)
        paths["processing_log"] = self._write_processing_log(anomalies, out)
        paths["report"] = self._write_markdown_report(entries, anomalies, out)
        return paths

    def _write_channel_table(self, entries: list[ChannelTableEntry], out: Path) -> Path:
        rows = []
        for e in entries:
            rows.append({
                "条目编号": e.entry_id,
                "期号": e.episode,
                "通道": e.channel,
                "曲名": e.song_name,
                "别名": e.song_alias or "",
                "片头文件": e.intro_file or "（缺失）",
                "时长(秒)": e.duration_sec or "",
                "演出者": e.artist or "",
                "备注": e.note or "",
            })
        path = out / "舞台通道表.json"
        path.write_text(
            json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        return path

    def _write_processing_log(self, anomalies: list[AnomalyRecord], out: Path) -> Path:
        log = []
        for a in anomalies:
            chain = self._adj.build_trace_chain(a)
            log.append(chain)
        path = out / "处理记录.json"
        path.write_text(
            json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        return path

    def _write_markdown_report(
        self,
        entries: list[ChannelTableEntry],
        anomalies: list[AnomalyRecord],
        out: Path,
    ) -> Path:
        lines: list[str] = []

        lines.append("# 播客片头异常提醒\n")

        gen_ts = _now_str()
        lines.append(f"> 生成时间：{gen_ts}\n")

        lines.append("## 一、异常概览\n")

        summary = self._category_summary(anomalies)
        lines.append("| 分类 | 数量 | 已处理 | 需补证据 | 待处理 |")
        lines.append("|------|------|--------|----------|--------|")
        for cat in AnomalyCategory:
            s = summary.get(cat.value, {"total": 0, "resolved": 0, "evidence": 0, "pending": 0})
            lines.append(
                f"| {cat.value} | {s['total']} | {s['resolved']} | {s['evidence']} | {s['pending']} |"
            )
        lines.append("")

        status_counts = self._status_summary(anomalies)
        lines.append("**状态总览**\n")
        for status, count in status_counts.items():
            lines.append(f"- {status}：{count}")
        lines.append("")

        lines.append("## 二、异常明细（可回溯来源）\n")

        for a in anomalies:
            lines.append(f"### {a.anomaly_id} — {a.category.value}\n")
            lines.append(f"- **异常原因**：{a.human_reason}")
            lines.append(f"- **处理状态**：{_status_badge(a.status)}")
            lines.append(f"- **结论**：{a.conclusion or '尚未结案'}")
            lines.append("")

            lines.append("**来源条目**\n")
            lines.append("| 条目编号 | 期号 | 通道 | 曲名 | 别名 | 片头文件 | 演出者 |")
            lines.append("|----------|------|------|------|------|----------|--------|")
            for eid in a.source_entry_ids:
                entry = self._adj.get_entry(eid)
                if entry:
                    lines.append(
                        f"| {entry.entry_id} | {entry.episode} | {entry.channel} "
                        f"| {entry.song_name} | {entry.song_alias or '—'} "
                        f"| {entry.intro_file or '（缺失）'} | {entry.artist or '—'} |"
                    )
            lines.append("")

            if a.rejudgment:
                rj = a.rejudgment
                lines.append("**改判记录**\n")
                lines.append(f"- 改判编号：{rj.rejudgment_id}")
                lines.append(f"- 操作人：{rj.operator}")
                lines.append(f"- 原判定：{rj.original_verdict}")
                lines.append(f"- 改判为：{rj.new_verdict}")
                lines.append(f"- 改判原因：{rj.reason}")
                lines.append(f"- 时间：{rj.timestamp}")
                if rj.evidence_refs:
                    lines.append(f"- 证据引用：{', '.join(rj.evidence_refs)}")
                lines.append("")

            if a.status == ProcessingStatus.EVIDENCE_NEEDED:
                lines.append("> ⚠️ 该异常需要补充证据后方可结案\n")

        lines.append("## 三、交付说明\n")
        lines.append("本报告包含以下三份文件，供录音师对内外交接使用：\n")
        lines.append("1. **舞台通道表.json** — 原始通道数据，条目编号与明细一一对应")
        lines.append("2. **处理记录.json** — 每条异常的完整追溯链（来源条目 → 改判 → 结论）")
        lines.append("3. **播客片头异常提醒.md**（本文件）— 人可读报告，概览 + 明细 + 交付说明\n")
        lines.append("交接时请将三份文件一同发送，接收方可从报告中「异常明细」追溯到通道表原始条目，再从处理记录查看改判与证据。")
        lines.append("")

        path = out / "播客片头异常提醒.md"
        path.write_text("\n".join(lines), encoding="utf-8")
        return path

    def _category_summary(self, anomalies: list[AnomalyRecord]) -> dict:
        result: dict[str, dict[str, int]] = {}
        for a in anomalies:
            cat = a.category.value
            if cat not in result:
                result[cat] = {"total": 0, "resolved": 0, "evidence": 0, "pending": 0}
            result[cat]["total"] += 1
            if a.is_resolved():
                result[cat]["resolved"] += 1
            elif a.status == ProcessingStatus.EVIDENCE_NEEDED:
                result[cat]["evidence"] += 1
            else:
                result[cat]["pending"] += 1
        return result

    def _status_summary(self, anomalies: list[AnomalyRecord]) -> dict[str, int]:
        counts: dict[str, int] = {}
        for a in anomalies:
            label = a.status.value
            counts[label] = counts.get(label, 0) + 1
        return counts


def _status_badge(status: ProcessingStatus) -> str:
    badge_map = {
        ProcessingStatus.PENDING: "⏳ 待处理",
        ProcessingStatus.EVIDENCE_NEEDED: "⚠️ 需补证据",
        ProcessingStatus.REJUDGED: "✅ 已改判",
        ProcessingStatus.CONFIRMED: "✅ 已确认",
        ProcessingStatus.WAIVED: "🟡 已豁免",
    }
    return badge_map.get(status, status.value)


def _now_str() -> str:
    from datetime import datetime

    return datetime.now().strftime("%Y-%m-%d %H:%M")
