import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field

from app.models import Station, Arrival, VelocityModel, DataStatus


EARTH_RADIUS_KM = 6371.0


@dataclass
class StationInfo:
    id: int
    code: str
    lat: float
    lon: float
    elev: float = 0.0


@dataclass
class ArrivalInfo:
    id: int
    station_id: int
    phase: str
    observed_time: float
    uncertainty: float = 0.1
    weight: float = 1.0


@dataclass
class Hypocenter:
    lat: float
    lon: float
    depth: float
    origin_time: float


@dataclass
class InversionStationResult:
    station_id: int
    station_code: str
    arrival_id: int
    phase: str
    observed_time: float
    calculated_time: float
    residual: float
    weight: float
    is_rejected: bool = False
    reject_reason: Optional[str] = None


@dataclass
class InversionResultData:
    hypocenter: Hypocenter
    residual_mean: float
    residual_std: float
    num_stations_used: int
    num_stations_rejected: int
    iterations: int
    convergence: bool
    station_results: List[InversionStationResult] = field(default_factory=list)


def deg2rad(deg: float) -> float:
    return deg * np.pi / 180.0


def rad2deg(rad: float) -> float:
    return rad * 180.0 / np.pi


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    dlat = deg2rad(lat2 - lat1)
    dlon = deg2rad(lon2 - lon1)
    a = np.sin(dlat / 2) ** 2 + np.cos(deg2rad(lat1)) * np.cos(deg2rad(lat2)) * np.sin(dlon / 2) ** 2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def get_velocity_at_depth(depth: float, velocity_model: VelocityModel, phase: str) -> float:
    layers = sorted(velocity_model.layers, key=lambda x: x.depth_top)
    for layer in layers:
        if layer.depth_top <= depth < layer.depth_bottom:
            return layer.vp if phase.upper().startswith("P") else layer.vs
    if layers:
        last_layer = layers[-1]
        return last_layer.vp if phase.upper().startswith("P") else last_layer.vs
    return 6.0 if phase.upper().startswith("P") else 3.5


def calculate_travel_time(
    source_lat: float,
    source_lon: float,
    source_depth: float,
    station_lat: float,
    station_lon: float,
    station_elev: float,
    velocity_model: VelocityModel,
    phase: str
) -> float:
    epi_dist = haversine_distance(source_lat, source_lon, station_lat, station_lon)
    z_source = max(source_depth, 0.001)
    z_station = -station_elev / 1000.0
    vertical_dist = z_source - z_station
    ray_path = np.sqrt(epi_dist ** 2 + vertical_dist ** 2)
    
    avg_depth = (z_source + z_station) / 2
    velocity = get_velocity_at_depth(avg_depth, velocity_model, phase)
    
    return ray_path / max(velocity, 0.001)


def calculate_partial_derivatives(
    hypo: Hypocenter,
    station: StationInfo,
    velocity_model: VelocityModel,
    phase: str,
    delta: float = 0.1
) -> np.ndarray:
    derivatives = np.zeros(4)
    
    t0 = calculate_travel_time(
        hypo.lat, hypo.lon, hypo.depth,
        station.lat, station.lon, station.elev,
        velocity_model, phase
    )
    
    t_lat = calculate_travel_time(
        hypo.lat + delta, hypo.lon, hypo.depth,
        station.lat, station.lon, station.elev,
        velocity_model, phase
    )
    derivatives[0] = (t_lat - t0) / delta
    
    dlon = delta / max(np.cos(deg2rad(hypo.lat)), 0.001)
    t_lon = calculate_travel_time(
        hypo.lat, hypo.lon + dlon, hypo.depth,
        station.lat, station.lon, station.elev,
        velocity_model, phase
    )
    derivatives[1] = (t_lon - t0) / dlon
    
    t_depth = calculate_travel_time(
        hypo.lat, hypo.lon, hypo.depth + delta,
        station.lat, station.lon, station.elev,
        velocity_model, phase
    )
    derivatives[2] = (t_depth - t0) / delta
    
    derivatives[3] = 1.0
    
    return derivatives


def perform_geiger_inversion(
    stations: List[StationInfo],
    arrivals: List[ArrivalInfo],
    velocity_model: VelocityModel,
    initial_hypo: Optional[Hypocenter] = None,
    max_iterations: int = 20,
    convergence_criterion: float = 0.001,
    residual_threshold: float = 2.0,
    damping: float = 10.0
) -> InversionResultData:
    station_map = {s.id: s for s in stations}
    
    valid_arrivals = []
    for arr in arrivals:
        if arr.station_id in station_map:
            valid_arrivals.append(arr)
    
    if len(valid_arrivals) < 4:
        raise ValueError(f"需要至少4条有效到时记录，当前只有 {len(valid_arrivals)} 条")
    
    if initial_hypo is None:
        lats = [station_map[a.station_id].lat for a in valid_arrivals]
        lons = [station_map[a.station_id].lon for a in valid_arrivals]
        times = [a.observed_time for a in valid_arrivals]
        
        initial_hypo = Hypocenter(
            lat=np.mean(lats),
            lon=np.mean(lons),
            depth=10.0,
            origin_time=np.min(times) - 5.0
        )
    
    hypo = Hypocenter(**initial_hypo.__dict__)
    station_results: List[InversionStationResult] = []
    iteration = 0
    convergence = False
    
    while iteration < max_iterations and not convergence:
        n = len(valid_arrivals)
        A = np.zeros((n, 4))
        b = np.zeros(n)
        weights = np.ones(n)
        
        for i, arr in enumerate(valid_arrivals):
            st = station_map[arr.station_id]
            t_calc = hypo.origin_time + calculate_travel_time(
                hypo.lat, hypo.lon, hypo.depth,
                st.lat, st.lon, st.elev,
                velocity_model, arr.phase
            )
            A[i, :] = calculate_partial_derivatives(hypo, st, velocity_model, arr.phase)
            b[i] = arr.observed_time - t_calc
            weights[i] = 1.0 / max(arr.uncertainty, 0.001)
        
        W = np.diag(weights)
        AWA = A.T @ W @ A + damping * np.eye(4)
        AWb = A.T @ W @ b
        
        try:
            delta = np.linalg.solve(AWA, AWb)
        except np.linalg.LinAlgError:
            delta = np.linalg.lstsq(AWA, AWb, rcond=None)[0]
        
        hypo.lat += delta[0]
        hypo.lon += delta[1]
        hypo.depth += delta[2]
        hypo.origin_time += delta[3]
        
        hypo.lat = max(-90, min(90, hypo.lat))
        hypo.lon = max(-180, min(180, hypo.lon))
        hypo.depth = max(0, hypo.depth)
        
        delta_mag = np.linalg.norm(delta)
        if delta_mag < convergence_criterion:
            convergence = True
        
        iteration += 1
    
    rejected_count = 0
    residuals = []
    for arr in valid_arrivals:
        st = station_map[arr.station_id]
        t_calc = hypo.origin_time + calculate_travel_time(
            hypo.lat, hypo.lon, hypo.depth,
            st.lat, st.lon, st.elev,
            velocity_model, arr.phase
        )
        residual = arr.observed_time - t_calc
        is_rejected = abs(residual) > residual_threshold
        
        if is_rejected:
            rejected_count += 1
            reject_reason = f"残差 {residual:.3f}s 超过阈值 {residual_threshold}s"
        else:
            reject_reason = None
            residuals.append(residual)
        
        station_results.append(InversionStationResult(
            station_id=st.id,
            station_code=st.code,
            arrival_id=arr.id,
            phase=arr.phase,
            observed_time=arr.observed_time,
            calculated_time=t_calc,
            residual=residual,
            weight=arr.weight,
            is_rejected=is_rejected,
            reject_reason=reject_reason
        ))
    
    if residuals:
        residual_mean = float(np.mean(residuals))
        residual_std = float(np.std(residuals))
    else:
        residual_mean = 0.0
        residual_std = 0.0
    
    return InversionResultData(
        hypocenter=hypo,
        residual_mean=residual_mean,
        residual_std=residual_std,
        num_stations_used=len(valid_arrivals) - rejected_count,
        num_stations_rejected=rejected_count,
        iterations=iteration,
        convergence=convergence,
        station_results=station_results
    )


def prepare_inversion_data(
    stations: List[Station],
    arrivals: List[Arrival],
    velocity_model: VelocityModel
) -> Tuple[List[StationInfo], List[ArrivalInfo]]:
    station_infos = []
    arrival_infos = []
    
    station_map = {s.id: s for s in stations}
    
    for arr in arrivals:
        if arr.status not in [DataStatus.NORMAL, DataStatus.CONFIRMED]:
            continue
        if arr.arrival_time is None:
            continue
        if arr.station_id not in station_map:
            continue
        
        st = station_map[arr.station_id]
        station_infos.append(StationInfo(
            id=st.id,
            code=st.station_code,
            lat=st.latitude,
            lon=st.longitude,
            elev=st.elevation
        ))
        
        arrival_infos.append(ArrivalInfo(
            id=arr.id,
            station_id=arr.station_id,
            phase=arr.phase,
            observed_time=arr.arrival_time,
            uncertainty=arr.uncertainty or 0.1
        ))
    
    unique_stations = {s.id: s for s in station_infos}
    station_infos = list(unique_stations.values())
    
    return station_infos, arrival_infos


def format_origin_time(origin_time_seconds: float) -> str:
    hours = int(origin_time_seconds // 3600)
    minutes = int((origin_time_seconds % 3600) // 60)
    seconds = origin_time_seconds % 60
    return f"{hours:02d}:{minutes:02d}:{seconds:06.3f}"
