import time
import hashlib
from typing import List, Dict, Any, Optional
from pathlib import Path
from config import system_config, AircraftConfig
from models import (
    Waypoint, WindCondition, NoFlyZone, CalculationResult,
    Anomaly, AnomalySeverity
)
from data_import import DataImporter
from energy_model import EnergyModel
from path_planner import PathPlanner
from visualization import RouteVisualizer
from report_generator import ReportGenerator

class FuelOptimizedRoutePlanner:
    def __init__(self, aircraft_config: AircraftConfig = None):
        self.aircraft_config = aircraft_config or AircraftConfig()
        self.energy_model = EnergyModel(self.aircraft_config)
        self.path_planner = PathPlanner(self.energy_model)
        self.visualizer = RouteVisualizer()
        self.report_generator = ReportGenerator()
        self.data_importer = DataImporter()
        
        self.waypoints: List[Waypoint] = []
        self.wind_conditions: List[WindCondition] = []
        self.no_fly_zones: List[NoFlyZone] = []
        self.last_result: Optional[CalculationResult] = None
    
    def load_data(
        self,
        waypoints_file: str = None,
        wind_file: str = None,
        no_fly_zones_file: str = None,
        aircraft_params_file: str = None
    ) -> List[Anomaly]:
        all_anomalies = []
        
        if waypoints_file and Path(waypoints_file).exists():
            waypoints, anomalies = self.data_importer.import_waypoints_csv(waypoints_file)
            self.waypoints = waypoints
            all_anomalies.extend(anomalies)
        
        if wind_file and Path(wind_file).exists():
            wind, anomalies = self.data_importer.import_wind_csv(wind_file)
            self.wind_conditions = wind
            all_anomalies.extend(anomalies)
        
        if no_fly_zones_file and Path(no_fly_zones_file).exists():
            zones, anomalies = self.data_importer.import_no_fly_zones_geojson(no_fly_zones_file)
            self.no_fly_zones = zones
            all_anomalies.extend(anomalies)
        
        if aircraft_params_file and Path(aircraft_params_file).exists():
            params, anomalies = self.data_importer.import_aircraft_params_json(aircraft_params_file)
            all_anomalies.extend(anomalies)
            for key, value in params.items():
                if hasattr(self.aircraft_config, key):
                    setattr(self.aircraft_config, key, value)
            self.energy_model = EnergyModel(self.aircraft_config)
            self.path_planner = PathPlanner(self.energy_model)
        
        return all_anomalies
    
    def set_waypoints(self, waypoints: List[Waypoint]):
        self.waypoints = waypoints
    
    def set_wind_conditions(self, wind_conditions: List[WindCondition]):
        self.wind_conditions = wind_conditions
    
    def set_no_fly_zones(self, no_fly_zones: List[NoFlyZone]):
        self.no_fly_zones = no_fly_zones
    
    def _calculate_input_hash(self) -> str:
        data_str = ""
        for wp in self.waypoints:
            data_str += f"{wp.waypoint_id},{wp.latitude},{wp.longitude};"
        for wind in self.wind_conditions:
            data_str += f"{wind.altitude_m},{wind.speed_m_s},{wind.direction_deg};"
        for zone in self.no_fly_zones:
            data_str += f"{zone.zone_id};"
        data_str += str(self.aircraft_config.__dict__)
        
        return hashlib.sha256(data_str.encode()).hexdigest()
    
    def _deduplicate_anomalies(self, anomalies: List[Anomaly]) -> List[Anomaly]:
        seen = set()
        unique_anomalies = []
        
        for anomaly in anomalies:
            key_parts = [
                anomaly.anomaly_type.value,
                anomaly.message,
                anomaly.source.file_name if anomaly.source else "",
                str(anomaly.source.line_number) if anomaly.source and anomaly.source.line_number else ""
            ]
            key = "|".join(key_parts)
            
            if key not in seen:
                seen.add(key)
                unique_anomalies.append(anomaly)
        
        return unique_anomalies
    
    def calculate(self) -> CalculationResult:
        start_time = time.time()
        
        input_hash = self._calculate_input_hash()
        
        critical_anomalies = [a for a in self.data_importer.anomalies 
                             if a.severity == AnomalySeverity.CRITICAL]
        
        if critical_anomalies:
            result = CalculationResult(
                input_hash=input_hash,
                all_anomalies=self.data_importer.anomalies,
                data_sources=self.data_importer.data_sources
            )
            result.is_valid = False
            return result
        
        optimal_route, candidate_routes = self.path_planner.generate_candidate_routes(
            self.waypoints, self.wind_conditions, self.no_fly_zones
        )
        
        all_anomalies = list(self.data_importer.anomalies)
        all_anomalies.extend(self.path_planner.get_all_anomalies())
        all_anomalies = self._deduplicate_anomalies(all_anomalies)
        
        calculation_time_ms = (time.time() - start_time) * 1000
        
        result = CalculationResult(
            input_hash=input_hash,
            optimal_route=optimal_route,
            candidate_routes=candidate_routes,
            all_anomalies=all_anomalies,
            calculation_time_ms=calculation_time_ms,
            data_sources=self.data_importer.data_sources,
            change_history=self.data_importer.change_history
        )
        
        self.last_result = result
        return result
    
    def generate_charts(self, result: CalculationResult = None) -> Dict[str, str]:
        result = result or self.last_result
        if not result or not result.optimal_route:
            return {}
        
        return self.visualizer.generate_all_charts(
            result.optimal_route,
            result.candidate_routes,
            self.waypoints,
            self.no_fly_zones,
            self.wind_conditions,
            result.all_anomalies
        )
    
    def generate_reports(self, result: CalculationResult = None, 
                         chart_files: Dict[str, str] = None) -> Dict[str, str]:
        result = result or self.last_result
        if not result:
            return {}
        
        if chart_files is None:
            chart_files = self.generate_charts(result)
        
        return self.report_generator.generate_all_reports(
            result, self.waypoints, chart_files
        )
    
    def run_full_pipeline(
        self,
        waypoints_file: str = None,
        wind_file: str = None,
        no_fly_zones_file: str = None,
        aircraft_params_file: str = None
    ) -> Dict[str, Any]:
        load_anomalies = self.load_data(
            waypoints_file, wind_file, no_fly_zones_file, aircraft_params_file
        )
        
        result = self.calculate()
        chart_files = self.generate_charts(result)
        report_files = self.generate_reports(result, chart_files)
        
        return {
            "result": result,
            "charts": chart_files,
            "reports": report_files,
            "load_anomalies": load_anomalies
        }
    
    def print_summary(self, result: CalculationResult = None):
        result = result or self.last_result
        if not result:
            print("没有计算结果")
            return
        
        print("\n" + "="*60)
        print("✈️  航线最小燃油规划 - 计算结果摘要")
        print("="*60)
        
        if result.optimal_route:
            route = result.optimal_route
            status = "✅ 可行" if route.is_valid else "❌ 存在问题"
            
            print(f"\n航线状态: {status}")
            print(f"总能耗: {route.total_energy_wh:.1f} Wh")
            print(f"总距离: {route.total_distance_m/1000:.2f} km")
            print(f"总飞行时间: {route.total_flight_time_s/60:.1f} 分钟")
            print(f"剩余电量: {route.remaining_battery_wh:.1f} Wh")
            
            print(f"\n航点顺序:")
            for i, wp_id in enumerate(route.waypoint_order):
                wp = next((w for w in self.waypoints if w.waypoint_id == wp_id), None)
                name = wp.name if wp else wp_id
                print(f"  {i+1}. {name}")
        
        if result.all_anomalies:
            print(f"\n⚠️  检测到 {len(result.all_anomalies)} 个异常:")
            for anomaly in result.all_anomalies:
                severity_icon = "🔴" if anomaly.severity.value == "critical" else "🟠" if anomaly.severity.value == "warning" else "🔵"
                source_info = ""
                if anomaly.source:
                    source_info = f" [{anomaly.source.file_name}"
                    if anomaly.source.line_number:
                        source_info += f":{anomaly.source.line_number}"
                    source_info += "]"
                print(f"  {severity_icon} {anomaly.message}{source_info}")
        
        print(f"\n📊 计算耗时: {result.calculation_time_ms:.2f} ms")
        print(f"📁 输出目录: {system_config.OUTPUT_DIR}/")
        print("="*60 + "\n")
