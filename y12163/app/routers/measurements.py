from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime
from app import database as db
from app.models import MeasurementCreate, MeasurementUpdate, MeasurementOut

router = APIRouter(prefix="/api/measurements", tags=["measurements"])


def _row_to_out(row) -> dict:
    return {
        "id": row["id"],
        "zone_name": row["zone_name"],
        "x": row["x"],
        "y": row["y"],
        "ice_thickness_cm": row["ice_thickness_cm"],
        "measured_at": row["measured_at"],
        "notes": row["notes"],
        "created_at": row["created_at"],
    }


@router.post("", response_model=MeasurementOut, status_code=201)
def create_measurement(data: MeasurementCreate):
    from app.routers.assessment import recalculate_zone
    measured_at = data.measured_at.isoformat() if data.measured_at else datetime.utcnow().isoformat()
    with db.get_db() as conn:
        mid = db.insert_measurement(
            conn, data.zone_name, data.x, data.y,
            data.ice_thickness_cm, measured_at, data.notes
        )
        row = db.get_measurement_by_id(conn, mid)
        recalculate_zone(conn, data.zone_name)
        return _row_to_out(row)


@router.get("", response_model=list[MeasurementOut])
def list_measurements(zone_name: Optional[str] = None):
    with db.get_db() as conn:
        rows = db.get_measurements(conn, zone_name)
        return [_row_to_out(r) for r in rows]


@router.get("/{measurement_id}", response_model=MeasurementOut)
def get_measurement(measurement_id: int):
    with db.get_db() as conn:
        row = db.get_measurement_by_id(conn, measurement_id)
        if not row:
            raise HTTPException(404, "measurement not found")
        return _row_to_out(row)


@router.patch("/{measurement_id}", response_model=MeasurementOut)
def patch_measurement(measurement_id: int, data: MeasurementUpdate):
    from app.routers.assessment import recalculate_zone
    with db.get_db() as conn:
        existing = db.get_measurement_by_id(conn, measurement_id)
        if not existing:
            raise HTTPException(404, "measurement not found")
        zone_name = existing["zone_name"]
        measured_at = data.measured_at.isoformat() if data.measured_at else None
        db.update_measurement(
            conn, measurement_id, data.x, data.y,
            data.ice_thickness_cm, measured_at, data.notes
        )
        recalculate_zone(conn, zone_name)
        row = db.get_measurement_by_id(conn, measurement_id)
        return _row_to_out(row)


@router.delete("/{measurement_id}", status_code=204)
def delete_measurement(measurement_id: int):
    from app.routers.assessment import recalculate_zone
    with db.get_db() as conn:
        existing = db.get_measurement_by_id(conn, measurement_id)
        if not existing:
            raise HTTPException(404, "measurement not found")
        zone_name = existing["zone_name"]
        db.delete_measurement(conn, measurement_id)
        recalculate_zone(conn, zone_name)
