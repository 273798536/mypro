from dataclasses import dataclass, field
from typing import List, Dict, Set, Tuple
from ktv_verify.importer import PlaybackRecord, SongVersion, RefundRecord


@dataclass
class Anomaly:
    anomaly_type: str
    row_number: int
    song_id: str
    song_name: str
    detail: str
    room_id: str = ""
    date: str = ""


@dataclass
class VerifiedRecord:
    date: str
    room_id: str
    song_id: str
    song_name: str
    copyright_owner: str
    duration_sec: int
    version_tag: str
    version_ok: bool
    is_duplicate: bool
    is_refunded: bool
    row_number: int


@dataclass
class VerifyResult:
    verified_records: List[VerifiedRecord] = field(default_factory=list)
    anomalies: List[Anomaly] = field(default_factory=list)
    version_mismatch_count: int = 0
    duplicate_count: int = 0
    refund_offset_count: int = 0
    total_playback: int = 0
    valid_playback: int = 0


def check_version_mismatch(
    playback: List[PlaybackRecord],
    versions: List[SongVersion],
) -> Tuple[List[Anomaly], Dict[str, SongVersion]]:
    version_map: Dict[str, SongVersion] = {}
    for v in versions:
        version_map[v.song_id] = v

    anomalies: List[Anomaly] = []
    for rec in playback:
        sv = version_map.get(rec.song_id)
        if sv is None:
            anomalies.append(Anomaly(
                anomaly_type="版本缺失",
                row_number=rec.row_number,
                song_id=rec.song_id,
                song_name=rec.song_name,
                detail=f"曲库中未找到 song_id={rec.song_id} 的版本信息",
                room_id=rec.room_id,
                date=rec.date,
            ))
        elif rec.version_tag != sv.version_tag:
            anomalies.append(Anomaly(
                anomaly_type="版本错配",
                row_number=rec.row_number,
                song_id=rec.song_id,
                song_name=rec.song_name,
                detail=f"点播记录版本={rec.version_tag}, 曲库版本={sv.version_tag}",
                room_id=rec.room_id,
                date=rec.date,
            ))
    return anomalies, version_map


def check_duplicates(
    playback: List[PlaybackRecord],
) -> Tuple[List[Anomaly], Set[int]]:
    seen: Dict[str, List[int]] = {}
    anomalies: List[Anomaly] = []
    duplicate_rows: Set[int] = set()

    for rec in playback:
        key = f"{rec.date}|{rec.room_id}|{rec.song_id}|{rec.version_tag}"
        if key in seen:
            duplicate_rows.add(rec.row_number)
            anomalies.append(Anomaly(
                anomaly_type="重复点播",
                row_number=rec.row_number,
                song_id=rec.song_id,
                song_name=rec.song_name,
                detail=f"与行 {seen[key][0]} 重复 (日期={rec.date}, 包厢={rec.room_id})",
                room_id=rec.room_id,
                date=rec.date,
            ))
            seen[key].append(rec.row_number)
        else:
            seen[key] = [rec.row_number]

    return anomalies, duplicate_rows


def check_refunds(
    playback: List[PlaybackRecord],
    refunds: List[RefundRecord],
) -> Tuple[List[Anomaly], Set[str]]:
    refund_keys: Set[str] = set()
    for ref in refunds:
        for sid in ref.related_song_ids.split(";"):
            sid = sid.strip()
            if sid:
                refund_keys.add(f"{ref.date}|{ref.room_id}|{sid}")

    anomalies: List[Anomaly] = []
    refunded_rows: Set[str] = set()
    for rec in playback:
        key = f"{rec.date}|{rec.room_id}|{rec.song_id}"
        if key in refund_keys:
            refunded_rows.add(key)
            anomalies.append(Anomaly(
                anomaly_type="退款冲销",
                row_number=rec.row_number,
                song_id=rec.song_id,
                song_name=rec.song_name,
                detail=f"该点播已被退款冲销 (日期={rec.date}, 包厢={rec.room_id})",
                room_id=rec.room_id,
                date=rec.date,
            ))

    return anomalies, refunded_rows


def verify(
    playback: List[PlaybackRecord],
    versions: List[SongVersion],
    refunds: List[RefundRecord],
) -> VerifyResult:
    result = VerifyResult()
    result.total_playback = len(playback)

    version_anomalies, version_map = check_version_mismatch(playback, versions)
    dup_anomalies, duplicate_rows = check_duplicates(playback)
    refund_anomalies, refunded_keys = check_refunds(playback, refunds)

    result.anomalies = version_anomalies + dup_anomalies + refund_anomalies
    result.version_mismatch_count = len(version_anomalies)
    result.duplicate_count = len(dup_anomalies)
    result.refund_offset_count = len(refund_anomalies)

    for rec in playback:
        sv = version_map.get(rec.song_id)
        version_ok = sv is not None and rec.version_tag == sv.version_tag
        is_dup = rec.row_number in duplicate_rows
        refund_key = f"{rec.date}|{rec.room_id}|{rec.song_id}"
        is_refunded = refund_key in refunded_keys

        result.verified_records.append(VerifiedRecord(
            date=rec.date,
            room_id=rec.room_id,
            song_id=rec.song_id,
            song_name=rec.song_name,
            copyright_owner=rec.copyright_owner,
            duration_sec=rec.duration_sec,
            version_tag=rec.version_tag,
            version_ok=version_ok,
            is_duplicate=is_dup,
            is_refunded=is_refunded,
            row_number=rec.row_number,
        ))

    result.valid_playback = sum(
        1 for v in result.verified_records
        if v.version_ok and not v.is_duplicate and not v.is_refunded
    )

    return result
