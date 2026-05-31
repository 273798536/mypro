from __future__ import annotations

from typing import Optional

from .models import Motif, VariationEvidence, VariationType


class VariationDetector:
    def detect(self, query: Motif, candidate: Motif) -> Optional[VariationEvidence]:
        q_intervals = query.pitch_intervals
        c_intervals = candidate.pitch_intervals

        if len(q_intervals) == 0 or len(c_intervals) == 0:
            return None

        if len(q_intervals) != len(c_intervals):
            return None

        transposition_ev = self._check_transposition(q_intervals, c_intervals, query, candidate)
        if transposition_ev is not None:
            return transposition_ev

        return None

    def _check_transposition(
        self,
        q_intervals: list[int],
        c_intervals: list[int],
        query: Motif,
        candidate: Motif,
    ) -> Optional[VariationEvidence]:
        diffs = [q_intervals[i] - c_intervals[i] for i in range(len(q_intervals))]

        if not all(d == diffs[0] for d in diffs):
            return None

        pitch_offset = candidate.notes[0].pitch - query.notes[0].pitch

        if diffs[0] == 0 and pitch_offset == 0:
            return VariationEvidence(
                variation_type=VariationType.EXACT,
                confidence=1.0,
                detail="精确匹配：音程序列和绝对音高完全一致",
                transposition_semitones=0,
            )

        note_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
        q_root_name = note_names[query.notes[0].pitch % 12]
        c_root_name = note_names[candidate.notes[0].pitch % 12]
        direction = "上" if pitch_offset > 0 else "下"

        semitone_intervals = {1: "小二度", 2: "大二度", 3: "小三度", 4: "大三度", 5: "纯四度", 6: "增四度/减五度", 7: "纯五度", 8: "小六度", 9: "大六度", 10: "小七度", 11: "大七度", 12: "纯八度"}
        interval_name = semitone_intervals.get(abs(pitch_offset) % 12, f"{abs(pitch_offset)} 半音")

        return VariationEvidence(
            variation_type=VariationType.TRANSPOSITION,
            confidence=0.95,
            detail=f"移调变奏（确定性结论）：{q_root_name} → {c_root_name}，向{direction}移调 {abs(pitch_offset)} 半音（{interval_name}），音程序列完全一致",
            transposition_semitones=pitch_offset,
        )

    def check_rhythm_stretch_with_misalign(self, query: Motif, candidate: Motif) -> Optional[VariationEvidence]:
        q_ratios = query.duration_ratios
        c_ratios = candidate.duration_ratios
        q_onsets = query.onset_positions
        c_onsets = candidate.onset_positions

        if len(q_ratios) == 0 or len(c_ratios) == 0:
            return None
        if len(q_onsets) != len(c_onsets):
            return None

        stretch_detected = False
        misalign_detected = False
        stretch_detail_parts: list[str] = []
        misalign_detail_parts: list[str] = []

        if len(q_ratios) == len(c_ratios):
            ratio_diffs = [abs(q_ratios[i] - c_ratios[i]) for i in range(len(q_ratios))]
            max_ratio_diff = max(ratio_diffs) if ratio_diffs else 0
            if max_ratio_diff > 0.15:
                stretch_detected = True
                total_q_dur = sum(n.duration for n in query.notes)
                total_c_dur = sum(n.duration for n in candidate.notes)
                if total_q_dur > 0:
                    global_ratio = round(total_c_dur / total_q_dur, 3)
                    stretch_detail_parts.append(f"全局时值比 {global_ratio}")
                problematic = [i for i, d in enumerate(ratio_diffs) if d > 0.15]
                stretch_detail_parts.append(f"偏差超限音符序号: {problematic}")

        if not stretch_detected:
            total_q_dur = sum(n.duration for n in query.notes)
            total_c_dur = sum(n.duration for n in candidate.notes)
            if total_q_dur > 0:
                global_ratio = total_c_dur / total_q_dur
                if abs(global_ratio - 1.0) > 0.05:
                    duration_scales = []
                    for i in range(min(len(query.notes), len(candidate.notes))):
                        if query.notes[i].duration > 0:
                            duration_scales.append(candidate.notes[i].duration / query.notes[i].duration)
                    if duration_scales:
                        avg_scale = sum(duration_scales) / len(duration_scales)
                        scale_deviations = [abs(s - avg_scale) for s in duration_scales]
                        max_dev = max(scale_deviations)
                        if max_dev < 0.1:
                            stretch_detected = True
                            stretch_detail_parts.append(
                                f"均匀全局拉伸：比例 {round(avg_scale, 3)}，最大偏差 {round(max_dev, 3)}"
                            )

        onset_shift = c_onsets[0] - q_onsets[0]
        if abs(onset_shift) > 0.5:
            misalign_detected = True
            misalign_measures = round(onset_shift / 4.0)
            misalign_detail_parts.append(f"起始偏移 {onset_shift:.2f} 拍（约 {misalign_measures} 小节）")

        if not stretch_detected and not misalign_detected:
            return None

        combined_type = VariationType.RHYTHM_STRETCH
        detail = ""
        confidence = 0.8

        if stretch_detected and misalign_detected:
            combined_type = VariationType.RHYTHM_STRETCH_PLUS_MISALIGN
            confidence = 0.7
            detail = "节奏拉伸 + 小节错位复合：" + "；".join(stretch_detail_parts + misalign_detail_parts)
        elif stretch_detected:
            detail = "节奏拉伸：" + "；".join(stretch_detail_parts)
        elif misalign_detected:
            combined_type = VariationType.MEASURE_MISALIGN
            detail = "小节错位：" + "；".join(misalign_detail_parts)

        evidence = VariationEvidence(
            variation_type=combined_type,
            confidence=confidence,
            detail=detail,
        )
        if stretch_detected:
            total_q_dur = sum(n.duration for n in query.notes)
            total_c_dur = sum(n.duration for n in candidate.notes)
            if total_q_dur > 0:
                evidence.stretch_ratio = round(total_c_dur / total_q_dur, 3)
        if misalign_detected:
            evidence.misalign_beats = round(onset_shift, 2)
            evidence.misalign_measures = round(onset_shift / 4.0)

        return evidence
