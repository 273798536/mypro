from dataclasses import dataclass, field
from typing import List, Dict
from collections import defaultdict
from ktv_verify.engine import VerifyResult, VerifiedRecord


@dataclass
class OwnerAggregation:
    copyright_owner: str
    total_plays: int = 0
    valid_plays: int = 0
    total_duration_sec: int = 0
    valid_duration_sec: int = 0
    version_mismatch: int = 0
    duplicates: int = 0
    refunded: int = 0
    play_ratio: float = 0.0
    duration_ratio: float = 0.0
    valid_play_ratio: float = 0.0


@dataclass
class RoomAggregation:
    room_id: str
    total_plays: int = 0
    valid_plays: int = 0
    total_duration_sec: int = 0


@dataclass
class DateAggregation:
    date: str
    total_plays: int = 0
    valid_plays: int = 0
    total_duration_sec: int = 0


@dataclass
class AggregationResult:
    by_owner: List[OwnerAggregation] = field(default_factory=list)
    by_room: List[RoomAggregation] = field(default_factory=list)
    by_date: List[DateAggregation] = field(default_factory=list)
    grand_total_plays: int = 0
    grand_valid_plays: int = 0
    grand_total_duration: int = 0
    grand_valid_duration: int = 0


def aggregate(verify_result: VerifyResult) -> AggregationResult:
    result = AggregationResult()
    records = verify_result.verified_records

    owner_map: Dict[str, OwnerAggregation] = defaultdict(lambda: OwnerAggregation(copyright_owner=""))
    room_map: Dict[str, RoomAggregation] = defaultdict(lambda: RoomAggregation(room_id=""))
    date_map: Dict[str, DateAggregation] = defaultdict(lambda: DateAggregation(date=""))

    for rec in records:
        is_valid = rec.version_ok and not rec.is_duplicate and not rec.is_refunded

        owner = owner_map[rec.copyright_owner]
        owner.copyright_owner = rec.copyright_owner
        owner.total_plays += 1
        owner.total_duration_sec += rec.duration_sec
        if is_valid:
            owner.valid_plays += 1
            owner.valid_duration_sec += rec.duration_sec
        if not rec.version_ok:
            owner.version_mismatch += 1
        if rec.is_duplicate:
            owner.duplicates += 1
        if rec.is_refunded:
            owner.refunded += 1

        room = room_map[rec.room_id]
        room.room_id = rec.room_id
        room.total_plays += 1
        room.total_duration_sec += rec.duration_sec
        if is_valid:
            room.valid_plays += 1

        date = date_map[rec.date]
        date.date = rec.date
        date.total_plays += 1
        date.total_duration_sec += rec.duration_sec
        if is_valid:
            date.valid_plays += 1

    result.grand_total_plays = len(records)
    result.grand_valid_plays = verify_result.valid_playback
    result.grand_total_duration = sum(r.duration_sec for r in records)
    result.grand_valid_duration = sum(
        r.duration_sec for r in records
        if r.version_ok and not r.is_duplicate and not r.is_refunded
    )

    for owner in owner_map.values():
        owner.play_ratio = round(owner.total_plays / max(result.grand_total_plays, 1) * 100, 2)
        owner.duration_ratio = round(owner.total_duration_sec / max(result.grand_total_duration, 1) * 100, 2)
        owner.valid_play_ratio = round(owner.valid_plays / max(owner.total_plays, 1) * 100, 2)

    result.by_owner = sorted(owner_map.values(), key=lambda x: x.valid_plays, reverse=True)
    result.by_room = sorted(room_map.values(), key=lambda x: x.valid_plays, reverse=True)
    result.by_date = sorted(date_map.values(), key=lambda x: x.date)

    return result
