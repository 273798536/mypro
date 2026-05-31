import json
import os
from typing import Optional

from .models import (
    MelodyInput, Measure, Note,
    ChordResult, ChordEntry,
    ModelVersion, Correction, Amendment, AmendmentChange,
)


def load_melody(filepath: str) -> MelodyInput:
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    measures = []
    for m in data.get("measures", []):
        notes = [Note(beat=n["beat"], pitch=n["pitch"], duration=n["duration"]) for n in m.get("notes", [])]
        measures.append(Measure(measure_num=m["measure_num"], notes=notes))
    return MelodyInput(
        case_id=data["case_id"],
        title=data.get("title", ""),
        key_signature=data["key_signature"],
        mode=data["mode"],
        time_signature=data["time_signature"],
        tempo=data.get("tempo", 120),
        measures=measures,
    )


def load_chord(filepath: str) -> ChordResult:
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    chords = [
        ChordEntry(measure_num=c["measure_num"], chord=c["chord"], confidence=c["confidence"])
        for c in data.get("chords", [])
    ]
    return ChordResult(
        case_id=data["case_id"],
        model_version=data.get("model_version", "unknown"),
        timestamp=data.get("timestamp", ""),
        chords=chords,
    )


def load_model_versions(filepath: str) -> dict[str, ModelVersion]:
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    versions = {}
    for v in data:
        mv = ModelVersion(
            model_id=v["model_id"],
            release_date=v.get("release_date", ""),
            trainer=v.get("trainer", ""),
            training_data_version=v.get("training_data_version", ""),
            known_issues=v.get("known_issues", []),
        )
        versions[mv.model_id] = mv
    return versions


def load_correction(filepath: str) -> Optional[Correction]:
    if not os.path.exists(filepath):
        return None
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    amendments = []
    for a in data.get("amendments", []):
        changes = [
            AmendmentChange(
                measure_num=c["measure_num"],
                original_chord=c["original_chord"],
                corrected_chord=c["corrected_chord"],
                reason=c["reason"],
            )
            for c in a.get("changes", [])
        ]
        amendments.append(Amendment(
            amendment_id=a["amendment_id"],
            timestamp=a["timestamp"],
            operator=a["operator"],
            changes=changes,
        ))
    return Correction(case_id=data["case_id"], amendments=amendments)


def load_all_inputs(input_dir: str):
    melody_dir = os.path.join(input_dir, "melody")
    chord_dir = os.path.join(input_dir, "chord")
    version_file = os.path.join(input_dir, "model_version", "versions.json")
    correction_dir = os.path.join(input_dir, "corrections")

    melodies = {}
    if os.path.isdir(melody_dir):
        for fname in sorted(os.listdir(melody_dir)):
            if fname.endswith(".json"):
                m = load_melody(os.path.join(melody_dir, fname))
                melodies[m.case_id] = m

    chords = {}
    if os.path.isdir(chord_dir):
        for fname in sorted(os.listdir(chord_dir)):
            if fname.endswith(".json"):
                c = load_chord(os.path.join(chord_dir, fname))
                chords[c.case_id] = c

    model_versions = {}
    if os.path.isfile(version_file):
        model_versions = load_model_versions(version_file)

    corrections = {}
    if os.path.isdir(correction_dir):
        for fname in sorted(os.listdir(correction_dir)):
            if fname.endswith(".json"):
                corr = load_correction(os.path.join(correction_dir, fname))
                if corr:
                    corrections[corr.case_id] = corr

    return melodies, chords, model_versions, corrections
