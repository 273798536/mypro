from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Station, Arrival, VelocityModel, InversionResult, InversionStation,
    DataStatus
)
from app.schemas import (
    InversionCreate, InversionResultOut, InversionDetail,
    TraceResult, ArrivalOut, StationOut
)
from app.inversion import (
    perform_geiger_inversion, prepare_inversion_data,
    format_origin_time, Hypocenter
)
from app.validators import validate_inversion_input

router = APIRouter()


def _populate_station_info(inv_result, db):
    from app.schemas import InversionStationOut
    result = InversionResultOut.model_validate(inv_result)
    station_results = []
    for inv_station in inv_result.stations_used:
        station = db.query(Station).filter(Station.id == inv_station.station_id).first()
        sr = InversionStationOut(
            id=inv_station.id,
            station_id=inv_station.station_id,
            station_code=station.station_code if station else "未知",
            station_name=station.name if station else None,
            arrival_id=inv_station.arrival_id,
            phase=inv_station.phase,
            observed_time=inv_station.observed_time,
            calculated_time=inv_station.calculated_time,
            residual=inv_station.residual,
            weight=inv_station.weight,
            is_rejected=inv_station.is_rejected,
            reject_reason=inv_station.reject_reason
        )
        station_results.append(sr)
    result.stations_used = station_results
    return result


def _populate_station_info_list(inversions, db):
    return [_populate_station_info(inv, db) for inv in inversions]


@router.get("", response_model=List[InversionResultOut])
def list_inversions(
    event_tag: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(InversionResult)
    if event_tag:
        query = query.filter(InversionResult.event_tag == event_tag)
    
    inversions = query.order_by(InversionResult.created_at.desc()).offset(skip).limit(limit).all()
    return _populate_station_info_list(inversions, db)


@router.post("", response_model=InversionResultOut)
def run_inversion(inv_in: InversionCreate, db: Session = Depends(get_db)):
    existing = db.query(InversionResult).filter(
        InversionResult.event_tag == inv_in.event_tag
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"事件 {inv_in.event_tag} 已有反演结果，请先删除或使用其他事件标签"
        )
    
    arrivals = db.query(Arrival).filter(
        Arrival.event_tag == inv_in.event_tag
    ).all()
    if not arrivals:
        raise HTTPException(status_code=404, detail=f"事件 {inv_in.event_tag} 没有到时记录")
    
    station_ids = [a.station_id for a in arrivals]
    stations = db.query(Station).filter(Station.id.in_(station_ids)).all()
    
    valid, errors = validate_inversion_input(arrivals, stations)
    if not valid:
        raise HTTPException(status_code=400, detail=errors)
    
    velocity_model = None
    if inv_in.velocity_model_id:
        velocity_model = db.query(VelocityModel).filter(
            VelocityModel.id == inv_in.velocity_model_id
        ).first()
        if not velocity_model:
            raise HTTPException(status_code=404, detail=f"波速模型 {inv_in.velocity_model_id} 不存在")
        if velocity_model.status == DataStatus.WRONG_VELOCITY:
            raise HTTPException(status_code=400, detail="波速模型状态为'波速版本错'，请先修正")
    else:
        velocity_model = db.query(VelocityModel).filter(VelocityModel.is_active == True).first()
        if not velocity_model:
            raise HTTPException(status_code=400, detail="没有激活的波速模型，请先激活一个波速模型")
    
    station_infos, arrival_infos = prepare_inversion_data(stations, arrivals, velocity_model)
    
    try:
        result = perform_geiger_inversion(
            station_infos,
            arrival_infos,
            velocity_model,
            max_iterations=inv_in.max_iterations or 20,
            residual_threshold=inv_in.residual_threshold or 2.0
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"反演失败: {str(e)}")
    
    inv_result = InversionResult(
        event_tag=inv_in.event_tag,
        latitude=result.hypocenter.lat,
        longitude=result.hypocenter.lon,
        depth=result.hypocenter.depth,
        origin_time=result.hypocenter.origin_time,
        origin_time_str=format_origin_time(result.hypocenter.origin_time),
        residual_mean=result.residual_mean,
        residual_std=result.residual_std,
        num_stations_used=result.num_stations_used,
        num_stations_rejected=result.num_stations_rejected,
        iterations=result.iterations,
        convergence=result.convergence,
        velocity_model_id=velocity_model.id,
        status=DataStatus.CONFIRMED if result.convergence else DataStatus.PENDING_CONFIRM,
        remark=f"使用波速模型: {velocity_model.model_name} v{velocity_model.version}"
    )
    
    for sr in result.station_results:
        inv_station = InversionStation(
            station_id=sr.station_id,
            arrival_id=sr.arrival_id,
            phase=sr.phase,
            observed_time=sr.observed_time,
            calculated_time=sr.calculated_time,
            residual=sr.residual,
            weight=sr.weight,
            is_rejected=sr.is_rejected,
            reject_reason=sr.reject_reason
        )
        inv_result.stations_used.append(inv_station)
    
    db.add(inv_result)
    db.commit()
    db.refresh(inv_result)
    
    return _populate_station_info(inv_result, db)


@router.get("/{inversion_id}", response_model=InversionDetail)
def get_inversion(inversion_id: int, db: Session = Depends(get_db)):
    inv = db.query(InversionResult).filter(InversionResult.id == inversion_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail=f"反演结果 {inversion_id} 不存在")
    
    result = InversionDetail.model_validate(inv)
    
    from app.schemas import InversionStationOut
    station_results = []
    for inv_station in inv.stations_used:
        station = db.query(Station).filter(Station.id == inv_station.station_id).first()
        sr = InversionStationOut(
            id=inv_station.id,
            station_id=inv_station.station_id,
            station_code=station.station_code if station else "未知",
            station_name=station.name if station else None,
            arrival_id=inv_station.arrival_id,
            phase=inv_station.phase,
            observed_time=inv_station.observed_time,
            calculated_time=inv_station.calculated_time,
            residual=inv_station.residual,
            weight=inv_station.weight,
            is_rejected=inv_station.is_rejected,
            reject_reason=inv_station.reject_reason
        )
        station_results.append(sr)
    result.stations_used = station_results
    
    return result


@router.get("/event/{event_tag}", response_model=InversionDetail)
def get_inversion_by_event(event_tag: str, db: Session = Depends(get_db)):
    inv = db.query(InversionResult).filter(InversionResult.event_tag == event_tag).first()
    if not inv:
        raise HTTPException(status_code=404, detail=f"事件 {event_tag} 没有反演结果")
    
    result = InversionDetail.model_validate(inv)
    
    from app.schemas import InversionStationOut
    station_results = []
    for inv_station in inv.stations_used:
        station = db.query(Station).filter(Station.id == inv_station.station_id).first()
        sr = InversionStationOut(
            id=inv_station.id,
            station_id=inv_station.station_id,
            station_code=station.station_code if station else "未知",
            station_name=station.name if station else None,
            arrival_id=inv_station.arrival_id,
            phase=inv_station.phase,
            observed_time=inv_station.observed_time,
            calculated_time=inv_station.calculated_time,
            residual=inv_station.residual,
            weight=inv_station.weight,
            is_rejected=inv_station.is_rejected,
            reject_reason=inv_station.reject_reason
        )
        station_results.append(sr)
    result.stations_used = station_results
    
    return result


@router.get("/{inversion_id}/trace", response_model=TraceResult)
def trace_inversion_to_arrivals(inversion_id: int, db: Session = Depends(get_db)):
    inv = db.query(InversionResult).filter(InversionResult.id == inversion_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail=f"反演结果 {inversion_id} 不存在")
    
    arrival_ids = [is_.arrival_id for is_ in inv.stations_used]
    arrivals = db.query(Arrival).filter(Arrival.id.in_(arrival_ids)).all()
    
    station_ids = {a.station_id for a in arrivals}
    stations = db.query(Station).filter(Station.id.in_(station_ids)).all()
    
    return TraceResult(
        station=None,
        arrivals=[ArrivalOut.model_validate(a) for a in arrivals],
        inversions=[_populate_station_info(inv, db)],
        message=f"反演结果追溯: {len(arrivals)} 条到时记录 → 涉及 {len(stations)} 个台站"
    )


@router.get("/{inversion_id}/recompute", response_model=InversionDetail)
def recompute_inversion(
    inversion_id: int,
    residual_threshold: Optional[float] = None,
    db: Session = Depends(get_db)
):
    inv = db.query(InversionResult).filter(InversionResult.id == inversion_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail=f"反演结果 {inversion_id} 不存在")
    
    velocity_model = db.query(VelocityModel).filter(
        VelocityModel.id == inv.velocity_model_id
    ).first()
    
    if not velocity_model:
        raise HTTPException(status_code=404, detail="关联的波速模型不存在")
    
    for inv_station in inv.stations_used:
        db.delete(inv_station)
    db.flush()
    
    event_tag = inv.event_tag
    db.delete(inv)
    db.flush()
    
    inv_in = InversionCreate(
        event_tag=event_tag,
        velocity_model_id=velocity_model.id,
        residual_threshold=residual_threshold or 2.0
    )
    
    return run_inversion(inv_in, db)


@router.delete("/{inversion_id}")
def delete_inversion(inversion_id: int, db: Session = Depends(get_db)):
    inv = db.query(InversionResult).filter(InversionResult.id == inversion_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail=f"反演结果 {inversion_id} 不存在")
    
    event_tag = inv.event_tag
    
    for inv_station in inv.stations_used:
        db.delete(inv_station)
    
    db.delete(inv)
    db.commit()
    return {"message": f"反演结果 (事件 {event_tag}) 已删除"}
