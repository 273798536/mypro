from typing import Optional, List, Dict, Any
import random
import io
import csv
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Station, Arrival, VelocityModel, VelocityLayer,
    DataStatus, NextVerifier
)
from app.schemas import SampleGenerateResult, BulkImportResult
from app.inversion import haversine_distance, get_velocity_at_depth

router = APIRouter()


SAMPLE_STATIONS = [
    {"code": "BJI", "name": "北京台", "lat": 40.0499, "lon": 116.3456, "elev": 55.0, "network": "CEA"},
    {"code": "TIA", "name": "天津台", "lat": 39.1467, "lon": 117.1987, "elev": 3.0, "network": "CEA"},
    {"code": "SHI", "name": "上海台", "lat": 31.2000, "lon": 121.5000, "elev": 12.0, "network": "CEA"},
    {"code": "GUA", "name": "广州台", "lat": 23.1300, "lon": 113.2600, "elev": 8.0, "network": "CEA"},
    {"code": "CHE", "name": "成都台", "lat": 30.6700, "lon": 104.0600, "elev": 500.0, "network": "CEA"},
    {"code": "KUN", "name": "昆明台", "lat": 25.0400, "lon": 102.7100, "elev": 1900.0, "network": "CEA"},
    {"code": "LHA", "name": "拉萨台", "lat": 29.6500, "lon": 91.1300, "elev": 3650.0, "network": "CEA"},
    {"code": "WUH", "name": "武汉台", "lat": 30.5800, "lon": 114.2700, "elev": 23.0, "network": "CEA"},
    {"code": "XIA", "name": "西安台", "lat": 34.2500, "lon": 108.9300, "elev": 415.0, "network": "CEA"},
    {"code": "NAN", "name": "南京台", "lat": 32.0400, "lon": 118.7800, "elev": 15.0, "network": "CEA"},
]


SAMPLE_VELOCITY = {
    "name": "CRUST1D_CHINA",
    "version": "v2024.01",
    "region": "中国东部",
    "description": "中国东部地壳一维速度模型",
    "layers": [
        {"depth_top": 0.0, "depth_bottom": 3.0, "vp": 5.80, "vs": 3.36},
        {"depth_top": 3.0, "depth_bottom": 10.0, "vp": 6.10, "vs": 3.55},
        {"depth_top": 10.0, "depth_bottom": 20.0, "vp": 6.30, "vs": 3.66},
        {"depth_top": 20.0, "depth_bottom": 35.0, "vp": 6.70, "vs": 3.88},
        {"depth_top": 35.0, "depth_bottom": 50.0, "vp": 8.00, "vs": 4.62},
        {"depth_top": 50.0, "depth_bottom": 100.0, "vp": 8.10, "vs": 4.68},
    ]
}


def generate_arrival_times(
    source_lat: float,
    source_lon: float,
    source_depth: float,
    origin_time: float,
    stations: list,
    velocity_model: VelocityModel
) -> list:
    arrivals = []
    for st in stations:
        epi_dist = haversine_distance(source_lat, source_lon, st["lat"], st["lon"])
        z_source = max(source_depth, 0.001)
        z_station = -st["elev"] / 1000.0
        vertical_dist = z_source - z_station
        ray_path = (epi_dist ** 2 + vertical_dist ** 2) ** 0.5
        
        avg_depth = (z_source + z_station) / 2
        
        vp = get_velocity_at_depth(avg_depth, velocity_model, "P")
        vs = get_velocity_at_depth(avg_depth, velocity_model, "S")
        
        tp = origin_time + ray_path / vp + random.gauss(0, 0.1)
        ts = origin_time + ray_path / vs + random.gauss(0, 0.15)
        
        arrivals.append({
            "station_code": st["code"],
            "phase": "P",
            "time": round(tp, 3),
            "time_str": f"{int(tp//3600):02d}:{int((tp%3600)//60):02d}:{tp%60:06.3f}"
        })
        arrivals.append({
            "station_code": st["code"],
            "phase": "S",
            "time": round(ts, 3),
            "time_str": f"{int(ts//3600):02d}:{int((ts%3600)//60):02d}:{ts%60:06.3f}"
        })
    
    return arrivals


@router.post("/generate", response_model=SampleGenerateResult)
def generate_sample_data(
    event_tag: Optional[str] = None,
    include_missing: bool = True,
    include_duplicate: bool = True,
    include_wrong_velocity: bool = True,
    db: Session = Depends(get_db)
):
    random.seed(42)
    
    if not event_tag:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        event_tag = f"EVT_{timestamp}"
    
    existing_stations = {s.station_code: s for s in db.query(Station).all()}
    new_stations = []
    station_map = {}
    
    for st_data in SAMPLE_STATIONS:
        code = st_data["code"]
        if code in existing_stations:
            station_map[code] = existing_stations[code]
        else:
            st = Station(
                station_code=code,
                name=st_data["name"],
                latitude=st_data["lat"],
                longitude=st_data["lon"],
                elevation=st_data["elev"],
                network=st_data["network"],
                status=DataStatus.NORMAL
            )
            db.add(st)
            new_stations.append(st)
            station_map[code] = st
    
    db.flush()
    for st in new_stations:
        db.refresh(st)
        station_map[st.station_code] = st
    
    existing_vm = db.query(VelocityModel).filter(
        VelocityModel.model_name == SAMPLE_VELOCITY["name"],
        VelocityModel.version == SAMPLE_VELOCITY["version"]
    ).first()
    
    vm_created = 0
    velocity_model = existing_vm
    
    if not existing_vm:
        velocity_model = VelocityModel(
            model_name=SAMPLE_VELOCITY["name"],
            version=SAMPLE_VELOCITY["version"],
            region=SAMPLE_VELOCITY["region"],
            description=SAMPLE_VELOCITY["description"],
            is_active=True,
            status=DataStatus.NORMAL
        )
        for layer_data in SAMPLE_VELOCITY["layers"]:
            layer = VelocityLayer(**layer_data)
            velocity_model.layers.append(layer)
        db.add(velocity_model)
        db.flush()
        db.refresh(velocity_model)
        vm_created = 1
    else:
        if not velocity_model.is_active:
            velocity_model.is_active = True
    
    if include_wrong_velocity:
        wrong_vm = db.query(VelocityModel).filter(
            VelocityModel.model_name == "CRUST1D_WRONG",
            VelocityModel.version == "v0.1"
        ).first()
        if not wrong_vm:
            wrong_vm = VelocityModel(
                model_name="CRUST1D_WRONG",
                version="v0.1",
                region="测试区域",
                description="错误的波速模型 - 用于测试状态流转",
                is_active=False,
                status=DataStatus.WRONG_VELOCITY
            )
            wrong_vm.layers.append(VelocityLayer(
                depth_top=0.0, depth_bottom=50.0, vp=10.0, vs=5.8
            ))
            db.add(wrong_vm)
            vm_created += 1
    
    source_lat = 30.0 + random.uniform(-0.5, 0.5)
    source_lon = 110.0 + random.uniform(-0.5, 0.5)
    source_depth = random.uniform(5.0, 25.0)
    origin_time = 3600 * 8 + 60 * 15 + 30.0
    
    used_stations = SAMPLE_STATIONS[:8]
    arrivals_data = generate_arrival_times(
        source_lat, source_lon, source_depth, origin_time,
        used_stations, velocity_model
    )
    
    arrival_created = 0
    missing_arrival = False
    
    for i, arr_data in enumerate(arrivals_data):
        station = station_map.get(arr_data["station_code"])
        if not station:
            continue
        
        status = DataStatus.NORMAL
        next_verifier = None
        arrival_time = arr_data["time"]
        arrival_time_str = arr_data["time_str"]
        
        if include_missing and i == len(arrivals_data) - 1:
            status = DataStatus.MISSING_ARRIVAL
            next_verifier = NextVerifier.DATA_COLLECTOR
            arrival_time = None
            arrival_time_str = None
            missing_arrival = True
        
        arrival = Arrival(
            station_id=station.id,
            event_tag=event_tag,
            phase=arr_data["phase"],
            arrival_time=arrival_time,
            arrival_time_str=arrival_time_str,
            uncertainty=0.1,
            status=status,
            next_verifier=next_verifier,
            remark=f"样例数据 - {event_tag}"
        )
        db.add(arrival)
        arrival_created += 1
    
    duplicate_station = False
    if include_duplicate:
        dup_st_data = SAMPLE_STATIONS[0]
        dup_code = dup_st_data["code"] + "_DUP"
        existing_dup = db.query(Station).filter(Station.station_code == dup_code).first()
        
        if not existing_dup:
            dup_station = Station(
                station_code=dup_code,
                name=dup_st_data["name"] + "（重复）",
                latitude=dup_st_data["lat"],
                longitude=dup_st_data["lon"],
                elevation=dup_st_data["elev"],
                network=dup_st_data["network"],
                status=DataStatus.DUPLICATE_STATION
            )
            db.add(dup_station)
            db.flush()
            db.refresh(dup_station)
            new_stations.append(dup_station)
            duplicate_station = True
            
            for phase in ["P", "S"]:
                arr = Arrival(
                    station_id=dup_station.id,
                    event_tag=event_tag,
                    phase=phase,
                    arrival_time=arrivals_data[0 if phase == "P" else 1]["time"],
                    arrival_time_str=arrivals_data[0 if phase == "P" else 1]["time_str"],
                    uncertainty=0.1,
                    status=DataStatus.DUPLICATE_STATION,
                    next_verifier=NextVerifier.STATION_MANAGER,
                    remark="疑似重复台站数据"
                )
                db.add(arr)
                arrival_created += 1
    
    db.commit()
    
    return SampleGenerateResult(
        event_tag=event_tag,
        stations_created=len(new_stations),
        arrivals_created=arrival_created,
        velocity_model_created=vm_created,
        has_missing_arrival=missing_arrival,
        has_duplicate_station=duplicate_station,
        has_wrong_velocity=include_wrong_velocity,
        message=f"样例数据生成完成。事件: {event_tag}，震源: ({source_lat:.4f}°N, {source_lon:.4f}°E, {source_depth:.1f}km)"
    )


@router.post("/generate/clean")
def generate_clean_sample(
    event_tag: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return generate_sample_data(
        event_tag=event_tag,
        include_missing=False,
        include_duplicate=False,
        include_wrong_velocity=False,
        db=db
    )


@router.post("/clear")
def clear_all_data(db: Session = Depends(get_db)):
    from app.models import InversionResult, InversionStation, AuditLog
    
    db.query(InversionStation).delete()
    db.query(InversionResult).delete()
    db.query(AuditLog).delete()
    db.query(Arrival).delete()
    db.query(Station).delete()
    db.query(VelocityLayer).delete()
    db.query(VelocityModel).delete()
    db.commit()
    return {"message": "所有数据已清除"}


@router.get("/stats")
def get_data_stats(db: Session = Depends(get_db)):
    from app.models import InversionResult
    
    station_count = db.query(Station).count()
    arrival_count = db.query(Arrival).count()
    velocity_count = db.query(VelocityModel).count()
    inversion_count = db.query(InversionResult).count()
    
    status_stats = {}
    for status in DataStatus:
        count = db.query(Arrival).filter(Arrival.status == status).count()
        if count > 0:
            status_stats[status.value] = count
    
    events = db.query(Arrival.event_tag).distinct().all()
    event_list = [e[0] for e in events]
    
    return {
        "stations": station_count,
        "arrivals": arrival_count,
        "velocity_models": velocity_count,
        "inversion_results": inversion_count,
        "arrival_status": status_stats,
        "events": event_list
    }


@router.post("/import/stations", response_model=BulkImportResult)
async def import_stations_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    result = BulkImportResult()
    
    if not file.filename.endswith('.csv'):
        result.errors.append("请上传CSV文件")
        return result
    
    content = await file.read()
    content_str = content.decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(content_str))
    
    existing_codes = {s.station_code for s in db.query(Station).all()}
    
    for row in reader:
        try:
            code = row.get("台站代码") or row.get("station_code")
            if not code:
                result.errors.append(f"行缺少台站代码: {row}")
                result.stations_skipped += 1
                continue
            
            if code in existing_codes:
                result.stations_skipped += 1
                continue
            
            lat = float(row.get("纬度(°N)") or row.get("latitude") or 0)
            lon = float(row.get("经度(°E)") or row.get("longitude") or 0)
            elev = float(row.get("海拔(m)") or row.get("elevation") or 0)
            name = row.get("台站名称") or row.get("name")
            network = row.get("台网") or row.get("network")
            
            station = Station(
                station_code=code,
                name=name,
                latitude=lat,
                longitude=lon,
                elevation=elev,
                network=network,
                status=DataStatus.NORMAL
            )
            db.add(station)
            existing_codes.add(code)
            result.stations_imported += 1
            
        except Exception as e:
            result.errors.append(f"导入行失败 {row}: {str(e)}")
            result.stations_skipped += 1
    
    db.commit()
    return result


@router.post("/import/arrivals", response_model=BulkImportResult)
async def import_arrivals_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    result = BulkImportResult()
    
    if not file.filename.endswith('.csv'):
        result.errors.append("请上传CSV文件")
        return result
    
    content = await file.read()
    content_str = content.decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(content_str))
    
    station_map = {s.station_code: s for s in db.query(Station).all()}
    
    for row in reader:
        try:
            event_tag = row.get("事件标签") or row.get("event_tag")
            station_code = row.get("台站代码") or row.get("station_code")
            phase = row.get("震相") or row.get("phase")
            
            if not event_tag or not station_code or not phase:
                result.errors.append(f"行缺少必要字段: {row}")
                result.arrivals_skipped += 1
                continue
            
            station = station_map.get(station_code)
            if not station:
                result.errors.append(f"台站不存在: {station_code}")
                result.arrivals_skipped += 1
                continue
            
            arrival_time_str = row.get("到时(s)") or row.get("arrival_time")
            arrival_time = float(arrival_time_str) if arrival_time_str else None
            
            status_str = row.get("状态") or row.get("status")
            status = DataStatus(status_str) if status_str else DataStatus.NORMAL
            if arrival_time is None:
                status = DataStatus.MISSING_ARRIVAL
            
            verifier_str = row.get("下一审核人") or row.get("next_verifier")
            next_verifier = NextVerifier(verifier_str) if verifier_str else None
            if arrival_time is None and not next_verifier:
                next_verifier = NextVerifier.DATA_COLLECTOR
            
            arrival = Arrival(
                station_id=station.id,
                event_tag=event_tag,
                phase=phase,
                arrival_time=arrival_time,
                arrival_time_str=row.get("到时字符串") or row.get("arrival_time_str"),
                uncertainty=float(row.get("不确定度(s)") or row.get("uncertainty") or 0.1),
                status=status,
                next_verifier=next_verifier,
                remark=row.get("备注") or row.get("remark"),
                magnitude_remark=row.get("震级备注") or row.get("magnitude_remark")
            )
            db.add(arrival)
            result.arrivals_imported += 1
            
        except Exception as e:
            result.errors.append(f"导入行失败 {row}: {str(e)}")
            result.arrivals_skipped += 1
    
    db.commit()
    return result


@router.post("/import/json", response_model=BulkImportResult)
async def import_json_data(
    data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    result = BulkImportResult()
    
    stations_data = data.get("stations", [])
    arrivals_data = data.get("arrivals", [])
    velocity_data = data.get("velocity_models", [])
    
    existing_codes = {s.station_code for s in db.query(Station).all()}
    station_map = {}
    
    for st_data in stations_data:
        try:
            code = st_data.get("station_code")
            if code in existing_codes:
                result.stations_skipped += 1
                continue
            
            station = Station(
                station_code=code,
                name=st_data.get("name"),
                latitude=st_data.get("latitude", 0),
                longitude=st_data.get("longitude", 0),
                elevation=st_data.get("elevation", 0),
                network=st_data.get("network"),
                status=DataStatus(st_data.get("status", "normal"))
            )
            db.add(station)
            db.flush()
            db.refresh(station)
            station_map[code] = station
            existing_codes.add(code)
            result.stations_imported += 1
        except Exception as e:
            result.errors.append(f"导入台站失败: {str(e)}")
            result.stations_skipped += 1
    
    for arr_data in arrivals_data:
        try:
            station_code = arr_data.get("station_code")
            station = station_map.get(station_code)
            if not station:
                station = db.query(Station).filter(
                    Station.station_code == station_code
                ).first()
            
            if not station:
                result.errors.append(f"台站不存在: {station_code}")
                result.arrivals_skipped += 1
                continue
            
            arrival_time = arr_data.get("arrival_time")
            status = DataStatus(arr_data.get("status", "normal")) if arrival_time else DataStatus.MISSING_ARRIVAL
            
            arrival = Arrival(
                station_id=station.id,
                event_tag=arr_data.get("event_tag"),
                phase=arr_data.get("phase"),
                arrival_time=arrival_time,
                arrival_time_str=arr_data.get("arrival_time_str"),
                uncertainty=arr_data.get("uncertainty", 0.1),
                status=status,
                next_verifier=NextVerifier(arr_data.get("next_verifier")) if arr_data.get("next_verifier") else None,
                remark=arr_data.get("remark"),
                magnitude_remark=arr_data.get("magnitude_remark")
            )
            db.add(arrival)
            result.arrivals_imported += 1
        except Exception as e:
            result.errors.append(f"导入到时失败: {str(e)}")
            result.arrivals_skipped += 1
    
    for vm_data in velocity_data:
        try:
            existing = db.query(VelocityModel).filter(
                VelocityModel.model_name == vm_data.get("model_name"),
                VelocityModel.version == vm_data.get("version")
            ).first()
            if existing:
                continue
            
            vm = VelocityModel(
                model_name=vm_data.get("model_name"),
                version=vm_data.get("version"),
                region=vm_data.get("region"),
                description=vm_data.get("description"),
                is_active=vm_data.get("is_active", False),
                status=DataStatus(vm_data.get("status", "normal"))
            )
            for layer in vm_data.get("layers", []):
                vm.layers.append(VelocityLayer(**layer))
            db.add(vm)
            result.velocity_imported += 1
        except Exception as e:
            result.errors.append(f"导入波速模型失败: {str(e)}")
    
    db.commit()
    return result
