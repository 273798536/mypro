from __future__ import annotations

from .models import (
    CorrectionSuggestion,
    MatchResult,
    Motif,
    VariationEvidence,
    VariationType,
)


class SuggestionGenerator:
    def generate(self, match: MatchResult, query: Motif, candidate: Motif) -> list[CorrectionSuggestion]:
        suggestions: list[CorrectionSuggestion] = []
        ev = match.evidence

        if ev.variation_type == VariationType.NO_MATCH:
            return suggestions

        if ev.variation_type == VariationType.EXACT:
            return suggestions

        if ev.transposition_semitones is not None and ev.transposition_semitones != 0:
            suggestions.extend(self._transposition_suggestions(ev, query, candidate))

        if ev.stretch_ratio is not None and abs(ev.stretch_ratio - 1.0) > 0.05:
            suggestions.extend(self._rhythm_stretch_suggestions(ev, query, candidate))

        if ev.misalign_beats is not None and abs(ev.misalign_beats) > 0.5:
            suggestions.extend(self._misalign_suggestions(ev, query, candidate))

        compound_types = {
            VariationType.TRANSPOSITION_PLUS_MISALIGN,
            VariationType.RHYTHM_STRETCH_PLUS_MISALIGN,
            VariationType.TRANSPOSITION_PLUS_RHYTHM,
        }
        if match.variation_type in compound_types:
            suggestions.append(CorrectionSuggestion(
                target=f"motif:{candidate.id}",
                action="分步修正",
                detail=f"检测到复合变奏（{match.variation_type.value}），建议按以下顺序修正：1) 先修正小节错位 2) 再修正节奏拉伸 3) 最后归一化移调。每步修正后重新运行匹配确认。",
                priority="high",
            ))

        return suggestions

    def _transposition_suggestions(
        self, ev: VariationEvidence, query: Motif, candidate: Motif
    ) -> list[CorrectionSuggestion]:
        semitones = ev.transposition_semitones
        direction = "上" if semitones > 0 else "下"

        note_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
        q_root = note_names[query.notes[0].pitch % 12]
        c_root = note_names[candidate.notes[0].pitch % 12]

        return [
            CorrectionSuggestion(
                target=f"motif:{candidate.id}",
                action="归一化移调",
                detail=f"将 {candidate.id} 向{direction}移调 {abs(semitones)} 半音即可与 {query.id} 对齐（{c_root} → {q_root}）。移调后音程序列应完全一致。",
                priority="high",
            ),
        ]

    def _rhythm_stretch_suggestions(
        self, ev: VariationEvidence, query: Motif, candidate: Motif
    ) -> list[CorrectionSuggestion]:
        suggestions: list[CorrectionSuggestion] = []

        ratio = ev.stretch_ratio
        if ratio is None:
            return suggestions

        if 0.9 <= ratio <= 1.1:
            suggestions.append(CorrectionSuggestion(
                target=f"motif:{candidate.id}",
                action="全局缩放时值",
                detail=f"整体时值比 {ratio}，接近 1.0。建议将 {candidate.id} 所有音符时值乘以 {1.0 / ratio:.3f} 进行归一化。",
                priority="medium",
            ))
        else:
            problematic = self._find_problematic_durations(query, candidate)
            if problematic == "全局偏差可接受":
                suggestions.append(CorrectionSuggestion(
                    target=f"motif:{candidate.id}",
                    action="全局缩放时值",
                    detail=f"均匀节奏拉伸，整体时值比 {ratio}。建议将 {candidate.id} 所有音符时值乘以 {1.0 / ratio:.3f} 进行归一化。",
                    priority="high",
                ))
            else:
                suggestions.append(CorrectionSuggestion(
                    target=f"motif:{candidate.id}",
                    action="分段修正时值",
                    detail=f"整体时值比 {ratio}，但局部存在偏差。建议分段处理：{problematic}。修正后重新运行匹配确认。",
                    priority="high",
                ))

        return suggestions

    def _misalign_suggestions(
        self, ev: VariationEvidence, query: Motif, candidate: Motif
    ) -> list[CorrectionSuggestion]:
        suggestions: list[CorrectionSuggestion] = []
        beats = ev.misalign_beats
        measures = ev.misalign_measures

        if beats is None:
            return suggestions

        if measures is not None and measures != 0:
            suggestions.append(CorrectionSuggestion(
                target=f"motif:{candidate.id}",
                action="修正小节偏移",
                detail=f"检测到 {beats:.2f} 拍偏移（约 {abs(measures)} 小节）。建议将 {candidate.id} 的所有起始位置 {'提前' if beats > 0 else '延后'} {abs(beats):.2f} 拍，即 {'减' if measures > 0 else '加'} {abs(measures)} 小节。",
                priority="high",
            ))
        else:
            suggestions.append(CorrectionSuggestion(
                target=f"motif:{candidate.id}",
                action="修正拍内偏移",
                detail=f"检测到 {abs(beats):.2f} 拍偏移（不足1小节）。建议将 {candidate.id} 的所有起始位置 {'提前' if beats > 0 else '延后'} {abs(beats):.2f} 拍。",
                priority="high",
            ))

        if candidate.metadata.get("source_fragment"):
            suggestions.append(CorrectionSuggestion(
                target=f"fragment:{candidate.metadata['source_fragment']}",
                action="检查片段小节标注",
                detail=f"片段 {candidate.metadata['source_fragment']} 的小节标注可能有误，当前偏移 {beats:.2f} 拍。确认原始 MIDI 中的小节编号与实际位置是否对应。",
                priority="medium",
            ))

        return suggestions

    def _find_problematic_durations(self, query: Motif, candidate: Motif) -> str:
        q_ratios = query.duration_ratios
        c_ratios = candidate.duration_ratios
        parts: list[str] = []

        min_len = min(len(q_ratios), len(c_ratios))
        for i in range(min_len):
            diff = abs(q_ratios[i] - c_ratios[i])
            if diff > 0.15:
                parts.append(f"音符 {i}→{i + 1} 时值比差异 {diff:.3f}（查询 {q_ratios[i]:.3f} vs 候选 {c_ratios[i]:.3f}）")

        if not parts:
            return "全局偏差可接受"
        return "；".join(parts)
