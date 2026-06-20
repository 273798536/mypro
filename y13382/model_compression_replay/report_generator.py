"""
Markdown报告生成器
Markdown Report Generator

设计原则：
- 小许拿到这个报告可以直接对给别人看：训练日志、处理记录、结论必须一一对应
- 公式、单位、边界值摆在明处，不吐光秃秃的数字
- 每条结论都能追溯到"边界样本 + 日志行 + 指标证据"三件套
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from .metrics import CompressionMetrics
from .models import (
    BoundaryValue,
    CompressionSample,
    Conclusion,
    MetricWithFormula,
    ProcessingRecord,
    ProcessingStage,
    ReplayResult,
    SampleVerdict,
    TrainingLogEntry,
    VersionAlias,
)


class MarkdownReportGenerator:
    """
    Markdown报告生成器

    生成的报告结构：
    1. 概览（执行摘要 + 关键数字大盘）
    2. 版本别名清单（防止别人说"你用错了旧文件"）
    3. 公式与边界值总表（摆在明处，不用去翻代码）
    4. 逐条结论（改判/越界/边界样本）→ 每条都带三件套证据
    5. 样本回放明细（每个样本的判定 + 指标 + 关联日志）
    6. 坏数据清单（不让坏数据悄咪咪溜过去）
    7. 完整处理记录链（小许的审计凭证，别人挑不出刺）
    8. 原始日志关键片段引用（具体到行号和原文）
    """

    def __init__(self, metrics_engine: CompressionMetrics) -> None:
        self.metrics = metrics_engine
        self._records: List[ProcessingRecord] = []

    def _h(self, level: int, text: str) -> str:
        return f"{'#' * level} {text}\n\n"

    def _badge(self, ok: Optional[bool], text: str = "") -> str:
        if ok is None:
            return f"⚪ {text or '未校验'}"
        if ok:
            return f"🟢 {text or '边界内'}"
        return f"🔴 {text or '越界'}"

    def _verdict_badge(self, v: SampleVerdict) -> str:
        m = {
            SampleVerdict.NORMAL: "🟢 NORMAL(正常)",
            SampleVerdict.COMPRESSED: "🔵 COMPRESSED(已压缩)",
            SampleVerdict.BOUNDARY: "🟡 BOUNDARY(边界样本)",
            SampleVerdict.ANOMALY: "🔴 ANOMALY(异常)",
            SampleVerdict.CORRUPT: "⚫ CORRUPT(坏数据)",
        }
        return m.get(v, str(v))

    def _severity_badge(self, s: str) -> str:
        return {
            "INFO": "ℹ️ INFO",
            "WARNING": "⚠️ WARNING",
            "ERROR": "❌ ERROR",
            "FATAL": "💥 FATAL",
        }.get(s, s)

    def _render_metric_row(self, name: str, m: MetricWithFormula) -> str:
        lines = []
        lines.append(f"| **{name}** | `{m.format_value()}` | {self._badge(m.is_within_bounds)} |")
        if m.formula_plain:
            lines.append(f"| &nbsp;&nbsp;📐 公式 | {m.formula_plain} |")
        if m.boundary:
            lines.append(f"| &nbsp;&nbsp;📏 边界 | {m.boundary.describe()} |")
            lines.append(f"| &nbsp;&nbsp;💡 越界后果 | {m.boundary.expected_behavior or '-'} |")
        if m.used_log_refs:
            lines.append(f"| &nbsp;&nbsp;🔗 日志来源 | {', '.join(m.used_log_refs)} |")
        return "\n".join(lines) + "\n"

    def _render_log_entry(self, e: TrainingLogEntry) -> str:
        parts = [f"- **L{e.line_number}**"]
        if e.timestamp:
            parts.append(f"[{e.timestamp.strftime('%Y-%m-%d %H:%M:%S')}]")
        parts.append(f"[{e.severity.value}]")
        if e.stage:
            parts.append(f"[{e.stage}]")
        parts.append(f"`{e.excerpt()}`")
        line = " ".join(parts)
        if e.is_corrupt:
            line += f" — **⚠️ 坏数据** ({e.corrupt_reason})"
        if e.parse_errors:
            line += f" — 解析提示: {'; '.join(e.parse_errors)}"
        return line + "\n"

    def _render_boundary_table(self, boundaries: Dict[str, BoundaryValue]) -> str:
        lines = []
        lines.append("| 指标 | 下界 | 上界 | 越界时预期行为 | 关联结论ID |")
        lines.append("|------|-----:|-----:|---------------|------------|")
        for name, b in boundaries.items():
            lower = f"{'≥' if b.inclusive_lower else '>'} {b.lower}" if b.lower is not None else "-"
            upper = f"{'≤' if b.inclusive_upper else '<'} {b.upper}" if b.upper is not None else "-"
            lines.append(
                f"| `{name}` | {lower} | {upper} | {b.expected_behavior or '-'} | {b.associated_conclusion_id or '-'} |"
            )
        return "\n".join(lines) + "\n\n"

    def _render_summary_card(self, result: ReplayResult) -> str:
        s = result.summary()
        return (
            f"- **总样本数**: {s['总样本数']}\n"
            f"- **边界样本数**: 🟡 {s['边界样本数']}\n"
            f"- **改判样本数**: 🔄 {s['改判样本数']}\n"
            f"- **坏数据行数**: ⚫ {s['坏数据行数']}\n"
            f"- **处理记录数**: 📝 {s['处理记录数']}\n"
            f"- **结论条数**: 📌 {s['结论条数']}\n"
            f"- **回放开始**: {result.started_at.strftime('%Y-%m-%d %H:%M:%S')}\n"
            f"- **回放完成**: {result.finished_at.strftime('%Y-%m-%d %H:%M:%S') if result.finished_at else '(进行中)'}\n"
            f"- **运行ID**: `{result.run_id}`\n\n"
        )

    def _render_version_aliases(self, aliases: List[VersionAlias]) -> str:
        if not aliases:
            return "_本次未使用版本别名_\n\n"
        lines = ["| 别名 | 目标路径 | 冻结 | 备注 | SHA256前16位 |"]
        lines.append("|------|----------|------|------|--------------|")
        for va in aliases:
            frozen = "✅ 已冻结" if va.is_frozen else "❌ 未冻结"
            hash16 = va.target_hash[:16] if va.target_hash else "-"
            lines.append(
                f"| `{va.alias}` | `{va.target_path}` | {frozen} | {va.description or '-'} | `{hash16}` |"
            )
        return "\n".join(lines) + "\n\n"

    def _render_conclusions(self, conclusions: List[Conclusion],
                            samples_by_id: Dict[str, CompressionSample]) -> str:
        if not conclusions:
            return "_本次未生成结论_\n\n"
        lines = []
        for idx, c in enumerate(conclusions, start=1):
            lines.append(self._h(3, f"{idx}. [{self._severity_badge(c.severity)}] {c.title}"))
            lines.append(f"- **结论ID**: `{c.conclusion_id}`\n")
            lines.append(f"- **生成时间**: {c.timestamp.strftime('%Y-%m-%d %H:%M:%S')}\n")
            lines.append(f"\n{c.body}\n\n")

            lines.append("**证据链：**\n\n")
            lines.append(f"- 🔗 关联样本ID: {', '.join(c.evidence_sample_ids) or '(无)'}\n")
            lines.append(f"- 📊 关联指标: {', '.join(f'`{n}`' for n in c.evidence_metric_names) or '(无)'}\n")
            lines.append(f"- 📝 关联日志行: {', '.join(c.evidence_log_refs) or '(无)'}\n\n")

            for sid in c.evidence_sample_ids:
                s = samples_by_id.get(sid)
                if not s:
                    continue
                lines.append(f"**样本 [{sid}] 指标快照**\n\n")
                lines.append("| 指标 | 值 | 状态 |\n|------|----|------|\n")
                for name, m in s.metrics.items():
                    lines.append(
                        f"| `{name}` | {m.format_value()} | {self._badge(m.is_within_bounds)} |"
                    )
                lines.append("\n")
                if s.boundary_violations:
                    lines.append("**触发的边界违规**：\n\n")
                    for v in s.boundary_violations:
                        lines.append(f"- {v}\n")
                    lines.append("\n")
        return "\n".join(lines) + "\n"

    def _render_samples(self, samples: List[CompressionSample]) -> str:
        lines = []
        for s in samples:
            lines.append(self._h(3, f"样本 `{s.sample_id}` — {self._verdict_badge(s.verdict)}"))
            lines.append(f"- **输入引用**: `{s.input_ref}`\n")
            lines.append(f"- **版本别名**: `{s.version_alias or '(未使用)'}`\n")
            if s.prev_verdict is not None:
                lines.append(f"- **旧判定→新判定**: {self._verdict_badge(s.prev_verdict)} → **{self._verdict_badge(s.verdict)}**\n")
                lines.append(f"- **旧判定理由**: {s.prev_reason or '(未提供)'}\n")
            lines.append(f"- **判定理由**: {s.verdict_reason or '-'}\n")
            lines.append(f"- **边界样本**: {'✅ 是' if s.is_boundary_sample else '否'}\n")
            lines.append(f"- **关联结论ID**: {', '.join(f'`{cid}`' for cid in s.linked_conclusion_ids) or '-'}\n\n")

            lines.append("**指标明细（公式+单位+边界值在明处）**\n\n")
            lines.append("| 项目 | 内容 |\n|------|------|\n")
            for name, m in s.metrics.items():
                lines.append(self._render_metric_row(name, m))
            lines.append("\n")

            if s.log_entries:
                lines.append("**关联日志行（原始文本）**\n\n")
                for e in s.log_entries:
                    lines.append(self._render_log_entry(e))
                lines.append("\n")

            if s.boundary_violations:
                lines.append("**边界违规明细**\n\n")
                for idx, v in enumerate(s.boundary_violations, start=1):
                    lines.append(f"{idx}. {v}\n")
                lines.append("\n")
        return "\n".join(lines)

    def _render_bad_data(self, bad_rows: List[TrainingLogEntry]) -> str:
        if not bad_rows:
            return "_未检测到坏数据，材料干净_\n\n"
        lines = [f"共检测到 **{len(bad_rows)}** 行坏数据：\n\n"]
        for e in bad_rows:
            lines.append(self._render_log_entry(e))
        return "\n".join(lines) + "\n"

    def _render_processing_records(self, records: List[ProcessingRecord]) -> str:
        if not records:
            return "_无处理记录_\n\n"
        lines = [
            "| 时间 | 记录ID | 阶段 | 操作 | 关键输入/输出 | 关联日志 | 备注 |",
            "|------|--------|------|------|---------------|----------|------|",
        ]
        for r in records:
            stage_emoji = {
                ProcessingStage.LOG_IMPORT: "📥",
                ProcessingStage.METRIC_CALCULATION: "🧮",
                ProcessingStage.BOUNDARY_CHECK: "📏",
                ProcessingStage.SAMPLE_VERDICT: "⚖️",
                ProcessingStage.REPLAY_EXECUTION: "🔁",
                ProcessingStage.REPORT_GENERATION: "📄",
                ProcessingStage.BAD_DATA_FILTER: "🚫",
            }.get(r.stage, "•")

            io_parts = []
            for k, v in list(r.inputs.items())[:2]:
                io_parts.append(f"in:{k}={str(v)[:30]}")
            for k, v in list(r.outputs.items())[:2]:
                io_parts.append(f"out:{k}={str(v)[:30]}")
            io_text = " ; ".join(io_parts) or "-"

            log_refs_text = ", ".join(r.log_refs[:3]) or "-"
            if len(r.log_refs) > 3:
                log_refs_text += f" (+{len(r.log_refs) - 3})"

            note_text = " ; ".join(r.notes[:2]) or "-"
            if len(r.notes) > 2:
                note_text += f" (+{len(r.notes) - 2})"

            lines.append(
                f"| {r.timestamp.strftime('%H:%M:%S')} | `{r.record_id}` | {stage_emoji}{r.stage.value} | {r.action} | {io_text} | {log_refs_text} | {note_text} |"
            )
        return "\n".join(lines) + "\n\n"

    def generate(self, result: ReplayResult, output_path: Optional[str] = None) -> str:
        """
        生成完整Markdown报告

        Args:
            result: ReplayResult对象，包含所有回放材料
            output_path: 可选，写入文件的路径

        Returns:
            完整Markdown文本
        """
        from .models import ProcessingRecord as PR
        self._records.append(PR(
            record_id=f"REPORT-{uuid.uuid4().hex[:12]}",
            stage=ProcessingStage.REPORT_GENERATION,
            action="生成Markdown报告",
            inputs={"run_id": result.run_id, "samples": len(result.samples)},
            outputs={"output_path": output_path},
            log_refs=[],
            operator="MarkdownReportGenerator",
            notes=[f"报告包含{len(result.conclusions)}条结论,{len(result.processing_records)}条记录"],
        ))

        samples_by_id = {s.sample_id: s for s in result.samples}

        md = ""
        md += self._h(1, f"模型压缩异常回放报告 — Run `{result.run_id}`")
        md += f"> 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        md += (
            "> **交付说明**: 推荐算法小许可以把这份报告直接对给别人看。\n"
            "> 每份报告都包含: ①版本别名清单 ②公式与边界值总表 ③结论+证据链三件套 ④样本回放明细\n"
            "> ⑤坏数据清单 ⑥完整处理记录链 ⑦原始日志关键行。\n\n"
        )

        md += self._h(2, "① 执行概览")
        md += self._render_summary_card(result)

        md += self._h(2, "② 版本别名清单（防止用错旧文件）")
        md += self._render_version_aliases(result.version_aliases_used)

        md += self._h(2, "③ 公式与边界值总表（摆在明处）")
        md += self._render_boundary_table(self.metrics.all_boundaries())
        md += "**指标公式速查**：\n\n"
        md += "| 指标 | 单位 | 纯文本公式 |\n|------|------|----------|\n"
        formula_notes = {
            "kl_divergence": ("bits/dim", "D_KL(P||Q) = Σ P(x) * log2(P(x)/Q(x)), P/Q=softmax(logits/T)"),
            "compression_ratio": ("x(倍)", "r = 原始字节数 / 压缩后字节数"),
            "accuracy_drop_percent": ("%", "Δacc% = (基线精度 - 压缩后精度) × 100"),
            "weight_sparsity": ("%", "稀疏度 = 零值参数个数 / 总参数个数"),
            "fisher_information_norm": ("无单位", "||F||₂ = sqrt(Σ F_l²)"),
        }
        for name, (unit, fml) in formula_notes.items():
            md += f"| `{name}` | {unit} | {fml} |\n"
        md += "\n"

        md += self._h(2, "④ 逐条结论（每条都附证据链）")
        md += self._render_conclusions(result.conclusions, samples_by_id)

        md += self._h(2, "⑤ 样本回放明细")
        md += self._render_samples(result.samples)

        md += self._h(2, "⑥ 坏数据清单（坏数据不带偏结论）")
        md += self._render_bad_data(result.bad_data_rows)

        md += self._h(2, "⑦ 完整处理记录链（审计凭证）")
        md += self._render_processing_records(result.processing_records)

        md += self._h(2, "⑧ 附录：全部日志行引用索引")
        all_logs: Dict[str, TrainingLogEntry] = {}
        for s in result.samples:
            for e in s.log_entries:
                all_logs[e.as_reference()] = e
        for e in result.bad_data_rows:
            all_logs[e.as_reference()] = e
        if all_logs:
            md += "| 引用ID | 行号 | 原始文本摘要 | 状态 |\n"
            md += "|--------|-----:|-------------|------|\n"
            for ref, e in sorted(all_logs.items(), key=lambda kv: kv[1].line_number):
                status = "⚠️ 坏数据" if e.is_corrupt else (
                    "✅ 已解析" if e.extracted_fields else "ℹ️ 未提取字段"
                )
                md += f"| `{ref}` | {e.line_number} | {e.excerpt(60)} | {status} |\n"
        else:
            md += "_无日志行_\n"
        md += "\n"

        md += "---\n*本报告由 模型压缩异常回放系统 自动生成。*\n"

        if output_path:
            os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(md)

        return md

    def drain_records(self) -> List[ProcessingRecord]:
        recs = self._records
        self._records = []
        return recs
