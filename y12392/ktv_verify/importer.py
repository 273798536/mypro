import csv
import os
from dataclasses import dataclass, field
from typing import List, Dict, Optional


@dataclass
class PlaybackRecord:
    date: str
    room_id: str
    song_id: str
    song_name: str
    copyright_owner: str
    duration_sec: int
    version_tag: str
    row_number: int = 0


@dataclass
class SongVersion:
    song_id: str
    song_name: str
    version_tag: str
    copyright_owner: str
    effective_date: str


@dataclass
class RefundRecord:
    date: str
    room_id: str
    refund_type: str
    amount: float
    related_song_ids: str


@dataclass
class ImportResult:
    playback_records: List[PlaybackRecord] = field(default_factory=list)
    song_versions: List[SongVersion] = field(default_factory=list)
    refund_records: List[RefundRecord] = field(default_factory=list)
    playback_file: str = ""
    version_file: str = ""
    refund_file: str = ""
    playback_count: int = 0
    version_count: int = 0
    refund_count: int = 0


def _find_file(directory: str, patterns: List[str]) -> Optional[str]:
    for pattern in patterns:
        candidate = os.path.join(directory, pattern)
        if os.path.isfile(candidate):
            return candidate
    for f in os.listdir(directory):
        for pattern in patterns:
            if pattern.replace(".csv", "") in f.lower() and f.endswith(".csv"):
                return os.path.join(directory, f)
    return None


def load_playback_records(filepath: str) -> List[PlaybackRecord]:
    records = []
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):
            records.append(PlaybackRecord(
                date=row.get("date", "").strip(),
                room_id=row.get("room_id", "").strip(),
                song_id=row.get("song_id", "").strip(),
                song_name=row.get("song_name", "").strip(),
                copyright_owner=row.get("copyright_owner", "").strip(),
                duration_sec=int(row.get("duration_sec", "0").strip()),
                version_tag=row.get("version_tag", "").strip(),
                row_number=i,
            ))
    return records


def load_song_versions(filepath: str) -> List[SongVersion]:
    records = []
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append(SongVersion(
                song_id=row.get("song_id", "").strip(),
                song_name=row.get("song_name", "").strip(),
                version_tag=row.get("version_tag", "").strip(),
                copyright_owner=row.get("copyright_owner", "").strip(),
                effective_date=row.get("effective_date", "").strip(),
            ))
    return records


def load_refund_records(filepath: str) -> List[RefundRecord]:
    records = []
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append(RefundRecord(
                date=row.get("date", "").strip(),
                room_id=row.get("room_id", "").strip(),
                refund_type=row.get("refund_type", "").strip(),
                amount=float(row.get("amount", "0").strip()),
                related_song_ids=row.get("related_song_ids", "").strip(),
            ))
    return records


def import_all(input_dir: str) -> ImportResult:
    result = ImportResult()

    pb_file = _find_file(input_dir, ["playback_records.csv", "点播记录.csv"])
    if pb_file:
        result.playback_records = load_playback_records(pb_file)
        result.playback_file = pb_file
        result.playback_count = len(result.playback_records)

    ver_file = _find_file(input_dir, ["song_versions.csv", "曲库版本.csv"])
    if ver_file:
        result.song_versions = load_song_versions(ver_file)
        result.version_file = ver_file
        result.version_count = len(result.song_versions)

    ref_file = _find_file(input_dir, ["refund_records.csv", "退款记录.csv"])
    if ref_file:
        result.refund_records = load_refund_records(ref_file)
        result.refund_file = ref_file
        result.refund_count = len(result.refund_records)

    return result
