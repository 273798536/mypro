from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Arrival, Station, DataStatus, NextVerifier
from app.schemas import (
    ArrivalCreate, ArrivalOut, ArrivalUpdate, StatusUpdate,
    MagnitudeRemarkUpdate, StatusTransition, TraceResult, StationOut, InversionResultOut
)
from app.validators import validate_phase, validate_status_transition
from app.status_machine import get_allowed_transitions, check_transition
from app.audit_service import update_arrival_with_audit, get_arrival_changes

router = APIRouter()


@router.get("", response_model=List[ArrivalOut])
def list_arrivals(
    event_tag: Optional[str] = None,
    station_id: Optional[int] = None,
    status: Optional[DataStatus] = None,
    phase: Optional[str] = None,
    has_magnitude_update: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=5000),
    db: Session = Depends(get_db)
):
    query = db.query(Arrival)
    if event_tag:
        query = query.filter(Arrival.event_tag == event_tag)
    if station_id:
        query = query.filter(Arrival.station_id == station_id)
    if status:
        query = query.filter(Arrival.status == status)
    if phase:
        query = query.filter(Arrival.phase == phase)
    if has_magnitude_update is not None:
        query = query.filter(Arrival.has_magnitude_update == has_magnitude_update)
    
    arrivals = query.order_by(Arrival.event_tag, Arrival.id).offset(skip).limit(limit).all()
    return arrivals


@router.post("", response_model=ArrivalOut)
def create_arrival(arrival_in: ArrivalCreate, db: Session = Depends(get_db)):
    station = db.query(Station).filter(Station.id == arrival_in.station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail=f"台站 {arrival_in.station_id} 不存在")
    
    valid, msg = validate_phase(arrival_in.phase)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)
    
    if arrival_in.arrival_time is None and arrival_in.status == DataStatus.NORMAL:
        raise HTTPException(status_code=400, detail="正常状态的到时记录必须提供 arrival_time")
    
    if arrival_in.arrival_time is None:
        arrival_in.status = DataStatus.MISSING_ARRIVAL
        arrival_in.next_verifier = NextVerifier.DATA_COLLECTOR
    
    arrival = Arrival(**arrival_in.model_dump())
    db.add(arrival)
    db.commit()
    db.refresh(arrival)
    return arrival


@router.get("/{arrival_id}", response_model=ArrivalOut)
def get_arrival(arrival_id: int, db: Session = Depends(get_db)):
    arrival = db.query(Arrival).filter(Arrival.id == arrival_id).first()
    if not arrival:
        raise HTTPException(status_code=404, detail=f"到时记录 {arrival_id} 不存在")
    return arrival


@router.put("/{arrival_id}", response_model=ArrivalOut)
def update_arrival(arrival_id: int, arrival_in: ArrivalUpdate, db: Session = Depends(get_db)):
    arrival = db.query(Arrival).filter(Arrival.id == arrival_id).first()
    if not arrival:
        raise HTTPException(status_code=404, detail=f"到时记录 {arrival_id} 不存在")
    
    update_data = arrival_in.model_dump(exclude_unset=True)
    
    if "phase" in update_data:
        valid, msg = validate_phase(update_data["phase"])
        if not valid:
            raise HTTPException(status_code=400, detail=msg)
    
    operator = "system"
    change_reason = update_data.pop("change_reason", None)
    
    for field, value in update_data.items():
        update_arrival_with_audit(db, arrival, field, value, operator, change_reason)
    
    db.commit()
    db.refresh(arrival)
    return arrival


@router.patch("/{arrival_id}/status", response_model=ArrivalOut)
def update_arrival_status(arrival_id: int, status_in: StatusUpdate, db: Session = Depends(get_db)):
    arrival = db.query(Arrival).filter(Arrival.id == arrival_id).first()
    if not arrival:
        raise HTTPException(status_code=404, detail=f"到时记录 {arrival_id} 不存在")
    
    valid, msg, required_verifier = validate_status_transition(arrival.status, status_in.status)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)
    
    update_arrival_with_audit(
        db, arrival, "status", status_in.status.value,
        status_in.operator, status_in.remark
    )
    
    if status_in.next_verifier:
        arrival.next_verifier = status_in.next_verifier
    elif required_verifier:
        arrival.next_verifier = required_verifier
    
    if status_in.remark:
        arrival.remark = status_in.remark
    
    db.commit()
    db.refresh(arrival)
    return arrival


@router.patch("/{arrival_id}/magnitude", response_model=ArrivalOut)
def update_magnitude_remark(arrival_id: int, mag_in: MagnitudeRemarkUpdate, db: Session = Depends(get_db)):
    arrival = db.query(Arrival).filter(Arrival.id == arrival_id).first()
    if not arrival:
        raise HTTPException(status_code=404, detail=f"到时记录 {arrival_id} 不存在")
    
    update_arrival_with_audit(
        db, arrival, "magnitude_remark", mag_in.magnitude_remark,
        mag_in.operator, mag_in.change_reason
    )
    
    db.commit()
    db.refresh(arrival)
    return arrival


@router.get("/{arrival_id}/transitions", response_model=List[StatusTransition])
def get_available_transitions(arrival_id: int, db: Session = Depends(get_db)):
    arrival = db.query(Arrival).filter(Arrival.id == arrival_id).first()
    if not arrival:
        raise HTTPException(status_code=404, detail=f"到时记录 {arrival_id} 不存在")
    
    current = arrival.status
    result = [check_transition(current, DataStatus(s["to_status"].value)) for s in get_allowed_transitions(current)]
    
    for r in result:
        if r["required_verifier"]:
            r["required_verifier"] = NextVerifier(r["required_verifier"].value)
    
    return [StatusTransition(**r) for r in result]


@router.get("/{arrival_id}/audit")
def get_arrival_audit_log(arrival_id: int, db: Session = Depends(get_db)):
    arrival = db.query(Arrival).filter(Arrival.id == arrival_id).first()
    if not arrival:
        raise HTTPException(status_code=404, detail=f"到时记录 {arrival_id} 不存在")
    
    logs = get_arrival_changes(db, arrival_id)
    from app.schemas import AuditLogOut
    return [AuditLogOut.model_validate(log) for log in logs]


@router.get("/{arrival_id}/trace", response_model=TraceResult)
def trace_arrival_to_results(arrival_id: int, db: Session = Depends(get_db)):
    from app.models import InversionStation, InversionResult
    
    arrival = db.query(Arrival).filter(Arrival.id == arrival_id).first()
    if not arrival:
        raise HTTPException(status_code=404, detail=f"到时记录 {arrival_id} 不存在")
    
    station = db.query(Station).filter(Station.id == arrival.station_id).first()
    
    inversion_ids = db.query(InversionStation.inversion_id).filter(
        InversionStation.arrival_id == arrival_id
    ).distinct().all()
    inversion_ids = [inv_id for (inv_id,) in inversion_ids]
    
    inversions = []
    if inversion_ids:
        inversions = db.query(InversionResult).filter(
            InversionResult.id.in_(inversion_ids)
        ).order_by(InversionResult.created_at.desc()).all()
    
    from app.routers.inversion import _populate_station_info_list
    
    return TraceResult(
        station=StationOut.model_validate(station) if station else None,
        arrivals=[ArrivalOut.model_validate(arrival)],
        inversions=_populate_station_info_list(inversions, db),
        message=f"到时记录追溯: 台站 {station.station_code if station else '未知'} → {len(inversions)} 次反演结果"
    )


@router.delete("/{arrival_id}")
def delete_arrival(arrival_id: int, db: Session = Depends(get_db)):
    arrival = db.query(Arrival).filter(Arrival.id == arrival_id).first()
    if not arrival:
        raise HTTPException(status_code=404, detail=f"到时记录 {arrival_id} 不存在")
    
    if arrival.inversion_stations:
        raise HTTPException(status_code=400, detail=f"到时记录有关联反演结果，无法删除")
    
    db.delete(arrival)
    db.commit()
    return {"message": f"到时记录 {arrival_id} 已删除"}
