from typing import List
from fastapi import APIRouter, HTTPException
from models import VersionLogResponse, SourceTraceResponse
from database import get_connection

router = APIRouter(prefix="/versions", tags=["版本追踪"])


@router.get("/{record_id}/logs", response_model=List[VersionLogResponse], summary="查询记录的版本变更日志")
def get_version_logs(record_id: int):
    conn = get_connection()
    row = conn.execute("SELECT id FROM records WHERE id = ?", (record_id,)).fetchone()
    if row is None:
        conn.close()
        raise HTTPException(status_code=404, detail="记录不存在")
    rows = conn.execute(
        "SELECT * FROM version_logs WHERE record_id = ? ORDER BY changed_at",
        (record_id,),
    ).fetchall()
    conn.close()
    return [
        VersionLogResponse(
            id=r["id"],
            record_id=r["record_id"],
            field_name=r["field_name"],
            old_value=r["old_value"],
            new_value=r["new_value"],
            prompt_version=r["prompt_version"],
            changed_at=r["changed_at"],
            changed_by=r["changed_by"],
        )
        for r in rows
    ]


@router.get("/{record_id}/traces", response_model=List[SourceTraceResponse], summary="查询记录的来源追踪链")
def get_source_traces(record_id: int):
    conn = get_connection()
    row = conn.execute("SELECT id FROM records WHERE id = ?", (record_id,)).fetchone()
    if row is None:
        conn.close()
        raise HTTPException(status_code=404, detail="记录不存在")
    rows = conn.execute(
        "SELECT * FROM source_traces WHERE record_id = ? ORDER BY created_at",
        (record_id,),
    ).fetchall()
    conn.close()
    return [
        SourceTraceResponse(
            id=r["id"],
            record_id=r["record_id"],
            source_type=r["source_type"],
            source_ref=r["source_ref"],
            prompt_version=r["prompt_version"],
            snapshot=r["snapshot"],
            created_at=r["created_at"],
        )
        for r in rows
    ]
