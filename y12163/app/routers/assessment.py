import json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from typing import Optional
from app import database as db
from app.calculator import assess_zone
from app.models import AssessmentOut, AssessmentSummary, WarningDetail, RiskLevel
from app.routers.temperature import get_temp_spike_magnitude

router = APIRouter(prefix="/api/assessment", tags=["assessment"])


def _serialize_warning(w: Optional[WarningDetail]) -> Optional[str]:
    if w is None:
        return None
    return json.dumps({"code": w.code, "message": w.message, "suggestion": w.suggestion}, ensure_ascii=False)


def _deserialize_warning(s: Optional[str]) -> Optional[WarningDetail]:
    if not s:
        return None
    d = json.loads(s)
    return WarningDetail(code=d["code"], message=d["message"], suggestion=d["suggestion"])


def _row_to_out(row) -> dict:
    return {
        "id": row["id"],
        "zone_name": row["zone_name"],
        "assessed_at": row["assessed_at"],
        "risk_level": row["risk_level"],
        "avg_thickness_cm": row["avg_thickness_cm"],
        "min_thickness_cm": row["min_thickness_cm"],
        "max_safe_load_kg": row["max_safe_load_kg"],
        "current_load_kg": row["current_load_kg"],
        "safety_margin": row["safety_margin"],
        "measurement_count": row["measurement_count"],
        "sparse_point_warning": _deserialize_warning(row["sparse_point_warning"]),
        "temperature_warning": _deserialize_warning(row["temperature_warning"]),
        "overcapacity_warning": _deserialize_warning(row["overcapacity_warning"]),
        "recommendations": json.loads(row["recommendations"]) if row["recommendations"] else [],
    }


def recalculate_zone(conn, zone_name: str):
    spike = get_temp_spike_magnitude(conn)
    measurements = [dict(m) for m in db.get_zone_measurements(conn, zone_name)]
    participant = db.get_latest_participant(conn, zone_name)
    planned_count = participant["planned_count"] if participant else 0
    result = assess_zone(zone_name, measurements, spike, planned_count)
    now = datetime.utcnow().isoformat()
    db.insert_assessment(
        conn, result["zone_name"], now, result["risk_level"].value,
        result["avg_thickness_cm"], result["min_thickness_cm"],
        result["max_safe_load_kg"], result["current_load_kg"],
        result["safety_margin"], result["measurement_count"],
        _serialize_warning(result["sparse_point_warning"]),
        _serialize_warning(result["temperature_warning"]),
        _serialize_warning(result["overcapacity_warning"]),
        json.dumps(result["recommendations"], ensure_ascii=False)
    )


def recalculate_all_zones(conn):
    zones = conn.execute("SELECT DISTINCT zone_name FROM measurements").fetchall()
    for z in zones:
        recalculate_zone(conn, z["zone_name"])
    zone_only_participants = conn.execute(
        "SELECT DISTINCT zone_name FROM participants WHERE zone_name NOT IN (SELECT DISTINCT zone_name FROM measurements)"
    ).fetchall()
    for z in zone_only_participants:
        recalculate_zone(conn, z["zone_name"])


@router.post("/run", response_model=list[AssessmentOut])
def run_assessment():
    with db.get_db() as conn:
        recalculate_all_zones(conn)
        rows = db.get_all_latest_assessments(conn)
        return [_row_to_out(r) for r in rows]


@router.get("", response_model=list[AssessmentSummary])
def list_assessments():
    with db.get_db() as conn:
        rows = db.get_all_latest_assessments(conn)
        return [
            {
                "zone_name": r["zone_name"],
                "risk_level": r["risk_level"],
                "assessed_at": r["assessed_at"],
                "measurement_count": r["measurement_count"],
                "has_warnings": bool(r["sparse_point_warning"] or r["temperature_warning"] or r["overcapacity_warning"]),
            }
            for r in rows
        ]


@router.get("/{zone_name}", response_model=AssessmentOut)
def get_assessment(zone_name: str):
    with db.get_db() as conn:
        row = db.get_latest_assessment(conn, zone_name)
        if not row:
            raise HTTPException(404, f"no assessment found for zone '{zone_name}'")
        return _row_to_out(row)


@router.get("/{zone_name}/history", response_model=list[AssessmentOut])
def get_assessment_history(zone_name: str, limit: int = 20):
    with db.get_db() as conn:
        rows = db.get_assessment_history(conn, zone_name, limit)
        return [_row_to_out(r) for r in rows]
