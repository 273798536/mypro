from __future__ import annotations

import uuid
from datetime import datetime
from typing import List

from midi_grader.models import (
    AlignedNote,
    BeatAlignmentResult,
    ParsedMidi,
    TempoSegment,
    TraceRecord,
)


class BeatAligner:
    def __init__(self, tempo_change_buffer_beats: float = 2.0) -> None:
        self._tempo_change_buffer_beats = tempo_change_buffer_beats
        self._trace = TraceRecord(trace_id=str(uuid.uuid4())[:8])

    def _now(self) -> str:
        return datetime.now().isoformat()

    def align(self, parsed: ParsedMidi) -> BeatAlignmentResult:
        self._trace = TraceRecord(trace_id=str(uuid.uuid4())[:8])
        self._trace.add_step(
            "align",
            f"开始节拍对齐，共{len(parsed.notes)}个音符",
            self._now(),
            note_count=len(parsed.notes),
        )

        tempo_segments = self._build_tempo_segments(parsed)
        self._trace.add_step(
            "align",
            f"构建{len(tempo_segments)}个速度段落",
            self._now(),
            segment_count=len(tempo_segments),
        )

        aligned_notes: List[AlignedNote] = []
        for note in parsed.notes:
            segment_idx = self._find_segment_index(note.start_tick, tempo_segments)
            segment = tempo_segments[segment_idx]

            ticks_per_beat = parsed.ticks_per_beat
            actual_beat = note.start_tick / ticks_per_beat
            expected_beat = round(actual_beat * 4) / 4
            offset_beats = actual_beat - expected_beat

            is_in_tempo_change = segment.is_change_region

            aligned = AlignedNote(
                note=note,
                expected_beat=expected_beat,
                actual_beat=actual_beat,
                offset_beats=offset_beats,
                tempo_segment_idx=segment_idx,
                is_in_tempo_change=is_in_tempo_change,
                parse_trace_id=parsed.trace.trace_id,
            )
            aligned_notes.append(aligned)

        self._trace.add_step(
            "align",
            f"节拍对齐完成，{sum(1 for n in aligned_notes if n.is_in_tempo_change)}个音符位于速度变化区",
            self._now(),
        )

        return BeatAlignmentResult(
            aligned_notes=aligned_notes,
            tempo_segments=tempo_segments,
            trace=self._trace,
        )

    def _build_tempo_segments(self, parsed: ParsedMidi) -> List[TempoSegment]:
        segments: List[TempoSegment] = []
        tempo_changes = sorted(parsed.tempo_changes, key=lambda t: t.tick)
        ticks_per_beat = parsed.ticks_per_beat

        if not tempo_changes:
            max_tick = max((n.start_tick + n.duration_tick for n in parsed.notes), default=0)
            segments.append(TempoSegment(idx=0, start_tick=0, end_tick=max_tick, bpm=120.0, is_change_region=False))
            return segments

        max_tick = max((n.start_tick + n.duration_tick for n in parsed.notes), default=0)
        buffer_ticks = int(self._tempo_change_buffer_beats * ticks_per_beat)

        for i, tc in enumerate(tempo_changes):
            start = tc.tick
            end = max_tick if i == len(tempo_changes) - 1 else tempo_changes[i + 1].tick
            is_initial_tempo = (tc.tick == 0 and i == 0)

            if is_initial_tempo:
                segments.append(
                    TempoSegment(
                        idx=len(segments),
                        start_tick=start,
                        end_tick=end,
                        bpm=tc.bpm,
                        is_change_region=False,
                    )
                )
                continue

            change_end = min(start + buffer_ticks, end)

            if change_end > start:
                segments.append(
                    TempoSegment(
                        idx=len(segments),
                        start_tick=start,
                        end_tick=change_end,
                        bpm=tc.bpm,
                        is_change_region=True,
                    )
                )
            if change_end < end:
                segments.append(
                    TempoSegment(
                        idx=len(segments),
                        start_tick=change_end,
                        end_tick=end,
                        bpm=tc.bpm,
                        is_change_region=False,
                    )
                )

        if not segments:
            segments.append(
                TempoSegment(idx=0, start_tick=0, end_tick=max_tick, bpm=tempo_changes[0].bpm, is_change_region=False)
            )

        return segments

    def _find_segment_index(self, tick: int, segments: List[TempoSegment]) -> int:
        for seg in segments:
            if seg.start_tick <= tick < seg.end_tick:
                return seg.idx
        if segments:
            return segments[-1].idx
        return 0

    @property
    def trace(self) -> TraceRecord:
        return self._trace
