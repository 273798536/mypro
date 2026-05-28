import itertools
import time
from typing import List, Dict, Tuple, Optional
from config import system_config
from models import (
    Waypoint, WindCondition, NoFlyZone, Route, RouteSegment,
    Anomaly, AnomalyType, AnomalySeverity, SourceLocation, WaypointType
)
from energy_model import EnergyModel
from geo_utils import check_no_fly_zone_crossing

class PathPlanner:
    def __init__(self, energy_model: EnergyModel):
        self.energy_model = energy_model
        self.anomalies: List[Anomaly] = []
    
    def _build_distance_matrix(
        self,
        waypoints: List[Waypoint],
        wind_conditions: List[WindCondition]
    ) -> Dict[Tuple[str, str], RouteSegment]:
        matrix = {}
        wp_map = {wp.waypoint_id: wp for wp in waypoints}
        
        for wp1_id, wp1 in wp_map.items():
            for wp2_id, wp2 in wp_map.items():
                if wp1_id != wp2_id:
                    segment = self.energy_model.create_route_segment(wp1, wp2, wind_conditions)
                    matrix[(wp1_id, wp2_id)] = segment
        
        return matrix
    
    def _find_start_end(self, waypoints: List[Waypoint]) -> Tuple[Optional[Waypoint], Optional[Waypoint]]:
        start_wp = None
        end_wp = None
        
        for wp in waypoints:
            if wp.waypoint_type == WaypointType.START:
                start_wp = wp
            elif wp.waypoint_type == WaypointType.END:
                end_wp = wp
        
        return start_wp, end_wp
    
    def _validate_route(
        self,
        waypoint_order: List[str],
        segment_matrix: Dict[Tuple[str, str], RouteSegment],
        waypoints: List[Waypoint],
        no_fly_zones: List[NoFlyZone]
    ) -> Tuple[Route, List[Anomaly]]:
        wp_map = {wp.waypoint_id: wp for wp in waypoints}
        segments: List[RouteSegment] = []
        total_distance = 0.0
        total_time = 0.0
        total_energy = 0.0
        route_anomalies: List[Anomaly] = []
        
        for i in range(len(waypoint_order) - 1):
            wp1_id = waypoint_order[i]
            wp2_id = waypoint_order[i + 1]
            
            segment = segment_matrix.get((wp1_id, wp2_id))
            if not segment:
                continue
            
            wp1 = wp_map[wp1_id]
            wp2 = wp_map[wp2_id]
            
            crosses_nfz, nfz_anomalies = check_no_fly_zone_crossing(wp1, wp2, no_fly_zones)
            if crosses_nfz:
                route_anomalies.extend(nfz_anomalies)
                segment.anomalies.extend(nfz_anomalies)
            
            segments.append(segment)
            total_distance += segment.distance_m
            total_time += segment.flight_time_s
            total_energy += segment.energy_used_wh
            route_anomalies.extend(segment.anomalies)
        
        remaining_battery = self.energy_model.aircraft.battery_capacity_wh - total_energy
        is_valid = True
        
        if total_energy > self.energy_model.aircraft.battery_capacity_wh * system_config.ENERGY_TOLERANCE:
            battery_anomaly = Anomaly(
                anomaly_type=AnomalyType.INSUFFICIENT_BATTERY,
                severity=AnomalySeverity.CRITICAL,
                message=f"电量不足: 需 {total_energy:.1f} Wh，电池仅 {self.energy_model.aircraft.battery_capacity_wh:.1f} Wh",
                source=SourceLocation(file_name="path_planner"),
                details={
                    "required_energy": total_energy,
                    "battery_capacity": self.energy_model.aircraft.battery_capacity_wh,
                    "deficit": total_energy - self.energy_model.aircraft.battery_capacity_wh
                }
            )
            route_anomalies.append(battery_anomaly)
            is_valid = False
        
        critical_anomalies = [a for a in route_anomalies if a.severity == AnomalySeverity.CRITICAL]
        if critical_anomalies:
            is_valid = False
        
        route = Route(
            waypoint_order=waypoint_order,
            segments=segments,
            total_distance_m=total_distance,
            total_flight_time_s=total_time,
            total_energy_wh=total_energy,
            remaining_battery_wh=remaining_battery,
            anomalies=route_anomalies,
            is_valid=is_valid
        )
        
        return route, route_anomalies
    
    def solve_tsp_nearest_neighbor(
        self,
        waypoints: List[Waypoint],
        wind_conditions: List[WindCondition],
        no_fly_zones: List[NoFlyZone]
    ) -> Route:
        if len(waypoints) < 2:
            raise ValueError("至少需要2个航点")
        
        start_wp, end_wp = self._find_start_end(waypoints)
        segment_matrix = self._build_distance_matrix(waypoints, wind_conditions)
        
        wp_map = {wp.waypoint_id: wp for wp in waypoints}
        all_wp_ids = set(wp_map.keys())
        
        if not start_wp:
            start_wp = waypoints[0]
        if not end_wp:
            end_wp = waypoints[-1]
        
        current_id = start_wp.waypoint_id
        visited = {current_id}
        path = [current_id]
        
        while visited != all_wp_ids:
            next_id = None
            min_energy = float('inf')
            
            for wp_id in all_wp_ids - visited:
                segment = segment_matrix.get((current_id, wp_id))
                if segment and segment.energy_used_wh < min_energy:
                    min_energy = segment.energy_used_wh
                    next_id = wp_id
            
            if next_id:
                path.append(next_id)
                visited.add(next_id)
                current_id = next_id
            else:
                break
        
        if end_wp and end_wp.waypoint_id != path[-1]:
            if end_wp.waypoint_id in path:
                path.remove(end_wp.waypoint_id)
            path.append(end_wp.waypoint_id)
        
        route, anomalies = self._validate_route(path, segment_matrix, waypoints, no_fly_zones)
        self.anomalies.extend(anomalies)
        
        return route
    
    def solve_tsp_bruteforce(
        self,
        waypoints: List[Waypoint],
        wind_conditions: List[WindCondition],
        no_fly_zones: List[NoFlyZone],
        max_waypoints: int = 8
    ) -> List[Route]:
        if len(waypoints) > max_waypoints:
            return [self.solve_tsp_nearest_neighbor(waypoints, wind_conditions, no_fly_zones)]
        
        start_wp, end_wp = self._find_start_end(waypoints)
        segment_matrix = self._build_distance_matrix(waypoints, wind_conditions)
        
        wp_map = {wp.waypoint_id: wp for wp in waypoints}
        middle_wps = [wp for wp in waypoints if wp.waypoint_id not in {
            start_wp.waypoint_id if start_wp else None,
            end_wp.waypoint_id if end_wp else None
        }]
        
        routes: List[Route] = []
        middle_ids = [wp.waypoint_id for wp in middle_wps]
        
        for perm in itertools.permutations(middle_ids):
            path = []
            if start_wp:
                path.append(start_wp.waypoint_id)
            path.extend(perm)
            if end_wp:
                path.append(end_wp.waypoint_id)
            
            if len(path) >= 2:
                route, anomalies = self._validate_route(path, segment_matrix, waypoints, no_fly_zones)
                routes.append(route)
                self.anomalies.extend(anomalies)
        
        routes.sort(key=lambda r: r.total_energy_wh if r.is_valid else float('inf'))
        return routes[:system_config.MAX_ROUTE_CANDIDATES]
    
    def solve_tsp_2opt(
        self,
        waypoints: List[Waypoint],
        wind_conditions: List[WindCondition],
        no_fly_zones: List[NoFlyZone],
        iterations: int = None
    ) -> Route:
        if iterations is None:
            iterations = system_config.TSP_OPTIMIZATION_ITERATIONS
        
        initial_route = self.solve_tsp_nearest_neighbor(waypoints, wind_conditions, no_fly_zones)
        segment_matrix = self._build_distance_matrix(waypoints, wind_conditions)
        wp_map = {wp.waypoint_id: wp for wp in waypoints}
        
        best_path = initial_route.waypoint_order[:]
        best_energy = initial_route.total_energy_wh
        
        improved = True
        iteration = 0
        
        while improved and iteration < iterations:
            improved = False
            iteration += 1
            
            for i in range(1, len(best_path) - 2):
                for j in range(i + 1, len(best_path)):
                    if j - i == 1:
                        continue
                    
                    new_path = best_path[:i] + best_path[i:j][::-1] + best_path[j:]
                    
                    route, _ = self._validate_route(new_path, segment_matrix, waypoints, no_fly_zones)
                    
                    if route.is_valid and route.total_energy_wh < best_energy:
                        best_path = new_path
                        best_energy = route.total_energy_wh
                        improved = True
        
        final_route, anomalies = self._validate_route(best_path, segment_matrix, waypoints, no_fly_zones)
        self.anomalies.extend(anomalies)
        
        return final_route
    
    def generate_candidate_routes(
        self,
        waypoints: List[Waypoint],
        wind_conditions: List[WindCondition],
        no_fly_zones: List[NoFlyZone]
    ) -> Tuple[Route, List[Route]]:
        all_anomalies = []
        
        route_2opt = self.solve_tsp_2opt(waypoints, wind_conditions, no_fly_zones)
        all_anomalies.extend(route_2opt.anomalies)
        
        if len(waypoints) <= 8:
            brute_routes = self.solve_tsp_bruteforce(waypoints, wind_conditions, no_fly_zones)
            for r in brute_routes:
                all_anomalies.extend(r.anomalies)
            candidates = brute_routes
        else:
            candidates = [route_2opt]
        
        valid_candidates = [r for r in candidates if r.is_valid]
        if valid_candidates:
            optimal = min(valid_candidates, key=lambda r: r.total_energy_wh)
        else:
            optimal = route_2opt
        
        return optimal, candidates
    
    def get_all_anomalies(self) -> List[Anomaly]:
        return self.anomalies
