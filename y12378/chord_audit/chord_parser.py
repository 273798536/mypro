import json
from typing import Optional
from .models import ChordAnalysis, MatchResult


NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

CHORD_TEMPLATES = {
    "maj": [0, 4, 7],
    "min": [0, 3, 7],
    "dim": [0, 3, 6],
    "aug": [0, 4, 8],
    "7": [0, 4, 7, 10],
    "maj7": [0, 4, 7, 11],
    "min7": [0, 3, 7, 10],
    "dim7": [0, 3, 6, 9],
    "hdim7": [0, 3, 6, 10],
    "minMaj7": [0, 3, 7, 11],
    "sus2": [0, 2, 7],
    "sus4": [0, 5, 7],
    "add9": [0, 4, 7, 14],
    "6": [0, 4, 7, 9],
    "min6": [0, 3, 7, 9],
}

CHORD_ALIAS = {
    "major": "maj",
    "minor": "min",
    "m": "min",
    "dom7": "7",
    "half-dim7": "hdim7",
    "m7": "min7",
    "M7": "maj7",
    "mM7": "minMaj7",
}


def chroma_to_pitch_classes(chroma_vector: list) -> set:
    return {i for i, v in enumerate(chroma_vector) if v > 0.5}


def pitch_classes_to_chroma(pitch_classes: set) -> list:
    chroma = [0] * 12
    for pc in pitch_classes:
        chroma[pc % 12] = 1
    return chroma


def identify_chord(chroma_vector: list) -> list:
    pitch_classes = chroma_to_pitch_classes(chroma_vector)
    if len(pitch_classes) < 3:
        return []
    matches = []
    for root in range(12):
        root_name = NOTE_NAMES[root]
        intervals = sorted([(pc - root) % 12 for pc in pitch_classes])
        for quality, template in CHORD_TEMPLATES.items():
            template_mod = sorted([i % 12 for i in template])
            if intervals == template_mod:
                matches.append(
                    {
                        "chord": f"{root_name}:{quality}",
                        "root": root,
                        "quality": quality,
                        "confidence": len(template) / len(pitch_classes)
                        if len(pitch_classes) >= len(template)
                        else len(pitch_classes) / len(template),
                    }
                )
    matches.sort(key=lambda x: x["confidence"], reverse=True)
    return matches


def parse_chord_label(label: str) -> Optional[dict]:
    label = label.strip()
    if not label:
        return None
    if ":" in label:
        parts = label.split(":", 1)
        root_str = parts[0].strip()
        quality = parts[1].strip()
    else:
        root_str = label[0]
        quality = label[1:].strip() if len(label) > 1 else "maj"
    quality = CHORD_ALIAS.get(quality, quality)
    root_str = root_str.replace("#", "#")
    if root_str not in NOTE_NAMES:
        return None
    root = NOTE_NAMES.index(root_str)
    if quality not in CHORD_TEMPLATES:
        return None
    intervals = CHORD_TEMPLATES[quality]
    return {
        "root": root,
        "quality": quality,
        "intervals": intervals,
        "chroma": pitch_classes_to_chroma(set((root + i) % 12 for i in intervals)),
    }


def compare_chords(expected: str, actual: str) -> MatchResult:
    exp_parsed = parse_chord_label(expected)
    act_parsed = parse_chord_label(actual)
    if exp_parsed is None or act_parsed is None:
        return MatchResult.UNCERTAIN
    if exp_parsed["root"] == act_parsed["root"] and exp_parsed["quality"] == act_parsed["quality"]:
        return MatchResult.MATCH
    exp_chroma = set(i for i, v in enumerate(exp_parsed["chroma"]) if v > 0)
    act_chroma = set(i for i, v in enumerate(act_parsed["chroma"]) if v > 0)
    overlap = len(exp_chroma & act_chroma)
    total = len(exp_chroma | act_chroma)
    if total == 0:
        return MatchResult.UNCERTAIN
    if overlap / total >= 0.75:
        return MatchResult.UNCERTAIN
    return MatchResult.MISMATCH


def load_chroma_json(path: str) -> list:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        if "chroma" in data:
            return data["chroma"]
        if "frames" in data:
            return data["frames"]
        if "bars" in data:
            return data["bars"]
    return []


def build_chord_analyses(
    melody_chroma: list, accompaniment_chords: list
) -> list:
    analyses = []
    for entry in accompaniment_chords:
        bar_start = entry.get("bar_start", 0)
        bar_end = entry.get("bar_end", bar_start + 1)
        expected = entry.get("expected_chord", "")
        actual = entry.get("actual_chord", "")
        chroma = entry.get("chroma_vector", [])
        confidence = entry.get("confidence", 0.0)
        note = entry.get("note", "")
        match_result = compare_chords(expected, actual)
        analyses.append(
            ChordAnalysis(
                bar_start=bar_start,
                bar_end=bar_end,
                expected_chord=expected,
                actual_chord=actual,
                match_result=match_result,
                chroma_vector=chroma,
                confidence=confidence,
                note=note,
            )
        )
    return analyses
