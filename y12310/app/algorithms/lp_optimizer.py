import pulp
import math
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, field


@dataclass
class OptimizationResult:
    success: bool = False
    message: str = ""
    total_cost: float = 0.0
    assignments: List[Dict] = field(default_factory=list)
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
    
    def _get_transport_cost(self, warehouse, store):
        distance = self._calculate_distance(
            warehouse.latitude, warehouse.longitude,
            store.latitude, store.longitude
        )
        base_cost = 5
        cost_per_km = 2
        return base_cost + distance * cost_per_km
    
    def _check_conflicts(self):
        conflicts = []
        
        for wh_id, inv_list in self.dm.inventories.items():
            wh = self.dm.warehouses.get(wh_id)
            total_inv = sum(inv.quantity for inv in inv_list)
            if wh and total_inv > wh.max_capacity:
                conflicts.append({
                    "type": "capacity_violation",
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
        
        return conflicts
    
    def _check_time_conflicts(self, assignments):
        time_conflicts = []
        
        for assignment in assignments:
            store_id = assignment["store_id"]
            sku = assignment["sku"]
            quantity = assignment["quantity"]
            
            store = self.dm.stores.get(store_id)
            store_demands = self.dm.demands.get(store_id, [])
            
            for dem in store_demands:
                if dem.sku == sku and dem.deadline:
                    if dem.urgency == "urgent":
                        time_conflicts.append({
                            "type": "time_constraint",
                            "severity": "warning",
                            "description": f"门店 {store.name if store else store_id} 商品 {dem.sku_name} 为紧急需求",
                            "details": {
                                "store_id": store_id,
                                "store_name": store.name if store else store_id,
                                "sku": sku,
                                "sku_name": dem.sku_name,
                                "deadline": dem.deadline.isoformat() if dem.deadline else None,
                                "urgency": dem.urgency,
                                "assigned_quantity": quantity
                            },
                            "impact": "需要优先安排配送，确保按时到达"
                        })
        
        return time_conflicts
    
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
        
        prob = pulp.LpProblem("Warehouse_Allocation", pulp.LpMinimize)
        
        warehouses = list(self.dm.warehouses.values())
        stores = list(self.dm.stores.values())
        
        all_skus = set()
        for inv_list in self.dm.inventories.values():
            for inv in inv_list:
                all_skus.add(inv.sku)
        for dem_list in self.dm.demands.values():
            for dem in dem_list:
                all_skus.add(dem.sku)
        
        x = {}
        for wh in warehouses:
            for st in stores:
                for sku in all_skus:
                    var_name = f"x_{wh.id}_{st.id}_{sku}"
                    x[(wh.id, st.id, sku)] = pulp.LpVariable(
                        var_name, lowBound=0, cat='Continuous'
                    )
        
        total_cost = pulp.LpAffineExpression()
        for wh in warehouses:
            for st in stores:
                transport_cost = self._get_transport_cost(wh, st)
                for sku in all_skus:
                    total_cost += x[(wh.id, st.id, sku)] * transport_cost
        
        prob += total_cost, "Total_Transportation_Cost"
        
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
                    priority_weight = st.priority * (3 if dem.urgency == "urgent" else 1)
                    prob += total_received >= demand * 0.9, f"Demand_Const_{st.id}_{sku}"
        
        solver = pulp.PULP_CBC_CMD(msg=0)
        prob.solve(solver)
        
        if pulp.LpStatus[prob.status] != "Optimal":
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
                        
                        assignments.append({
                            "warehouse_id": wh.id,
                            "warehouse_name": wh.name,
                            "store_id": st.id,
                            "store_name": st.name,
                            "sku": sku,
                            "sku_name": sku_name,
                            "quantity": round(quantity, 2),
                            "transport_cost": self._get_transport_cost(wh, st) * quantity
                        })
        
        time_conflicts = self._check_time_conflicts(assignments)
        self.result.conflicts.extend(time_conflicts)
        
        self.result.success = True
        self.result.message = "优化成功"
        self.result.total_cost = round(pulp.value(prob.objective), 2)
        self.result.objective_value = pulp.value(prob.objective)
        self.result.assignments = assignments
        self.result.solve_time = (datetime.now() - start_time).total_seconds()
        
        return self.result
    
    def save_result(self, result: OptimizationResult, filepath: str):
        import json
        result_data = {
            "success": result.success,
            "message": result.message,
            "total_cost": result.total_cost,
            "objective_value": result.objective_value,
            "solve_time": result.solve_time,
            "assignments": result.assignments,
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
            objective_value=data.get("objective_value", 0.0),
            solve_time=data.get("solve_time", 0.0),
            assignments=data.get("assignments", []),
            conflicts=data.get("conflicts", []),
            warnings=data.get("warnings", [])
        )
        
        return result
