from __future__ import annotations

import uuid
from datetime import datetime
from typing import List

from midi_grader.models import (
    AlignedNote,
    BeatAlignmentResult,
    ErrorAnnotation,
    ErrorAnnotationResult,
    ErrorType,
    ParsedMidi,
    Severity,
    TraceRecord,
)


class ErrorAnnotator:
    def __init__(
        self,
        off_beat_threshold: float = 0.1,
        boundary_threshold: float = 0.05,
        velocity_missing_threshold: int = 1,
        rest_misjudgment_gap_beats: float = 0.25,
    ) -> None:
        self._off_beat_threshold = off_beat_threshold
        self._boundary_threshold = boundary_threshold
        self._velocity_missing_threshold = velocity_missing_threshold
        self._rest_misjudgment_gap_beats = rest_misjudgment_gap_beats
        self._trace = TraceRecord(trace_id=str(uuid.uuid4())[:8])

    def _now(self) -> str:
        return datetime.now().isoformat()

    def annotate(self, parsed: ParsedMidi, alignment: BeatAlignmentResult) -> ErrorAnnotationResult:
        self._trace = TraceRecord(trace_id=str(uuid.uuid4())[:8])
        self._trace.add_step(
            "annotate",
            f"开始错因标注，共{len(alignment.aligned_notes)}个音符",
            self._now(),
            note_count=len(alignment.aligned_notes),
        )

        annotations: List[ErrorAnnotation] = []
        rests = self._detect_rests(parsed)

        for aligned in alignment.aligned_notes:
            errors = self._check_note(aligned, rests, parsed, alignment)
            if errors:
                for err in errors:
                    annotations.append(err)
            else:
                annotations.append(self._make_normal_annotation(aligned))

        self._trace.add_step(
            "annotate",
            f"错因标注完成，{sum(1 for a in annotations if a.error_type != ErrorType.NONE)}个标注",
            self._now(),
        )

        return ErrorAnnotationResult(annotations=annotations, trace=self._trace)

    def _check_note(
        self,
        aligned: AlignedNote,
        rests: List[dict],
        parsed: ParsedMidi,
        alignment: BeatAlignmentResult,
    ) -> List[ErrorAnnotation]:
        errors: List[ErrorAnnotation] = []
        note = aligned.note

        off_beat_err = self._check_off_beat(aligned)
        if off_beat_err:
            errors.append(off_beat_err)

        velocity_err = self._check_velocity(aligned)
        if velocity_err:
            errors.append(velocity_err)

        rest_err = self._check_rest_misjudgment(aligned, rests, parsed)
        if rest_err:
            errors.append(rest_err)

        if aligned.is_in_tempo_change:
            tempo_err = self._check_tempo_deviation(aligned, alignment)
            if tempo_err:
                errors.append(tempo_err)

        return errors

    def _check_off_beat(self, aligned: AlignedNote) -> ErrorAnnotation | None:
        offset = abs(aligned.offset_beats)
        if offset < self._boundary_threshold:
            return None

        if offset < self._off_beat_threshold:
            severity = Severity.BOUNDARY
        else:
            severity = Severity.BAD

        return ErrorAnnotation(
            aligned_note=aligned,
            error_type=ErrorType.OFF_BEAT,
            severity=severity,
            detail=f"偏移{offset:.4f}拍，阈值边界={self._boundary_threshold}，阈值坏={self._off_beat_threshold}",
            parse_trace_id=aligned.parse_trace_id,
            align_trace_id=aligned.trace_id,
        )

    def _check_velocity(self, aligned: AlignedNote) -> ErrorAnnotation | None:
        if aligned.note.velocity <= self._velocity_missing_threshold:
            return ErrorAnnotation(
                aligned_note=aligned,
                error_type=ErrorType.VELOCITY_MISSING,
                severity=Severity.BAD,
                detail=f"力度值={aligned.note.velocity}，低于阈值{self._velocity_missing_threshold}",
                parse_trace_id=aligned.parse_trace_id,
                align_trace_id=aligned.trace_id,
            )
        return None

    def _check_rest_misjudgment(self, aligned: AlignedNote, rests: List[dict], parsed: ParsedMidi) -> ErrorAnnotation | None:
        ticks_per_beat = parsed.ticks_per_beat
        note_start = aligned.note.start_tick
        gap_ticks = self._find_gap_before(note_start, parsed)

        if gap_ticks <= 0:
            return None

        gap_beats = gap_ticks / ticks_per_beat
        if 0 < gap_beats < self._rest_misjudgment_gap_beats:
            return ErrorAnnotation(
                aligned_note=aligned,
                error_type=ErrorType.REST_MISJUDGMENT,
                severity=Severity.BOUNDARY,
                detail=f"前方间隔{gap_beats:.4f}拍，小于休止判定阈值{self._rest_misjudgment_gap_beats}拍，可能是休止误判",
                parse_trace_id=aligned.parse_trace_id,
                align_trace_id=aligned.trace_id,
            )
        return None

    def _check_tempo_deviation(self, aligned: AlignedNote, alignment: BeatAlignmentResult) -> ErrorAnnotation | None:
        offset = abs(aligned.offset_beats)
        if offset >= self._boundary_threshold:
            return ErrorAnnotation(
                aligned_note=aligned,
                error_type=ErrorType.TEMPO_DEVIATION,
                severity=Severity.BOUNDARY,
                detail=f"速度变化区内偏移{offset:.4f}拍",
                parse_trace_id=aligned.parse_trace_id,
                align_trace_id=aligned.trace_id,
            )
        return None

    def _find_gap_before(self, tick: int, parsed: ParsedMidi) -> int:
        notes = parsed.notes
        prev_end = 0
        for n in notes:
            if n.start_tick >= tick:
                break
            end = n.start_tick + n.duration_tick
            if end <= tick and end > prev_end:
                prev_end = end
        return tick - prev_end

    def _detect_rests(self, parsed: ParsedMidi) -> List[dict]:
        rests: List[dict] = []
        if not parsed.notes:
            return rests
        threshold = parsed.ticks_per_beat
        prev_end = 0
        for note in parsed.notes:
            gap = note.start_tick - prev_end
            if gap >= threshold:
                rests.append({"start_tick": prev_end, "end_tick": note.start_tick, "duration_ticks": gap})
            note_end = note.start_tick + note.duration_tick
            if note_end > prev_end:
                prev_end = note_end
        return rests

    def _make_normal_annotation(self, aligned: AlignedNote) -> ErrorAnnotation:
        return ErrorAnnotation(
            aligned_note=aligned,
            error_type=ErrorType.NONE,
            severity=Severity.NORMAL,
            detail="无异常",
            parse_trace_id=aligned.parse_trace_id,
            align_trace_id=aligned.trace_id,
        )

    @property
    def trace(self) -> TraceRecord:
        return self._trace
