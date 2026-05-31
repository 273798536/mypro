from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .models import MatchResult, Report, VariationType


class ReportGenerator:
    def generate_report(self, matches: list[MatchResult], audit_trail: list[dict[str, Any]], query_motif_id: str) -> Report:
        summary = self._build_summary(matches)
        return Report(
            query_motif_id=query_motif_id,
            matches=matches,
            audit_trail=[],  # filled from audit_log
            summary=summary,
        )

    def format_report(self, report: Report) -> str:
        lines: list[str] = []

        lines.append("=" * 60)
        lines.append(f"旋律动机检索报告")
        lines.append("=" * 60)
        lines.append(f"查询动机: {report.query_motif_id}")
        lines.append(f"生成时间: {report.generated_at}")
        lines.append(f"匹配结果数: {len(report.matches)}")
        lines.append("")

        lines.append(f"摘要: {report.summary}")
        lines.append("")

        for i, m in enumerate(report.matches, 1):
            lines.append("-" * 40)
            lines.append(f"匹配 #{i}")
            lines.append(f"  候选动机: {m.matched_motif_id}")
            lines.append(f"  变奏类型: {m.variation_type.value}")
            lines.append(f"  置信度: {m.evidence.confidence:.2f}")
            lines.append(f"  证据详情: {m.evidence.detail}")

            if m.evidence.transposition_semitones is not None and m.evidence.transposition_semitones != 0:
                lines.append(f"  移调: {m.evidence.transposition_semitones} 半音")
            if m.evidence.stretch_ratio is not None:
                lines.append(f"  节奏拉伸比: {m.evidence.stretch_ratio}")
            if m.evidence.misalign_beats is not None:
                lines.append(f"  小节错位: {m.evidence.misalign_beats} 拍")
                if m.evidence.misalign_measures is not None:
                    lines.append(f"  错位小节数: {m.evidence.misalign_measures}")

            if m.suggestions:
                lines.append(f"  修正建议:")
                for s in m.suggestions:
                    lines.append(f"    [{s.priority}] {s.action} → {s.target}")
                    lines.append(f"         {s.detail}")

            if m.annotation_id:
                lines.append(f"  批注ID: {m.annotation_id}")

            lines.append("")

        if report.audit_trail:
            lines.append("=" * 60)
            lines.append("审计轨迹")
            lines.append("=" * 60)
            for e in report.audit_trail:
                lines.append(f"  [{e['timestamp']}] {e['action']}")
                if e.get("detail"):
                    lines.append(f"    {e['detail']}")
                if e.get("operator") and e["operator"] != "system":
                    lines.append(f"    操作者: {e['operator']}")

        return "\n".join(lines)

    def save_report(self, report: Report, path: str, audit_trail: list[dict[str, Any]] | None = None) -> None:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)

        data: dict[str, Any] = {
            "query_motif_id": report.query_motif_id,
            "generated_at": report.generated_at,
            "summary": report.summary,
            "matches": [],
            "audit_trail": audit_trail or [],
        }

        for m in report.matches:
            match_data: dict[str, Any] = {
                "matched_motif_id": m.matched_motif_id,
                "variation_type": m.variation_type.value,
                "evidence": {
                    "variation_type": m.evidence.variation_type.value,
                    "confidence": m.evidence.confidence,
                    "detail": m.evidence.detail,
                    "transposition_semitones": m.evidence.transposition_semitones,
                    "stretch_ratio": m.evidence.stretch_ratio,
                    "misalign_beats": m.evidence.misalign_beats,
                    "misalign_measures": m.evidence.misalign_measures,
                },
                "suggestions": [s.to_dict() for s in m.suggestions],
                "annotation_id": m.annotation_id,
                "match_timestamp": m.match_timestamp,
            }
            data["matches"].append(match_data)

        with open(p, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def _build_summary(self, matches: list[MatchResult]) -> str:
        if not matches:
            return "未找到匹配"

        exact = sum(1 for m in matches if m.variation_type == VariationType.EXACT)
        trans = sum(1 for m in matches if m.variation_type in (
            VariationType.TRANSPOSITION,
            VariationType.TRANSPOSITION_PLUS_MISALIGN,
            VariationType.TRANSPOSITION_PLUS_RHYTHM,
        ))
        rhythm = sum(1 for m in matches if m.variation_type in (
            VariationType.RHYTHM_STRETCH,
            VariationType.RHYTHM_STRETCH_PLUS_MISALIGN,
            VariationType.TRANSPOSITION_PLUS_RHYTHM,
        ))
        misalign = sum(1 for m in matches if m.variation_type in (
            VariationType.MEASURE_MISALIGN,
            VariationType.TRANSPOSITION_PLUS_MISALIGN,
            VariationType.RHYTHM_STRETCH_PLUS_MISALIGN,
        ))
        no_match = sum(1 for m in matches if m.variation_type == VariationType.NO_MATCH)

        parts = [f"共 {len(matches)} 条匹配"]
        if exact:
            parts.append(f"精确 {exact}")
        if trans:
            parts.append(f"移调 {trans}")
        if rhythm:
            parts.append(f"节奏拉伸 {rhythm}")
        if misalign:
            parts.append(f"小节错位 {misalign}")
        if no_match:
            parts.append(f"未匹配 {no_match}")

        return "，".join(parts)
