import csv
import io
import json
from datetime import datetime
from typing import Dict, List, Optional

from .models import (
    Assignment, AssignmentStatus, DispatchResult, DispatchSnapshot,
    Employee, Schedule, Station, Vehicle,
)


class Exporter:
    def __init__(
        self,
        employees: List[Employee],
        stations: List[Station],
        vehicles: List[Vehicle],
        schedules: Optional[List[Schedule]] = None,
    ):
        self.employees = employees
        self.stations = stations
        self.vehicles = vehicles
        self.schedules = schedules or []
        self.employee_map: Dict[str, Employee] = {e.id: e for e in employees}
        self.station_map: Dict[str, Station] = {s.id: s for s in stations}
        self.schedule_map: Dict[str, Schedule] = {s.id: s for s in self.schedules}
        self.vehicle_map: Dict[str, Vehicle] = {v.id: v for v in vehicles}

    def trace_forward(self, employee_id: str, result: DispatchResult) -> str:
        emp = self.employee_map.get(employee_id)
        if not emp:
            return f"员工 {employee_id} 不存在"

        lines = [f"=== 正向追溯: 员工住址 → 最终结果 ===", ""]
        lines.append(f"员工: {emp.name} ({emp.id})")
        lines.append(f"住址: {emp.address}")
        lines.append(f"候选站点: {', '.join(emp.candidate_stations)}")
        lines.append("")

        assignment = None
        for a in result.assignments:
            if a.employee_id == employee_id:
                assignment = a
                break

        if not assignment:
            lines.append("未分配到任何站点 (方案不可行或员工无可用站点)")
            return "\n".join(lines)

        sta = self.station_map.get(assignment.station_id)
        sta_name = sta.name if sta else assignment.station_id
        lines.append(f"→ 分配站点: [{sta_name}] ({assignment.station_id})")

        if assignment.schedule_id:
            sched = self.schedule_map.get(assignment.schedule_id)
            if sched:
                veh = self.vehicle_map.get(sched.vehicle_id)
                lines.append(f"→ 班次: {sched.departure_time}")
                lines.append(f"→ 车牌: {veh.plate if veh else sched.vehicle_id}")
                lines.append(f"→ 车辆容量: {veh.capacity if veh else '未知'}")

        lines.append(f"→ 状态: {assignment.status.value}")
        if assignment.overflow_reason:
            lines.append(f"→ 超限原因: {assignment.overflow_reason}")
        if assignment.next_action:
            lines.append(f"→ 下一步: {assignment.next_action}")

        return "\n".join(lines)

    def trace_backward(self, station_id: str, result: DispatchResult) -> str:
        sta = self.station_map.get(station_id)
        if not sta:
            return f"站点 {station_id} 不存在"

        lines = [f"=== 反向追溯: 结果 → 站点候选 ===", ""]
        lines.append(f"站点: [{sta.name}] ({station_id})")
        lines.append(f"位置: {sta.location}")
        lines.append(f"状态: {sta.status.value}")

        if station_id not in result.selected_stations:
            lines.append("该站点未被选中 (未在调度方案中开放)")
            return "\n".join(lines)

        buses = result.station_bus_count.get(station_id, 0)
        emp_count = result.station_employee_count.get(station_id, 0)
        vehicle_capacity = self.vehicles[0].capacity if self.vehicles else 0

        lines.append(f"班车数: {buses} 辆")
        lines.append(f"分配员工: {emp_count} 人")
        lines.append(f"容量: {buses} × {vehicle_capacity} = {buses * vehicle_capacity} 座")

        station_schedules = [s for s in self.schedules if s.station_id == station_id]
        if station_schedules:
            lines.append(f"班次:")
            for sched in sorted(station_schedules, key=lambda s: s.route_order):
                veh = self.vehicle_map.get(sched.vehicle_id)
                lines.append(f"  - {sched.departure_time} | 车牌: {veh.plate if veh else sched.vehicle_id}")

        lines.append("")
        lines.append(f"分配到此站点的员工:")
        for a in result.assignments:
            if a.station_id == station_id:
                emp = self.employee_map.get(a.employee_id)
                if emp:
                    lines.append(f"  - {emp.name} | 住址: {emp.address} | 候选: {', '.join(emp.candidate_stations)}")
                    lines.append(f"    状态: {a.status.value}")

        return "\n".join(lines)

    def export_monthly_report(
        self, result: DispatchResult, month: str = ""
    ) -> str:
        if not month:
            month = datetime.now().strftime("%Y-%m")

        lines = [f"=== 月度班车路线复盘报告 ({month}) ===", ""]
        lines.append(f"生成时间: {datetime.now().isoformat()}")
        lines.append("")

        lines.append("--- 方案总览 ---")
        lines.append(f"可行性: {'可行' if result.is_feasible else '不可行'}")
        if result.is_feasible:
            lines.append(f"选中站点数: {len(result.selected_stations)}")
            lines.append(f"总班车数: {sum(result.station_bus_count.values())}")
            lines.append(f"总分配员工: {len(result.assignments)}")
            lines.append(f"目标函数值: {result.total_cost}")
        else:
            lines.append(f"原因: {result.infeasibility_reason}")
        lines.append("")

        if not result.is_feasible:
            return "\n".join(lines)

        lines.append("--- 站点明细 ---")
        for sid in result.selected_stations:
            sta = self.station_map.get(sid)
            sta_name = sta.name if sta else sid
            buses = result.station_bus_count.get(sid, 0)
            emp_count = result.station_employee_count.get(sid, 0)
            vehicle_capacity = self.vehicles[0].capacity if self.vehicles else 0
            utilization = (emp_count / (buses * vehicle_capacity) * 100) if buses > 0 else 0

            lines.append(f"  [{sta_name}] 班车 {buses} 辆 | 乘车 {emp_count}/{buses * vehicle_capacity} | 利用率 {utilization:.0f}%")

            station_schedules = [s for s in self.schedules if s.station_id == sid]
            for sched in sorted(station_schedules, key=lambda s: s.route_order):
                veh = self.vehicle_map.get(sched.vehicle_id)
                lines.append(f"    班次: {sched.departure_time} | 车牌: {veh.plate if veh else sched.vehicle_id}")

            for a in result.assignments:
                if a.station_id == sid:
                    emp = self.employee_map.get(a.employee_id)
                    lines.append(f"    - {emp.name if emp else a.employee_id} ({a.status.value})")
        lines.append("")

        if result.overflow_stations:
            lines.append("--- 超限站点 ---")
            for sid in result.overflow_stations:
                sta = self.station_map.get(sid)
                lines.append(f"  [{sta.name if sta else sid}]")
            lines.append("")

        overflow_assigns = [a for a in result.assignments if a.status == AssignmentStatus.OVERFLOW]
        dup_assigns = [a for a in result.assignments if a.status == AssignmentStatus.DUPLICATE]
        if overflow_assigns or dup_assigns:
            lines.append("--- 待确认项 ---")
            for a in overflow_assigns:
                emp = self.employee_map.get(a.employee_id)
                lines.append(f"  [超限] {emp.name if emp else a.employee_id}: {a.overflow_reason}")
            for a in dup_assigns:
                emp = self.employee_map.get(a.employee_id)
                lines.append(f"  [重复] {emp.name if emp else a.employee_id}: 请HR核验")
            lines.append("")

        return "\n".join(lines)

    def export_csv(self, result: DispatchResult) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["员工ID", "员工姓名", "住址", "分配站点", "班次时间", "车牌", "状态", "备注"])

        for a in result.assignments:
            emp = self.employee_map.get(a.employee_id)
            sta = self.station_map.get(a.station_id)
            sched = self.schedule_map.get(a.schedule_id) if a.schedule_id else None
            veh = self.vehicle_map.get(sched.vehicle_id) if sched else None

            writer.writerow([
                a.employee_id,
                emp.name if emp else "",
                emp.address if emp else "",
                sta.name if sta else a.station_id,
                sched.departure_time if sched else "",
                veh.plate if veh else "",
                a.status.value,
                a.overflow_reason or "",
            ])

        return output.getvalue()
