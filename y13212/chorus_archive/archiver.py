from typing import List, Optional
from pathlib import Path

from .models import VoicePart, LineStatus, ArchiveResult
from .parser import parse_voice_parts, parse_authorization_note, parse_manual_adjudication


def _apply_manual_adjudication(
    parts: List[VoicePart],
    adjudications: dict
) -> List[VoicePart]:
    for part in parts:
        key = f"{part.track_no}|{part.part_name}"
        if key in adjudications:
            adj = adjudications[key]
            part.original_status = part.status
            part.manual_note = adj["note"]
            if adj["new_status"] in ("已处理", "正常", "通过"):
                part.status = LineStatus.PROCESSED
            elif adj["new_status"] in ("坏行", "错误"):
                part.status = LineStatus.BAD
            elif adj["new_status"] in ("跳过", "跳过不处理"):
                part.status = LineStatus.SKIPPED
            elif adj["new_status"] in ("时码偏差", "时码偏半拍"):
                part.status = LineStatus.TIMECODE_OFF
            else:
                part.status = LineStatus.MANUAL_OVERRIDDEN
    return parts


def _apply_authorization_note(
    parts: List[VoicePart],
    auth_note: str
) -> List[VoicePart]:
    if not auth_note:
        return parts
    for part in parts:
        if part.authorization_period == "":
            part.authorization_period = auth_note
    return parts


def archive_voice_parts(
    parts_file: str,
    auth_file: Optional[str] = None,
    manual_file: Optional[str] = None,
    output_dir: str = "output"
) -> ArchiveResult:
    result = ArchiveResult()

    parts, bad_records, skipped_records = parse_voice_parts(parts_file)
    result.total = len(parts) + len(bad_records) + len(skipped_records)
    result.bad_records = bad_records
    result.skipped_records = skipped_records
    result.bad_lines = len(bad_records)
    result.skipped_lines = len(skipped_records)

    if auth_file and Path(auth_file).exists():
        auth_note = parse_authorization_note(auth_file)
        result.authorization_note = auth_note
        parts = _apply_authorization_note(parts, auth_note)

    if manual_file and Path(manual_file).exists():
        adjudications = parse_manual_adjudication(manual_file)
        parts = _apply_manual_adjudication(parts, adjudications)

    timecode_off = [p for p in parts if p.status == LineStatus.TIMECODE_OFF]
    manual_overridden = [p for p in parts if p.original_status is not None]
    processed = [p for p in parts if p.status == LineStatus.PROCESSED]

    result.parts = parts
    result.timecode_off_records = timecode_off
    result.timecode_off_lines = len(timecode_off)
    result.manual_overridden_records = manual_overridden
    result.manual_overridden_lines = len(manual_overridden)
    result.processed = len(processed)

    return result
