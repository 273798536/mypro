from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from models import (
    RecordCreate,
    RecordUpdate,
    RecordResponse,
    StatusTransition,
    DedupResult,
)
from services import record_service, dedup_service

router = APIRouter(prefix="/records", tags=["评测记录"])


@router.post("/reset-seed", summary="【按钮触发】清空数据库并重新写入3条样例数据，恢复 ready=1/needs_review=1/rejected=1")
def reset_seed():
    import traceback
    try:
        from seed import seed
        seed()
        return {"ok": True, "message": "已清空并重新写入样例数据，预期分类 ready=1 / needs_review=1 / rejected=1"}
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "message": f"重置样例失败: {str(e)}",
            "traceback": traceback.format_exc(limit=5),
        })


@router.post("", response_model=RecordResponse, summary="导入评测记录")
def create_record(data: RecordCreate):
    if not data.content.strip():
        raise HTTPException(status_code=422, detail="评测内容不能为空")
    dup = dedup_service.check_and_mark_duplicates(data.content)
    if dup.is_duplicate:
        raise HTTPException(
            status_code=409,
            detail=f"内容与已有记录 id={dup.existing_record_id} 重复，已跳过去重检查",
        )
    return record_service.create_record(data)


@router.get("", response_model=List[RecordResponse], summary="查询评测记录列表")
def list_records(status: Optional[str] = Query(None, description="按状态筛选")):
    if status and status not in ("imported", "pending_review", "confirmed", "rejected"):
        raise HTTPException(status_code=400, detail=f"无效状态: {status}")
    return record_service.list_records(status)


@router.get("/dedup", summary="查看所有重复内容")
def find_duplicates():
    return dedup_service.find_all_duplicates()


@router.get("/{record_id}", response_model=RecordResponse, summary="查询单条记录")
def get_record(record_id: int):
    rec = record_service.get_record(record_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="记录不存在")
    return rec


@router.patch("/{record_id}", response_model=RecordResponse, summary="更新记录字段")
def update_record(record_id: int, data: RecordUpdate):
    rec = record_service.update_record(record_id, data)
    if rec is None:
        raise HTTPException(status_code=404, detail="记录不存在")
    return rec


@router.post("/{record_id}/status", response_model=RecordResponse, summary="状态推进")
def transition_status(record_id: int, body: StatusTransition):
    if body.status not in ("pending_review", "confirmed", "rejected"):
        raise HTTPException(status_code=400, detail=f"无效目标状态: {body.status}")
    try:
        rec = record_service.transition_status(
            record_id, body.status, body.changed_by, body.reason
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    if rec is None:
        raise HTTPException(status_code=404, detail="记录不存在")
    return rec
