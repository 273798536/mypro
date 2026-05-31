from typing import Optional

from .models import (
    MelodyInput, ChordResult, ModelVersion, Correction,
    Issue, IssueCategory, IssueStatus, AmendmentChange,
)

KEY_NOTE_MAP = {
    "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3,
    "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8,
    "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11,
}

MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11]
MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10]

CHORD_INTERVALS = {
    "maj": [0, 4, 7],
    "min": [0, 3, 7],
    "dim": [0, 3, 6],
    "aug": [0, 4, 8],
    "dom7": [0, 4, 7, 10],
    "maj7": [0, 4, 7, 11],
    "min7": [0, 3, 7, 10],
    "dim7": [0, 3, 6, 9],
    "hdim7": [0, 3, 6, 10],
    "minMaj7": [0, 3, 7, 11],
}

MODE_MISJUDGE_THRESHOLD = 0.75
MEASURE_MISALIGN_TOLERANCE = 0


def _parse_chord_root(chord_name: str) -> Optional[int]:
    if len(chord_name) >= 2 and chord_name[1] in ("#", "b"):
        root_str = chord_name[:2]
    else:
        root_str = chord_name[0]
    return KEY_NOTE_MAP.get(root_str)


def _parse_chord_quality(chord_name: str) -> str:
    if len(chord_name) >= 2 and chord_name[1] in ("#", "b"):
        suffix = chord_name[2:]
    else:
        suffix = chord_name[1:]
    if suffix == "" or suffix == "maj":
        return "maj"
    if suffix == "m" or suffix == "min":
        return "min"
    if suffix == "dim":
        return "dim"
    if suffix == "aug":
        return "aug"
    if suffix == "7" or suffix == "dom7":
        return "dom7"
    if suffix == "maj7" or suffix == "M7":
        return "maj7"
    if suffix == "m7" or suffix == "min7":
        return "min7"
    if suffix == "dim7":
        return "dim7"
    if suffix == "m7b5" or suffix == "hdim7":
        return "hdim7"
    if suffix == "mM7" or suffix == "minMaj7":
        return "minMaj7"
    return "maj"


def _pitch_to_midi(pitch: str) -> int:
    note_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    flat_to_sharp = {"Db": "C#", "Eb": "D#", "Fb": "E", "Gb": "F#", "Ab": "G#", "Bb": "A#", "Cb": "B"}
    if len(pitch) >= 2 and pitch[1] == "b":
        note_part = flat_to_sharp.get(pitch[:2], pitch[:2])
        octave = int(pitch[2:])
    elif len(pitch) >= 2 and pitch[1] == "#":
        note_part = pitch[:2]
        octave = int(pitch[2:])
    else:
        note_part = pitch[0]
        octave = int(pitch[1:])
    note_idx = note_names.index(note_part)
    return (octave + 1) * 12 + note_idx


def _get_scale_notes(key_signature: str, mode: str) -> set[int]:
    root = KEY_NOTE_MAP.get(key_signature, 0)
    intervals = MAJOR_SCALE_INTERVALS if mode == "major" else MINOR_SCALE_INTERVALS
    return {(root + interval) % 12 for interval in intervals}


def _chord_fits_scale(chord_name: str, scale_notes: set[int]) -> bool:
    root = _parse_chord_root(chord_name)
    if root is None:
        return True
    quality = _parse_chord_quality(chord_name)
    intervals = CHORD_INTERVALS.get(quality, [0, 4, 7])
    chord_pitch_classes = {(root + interval) % 12 for interval in intervals}
    return chord_pitch_classes.issubset(scale_notes)


def _measure_notes_in_scale(measure, scale_notes: set[int]) -> float:
    if not measure.notes:
        return 1.0
    in_scale = 0
    total = 0
    for note in measure.notes:
        pc = _pitch_to_midi(note.pitch) % 12
        if pc in scale_notes:
            in_scale += note.duration
        total += note.duration
    return in_scale / total if total > 0 else 1.0


def validate_mode(melody: MelodyInput, chord: ChordResult) -> list[Issue]:
    issues = []
    scale_notes = _get_scale_notes(melody.key_signature, melody.mode)
    opposite_mode = "minor" if melody.mode == "major" else "major"
    opposite_scale = _get_scale_notes(melody.key_signature, opposite_mode)

    low_confidence_chords = []
    scale_mismatch_chords = []

    for ce in chord.chords:
        if ce.confidence < MODE_MISJUDGE_THRESHOLD:
            low_confidence_chords.append(ce)

        if not _chord_fits_scale(ce.chord, scale_notes):
            scale_mismatch_chords.append(ce)

    melody_measure_conform = {}
    for m in melody.measures:
        conform = _measure_notes_in_scale(m, scale_notes)
        opposite_conform = _measure_notes_in_scale(m, opposite_scale)
        melody_measure_conform[m.measure_num] = (conform, opposite_conform)

    ambiguous_measures = []
    for m_num, (conform, opp_conform) in melody_measure_conform.items():
        if abs(conform - opp_conform) < 0.2 and conform < 0.9:
            ambiguous_measures.append(m_num)

    if scale_mismatch_chords or (low_confidence_chords and ambiguous_measures):
        detail_parts = []
        if scale_mismatch_chords:
            parts = [f"小节{c.measure_num}({c.chord},置信度{c.confidence:.2f})" for c in scale_mismatch_chords]
            detail_parts.append(f"和弦不在{melody.key_signature}{melody.mode}调式内: {', '.join(parts)}")
        if ambiguous_measures:
            detail_parts.append(f"旋律在小节{', '.join(map(str, ambiguous_measures))}上与{opposite_mode}调式高度重叠，调式可能误判")

        issues.append(Issue(
            case_id=melody.case_id,
            category=IssueCategory.MODE_MISJUDGE,
            status=IssueStatus.PENDING_CONFIRM,
            measure_num=scale_mismatch_chords[0].measure_num if scale_mismatch_chords else ambiguous_measures[0] if ambiguous_measures else None,
            detail="; ".join(detail_parts),
            next_step="请调式标注组确认调式归属后重新校验",
        ))

    return issues


def validate_measure_alignment(melody: MelodyInput, chord: ChordResult) -> list[Issue]:
    issues = []
    melody_measures = {m.measure_num for m in melody.measures}
    chord_measures = {c.measure_num for c in chord.chords}

    missing_in_melody = chord_measures - melody_measures
    missing_in_chord = melody_measures - chord_measures

    ts_parts = melody.time_signature.split("/")
    beats_per_measure = int(ts_parts[0]) if ts_parts else 4

    for m in melody.measures:
        total_beats = sum(n.duration for n in m.notes)
        if abs(total_beats - beats_per_measure) > 0.01:
            if missing_in_chord or missing_in_melody:
                issues.append(Issue(
                    case_id=melody.case_id,
                    category=IssueCategory.MEASURE_MISALIGN,
                    status=IssueStatus.PENDING_CONFIRM,
                    measure_num=m.measure_num,
                    detail=f"小节{m.measure_num}实际节拍{total_beats}与拍号{melody.time_signature}(期望{beats_per_measure}拍)不一致，和弦覆盖范围可能错位",
                    next_step="请音频对齐组核查小节边界与beat映射",
                ))
                break

    if missing_in_melody and not issues:
        issues.append(Issue(
            case_id=melody.case_id,
            category=IssueCategory.MEASURE_MISALIGN,
            status=IssueStatus.PENDING_CONFIRM,
            measure_num=min(missing_in_melody) if missing_in_melody else None,
            detail=f"和弦覆盖了小节{', '.join(map(str, sorted(missing_in_melody)))}，但旋律中无对应小节，可能存在小节错位",
            next_step="请音频对齐组核查小节边界与beat映射",
        ))

    if missing_in_chord and not issues:
        issues.append(Issue(
            case_id=melody.case_id,
            category=IssueCategory.MEASURE_MISALIGN,
            status=IssueStatus.PENDING_CONFIRM,
            measure_num=min(missing_in_chord) if missing_in_chord else None,
            detail=f"旋律包含小节{', '.join(map(str, sorted(missing_in_chord)))}，但和弦未覆盖，可能漏配或错位",
            next_step="请音频对齐组核查小节边界与beat映射",
        ))

    return issues


def validate_model_consistency(chords: dict[str, ChordResult], model_versions: dict[str, ModelVersion]) -> list[Issue]:
    issues = []
    used_versions = set()
    for chord in chords.values():
        used_versions.add(chord.model_version)

    if len(used_versions) > 1:
        version_details = []
        for v_id in sorted(used_versions):
            mv = model_versions.get(v_id)
            trainer = mv.trainer if mv else "未知"
            version_details.append(f"{v_id}(训练:{trainer})")

        issues.append(Issue(
            case_id="",
            category=IssueCategory.MODEL_MIX,
            status=IssueStatus.PENDING_CONFIRM,
            measure_num=None,
            detail=f"检测到多模型版本混用: {', '.join(version_details)}，不同版本和弦风格可能不一致",
            next_step="请算法组确认是否为预期混用，若非预期请统一模型版本后重新推理",
        ))

    for v_id in used_versions:
        mv = model_versions.get(v_id)
        if mv and mv.known_issues:
            for chord in chords.values():
                if chord.model_version == v_id:
                    for known in mv.known_issues:
                        issues.append(Issue(
                            case_id=chord.case_id,
                            category=IssueCategory.MODEL_MIX,
                            status=IssueStatus.PENDING_CONFIRM,
                            measure_num=None,
                            detail=f"模型{v_id}已知问题: {known}",
                            next_step=f"请联系{mv.trainer}评估是否影响当前case",
                        ))

    return issues


def apply_corrections(
    chord: ChordResult, correction: Optional[Correction]
) -> tuple[list[AmendmentChange], list[Issue]]:
    if not correction:
        return [], []

    applied = []
    issues = []
    chord_map = {c.measure_num: c for c in chord.chords}

    for amendment in correction.amendments:
        for change in amendment.changes:
            entry = chord_map.get(change.measure_num)
            if entry:
                if entry.chord != change.corrected_chord:
                    applied.append(change)
                    entry.chord = change.corrected_chord
                else:
                    issues.append(Issue(
                        case_id=chord.case_id,
                        category=IssueCategory.MODE_MISJUDGE,
                        status=IssueStatus.RESOLVED,
                        measure_num=change.measure_num,
                        detail=f"小节{change.measure_num}修正后与原结果一致({change.corrected_chord})，无需改动",
                        next_step="无需跟进",
                    ))
            else:
                issues.append(Issue(
                    case_id=chord.case_id,
                    category=IssueCategory.MEASURE_MISALIGN,
                    status=IssueStatus.PENDING_CONFIRM,
                    measure_num=change.measure_num,
                    detail=f"修正记录中小节{change.measure_num}不在和弦结果中，无法应用修正",
                    next_step="请音频对齐组核查小节边界与beat映射",
                ))

    return applied, issues


def run_full_review(melody: MelodyInput, chord: ChordResult,
                    model_version_info: Optional[ModelVersion],
                    correction: Optional[Correction]) -> tuple[list[Issue], list[AmendmentChange]]:
    all_issues = []

    all_issues.extend(validate_mode(melody, chord))
    all_issues.extend(validate_measure_alignment(melody, chord))

    applied, correction_issues = apply_corrections(chord, correction)
    all_issues.extend(correction_issues)

    return all_issues, applied
