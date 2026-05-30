import copy
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from .models import (
    Assignment, AssignmentStatus, ChangeAction, ChangeRecord, DispatchResult,
    DispatchSnapshot, Employee, Schedule, Station, StationStatus, Vehicle,
)
from .solver import ShuttleSolver
from .validators import Validator


class DispatchTracker:
    def __init__(self):
        self.snapshots: List[DispatchSnapshot] = []
        self.change_log: List[ChangeRecord] = []
        self._current: Optional[DispatchSnapshot] = None

    @property
    def current(self) -> Optional[DispatchSnapshot]:
        return self._current

    def initialize(
        self,
        employees: List[Employee],
        stations: List[Station],
        vehicles: List[Vehicle],
    ) -> DispatchResult:
        snapshot = DispatchSnapshot(
            employees=copy.deepcopy(employees),
            stations=copy.deepcopy(stations),
            vehicles=copy.deepcopy(vehicles),
        )
        result = self._solve(snapshot)
        snapshot.result = result
        self._current = snapshot
        self.snapshots.append(snapshot)
        return result

    def add_schedules(self, schedules: List[Schedule]) -> DispatchResult:
        if not self._current:
            raise RuntimeError("请先调用 initialize() 初始化数据")

        old_result = copy.deepcopy(self._current.result)
        old_schedules = {s.id: s for s in self._current.schedules}

        for sched in schedules:
            if sched.id not in old_schedules:
                self._log_change(
                    "schedule", sched.id, ChangeAction.ADDED,
                    "departure_time", "", sched.departure_time,
                    affected_conclusions=self._check_schedule_impact(sched, old_result),
                )
            else:
                old_sched = old_schedules[sched.id]
                if old_sched.departure_time != sched.departure_time:
                    self._log_change(
                        "schedule", sched.id, ChangeAction.MODIFIED,
                        "departure_time", old_sched.departure_time, sched.departure_time,
                        affected_conclusions=self._check_schedule_impact(sched, old_result),
                    )

        self._current.schedules = copy.deepcopy(schedules)

        schedule_map: Dict[str, Schedule] = {s.id: s for s in schedules}
        for a in self._current.result.assignments:
            matching = [
                s for s in schedules
                if s.station_id == a.station_id
            ]
            if matching:
                best = min(matching, key=lambda s: s.route_order)
                a.schedule_id = best.id

        return self._current.result

    def add_employee(self, employee: Employee) -> Tuple[DispatchResult, List[str]]:
        if not self._current:
            raise RuntimeError("请先调用 initialize() 初始化数据")

        changes: List[str] = []
        old_result = copy.deepcopy(self._current.result)

        self._current.employees.append(copy.deepcopy(employee))
        self._log_change(
            "employee", employee.id, ChangeAction.ADDED,
            "all", "", employee.name,
            affected_conclusions=[],
        )

        new_result = self._solve(self._current)

        changes.extend(self._diff_results(old_result, new_result))

        self._current.result = new_result
        self.snapshots.append(copy.deepcopy(self._current))
        return new_result, changes

    def close_station(self, station_id: str) -> Tuple[DispatchResult, List[str], str]:
        if not self._current:
            raise RuntimeError("请先调用 initialize() 初始化数据")

        old_result = copy.deepcopy(self._current.result)
        station = next((s for s in self._current.stations if s.id == station_id), None)
        if not station:
            return old_result, [], f"站点 {station_id} 不存在"

        if station.status == StationStatus.CLOSED:
            return old_result, [], f"站点 [{station.name}] 已是关闭状态"

        validator = Validator(
            self._current.employees, self._current.stations, self._current.vehicles
        )
        affected, impact_report = validator.check_station_closure_impact(
            station_id, self._current.employees, self._current.stations
        )

        station.status = StationStatus.CLOSED
        self._log_change(
            "station", station_id, ChangeAction.MODIFIED,
            "status", StationStatus.ACTIVE.value, StationStatus.CLOSED.value,
            affected_conclusions=[f"站点[{station.name}]关闭"],
        )

        new_result = self._solve(self._current)
        changes = self._diff_results(old_result, new_result)
        self._current.result = new_result
        self.snapshots.append(copy.deepcopy(self._current))

        return new_result, changes, impact_report

    def _solve(self, snapshot: DispatchSnapshot) -> DispatchResult:
        try:
            solver = ShuttleSolver(
                snapshot.employees, snapshot.stations, snapshot.vehicles
            )
            return solver.solve()
        except ValueError as e:
            return DispatchResult(is_feasible=False, infeasibility_reason=str(e))

    def _check_schedule_impact(
        self, schedule: Schedule, old_result: Optional[DispatchResult]
    ) -> List[str]:
        impacts: List[str] = []
        if not old_result or not old_result.is_feasible:
            return impacts
        if schedule.station_id in old_result.selected_stations:
            impacts.append(f"站点{schedule.station_id}新增班次{schedule.departure_time}")
        return impacts

    def _diff_results(
        self, old: Optional[DispatchResult], new: DispatchResult
    ) -> List[str]:
        changes: List[str] = []
        if not old or not old.is_feasible:
            if new.is_feasible:
                changes.append("方案从不可行变为可行")
            return changes

        if not new.is_feasible:
            changes.append(f"方案变为不可行: {new.infeasibility_reason}")
            return changes

        old_stations = set(old.selected_stations)
        new_stations = set(new.selected_stations)

        added = new_stations - old_stations
        removed = old_stations - new_stations
        if added:
            changes.append(f"新增站点: {', '.join(added)}")
        if removed:
            changes.append(f"移除站点: {', '.join(removed)}")

        old_assign = {(a.employee_id, a.station_id) for a in old.assignments}
        new_assign = {(a.employee_id, a.station_id) for a in new.assignments}

        reassigned = new_assign - old_assign
        if reassigned:
            changes.append(f"{len(reassigned)} 名员工被重新分配站点")

        for sid in new_stations & old_stations:
            old_buses = old.station_bus_count.get(sid, 0)
            new_buses = new.station_bus_count.get(sid, 0)
            if old_buses != new_buses:
                changes.append(f"站点{sid}班车数: {old_buses} → {new_buses}")

        return changes

    def _log_change(
        self,
        entity_type: str,
        entity_id: str,
        action: ChangeAction,
        field_name: str,
        old_value: str,
        new_value: str,
        affected_conclusions: Optional[List[str]] = None,
    ):
        record = ChangeRecord(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            field_name=field_name,
            old_value=old_value,
            new_value=new_value,
            affected_conclusions=affected_conclusions or [],
            timestamp=datetime.now().isoformat(),
        )
        self.change_log.append(record)

    def get_change_summary(self) -> str:
        if not self.change_log:
            return "无变更记录"

        lines = ["=== 补录变更追踪 ===", ""]
        for i, rec in enumerate(self.change_log, 1):
            lines.append(f"[{i}] {rec.timestamp}")
            lines.append(f"    类型: {rec.entity_type} | ID: {rec.entity_id}")
            lines.append(f"    操作: {rec.action.value} | 字段: {rec.field_name}")
            if rec.old_value:
                lines.append(f"    旧值: {rec.old_value}")
            lines.append(f"    新值: {rec.new_value}")
            if rec.affected_conclusions:
                lines.append(f"    影响的结论: {'; '.join(rec.affected_conclusions)}")
            lines.append("")

        return "\n".join(lines)
