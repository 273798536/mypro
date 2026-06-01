from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Experiment, AuditLog
from app.schemas import ExperimentOut, ReportOut, AuditLogOut, TemperatureCorrectRequest
from app.audit import log_change
from app.physics import speed_of_sound, wavelength, detect_harmonic, temperature_correction_delta

router = APIRouter(prefix="/api", tags=["reports & corrections"])


@router.post("/experiments/{experiment_id}/correct-temperature", response_model=ExperimentOut)
def apply_temperature_correction(
    experiment_id: int,
    data: TemperatureCorrectRequest,
    db: Session = Depends(get_db),
):
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    old_temp = exp.temperature_c
    old_corrected = exp.temperature_corrected
    old_correction_applied = exp.temperature_correction_applied

    delta = temperature_correction_delta(old_temp or 20.0, data.temperature_c)
    new_correction_applied = delta

    log_change(db, exp.id, "experiment", exp.id,
               "temperature_c", old_temp, data.temperature_c, reason=data.reason)
    log_change(db, exp.id, "experiment", exp.id,
               "temperature_corrected", old_corrected, True, reason=data.reason)
    log_change(db, exp.id, "experiment", exp.id,
               "temperature_correction_applied", old_correction_applied, new_correction_applied,
               reason=data.reason)

    exp.temperature_c = data.temperature_c
    exp.temperature_corrected = True
    exp.temperature_correction_applied = new_correction_applied

    db.commit()
    db.refresh(exp)
    return exp


@router.get("/experiments/{experiment_id}/report", response_model=ReportOut)
def export_report(experiment_id: int, db: Session = Depends(get_db)):
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    temp = exp.temperature_c or 20.0
    v = speed_of_sound(temp)
    wl = wavelength(exp.frequency_hz, temp)
    harmonic = detect_harmonic(exp.frequency_hz, exp.pipe_length_m, temp)

    corrected_v = None
    temp_correction_impact = None
    if exp.temperature_corrected and exp.temperature_correction_applied != 0:
        base_temp = 20.0
        corrected_v = speed_of_sound(temp)
        base_v = speed_of_sound(base_temp)
        temp_correction_impact = {
            "base_temperature_c": base_temp,
            "corrected_temperature_c": temp,
            "base_speed_of_sound_m_s": round(base_v, 4),
            "corrected_speed_of_sound_m_s": round(corrected_v, 4),
            "correction_delta_m_s": round(exp.temperature_correction_applied, 4),
            "wavelength_before_m": round(base_v / exp.frequency_hz, 6),
            "wavelength_after_m": round(corrected_v / exp.frequency_hz, 6),
        }

    node_corrections = []
    for node in exp.nodes:
        if node.manual_override:
            impact = {
                "node_id": node.id,
                "original_position_m": node.original_position_m,
                "current_position_m": node.position_m,
                "position_delta_m": round(node.position_m - (node.original_position_m or node.position_m), 6),
                "original_is_antinode": node.original_is_antinode,
                "current_is_antinode": node.is_antinode,
                "type_changed": node.original_is_antinode != node.is_antinode
                if node.original_is_antinode is not None else False,
                "override_reason": node.override_reason,
            }
            node_corrections.append(impact)

    exp_out = ExperimentOut.model_validate(exp)
    report = ReportOut(
        experiment=exp_out,
        speed_of_sound=round(v, 4),
        corrected_speed_of_sound=round(corrected_v, 4) if corrected_v else None,
        node_corrections=node_corrections,
        temperature_correction_impact=temp_correction_impact,
    )
    return report


@router.get("/audit", response_model=List[AuditLogOut])
def query_audit_log(
    experiment_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = db.query(AuditLog)
    if experiment_id is not None:
        q = q.filter(AuditLog.experiment_id == experiment_id)
    if entity_type is not None:
        q = q.filter(AuditLog.entity_type == entity_type)
    q = q.order_by(AuditLog.created_at.desc())
    return q.offset(skip).limit(limit).all()
