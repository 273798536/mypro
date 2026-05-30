import pulp
from typing import Dict, List, Optional, Tuple

from .models import (
    Assignment, AssignmentStatus, DispatchResult, Employee, Station, Vehicle,
)


class ShuttleSolver:
    def __init__(
        self,
        employees: List[Employee],
        stations: List[Station],
        vehicles: List[Vehicle],
        max_buses_per_station: int = 10,
    ):
        self.employees = employees
        self.stations = [s for s in stations if s.status.value == "active"]
        self.closed_stations = [s for s in stations if s.status.value == "closed"]
        self.vehicles = vehicles
        self.max_buses = max_buses_per_station

        if not self.vehicles:
            raise ValueError("没有可用车辆，无法求解")

        self.vehicle_capacity = self.vehicles[0].capacity
        self.station_map: Dict[str, Station] = {s.id: s for s in self.stations}
        self.employee_map: Dict[str, Employee] = {e.id: e for e in self.employees}

        self._candidate_map = self._build_candidate_map()

    def _build_candidate_map(self) -> Dict[str, List[str]]:
        candidate_map: Dict[str, List[str]] = {}
        active_ids = set(s.id for s in self.stations)
        for emp in self.employees:
            valid = [sid for sid in emp.candidate_stations if sid in active_ids]
            candidate_map[emp.id] = valid
        return candidate_map

    def solve(self) -> DispatchResult:
        emp_ids = [e.id for e in self.employees]
        sta_ids = [s.id for s in self.stations]

        if not emp_ids or not sta_ids:
            return DispatchResult(
                is_feasible=False,
                infeasibility_reason="没有员工或没有可用站点",
            )

        unreachable = self._find_unreachable_employees()
        if unreachable:
            names = [self.employee_map[eid].name for eid in unreachable]
            return DispatchResult(
                is_feasible=False,
                infeasibility_reason=f"以下员工无可用候选站点: {', '.join(names)}",
            )

        prob = pulp.LpProblem("ShuttleDispatch", pulp.LpMinimize)

        x: Dict[Tuple[str, str], pulp.LpVariable] = {}
        for i in emp_ids:
            for j in self._candidate_map[i]:
                x[(i, j)] = pulp.LpVariable(f"x_{i}_{j}", cat=pulp.LpBinary)

        y: Dict[str, pulp.LpVariable] = {}
        for j in sta_ids:
            y[j] = pulp.LpVariable(f"y_{j}", cat=pulp.LpBinary)

        z: Dict[str, pulp.LpVariable] = {}
        for j in sta_ids:
            z[j] = pulp.LpVariable(f"z_{j}", lowBound=0, cat=pulp.LpInteger)

        prob += (
            pulp.lpSum(self.station_map[j].fixed_cost * y[j] for j in sta_ids)
            + pulp.lpSum(z[j] for j in sta_ids)
        )

        for i in emp_ids:
            prob += (
                pulp.lpSum(x[(i, j)] for j in self._candidate_map[i]) == 1,
                f"assign_once_{i}",
            )

        for i in emp_ids:
            for j in self._candidate_map[i]:
                prob += (
                    x[(i, j)] <= y[j],
                    f"station_open_{i}_{j}",
                )

        for j in sta_ids:
            prob += (
                pulp.lpSum(x[(i, j)] for i in emp_ids if (i, j) in x)
                <= z[j] * self.vehicle_capacity,
                f"capacity_{j}",
            )

        for j in sta_ids:
            prob += (z[j] <= self.max_buses * y[j], f"bus_limit_{j}")

        solver = pulp.PULP_CBC_CMD(msg=0)
        status = prob.solve(solver)

        if pulp.LpStatus[status] != "Optimal":
            return DispatchResult(
                is_feasible=False,
                infeasibility_reason=f"整数规划无最优解，求解状态: {pulp.LpStatus[status]}",
            )

        selected = [j for j in sta_ids if pulp.value(y[j]) is not None and pulp.value(y[j]) > 0.5]
        bus_count = {j: int(pulp.value(z[j]) or 0) for j in selected}

        emp_count: Dict[str, int] = {}
        assignments: List[Assignment] = []
        for i in emp_ids:
            for j in self._candidate_map[i]:
                if pulp.value(x[(i, j)]) is not None and pulp.value(x[(i, j)]) > 0.5:
                    emp_count[j] = emp_count.get(j, 0) + 1
                    assignments.append(
                        Assignment(employee_id=i, station_id=j)
                    )
                    break

        overflow = []
        for j in selected:
            assigned = emp_count.get(j, 0)
            cap = bus_count.get(j, 0) * self.vehicle_capacity
            if assigned > cap:
                overflow.append(j)

        return DispatchResult(
            assignments=assignments,
            selected_stations=selected,
            station_bus_count=bus_count,
            station_employee_count=emp_count,
            total_cost=pulp.value(prob.objective),
            is_feasible=True,
            overflow_stations=overflow,
        )

    def _find_unreachable_employees(self) -> List[str]:
        unreachable = []
        for eid, candidates in self._candidate_map.items():
            if not candidates:
                unreachable.append(eid)
        return unreachable

    def explain_capacity(self, result: DispatchResult) -> str:
        if not result.overflow_stations:
            return "所有站点容量充足，无超限。"

        lines = ["=== 容量超限拦截说明 ===", ""]
        for sid in result.overflow_stations:
            sta = self.station_map.get(sid)
            name = sta.name if sta else sid
            assigned = result.station_employee_count.get(sid, 0)
            buses = result.station_bus_count.get(sid, 0)
            cap = buses * self.vehicle_capacity
            overflow = assigned - cap
            lines.append(f"站点 [{name}] 容量超限:")
            lines.append(f"  - 已分配员工: {assigned} 人")
            lines.append(f"  - 班车数: {buses} 辆 × 容量 {self.vehicle_capacity} = {cap} 座")
            lines.append(f"  - 超出: {overflow} 人")
            lines.append(f"  - 拦截原因: 约束 capacity_{sid} 要求 Σx_i_{sid} ≤ z_{sid} × {self.vehicle_capacity}")
            lines.append(f"  - 当前求解器已在最优解下自动增加班车数，若仍超限则问题本身不可行")
            lines.append(f"  - 待确认: 需联系行政确认是否加车、拆分站点或调整员工候选")
            lines.append("")

        overflow_emps = []
        for a in result.assignments:
            if a.station_id in result.overflow_stations:
                emp = self.employee_map.get(a.employee_id)
                overflow_emps.append(emp.name if emp else a.employee_id)
        if overflow_emps:
            lines.append(f"受影响员工: {', '.join(overflow_emps)}")
            lines.append("下一步: 请行政核验这些员工是否可调至邻近站点或新增车辆")

        return "\n".join(lines)

    def explain_infeasibility(self, result: DispatchResult) -> str:
        if result.is_feasible:
            return "当前方案可行，无需说明。"
        lines = ["=== 不可行说明 ===", ""]
        lines.append(f"原因: {result.infeasibility_reason}")
        lines.append("")
        if self.closed_stations:
            lines.append("已关闭站点:")
            for s in self.closed_stations:
                lines.append(f"  - {s.name} ({s.id})")
            lines.append("下一步: 请行政核验是否需要重新开放已关闭站点")
        lines.append("")
        lines.append("当前活跃站点候选覆盖情况:")
        for emp in self.employees:
            valid = self._candidate_map.get(emp.id, [])
            lines.append(f"  - {emp.name}: 可选站点 {len(valid)} 个")
        return "\n".join(lines)
