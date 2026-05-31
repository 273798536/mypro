from __future__ import annotations

from typing import Optional

from .models import MatchResult, Motif, VariationEvidence, VariationType


class MotifMatcher:
    INTERVAL_TOLERANCE = 0
    RATIO_TOLERANCE = 0.15
    MISALIGN_BEAT_TOLERANCE = 0.5
    MIN_NOTE_COUNT = 2

    def match(self, query: Motif, candidate: Motif) -> MatchResult:
        if len(query.notes) < self.MIN_NOTE_COUNT or len(candidate.notes) < self.MIN_NOTE_COUNT:
            return MatchResult(
                query_motif_id=query.id,
                matched_motif_id=candidate.id,
                variation_type=VariationType.NO_MATCH,
                evidence=VariationEvidence(
                    variation_type=VariationType.NO_MATCH,
                    confidence=0.0,
                    detail="音符数量不足，无法比较",
                ),
            )

        if len(query.notes) != len(candidate.notes):
            min_len = min(len(query.notes), len(query.pitch_intervals), len(candidate.pitch_intervals))
            if min_len < 1:
                return MatchResult(
                    query_motif_id=query.id,
                    matched_motif_id=candidate.id,
                    variation_type=VariationType.NO_MATCH,
                    evidence=VariationEvidence(
                        variation_type=VariationType.NO_MATCH,
                        confidence=0.0,
                        detail="音符数量不同且无足够区间可比较",
                    ),
                )

        transposition = self._detect_transposition(query, candidate)
        rhythm_stretch = self._detect_rhythm_stretch(query, candidate)
        misalign = self._detect_measure_misalign(query, candidate)

        variation_type, evidence = self._classify_variation(transposition, rhythm_stretch, misalign, query, candidate)

        return MatchResult(
            query_motif_id=query.id,
            matched_motif_id=candidate.id,
            variation_type=variation_type,
            evidence=evidence,
        )

    def _detect_transposition(self, query: Motif, candidate: Motif) -> Optional[VariationEvidence]:
        q_intervals = query.pitch_intervals
        c_intervals = candidate.pitch_intervals

        if len(q_intervals) != len(c_intervals) or len(q_intervals) == 0:
            return None

        diffs = [q_intervals[i] - c_intervals[i] for i in range(len(q_intervals))]
        if all(d == diffs[0] for d in diffs):
            pitch_offset = candidate.notes[0].pitch - query.notes[0].pitch
            if diffs[0] == 0 and pitch_offset == 0:
                return VariationEvidence(
                    variation_type=VariationType.EXACT,
                    confidence=1.0,
                    detail="音程序列完全一致且无移调",
                    transposition_semitones=0,
                )
            else:
                return VariationEvidence(
                    variation_type=VariationType.TRANSPOSITION,
                    confidence=0.95,
                    detail=f"移调变奏：音程序列一致，整体移调 {pitch_offset} 个半音",
                    transposition_semitones=pitch_offset,
                )

        match_count = sum(1 for i in range(len(q_intervals)) if q_intervals[i] == c_intervals[i])
        ratio = match_count / len(q_intervals)
        if ratio >= 0.8:
            pitch_offset = candidate.notes[0].pitch - query.notes[0].pitch
            mismatch_indices = [i for i in range(len(q_intervals)) if q_intervals[i] != c_intervals[i]]
            return VariationEvidence(
                variation_type=VariationType.TRANSPOSITION,
                confidence=0.7,
                detail=f"近似移调变奏：{match_count}/{len(q_intervals)} 音程匹配，移调 {pitch_offset} 半音，不匹配位置: {mismatch_indices}",
                transposition_semitones=pitch_offset,
            )

        return None

    def _detect_rhythm_stretch(self, query: Motif, candidate: Motif) -> Optional[VariationEvidence]:
        q_ratios = query.duration_ratios
        c_ratios = candidate.duration_ratios

        if len(q_ratios) != len(c_ratios) or len(q_ratios) == 0:
            return None

        diffs = [abs(q_ratios[i] - c_ratios[i]) for i in range(len(q_ratios))]
        max_diff = max(diffs)

        if max_diff <= self.RATIO_TOLERANCE:
            if all(d < 0.01 for d in diffs):
                return None

            avg_stretch = sum(c_ratios) / len(c_ratios) - sum(q_ratios) / len(q_ratios)
            return VariationEvidence(
                variation_type=VariationType.RHYTHM_STRETCH,
                confidence=0.85,
                detail=f"节奏拉伸：时值比率差异在容差内，平均拉伸 {avg_stretch:+.3f}，最大偏差 {max_diff:.3f}",
                stretch_ratio=round(avg_stretch, 3),
            )

        total_q_dur = sum(n.duration for n in query.notes)
        total_c_dur = sum(n.duration for n in candidate.notes)
        if total_q_dur > 0:
            global_ratio = round(total_c_dur / total_q_dur, 3)
            return VariationEvidence(
                variation_type=VariationType.RHYTHM_STRETCH,
                confidence=0.6,
                detail=f"节奏拉伸（全局）：整体时值比 {global_ratio}，但局部偏差过大 (max={max_diff:.3f})，需分段修正",
                stretch_ratio=global_ratio,
            )

        return None

    def _detect_measure_misalign(self, query: Motif, candidate: Motif) -> Optional[VariationEvidence]:
        q_onsets = query.onset_positions
        c_onsets = candidate.onset_positions

        if len(q_onsets) != len(c_onsets) or len(q_onsets) == 0:
            return None

        q_intervals_beats = [q_onsets[i + 1] - q_onsets[i] for i in range(len(q_onsets) - 1)]
        c_intervals_beats = [c_onsets[i + 1] - c_onsets[i] for i in range(len(c_onsets) - 1)]

        beat_diffs = [abs(q_intervals_beats[i] - c_intervals_beats[i]) for i in range(len(q_intervals_beats))]

        onset_shift = c_onsets[0] - q_onsets[0]

        significant_shifts = [i for i, d in enumerate(beat_diffs) if d > self.MISALIGN_BEAT_TOLERANCE]

        if abs(onset_shift) > self.MISALIGN_BEAT_TOLERANCE or significant_shifts:
            misalign_measures = round(onset_shift / 4.0)
            detail_parts = []
            if abs(onset_shift) > self.MISALIGN_BEAT_TOLERANCE:
                detail_parts.append(f"起始偏移 {onset_shift:.2f} 拍（约 {misalign_measures} 小节）")
            if significant_shifts:
                detail_parts.append(f"音符间拍差超限位置: {significant_shifts}")

            return VariationEvidence(
                variation_type=VariationType.MEASURE_MISALIGN,
                confidence=0.8,
                detail="小节错位：" + "；".join(detail_parts),
                misalign_beats=round(onset_shift, 2),
                misalign_measures=misalign_measures,
            )

        return None

    def _classify_variation(
        self,
        transposition: Optional[VariationEvidence],
        rhythm: Optional[VariationEvidence],
        misalign: Optional[VariationEvidence],
        query: Motif,
        candidate: Motif,
    ) -> tuple[VariationType, VariationEvidence]:
        has_trans = transposition is not None and transposition.variation_type != VariationType.EXACT
        is_exact = transposition is not None and transposition.variation_type == VariationType.EXACT
        has_rhythm = rhythm is not None
        has_misalign = misalign is not None

        if is_exact and not has_rhythm and not has_misalign:
            return VariationType.EXACT, transposition

        if has_trans and has_misalign and has_rhythm:
            detail = (
                f"移调 + 节奏拉伸 + 小节错位复合变奏："
                f"移调 {transposition.transposition_semitones} 半音，"
                f"拉伸比 {rhythm.stretch_ratio}，"
                f"错位 {misalign.misalign_beats} 拍"
            )
            return VariationType.TRANSPOSITION_PLUS_RHYTHM, VariationEvidence(
                variation_type=VariationType.TRANSPOSITION_PLUS_RHYTHM,
                confidence=min(transposition.confidence, rhythm.confidence, misalign.confidence) * 0.9,
                detail=detail,
                transposition_semitones=transposition.transposition_semitones,
                stretch_ratio=rhythm.stretch_ratio,
                misalign_beats=misalign.misalign_beats,
                misalign_measures=misalign.misalign_measures,
            )

        if has_trans and has_misalign:
            detail = (
                f"移调 + 小节错位复合变奏："
                f"移调 {transposition.transposition_semitones} 半音，"
                f"错位 {misalign.misalign_beats} 拍（约 {misalign.misalign_measures} 小节）"
            )
            return VariationType.TRANSPOSITION_PLUS_MISALIGN, VariationEvidence(
                variation_type=VariationType.TRANSPOSITION_PLUS_MISALIGN,
                confidence=min(transposition.confidence, misalign.confidence) * 0.9,
                detail=detail,
                transposition_semitones=transposition.transposition_semitones,
                misalign_beats=misalign.misalign_beats,
                misalign_measures=misalign.misalign_measures,
            )

        if has_rhythm and has_misalign:
            detail = (
                f"节奏拉伸 + 小节错位复合变奏："
                f"拉伸比 {rhythm.stretch_ratio}，"
                f"错位 {misalign.misalign_beats} 拍"
            )
            return VariationType.RHYTHM_STRETCH_PLUS_MISALIGN, VariationEvidence(
                variation_type=VariationType.RHYTHM_STRETCH_PLUS_MISALIGN,
                confidence=min(rhythm.confidence, misalign.confidence) * 0.9,
                detail=detail,
                stretch_ratio=rhythm.stretch_ratio,
                misalign_beats=misalign.misalign_beats,
                misalign_measures=misalign.misalign_measures,
            )

        if has_trans and has_rhythm:
            detail = (
                f"移调 + 节奏拉伸复合变奏："
                f"移调 {transposition.transposition_semitones} 半音，"
                f"拉伸比 {rhythm.stretch_ratio}"
            )
            return VariationType.TRANSPOSITION_PLUS_RHYTHM, VariationEvidence(
                variation_type=VariationType.TRANSPOSITION_PLUS_RHYTHM,
                confidence=min(transposition.confidence, rhythm.confidence) * 0.9,
                detail=detail,
                transposition_semitones=transposition.transposition_semitones,
                stretch_ratio=rhythm.stretch_ratio,
            )

        if has_trans:
            return VariationType.TRANSPOSITION, transposition

        if has_rhythm:
            return VariationType.RHYTHM_STRETCH, rhythm

        if has_misalign:
            return VariationType.MEASURE_MISALIGN, misalign

        q_intervals = query.pitch_intervals
        c_intervals = candidate.pitch_intervals
        match_count = sum(1 for i in range(min(len(q_intervals), len(c_intervals))) if q_intervals[i] == c_intervals[i])
        total = max(len(q_intervals), len(c_intervals))

        return VariationType.NO_MATCH, VariationEvidence(
            variation_type=VariationType.NO_MATCH,
            confidence=0.0,
            detail=f"未匹配：音程序列差异过大 ({match_count}/{total} 匹配)",
        )
