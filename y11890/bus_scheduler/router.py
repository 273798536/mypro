from typing import List, Dict, Set, Tuple
from collections import defaultdict
from .models import (
    ScheduleInput, ScheduleOutput, Route, Stop,
    Vehicle, ValidationIssue
)
from .pathfinder import PathFinder


class RoutePlanner:
    def __init__(self, schedule_input: ScheduleInput):
        self.input = schedule_input
        self.pathfinder = PathFinder(schedule_input)
        self.issues: List[ValidationIssue] = []

    def plan(self) -> ScheduleOutput:
        self.issues = []

        output = ScheduleOutput()
        output.issues = self.issues

        school = self.input.school
        school_id = school.stop_id

        valid_stops = self._get_valid_stops()
        if not valid_stops:
            self._add_issue(
                "ERROR",
                "NO_VALID_STOPS",
                "没有有效的站点可以安排"
            )
            return output

        valid_vehicles = self._get_valid_vehicles()
        if not valid_vehicles:
            self._add_issue(
                "ERROR",
                "NO_VALID_VEHICLES",
                "没有有效的车辆可以安排"
            )
            return output

        total_students = sum(s.student_count for s in valid_stops)
        total_capacity = sum(v.capacity for v in valid_vehicles)

        output.total_students = total_students

        if total_students > total_capacity:
            self._add_issue(
                "ERROR",
                "INSUFFICIENT_CAPACITY",
                f"总运力不足: 需要运送 {total_students} 人，但总容量只有 {total_capacity} 人",
                total_students=total_students,
                total_capacity=total_capacity,
                deficit=total_students - total_capacity
            )
            return output

        route_groups = self._group_stops_by_capacity(valid_stops, valid_vehicles)

        routes = []
        route_idx = 1

        for vehicle, stops_in_route in route_groups:
            if not stops_in_route:
                continue

            stop_ids = [s.stop_id for s in stops_in_route]
            optimized_order, route_duration = self.pathfinder.optimize_route_order(
                stop_ids,
                school_id,
                school_id
            )

            route_stops = []
            for stop_id in optimized_order:
                stop = self.input.get_stop(stop_id)
                if stop:
                    route_stops.append(stop)

            route = Route(
                route_id=f"R{route_idx:03d}",
                vehicle=vehicle,
                stops=route_stops,
                total_duration=route_duration
            )

            self._check_route_load(route)
            routes.append(route)
            route_idx += 1

            output.total_distance += route_duration

        output.routes = routes
        self._add_route_summary(routes, total_students, total_capacity)

        return output

    def _get_valid_stops(self) -> List[Stop]:
        valid = []
        for stop in self.input.stops:
            if not stop.is_valid_coordinate():
                self._add_issue(
                    "WARNING",
                    "SKIP_INVALID_STOP",
                    f"跳过无效坐标的站点: {stop.name}({stop.stop_id})",
                    stop_id=stop.stop_id,
                    reason="坐标无效"
                )
                continue

            dist = self.pathfinder.get_shortest_distance(
                self.input.school.stop_id, stop.stop_id
            )
            if dist == float('inf'):
                self._add_issue(
                    "WARNING",
                    "SKIP_UNREACHABLE_STOP",
                    f"跳过无法到达的站点: {stop.name}({stop.stop_id})",
                    stop_id=stop.stop_id,
                    reason="从学校无法到达"
                )
                continue

            valid.append(stop)

        return valid

    def _get_valid_vehicles(self) -> List[Vehicle]:
        valid = []
        for vehicle in self.input.vehicles:
            if vehicle.capacity <= 0:
                self._add_issue(
                    "WARNING",
                    "SKIP_INVALID_VEHICLE",
                    f"跳过无效容量的车辆: {vehicle.vehicle_id}",
                    vehicle_id=vehicle.vehicle_id,
                    capacity=vehicle.capacity,
                    reason="容量必须大于0"
                )
                continue
            valid.append(vehicle)

        return sorted(valid, key=lambda v: v.capacity, reverse=True)

    def _group_stops_by_capacity(
        self,
        stops: List[Stop],
        vehicles: List[Vehicle]
    ) -> List[Tuple[Vehicle, List[Stop]]]:
        school_id = self.input.school.stop_id

        sorted_stops = sorted(
            stops,
            key=lambda s: (
                -s.student_count,
                self.pathfinder.get_shortest_distance(school_id, s.stop_id)
            )
        )

        stop_groups: Dict[int, List[Stop]] = defaultdict(list)
        group_load: Dict[int, int] = defaultdict(int)
        group_vehicle: Dict[int, Vehicle] = {}

        for idx, vehicle in enumerate(vehicles):
            group_vehicle[idx] = vehicle

        unassigned: List[Stop] = []

        for stop in sorted_stops:
            assigned = False

            for group_idx in range(len(vehicles)):
                vehicle = group_vehicle[group_idx]
                current_load = group_load[group_idx]

                if current_load + stop.student_count <= vehicle.capacity:
                    stop_groups[group_idx].append(stop)
                    group_load[group_idx] += stop.student_count
                    assigned = True
                    break

            if not assigned:
                unassigned.append(stop)

        if unassigned:
            self._redistribute_unassigned(
                unassigned, stop_groups, group_load, group_vehicle
            )

        result = []
        for group_idx in range(len(vehicles)):
            vehicle = group_vehicle[group_idx]
            group_stops = self._optimize_group_clustering(
                stop_groups[group_idx], school_id
            )
            result.append((vehicle, group_stops))

            load = group_load[group_idx]
            self._add_issue(
                "INFO",
                "ROUTE_GROUP_INFO",
                f"路线分组 {group_idx + 1}: 车辆 {vehicle.vehicle_id} "
                f"(容量 {vehicle.capacity}) 分配 {len(group_stops)} 个站点, "
                f"载学生 {load} 人, 负载率 {load/vehicle.capacity:.1%}",
                group=group_idx + 1,
                vehicle_id=vehicle.vehicle_id,
                capacity=vehicle.capacity,
                stop_count=len(group_stops),
                students=load,
                load_ratio=load / vehicle.capacity
            )

        return result

    def _redistribute_unassigned(
        self,
        unassigned: List[Stop],
        stop_groups: Dict[int, List[Stop]],
        group_load: Dict[int, int],
        group_vehicle: Dict[int, Vehicle]
    ):
        for stop in unassigned:
            best_group = None
            best_fit = float('inf')

            for group_idx in range(len(group_vehicle)):
                vehicle = group_vehicle[group_idx]
                current_load = group_load[group_idx]
                remaining = vehicle.capacity - current_load

                if stop.student_count <= remaining and remaining < best_fit:
                    best_fit = remaining
                    best_group = group_idx

            if best_group is not None:
                stop_groups[best_group].append(stop)
                group_load[best_group] += stop.student_count

                vehicle = group_vehicle[best_group]
                self._add_issue(
                    "INFO",
                    "STOP_REASSIGNED",
                    f"站点 {stop.name}({stop.stop_id}) 重新分配到车辆 {vehicle.vehicle_id}, "
                    f"新增学生 {stop.student_count} 人",
                    stop_id=stop.stop_id,
                    vehicle_id=vehicle.vehicle_id,
                    students=stop.student_count
                )
            else:
                self._add_issue(
                    "ERROR",
                    "CANNOT_ASSIGN_STOP",
                    f"无法为站点 {stop.name}({stop.stop_id}) 分配车辆: "
                    f"需要运送 {stop.student_count} 人，但没有车辆有足够剩余容量",
                    stop_id=stop.stop_id,
                    student_count=stop.student_count
                )

    def _optimize_group_clustering(
        self,
        stops: List[Stop],
        school_id: str
    ) -> List[Stop]:
        if len(stops) <= 2:
            return stops

        stop_ids = [s.stop_id for s in stops]
        ordered_ids, _ = self.pathfinder.find_nearest_neighbor_order(
            school_id, stop_ids
        )

        ordered_stops = []
        for sid in ordered_ids[1:]:
            stop = next((s for s in stops if s.stop_id == sid), None)
            if stop:
                ordered_stops.append(stop)

        return ordered_stops

    def _check_route_load(self, route: Route):
        if route.is_overloaded:
            self._add_issue(
                "ERROR",
                "VEHICLE_OVERLOADED",
                f"路线 {route.route_id} 车辆 {route.vehicle.vehicle_id} 超载: "
                f"载学生 {route.total_students} 人 > 容量 {route.vehicle.capacity} 人，"
                f"超载 {route.total_students - route.vehicle.capacity} 人",
                route_id=route.route_id,
                vehicle_id=route.vehicle.vehicle_id,
                students=route.total_students,
                capacity=route.vehicle.capacity,
                overload=route.total_students - route.vehicle.capacity
            )
        elif route.load_ratio > 0.9:
            self._add_issue(
                "WARNING",
                "HIGH_LOAD_RATIO",
                f"路线 {route.route_id} 车辆 {route.vehicle.vehicle_id} 负载率较高: "
                f"{route.load_ratio:.1%}",
                route_id=route.route_id,
                vehicle_id=route.vehicle.vehicle_id,
                load_ratio=route.load_ratio
            )
        elif route.load_ratio < 0.3 and len(route.stops) > 1:
            self._add_issue(
                "INFO",
                "LOW_LOAD_RATIO",
                f"路线 {route.route_id} 车辆 {route.vehicle.vehicle_id} 负载率较低: "
                f"{route.load_ratio:.1%}，可以考虑合并站点",
                route_id=route.route_id,
                vehicle_id=route.vehicle.vehicle_id,
                load_ratio=route.load_ratio
            )

    def _add_route_summary(
        self,
        routes: List[Route],
        total_students: int,
        total_capacity: int
    ):
        total_duration = sum(r.total_duration for r in routes)
        avg_load = sum(r.load_ratio for r in routes) / len(routes) if routes else 0

        self._add_issue(
            "INFO",
            "SCHEDULE_SUMMARY",
            f"调度完成: 共 {len(routes)} 条路线, 运送 {total_students} 名学生, "
            f"总行程时间 {total_duration:.1f} 分钟, 平均负载率 {avg_load:.1%}",
            route_count=len(routes),
            total_students=total_students,
            total_capacity=total_capacity,
            total_duration=total_duration,
            avg_load_ratio=avg_load
        )

    def _add_issue(self, level: str, code: str, message: str, **details):
        self.issues.append(ValidationIssue(
            level=level,
            code=code,
            message=message,
            details=details
        ))
