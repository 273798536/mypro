from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.store import db
from app.services.bad_data import scan_conflicts, resolve_conflict

router = APIRouter(prefix="/consistency", tags=["口径一致性"])


class ResolveBody(BaseModel):
    chosen_fields: Dict[str, Any]


@router.post("/scan")
def scan_all_conflicts():
    """全量扫描口径冲突

    遍历所有未合并记录，找出同小区同位置但关键字段不一致的冲突对。
    冲突字段包括：时段、峰谷类型、场景标签、旁注、截图说明。

    Returns:
        List[dict]: 冲突列表，每项包含 {record_a, record_b, conflict_fields}
    """
    conflicts = scan_conflicts()
    db.save_to_disk()

    result = []
    for a, b, fields in conflicts:
        result.append({
            "pair_id": f"{a.id}__{b.id}",
            "conflict_fields": fields,
            "record_a": {
                "id": a.id,
                "community_name": a.community_name,
                "intersection": a.intersection,
                "address": a.address,
                "longitude": a.longitude,
                "latitude": a.latitude,
                "time_period": a.time_period,
                "peak_type": a.peak_type,
                "scenario_label": a.scenario_label,
                "side_note": a.side_note,
                "screenshot_note": a.screenshot_note,
            },
            "record_b": {
                "id": b.id,
                "community_name": b.community_name,
                "intersection": b.intersection,
                "address": b.address,
                "longitude": b.longitude,
                "latitude": b.latitude,
                "time_period": b.time_period,
                "peak_type": b.peak_type,
                "scenario_label": b.scenario_label,
                "side_note": b.side_note,
                "screenshot_note": b.screenshot_note,
            },
        })
    return result


@router.post("/resolve/{a}/{b}")
def resolve_pair_conflict(a: str, b: str, body: ResolveBody):
    """解决两条记录之间的冲突

    根据 chosen_fields 选择或设置字段值。
    chosen_fields 格式：{字段名: 'a'|'b'|具体值}
    - 'a' 表示以 record_a 的该字段值为准，同步到 record_b
    - 'b' 表示以 record_b 的该字段值为准，同步到 record_a
    - 其他值表示直接写入两条记录的该字段

    Args:
        a: 记录 A 的 ID
        b: 记录 B 的 ID
        body: 包含 chosen_fields 的请求体

    Returns:
        dict: {record_a, record_b} 处理后的两条完整记录

    Raises:
        HTTPException: 404 - 记录不存在
        HTTPException: 400 - 解决失败
    """
    rec_a = db.get_record(a)
    rec_b = db.get_record(b)
    if not rec_a or not rec_b:
        raise HTTPException(status_code=404, detail="记录不存在")

    try:
        resolved_a, resolved_b = resolve_conflict(a, b, body.chosen_fields)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    db.save_to_disk()
    return {
        "record_a": resolved_a.model_dump(mode="json"),
        "record_b": resolved_b.model_dump(mode="json"),
    }
