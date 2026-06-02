import pulp
import math
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, field


@dataclass
class OptimizationResult:
    success: bool = False
    message: str = ""
    total_cost: float = 0.0
    transport_cost: float = 0.0
    penalty_cost: float = 0.0
    assignments: List[Dict] = field(default_factory=list)
    vehicle_assignments: List[Dict] = field(default_factory=list)
    conflicts: List[Dict] = field(default_factory=list)
    warnings: List[Dict] = field(default_factory=list)
    solve_time: float = 0.0
    objective_value: float = 0.0


@dataclass
class Conflict:
    conflict_type: str
    severity: str
    description: str
    affected_items: List[Dict]
    impact: str


class LinearProgrammingOptimizer:
    def __init__(self, data_manager):
        self.dm = data_manager
        self.result = OptimizationResult()
    
    def _calculate_distance(self, lat1, lon1, lat2, lon2):
        R = 6371
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c
    
    def _estimate_delivery_hours(self, distance_km):
        avg_speed_kmh = 40
        return distance_km / avg_speed_kmh + 1
    
    def _get_transport_cost(self, warehouse, store):
        distance = self._calculate_distance(
            warehouse.latitude, warehouse.longitude,
            store.latitude, store.longitude
        )
        base_cost = 5
        cost_per_km = 2
        return base_cost + distance * cost_per_km
    
    def _get_time_penalty(self, store, sku, quantity, distance):
        store_demands = self.dm.demands.get(store.id, [])
        for dem in store_demands:
            if dem.sku == sku and dem.deadline:
                delivery_hours = self._estimate_delivery_hours(distance)
                time_available = (dem.deadline - datetime.now()).total_seconds() / 3600
                
                if dem.urgency == "urgent":
                    if time_available < delivery_hours:
                        return quantity * 50
                    elif time_available < delivery_hours * 2:
                        return quantity * 20
                    else:
                        return quantity * 5
                else:
                    if time_available < delivery_hours:
                        return quantity * 30
                    else:
                        return 0
        return 0
    
    def _check_conflicts(self):
        conflicts = []
        
        for wh_id, inv_list in self.dm.inventories.items():
            wh = self.dm.warehouses.get(wh_id)
            total_inv = sum(inv.quantity for inv in inv_list)
            if wh and total_inv > wh.max_capacity:
                conflicts.append({
                    "type": "warehouse_capacity_violation",
                    "severity": "warning",
                    "description": f"仓库 {wh.name} 库存超过最大容量",
                    "details": {
                        "warehouse_id": wh_id,
                        "warehouse_name": wh.name,
                        "current_inventory": total_inv,
                        "max_capacity": wh.max_capacity,
                        "overflow": total_inv - wh.max_capacity
                    },
                    "impact": f"超出容量 {total_inv - wh.max_capacity} 单位，可能导致仓储成本增加"
                })
        
        available_vehicles = [v for v in self.dm.vehicles.values() if v.available]
        if not available_vehicles:
            conflicts.append({
                "type": "no_available_vehicles",
                "severity": "error",
                "description": "没有可用车辆",
                "details": {},
                "impact": "无法进行配送，优化将失败"
            })
        
        total_vehicle_capacity = sum(v.max_capacity for v in available_vehicles)
        total_demand_qty = sum(
            dem.quantity 
            for dem_list in self.dm.demands.values() 
            for dem in dem_list
        )
        if total_demand_qty > total_vehicle_capacity * 3:
            conflicts.append({
                "type": "vehicle_capacity_insufficient",
                "severity": "warning",
                "description": "车辆总运力可能不足，可能需要多趟配送",
                "details": {
                    "total_demand": total_demand_qty,
                    "total_vehicle_capacity": total_vehicle_capacity,
                    "available_vehicles": len(available_vehicles)
                },
                "impact": f"需求 {total_demand_qty} 单位，车辆总容量 {total_vehicle_capacity} 单位"
            })
        
        for st_id, dem_list in self.dm.demands.items():
            st = self.dm.stores.get(st_id)
            for dem in dem_list:
                if dem.quantity <= 0:
                    conflicts.append({
                        "type": "zero_demand",
                        "severity": "info",
                        "description": f"门店 {st.name if st else st_id} 商品 {dem.sku_name} 需求为零",
                        "details": {
                            "store_id": st_id,
                            "store_name": st.name if st else st_id,
                            "sku": dem.sku,
                            "sku_name": dem.sku_name,
                            "demand_quantity": dem.quantity
                        },
                        "impact": "该需求将被自动忽略"
                    })
        
        sku_total_demand = {}
        sku_total_inventory = {}
        
        for st_id, dem_list in self.dm.demands.items():
            for dem in dem_list:
                if dem.sku not in sku_total_demand:
                    sku_total_demand[dem.sku] = 0
                    sku_total_inventory[dem.sku] = 0
                sku_total_demand[dem.sku] += dem.quantity
        
        for wh_id, inv_list in self.dm.inventories.items():
            for inv in inv_list:
                if inv.sku not in sku_total_inventory:
                    sku_total_inventory[inv.sku] = 0
                sku_total_inventory[inv.sku] += inv.quantity
        
        for sku, total_demand in sku_total_demand.items():
            total_inv = sku_total_inventory.get(sku, 0)
            if total_demand > 0 and total_inv <= 0:
                conflicts.append({
                    "type": "zero_inventory",
                    "severity": "error",
                    "description": f"商品 {sku} 库存为零但存在需求",
                    "details": {
                        "sku": sku,
                        "total_demand": total_demand,
                        "total_inventory": total_inv
                    },
                    "impact": f"该商品 {total_demand} 单位需求无法满足"
                })
            elif total_demand > total_inv:
                conflicts.append({
                    "type": "insufficient_inventory",
                    "severity": "warning",
                    "description": f"商品 {sku} 库存不足",
                    "details": {
                        "sku": sku,
                        "total_demand": total_demand,
                        "total_inventory": total_inv,
                        "shortage": total_demand - total_inv
                    },
                    "impact": f"缺口 {total_demand - total_inv} 单位，部分门店需求无法满足"
                })
        
        for st_id, dem_list in self.dm.demands.items():
            st = self.dm.stores.get(st_id)
            for dem in dem_list:
                if dem.deadline and dem.urgency == "urgent":
                    conflicts.append({
                        "type": "urgent_delivery",
                        "severity": "warning",
                        "description": f"门店 {st.name if st else st_id} 商品 {dem.sku_name} 为紧急需求",
                        "details": {
                            "store_id": st_id,
                            "store_name": st.name if st else st_id,
                            "sku": dem.sku,
                            "sku_name": dem.sku_name,
                            "deadline": dem.deadline.isoformat(),
                            "quantity": dem.quantity
                        },
                        "impact": "将产生时限惩罚成本，建议优先安排"
                    })
        
        return conflicts
    
    def _assign_to_vehicles(self, assignments, vehicles, warehouses, stores):
        from collections import defaultdict
        
        route_totals = defaultdict(float)
        route_details = defaultdict(list)
        for assign in assignments:
            key = (assign["warehouse_id"], assign["store_id"])
            route_totals[key] += assign["quantity"]
            route_details[key].append(assign)
        
        warehouse_vehicles = defaultdict(list)
        for vh in vehicles:
            if vh.depot_warehouse_id:
                warehouse_vehicles[vh.depot_warehouse_id].append(vh)
            else:
                for wh in warehouses:
                    warehouse_vehicles[wh.id].append(vh)
        
        vehicle_assignments = []
        vehicle_loads = {vh.id: 0.0 for vh in vehicles}
        conflicts = []
        
        for (wh_id, st_id), total_qty in route_totals.items():
            wh = next((w for w in warehouses if w.id == wh_id), None)
            st = next((s for s in stores if s.id == st_id), None)
            
            available_vans = warehouse_vehicles.get(wh_id, [])
            if not available_vans:
                available_vans = vehicles
            
            remaining = total_qty
            trips = 0
            max_trips_per_vehicle = 3
            
            while remaining > 0.01 and trips < len(available_vans) * max_trips_per_vehicle:
                assigned = False
                for vh in available_vans:
                    current_load = vehicle_loads[vh.id]
                    available_cap = vh.max_capacity - (current_load % vh.max_capacity)
                    
                    if remaining <= available_cap:
                        load_amount = remaining
                        vehicle_loads[vh.id] += load_amount
                        remaining = 0
                    else:
                        load_amount = available_cap
                        vehicle_loads[vh.id] += load_amount
                        remaining -= available_cap
                    
                    trips += 1
                    assigned = True
                    
                    total_trips_for_vehicle = math.ceil(vehicle_loads[vh.id] / vh.max_capacity)
                    current_trip_load = vehicle_loads[vh.id] - (total_trips_for_vehicle - 1) * vh.max_capacity
                    
                    vehicle_assignments.append({
                        "vehicle_id": vh.id,
                        "plate_number": vh.plate_number,
                        "warehouse_id": wh_id,
                        "warehouse_name": wh.name if wh else wh_id,
                        "store_id": st_id,
                        "store_name": st.name if st else st_id,
                        "trip_number": total_trips_for_vehicle,
                        "load": round(load_amount, 2),
                        "current_trip_load": round(current_trip_load, 2),
                        "max_capacity": vh.max_capacity,
                        "utilization_rate": round(current_trip_load / vh.max_capacity * 100, 1)
                    })
                    
                    if remaining <= 0.01:
                        break
                
                if not assigned:
                    break
            
            if remaining > 0.01:
                conflicts.append({
                    "type": "vehicle_capacity_exceeded",
                    "severity": "warning",
                    "description": f"路线 {wh.name if wh else wh_id} → {st.name if st else st_id} 车辆运力不足",
                    "details": {
                        "warehouse_id": wh_id,
                        "store_id": st_id,
                        "required_capacity": total_qty,
                        "assigned_capacity": total_qty - remaining,
                        "shortage": remaining,
                        "available_vehicles": len(available_vans)
                    },
                    "impact": f"仍有 {remaining:.2f} 单位货物无法分配，需要额外车辆或增加趟次"
                })
        
        for vh in vehicles:
            total_load = vehicle_loads[vh.id]
            num_trips = math.ceil(total_load / vh.max_capacity)
            if num_trips > 3:
                conflicts.append({
                    "type": "excessive_trips",
                    "severity": "warning",
                    "description": f"车辆 {vh.plate_number} 需要 {num_trips} 趟配送",
                    "details": {
                        "vehicle_id": vh.id,
                        "plate_number": vh.plate_number,
                        "total_load": total_load,
                        "max_capacity": vh.max_capacity,
                        "trips_required": num_trips,
                        "recommended_max_trips": 3
                    },
                    "impact": f"超过建议的每日3趟限制，可能影响到货时限"
                })
        
        return vehicle_assignments, vehicle_loads, conflicts
    
    def _check_result_conflicts(self, assignments, vehicle_loads):
        conflicts = []
        
        for vh_id, load in vehicle_loads.items():
            vh = self.dm.vehicles.get(vh_id)
            if vh and load > vh.max_capacity:
                conflicts.append({
                    "type": "vehicle_overload",
                    "severity": "error",
                    "description": f"车辆 {vh.plate_number} 超载",
                    "details": {
                        "vehicle_id": vh_id,
                        "plate_number": vh.plate_number,
                        "assigned_load": load,
                        "max_capacity": vh.max_capacity,
                        "overload": load - vh.max_capacity
                    },
                    "impact": f"超载 {load - vh.max_capacity} 单位，违反车辆容量约束"
                })
        
        return conflicts
    
    def optimize(self) -> OptimizationResult:
        start_time = datetime.now()
        
        conflicts = self._check_conflicts()
        self.result.conflicts = conflicts
        
        error_conflicts = [c for c in conflicts if c["severity"] == "error"]
        if error_conflicts:
            self.result.success = False
            self.result.message = "存在严重冲突，无法继续优化"
            self.result.solve_time = (datetime.now() - start_time).total_seconds()
            return self.result
        
        warehouses = list(self.dm.warehouses.values())
        stores = list(self.dm.stores.values())
        vehicles = [v for v in self.dm.vehicles.values() if v.available]
        
        if not warehouses or not stores or not vehicles:
            self.result.success = False
            self.result.message = "缺少必要数据（仓库、门店或车辆）"
            self.result.solve_time = (datetime.now() - start_time).total_seconds()
            return self.result
        
        all_skus = set()
        for inv_list in self.dm.inventories.values():
            for inv in inv_list:
                all_skus.add(inv.sku)
        for dem_list in self.dm.demands.values():
            for dem in dem_list:
                all_skus.add(dem.sku)
        
        prob = pulp.LpProblem("Warehouse_Allocation", pulp.LpMinimize)
        
        x = {}
        for wh in warehouses:
            for st in stores:
                for sku in all_skus:
                    var_name = f"x_{wh.id}_{st.id}_{sku}"
                    x[(wh.id, st.id, sku)] = pulp.LpVariable(
                        var_name, lowBound=0, cat='Continuous'
                    )
        
        total_transport_cost = pulp.LpAffineExpression()
        total_penalty_cost = pulp.LpAffineExpression()
        
        for wh in warehouses:
            for st in stores:
                distance = self._calculate_distance(
                    wh.latitude, wh.longitude,
                    st.latitude, st.longitude
                )
                route_cost = self._get_transport_cost(wh, st)
                
                for sku in all_skus:
                    total_transport_cost += x[(wh.id, st.id, sku)] * route_cost
                    penalty = self._get_time_penalty(st, sku, 1, distance)
                    total_penalty_cost += x[(wh.id, st.id, sku)] * penalty
        
        prob += total_transport_cost + total_penalty_cost, "Total_Cost"
        
        for wh in warehouses:
            inv_list = self.dm.inventories.get(wh.id, [])
            for inv in inv_list:
                sku = inv.sku
                supply = inv.quantity
                total_shipped = pulp.lpSum([
                    x[(wh.id, st.id, sku)] for st in stores
                ])
                prob += total_shipped <= supply, f"Supply_Const_{wh.id}_{sku}"
        
        for st in stores:
            dem_list = self.dm.demands.get(st.id, [])
            for dem in dem_list:
                sku = dem.sku
                demand = dem.quantity
                if demand > 0:
                    total_received = pulp.lpSum([
                        x[(wh.id, st.id, sku)] for wh in warehouses
                    ])
                    min_fill_rate = 0.9 if dem.urgency == "urgent" else 0.8
                    prob += total_received >= demand * min_fill_rate, f"Demand_Const_{st.id}_{sku}"
        
        solver = pulp.PULP_CBC_CMD(msg=0, timeLimit=60)
        prob.solve(solver)
        
        if pulp.LpStatus[prob.status] not in ["Optimal", "Feasible"]:
            self.result.success = False
            self.result.message = f"优化失败: {pulp.LpStatus[prob.status]}"
            self.result.solve_time = (datetime.now() - start_time).total_seconds()
            return self.result
        
        assignments = []
        for wh in warehouses:
            for st in stores:
                for sku in all_skus:
                    quantity = x[(wh.id, st.id, sku)].varValue
                    if quantity and quantity > 0.01:
                        inv_list = self.dm.inventories.get(wh.id, [])
                        sku_name = ""
                        for inv in inv_list:
                            if inv.sku == sku:
                                sku_name = inv.sku_name
                                break
                        
                        distance = self._calculate_distance(
                            wh.latitude, wh.longitude,
                            st.latitude, st.longitude
                        )
                        transport_cost = self._get_transport_cost(wh, st) * quantity
                        penalty_cost = self._get_time_penalty(st, sku, quantity, distance)
                        
                        assignments.append({
                            "warehouse_id": wh.id,
                            "warehouse_name": wh.name,
                            "store_id": st.id,
                            "store_name": st.name,
                            "sku": sku,
                            "sku_name": sku_name,
                            "quantity": round(quantity, 2),
                            "distance_km": round(distance, 2),
                            "transport_cost": round(transport_cost, 2),
                            "penalty_cost": round(penalty_cost, 2),
                            "total_cost": round(transport_cost + penalty_cost, 2)
                        })
        
        vehicle_assignments, vehicle_loads, vehicle_conflicts = self._assign_to_vehicles(
            assignments, vehicles, warehouses, stores
        )
        self.result.conflicts.extend(vehicle_conflicts)
        
        self.result.success = True
        self.result.message = "优化成功"
        self.result.objective_value = pulp.value(prob.objective)
        self.result.total_cost = round(pulp.value(prob.objective) or 0, 2)
        self.result.transport_cost = round(pulp.value(total_transport_cost) or 0, 2)
        self.result.penalty_cost = round(pulp.value(total_penalty_cost) or 0, 2)
        self.result.assignments = assignments
        self.result.vehicle_assignments = vehicle_assignments
        self.result.solve_time = (datetime.now() - start_time).total_seconds()
        
        return self.result
    
    def save_result(self, result: OptimizationResult, filepath: str):
        import json
        result_data = {
            "success": result.success,
            "message": result.message,
            "total_cost": result.total_cost,
            "transport_cost": result.transport_cost,
            "penalty_cost": result.penalty_cost,
            "objective_value": result.objective_value,
            "solve_time": result.solve_time,
            "assignments": result.assignments,
            "vehicle_assignments": result.vehicle_assignments,
            "conflicts": result.conflicts,
            "warnings": result.warnings,
            "saved_at": datetime.now().isoformat(),
            "data_version": self.dm.current_version
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(result_data, f, indent=2, ensure_ascii=False)
        
        return filepath
    
    def load_result(self, filepath: str) -> OptimizationResult:
        import json
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        result = OptimizationResult(
            success=data.get("success", False),
            message=data.get("message", ""),
            total_cost=data.get("total_cost", 0.0),
            transport_cost=data.get("transport_cost", 0.0),
            penalty_cost=data.get("penalty_cost", 0.0),
            objective_value=data.get("objective_value", 0.0),
            solve_time=data.get("solve_time", 0.0),
            assignments=data.get("assignments", []),
            vehicle_assignments=data.get("vehicle_assignments", []),
            conflicts=data.get("conflicts", []),
            warnings=data.get("warnings", [])
        )
        
        return result
