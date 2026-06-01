from .models import (
    Sample,
    ConflictRecord,
    ConflictType,
    Severity,
    ChordAnalysis,
    MatchResult,
)
from .chord_parser import parse_chord_label, NOTE_NAMES


def detect_chord_conflicts(sample: Sample) -> list:
    conflicts = []
    for analysis in sample.chord_analyses:
        if analysis.match_result == MatchResult.MISMATCH:
            evidence_ids = []
            for v in sample.version_records:
                if v.chord_conclusion in (
                    analysis.expected_chord,
                    analysis.actual_chord,
                ):
                    evidence_ids.append(v.version_id)
            conflicts.append(
                ConflictRecord(
                    conflict_type=ConflictType.CHORD_CONFLICT,
                    description=(
                        f"小节 {analysis.bar_start}-{analysis.bar_end}: "
                        f"期望和弦 {analysis.expected_chord} 与实际和弦 "
                        f"{analysis.actual_chord} 冲突"
                    ),
                    severity=Severity.HIGH,
                    evidence_version_ids=evidence_ids,
                    related_bar_range=(analysis.bar_start, analysis.bar_end),
                )
            )
        elif analysis.match_result == MatchResult.UNCERTAIN:
            evidence_ids = []
            for v in sample.version_records:
                if v.chord_conclusion in (
                    analysis.expected_chord,
                    analysis.actual_chord,
                ):
                    evidence_ids.append(v.version_id)
            conflicts.append(
                ConflictRecord(
                    conflict_type=ConflictType.CHORD_CONFLICT,
                    description=(
                        f"小节 {analysis.bar_start}-{analysis.bar_end}: "
                        f"期望和弦 {analysis.expected_chord} 与实际和弦 "
                        f"{analysis.actual_chord} 存在不确定性"
                    ),
                    severity=Severity.MEDIUM,
                    evidence_version_ids=evidence_ids,
                    related_bar_range=(analysis.bar_start, analysis.bar_end),
                )
            )
    return conflicts


def detect_bar_misalignment(sample: Sample) -> list:
    conflicts = []
    analyses = sorted(sample.chord_analyses, key=lambda a: a.bar_start)
    for i in range(len(analyses) - 1):
        current = analyses[i]
        next_a = analyses[i + 1]
        if current.bar_end != next_a.bar_start:
            gap = next_a.bar_start - current.bar_end
            description = (
                f"小节错位: 分析段 {i} 结束于小节 {current.bar_end}, "
                f"分析段 {i+1} 开始于小节 {next_a.bar_start}, "
            )
            if gap > 0:
                description += f"存在 {gap} 小节空白未覆盖"
            else:
                description += f"存在 {-gap} 小节重叠覆盖"
            evidence_ids = []
            for v in sample.version_records:
                if v.chord_conclusion:
                    evidence_ids.append(v.version_id)
            conflicts.append(
                ConflictRecord(
                    conflict_type=ConflictType.BAR_MISALIGNMENT,
                    description=description,
                    severity=Severity.MEDIUM if gap > 0 else Severity.HIGH,
                    evidence_version_ids=evidence_ids,
                    related_bar_range=(current.bar_start, next_a.bar_end),
                )
            )
    if analyses:
        all_bars = set()
        for a in analyses:
            for b in range(a.bar_start, a.bar_end):
                all_bars.add(b)
        if all_bars:
            expected = set(range(min(all_bars), max(all_bars) + 1))
            missing = expected - all_bars
            if missing:
                conflicts.append(
                    ConflictRecord(
                        conflict_type=ConflictType.BAR_MISALIGNMENT,
                        description=(
                            f"小节覆盖缺失: 小节 {sorted(missing)} "
                            f"未被任何和弦分析覆盖"
                        ),
                        severity=Severity.LOW,
                        evidence_version_ids=[],
                        related_bar_range=(min(missing), max(missing)),
                    )
                )
    return conflicts


def detect_missed_modulation(sample: Sample) -> list:
    conflicts = []
    analyses = sorted(sample.chord_analyses, key=lambda a: a.bar_start)
    if len(analyses) < 2:
        return conflicts
    for i in range(len(analyses) - 1):
        current = analyses[i]
        next_a = analyses[i + 1]
        curr_parsed = parse_chord_label(current.actual_chord)
        next_parsed = parse_chord_label(next_a.actual_chord)
        if curr_parsed is None or next_parsed is None:
            continue
        curr_root = curr_parsed["root"]
        next_root = next_parsed["root"]
        curr_quality = curr_parsed["quality"]
        next_quality = next_parsed["quality"]
        interval = (next_root - curr_root) % 12
        quality_switched = (
            curr_quality in ("maj", "7", "maj7") and next_quality in ("min", "min7")
        ) or (
            curr_quality in ("min", "min7") and next_quality in ("maj", "7", "maj7")
        )
        same_root_diff_quality = curr_root == next_root and curr_quality != next_quality
        has_version_key_conflict = False
        version_conclusions = [
            v.chord_conclusion for v in sample.version_records if v.chord_conclusion
        ]
        if len(set(version_conclusions)) > 1:
            from .chord_parser import parse_chord_label as _pcl
            roots = set()
            for vc in version_conclusions:
                parsed = _pcl(vc)
                if parsed:
                    roots.add(parsed["root"])
            if len(roots) > 1:
                has_version_key_conflict = True
        strong_modulation_signal = quality_switched and interval in {5, 7}
        if not (strong_modulation_signal or same_root_diff_quality or (quality_switched and has_version_key_conflict)):
            continue
        curr_note = NOTE_NAMES[curr_root]
        next_note = NOTE_NAMES[next_root]
        evidence_ids = []
        for v in sample.version_records:
            if v.chord_conclusion:
                evidence_ids.append(v.version_id)
        has_modulation_note = any(
            "转调" in (a.note or "") or "modulation" in (a.note or "").lower()
            for a in [current, next_a]
        )
        if not has_modulation_note:
            conflicts.append(
                ConflictRecord(
                    conflict_type=ConflictType.MISSED_MODULATION,
                    description=(
                        f"疑似漏判转调: 小节 {current.bar_end} 处 "
                        f"和弦从 {curr_note}:{curr_quality} "
                        f"变为 {next_note}:{next_quality}, "
                        f"大小调品质切换, 可能存在转调但未被标注"
                    ),
                    severity=Severity.HIGH,
                    evidence_version_ids=evidence_ids,
                    related_bar_range=(current.bar_start, next_a.bar_end),
                )
            )
    return conflicts


def detect_all_conflicts(sample: Sample) -> list:
    all_conflicts = []
    all_conflicts.extend(detect_chord_conflicts(sample))
    all_conflicts.extend(detect_bar_misalignment(sample))
    all_conflicts.extend(detect_missed_modulation(sample))
    seen = set()
    unique = []
    for c in all_conflicts:
        key = (c.conflict_type, c.description)
        if key not in seen:
            seen.add(key)
            unique.append(c)
    return unique
