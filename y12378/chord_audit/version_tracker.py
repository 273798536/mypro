from .models import Sample, VersionRecord, VersionSource


def compare_versions(sample: Sample) -> list:
    diffs = []
    versions = sample.version_records
    if len(versions) < 2:
        return diffs
    sorted_versions = sorted(versions, key=lambda v: v.timestamp)
    for i in range(len(sorted_versions) - 1):
        older = sorted_versions[i]
        newer = sorted_versions[i + 1]
        diff = {
            "older_version_id": older.version_id,
            "newer_version_id": newer.version_id,
            "older_timestamp": older.timestamp,
            "newer_timestamp": newer.timestamp,
            "older_source": older.source.value,
            "newer_source": newer.source.value,
            "older_conclusion": older.chord_conclusion,
            "newer_conclusion": newer.chord_conclusion,
            "conclusion_changed": older.chord_conclusion != newer.chord_conclusion,
            "older_content": older.content,
            "newer_content": newer.content,
            "content_changed": older.content != newer.content,
        }
        diffs.append(diff)
    return diffs


def check_conclusion_consistency(sample: Sample) -> bool:
    versions = sample.version_records
    if len(versions) < 2:
        return True
    conclusions = set()
    for v in versions:
        if v.chord_conclusion:
            conclusions.add(v.chord_conclusion)
    if len(conclusions) <= 1:
        return True
    latest = sample.get_latest_version()
    if latest is None:
        return False
    for v in versions:
        if v.chord_conclusion and v.chord_conclusion != latest.chord_conclusion:
            return False
    return True


def get_version_evidence_for_conflict(
    sample: Sample, conflict_type: str, bar_range: tuple
) -> list:
    evidence = []
    for v in sample.version_records:
        relevant = False
        if conflict_type == "chord_conflict":
            for a in sample.chord_analyses:
                if (
                    a.bar_start <= bar_range[1]
                    and a.bar_end >= bar_range[0]
                ):
                    if v.chord_conclusion in (
                        a.expected_chord,
                        a.actual_chord,
                    ):
                        relevant = True
                        break
        elif conflict_type == "missed_modulation":
            relevant = True
        elif conflict_type == "bar_misalignment":
            relevant = bool(v.chord_conclusion)
        if relevant:
            evidence.append(
                {
                    "version_id": v.version_id,
                    "timestamp": v.timestamp,
                    "source": v.source.value,
                    "chord_conclusion": v.chord_conclusion,
                    "content": v.content,
                    "is_latest": v.is_latest,
                }
            )
    return evidence


def mark_conclusion_inconsistency(sample: Sample) -> dict:
    diffs = compare_versions(sample)
    inconsistent_diffs = [d for d in diffs if d["conclusion_changed"]]
    is_consistent = check_conclusion_consistency(sample)
    sample.conclusion_consistent = is_consistent
    result = {
        "is_consistent": is_consistent,
        "version_diffs": diffs,
        "inconsistent_diffs": inconsistent_diffs,
        "total_versions": len(sample.version_records),
    }
    if not is_consistent:
        result["warning"] = (
            f"发现 {len(inconsistent_diffs)} 处版本间结论不一致, "
            "版本记录已作为补充证据保留在详情中"
        )
        for d in inconsistent_diffs:
            for c in sample.conflicts:
                if not c.evidence_version_ids:
                    c.evidence_version_ids = []
                if d["older_version_id"] not in c.evidence_version_ids:
                    c.evidence_version_ids.append(d["older_version_id"])
                if d["newer_version_id"] not in c.evidence_version_ids:
                    c.evidence_version_ids.append(d["newer_version_id"])
    return result


def preserve_overwritten_modulation_evidence(sample: Sample) -> list:
    preserved = []
    versions = sorted(sample.version_records, key=lambda v: v.timestamp)
    for i in range(len(versions) - 1):
        older = versions[i]
        newer = versions[i + 1]
        older_has_modulation = "转调" in (older.content or "") or "modulation" in (
            older.content or ""
        ).lower()
        newer_has_modulation = "转调" in (newer.content or "") or "modulation" in (
            newer.content or ""
        ).lower()
        if older_has_modulation and not newer_has_modulation:
            preserved.append(
                {
                    "type": "modulation_overwritten",
                    "older_version_id": older.version_id,
                    "newer_version_id": newer.version_id,
                    "older_content": older.content,
                    "newer_content": newer.content,
                    "warning": (
                        f"版本 {older.version_id} 包含转调标注, "
                        f"但被版本 {newer.version_id} 覆盖后丢失"
                    ),
                }
            )
    return preserved
