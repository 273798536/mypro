from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

import mido

from midi_grader.models import (
    NoteEvent,
    ParsedMidi,
    TempoChange,
    TraceRecord,
    TraceStep,
)


class MidiParser:
    def __init__(self) -> None:
        self._trace = TraceRecord(trace_id=str(uuid.uuid4())[:8])

    def _now(self) -> str:
        return datetime.now().isoformat()

    def parse(self, file_path: str) -> ParsedMidi:
        self._trace = TraceRecord(trace_id=str(uuid.uuid4())[:8])
        self._trace.add_step("parse", f"开始解析MIDI文件: {file_path}", self._now(), file_path=file_path)

        try:
            mid = mido.MidiFile(file_path)
        except Exception as e:
            self._trace.add_step("parse", f"MIDI文件解析失败: {e}", self._now(), error=str(e))
            raise

        ticks_per_beat = mid.ticks_per_beat
        self._trace.add_step(
            "parse", f"读取ticks_per_beat: {ticks_per_beat}", self._now(), ticks_per_beat=ticks_per_beat
        )

        tempo_changes = self._extract_tempo_changes(mid)
        self._trace.add_step(
            "parse",
            f"提取到{len(tempo_changes)}个速度变化",
            self._now(),
            tempo_count=len(tempo_changes),
        )

        notes = self._extract_notes(mid)
        self._trace.add_step(
            "parse",
            f"提取到{len(notes)}个音符事件",
            self._now(),
            note_count=len(notes),
        )

        rests = self._detect_rests(notes, ticks_per_beat)
        self._trace.add_step(
            "parse",
            f"检测到{len(rests)}个休止区间",
            self._now(),
            rest_count=len(rests),
        )

        parsed = ParsedMidi(
            notes=notes,
            tempo_changes=tempo_changes,
            ticks_per_beat=ticks_per_beat,
            tracks_count=len(mid.tracks),
            file_path=file_path,
            trace=self._trace,
        )

        self._trace.add_step("parse", "MIDI解析完成", self._now())
        return parsed

    def _extract_tempo_changes(self, mid: mido.MidiFile) -> List[TempoChange]:
        tempo_changes: List[TempoChange] = []
        current_tick = 0
        for track in mid.tracks:
            current_tick = 0
            for msg in track:
                current_tick += msg.time
                if msg.type == "set_tempo":
                    bpm = mido.tempo2bpm(msg.tempo)
                    tc = TempoChange(tick=current_tick, bpm=bpm)
                    tempo_changes.append(tc)

        tempo_changes.sort(key=lambda t: t.tick)
        if not tempo_changes:
            tempo_changes.append(TempoChange(tick=0, bpm=120.0))

        return tempo_changes

    def _extract_notes(self, mid: mido.MidiFile) -> List[NoteEvent]:
        notes: List[NoteEvent] = []
        for track_idx, track in enumerate(mid.tracks):
            active_notes: dict = {}
            current_tick = 0
            for msg in track:
                current_tick += msg.time
                if msg.type == "note_on" and msg.velocity > 0:
                    key = (msg.channel, msg.note)
                    active_notes[key] = (current_tick, msg.velocity, track_idx)
                elif msg.type == "note_off" or (msg.type == "note_on" and msg.velocity == 0):
                    key = (msg.channel, msg.note)
                    if key in active_notes:
                        start_tick, velocity, tidx = active_notes.pop(key)
                        duration = current_tick - start_tick
                        note = NoteEvent(
                            pitch=msg.note,
                            velocity=velocity,
                            start_tick=start_tick,
                            duration_tick=duration,
                            channel=msg.channel,
                            track_idx=tidx,
                        )
                        notes.append(note)

        notes.sort(key=lambda n: n.start_tick)
        return notes

    def _detect_rests(self, notes: List[NoteEvent], ticks_per_beat: int) -> List[dict]:
        rests: List[dict] = []
        if not notes:
            return rests

        threshold_ticks = ticks_per_beat
        prev_end = 0
        for note in notes:
            gap = note.start_tick - prev_end
            if gap >= threshold_ticks:
                rests.append({
                    "start_tick": prev_end,
                    "end_tick": note.start_tick,
                    "duration_ticks": gap,
                })
            note_end = note.start_tick + note.duration_tick
            if note_end > prev_end:
                prev_end = note_end

        return rests

    @property
    def trace(self) -> TraceRecord:
        return self._trace
