import os
import math
from typing import Optional, Tuple, List
from dataclasses import dataclass, field

try:
    import mido
except ImportError:
    mido = None

from .chord_parser import (
    NOTE_NAMES,
    CHORD_TEMPLATES,
    pitch_classes_to_chroma,
    chroma_to_pitch_classes,
    identify_chord,
    parse_chord_label,
)
from .models import ChordAnalysis, MatchResult


DEFAULT_TICKS_PER_BEAT = 480
DEFAULT_BEATS_PER_BAR = 4
DEFAULT_BPM = 120


class MIDIProcessingError(Exception):
    pass


class MIDINotAvailableError(MIDIProcessingError):
    pass


@dataclass
class NoteEvent:
    note: int
    start_time: float
    duration: float
    velocity: int


@dataclass
class BarChroma:
    bar_number: int
    chroma_vector: list
    total_duration: float
    note_count: int


def _check_mido_available():
    if mido is None:
        raise MIDINotAvailableError(
            "mido 库未安装, 请运行: pip install mido"
        )


def load_midi_file(midi_path: str) -> "mido.MidiFile":
    _check_mido_available()
    if not os.path.exists(midi_path):
        raise MIDIProcessingError(f"MIDI 文件不存在: {midi_path}")
    try:
        return mido.MidiFile(midi_path)
    except Exception as e:
        raise MIDIProcessingError(f"读取 MIDI 文件失败: {e}") from e


def extract_note_events(midi_file) -> List[NoteEvent]:
    _check_mido_available()
    events = []
    current_time = 0.0
    active_notes = {}

    ticks_per_beat = midi_file.ticks_per_beat or DEFAULT_TICKS_PER_BEAT
    tempo = 500000

    for track in midi_file.tracks:
        track_time = 0
        track_active = {}
        for msg in track:
            track_time += msg.time
            seconds = mido.tick2second(track_time, ticks_per_beat, tempo)
            if msg.type == "set_tempo":
                tempo = msg.tempo
            elif msg.type == "note_on" and msg.velocity > 0:
                if msg.note not in track_active:
                    track_active[msg.note] = {
                        "start_time": seconds,
                        "velocity": msg.velocity,
                    }
            elif msg.type == "note_off" or (
                msg.type == "note_on" and msg.velocity == 0
            ):
                if msg.note in track_active:
                    start = track_active[msg.note]["start_time"]
                    duration = seconds - start
                    if duration > 0:
                        events.append(
                            NoteEvent(
                                note=msg.note,
                                start_time=start,
                                duration=duration,
                                velocity=track_active[msg.note]["velocity"],
                            )
                        )
                    del track_active[msg.note]

    events.sort(key=lambda e: e.start_time)
    return events


def get_midi_timing_info(midi_file) -> dict:
    _check_mido_available()
    ticks_per_beat = midi_file.ticks_per_beat or DEFAULT_TICKS_PER_BEAT
    tempo = 500000
    beats_per_bar = DEFAULT_BEATS_PER_BAR

    for track in midi_file.tracks:
        for msg in track:
            if msg.type == "set_tempo":
                tempo = msg.tempo
                break

    bpm = mido.tempo2bpm(tempo) if tempo else DEFAULT_BPM
    seconds_per_beat = 60.0 / bpm if bpm > 0 else 0.5
    seconds_per_bar = seconds_per_beat * beats_per_bar

    return {
        "ticks_per_beat": ticks_per_beat,
        "tempo": tempo,
        "bpm": bpm,
        "beats_per_bar": beats_per_bar,
        "seconds_per_beat": seconds_per_beat,
        "seconds_per_bar": seconds_per_bar,
    }


def compute_bar_chromas(
    note_events: List[NoteEvent],
    seconds_per_bar: float,
    num_bars: Optional[int] = None,
) -> List[BarChroma]:
    if not note_events:
        return []

    if num_bars is None:
        last_end = max(e.start_time + e.duration for e in note_events)
        num_bars = max(1, math.ceil(last_end / seconds_per_bar))

    bar_chromas = []
    for bar_idx in range(num_bars):
        bar_start = bar_idx * seconds_per_bar
        bar_end = (bar_idx + 1) * seconds_per_bar

        chroma = [0.0] * 12
        total_duration = 0.0
        note_count = 0

        for event in note_events:
            evt_start = event.start_time
            evt_end = event.start_time + event.duration

            overlap_start = max(bar_start, evt_start)
            overlap_end = min(bar_end, evt_end)
            overlap = max(0.0, overlap_end - overlap_start)

            if overlap > 0:
                pitch_class = event.note % 12
                weight = overlap * (event.velocity / 127.0)
                chroma[pitch_class] += weight
                total_duration += overlap
                note_count += 1

        max_val = max(chroma) if max(chroma) > 0 else 1.0
        normalized = [v / max_val for v in chroma]

        bar_chromas.append(
            BarChroma(
                bar_number=bar_idx + 1,
                chroma_vector=normalized,
                total_duration=total_duration,
                note_count=note_count,
            )
        )

    return bar_chromas


def identify_chord_from_chroma(chroma_vector: list) -> Optional[dict]:
    matches = identify_chord(chroma_vector)
    if not matches:
        return None
    return matches[0]


def analyze_midi_chords(
    midi_path: str,
    beats_per_bar: int = DEFAULT_BEATS_PER_BAR,
) -> dict:
    midi_file = load_midi_file(midi_path)
    timing = get_midi_timing_info(midi_file)
    note_events = extract_note_events(midi_file)

    if not note_events:
        raise MIDIProcessingError("MIDI 文件中未找到任何音符事件")

    seconds_per_bar = timing["seconds_per_beat"] * beats_per_bar
    bar_chromas = compute_bar_chromas(note_events, seconds_per_bar)

    chord_identifications = []
    for bc in bar_chromas:
        chord_info = identify_chord_from_chroma(bc.chroma_vector)
        chord_identifications.append(
            {
                "bar": bc.bar_number,
                "chroma_vector": bc.chroma_vector,
                "total_duration": bc.total_duration,
                "note_count": bc.note_count,
                "chord": chord_info,
            }
        )

    return {
        "midi_path": midi_path,
        "timing": timing,
        "total_notes": len(note_events),
        "num_bars": len(bar_chromas),
        "bar_chromas": [
            {
                "bar": bc.bar_number,
                "chroma_vector": bc.chroma_vector,
                "note_count": bc.note_count,
            }
            for bc in bar_chromas
        ],
        "chord_identifications": chord_identifications,
    }


def build_chord_analyses_from_midi(
    midi_path: str,
    accompaniment_chords: list,
    beats_per_bar: int = DEFAULT_BEATS_PER_BAR,
) -> List[ChordAnalysis]:
    midi_result = analyze_midi_chords(midi_path, beats_per_bar)

    bar_chord_map = {}
    for ci in midi_result["chord_identifications"]:
        if ci["chord"]:
            bar_chord_map[ci["bar"]] = ci["chord"]["chord"]

    analyses = []
    for entry in accompaniment_chords:
        bar_start = entry.get("bar_start", 0)
        bar_end = entry.get("bar_end", bar_start + 1)
        expected = entry.get("expected_chord", "")

        actual_chord_from_midi = ""
        combined_chroma = [0.0] * 12
        note_count = 0
        bar_count = 0

        for bar_idx in range(bar_start, bar_end):
            if bar_idx in bar_chord_map:
                if not actual_chord_from_midi:
                    actual_chord_from_midi = bar_chord_map[bar_idx]

        for ci in midi_result["chord_identifications"]:
            if bar_start <= ci["bar"] < bar_end:
                for i in range(12):
                    combined_chroma[i] += ci["chroma_vector"][i]
                note_count += ci.get("note_count", 0)
                bar_count += 1

        if bar_count > 0:
            combined_chroma = [v / bar_count for v in combined_chroma]

        actual = actual_chord_from_midi or entry.get("actual_chord", "")
        confidence = entry.get("confidence", 0.0)
        note = entry.get("note", "")

        match_result = _compare_chords_with_midi(
            expected, actual, combined_chroma
        )

        analysis = ChordAnalysis(
            bar_start=bar_start,
            bar_end=bar_end,
            expected_chord=expected,
            actual_chord=actual,
            match_result=match_result,
            chroma_vector=combined_chroma,
            confidence=confidence,
            note=note,
        )
        analyses.append(analysis)

    return analyses


def _compare_chords_with_midi(
    expected: str, actual: str, chroma_vector: list
) -> MatchResult:
    from .chord_parser import compare_chords

    base_result = compare_chords(expected, actual)

    if not chroma_vector or max(chroma_vector) == 0:
        return base_result

    exp_parsed = parse_chord_label(expected)
    act_parsed = parse_chord_label(actual)

    if exp_parsed is None or act_parsed is None:
        return MatchResult.UNCERTAIN

    pitch_classes = chroma_to_pitch_classes(chroma_vector)
    exp_intervals = set((exp_parsed["root"] + i) % 12 for i in exp_parsed["intervals"])
    act_intervals = set((act_parsed["root"] + i) % 12 for i in act_parsed["intervals"])

    exp_overlap = len(pitch_classes & exp_intervals)
    act_overlap = len(pitch_classes & act_intervals)

    exp_total = len(exp_intervals | pitch_classes)
    act_total = len(act_intervals | pitch_classes)

    exp_sim = exp_overlap / exp_total if exp_total > 0 else 0
    act_sim = act_overlap / act_total if act_total > 0 else 0

    if base_result == MatchResult.MATCH:
        if act_sim >= 0.5:
            return MatchResult.MATCH
        else:
            return MatchResult.UNCERTAIN
    elif base_result == MatchResult.MISMATCH:
        if act_sim < 0.3 and exp_sim < 0.3:
            return MatchResult.UNCERTAIN
        if abs(exp_sim - act_sim) < 0.1:
            return MatchResult.UNCERTAIN
        return MatchResult.MISMATCH
    else:
        return MatchResult.UNCERTAIN


def generate_sample_midi(
    output_path: str,
    chord_progression: list,
    bpm: int = DEFAULT_BPM,
    beats_per_bar: int = DEFAULT_BEATS_PER_BAR,
    octave: int = 4,
):
    _check_mido_available()
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    mid = mido.MidiFile()
    track = mido.MidiTrack()
    mid.tracks.append(track)

    ticks_per_beat = mid.ticks_per_beat
    ticks_per_bar = ticks_per_beat * beats_per_bar

    track.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(bpm), time=0))
    track.append(mido.MetaMessage("time_signature", numerator=beats_per_bar, denominator=4, time=0))

    for chord_label in chord_progression:
        parsed = parse_chord_label(chord_label)
        if parsed is None:
            continue

        root_midi = parsed["root"] + octave * 12
        intervals = sorted(parsed["intervals"])

        for i, interval in enumerate(intervals):
            note = root_midi + interval
            track.append(
                mido.Message(
                    "note_on", note=note, velocity=64, time=0 if i == 0 else 0
                )
            )

        track.append(
            mido.Message(
                "note_off",
                note=root_midi + intervals[0],
                velocity=0,
                time=ticks_per_bar,
            )
        )
        for interval in intervals[1:]:
            track.append(
                mido.Message(
                    "note_off", note=root_midi + interval, velocity=0, time=0
                )
            )

    mid.save(output_path)
    return output_path
