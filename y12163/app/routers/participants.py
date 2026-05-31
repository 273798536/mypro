from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime
from app import database as db
from app.models import ParticipantCreate, ParticipantOut

router = APIRouter(prefix="/api/participants", tags=["participants"])


def _row_to_out(row) -> dict:
    return {
        "id": row["id"],
        "zone_name": row["zone_name"],
        "planned_count": row["planned_count"],
        "planned_at": row["planned_at"],
        "created_at": row["created_at"],
    }


@router.post("", response_model=ParticipantOut, status_code=201)
def create_participant(data: ParticipantCreate):
    from app.routers.assessment import recalculate_zone
    planned_at = data.planned_at.isoformat() if data.planned_at else None
    with db.get_db() as conn:
        pid = db.insert_participant(conn, data.zone_name, data.planned_count, planned_at)
        recalculate_zone(conn, data.zone_name)
        row = conn.execute("SELECT * FROM participants WHERE id = ?", (pid,)).fetchone()
        return _row_to_out(row)


@router.get("", response_model=list[ParticipantOut])
def list_participants(zone_name: Optional[str] = None):
    with db.get_db() as conn:
        rows = db.get_participants(conn, zone_name)
        return [_row_to_out(r) for r in rows]


@router.get("/{zone_name}", response_model=list[ParticipantOut])
def get_participant_by_zone(zone_name: str):
    with db.get_db() as conn:
        rows = db.get_participants(conn, zone_name)
        if not rows:
            raise HTTPException(404, f"no participant plans found for zone '{zone_name}'")
        return [_row_to_out(r) for r in rows]
