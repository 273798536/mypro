from typing import Dict, List, Optional, Tuple
import heapq
from .models import (
    Warehouse, Road, Vehicle, Demand, DispatchContext,
    DemandStatus, VehicleStatus, RoadStatus,
    ErrorType, DispatchError
)
from .shortest_path import ShortestPathCalculator


class DispatchResult:
    def __init__(self):
        self.assigned_routes: List[Dict] = []
        self.unassigned_demands: List[str] = []
        self.total_distance: float = 0.0


class PathCoverage:
    def __init__(self):
        self.covered_locations: set = set()
        self.covered_roads: set = set()

    def add_path(self, path: List[str], roads: List[str]):
        for loc in path:
            self.covered_locations.add(loc)
        for rid in roads:
            self.covered_roads.add(rid)


class Dispatcher:
    def __init__(self, context: DispatchContext):
        self.context = context
        self.path_calculator = ShortestPathCalculator(list(context.roads.values()))
        self.coverage = PathCoverage()
        self._run_count = 0

    def reset_for_rerun(self):
        for demand in self.context.demands.values():
            demand.status = DemandStatus.PENDING
            demand.assigned_vehicle = None
        
        for vehicle in self.context.vehicles.values():
            vehicle.status = VehicleStatus.AVAILABLE
            vehicle.current_load = 0
            vehicle.current_location = None
        
        self.coverage = PathCoverage()
        self._run_count += 1

    def _get_warehouse_locations(self) -> List[str]:
        return [w.location for w in self.context.warehouses.values()]

    def _find_best_warehouse_for_demand(self, demand: Demand) -> Tuple[Optional[Warehouse], float, List[str]]:
        warehouse_locations = self._get_warehouse_locations()
        
        best_warehouse = None
        best_distance = float('inf')
        best_path = []
        best_roads = []
        
        for warehouse in self.context.warehouses.values():
            can_supply = True
            for item, qty in demand.items.items():
                if not warehouse.has_inventory(item, qty):
                    can_supply = False
                    break
            
            if not can_supply:
                continue
            
            path, distance, roads = self.path_calculator.get_shortest_path(
                warehouse.location, demand.location
            )
            
            if path and distance < best_distance:
                best_distance = distance
                best_warehouse = warehouse
                best_path = path
                best_roads = roads
        
        return best_warehouse, best_distance, best_roads

    def _find_available_vehicle(self, required_capacity: int, depot_location: str) -> Optional[Vehicle]:
        suitable_vehicles = [
            v for v in self.context.vehicles.values()
            if v.status == VehicleStatus.AVAILABLE and v.can_load(required_capacity)
        ]
        
        if not suitable_vehicles:
            return None
        
        best_vehicle = None
        min_distance = float('inf')
        
        for vehicle in suitable_vehicles:
            if vehicle.current_location:
                _, distance, _ = self.path_calculator.get_shortest_path(
                    vehicle.current_location, depot_location
                )
            else:
                distance = 0
            
            if distance < min_distance:
                min_distance = distance
                best_vehicle = vehicle
        
        return best_vehicle

    def _find_any_available_vehicle(self, depot_location: str) -> Optional[Vehicle]:
        available_vehicles = [
            v for v in self.context.vehicles.values()
            if v.status == VehicleStatus.AVAILABLE
        ]
        
        if not available_vehicles:
            return None
        
        best_vehicle = None
        min_distance = float('inf')
        
        for vehicle in available_vehicles:
            if vehicle.current_location:
                _, distance, _ = self.path_calculator.get_shortest_path(
                    vehicle.current_location, depot_location
                )
            else:
                distance = 0
            
            if distance < min_distance:
                min_distance = distance
                best_vehicle = vehicle
        
        return best_vehicle

    def _validate_demand_unique(self, demand: Demand, source_file: str) -> bool:
        for existing_id, existing_demand in self.context.demands.items():
            if existing_id == demand.demand_id:
                continue
            if (existing_demand.location == demand.location and
                existing_demand.items == demand.items and
                existing_demand.priority == demand.priority):
                error = DispatchError(
                    error_id=f"dup_{demand.demand_id}",
                    error_type=ErrorType.DUPLICATE_DEMAND,
                    source_file=source_file,
                    location=demand.location,
                    details={
                        "demand_id": demand.demand_id,
                        "duplicate_with": existing_id,
                        "items": demand.items
                    },
                    next_step="请核对需求清单，移除重复的需求条目或更新需求ID"
                )
                self.context.errors.append(error)
                return False
        return True

    def _check_road_blockages(self, path: List[str], roads: List[str], source_file: str) -> bool:
        has_blockage = False
        
        for road_id in roads:
            road = self.context.roads.get(road_id)
            if road and road.status == RoadStatus.BLOCKED:
                has_blockage = True
                error = DispatchError(
                    error_id=f"block_{road_id}",
                    error_type=ErrorType.ROAD_BLOCKED,
                    source_file=source_file,
                    location=f"{road.from_location} -> {road.to_location}",
                    details={
                        "road_id": road_id,
                        "from": road.from_location,
                        "to": road.to_location,
                        "distance": road.distance,
                        "affected_path": path
                    },
                    next_step=f"请重新规划路线，避开 {road.from_location} 到 {road.to_location} 的路段"
                )
                self.context.errors.append(error)
        
        return has_blockage

    def _check_vehicle_overload(self, vehicle: Vehicle, load_amount: int, source_file: str, demand_id: str) -> bool:
        if load_amount > vehicle.capacity:
            error = DispatchError(
                error_id=f"overload_{vehicle.vehicle_id}",
                error_type=ErrorType.VEHICLE_OVERLOAD,
                source_file=source_file,
                location=vehicle.current_location or "depot",
                details={
                    "vehicle_id": vehicle.vehicle_id,
                    "plate_number": vehicle.plate_number,
                    "capacity": vehicle.capacity,
                    "requested_load": load_amount,
                    "demand_id": demand_id
                },
                next_step=f"请使用更大容量的车辆，或拆分需求ID {demand_id} 进行分批配送"
            )
            self.context.errors.append(error)
            return True
        return False

    def dispatch(self, source_file: str = "manual") -> DispatchResult:
        result = DispatchResult()
        
        sorted_demands = sorted(
            self.context.demands.values(),
            key=lambda d: (-d.priority, d.total_items)
        )
        
        for demand in sorted_demands:
            if demand.status != DemandStatus.PENDING:
                continue
            
            if not self._validate_demand_unique(demand, source_file):
                demand.status = DemandStatus.FAILED
                result.unassigned_demands.append(demand.demand_id)
                continue
            
            warehouse, distance, path = self._find_best_warehouse_for_demand(demand)
            
            if not warehouse:
                result.unassigned_demands.append(demand.demand_id)
                continue
            
            _, _, road_ids = self.path_calculator.get_shortest_path(
                warehouse.location, demand.location
            )
            
            if self._check_road_blockages(path, road_ids, source_file):
                demand.status = DemandStatus.FAILED
                result.unassigned_demands.append(demand.demand_id)
                continue
            
            vehicle = self._find_available_vehicle(demand.total_items, warehouse.location)
            
            if not vehicle:
                vehicle = self._find_any_available_vehicle(warehouse.location)
                if vehicle:
                    self._check_vehicle_overload(vehicle, demand.total_items, source_file, demand.demand_id)
                    demand.status = DemandStatus.FAILED
                    result.unassigned_demands.append(demand.demand_id)
                    continue
                else:
                    result.unassigned_demands.append(demand.demand_id)
                    continue
            
            if self._check_vehicle_overload(vehicle, demand.total_items, source_file, demand.demand_id):
                demand.status = DemandStatus.FAILED
                result.unassigned_demands.append(demand.demand_id)
                continue
            
            for item, qty in demand.items.items():
                warehouse.inventory[item] -= qty
            
            vehicle.current_load += demand.total_items
            vehicle.status = VehicleStatus.IN_SERVICE
            vehicle.current_location = demand.location
            
            demand.status = DemandStatus.ASSIGNED
            demand.assigned_vehicle = vehicle.vehicle_id
            
            self.coverage.add_path(path, road_ids)
            
            route_info = {
                "demand_id": demand.demand_id,
                "warehouse_id": warehouse.warehouse_id,
                "warehouse_name": warehouse.name,
                "vehicle_id": vehicle.vehicle_id,
                "vehicle_plate": vehicle.plate_number,
                "path": path,
                "road_ids": road_ids,
                "distance": distance,
                "items": demand.items
            }
            result.assigned_routes.append(route_info)
            result.total_distance += distance
        
        return result

    def get_coverage_summary(self) -> Dict:
        return {
            "covered_locations": list(self.coverage.covered_locations),
            "covered_roads": list(self.coverage.covered_roads),
            "location_coverage_rate": len(self.coverage.covered_locations) / max(1, len(self.context.roads) * 2),
            "road_coverage_rate": len(self.coverage.covered_roads) / max(1, len(self.context.roads))
        }
