from typing import List, Dict, Optional, Tuple, Any
import math
from collections import defaultdict
from datetime import datetime

from app.models.store import db
from app.schemas.charge import ChargeRecord
from app.core.config import settings


def _haversine(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return c * 6371000


def detect_merge_candidates(records: Optional[List[ChargeRecord]] = None) -> List[List[ChargeRecord]]:
    """全量扫描归并候选

    将同小区、同路口/地址或坐标距离小于阈值的记录分组为归并候选组，
    同时更新每条记录的 merge_candidate_ids 和 merge_status 字段。

    Args:
        records: 待扫描的记录列表，None 表示扫描全部

    Returns:
        List[List[ChargeRecord]]: 归并候选组列表，每组为包含 2 条及以上记录的列表
    """
    if records is None:
        records = db.list_records()

    active_records = [
        r for r in records
        if r.merge_status != "merged"
    ]

    community_groups: Dict[str, List[ChargeRecord]] = defaultdict(list)
    for rec in active_records:
        if rec.community_name:
            key = rec.community_name.strip()
            if key:
                community_groups[key].append(rec)

    visited = set()
    result_groups: List[List[ChargeRecord]] = []

    for community, group in community_groups.items():
        n = len(group)
        if n < 2:
            continue

        for i in range(n):
            rec_a = group[i]
            if rec_a.id in visited:
                continue

            current_group = [rec_a]
            visited.add(rec_a.id)

            for j in range(i + 1, n):
                rec_b = group[j]
                if rec_b.id in visited:
                    continue
                if rec_a.id == rec_b.id:
                    continue

                should_merge = False

                a_intersection = (rec_a.intersection or "").strip()
                b_intersection = (rec_b.intersection or "").strip()
                if a_intersection and b_intersection and a_intersection == b_intersection:
                    should_merge = True

                if not should_merge:
                    a_addr = (rec_a.address or "").strip()
                    b_addr = (rec_b.address or "").strip()
                    if a_addr and b_addr and a_addr == b_addr:
                        should_merge = True

                if not should_merge and rec_a.longitude is not None and rec_a.latitude is not None \
                        and rec_b.longitude is not None and rec_b.latitude is not None:
                    dist = _haversine(
                        rec_a.longitude, rec_a.latitude,
                        rec_b.longitude, rec_b.latitude,
                    )
                    if dist < settings.SAME_INTERSECTION_THRESHOLD:
                        should_merge = True

                if should_merge:
                    current_group.append(rec_b)
                    visited.add(rec_b.id)

            if len(current_group) >= 2:
                candidate_ids = [r.id for r in current_group]
                for rec in current_group:
                    others = [rid for rid in candidate_ids if rid != rec.id]
                    db.update_record(
                        rec.id,
                        merge_candidate_ids=others,
                        merge_status="candidate",
                    )
                reloaded_group = [db.get_record(r.id) for r in current_group if db.get_record(r.id)]
                result_groups.append(reloaded_group)

    return result_groups


def propose_merge(
    keep_id: str,
    remove_id: str,
) -> Dict[str, Any]:
    """生成两条记录的归并建议

    对比两条记录的各字段，建议保留 keep_id 的非空字段，冲突字段做合并或标注。
    默认以投诉次数多的记录作为保留方。

    Args:
        keep_id: 拟保留的记录 ID
        remove_id: 拟被合并的记录 ID

    Returns:
        dict: {keep_record, remove_record, proposed_data, conflict_fields}

    Raises:
        ValueError: 记录不存在时抛出
    """
    keep_record = db.get_record(keep_id)
    to_remove_record = db.get_record(remove_id)

    if not keep_record or not to_remove_record:
        raise ValueError("记录不存在")

    if to_remove_record.complaint_count > keep_record.complaint_count:
        keep_record, to_remove_record = to_remove_record, keep_record

    proposed_data: Dict[str, Any] = {}
    conflict_fields: List[str] = []

    simple_fields = [
        ("community_name", True),
        ("street_name", True),
        ("intersection", True),
        ("address", True),
        ("time_period", True),
        ("peak_type", True),
    ]
    for field, prefer_nonempty in simple_fields:
        a_val = getattr(keep_record, field)
        b_val = getattr(to_remove_record, field)
        a_str = (a_val or "").strip() if isinstance(a_val, str) else a_val
        b_str = (b_val or "").strip() if isinstance(b_val, str) else b_val

        if a_str and not b_str:
            proposed_data[field] = a_val
        elif not a_str and b_str:
            proposed_data[field] = b_val
        elif a_str and b_str and a_str == b_str:
            proposed_data[field] = a_val
        elif a_str and b_str and a_str != b_str:
            proposed_data[field] = a_val
            conflict_fields.append(field)
        else:
            proposed_data[field] = None

    for coord_field in ("longitude", "latitude"):
        a_val = getattr(keep_record, coord_field)
        b_val = getattr(to_remove_record, coord_field)
        if a_val is not None and b_val is None:
            proposed_data[coord_field] = a_val
        elif a_val is None and b_val is not None:
            proposed_data[coord_field] = b_val
        elif a_val is not None and b_val is not None and a_val == b_val:
            proposed_data[coord_field] = a_val
        elif a_val is not None and b_val is not None and a_val != b_val:
            proposed_data[coord_field] = a_val
            conflict_fields.append(coord_field)
        else:
            proposed_data[coord_field] = None

    merge_text_fields = [
        "scenario_label", "side_note", "screenshot_note", "complaint_content"
    ]
    for field in merge_text_fields:
        a_val = getattr(keep_record, field)
        b_val = getattr(to_remove_record, field)
        a_str = (a_val or "").strip() if isinstance(a_val, str) else ""
        b_str = (b_val or "").strip() if isinstance(b_val, str) else ""

        if a_str and not b_str:
            proposed_data[field] = a_val
        elif not a_str and b_str:
            proposed_data[field] = b_val
        elif a_str and b_str and a_str == b_str:
            proposed_data[field] = a_val
        elif a_str and b_str and a_str != b_str:
            proposed_data[field] = f"{a_str}；{b_str}"
            conflict_fields.append(field)
        else:
            proposed_data[field] = None

    proposed_data["complaint_count"] = keep_record.complaint_count + to_remove_record.complaint_count

    all_flags = set()
    if keep_record.bad_data_flags:
        all_flags.update(keep_record.bad_data_flags)
    if to_remove_record.bad_data_flags:
        all_flags.update(to_remove_record.bad_data_flags)
    proposed_data["bad_data_flags"] = list(all_flags)

    return {
        "keep_record": keep_record,
        "remove_record": to_remove_record,
        "proposed_data": proposed_data,
        "conflict_fields": conflict_fields,
    }


def execute_merge(
    keep_id: str,
    remove_id: str,
    chosen_fields: Optional[Dict[str, Any]] = None,
) -> Optional[ChargeRecord]:
    """执行归并操作

    将 remove_id 记录合并入 keep_id 记录：
    - source_refs 追加合并
    - complaint_count 累加
    - chosen_fields 中指定的字段值覆盖写入保留记录
    - remove_id 记录标记 merge_status=merged，status=merged_into_{keep_id}
    - 更新第三方候选关系

    Args:
        keep_id: 保留的记录 ID
        remove_id: 被合并的记录 ID
        chosen_fields: 用户选择的字段值（解决冲突用），None 则用默认策略

    Returns:
        归并后的保留记录，失败返回 None

    Raises:
        ValueError: 记录不存在时抛出
    """
    keep_rec = db.get_record(keep_id)
    remove_rec = db.get_record(remove_id)

    if not keep_rec or not remove_rec:
        raise ValueError("记录不存在")

    keep_updates: Dict[str, Any] = {}

    proposal = propose_merge(keep_id, remove_id)
    default_proposed: Dict[str, Any] = proposal["proposed_data"]

    for field, default_val in default_proposed.items():
        if chosen_fields and field in chosen_fields:
            keep_updates[field] = chosen_fields[field]
        else:
            keep_updates[field] = default_val

    merged_refs = list(keep_rec.source_refs or [])
    for ref in (remove_rec.source_refs or []):
        merged_refs.append(ref)
    keep_updates["source_refs"] = merged_refs

    keep_candidates = list(keep_rec.merge_candidate_ids or [])
    for cid in (remove_rec.merge_candidate_ids or []):
        if cid != keep_id and cid not in keep_candidates:
            keep_candidates.append(cid)
    if remove_id in keep_candidates:
        keep_candidates.remove(remove_id)
    keep_updates["merge_candidate_ids"] = keep_candidates

    if len(keep_candidates) == 0:
        keep_updates["merge_status"] = "none"
    else:
        keep_updates["merge_status"] = "candidate"

    keep_updates["updated_at"] = datetime.now()
    keep_updates["version"] = keep_rec.version + 1

    db.update_record(keep_id, **keep_updates)

    remove_candidates = list(remove_rec.merge_candidate_ids or [])
    if keep_id in remove_candidates:
        remove_candidates.remove(keep_id)
    for cid in remove_candidates:
        other_rec = db.get_record(cid)
        if other_rec:
            other_candidates = list(other_rec.merge_candidate_ids or [])
            if remove_id in other_candidates:
                other_candidates.remove(remove_id)
            if keep_id not in other_candidates:
                other_candidates.append(keep_id)
            other_updates = {
                "merge_candidate_ids": other_candidates,
                "merge_status": "candidate" if other_candidates else "none",
            }
            db.update_record(cid, **other_updates)

            keep_other = db.get_record(keep_id)
            if keep_other:
                k_candidates = list(keep_other.merge_candidate_ids or [])
                if cid not in k_candidates:
                    k_candidates.append(cid)
                db.update_record(keep_id, merge_candidate_ids=k_candidates, merge_status="candidate")

    remove_updates: Dict[str, Any] = {
        "status": f"merged_into_{keep_id}",
        "merge_status": "merged",
        "merged_into_id": keep_id,
        "updated_at": datetime.now(),
        "version": remove_rec.version + 1,
    }
    db.update_record(remove_id, **remove_updates)

    db.save_to_disk()

    return db.get_record(keep_id)
