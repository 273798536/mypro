from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Station, DataStatus
from app.schemas import StationCreate, StationOut, StationUpdate, StationDetail, TraceResult, ArrivalOut
from app.validators import validate_coordinates, validate_station_code

router = APIRouter()


@router.get("", response_model=List[StationOut])
def list_stations(
    status: Optional[DataStatus] = None,
    network: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    query = db.query(Station)
    if status:
        query = query.filter(Station.status == status)
    if network:
        query = query.filter(Station.network == network)
    stations = query.order_by(Station.station_code).offset(skip).limit(limit).all()
    return stations


@router.post("", response_model=StationOut)
def create_station(station_in: StationCreate, db: Session = Depends(get_db)):
    valid, msg = validate_station_code(station_in.station_code)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)
    
    valid, msg = validate_coordinates(station_in.latitude, station_in.longitude)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)
    
    existing = db.query(Station).filter(Station.station_code == station_in.station_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"台站代码 {station_in.station_code} 已存在")
    
    station = Station(**station_in.model_dump())
    db.add(station)
    db.commit()
    db.refresh(station)
    return station


@router.get("/{station_id}", response_model=StationDetail)
def get_station(station_id: int, db: Session = Depends(get_db)):
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail=f"台站 {station_id} 不存在")
    
    result = StationDetail.model_validate(station)
    result.arrivals_count = len(station.arrivals)
    return result


@router.get("/code/{station_code}", response_model=StationDetail)
def get_station_by_code(station_code: str, db: Session = Depends(get_db)):
    station = db.query(Station).filter(Station.station_code == station_code).first()
    if not station:
        raise HTTPException(status_code=404, detail=f"台站 {station_code} 不存在")
    
    result = StationDetail.model_validate(station)
    result.arrivals_count = len(station.arrivals)
    return result


@router.put("/{station_id}", response_model=StationOut)
def update_station(station_id: int, station_in: StationUpdate, db: Session = Depends(get_db)):
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail=f"台站 {station_id} 不存在")
    
    update_data = station_in.model_dump(exclude_unset=True)
    
    if "latitude" in update_data or "longitude" in update_data:
        lat = update_data.get("latitude", station.latitude)
        lon = update_data.get("longitude", station.longitude)
        valid, msg = validate_coordinates(lat, lon)
        if not valid:
            raise HTTPException(status_code=400, detail=msg)
    
    for field, value in update_data.items():
        setattr(station, field, value)
    
    db.commit()
    db.refresh(station)
    return station


@router.patch("/{station_id}/status", response_model=StationOut)
def update_station_status(
    station_id: int,
    status: DataStatus,
    remark: Optional[str] = None,
    db: Session = Depends(get_db)
):
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail=f"台站 {station_id} 不存在")
    
    station.status = status
    if remark:
        pass
    db.commit()
    db.refresh(station)
    return station


@router.delete("/{station_id}")
def delete_station(station_id: int, db: Session = Depends(get_db)):
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail=f"台站 {station_id} 不存在")
    
    if station.arrivals:
        raise HTTPException(status_code=400, detail=f"台站 {station.station_code} 有关联到时记录，无法删除")
    
    db.delete(station)
    db.commit()
    return {"message": f"台站 {station.station_code} 已删除"}


@router.get("/{station_id}/trace", response_model=TraceResult)
def trace_station_to_results(station_id: int, db: Session = Depends(get_db)):
    from app.models import Arrival, InversionStation, InversionResult
    from app.schemas import InversionResultOut
    
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail=f"台站 {station_id} 不存在")
    
    arrivals = db.query(Arrival).filter(Arrival.station_id == station_id).order_by(Arrival.event_tag, Arrival.phase).all()
    
    inversion_ids = db.query(InversionStation.inversion_id).filter(
        InversionStation.station_id == station_id
    ).distinct().all()
    inversion_ids = [inv_id for (inv_id,) in inversion_ids]
    
    inversions = []
    if inversion_ids:
        inversions = db.query(InversionResult).filter(
            InversionResult.id.in_(inversion_ids)
        ).order_by(InversionResult.created_at.desc()).all()
    
    from app.routers.inversion import _populate_station_info_list
    
    return TraceResult(
        station=StationOut.model_validate(station),
        arrivals=[ArrivalOut.model_validate(a) for a in arrivals],
        inversions=_populate_station_info_list(inversions, db),
        message=f"台站 {station.station_code} 追溯链: {len(arrivals)} 条到时 → {len(inversions)} 次反演结果"
    )
