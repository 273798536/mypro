import json
import os
import datetime
from typing import Optional

from .models import (
    ReviewResult, MelodyInput, ChordResult, ModelVersion,
    Correction, Issue, AmendmentChange,
)
from .loader import load_all_inputs
from .validator import run_full_review, validate_model_consistency


def build_review_results(input_dir: str) -> list[ReviewResult]:
    melodies, chords, model_versions, corrections = load_all_inputs(input_dir)
    results = []

    common_case_ids = set(melodies.keys()) & set(chords.keys())

    for case_id in sorted(common_case_ids):
        melody = melodies[case_id]
        chord = chords[case_id]
        correction = corrections.get(case_id)
        mv = model_versions.get(chord.model_version)

        issues, applied = run_full_review(melody, chord, mv, correction)

        result = ReviewResult(
            case_id=case_id,
            melody=melody,
            chord=chord,
            issues=issues,
            corrections_applied=applied,
            model_version_info=mv,
            review_timestamp=datetime.datetime.now().isoformat(),
        )
        results.append(result)

    model_issues = validate_model_consistency(chords, model_versions)
    global_issues = [mi for mi in model_issues if mi.case_id == ""]
    case_specific_issues = [mi for mi in model_issues if mi.case_id != ""]

    for mi in case_specific_issues:
        for result in results:
            if result.case_id == mi.case_id:
                result.issues.append(mi)

    if global_issues:
        for result in results:
            result.issues.extend(global_issues)

    return results, global_issues


def save_review_results(results: list[ReviewResult], output_dir: str) -> str:
    os.makedirs(output_dir, exist_ok=True)

    full_data = []
    for r in results:
        d = r.to_dict()
        full_data.append(d)

    json_path = os.path.join(output_dir, "review_results.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(full_data, f, ensure_ascii=False, indent=2)

    return json_path


def build_trace_index(results: list[ReviewResult]) -> dict:
    melody_to_result = {}
    result_to_chord = {}

    for r in results:
        melody_to_result[r.case_id] = {
            "key": f"{r.melody.key_signature} {r.melody.mode}",
            "title": r.melody.title,
            "model": r.chord.model_version,
            "issue_count": len(r.issues),
            "corrections": len(r.corrections_applied),
            "chord_summary": [
                {"measure": c.measure_num, "chord": c.chord, "confidence": c.confidence}
                for c in r.chord.chords
            ],
        }

        for ce in r.chord.chords:
            key = f"{r.case_id}:m{ce.measure_num}:{ce.chord}"
            result_to_chord[key] = {
                "case_id": r.case_id,
                "measure": ce.measure_num,
                "chord": ce.chord,
                "confidence": ce.confidence,
                "model_version": r.chord.model_version,
                "source_measures": [
                    {"measure": m.measure_num, "notes": [n.pitch for n in m.notes]}
                    for m in r.melody.measures
                    if m.measure_num == ce.measure_num
                ],
            }

    return {"melody_to_result": melody_to_result, "result_to_chord": result_to_chord}


def save_trace_index(trace: dict, output_dir: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, "trace_index.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(trace, f, ensure_ascii=False, indent=2)
    return path


def query_melody_to_result(trace: dict, case_id: str) -> Optional[dict]:
    return trace.get("melody_to_result", {}).get(case_id)


def query_result_to_chord(trace: dict, case_id: str) -> list[dict]:
    matches = []
    for key, val in trace.get("result_to_chord", {}).items():
        if val.get("case_id") == case_id:
            matches.append(val)
    return sorted(matches, key=lambda x: x["measure"])
