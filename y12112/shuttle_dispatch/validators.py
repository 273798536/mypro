from typing import Dict, List, Optional, Tuple

from .models import (
    Assignment, AssignmentStatus, DispatchResult, Employee, Schedule,
    Station, StationStatus, Vehicle,
)


class Validator:
    def __init__(
        self,
        employees: List[Employee],
        stations: List[Station],
        vehicles: List[Vehicle],
    ):
        self.employees = employees
        self.stations = stations
        self.vehicles = vehicles
        self.employee_map: Dict[str, Employee] = {e.id: e for e in employees}
        self.station_map: Dict[str, Station] = {s.id: s for s in stations}

    def check_capacity_overflow(
        self, result: DispatchResult
    ) -> Tuple[List[Assignment], str]:
        if not result.is_feasible:
            return [], result.infeasibility_reason

        overflow_assignments: List[Assignment] = []
        vehicle_capacity = self.vehicles[0].capacity if self.vehicles else 0

        for sid in result.selected_stations:
            assigned = result.station_employee_count.get(sid, 0)
            buses = result.station_bus_count.get(sid, 0)
            total_cap = buses * vehicle_capacity

            if assigned > total_cap:
                sta = self.station_map.get(sid)
                sta_name = sta.name if sta else sid
                for a in result.assignments:
                    if a.station_id == sid:
                        a.status = AssignmentStatus.OVERFLOW
                        a.overflow_reason = (
                            f"站点{sta_name}容量不足: {assigned}人 > {buses}车×{vehicle_capacity}座={total_cap}座"
                        )
                        a.next_action = "联系行政确认: 加车/拆分站点/调整员工候选"
                        overflow_assignments.append(a)

        if not overflow_assignments:
            return [], "容量校验通过"

        report_lines = ["=== 容量超限 → 待确认分支 ===", ""]
        by_station: Dict[str, List[Assignment]] = {}
        for a in overflow_assignments:
            by_station.setdefault(a.station_id, []).append(a)

        for sid, assigns in by_station.items():
            sta = self.station_map.get(sid)
            sta_name = sta.name if sta else sid
            report_lines.append(f"站点 [{sta_name}]:")
            for a in assigns:
                emp = self.employee_map.get(a.employee_id)
                emp_name = emp.name if emp else a.employee_id
                report_lines.append(f"  - 员工 {emp_name}: {a.overflow_reason}")
                report_lines.append(f"    → {a.next_action}")
            report_lines.append("")

        report_lines.append("拦截逻辑: 整数规划约束 capacity_j 要求 Σx_ij ≤ z_j × CAP，")
        report_lines.append("当求解器无法在给定班车数上限内满足时，该约束被违反即走待确认分支。")

        return overflow_assignments, "\n".join(report_lines)

    def check_employee_duplication(
        self, employees: List[Employee]
    ) -> Tuple[List[Employee], str]:
        seen_ids: Dict[str, List[str]] = {}
        seen_names: Dict[str, List[str]] = {}

        for emp in employees:
            seen_ids.setdefault(emp.id, []).append(emp.name)
            seen_names.setdefault(emp.name, []).append(emp.id)

        id_dups = {eid: names for eid, names in seen_ids.items() if len(names) > 1}
        name_dups = {name: ids for name, ids in seen_names.items() if len(ids) > 1}

        if not id_dups and not name_dups:
            return [], "员工重复校验通过"

        report_lines = ["=== 员工重复检测 ===", ""]
        dup_employees: List[Employee] = []

        if id_dups:
            report_lines.append("ID重复 (同一ID出现多次):")
            for eid, names in id_dups.items():
                report_lines.append(f"  - ID {eid}: 出现在 {', '.join(names)}")
                report_lines.append(f"    → 下一步: 请HR核验是否为同一人重复录入")
            report_lines.append("")

        if name_dups:
            report_lines.append("姓名重复 (不同ID同名):")
            for name, ids in name_dups.items():
                report_lines.append(f"  - 姓名 {name}: ID {', '.join(ids)}")
                report_lines.append(f"    → 下一步: 请HR核验是否为不同人同名或录入错误")
            report_lines.append("")

        all_dup_ids = set(id_dups.keys())
        for name_ids in name_dups.values():
            all_dup_ids.update(name_ids)
        dup_employees = [e for e in employees if e.id in all_dup_ids]

        return dup_employees, "\n".join(report_lines)

    def check_station_closure_impact(
        self, station_id: str, employees: List[Employee], stations: List[Station]
    ) -> Tuple[List[Employee], str]:
        active_ids = {s.id for s in stations if s.status == StationStatus.ACTIVE}
        target = self.station_map.get(station_id)
        if not target:
            return [], f"站点 {station_id} 不存在"

        remaining = active_ids - {station_id}
        affected: List[Employee] = []

        for emp in employees:
            candidates = set(emp.candidate_stations)
            if station_id in candidates:
                after = candidates & remaining
                if not after:
                    affected.append(emp)

        sta_name = target.name
        if not affected:
            return [], f"关闭站点 [{sta_name}] 不影响任何员工（所有受影响员工均有备选站点）"

        report_lines = ["=== 站点关闭影响分析 ===", ""]
        report_lines.append(f"拟关闭站点: [{sta_name}] ({station_id})")
        report_lines.append("")
        report_lines.append(f"受影响员工 ({len(affected)} 人，关闭后无可用站点):")
        for emp in affected:
            report_lines.append(f"  - {emp.name} ({emp.address})")
            report_lines.append(f"    原候选: {', '.join(emp.candidate_stations)}")
        report_lines.append("")
        report_lines.append("下一步: 请行政核验以下选项:")
        report_lines.append("  1. 为受影响员工添加新的候选站点")
        report_lines.append("  2. 保留该站点不关闭")
        report_lines.append("  3. 安排其他交通方式")

        return affected, "\n".join(report_lines)

    def full_validate(
        self, result: DispatchResult
    ) -> Dict[str, Tuple[List, str]]:
        reports: Dict[str, Tuple[List, str]] = {}

        overflow_items, overflow_report = self.check_capacity_overflow(result)
        reports["capacity_overflow"] = (overflow_items, overflow_report)

        dup_items, dup_report = self.check_employee_duplication(self.employees)
        reports["employee_duplication"] = (dup_items, dup_report)

        return reports
