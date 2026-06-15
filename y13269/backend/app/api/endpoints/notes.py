from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid
from datetime import datetime

from app.models.store import db
from app.schemas.charge import UnifiedNote

router = APIRouter(prefix="/notes", tags=["统一口径"])


class CreateUnifiedNoteBody(BaseModel):
    scenario_label: str
    side_note: str
    screenshot_note: str
    record_ids: List[str]


@router.post("/unified")
def create_unified_note(body: CreateUnifiedNoteBody):
    """创建统一口径并关联记录

    根据提供的场景标签、旁注、截图说明创建一个 UnifiedNote，
    然后将 record_ids 中所有记录的 unified_note_id 设置为该新 note 的 id。
    若某记录已关联其他统一口径，将被新的覆盖。

    Args:
        body: {scenario_label, side_note, screenshot_note, record_ids}

    Returns:
        dict: 创建的 UnifiedNote 完整对象，含 referenced_record_count 统计

    Raises:
        HTTPException: 400 - record_ids 为空或所有 ID 均不存在
        HTTPException: 404 - 部分指定记录不存在时给出警告级别的提示信息
    """
    if not body.record_ids:
        raise HTTPException(status_code=400, detail="record_ids 不能为空")

    existing_records = []
    missing_ids = []
    for rid in body.record_ids:
        rec = db.get_record(rid)
        if rec:
            existing_records.append(rec)
        else:
            missing_ids.append(rid)

    if not existing_records:
        raise HTTPException(status_code=404, detail="所有指定的 record_ids 均不存在")

    note = UnifiedNote(
        id=str(uuid.uuid4()),
        scenario_label=body.scenario_label,
        side_note=body.side_note,
        screenshot_note=body.screenshot_note,
        referenced_record_ids=[r.id for r in existing_records],
        created_at=datetime.now(),
    )
    db.add_unified_note(note)

    for rec in existing_records:
        rec.unified_note_id = note.id
        if not rec.scenario_label and note.scenario_label:
            rec.scenario_label = note.scenario_label
        if not rec.side_note and note.side_note:
            rec.side_note = note.side_note
        if not rec.screenshot_note and note.screenshot_note:
            rec.screenshot_note = note.screenshot_note
        rec.updated_at = datetime.now()
        rec.version += 1

    db.save_to_disk()

    result = note.model_dump(mode="json")
    result["referenced_record_count"] = len(existing_records)
    if missing_ids:
        result["warning"] = f"以下记录ID不存在，已忽略: {', '.join(missing_ids)}"
    return result


@router.get("/unified")
def list_unified_notes():
    """获取所有统一口径列表

    返回所有 UnifiedNote，并附带关联记录的简要信息列表，
    便于前端展示"一个口径对应多少条记录"。

    Returns:
        List[dict]: 统一口径列表，每项包含 note 字段和 referenced_records 摘要
    """
    notes = db.list_unified_notes()
    result = []

    for note in notes:
        records_summary = []
        for rid in note.referenced_record_ids:
            rec = db.get_record(rid)
            if rec:
                records_summary.append({
                    "id": rec.id,
                    "community_name": rec.community_name,
                    "intersection": rec.intersection,
                    "address": rec.address,
                    "status": rec.status,
                })

        note_data = note.model_dump(mode="json")
        note_data["referenced_records"] = records_summary
        note_data["referenced_record_count"] = len(records_summary)
        result.append(note_data)

    return result
