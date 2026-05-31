from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime
from app import database as db
from app.models import TemperatureCreate, TemperatureOut
from app.calculator import TEMP_SPIKE_THRESHOLD_C, TEMP_SPIKE_WINDOW_HOURS

router = APIRouter(prefix="/api/temperature", tags=["temperature"])


def _row_to_out(row) -> dict:
    return {
        "id": row["id"],
        "recorded_at": row["recorded_at"],
        "temperature_c": row["temperature_c"],
        "source": row["source"],
        "created_at": row["created_at"],
    }


@router.post("", response_model=TemperatureOut, status_code=201)
def create_temperature(data: TemperatureCreate):
    from app.routers.assessment import recalculate_all_zones
    recorded_at = data.recorded_at.isoformat() if data.recorded_at else datetime.utcnow().isoformat()
    with db.get_db() as conn:
        tid = db.insert_temperature(conn, recorded_at, data.temperature_c, data.source)
        if data.temperature_c is not None:
            recalculate_all_zones(conn)
        row = conn.execute("SELECT * FROM temperature_records WHERE id = ?", (tid,)).fetchone()
        return _row_to_out(row)


@router.get("", response_model=list[TemperatureOut])
def list_temperature(hours: Optional[int] = None):
    with db.get_db() as conn:
        rows = db.get_temperatures(conn, hours)
        return [_row_to_out(r) for r in rows]


@router.get("/spike-check")
def check_temperature_spike():
    with db.get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM temperature_records WHERE temperature_c IS NOT NULL ORDER BY recorded_at DESC LIMIT 50"
        ).fetchall()
        if len(rows) < 2:
            return {"spike_detected": False, "magnitude_c": 0.0, "message": "insufficient temperature data"}
        latest = rows[0]["temperature_c"]
        oldest = rows[-1]["temperature_c"]
        magnitude = max(0.0, latest - oldest)
        detected = magnitude >= TEMP_SPIKE_THRESHOLD_C
        return {
            "spike_detected": detected,
            "magnitude_c": round(magnitude, 2),
            "latest_c": latest,
            "oldest_c": oldest,
            "window_hours": TEMP_SPIKE_WINDOW_HOURS,
            "message": f"temperature rose {magnitude:.1f}C in window" if detected else "no significant spike detected",
        }


def get_temp_spike_magnitude(conn) -> float:
    rows = conn.execute(
        "SELECT temperature_c FROM temperature_records WHERE temperature_c IS NOT NULL ORDER BY recorded_at DESC LIMIT 50"
    ).fetchall()
    if len(rows) < 2:
        return 0.0
    temps = [r["temperature_c"] for r in rows]
    return max(0.0, temps[0] - temps[-1])
