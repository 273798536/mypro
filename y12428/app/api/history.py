from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Query
from app.store.memory import store
from app.models.history import HistoryEntry


router = APIRouter(prefix="/history", tags=["历史追溯"])


@router.get("/", summary="查询变更历史")
def query_history(
    entity_type: Optional[str] = Query(None, description="实体类型: enrollment | agreement | split | dropout"),
    entity_id: Optional[str] = Query(None, description="实体ID"),
    action: Optional[str] = Query(None, description="操作类型: create | update | status_change | split_trigger | dropout_audit"),
):
    results = store.query_history(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
    )
    return [r.model_dump(mode="json") for r in results]


@router.get("/entity/{entity_id}", summary="按实体ID查询完整历史链")
def query_entity_history(entity_id: str):
    results = store.query_history(entity_id=entity_id)
    if not results:
        return {"entity_id": entity_id, "history": [], "hint": "该实体暂无历史记录"}
    return {
        "entity_id": entity_id,
        "history": [r.model_dump(mode="json") for r in results],
    }
