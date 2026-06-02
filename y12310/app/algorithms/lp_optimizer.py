import pulp
import math
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, field
from collections import defaultdict


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
    MAX_TRIPS_PER_VEHICLE = 3
    AVG_SPEED_KMH = 40
    LOADING_HOURS_PER_TRIP = 1.0

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
        return distance_km / self.AVG_SPEED_KMH + self.LOADING_HOURS_PER_TRIP

    def _get_transport_cost(self, warehouse, store):
        distance = self._calculate_distance(
            warehouse.latitude, warehouse.longitude,
            store.latitude, store.longitude
        )
        base_cost = 5
        cost_per_km = 2
        return base_cost + distance * cost_per_km

    def _get_route_delivery_hours(self, wh, st):
        distance = self._calculate_distance(
            wh.latitude, wh.longitude,
            st.latitude, st.longitude
        )
        return self._estimate_delivery_hours(distance)

    def _is_route_feasible_for_deadline(self, wh, st, deadline, trip_index=1):
        if not deadline:
            return True
        delivery_hours = self._get_route_delivery_hours(wh, st)
        total_hours = delivery_hours * trip_index
        time_available = (deadline - datetime.now()).total_seconds() / 3600
        return time_available >= total_hours

    def _compute_unit_penalty(self, wh, st, sku):
        store_demands = self.dm.demands.get(st.id, [])
        for dem in store_demands:
            if dem.sku == sku and dem.deadline:
                delivery_hours = self._get_route_delivery_hours(wh, st)
                time_available = (dem.deadline - datetime.now()).total_seconds() / 3600

                if dem.urgency == "urgent":
                    if not self._is_route_feasible_for_deadline(wh, st, dem.deadline):
                        return 200
                    elif time_available < delivery_hours * 2:
                        return 50
                    elif time_available < delivery_hours * 3:
                        return 20
                    else:
                        return 5
                else:
                    if not self._is_route_feasible_for_deadline(wh, st, dem.deadline):
                        return 100
                    elif time_available < delivery_hours * 2:
                        return 30
                    else:
                        return 0
        return 0

    def _get_warehouse_route_capacity(self, wh_id, vehicles):
        cap = 0.0
        for vh in vehicles:
            if vh.depot_warehouse_id == wh_id or not vh.depot_warehouse_id:
                cap += vh.max_capacity * self.MAX_TRIPS_PER_VEHICLE
        return cap

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
                if not dem.deadline:
                    continue
                any_feasible = False
                for wh in self.dm.warehouses.values():
                    if self._is_route_feasible_for_deadline(wh, st, dem.deadline):
                        any_feasible = True
                        break
                if not any_feasible:
                    conflicts.append({
                        "type": "deadline_unreachable",
                        "severity": "error",
                        "description": f"门店 {st.name if st else st_id} 商品 {dem.sku_name} 截止时间不可达",
                        "details": {
                            "store_id": st_id,
                            "store_name": st.name if st else st_id,
                            "sku": dem.sku,
                            "sku_name": dem.sku_name,
                            "deadline": dem.deadline.isoformat(),
                            "urgency": dem.urgency,
                            "quantity": dem.quantity
                        },
                        "impact": f"所有仓库均无法在截止时间前送达，将产生极高惩罚成本"
                    })
                elif dem.urgency == "urgent":
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
                        "impact": "时限惩罚成本将计入优化目标"
                    })

        return conflicts

    def _build_vehicle_assignments(self, assignments, vehicles, warehouses, stores):
        route_totals = defaultdict(float)
        for assign in assignments:
            key = (assign["warehouse_id"], assign["store_id"])
            route_totals[key] += assign["quantity"]

        warehouse_vehicles = defaultdict(list)
        for vh in vehicles:
            if vh.depot_warehouse_id:
                warehouse_vehicles[vh.depot_warehouse_id].append(vh)
            else:
                for wh in warehouses:
                    warehouse_vehicles[wh.id].append(vh)

        vehicle_assignments = []
        vehicle_total_loads = defaultdict(float)
        vehicle_trip_counts = defaultdict(int)
        conflicts = []

        for (wh_id, st_id), total_qty in route_totals.items():
            wh = next((w for w in warehouses if w.id == wh_id), None)
            st = next((s for s in stores if s.id == st_id), None)

            available_vans = warehouse_vehicles.get(wh_id, [])
            if not available_vans:
                available_vans = vehicles

            remaining = total_qty
            for vh in available_vans:
                if remaining <= 0.01:
                    break
                while remaining > 0.01 and vehicle_trip_counts[vh.id] < self.MAX_TRIPS_PER_VEHICLE:
                    current_trip_load = min(remaining, vh.max_capacity)
                    remaining -= current_trip_load
                    vehicle_trip_counts[vh.id] += 1
                    vehicle_total_loads[vh.id] += current_trip_load

                    vehicle_assignments.append({
                        "vehicle_id": vh.id,
                        "plate_number": vh.plate_number,
                        "warehouse_id": wh_id,
                        "warehouse_name": wh.name if wh else wh_id,
                        "store_id": st_id,
                        "store_name": st.name if st else st_id,
                        "trip_number": vehicle_trip_counts[vh.id],
                        "load": round(current_trip_load, 2),
                        "max_capacity": vh.max_capacity,
                        "utilization_rate": round(current_trip_load / vh.max_capacity * 100, 1)
                    })

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
                        "shortage": round(remaining, 2),
                        "available_vehicles": len(available_vans)
                    },
                    "impact": f"仍有 {remaining:.2f} 单位货物无法分配，需要额外车辆或增加趟次"
                })

        for vh in vehicles:
            if vehicle_trip_counts[vh.id] > self.MAX_TRIPS_PER_VEHICLE:
                conflicts.append({
                    "type": "excessive_trips",
                    "severity": "warning",
                    "description": f"车辆 {vh.plate_number} 需要 {vehicle_trip_counts[vh.id]} 趟配送",
                    "details": {
                        "vehicle_id": vh.id,
                        "plate_number": vh.plate_number,
                        "total_load": vehicle_total_loads[vh.id],
                        "max_capacity": vh.max_capacity,
                        "trips_required": vehicle_trip_counts[vh.id]
                    },
                    "impact": "超过建议趟次限制，可能影响到货时限"
                })

        return vehicle_assignments, vehicle_total_loads, conflicts

    def _get_vehicle_warehouse(self, vh, warehouses):
        if vh.depot_warehouse_id:
            return vh.depot_warehouse_id
        return warehouses[0].id if warehouses else None

    def _is_vehicle_trip_feasible(self, vh, trip_num, wh, st, deadline):
        if not deadline:
            return True
        delivery_hours = self._get_route_delivery_hours(wh, st)
        total_hours = delivery_hours * trip_num
        time_available = (deadline - datetime.now()).total_seconds() / 3600
        return time_available >= total_hours

    def optimize(self) -> OptimizationResult:
        start_time = datetime.now()

        conflicts = self._check_conflicts()
        self.result.conflicts = conflicts

        error_conflicts = [c for c in conflicts if c["severity"] == "error"]
        hard_errors = [c for c in error_conflicts if c["type"] != "deadline_unreachable"]
        if hard_errors:
            self.result.success = False
            self.result.message = "存在严重冲突，无法继续优化: " + "; ".join(c["description"] for c in hard_errors)
            self.result.solve_time = (datetime.now() - start_time).total_seconds()
            return self.result

        warehouses = list(self.dm.warehouses.values())
        stores = list(self.dm.stores.values())
        vehicles = [v for v in self.dm.vehicles.values() if v.available]
        trips = list(range(1, self.MAX_TRIPS_PER_VEHICLE + 1))

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

        prob = pulp.LpProblem("Warehouse_Allocation_VehicleTripLevel", pulp.LpMinimize)

        x = {}
        use_route = {}
        for vh in vehicles:
            vh_wh = self._get_vehicle_warehouse(vh, warehouses)
            for trip in trips:
                for st in stores:
                    route_key = (vh.id, trip, vh_wh, st.id)
                    use_route[route_key] = pulp.LpVariable(
                        f"use_{vh.id}_{trip}_{vh_wh}_{st.id}",
                        lowBound=0, upBound=1, cat='Binary'
                    )
                    for sku in all_skus:
                        var_name = f"x_{vh.id}_{trip}_{vh_wh}_{st.id}_{sku}"
                        x[(vh.id, trip, vh_wh, st.id, sku)] = pulp.LpVariable(
                            var_name, lowBound=0, cat='Continuous'
                        )

        total_transport_cost = pulp.LpAffineExpression()
        total_penalty_cost = pulp.LpAffineExpression()

        for vh in vehicles:
            vh_wh = self._get_vehicle_warehouse(vh, warehouses)
            wh_obj = next((w for w in warehouses if w.id == vh_wh), None)
            if not wh_obj:
                continue
            for trip in trips:
                for st in stores:
                    route_cost = self._get_transport_cost(wh_obj, st)
                    route_key = (vh.id, trip, vh_wh, st.id)
                    for sku in all_skus:
                        x_var = x[(vh.id, trip, vh_wh, st.id, sku)]
                        total_transport_cost += x_var * route_cost
                        unit_penalty = self._compute_unit_penalty(wh_obj, st, sku)
                        total_penalty_cost += x_var * unit_penalty

        prob += total_transport_cost + total_penalty_cost, "Total_Cost"

        for vh in vehicles:
            vh_wh = self._get_vehicle_warehouse(vh, warehouses)
            for trip in trips:
                route_count = pulp.lpSum([
                    use_route[(vh.id, trip, vh_wh, st.id)] for st in stores
                ])
                prob += route_count <= 1, f"OneRoutePerTrip_{vh.id}_{trip}"

        for vh in vehicles:
            vh_wh = self._get_vehicle_warehouse(vh, warehouses)
            wh_obj = next((w for w in warehouses if w.id == vh_wh), None)
            for trip in trips:
                for st in stores:
                    route_key = (vh.id, trip, vh_wh, st.id)
                    route_total = pulp.lpSum([
                        x[(vh.id, trip, vh_wh, st.id, sku)] for sku in all_skus
                    ])
                    prob += route_total <= vh.max_capacity * use_route[route_key], f"VehicleCap_{vh.id}_{trip}_{st.id}"

        for vh in vehicles:
            vh_wh = self._get_vehicle_warehouse(vh, warehouses)
            wh_obj = next((w for w in warehouses if w.id == vh_wh), None)
            if not wh_obj:
                continue
            for trip in trips:
                for st in stores:
                    for dem in self.dm.demands.get(st.id, []):
                        if dem.deadline and not self._is_vehicle_trip_feasible(vh, trip, wh_obj, st, dem.deadline):
                            prob += x[(vh.id, trip, vh_wh, st.id, dem.sku)] == 0, f"Deadline_{vh.id}_{trip}_{st.id}_{dem.sku}"

        for wh in warehouses:
            inv_list = self.dm.inventories.get(wh.id, [])
            for inv in inv_list:
                total_shipped = pulp.lpSum([
                    x[(vh.id, trip, wh.id, st.id, inv.sku)]
                    for vh in vehicles
                    for trip in trips
                    for st in stores
                    if self._get_vehicle_warehouse(vh, warehouses) == wh.id
                ])
                prob += total_shipped <= inv.quantity, f"Supply_{wh.id}_{inv.sku}"

        for st in stores:
            dem_list = self.dm.demands.get(st.id, [])
            for dem in dem_list:
                if dem.quantity > 0:
                    total_received = pulp.lpSum([
                        x[(vh.id, trip, self._get_vehicle_warehouse(vh, warehouses), st.id, dem.sku)]
                        for vh in vehicles
                        for trip in trips
                    ])
                    min_fill = 0.9 if dem.urgency == "urgent" else 0.8
                    prob += total_received >= dem.quantity * min_fill, f"Demand_{st.id}_{dem.sku}"

        solver = pulp.PULP_CBC_CMD(msg=0, timeLimit=180)
        prob.solve(solver)

        if pulp.LpStatus[prob.status] not in ["Optimal", "Feasible"]:
            self.result.success = False
            self.result.message = f"优化失败: {pulp.LpStatus[prob.status]}"
            self.result.solve_time = (datetime.now() - start_time).total_seconds()
            return self.result

        assignments = []
        vehicle_assignments = []
        route_sku_totals = defaultdict(lambda: defaultdict(float))
        route_sku_penalty = defaultdict(lambda: defaultdict(float))
        vehicle_trip_loads = defaultdict(float)

        for vh in vehicles:
            vh_wh = self._get_vehicle_warehouse(vh, warehouses)
            wh_obj = next((w for w in warehouses if w.id == vh_wh), None)
            if not wh_obj:
                continue
            for trip in trips:
                for st in stores:
                    route_used = use_route.get((vh.id, trip, vh_wh, st.id))
                    if route_used is not None and route_used.varValue is not None and route_used.varValue > 0.5:
                        trip_total = 0
                        for sku in all_skus:
                            qty = x[(vh.id, trip, vh_wh, st.id, sku)].varValue
                            if qty is not None and qty > 0.01:
                                route_sku_totals[(vh_wh, st.id)][sku] += qty
                                unit_pen = self._compute_unit_penalty(wh_obj, st, sku)
                                route_sku_penalty[(vh_wh, st.id)][sku] += unit_pen * qty
                                trip_total += qty
                        if trip_total > 0.01:
                            st_obj = next((s for s in stores if s.id == st.id), None)
                            delivery_hours = self._get_route_delivery_hours(wh_obj, st_obj) if wh_obj and st_obj else 0
                            vehicle_assignments.append({
                                "vehicle_id": vh.id,
                                "plate_number": vh.plate_number,
                                "warehouse_id": vh_wh,
                                "warehouse_name": wh_obj.name if wh_obj else vh_wh,
                                "store_id": st.id,
                                "store_name": st.name,
                                "trip_number": trip,
                                "load": round(trip_total, 2),
                                "max_capacity": vh.max_capacity,
                                "utilization_rate": round(trip_total / vh.max_capacity * 100, 1),
                                "delivery_hours": round(delivery_hours, 2)
                            })
                            vehicle_trip_loads[vh.id] += trip_total

        for (wh_id, st_id), sku_totals in route_sku_totals.items():
            wh_obj = next((w for w in warehouses if w.id == wh_id), None)
            st_obj = next((s for s in stores if s.id == st_id), None)
            for sku, quantity in sku_totals.items():
                if quantity > 0.01:
                    sku_name = ""
                    for inv in self.dm.inventories.get(wh_id, []):
                        if inv.sku == sku:
                            sku_name = inv.sku_name
                            break

                    distance = self._calculate_distance(
                        wh_obj.latitude, wh_obj.longitude,
                        st_obj.latitude, st_obj.longitude
                    ) if wh_obj and st_obj else 0
                    transport_cost = self._get_transport_cost(wh_obj, st_obj) * quantity if wh_obj and st_obj else 0
                    penalty_cost = route_sku_penalty[(wh_id, st_id)][sku]

                    deadline_info = self._get_deadline_info(wh_obj, st_obj, sku)

                    assignments.append({
                        "warehouse_id": wh_id,
                        "warehouse_name": wh_obj.name if wh_obj else wh_id,
                        "store_id": st_id,
                        "store_name": st_obj.name if st_obj else st_id,
                        "sku": sku,
                        "sku_name": sku_name,
                        "quantity": round(quantity, 2),
                        "distance_km": round(distance, 2),
                        "transport_cost": round(transport_cost, 2),
                        "penalty_cost": round(penalty_cost, 2),
                        "total_cost": round(transport_cost + penalty_cost, 2),
                        "deadline": deadline_info.get("deadline"),
                        "deadline_feasible": deadline_info.get("feasible", True),
                        "delivery_hours": round(self._get_route_delivery_hours(wh_obj, st_obj) if wh_obj and st_obj else 0, 2)
                    })

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

    def _get_deadline_info(self, warehouse, store, sku):
        store_demands = self.dm.demands.get(store.id, [])
        for dem in store_demands:
            if dem.sku == sku and dem.deadline:
                feasible = self._is_route_feasible_for_deadline(warehouse, store, dem.deadline)
                return {
                    "deadline": dem.deadline.isoformat(),
                    "urgency": dem.urgency,
                    "feasible": feasible
                }
        return {}

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
