from typing import List, Tuple, Optional
from datetime import datetime

from app.models.store import db
from app.schemas.charge import ChargeRecord


def detect_bad_data(records: Optional[List[ChargeRecord]] = None) -> List[Tuple[ChargeRecord, List[str]]]:
    """检测坏数据

    检测规则：
    1. 小区名称为空
    2. 经纬度格式异常（超出合理范围）
    3. 投诉次数 <= 0
    4. 同时缺少路口和地址且坐标缺失

    Args:
        records: 待检测的记录列表，None 表示检测全部

    Returns:
        (记录, 问题标签列表) 列表
    """
    targets = records if records is not None else db.list_records()
    results: List[Tuple[ChargeRecord, List[str]]] = []

    for rec in targets:
        flags: List[str] = []

        if not rec.community_name or rec.community_name.strip() == "":
            flags.append("missing_community_name")

        if rec.longitude is not None and not (-180 <= rec.longitude <= 180):
            flags.append("invalid_longitude")
        if rec.latitude is not None and not (-90 <= rec.latitude <= 90):
            flags.append("invalid_latitude")

        if rec.complaint_count <= 0:
            flags.append("invalid_complaint_count")

        has_location = (
            (rec.intersection and rec.intersection.strip() != "")
            or (rec.address and rec.address.strip() != "")
            or (rec.longitude is not None and rec.latitude is not None)
        )
        if not has_location:
            flags.append("missing_location_info")

        if flags:
            rec.bad_data_flags = flags
            rec.status = "bad_data"
            results.append((rec, flags))
        elif rec.status == "bad_data" and not flags:
            rec.bad_data_flags = []
            rec.status = "normal"

    return results


def scan_conflicts() -> List[Tuple[ChargeRecord, ChargeRecord, List[str]]]:
    """全量扫描口径冲突

    同小区同路口（或坐标邻近）但关键字段不一致的记录视为冲突

    Returns:
        (记录A, 记录B, 冲突字段列表) 列表
    """
    from app.core.config import settings

    records = [r for r in db.list_records() if r.merge_status != "merged"]
    conflicts: List[Tuple[ChargeRecord, ChargeRecord, List[str]]] = []
    seen_pairs = set()

    conflict_fields = [
        "time_period", "peak_type", "scenario_label",
        "side_note", "screenshot_note",
    ]

    for i, a in enumerate(records):
        for j in range(i + 1, len(records)):
            b = records[j]
            pair_key = tuple(sorted([a.id, b.id]))
            if pair_key in seen_pairs:
                continue

            if a.community_name != b.community_name:
                continue

            is_same_location = False
            if a.intersection and b.intersection and a.intersection == b.intersection:
                is_same_location = True
            if (a.longitude is not None and a.latitude is not None
                    and b.longitude is not None and b.latitude is not None):
                dist = db._haversine(a.longitude, a.latitude, b.longitude, b.latitude)
                if dist <= settings.COORD_DISTANCE_THRESHOLD:
                    is_same_location = True

            if not is_same_location:
                continue

            seen_pairs.add(pair_key)
            field_conflicts: List[str] = []

            for field in conflict_fields:
                val_a = getattr(a, field)
                val_b = getattr(b, field)
                if (val_a not in (None, "") and val_b not in (None, "")
                        and val_a != val_b):
                    field_conflicts.append(field)

            if field_conflicts:
                if a.conflict_with is None:
                    a.conflict_with = []
                if b.conflict_with is None:
                    b.conflict_with = []
                if b.id not in a.conflict_with:
                    a.conflict_with.append(b.id)
                if a.id not in b.conflict_with:
                    b.conflict_with.append(a.id)
                a.status = "conflict"
                b.status = "conflict"
                conflicts.append((a, b, field_conflicts))

    return conflicts


def resolve_conflict(a_id: str, b_id: str, chosen_fields: dict) -> Tuple[ChargeRecord, ChargeRecord]:
    """解决两条记录之间的冲突

    Args:
        a_id: 记录 A 的 ID
        b_id: 记录 B 的 ID
        chosen_fields: {字段名: 选中的记录ID ('a' 或 'b')} 或 {字段名: 具体值}

    Returns:
        (记录A, 记录B) 处理后的两条记录

    Raises:
        ValueError: 记录不存在时抛出
    """
    a = db.get_record(a_id)
    b = db.get_record(b_id)

    if not a or not b:
        raise ValueError("记录不存在")

    for field, choice in chosen_fields.items():
        if choice == "a":
            value = getattr(a, field)
            setattr(b, field, value)
        elif choice == "b":
            value = getattr(b, field)
            setattr(a, field, value)
        else:
            if hasattr(a, field):
                setattr(a, field, choice)
            if hasattr(b, field):
                setattr(b, field, choice)

    for rec in [a, b]:
        if rec.conflict_with:
            other_id = b_id if rec.id == a_id else a_id
            if other_id in rec.conflict_with:
                rec.conflict_with.remove(other_id)
        if not rec.conflict_with and rec.status == "conflict":
            rec.status = "normal"
        rec.updated_at = datetime.now()
        rec.version += 1

    return a, b
