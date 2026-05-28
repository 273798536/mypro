import csv
import json
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import pandas as pd
from models import (
    Waypoint, WindCondition, NoFlyZone, WaypointType,
    SourceLocation, Anomaly, AnomalyType, AnomalySeverity
)
from config import system_config

class DataImporter:
    def __init__(self):
        self.anomalies: List[Anomaly] = []
        self.data_sources: Dict[str, Any] = {}
        self.change_history: List[Dict[str, Any]] = []
    
    def _record_source(self, file_path: str, file_type: str):
        file_path_obj = Path(file_path)
        file_hash = self._calculate_file_hash(file_path)
        self.data_sources[file_path] = {
            "file_name": file_path_obj.name,
            "file_type": file_type,
            "file_hash": file_hash,
            "import_time": pd.Timestamp.now().isoformat()
        }
    
    def _calculate_file_hash(self, file_path: str) -> str:
        hasher = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                hasher.update(chunk)
        return hasher.hexdigest()
    
    def _create_anomaly(self, anomaly_type: AnomalyType, message: str, 
                        source: SourceLocation, severity: AnomalySeverity = AnomalySeverity.WARNING,
                        details: Dict[str, Any] = None) -> Anomaly:
        anomaly = Anomaly(
            anomaly_type=anomaly_type,
            severity=severity,
            message=message,
            source=source,
            details=details or {}
        )
        self.anomalies.append(anomaly)
        return anomaly
    
    def import_waypoints_csv(self, file_path: str) -> Tuple[List[Waypoint], List[Anomaly]]:
        waypoints = []
        self._record_source(file_path, "waypoints")
        
        df = pd.read_csv(file_path)
        
        required_columns = ['id', 'name', 'latitude', 'longitude']
        missing_cols = [col for col in required_columns if col not in df.columns]
        if missing_cols:
            source = SourceLocation(file_name=Path(file_path).name, line_number=1)
            self._create_anomaly(
                AnomalyType.WAYPOINT_MISSING,
                f"缺少必要列: {', '.join(missing_cols)}",
                source,
                AnomalySeverity.CRITICAL
            )
            return waypoints, self.anomalies
        
        for idx, row in df.iterrows():
            line_number = idx + 2
            source = SourceLocation(
                file_name=Path(file_path).name,
                line_number=line_number,
                raw_value=str(row.to_dict())
            )
            
            try:
                lat = float(row['latitude'])
                lon = float(row['longitude'])
                
                if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
                    self._create_anomaly(
                        AnomalyType.INVALID_COORDINATES,
                        f"航点 {row.get('name', row['id'])} 坐标无效",
                        source,
                        AnomalySeverity.CRITICAL,
                        {"latitude": lat, "longitude": lon}
                    )
                    continue
                
                wp_type = WaypointType(str(row.get('type', 'waypoint')).lower())
                altitude = float(row.get('altitude_m', system_config.DEFAULT_ALTITUDE_M))
                stay_time = float(row.get('stay_time_s', 0))
                order = int(row['order']) if 'order' in df.columns and pd.notna(row['order']) else None
                
                waypoint = Waypoint(
                    waypoint_id=str(row['id']),
                    name=str(row['name']),
                    latitude=lat,
                    longitude=lon,
                    altitude_m=altitude,
                    waypoint_type=wp_type,
                    order=order,
                    source=source,
                    stay_time_s=stay_time
                )
                waypoints.append(waypoint)
                
            except (ValueError, TypeError) as e:
                self._create_anomaly(
                    AnomalyType.WAYPOINT_MISSING,
                    f"解析航点数据失败: {str(e)}",
                    source,
                    AnomalySeverity.CRITICAL
                )
        
        return waypoints, self.anomalies
    
    def import_wind_csv(self, file_path: str) -> Tuple[List[WindCondition], List[Anomaly]]:
        wind_conditions = []
        self._record_source(file_path, "wind")
        
        df = pd.read_csv(file_path)
        
        for idx, row in df.iterrows():
            line_number = idx + 2
            source = SourceLocation(
                file_name=Path(file_path).name,
                line_number=line_number
            )
            
            try:
                wind = WindCondition(
                    altitude_m=float(row.get('altitude_m', system_config.DEFAULT_ALTITUDE_M)),
                    speed_m_s=float(row['speed_m_s']),
                    direction_deg=float(row['direction_deg']),
                    source=source
                )
                wind_conditions.append(wind)
            except (ValueError, KeyError) as e:
                self._create_anomaly(
                    AnomalyType.WAYPOINT_MISSING,
                    f"解析风向数据失败: {str(e)}",
                    source,
                    AnomalySeverity.WARNING
                )
        
        if not wind_conditions:
            wind_conditions.append(WindCondition(
                altitude_m=system_config.DEFAULT_ALTITUDE_M,
                speed_m_s=0,
                direction_deg=0
            ))
        
        return wind_conditions, self.anomalies
    
    def import_no_fly_zones_geojson(self, file_path: str) -> Tuple[List[NoFlyZone], List[Anomaly]]:
        zones = []
        self._record_source(file_path, "no_fly_zones")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for idx, feature in enumerate(data.get('features', [])):
            line_number = idx + 1
            source = SourceLocation(
                file_name=Path(file_path).name,
                line_number=line_number
            )
            
            try:
                props = feature.get('properties', {})
                geometry = feature.get('geometry', {})
                
                if geometry.get('type') != 'Polygon':
                    self._create_anomaly(
                        AnomalyType.NO_FLY_ZONE_CROSSING,
                        f"禁飞区 {props.get('name', idx)} 不是多边形类型",
                        source,
                        AnomalySeverity.WARNING
                    )
                    continue
                
                coordinates = geometry.get('coordinates', [[]])[0]
                polygon_coords = [(coord[1], coord[0]) for coord in coordinates]
                
                zone = NoFlyZone(
                    zone_id=str(props.get('id', f"zone_{idx}")),
                    name=str(props.get('name', f"禁飞区_{idx}")),
                    polygon_coordinates=polygon_coords,
                    min_altitude_m=float(props.get('min_altitude_m', 0)),
                    max_altitude_m=float(props.get('max_altitude_m', float('inf'))),
                    source=source
                )
                zones.append(zone)
                
            except Exception as e:
                self._create_anomaly(
                    AnomalyType.NO_FLY_ZONE_CROSSING,
                    f"解析禁飞区失败: {str(e)}",
                    source,
                    AnomalySeverity.WARNING
                )
        
        return zones, self.anomalies
    
    def import_aircraft_params_json(self, file_path: str) -> Tuple[Dict[str, Any], List[Anomaly]]:
        self._record_source(file_path, "aircraft_params")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            params = json.load(f)
        
        return params, self.anomalies
    
    def get_import_summary(self) -> Dict[str, Any]:
        return {
            "data_sources": self.data_sources,
            "change_history": self.change_history,
            "anomaly_count": len(self.anomalies),
            "critical_anomalies": [a for a in self.anomalies if a.severity == AnomalySeverity.CRITICAL]
        }
