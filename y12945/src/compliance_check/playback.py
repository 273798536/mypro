from __future__ import annotations

import uuid
from typing import List, Optional
from pathlib import Path

from .models import (
    CheckResult,
    Finding,
    PlaybackRecord,
)


def get_playback_for_finding(
    finding: Finding,
    context_lines: int = 3,
) -> Optional[PlaybackRecord]:
    source_file = finding.source_file
    if not Path(source_file).exists():
        return None

    with open(source_file, "r", encoding="utf-8", errors="replace") as f:
        lines = f.readlines()

    target_line_idx = finding.line_number - 1
    if target_line_idx < 0 or target_line_idx >= len(lines):
        return None

    start_idx = max(0, target_line_idx - context_lines)
    end_idx = min(len(lines), target_line_idx + context_lines + 1)

    context_before = [
        lines[i].rstrip("\n")
        for i in range(start_idx, target_line_idx)
    ]
    context_after = [
        lines[i].rstrip("\n")
        for i in range(target_line_idx + 1, end_idx)
    ]

    record = PlaybackRecord(
        playback_id=str(uuid.uuid4()),
        result_id="",
        finding_id=finding.finding_id,
        original_line_number=finding.line_number,
        original_source_file=finding.source_file,
        original_raw_text=lines[target_line_idx].rstrip("\n"),
        context_before=context_before,
        context_after=context_after,
        source_note=finding.source_note,
        image_name=finding.image_name,
    )
    return record


def get_playback_for_result(
    result: CheckResult,
    context_lines: int = 3,
) -> List[PlaybackRecord]:
    records = []
    for finding in result.findings:
        record = get_playback_for_finding(finding, context_lines)
        if record:
            record.result_id = result.result_id
            records.append(record)
    return records


def find_findings_by_source_note(
    result: CheckResult,
    source_note: str,
) -> List[Finding]:
    return [f for f in result.findings if f.source_note == source_note]


def find_findings_by_image(
    result: CheckResult,
    image_name: str,
) -> List[Finding]:
    return [f for f in result.findings if f.image_name == image_name]


def get_source_overview(result: CheckResult) -> dict:
    from collections import Counter

    source_notes = Counter(
        f.source_note for f in result.findings if f.source_note
    )
    image_names = Counter(
        f.image_name for f in result.findings if f.image_name
    )
    source_files = Counter(f.source_file for f in result.findings)

    return {
        "total_findings": len(result.findings),
        "source_files": dict(source_files.most_common()),
        "source_notes": dict(source_notes.most_common()),
        "images": dict(image_names.most_common()),
    }


def playback_summary(records: List[PlaybackRecord]) -> dict:
    from collections import Counter

    by_file = Counter(r.original_source_file for r in records)
    has_note = sum(1 for r in records if r.source_note)
    has_image = sum(1 for r in records if r.image_name)

    return {
        "total_playback_records": len(records),
        "by_source_file": dict(by_file.most_common()),
        "records_with_source_note": has_note,
        "records_with_image": has_image,
    }
