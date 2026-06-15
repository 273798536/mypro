from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.store import db
from app.services.merge_service import (
    detect_merge_candidates,
    propose_merge,
    execute_merge,
)

router = APIRouter(prefix="/merge", tags=["记录归并"])


class ExecuteBody(BaseModel):
    chosen_fields: Optional[Dict[str, Any]] = None


@router.post("/scan")
def scan_merge_candidates():
    """全量扫描归并候选

    遍历所有未合并记录，按 同小区 + (同路口 or 坐标距离<阈值) 分组。
    每组至少包含 2 条记录，更新每条记录的 merge_candidate_ids 字段。

    Returns:
        List[dict]: 归并候选组列表，每组含 {group_id, records, size}
    """
    groups = detect_merge_candidates()
    db.save_to_disk()

    result = []
    for idx, group in enumerate(groups):
        result.append({
            "group_id": f"merge_group_{idx}",
            "size": len(group),
            "records": [
                {
                    "id": r.id,
                    "record_no": r.record_no,
                    "community_name": r.community_name,
                    "intersection": r.intersection,
                    "address": r.address,
                    "longitude": r.longitude,
                    "latitude": r.latitude,
                    "complaint_count": r.complaint_count,
                    "source_count": len(r.source_refs),
                    "status": r.status,
                    "merge_status": r.merge_status,
                }
                for r in group
            ],
        })
    return result


@router.post("/propose/{keep_id}/{remove_id}")
def propose_merge_pair(keep_id: str, remove_id: str):
    """生成两条记录的归并建议

    对比两条记录的各字段，返回推荐保留的数据（优先取非空字段），
    同时标注出存在冲突需要人工选择的字段列表。

    Args:
        keep_id: 拟保留的记录 ID
        remove_id: 拟被合并的记录 ID

    Returns:
        dict: {keep_record, remove_record, proposed_data, conflict_fields}

    Raises:
        HTTPException: 404 - 任一记录不存在
    """
    k = db.get_record(keep_id)
    r = db.get_record(remove_id)
    if not k or not r:
        raise HTTPException(status_code=404, detail="记录不存在")

    try:
        proposal = propose_merge(keep_id, remove_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return {
        "keep_record": proposal["keep_record"].model_dump(mode="json"),
        "remove_record": proposal["remove_record"].model_dump(mode="json"),
        "proposed_data": proposal["proposed_data"],
        "conflict_fields": proposal["conflict_fields"],
    }


@router.post("/execute/{keep_id}/{remove_id}")
def execute_merge_pair(keep_id: str, remove_id: str, body: ExecuteBody):
    """执行归并

    将 remove_id 记录合并入 keep_id：
    - source_refs 追加合并
    - complaint_count 累加
    - chosen_fields 中指定的字段值覆盖写入保留记录
    - remove_id 记录标记 merge_status=merged，并记录 merged_into_id

    Args:
        keep_id: 保留的记录 ID
        remove_id: 被合并的记录 ID
        body: 可选 {chosen_fields: {字段: 值}} 用于覆盖冲突字段

    Returns:
        dict: {kept: 保留记录, removed: 被合并记录摘要}

    Raises:
        HTTPException: 404 - 任一记录不存在
        HTTPException: 400 - 归并执行失败
    """
    k = db.get_record(keep_id)
    r = db.get_record(remove_id)
    if not k or not r:
        raise HTTPException(status_code=404, detail="记录不存在")

    if k.merge_status == "merged":
        raise HTTPException(status_code=400, detail="keep_id 记录已被合并，不能作为保留目标")
    if r.merge_status == "merged":
        raise HTTPException(status_code=400, detail="remove_id 记录已被合并")

    try:
        kept = execute_merge(keep_id, remove_id, body.chosen_fields)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    db.save_to_disk()

    removed_summary = {
        "id": remove_id,
        "merged_into_id": keep_id,
        "merge_status": "merged",
    }
    return {
        "kept": kept.model_dump(mode="json"),
        "removed": removed_summary,
    }
