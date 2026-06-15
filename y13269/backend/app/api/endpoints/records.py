from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.store import db
from app.schemas.charge import ChargeRecord

router = APIRouter(prefix="/records", tags=["记录管理"])


class RecordUpdate(BaseModel):
    record_no: Optional[str] = None
    community_name: Optional[str] = None
    street_name: Optional[str] = None
    intersection: Optional[str] = None
    address: Optional[str] = None
    longitude: Optional[float] = None
    latitude: Optional[float] = None
    time_period: Optional[str] = None
    peak_type: Optional[str] = None
    scenario_label: Optional[str] = None
    side_note: Optional[str] = None
    screenshot_note: Optional[str] = None
    complaint_content: Optional[str] = None
    complaint_count: Optional[int] = None
    status: Optional[str] = None


def _with_unified_note_summary(rec: ChargeRecord) -> Dict[str, Any]:
    """为记录附加统一口径摘要信息

    Args:
        rec: 原始记录对象

    Returns:
        包含 unified_note 摘要的字典
    """
    data = rec.model_dump(mode="json")
    if rec.unified_note_id:
        note = db.get_unified_note(rec.unified_note_id)
        if note:
            data["unified_note"] = {
                "id": note.id,
                "scenario_label": note.scenario_label,
                "side_note": note.side_note,
                "screenshot_note": note.screenshot_note,
            }
        else:
            data["unified_note"] = None
    else:
        data["unified_note"] = None
    return data


@router.get("/")
def list_records():
    """获取所有记录列表

    返回所有记录，每条记录附带关联的 unified_note 摘要信息。

    Returns:
        List[dict]: 记录列表，每项包含记录全量字段及 unified_note 摘要
    """
    records = db.list_records()
    return [_with_unified_note_summary(r) for r in records]


@router.get("/statistics")
def get_statistics():
    """获取全局统计数据

    按 status、merge_status、坏数据标签和归并候选状态统计所有记录数量。

    Returns:
        dict: {total, normal, conflict, suspended, bad_data, merge_candidates, merged}
    """
    records = db.list_records()
    total = len(records)
    normal = 0
    conflict = 0
    suspended = 0
    bad_data = 0
    merged = 0
    merge_candidates = 0

    for r in records:
        if r.merge_status == "merged":
            merged += 1
        if r.status == "normal":
            normal += 1
        elif r.status == "conflict":
            conflict += 1
        elif r.status == "suspended":
            suspended += 1
        elif r.status == "bad_data":
            bad_data += 1
        if r.merge_candidate_ids and len(r.merge_candidate_ids) > 0 and r.merge_status != "merged":
            merge_candidates += 1

    return {
        "total": total,
        "normal": normal,
        "conflict": conflict,
        "suspended": suspended,
        "bad_data": bad_data,
        "merge_candidates": merge_candidates,
        "merged": merged,
    }


@router.get("/{record_id}")
def get_record_detail(record_id: str):
    """获取单条记录详情

    包含所有 source_refs、冲突对方简要信息、归并候选简要信息。

    Args:
        record_id: 记录 ID

    Returns:
        dict: 记录详情字典，附加 conflict_partners 和 merge_candidates 列表

    Raises:
        HTTPException: 404 - 记录不存在
    """
    rec = db.get_record(record_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"记录不存在: {record_id}")

    data = _with_unified_note_summary(rec)

    conflict_partners = []
    if rec.conflict_with:
        for pid in rec.conflict_with:
            partner = db.get_record(pid)
            if partner:
                conflict_partners.append({
                    "id": partner.id,
                    "community_name": partner.community_name,
                    "intersection": partner.intersection,
                    "address": partner.address,
                    "scenario_label": partner.scenario_label,
                    "side_note": partner.side_note,
                    "screenshot_note": partner.screenshot_note,
                    "status": partner.status,
                })
    data["conflict_partners"] = conflict_partners

    merge_candidates_list = []
    if rec.merge_candidate_ids:
        for mid in rec.merge_candidate_ids:
            cand = db.get_record(mid)
            if cand:
                merge_candidates_list.append({
                    "id": cand.id,
                    "community_name": cand.community_name,
                    "intersection": cand.intersection,
                    "address": cand.address,
                    "record_no": cand.record_no,
                    "complaint_count": cand.complaint_count,
                    "merge_status": cand.merge_status,
                })
    data["merge_candidates"] = merge_candidates_list

    return data


@router.patch("/{record_id}")
def update_record(record_id: str, body: RecordUpdate):
    """更新记录字段

    仅更新传入的非空字段，自动更新 updated_at 和 version。

    Args:
        record_id: 记录 ID
        body: 待更新的字段字典（所有字段均可选）

    Returns:
        dict: 更新后的记录详情

    Raises:
        HTTPException: 404 - 记录不存在
    """
    rec = db.get_record(record_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"记录不存在: {record_id}")

    update_data = body.model_dump(exclude_unset=True)
    updated = db.update_record(record_id, **update_data)
    db.save_to_disk()
    return _with_unified_note_summary(updated)


@router.delete("/{record_id}")
def delete_record(record_id: str):
    """删除记录

    从内存存储中移除记录，并持久化到磁盘。

    Args:
        record_id: 记录 ID

    Returns:
        dict: {deleted: True, record_id: str}

    Raises:
        HTTPException: 404 - 记录不存在
    """
    rec = db.get_record(record_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"记录不存在: {record_id}")

    with db._lock:
        if record_id in db.records:
            del db.records[record_id]
    db.save_to_disk()
    return {"deleted": True, "record_id": record_id}
